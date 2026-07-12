package repository

import (
	"database/sql"
	"fmt"
)

// ReportFilter is an optional date range (YYYY-MM-DD, inclusive) applied to orders.created_at.
type ReportFilter struct {
	From *string
	To   *string
}

func (f ReportFilter) whereClause(startArg int) (string, []interface{}) {
	clause := ""
	args := []interface{}{}
	n := startArg
	if f.From != nil {
		clause += fmt.Sprintf(" AND o.created_at::date >= $%d", n)
		args = append(args, *f.From)
		n++
	}
	if f.To != nil {
		clause += fmt.Sprintf(" AND o.created_at::date <= $%d", n)
		args = append(args, *f.To)
		n++
	}
	return clause, args
}

type SalesSummary struct {
	TotalRevenue float64 `json:"total_revenue"`
	TotalOrders  int     `json:"total_orders"`
	AverageOrder float64 `json:"average_order"`
}

type DailySales struct {
	Date   string  `json:"date"`
	Total  float64 `json:"total"`
	Orders int     `json:"orders"`
}

type TopMenu struct {
	MenuID  int     `json:"menu_id"`
	Name    string  `json:"name"`
	QtySold int     `json:"qty_sold"`
	Revenue float64 `json:"revenue"`
}

type TableRecap struct {
	TableID     int     `json:"table_id"`
	TableNumber string  `json:"table_number"`
	Orders      int     `json:"orders"`
	Total       float64 `json:"total"`
}

type ReportRepository struct {
	db *sql.DB
}

func NewReportRepository(db *sql.DB) *ReportRepository {
	return &ReportRepository{db: db}
}

// SalesSummary totals completed ("done") orders in the given date range.
func (r *ReportRepository) SalesSummary(f ReportFilter) (*SalesSummary, error) {
	where, args := f.whereClause(1)
	query := `
		SELECT COALESCE(SUM(o.total), 0), COUNT(*)
		FROM orders o
		WHERE o.status = 'done'` + where

	var s SalesSummary
	if err := r.db.QueryRow(query, args...).Scan(&s.TotalRevenue, &s.TotalOrders); err != nil {
		return nil, err
	}
	if s.TotalOrders > 0 {
		s.AverageOrder = s.TotalRevenue / float64(s.TotalOrders)
	}
	return &s, nil
}

// DailySales aggregates completed order revenue per day for charting.
func (r *ReportRepository) DailySales(f ReportFilter) ([]DailySales, error) {
	where, args := f.whereClause(1)
	query := `
		SELECT o.created_at::date AS day, COALESCE(SUM(o.total), 0), COUNT(*)
		FROM orders o
		WHERE o.status = 'done'` + where + `
		GROUP BY day
		ORDER BY day`

	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var days []DailySales
	for rows.Next() {
		var d DailySales
		if err := rows.Scan(&d.Date, &d.Total, &d.Orders); err != nil {
			return nil, err
		}
		days = append(days, d)
	}
	if days == nil {
		days = []DailySales{}
	}
	return days, rows.Err()
}

// TopMenus ranks menus by quantity sold across completed orders.
func (r *ReportRepository) TopMenus(f ReportFilter, limit int) ([]TopMenu, error) {
	where, args := f.whereClause(1)
	query := `
		SELECT m.id, m.name, SUM(oi.qty), SUM(oi.qty * oi.price)
		FROM order_items oi
		JOIN orders o ON o.id = oi.order_id
		JOIN menus m ON m.id = oi.menu_id
		WHERE o.status = 'done'` + where + `
		GROUP BY m.id, m.name
		ORDER BY SUM(oi.qty) DESC
		LIMIT $` + fmt.Sprint(len(args)+1)
	args = append(args, limit)

	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var menus []TopMenu
	for rows.Next() {
		var m TopMenu
		if err := rows.Scan(&m.MenuID, &m.Name, &m.QtySold, &m.Revenue); err != nil {
			return nil, err
		}
		menus = append(menus, m)
	}
	if menus == nil {
		menus = []TopMenu{}
	}
	return menus, rows.Err()
}

// TableRecap summarizes completed order activity per table.
func (r *ReportRepository) TableRecap(f ReportFilter) ([]TableRecap, error) {
	where, args := f.whereClause(1)
	query := `
		SELECT t.id, t.table_number, COUNT(o.id), COALESCE(SUM(o.total), 0)
		FROM tables t
		JOIN orders o ON o.table_id = t.id
		WHERE o.status = 'done'` + where + `
		GROUP BY t.id, t.table_number
		ORDER BY SUM(o.total) DESC`

	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tables []TableRecap
	for rows.Next() {
		var t TableRecap
		if err := rows.Scan(&t.TableID, &t.TableNumber, &t.Orders, &t.Total); err != nil {
			return nil, err
		}
		tables = append(tables, t)
	}
	if tables == nil {
		tables = []TableRecap{}
	}
	return tables, rows.Err()
}
