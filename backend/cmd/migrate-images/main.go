package main

import (
	"context"
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/cloudinary/cloudinary-go/v2"
	"github.com/cloudinary/cloudinary-go/v2/api/uploader"
	"github.com/joho/godotenv"
	"pos-cafe/internal/config"
)

const localUploadDir = "uploads/menus"

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file, using env vars")
	}

	db, err := config.ConnectDB()
	if err != nil {
		log.Fatalf("DB connect: %v", err)
	}
	defer db.Close()

	cld, err := cloudinary.NewFromParams(
		os.Getenv("CLOUDINARY_CLOUD_NAME"),
		os.Getenv("CLOUDINARY_API_KEY"),
		os.Getenv("CLOUDINARY_API_SECRET"),
	)
	if err != nil {
		log.Fatalf("Cloudinary init: %v", err)
	}

	rows, err := db.Query(`SELECT id, image FROM menus WHERE image LIKE '/uploads/%'`)
	if err != nil {
		log.Fatalf("Query menus: %v", err)
	}
	defer rows.Close()

	type menuRow struct {
		id    int
		image string
	}
	var menus []menuRow
	for rows.Next() {
		var m menuRow
		rows.Scan(&m.id, &m.image)
		menus = append(menus, m)
	}

	log.Printf("Found %d menus with local images", len(menus))

	for _, m := range menus {
		filename := filepath.Base(m.image)
		localPath := filepath.Join(localUploadDir, filename)

		f, err := os.Open(localPath)
		if err != nil {
			log.Printf("[SKIP] id=%d: cannot open %s: %v", m.id, localPath, err)
			continue
		}

		// public_id = thomscafe/menus/{filename_without_ext}
		nameWithoutExt := strings.TrimSuffix(filename, filepath.Ext(filename))
		publicID := "thomscafe/menus/" + nameWithoutExt

		resp, err := cld.Upload.Upload(context.Background(), f, uploader.UploadParams{
			PublicID:     publicID,
			ResourceType: "image",
		})
		f.Close()
		if err != nil {
			log.Printf("[FAIL] id=%d %s: %v", m.id, filename, err)
			continue
		}

		_, err = db.Exec(`UPDATE menus SET image=$1 WHERE id=$2`, resp.SecureURL, m.id)
		if err != nil {
			log.Printf("[FAIL] id=%d update DB: %v", m.id, err)
			continue
		}

		log.Printf("[OK] id=%d %s → %s", m.id, filename, resp.SecureURL)
	}

	log.Println("Migration done.")
}
