package seed

import (
	"database/sql"
	"log"

	"golang.org/x/crypto/bcrypt"
)

var allPermissions = []string{
	"menu:create", "menu:read", "menu:update", "menu:delete",
	"category:create", "category:read", "category:update", "category:delete",
	"table:create", "table:read", "table:update", "table:delete",
	"order:create", "order:read", "order:update", "order:delete",
	"user:create", "user:read", "user:update", "user:delete",
	"role:manage",
	"report:read",
	"customer:read",
}

var adminPermissions = []string{
	"menu:create", "menu:read", "menu:update",
	"category:read",
	"table:read",
	"order:create", "order:read", "order:update",
	"customer:read",
}

func Run(db *sql.DB) {
	ownerID := ensureRole(db, "Owner")
	adminID := ensureRole(db, "Admin")

	for _, p := range allPermissions {
		pid := ensurePermission(db, p)
		linkRolePermission(db, ownerID, pid)
	}

	for _, p := range adminPermissions {
		pid := ensurePermission(db, p)
		linkRolePermission(db, adminID, pid)
	}

	ensureOwnerUser(db, ownerID)

	log.Println("Seed completed")
}

func ensureRole(db *sql.DB, name string) int {
	var id int
	err := db.QueryRow(`INSERT INTO roles (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name=EXCLUDED.name RETURNING id`, name).Scan(&id)
	if err != nil {
		log.Fatalf("seed role %s: %v", name, err)
	}
	return id
}

func ensurePermission(db *sql.DB, name string) int {
	var id int
	err := db.QueryRow(`INSERT INTO permissions (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name=EXCLUDED.name RETURNING id`, name).Scan(&id)
	if err != nil {
		log.Fatalf("seed permission %s: %v", name, err)
	}
	return id
}

func linkRolePermission(db *sql.DB, roleID, permID int) {
	_, err := db.Exec(`INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, roleID, permID)
	if err != nil {
		log.Fatalf("seed role_permission: %v", err)
	}
}

func ensureOwnerUser(db *sql.DB, roleID int) {
	var exists bool
	db.QueryRow(`SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)`, "owner@thomscafe.com").Scan(&exists)
	if exists {
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte("owner123"), bcrypt.DefaultCost)
	if err != nil {
		log.Fatalf("seed hash password: %v", err)
	}

	_, err = db.Exec(
		`INSERT INTO users (name, email, password, role_id) VALUES ($1, $2, $3, $4)`,
		"Owner", "owner@thomscafe.com", string(hash), roleID,
	)
	if err != nil {
		log.Fatalf("seed owner user: %v", err)
	}
	log.Println("Default owner created: owner@thomscafe.com / owner123")
}
