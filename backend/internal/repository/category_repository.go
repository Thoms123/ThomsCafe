package repository

import (
	"database/sql"
	"errors"
	"time"
)

type Category struct {
	ID        int       `json:"id"`
	Name      string    `json:"name"`
	CreatedAt time.Time `json:"created_at"`
}

type CategoryRepository struct {
	db *sql.DB
}

func NewCategoryRepository(db *sql.DB) *CategoryRepository {
	return &CategoryRepository{db: db}
}

func (r *CategoryRepository) FindAll() ([]Category, error) {
	rows, err := r.db.Query(`SELECT id, name, created_at FROM categories ORDER BY name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var cats []Category
	for rows.Next() {
		var c Category
		if err := rows.Scan(&c.ID, &c.Name, &c.CreatedAt); err != nil {
			return nil, err
		}
		cats = append(cats, c)
	}
	if cats == nil {
		cats = []Category{}
	}
	return cats, rows.Err()
}

func (r *CategoryRepository) FindByID(id int) (*Category, error) {
	var c Category
	err := r.db.QueryRow(`SELECT id, name, created_at FROM categories WHERE id = $1`, id).
		Scan(&c.ID, &c.Name, &c.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return &c, err
}

func (r *CategoryRepository) Create(name string) (*Category, error) {
	var c Category
	err := r.db.QueryRow(
		`INSERT INTO categories (name) VALUES ($1) RETURNING id, name, created_at`, name,
	).Scan(&c.ID, &c.Name, &c.CreatedAt)
	return &c, err
}

func (r *CategoryRepository) Update(id int, name string) (*Category, error) {
	var c Category
	err := r.db.QueryRow(
		`UPDATE categories SET name = $1 WHERE id = $2 RETURNING id, name, created_at`, name, id,
	).Scan(&c.ID, &c.Name, &c.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return &c, err
}

func (r *CategoryRepository) Delete(id int) (bool, error) {
	res, err := r.db.Exec(`DELETE FROM categories WHERE id = $1`, id)
	if err != nil {
		return false, err
	}
	n, _ := res.RowsAffected()
	return n > 0, nil
}
