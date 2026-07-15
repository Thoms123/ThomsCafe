package handler

import (
	"regexp"

	"github.com/gin-gonic/gin"
	"pos-cafe/internal/repository"
	"pos-cafe/pkg/response"
)

var hhmmRegex = regexp.MustCompile(`^([01]\d|2[0-3]):([0-5]\d)$`)

type SettingsHandler struct {
	settingsRepo *repository.SettingsRepository
}

func NewSettingsHandler(settingsRepo *repository.SettingsRepository) *SettingsHandler {
	return &SettingsHandler{settingsRepo: settingsRepo}
}

// GetPublicHours — public endpoint, no auth required
// Returns the store's daily hours plus a server-computed is_open, so the
// customer page's "closed" gate always agrees with what order creation enforces.
func (h *SettingsHandler) GetPublicHours(c *gin.Context) {
	settings, err := h.settingsRepo.GetStoreHours()
	if err != nil {
		response.InternalError(c, "Failed to fetch store hours")
		return
	}
	response.OK(c, "OK", gin.H{
		"open_time":  settings.OpenTime,
		"close_time": settings.CloseTime,
		"is_open":    settings.IsOpenNow(),
	})
}

// UpdateHours — protected, permission: setting:update
func (h *SettingsHandler) UpdateHours(c *gin.Context) {
	var req struct {
		OpenTime  string `json:"open_time" binding:"required"`
		CloseTime string `json:"close_time" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, err)
		return
	}
	if !hhmmRegex.MatchString(req.OpenTime) || !hhmmRegex.MatchString(req.CloseTime) {
		response.BadRequest(c, "Format jam harus HH:MM")
		return
	}
	if req.OpenTime >= req.CloseTime {
		response.BadRequest(c, "Jam buka harus lebih awal dari jam tutup")
		return
	}

	settings, err := h.settingsRepo.UpdateStoreHours(req.OpenTime, req.CloseTime)
	if err != nil {
		response.InternalError(c, "Failed to update store hours")
		return
	}
	response.OK(c, "Store hours updated", settings)
}
