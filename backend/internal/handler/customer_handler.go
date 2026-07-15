package handler

import (
	"regexp"
	"time"

	"github.com/gin-gonic/gin"
	"pos-cafe/internal/repository"
	"pos-cafe/pkg/response"
)

var monthRegex = regexp.MustCompile(`^\d{4}-(0[1-9]|1[0-2])$`)

type CustomerHandler struct {
	customerRepo *repository.CustomerRepository
}

func NewCustomerHandler(customerRepo *repository.CustomerRepository) *CustomerHandler {
	return &CustomerHandler{customerRepo: customerRepo}
}

// List — protected, permission: customer:read
// Returns customers with at least one completed order in the given month
// (?month=YYYY-MM), defaulting to the current month.
func (h *CustomerHandler) List(c *gin.Context) {
	month := c.Query("month")
	if month == "" {
		month = time.Now().Format("2006-01")
	}
	if !monthRegex.MatchString(month) {
		response.BadRequest(c, "Invalid month format, expected YYYY-MM")
		return
	}

	customers, err := h.customerRepo.MonthlyReport(month)
	if err != nil {
		response.InternalError(c, "Failed to fetch customers")
		return
	}
	response.OK(c, "OK", customers)
}
