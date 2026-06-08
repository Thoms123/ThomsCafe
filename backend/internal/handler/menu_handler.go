package handler

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"pos-cafe/internal/repository"
	"pos-cafe/pkg/response"
)

type MenuHandler struct {
	repo       *repository.MenuRepository
	uploadDir  string
	uploadBase string
}

func NewMenuHandler(repo *repository.MenuRepository, uploadDir, uploadBase string) *MenuHandler {
	return &MenuHandler{repo: repo, uploadDir: uploadDir, uploadBase: uploadBase}
}

func (h *MenuHandler) List(c *gin.Context) {
	filter := repository.MenuFilter{}

	if v := c.Query("category_id"); v != "" {
		id, err := strconv.Atoi(v)
		if err == nil {
			filter.CategoryID = &id
		}
	}
	if v := c.Query("available"); v != "" {
		b := v == "true"
		filter.Available = &b
	}

	menus, err := h.repo.FindAll(filter)
	if err != nil {
		response.InternalError(c, "Failed to fetch menus")
		return
	}
	response.OK(c, "OK", menus)
}

func (h *MenuHandler) Create(c *gin.Context) {
	name := strings.TrimSpace(c.PostForm("name"))
	priceStr := c.PostForm("price")
	categoryStr := c.PostForm("category_id")

	if name == "" || priceStr == "" || categoryStr == "" {
		response.BadRequest(c, "name, price, and category_id are required")
		return
	}
	price, err := strconv.ParseFloat(priceStr, 64)
	if err != nil || price < 0 {
		response.BadRequest(c, "Invalid price")
		return
	}
	catID, err := strconv.Atoi(categoryStr)
	if err != nil {
		response.BadRequest(c, "Invalid category_id")
		return
	}

	imagePath := ""
	file, fh, err := c.Request.FormFile("image")
	if err == nil {
		defer file.Close()
		imagePath, err = h.saveImage(file, fh)
		if err != nil {
			response.InternalError(c, "Failed to save image")
			return
		}
	}

	menu, err := h.repo.Create(name, price, imagePath, catID)
	if err != nil {
		response.InternalError(c, "Failed to create menu")
		return
	}
	response.Created(c, "Menu created", menu)
}

func (h *MenuHandler) Update(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid ID")
		return
	}

	existing, err := h.repo.FindByID(id)
	if err != nil || existing == nil {
		response.NotFound(c, "Menu not found")
		return
	}

	name := strings.TrimSpace(c.PostForm("name"))
	priceStr := c.PostForm("price")
	categoryStr := c.PostForm("category_id")

	if name == "" {
		name = existing.Name
	}
	price := existing.Price
	if priceStr != "" {
		if p, e := strconv.ParseFloat(priceStr, 64); e == nil {
			price = p
		}
	}
	catID := existing.CategoryID
	if categoryStr != "" {
		if cid, e := strconv.Atoi(categoryStr); e == nil {
			catID = cid
		}
	}

	imagePath := existing.Image
	file, fh, err := c.Request.FormFile("image")
	if err == nil {
		defer file.Close()
		newPath, saveErr := h.saveImage(file, fh)
		if saveErr != nil {
			response.InternalError(c, "Failed to save image")
			return
		}
		// remove old image
		if existing.Image != "" {
			_ = os.Remove(filepath.Join(h.uploadDir, filepath.Base(existing.Image)))
		}
		imagePath = newPath
	}

	menu, err := h.repo.Update(id, name, price, imagePath, catID)
	if err != nil {
		response.InternalError(c, "Failed to update menu")
		return
	}
	response.OK(c, "Menu updated", menu)
}

func (h *MenuHandler) ToggleAvailability(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid ID")
		return
	}
	menu, err := h.repo.ToggleAvailability(id)
	if err != nil || menu == nil {
		response.NotFound(c, "Menu not found")
		return
	}
	response.OK(c, "Availability updated", menu)
}

func (h *MenuHandler) Delete(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid ID")
		return
	}
	existing, _ := h.repo.FindByID(id)
	ok, err := h.repo.Delete(id)
	if err != nil {
		response.InternalError(c, "Failed to delete menu")
		return
	}
	if !ok {
		response.NotFound(c, "Menu not found")
		return
	}
	if existing != nil && existing.Image != "" {
		_ = os.Remove(filepath.Join(h.uploadDir, filepath.Base(existing.Image)))
	}
	response.OK(c, "Menu deleted", nil)
}

func (h *MenuHandler) saveImage(file multipart.File, fh *multipart.FileHeader) (string, error) {
	ext := strings.ToLower(filepath.Ext(fh.Filename))
	allowed := map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".webp": true}
	if !allowed[ext] {
		return "", fmt.Errorf("unsupported image format")
	}

	b := make([]byte, 8)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	filename := hex.EncodeToString(b) + ext

	if err := os.MkdirAll(h.uploadDir, 0755); err != nil {
		return "", err
	}

	dst, err := os.Create(filepath.Join(h.uploadDir, filename))
	if err != nil {
		return "", err
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		return "", err
	}

	return h.uploadBase + "/" + filename, nil
}
