// Matches the backend's phoneRegex (backend/internal/handler/order_handler.go):
// Indonesian mobile numbers in the form 08xxx, 628xxx, or +628xxx.
export const PHONE_REGEX = /^(\+62|62|0)8[0-9]{7,11}$/
