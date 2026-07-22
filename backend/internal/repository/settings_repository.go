package repository

import (
	"database/sql"
	"time"
)

// DayHours is one row of the store's weekly schedule. DayOfWeek follows Go's
// time.Weekday numbering (0=Sunday..6=Saturday) so it lines up directly with
// time.Now().Weekday() when resolving "today".
type DayHours struct {
	DayOfWeek int    `json:"day_of_week"`
	OpenTime  string `json:"open_time"`
	CloseTime string `json:"close_time"`
	IsClosed  bool   `json:"is_closed"`
}

// jakarta is the single timezone used for every operating-hours comparison (WIB,
// UTC+7) — loaded once since LoadLocation hits the OS tzdata on every call.
var jakarta = func() *time.Location {
	loc, err := time.LoadLocation("Asia/Jakarta")
	if err != nil {
		return time.FixedZone("WIB", 7*60*60)
	}
	return loc
}()

// IsOpenNow reports whether the current time in WIB falls within [OpenTime, CloseTime]
// for this day, and false outright when the day is marked fully closed. Assumes
// OpenTime <= CloseTime — it doesn't support an overnight range that wraps past midnight.
func (d *DayHours) IsOpenNow() bool {
	if d.IsClosed {
		return false
	}
	now := time.Now().In(jakarta).Format("15:04")
	return now >= d.OpenTime && now <= d.CloseTime
}

type SettingsRepository struct {
	db *sql.DB
}

func NewSettingsRepository(db *sql.DB) *SettingsRepository {
	return &SettingsRepository{db: db}
}

// GetAllHours returns all 7 days, ordered Sunday (0) through Saturday (6).
func (r *SettingsRepository) GetAllHours() ([]DayHours, error) {
	rows, err := r.db.Query(`SELECT day_of_week, open_time, close_time, is_closed FROM store_hours ORDER BY day_of_week`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var days []DayHours
	for rows.Next() {
		var d DayHours
		if err := rows.Scan(&d.DayOfWeek, &d.OpenTime, &d.CloseTime, &d.IsClosed); err != nil {
			return nil, err
		}
		days = append(days, d)
	}
	return days, rows.Err()
}

// GetTodayHours returns the schedule row for the current day in WIB.
func (r *SettingsRepository) GetTodayHours() (*DayHours, error) {
	today := int(time.Now().In(jakarta).Weekday())
	var d DayHours
	err := r.db.QueryRow(
		`SELECT day_of_week, open_time, close_time, is_closed FROM store_hours WHERE day_of_week = $1`,
		today,
	).Scan(&d.DayOfWeek, &d.OpenTime, &d.CloseTime, &d.IsClosed)
	if err != nil {
		return nil, err
	}
	return &d, nil
}

// UpdateAllHours replaces the full weekly schedule in one transaction.
func (r *SettingsRepository) UpdateAllHours(days []DayHours) ([]DayHours, error) {
	tx, err := r.db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	for _, d := range days {
		if _, err := tx.Exec(
			`UPDATE store_hours SET open_time = $1, close_time = $2, is_closed = $3 WHERE day_of_week = $4`,
			d.OpenTime, d.CloseTime, d.IsClosed, d.DayOfWeek,
		); err != nil {
			return nil, err
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return r.GetAllHours()
}
