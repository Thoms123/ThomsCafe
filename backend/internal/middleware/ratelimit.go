package middleware

import (
	"sync"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
	"pos-cafe/pkg/response"
)

// IPRateLimiter hands out an independent token bucket per client IP.
type IPRateLimiter struct {
	mu       sync.Mutex
	limiters map[string]*rate.Limiter
	r        rate.Limit
	b        int
}

func NewIPRateLimiter(r rate.Limit, b int) *IPRateLimiter {
	return &IPRateLimiter{
		limiters: make(map[string]*rate.Limiter),
		r:        r,
		b:        b,
	}
}

func (l *IPRateLimiter) getLimiter(ip string) *rate.Limiter {
	l.mu.Lock()
	defer l.mu.Unlock()

	limiter, ok := l.limiters[ip]
	if !ok {
		limiter = rate.NewLimiter(l.r, l.b)
		l.limiters[ip] = limiter
	}
	return limiter
}

// Middleware rejects requests once a client IP exceeds its token bucket.
func (l *IPRateLimiter) Middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		if !l.getLimiter(c.ClientIP()).Allow() {
			response.TooManyRequests(c, "Too many requests, please slow down")
			c.Abort()
			return
		}
		c.Next()
	}
}
