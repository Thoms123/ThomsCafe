package repository

import (
	"database/sql"
	"errors"

	"github.com/lib/pq"
)

type Permission struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

type Role struct {
	ID          int      `json:"id"`
	Name        string   `json:"name"`
	Permissions []string `json:"permissions"`
}

type RoleRepository struct {
	db *sql.DB
}

func NewRoleRepository(db *sql.DB) *RoleRepository {
	return &RoleRepository{db: db}
}

func (r *RoleRepository) FindAll() ([]Role, error) {
	rows, err := r.db.Query(`SELECT id, name FROM roles ORDER BY name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var roles []Role
	for rows.Next() {
		var ro Role
		if err := rows.Scan(&ro.ID, &ro.Name); err != nil {
			return nil, err
		}
		ro.Permissions = []string{}
		roles = append(roles, ro)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if roles == nil {
		return []Role{}, nil
	}

	permRows, err := r.db.Query(`
		SELECT rp.role_id, p.name
		FROM role_permissions rp
		JOIN permissions p ON p.id = rp.permission_id
		ORDER BY p.name
	`)
	if err != nil {
		return nil, err
	}
	defer permRows.Close()

	permsByRole := make(map[int][]string)
	for permRows.Next() {
		var roleID int
		var name string
		if err := permRows.Scan(&roleID, &name); err != nil {
			return nil, err
		}
		permsByRole[roleID] = append(permsByRole[roleID], name)
	}
	if err := permRows.Err(); err != nil {
		return nil, err
	}

	for i := range roles {
		if perms, ok := permsByRole[roles[i].ID]; ok {
			roles[i].Permissions = perms
		}
	}

	return roles, nil
}

func (r *RoleRepository) FindAllPermissions() ([]Permission, error) {
	rows, err := r.db.Query(`SELECT id, name FROM permissions ORDER BY name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var perms []Permission
	for rows.Next() {
		var p Permission
		if err := rows.Scan(&p.ID, &p.Name); err != nil {
			return nil, err
		}
		perms = append(perms, p)
	}
	if perms == nil {
		perms = []Permission{}
	}
	return perms, rows.Err()
}

func (r *RoleRepository) Create(name string) (*Role, error) {
	var id int
	err := r.db.QueryRow(`INSERT INTO roles (name) VALUES ($1) RETURNING id`, name).Scan(&id)
	if err != nil {
		var pqErr *pq.Error
		if errors.As(err, &pqErr) && pqErr.Code == "23505" {
			return nil, errRoleNameExists
		}
		return nil, err
	}
	return &Role{ID: id, Name: name, Permissions: []string{}}, nil
}

// UpdatePermissions replaces the full set of permissions assigned to a role.
func (r *RoleRepository) UpdatePermissions(roleID int, permissionIDs []int) (*Role, error) {
	var exists bool
	if err := r.db.QueryRow(`SELECT EXISTS(SELECT 1 FROM roles WHERE id = $1)`, roleID).Scan(&exists); err != nil {
		return nil, err
	}
	if !exists {
		return nil, nil
	}

	tx, err := r.db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	if _, err := tx.Exec(`DELETE FROM role_permissions WHERE role_id = $1`, roleID); err != nil {
		return nil, err
	}

	for _, pid := range permissionIDs {
		if _, err := tx.Exec(
			`INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
			roleID, pid,
		); err != nil {
			var pqErr *pq.Error
			if errors.As(err, &pqErr) && pqErr.Code == "23503" {
				return nil, errPermissionNotFound
			}
			return nil, err
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return r.findByID(roleID)
}

func (r *RoleRepository) findByID(id int) (*Role, error) {
	var ro Role
	err := r.db.QueryRow(`SELECT id, name FROM roles WHERE id = $1`, id).Scan(&ro.ID, &ro.Name)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	rows, err := r.db.Query(`
		SELECT p.name FROM permissions p
		JOIN role_permissions rp ON rp.permission_id = p.id
		WHERE rp.role_id = $1 ORDER BY p.name
	`, id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var perms []string
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			return nil, err
		}
		perms = append(perms, name)
	}
	if perms == nil {
		perms = []string{}
	}
	ro.Permissions = perms
	return &ro, rows.Err()
}

var errRoleNameExists = errors.New("role name already exists")
var errPermissionNotFound = errors.New("permission not found")

// IsRoleNameExists reports whether err was returned because the role name is already taken.
func IsRoleNameExists(err error) bool {
	return errors.Is(err, errRoleNameExists)
}

// IsPermissionNotFound reports whether err was returned because a permission id didn't exist.
func IsPermissionNotFound(err error) bool {
	return errors.Is(err, errPermissionNotFound)
}
