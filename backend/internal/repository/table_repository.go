package repository

import (
	"crypto/rand"
	"database/sql"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	qrcode "github.com/skip2/go-qrcode"
)

type Table struct {
	ID          int       `json:"id"`
	TableNumber string    `json:"table_number"`
	Token       string    `json:"token"`
	QRCode      string    `json:"qr_code"`
	CreatedAt   time.Time `json:"created_at"`
}

type TableRepository struct {
	db          *sql.DB
	frontendURL string
}

func NewTableRepository(db *sql.DB, frontendURL string) *TableRepository {
	return &TableRepository{db: db, frontendURL: frontendURL}
}

func (r *TableRepository) FindAll() ([]Table, error) {
	rows, err := r.db.Query(
		`SELECT id, table_number, token, qr_code, created_at FROM tables ORDER BY table_number`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tables []Table
	for rows.Next() {
		var t Table
		if err := rows.Scan(&t.ID, &t.TableNumber, &t.Token, &t.QRCode, &t.CreatedAt); err != nil {
			return nil, err
		}
		tables = append(tables, t)
	}
	if tables == nil {
		tables = []Table{}
	}
	return tables, rows.Err()
}

func (r *TableRepository) FindByID(id int) (*Table, error) {
	var t Table
	err := r.db.QueryRow(
		`SELECT id, table_number, token, qr_code, created_at FROM tables WHERE id = $1`, id,
	).Scan(&t.ID, &t.TableNumber, &t.Token, &t.QRCode, &t.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return &t, err
}

func (r *TableRepository) FindByToken(token string) (*Table, error) {
	var t Table
	err := r.db.QueryRow(
		`SELECT id, table_number, token, qr_code, created_at FROM tables WHERE token = $1`, token,
	).Scan(&t.ID, &t.TableNumber, &t.Token, &t.QRCode, &t.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return &t, err
}

func (r *TableRepository) Create(tableNumber string) (*Table, error) {
	token, err := generateToken()
	if err != nil {
		return nil, err
	}
	qrCode, err := r.generateQRCode(token)
	if err != nil {
		return nil, err
	}

	var t Table
	err = r.db.QueryRow(
		`INSERT INTO tables (table_number, token, qr_code) VALUES ($1, $2, $3) RETURNING id, table_number, token, qr_code, created_at`,
		tableNumber, token, qrCode,
	).Scan(&t.ID, &t.TableNumber, &t.Token, &t.QRCode, &t.CreatedAt)
	return &t, err
}

func (r *TableRepository) Update(id int, tableNumber string) (*Table, error) {
	// Regenerate QR if table number changes (token stays the same)
	existing, err := r.FindByID(id)
	if err != nil || existing == nil {
		return nil, err
	}

	qrCode, err := r.generateQRCode(existing.Token)
	if err != nil {
		return nil, err
	}

	var t Table
	err = r.db.QueryRow(
		`UPDATE tables SET table_number=$1, qr_code=$2 WHERE id=$3 RETURNING id, table_number, token, qr_code, created_at`,
		tableNumber, qrCode, id,
	).Scan(&t.ID, &t.TableNumber, &t.Token, &t.QRCode, &t.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return &t, err
}

func (r *TableRepository) Delete(id int) (bool, error) {
	res, err := r.db.Exec(`DELETE FROM tables WHERE id = $1`, id)
	if err != nil {
		return false, err
	}
	n, _ := res.RowsAffected()
	return n > 0, nil
}

func (r *TableRepository) generateQRCode(token string) (string, error) {
	url := fmt.Sprintf("%s/menu/%s", r.frontendURL, token)
	png, err := qrcode.Encode(url, qrcode.Medium, 300)
	if err != nil {
		return "", err
	}
	return "data:image/png;base64," + base64.StdEncoding.EncodeToString(png), nil
}

func generateToken() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}
