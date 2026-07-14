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
