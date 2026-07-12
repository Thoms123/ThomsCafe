package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"pos-cafe/internal/repository"
	"pos-cafe/pkg/response"
)

type ReportHandler struct {
	repo *repository.ReportRepository
}

func NewReportHandler(repo *repository.ReportRepository) *ReportHandler {
	return &ReportHandler{repo: repo}
}

func parseReportFilter(c *gin.Context) repository.ReportFilter {
	var f repository.ReportFilter
	if from := c.Query("from"); from != "" {
		f.From = &from
	}
	if to := c.Query("to"); to != "" {
		f.To = &to
	}
	return f
}

// Sales — GET /reports/sales?from=&to=
func (h *ReportHandler) Sales(c *gin.Context) {
	summary, err := h.repo.SalesSummary(parseReportFilter(c))
	if err != nil {
		response.InternalError(c, "Failed to fetch sales summary")
		return
	}
	response.OK(c, "OK", summary)
}

// DailySales — GET /reports/sales/daily?from=&to=
func (h *ReportHandler) DailySales(c *gin.Context) {
	days, err := h.repo.DailySales(parseReportFilter(c))
	if err != nil {
		response.InternalError(c, "Failed to fetch daily sales")
		return
	}
	response.OK(c, "OK", days)
}

// TopMenus — GET /reports/top-menus?limit=10&from=&to=
func (h *ReportHandler) TopMenus(c *gin.Context) {
	limit := 10
	if l := c.Query("limit"); l != "" {
		parsed, err := strconv.Atoi(l)
		if err != nil || parsed < 1 {
			response.BadRequest(c, "Invalid limit")
			return
		}
		limit = parsed
	}

	menus, err := h.repo.TopMenus(parseReportFilter(c), limit)
	if err != nil {
		response.InternalError(c, "Failed to fetch top menus")
		return
	}
	response.OK(c, "OK", menus)
}

// TableRecap — GET /reports/tables?from=&to=
func (h *ReportHandler) TableRecap(c *gin.Context) {
	tables, err := h.repo.TableRecap(parseReportFilter(c))
	if err != nil {
		response.InternalError(c, "Failed to fetch table recap")
		return
	}
	response.OK(c, "OK", tables)
}
