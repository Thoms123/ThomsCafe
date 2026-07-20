package repository

import (
	"database/sql"
	"errors"
	"fmt"
	"time"
)

type Menu struct {
	ID            int       `json:"id"`
	Name          string    `json:"name"`
	Description   string    `json:"description"`
	Price         float64   `json:"price"`
	Image         string    `json:"image"`
	CategoryID    int       `json:"category_id"`
	Category      string    `json:"category"`
	IsAvailable   bool      `json:"is_available"`
	IsRecommended bool      `json:"is_recommended"`
	CreatedAt     time.Time `json:"created_at"`
}

type MenuFilter struct {
	CategoryID *int
	Available  *bool
}

type MenuRepository struct {
	db *sql.DB
}

func NewMenuRepository(db *sql.DB) *MenuRepository {
	return &MenuRepository{db: db}
}

func (r *MenuRepository) FindAll(f MenuFilter) ([]Menu, error) {
	query := `
		SELECT m.id, m.name, m.description, m.price, m.image, m.category_id, c.name, m.is_available, m.is_recommended, m.created_at
		FROM menus m
		JOIN categories c ON c.id = m.category_id
		WHERE 1=1
	`
	args := []interface{}{}
	n := 1

	if f.CategoryID != nil {
		query += fmt.Sprintf(` AND m.category_id = $%d`, n)
		args = append(args, *f.CategoryID)
		n++
	}
	if f.Available != nil {
		query += fmt.Sprintf(` AND m.is_available = $%d`, n)
		args = append(args, *f.Available)
		n++
	}
	query += ` ORDER BY m.name`

	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var menus []Menu
	for rows.Next() {
		var m Menu
		if err := rows.Scan(&m.ID, &m.Name, &m.Description, &m.Price, &m.Image, &m.CategoryID, &m.Category, &m.IsAvailable, &m.IsRecommended, &m.CreatedAt); err != nil {
			return nil, err
		}
		menus = append(menus, m)
	}
	if menus == nil {
		menus = []Menu{}
	}
	return menus, rows.Err()
}

func (r *MenuRepository) FindByID(id int) (*Menu, error) {
	var m Menu
	err := r.db.QueryRow(`
		SELECT m.id, m.name, m.description, m.price, m.image, m.category_id, c.name, m.is_available, m.is_recommended, m.created_at
		FROM menus m
		JOIN categories c ON c.id = m.category_id
		WHERE m.id = $1
	`, id).Scan(&m.ID, &m.Name, &m.Description, &m.Price, &m.Image, &m.CategoryID, &m.Category, &m.IsAvailable, &m.IsRecommended, &m.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return &m, err
}

func (r *MenuRepository) Create(name string, description string, price float64, image string, categoryID int, isRecommended bool) (*Menu, error) {
	var id int
	err := r.db.QueryRow(
		`INSERT INTO menus (name, description, price, image, category_id, is_recommended) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
		name, description, price, image, categoryID, isRecommended,
	).Scan(&id)
	if err != nil {
		return nil, err
	}
	return r.FindByID(id)
}

func (r *MenuRepository) Update(id int, name string, description string, price float64, image string, categoryID int, isRecommended bool) (*Menu, error) {
	_, err := r.db.Exec(
		`UPDATE menus SET name=$1, description=$2, price=$3, image=$4, category_id=$5, is_recommended=$6 WHERE id=$7`,
		name, description, price, image, categoryID, isRecommended, id,
	)
	if err != nil {
		return nil, err
	}
	return r.FindByID(id)
}

func (r *MenuRepository) ToggleAvailability(id int) (*Menu, error) {
	_, err := r.db.Exec(`UPDATE menus SET is_available = NOT is_available WHERE id = $1`, id)
	if err != nil {
		return nil, err
	}
	return r.FindByID(id)
}

func (r *MenuRepository) Delete(id int) (bool, error) {
	res, err := r.db.Exec(`DELETE FROM menus WHERE id = $1`, id)
	if err != nil {
		return false, err
	}
	n, _ := res.RowsAffected()
	return n > 0, nil
}
