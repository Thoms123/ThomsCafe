package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"pos-cafe/internal/repository"
	"pos-cafe/pkg/response"
)

type CategoryHandler struct {
	repo *repository.CategoryRepository
}

func NewCategoryHandler(repo *repository.CategoryRepository) *CategoryHandler {
	return &CategoryHandler{repo: repo}
}

func (h *CategoryHandler) List(c *gin.Context) {
	cats, err := h.repo.FindAll()
	if err != nil {
		response.InternalError(c, "Failed to fetch categories")
		return
	}
	response.OK(c, "OK", cats)
}

func (h *CategoryHandler) Create(c *gin.Context) {
	var req struct {
		Name string `json:"name" binding:"required,min=1,max=100"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, err)
		return
	}
	cat, err := h.repo.Create(req.Name)
	if err != nil {
		response.InternalError(c, "Failed to create category")
		return
	}
	response.Created(c, "Category created", cat)
}

func (h *CategoryHandler) Update(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid ID")
		return
	}
	var req struct {
		Name string `json:"name" binding:"required,min=1,max=100"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, err)
		return
	}
	cat, err := h.repo.Update(id, req.Name)
	if err != nil {
		response.InternalError(c, "Failed to update category")
		return
	}
	if cat == nil {
		response.NotFound(c, "Category not found")
		return
	}
	response.OK(c, "Category updated", cat)
}

func (h *CategoryHandler) Delete(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid ID")
		return
	}
	ok, err := h.repo.Delete(id)
	if err != nil {
		response.InternalError(c, "Failed to delete category")
		return
	}
	if !ok {
		response.NotFound(c, "Category not found")
		return
	}
	response.OK(c, "Category deleted", nil)
}
