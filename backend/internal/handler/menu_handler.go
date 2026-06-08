package handler

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"mime/multipart"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/cloudinary/cloudinary-go/v2"
	"github.com/cloudinary/cloudinary-go/v2/api/uploader"
	"github.com/gin-gonic/gin"
	"pos-cafe/internal/repository"
	"pos-cafe/pkg/response"
)

type MenuHandler struct {
	repo *repository.MenuRepository
	cld  *cloudinary.Cloudinary
}

func NewMenuHandler(repo *repository.MenuRepository, cld *cloudinary.Cloudinary) *MenuHandler {
	return &MenuHandler{repo: repo, cld: cld}
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

	imageURL := ""
	file, fh, err := c.Request.FormFile("image")
	if err == nil {
		defer file.Close()
		imageURL, err = h.uploadImage(file, fh)
		if err != nil {
			response.InternalError(c, "Failed to upload image")
			return
		}
	}

	menu, err := h.repo.Create(name, price, imageURL, catID)
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

	imageURL := existing.Image
	file, fh, err := c.Request.FormFile("image")
	if err == nil {
		defer file.Close()
		newURL, uploadErr := h.uploadImage(file, fh)
		if uploadErr != nil {
			response.InternalError(c, "Failed to upload image")
			return
		}
		h.deleteImage(existing.Image)
		imageURL = newURL
	}

	menu, err := h.repo.Update(id, name, price, imageURL, catID)
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
	if existing != nil {
		h.deleteImage(existing.Image)
	}
	response.OK(c, "Menu deleted", nil)
}

func (h *MenuHandler) uploadImage(file multipart.File, fh *multipart.FileHeader) (string, error) {
	ext := strings.ToLower(filepath.Ext(fh.Filename))
	allowed := map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".webp": true}
	if !allowed[ext] {
		return "", fmt.Errorf("unsupported image format")
	}

	b := make([]byte, 8)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	publicID := "thomscafe/menus/" + hex.EncodeToString(b)

	resp, err := h.cld.Upload.Upload(context.Background(), file, uploader.UploadParams{
		PublicID:     publicID,
		ResourceType: "image",
	})
	if err != nil {
		return "", err
	}
	return resp.SecureURL, nil
}

func (h *MenuHandler) deleteImage(imageURL string) {
	if imageURL == "" {
		return
	}
	// Extract public_id from URL: everything after /upload/ (strip version prefix and extension)
	idx := strings.Index(imageURL, "/upload/")
	if idx == -1 {
		return
	}
	publicID := imageURL[idx+len("/upload/"):]
	// Strip version segment if present (e.g. "v1234567890/")
	if len(publicID) > 1 && publicID[0] == 'v' {
		for i := 1; i < len(publicID); i++ {
			if publicID[i] == '/' {
				publicID = publicID[i+1:]
				break
			}
			if publicID[i] < '0' || publicID[i] > '9' {
				break
			}
		}
	}
	// Strip file extension
	if dot := strings.LastIndex(publicID, "."); dot != -1 {
		publicID = publicID[:dot]
	}
	_, _ = h.cld.Upload.Destroy(context.Background(), uploader.DestroyParams{PublicID: publicID})
}
