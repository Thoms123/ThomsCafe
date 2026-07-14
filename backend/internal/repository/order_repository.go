package repository

import (
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/lib/pq"
)

// ValidOrderStatuses is the allowed flow: pending → confirmed → preparing → ready → done.
var ValidOrderStatuses = map[string]bool{
	"pending":   true,
	"confirmed": true,
	"preparing": true,
	"ready":     true,
	"done":      true,
}

type OrderItem struct {
	ID       int     `json:"id"`
	OrderID  int     `json:"order_id"`
	MenuID   int     `json:"menu_id"`
	MenuName string  `json:"menu_name"`
	Qty      int     `json:"qty"`
	Price    float64 `json:"price"`
}

type Order struct {
	ID           int         `json:"id"`
	TableID      int         `json:"table_id"`
	TableNumber  string      `json:"table_number"`
	Status       string      `json:"status"`
	Total        float64     `json:"total"`
	CustomerID   *int        `json:"customer_id"`
	CustomerName *string     `json:"customer_name"`
	CreatedAt    time.Time   `json:"created_at"`
	Items        []OrderItem `json:"items"`
}

type OrderItemInput struct {
	MenuID int
	Qty    int
}

type OrderRepository struct {
	db *sql.DB
}

func NewOrderRepository(db *sql.DB) *OrderRepository {
	return &OrderRepository{db: db}
}

