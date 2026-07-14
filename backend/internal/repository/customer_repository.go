package repository

import (
	"database/sql"
	"time"
)

type Customer struct {
	ID        int       `json:"id"`
	Name      string    `json:"name"`
	Phone     string    `json:"phone"`
	CreatedAt time.Time `json:"created_at"`
}

type CustomerRepository struct {
	db *sql.DB
}

func NewCustomerRepository(db *sql.DB) *CustomerRepository {
	return &CustomerRepository{db: db}
}

// FindOrCreateByPhone links an order to a customer identified by phone number.
// If the phone is already known, their name is refreshed to whatever was just
// submitted (people re-order under the name they type each time, not a fixed
// profile). The upsert is a single atomic statement to avoid a race between
// concurrent orders from the same phone.
func (r *CustomerRepository) FindOrCreateByPhone(name, phone string) (*Customer, error) {
	var c Customer
	err := r.db.QueryRow(
		`INSERT INTO customers (name, phone) VALUES ($1, $2)
		 ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name
		 RETURNING id, name, phone, created_at`,
		name, phone,
	).Scan(&c.ID, &c.Name, &c.Phone, &c.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

type CustomerReport struct {
	ID         int     `json:"id"`
	Name       string  `json:"name"`
	Phone      string  `json:"phone"`
	OrderCount int     `json:"order_count"`
	TotalSpent float64 `json:"total_spent"`
}

// MonthlyReport aggregates completed ("done") orders per customer within the
// given month (YYYY-MM), for the monthly customer report. Customers with no
// completed order in the month are omitted, matching how the sales reports
// only count completed orders.
func (r *CustomerRepository) MonthlyReport(month string) ([]CustomerReport, error) {
	rows, err := r.db.Query(
		`SELECT c.id, c.name, c.phone, COUNT(o.id), COALESCE(SUM(o.total), 0)
		 FROM customers c
		 JOIN orders o ON o.customer_id = c.id
		 WHERE o.status = 'done' AND to_char(o.created_at, 'YYYY-MM') = $1
		 GROUP BY c.id, c.name, c.phone
		 ORDER BY SUM(o.total) DESC`,
		month,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var reports []CustomerReport
	for rows.Next() {
		var rep CustomerReport
		if err := rows.Scan(&rep.ID, &rep.Name, &rep.Phone, &rep.OrderCount, &rep.TotalSpent); err != nil {
			return nil, err
		}
		reports = append(reports, rep)
	}
	if reports == nil {
		reports = []CustomerReport{}
	}
	return reports, rows.Err()
}
