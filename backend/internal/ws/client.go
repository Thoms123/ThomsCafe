package ws

import (
	"net/http"
	"os"
	"time"

	"github.com/gorilla/websocket"
)

const (
	pingInterval = 30 * time.Second
	pongWait     = 60 * time.Second
	sendBuffer   = 16
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		origin := r.Header.Get("Origin")
		if origin == "" {
			return true
		}
		frontendURL := os.Getenv("FRONTEND_URL")
		if frontendURL == "" {
			frontendURL = "http://localhost:5173"
		}
		return origin == frontendURL
	},
}

// ServeOrdersWS upgrades the request and registers the connection on
// /ws/orders (broadcast to all kasir/staff).
func ServeOrdersWS(hub *Hub, w http.ResponseWriter, r *http.Request, userID int) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}

	client := &Client{conn: conn, send: make(chan []byte, sendBuffer), userID: userID}
	hub.RegisterOrders(client)

	go client.writePump()
	client.readPump(func() { hub.UnregisterOrders(client) })
}

// ServeOrderSubWS upgrades the request and registers the connection for
// status updates on a single order (/ws/order/:id).
func ServeOrderSubWS(hub *Hub, w http.ResponseWriter, r *http.Request, orderID int) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}

	client := &Client{conn: conn, send: make(chan []byte, sendBuffer)}
	hub.RegisterOrderSub(orderID, client)

	go client.writePump()
	client.readPump(func() { hub.UnregisterOrderSub(orderID, client) })
}

// readPump only exists to detect the connection closing (these channels are
// server-push-only; clients never send meaningful messages). On any read
// error it runs the unregister callback and returns, letting writePump exit
// via the closed send channel.
func (c *Client) readPump(onClose func()) {
	defer func() {
		onClose()
		c.conn.Close()
	}()

	c.conn.SetReadLimit(512)
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		if _, _, err := c.conn.ReadMessage(); err != nil {
			return
		}
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(pingInterval)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case msg, ok := <-c.send:
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.conn.WriteMessage(websocket.TextMessage, msg); err != nil {
				return
			}
		case <-ticker.C:
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