// Create inserts an order with its items in a single transaction.
// Prices are snapshotted server-side from the menus table, never trusted from the client.
func (r *OrderRepository) Create(tableID, customerID int, customerName string, items []OrderItemInput) (*Order, error) {
	tx, err := r.db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var total float64
	prices := make([]float64, len(items))
	for i, item := range items {
		var price float64
		var isAvailable bool
		err := tx.QueryRow(`SELECT price, is_available FROM menus WHERE id = $1`, item.MenuID).Scan(&price, &isAvailable)
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errNotFoundMenu(item.MenuID)
		}
		if err != nil {
			return nil, err
		}
		if !isAvailable {
			return nil, errUnavailableMenu(item.MenuID)
		}
		prices[i] = price
		total += price * float64(item.Qty)
	}

	var orderID int
	err = tx.QueryRow(
		`INSERT INTO orders (table_id, status, total, customer_id, customer_name) VALUES ($1, 'pending', $2, $3, $4) RETURNING id`,
		tableID, total, customerID, customerName,
	).Scan(&orderID)
	if err != nil {
		return nil, err
	}

	for i, item := range items {
		_, err = tx.Exec(
			`INSERT INTO order_items (order_id, menu_id, qty, price) VALUES ($1, $2, $3, $4)`,
			orderID, item.MenuID, item.Qty, prices[i],
		)
		if err != nil {
			return nil, err
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return r.FindByID(orderID)
}

type OrderFilter struct {
	Status  *string
	Date    *string // YYYY-MM-DD
	TableID *int
}

func (r *OrderRepository) FindAll(f OrderFilter) ([]Order, error) {
	query := `
		SELECT o.id, o.table_id, t.table_number, o.status, o.total, o.customer_id, o.customer_name, o.created_at
		FROM orders o
		JOIN tables t ON t.id = o.table_id
		WHERE 1=1
	`
	args := []interface{}{}
	n := 1

	if f.Status != nil {
		query += fmt.Sprintf(` AND o.status = $%d`, n)
		args = append(args, *f.Status)
		n++
	}
	if f.Date != nil {
		query += fmt.Sprintf(` AND o.created_at::date = $%d::date`, n)
		args = append(args, *f.Date)
		n++
	}
	if f.TableID != nil {
		query += fmt.Sprintf(` AND o.table_id = $%d`, n)
		args = append(args, *f.TableID)
		n++
	}
	query += ` ORDER BY o.created_at DESC`

	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var orders []Order
	ids := []int{}
	for rows.Next() {
		var o Order
		if err := rows.Scan(&o.ID, &o.TableID, &o.TableNumber, &o.Status, &o.Total, &o.CustomerID, &o.CustomerName, &o.CreatedAt); err != nil {
			return nil, err
		}
		o.Items = []OrderItem{}
		orders = append(orders, o)
		ids = append(ids, o.ID)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if orders == nil {
		return []Order{}, nil
	}

	itemRows, err := r.db.Query(
		`SELECT oi.id, oi.order_id, oi.menu_id, m.name, oi.qty, oi.price
		 FROM order_items oi
		 JOIN menus m ON m.id = oi.menu_id
		 WHERE oi.order_id = ANY($1)
		 ORDER BY oi.id`, pq.Array(ids),
	)
	if err != nil {
		return nil, err
	}
	defer itemRows.Close()

	itemsByOrder := make(map[int][]OrderItem)
	for itemRows.Next() {
		var it OrderItem
		if err := itemRows.Scan(&it.ID, &it.OrderID, &it.MenuID, &it.MenuName, &it.Qty, &it.Price); err != nil {
			return nil, err
		}
		itemsByOrder[it.OrderID] = append(itemsByOrder[it.OrderID], it)
	}
	if err := itemRows.Err(); err != nil {
		return nil, err
	}

	for i := range orders {
		if items, ok := itemsByOrder[orders[i].ID]; ok {
			orders[i].Items = items
		}
	}

	return orders, nil
}

// UpdateStatus sets an order's status. Returns nil, nil if the order doesn't exist,
// and a *statusError if newStatus isn't one of the known flow steps.
func (r *OrderRepository) UpdateStatus(id int, newStatus string) (*Order, error) {
	if !ValidOrderStatuses[newStatus] {
		return nil, &statusError{status: newStatus}
	}
	res, err := r.db.Exec(`UPDATE orders SET status = $1 WHERE id = $2`, newStatus, id)
	if err != nil {
		return nil, err
	}
	n, err := res.RowsAffected()
	if err != nil {
		return nil, err
	}
	if n == 0 {
		return nil, nil
	}
	return r.FindByID(id)
}

type statusError struct {
	status string
}

func (e *statusError) Error() string {
	return fmt.Sprintf("invalid order status: %s", e.status)
}

// IsInvalidStatus reports whether err was returned because a status value wasn't recognized.
func IsInvalidStatus(err error) bool {
	var e *statusError
	return errors.As(err, &e)
}

func (r *OrderRepository) FindByID(id int) (*Order, error) {
	var o Order
	err := r.db.QueryRow(
		`SELECT o.id, o.table_id, t.table_number, o.status, o.total, o.customer_id, o.customer_name, o.created_at
		 FROM orders o
		 JOIN tables t ON t.id = o.table_id
		 WHERE o.id = $1`, id,
	).Scan(&o.ID, &o.TableID, &o.TableNumber, &o.Status, &o.Total, &o.CustomerID, &o.CustomerName, &o.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	rows, err := r.db.Query(
		`SELECT oi.id, oi.order_id, oi.menu_id, m.name, oi.qty, oi.price
		 FROM order_items oi
		 JOIN menus m ON m.id = oi.menu_id
		 WHERE oi.order_id = $1
		 ORDER BY oi.id`, id,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []OrderItem
	for rows.Next() {
		var it OrderItem
		if err := rows.Scan(&it.ID, &it.OrderID, &it.MenuID, &it.MenuName, &it.Qty, &it.Price); err != nil {
			return nil, err
		}
		items = append(items, it)
	}
	if items == nil {
		items = []OrderItem{}
	}
	o.Items = items

	return &o, rows.Err()
}

type menuError struct {
	menuID int
	kind   string
}

func (e *menuError) Error() string {
	if e.kind == "unavailable" {
		return "menu is not available"
	}
	return "menu not found"
}

func errNotFoundMenu(id int) error    { return &menuError{menuID: id, kind: "not_found"} }
func errUnavailableMenu(id int) error { return &menuError{menuID: id, kind: "unavailable"} }

// IsMenuNotFound reports whether err was returned because a menu id didn't exist.
func IsMenuNotFound(err error) bool {
	var e *menuError
	return errors.As(err, &e) && e.kind == "not_found"
}

// IsMenuUnavailable reports whether err was returned because a menu is not available for order.
func IsMenuUnavailable(err error) bool {
	var e *menuError
	return errors.As(err, &e) && e.kind == "unavailable"
}
