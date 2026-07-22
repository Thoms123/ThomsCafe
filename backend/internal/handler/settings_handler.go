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
// Returns the full weekly schedule plus a server-computed is_open for today, so
// the customer page's "closed" gate always agrees with what order creation enforces.
func (h *SettingsHandler) GetPublicHours(c *gin.Context) {
	days, err := h.settingsRepo.GetAllHours()
	if err != nil {
		response.InternalError(c, "Failed to fetch store hours")
		return
	}
	today, err := h.settingsRepo.GetTodayHours()
	if err != nil {
		response.InternalError(c, "Failed to fetch store hours")
		return
	}
	response.OK(c, "OK", gin.H{
		"days":       days,
		"open_time":  today.OpenTime,
		"close_time": today.CloseTime,
		"is_closed":  today.IsClosed,
		"is_open":    today.IsOpenNow(),
	})
}

// UpdateHours — protected, permission: setting:update
// Replaces the full weekly schedule; the client always sends all 7 days.
func (h *SettingsHandler) UpdateHours(c *gin.Context) {
	var req struct {
		Days []struct {
			DayOfWeek int    `json:"day_of_week"`
			OpenTime  string `json:"open_time" binding:"required"`
			CloseTime string `json:"close_time" binding:"required"`
			IsClosed  bool   `json:"is_closed"`
		} `json:"days" binding:"required,len=7,dive"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, err)
		return
	}

	seen := make(map[int]bool, 7)
	days := make([]repository.DayHours, 0, 7)
	for _, d := range req.Days {
		if d.DayOfWeek < 0 || d.DayOfWeek > 6 || seen[d.DayOfWeek] {
			response.BadRequest(c, "Jadwal harus mencakup 7 hari yang berbeda")
			return
		}
		seen[d.DayOfWeek] = true

		if !hhmmRegex.MatchString(d.OpenTime) || !hhmmRegex.MatchString(d.CloseTime) {
			response.BadRequest(c, "Format jam harus HH:MM")
			return
		}
		if !d.IsClosed && d.OpenTime >= d.CloseTime {
			response.BadRequest(c, "Jam buka harus lebih awal dari jam tutup")
			return
		}

		days = append(days, repository.DayHours{
			DayOfWeek: d.DayOfWeek,
			OpenTime:  d.OpenTime,
			CloseTime: d.CloseTime,
			IsClosed:  d.IsClosed,
		})
	}

	updated, err := h.settingsRepo.UpdateAllHours(days)
	if err != nil {
		response.InternalError(c, "Failed to update store hours")
		return
	}
	response.OK(c, "Jam operasional berhasil diperbarui", updated)
}
