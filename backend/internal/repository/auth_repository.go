package repository

import (
	"database/sql"
	"errors"
)

type UserRow struct {
	ID          int
	Name        string
	Email       string
	Password    string
	Role        string
	Permissions []string
}

type AuthRepository struct {
	db *sql.DB
}

func NewAuthRepository(db *sql.DB) *AuthRepository {
	return &AuthRepository{db: db}
}

func (r *AuthRepository) FindByEmail(email string) (*UserRow, error) {
	query := `
		SELECT u.id, u.name, u.email, u.password, ro.name
		FROM users u
		JOIN roles ro ON ro.id = u.role_id
		WHERE u.email = $1
	`
	row := r.db.QueryRow(query, email)

	u := &UserRow{}
	if err := row.Scan(&u.ID, &u.Name, &u.Email, &u.Password, &u.Role); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	perms, err := r.findPermissions(u.ID)
	if err != nil {
		return nil, err
	}
	u.Permissions = perms

	return u, nil
}

func (r *AuthRepository) FindByID(id int) (*UserRow, error) {
	query := `
		SELECT u.id, u.name, u.email, u.password, ro.name
		FROM users u
		JOIN roles ro ON ro.id = u.role_id
		WHERE u.id = $1
	`
	row := r.db.QueryRow(query, id)

	u := &UserRow{}
	if err := row.Scan(&u.ID, &u.Name, &u.Email, &u.Password, &u.Role); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	perms, err := r.findPermissions(u.ID)
	if err != nil {
		return nil, err
	}
	u.Permissions = perms

	return u, nil
}

func (r *AuthRepository) findPermissions(userID int) ([]string, error) {
	query := `
		SELECT p.name
		FROM permissions p
		JOIN role_permissions rp ON rp.permission_id = p.id
		JOIN users u ON u.role_id = rp.role_id
		WHERE u.id = $1
	`
	rows, err := r.db.Query(query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var perms []string
	for rows.Next() {
		var perm string
		if err := rows.Scan(&perm); err != nil {
			return nil, err
		}
		perms = append(perms, perm)
	}
	return perms, rows.Err()
}
