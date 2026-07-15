package repository

import (
	"database/sql"
	"time"
)

type StoreSettings struct {
	OpenTime  string `json:"open_time"`
	CloseTime string `json:"close_time"`
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

// IsOpenNow reports whether the current time in WIB falls within [OpenTime, CloseTime].
// Hours are the same every day (no per-day schedule), and this assumes OpenTime <=
// CloseTime — it doesn't support an overnight range that wraps past midnight.
func (s *StoreSettings) IsOpenNow() bool {
	now := time.Now().In(jakarta).Format("15:04")
	return now >= s.OpenTime && now <= s.CloseTime
}

type SettingsRepository struct {
	db *sql.DB
}

func NewSettingsRepository(db *sql.DB) *SettingsRepository {
	return &SettingsRepository{db: db}
}

func (r *SettingsRepository) GetStoreHours() (*StoreSettings, error) {
	var s StoreSettings
	err := r.db.QueryRow(`SELECT open_time, close_time FROM store_settings WHERE id = 1`).Scan(&s.OpenTime, &s.CloseTime)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *SettingsRepository) UpdateStoreHours(openTime, closeTime string) (*StoreSettings, error) {
	var s StoreSettings
	err := r.db.QueryRow(
		`UPDATE store_settings SET open_time = $1, close_time = $2 WHERE id = 1 RETURNING open_time, close_time`,
		openTime, closeTime,
	).Scan(&s.OpenTime, &s.CloseTime)
	if err != nil {
		return nil, err
	}
	return &s, nil
}
