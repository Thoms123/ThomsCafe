package handler

import (
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"pos-cafe/internal/repository"
	"pos-cafe/pkg/response"
)

type TableHandler struct {
	tableRepo *repository.TableRepository
	menuRepo  *repository.MenuRepository
}

func NewTableHandler(tableRepo *repository.TableRepository, menuRepo *repository.MenuRepository) *TableHandler {
	return &TableHandler{tableRepo: tableRepo, menuRepo: menuRepo}
}

func (h *TableHandler) List(c *gin.Context) {
	tables, err := h.tableRepo.FindAll()
	if err != nil {
		response.InternalError(c, "Failed to fetch tables")
		return
	}
	response.OK(c, "OK", tables)
}

func (h *TableHandler) Create(c *gin.Context) {
	var req struct {
		TableNumber string `json:"table_number" binding:"required,min=1,max=20"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	table, err := h.tableRepo.Create(strings.TrimSpace(req.TableNumber))
	if err != nil {
		response.InternalError(c, "Failed to create table")
		return
	}
	response.Created(c, "Table created", table)
}

func (h *TableHandler) Update(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid ID")
		return
	}
	var req struct {
		TableNumber string `json:"table_number" binding:"required,min=1,max=20"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	table, err := h.tableRepo.Update(id, strings.TrimSpace(req.TableNumber))
	if err != nil {
		response.InternalError(c, "Failed to update table")
		return
	}
	if table == nil {
		response.NotFound(c, "Table not found")
		return
	}
	response.OK(c, "Table updated", table)
}

func (h *TableHandler) Delete(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid ID")
		return
	}
	ok, err := h.tableRepo.Delete(id)
	if err != nil {
		response.InternalError(c, "Failed to delete table")
		return
	}
	if !ok {
		response.NotFound(c, "Table not found")
		return
	}
	response.OK(c, "Table deleted", nil)
}

// PublicMenuByToken — public endpoint, no auth required
// Returns table info + all available menus
func (h *TableHandler) PublicMenuByToken(c *gin.Context) {
	token := c.Param("token")
	if token == "" {
		response.BadRequest(c, "Token required")
		return
	}

	table, err := h.tableRepo.FindByToken(token)
	if err != nil {
		response.InternalError(c, "Failed to fetch table")
		return
	}
	if table == nil {
		response.NotFound(c, "Table not found")
		return
	}

	available := true
	menus, err := h.menuRepo.FindAll(repository.MenuFilter{Available: &available})
	if err != nil {
		response.InternalError(c, "Failed to fetch menus")
		return
	}

	response.OK(c, "OK", gin.H{
		"table": gin.H{
			"id":           table.ID,
			"table_number": table.TableNumber,
		},
		"menus": menus,
	})
}
