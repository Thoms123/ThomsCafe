package ws

import (
	"encoding/json"
	"sync"

	"github.com/gorilla/websocket"
)

// Client wraps a single WebSocket connection. Writes go through the
// buffered send channel so a slow reader can never block the broadcaster.
type Client struct {
	conn *websocket.Conn
	send chan []byte
}

// Hub fans out order events to connected kasir/staff clients (/ws/orders)
// and per-order status updates to the customers watching that order
// (/ws/order/:id).
type Hub struct {
	mu              sync.RWMutex
	orderClients    map[*Client]bool
	orderSubClients map[int]map[*Client]bool
}

func NewHub() *Hub {
	return &Hub{
		orderClients:    make(map[*Client]bool),
		orderSubClients: make(map[int]map[*Client]bool),
	}
}

func (h *Hub) RegisterOrders(c *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.orderClients[c] = true
}

func (h *Hub) UnregisterOrders(c *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if _, ok := h.orderClients[c]; ok {
		delete(h.orderClients, c)
		close(c.send)
	}
}

func (h *Hub) RegisterOrderSub(orderID int, c *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.orderSubClients[orderID] == nil {
		h.orderSubClients[orderID] = make(map[*Client]bool)
	}
	h.orderSubClients[orderID][c] = true
}

func (h *Hub) UnregisterOrderSub(orderID int, c *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	clients, ok := h.orderSubClients[orderID]
	if !ok {
		return
	}
	if _, ok := clients[c]; ok {
		delete(clients, c)
		close(c.send)
	}
	if len(clients) == 0 {
		delete(h.orderSubClients, orderID)
	}
}

// BroadcastOrderEvent notifies every connected kasir/staff client on /ws/orders.
func (h *Hub) BroadcastOrderEvent(event string, order any) {
	payload, err := json.Marshal(map[string]any{"event": event, "order": order})
	if err != nil {
		return
	}

	h.mu.RLock()
	clients := make([]*Client, 0, len(h.orderClients))
	for c := range h.orderClients {
		clients = append(clients, c)
	}
	h.mu.RUnlock()

	for _, c := range clients {
		select {
		case c.send <- payload:
		default:
			// Client too slow to keep up; drop the message rather than block.
		}
	}
}

// NotifyOrderStatus pushes a status update to customers watching a specific order.
func (h *Hub) NotifyOrderStatus(orderID int, order any) {
	payload, err := json.Marshal(map[string]any{"event": "status_updated", "order": order})
	if err != nil {
		return
	}

	h.mu.RLock()
	subs := h.orderSubClients[orderID]
	clients := make([]*Client, 0, len(subs))
	for c := range subs {
		clients = append(clients, c)
	}
	h.mu.RUnlock()

	for _, c := range clients {
		select {
		case c.send <- payload:
		default:
		}
	}
}
