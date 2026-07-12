package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"pos-cafe/internal/repository"
	"pos-cafe/internal/ws"
	"pos-cafe/pkg/response"
	"pos-cafe/pkg/utils"
)

type WSHandler struct {
	hub       *ws.Hub
	orderRepo *repository.OrderRepository
}

func NewWSHandler(hub *ws.Hub, orderRepo *repository.OrderRepository) *WSHandler {
	return &WSHandler{hub: hub, orderRepo: orderRepo}
}

// HandleOrdersWS — GET /ws/orders?token=<jwt>
// Browsers can't set an Authorization header on a WebSocket handshake, so
// the JWT is passed as a query param and validated manually here instead of
// via AuthMiddleware (which can't run before the connection is hijacked).
func (h *WSHandler) HandleOrdersWS(c *gin.Context) {
	token := c.Query("token")
	claims, err := utils.ValidateJWT(token)
	if err != nil {
		response.Unauthorized(c, "Invalid or expired token")
		return
	}

	ws.ServeOrdersWS(h.hub, c.Writer, c.Request, claims.UserID)
}

// HandleOrderSubWS — GET /ws/order/:id, public (mirrors POST /public/orders).
func (h *WSHandler) HandleOrderSubWS(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid order id")
		return
	}

	order, err := h.orderRepo.FindByID(id)
	if err != nil {
		response.InternalError(c, "Failed to fetch order")
		return
	}
	if order == nil {
		response.NotFound(c, "Order not found")
		return
	}

	ws.ServeOrderSubWS(h.hub, c.Writer, c.Request, id)
}
