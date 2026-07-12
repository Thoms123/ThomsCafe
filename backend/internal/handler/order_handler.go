package handler

import (
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"pos-cafe/internal/repository"
	"pos-cafe/internal/ws"
	"pos-cafe/pkg/response"
)

type OrderHandler struct {
	orderRepo *repository.OrderRepository
	tableRepo *repository.TableRepository
	hub       *ws.Hub
}

func NewOrderHandler(orderRepo *repository.OrderRepository, tableRepo *repository.TableRepository, hub *ws.Hub) *OrderHandler {
	return &OrderHandler{orderRepo: orderRepo, tableRepo: tableRepo, hub: hub}
}

// Create — public endpoint, no auth required
// Resolves the table by token (never trusts a client-supplied table id) and
// snapshots item prices server-side.
func (h *OrderHandler) Create(c *gin.Context) {
	var req struct {
		Token        string `json:"token" binding:"required"`
		CustomerName string `json:"customer_name"`
		Items        []struct {
			MenuID int `json:"menu_id" binding:"required"`
			Qty    int `json:"qty" binding:"required,min=1"`
		} `json:"items" binding:"required,min=1,dive"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, err)
		return
	}

	table, err := h.tableRepo.FindByToken(req.Token)
	if err != nil {
		response.InternalError(c, "Failed to fetch table")
		return
	}
	if table == nil {
		response.NotFound(c, "Table not found")
		return
	}

	items := make([]repository.OrderItemInput, len(req.Items))
	for i, it := range req.Items {
		items[i] = repository.OrderItemInput{MenuID: it.MenuID, Qty: it.Qty}
	}

	var customerName *string
	if name := strings.TrimSpace(req.CustomerName); name != "" {
		customerName = &name
	}

	order, err := h.orderRepo.Create(table.ID, customerName, items)
	if err != nil {
		if repository.IsMenuNotFound(err) {
			response.BadRequest(c, "One or more menu items were not found")
			return
		}
		if repository.IsMenuUnavailable(err) {
			response.BadRequest(c, "One or more menu items are no longer available")
			return
		}
		response.InternalError(c, "Failed to create order")
		return
	}

	h.hub.BroadcastOrderEvent("order_created", order)
	response.Created(c, "Order created", order)
}

// GetStatus — public endpoint, no auth required
func (h *OrderHandler) GetStatus(c *gin.Context) {
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

	response.OK(c, "OK", order)
}

// List — protected, permission: order:read
func (h *OrderHandler) List(c *gin.Context) {
	var f repository.OrderFilter
	if status := c.Query("status"); status != "" {
		f.Status = &status
	}
	if date := c.Query("date"); date != "" {
		f.Date = &date
	}
	if tableID := c.Query("table_id"); tableID != "" {
		id, err := strconv.Atoi(tableID)
		if err != nil {
			response.BadRequest(c, "Invalid table_id")
			return
		}
		f.TableID = &id
	}

	orders, err := h.orderRepo.FindAll(f)
	if err != nil {
		response.InternalError(c, "Failed to fetch orders")
		return
	}
	response.OK(c, "OK", orders)
}

// GetByID — protected, permission: order:read
func (h *OrderHandler) GetByID(c *gin.Context) {
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

	response.OK(c, "OK", order)
}

// UpdateStatus — protected, permission: order:update
func (h *OrderHandler) UpdateStatus(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid order id")
		return
	}

	var req struct {
		Status string `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, err)
		return
	}

	order, err := h.orderRepo.UpdateStatus(id, req.Status)
	if err != nil {
		if repository.IsInvalidStatus(err) {
			response.BadRequest(c, "Invalid status")
			return
		}
		response.InternalError(c, "Failed to update order status")
		return
	}
	if order == nil {
		response.NotFound(c, "Order not found")
		return
	}

	h.hub.BroadcastOrderEvent("order_updated", order)
	h.hub.NotifyOrderStatus(order.ID, order)
	response.OK(c, "Order status updated", order)
}
