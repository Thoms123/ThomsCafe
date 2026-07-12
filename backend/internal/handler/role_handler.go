package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"pos-cafe/internal/repository"
	"pos-cafe/pkg/response"
)

type RoleHandler struct {
	repo *repository.RoleRepository
}

func NewRoleHandler(repo *repository.RoleRepository) *RoleHandler {
	return &RoleHandler{repo: repo}
}

func (h *RoleHandler) List(c *gin.Context) {
	roles, err := h.repo.FindAll()
	if err != nil {
		response.InternalError(c, "Failed to fetch roles")
		return
	}
	response.OK(c, "OK", roles)
}

func (h *RoleHandler) ListPermissions(c *gin.Context) {
	perms, err := h.repo.FindAllPermissions()
	if err != nil {
		response.InternalError(c, "Failed to fetch permissions")
		return
	}
	response.OK(c, "OK", perms)
}

func (h *RoleHandler) Create(c *gin.Context) {
	var req struct {
		Name string `json:"name" binding:"required,min=1,max=50"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, err)
		return
	}

	role, err := h.repo.Create(req.Name)
	if err != nil {
		if repository.IsRoleNameExists(err) {
			response.BadRequest(c, "Nama role sudah digunakan")
			return
		}
		response.InternalError(c, "Failed to create role")
		return
	}
	response.Created(c, "Role created", role)
}

func (h *RoleHandler) UpdatePermissions(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid ID")
		return
	}

	var req struct {
		PermissionIDs []int `json:"permission_ids"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, err)
		return
	}

	role, err := h.repo.UpdatePermissions(id, req.PermissionIDs)
	if err != nil {
		if repository.IsPermissionNotFound(err) {
			response.BadRequest(c, "Permission tidak ditemukan")
			return
		}
		response.InternalError(c, "Failed to update role permissions")
		return
	}
	if role == nil {
		response.NotFound(c, "Role not found")
		return
	}
	response.OK(c, "Role permissions updated", role)
}
