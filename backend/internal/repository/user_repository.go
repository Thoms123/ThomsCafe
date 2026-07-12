package repository

import (
	"database/sql"
	"errors"
	"time"

	"github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
)

type User struct {
	ID        int       `json:"id"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	RoleID    int       `json:"role_id"`
	Role      string    `json:"role"`
	IsActive  bool      `json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
}

type UserUpdateInput struct {
	Name     string
	Email    string
	RoleID   int
	IsActive bool
	Password *string // nil = keep existing password
}

type UserRepository struct {
	db *sql.DB
}

func NewUserRepository(db *sql.DB) *UserRepository {
	return &UserRepository{db: db}
}

func (r *UserRepository) FindAll() ([]User, error) {
	rows, err := r.db.Query(`
		SELECT u.id, u.name, u.email, u.role_id, ro.name, u.is_active, u.created_at
		FROM users u
		JOIN roles ro ON ro.id = u.role_id
		ORDER BY u.name
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []User
	for rows.Next() {
		var u User
		if err := rows.Scan(&u.ID, &u.Name, &u.Email, &u.RoleID, &u.Role, &u.IsActive, &u.CreatedAt); err != nil {
			return nil, err
		}
		users = append(users, u)
	}
	if users == nil {
		users = []User{}
	}
	return users, rows.Err()
}

func (r *UserRepository) FindByID(id int) (*User, error) {
	var u User
	err := r.db.QueryRow(`
		SELECT u.id, u.name, u.email, u.role_id, ro.name, u.is_active, u.created_at
		FROM users u
		JOIN roles ro ON ro.id = u.role_id
		WHERE u.id = $1
	`, id).Scan(&u.ID, &u.Name, &u.Email, &u.RoleID, &u.Role, &u.IsActive, &u.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *UserRepository) Create(name, email, password string, roleID int) (*User, error) {
	var exists bool
	if err := r.db.QueryRow(`SELECT EXISTS(SELECT 1 FROM roles WHERE id = $1)`, roleID).Scan(&exists); err != nil {
		return nil, err
	}
	if !exists {
		return nil, errRoleNotFound
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	var id int
	err = r.db.QueryRow(
		`INSERT INTO users (name, email, password, role_id) VALUES ($1, $2, $3, $4) RETURNING id`,
		name, email, string(hash), roleID,
	).Scan(&id)
	if err != nil {
		var pqErr *pq.Error
		if errors.As(err, &pqErr) && pqErr.Code == "23505" {
			return nil, errEmailExists
		}
		return nil, err
	}
	return r.FindByID(id)
}

func (r *UserRepository) Update(id int, in UserUpdateInput) (*User, error) {
	var roleExists bool
	if err := r.db.QueryRow(`SELECT EXISTS(SELECT 1 FROM roles WHERE id = $1)`, in.RoleID).Scan(&roleExists); err != nil {
		return nil, err
	}
	if !roleExists {
		return nil, errRoleNotFound
	}

	var res sql.Result
	var err error
	if in.Password != nil {
		hash, herr := bcrypt.GenerateFromPassword([]byte(*in.Password), bcrypt.DefaultCost)
		if herr != nil {
			return nil, herr
		}
		res, err = r.db.Exec(
			`UPDATE users SET name = $1, email = $2, role_id = $3, is_active = $4, password = $5 WHERE id = $6`,
			in.Name, in.Email, in.RoleID, in.IsActive, string(hash), id,
		)
	} else {
		res, err = r.db.Exec(
			`UPDATE users SET name = $1, email = $2, role_id = $3, is_active = $4 WHERE id = $5`,
			in.Name, in.Email, in.RoleID, in.IsActive, id,
		)
	}
	if err != nil {
		var pqErr *pq.Error
		if errors.As(err, &pqErr) && pqErr.Code == "23505" {
			return nil, errEmailExists
		}
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

func (r *UserRepository) Delete(id int) (bool, error) {
	res, err := r.db.Exec(`DELETE FROM users WHERE id = $1`, id)
	if err != nil {
		return false, err
	}
	n, _ := res.RowsAffected()
	return n > 0, nil
}

var errRoleNotFound = errors.New("role not found")
var errEmailExists = errors.New("email already exists")

// IsRoleNotFound reports whether err was returned because a role_id didn't exist.
func IsRoleNotFound(err error) bool {
	return errors.Is(err, errRoleNotFound)
}

// IsEmailExists reports whether err was returned because the email is already taken.
func IsEmailExists(err error) bool {
	return errors.Is(err, errEmailExists)
}
