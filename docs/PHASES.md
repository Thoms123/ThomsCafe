# ThomsCafe POS — Development Phases

Aplikasi POS (Point of Sale) CMS untuk cafe dengan 3 role: **Customer**, **Admin/Kasir**, dan **Owner**.

## Tech Stack

| Layer | Teknologi |
|---|---|
| Backend | Go + Gin |
| Database | PostgreSQL |
| Auth | JWT (Role-Based) |
| Migration | golang-migrate |
| Frontend | React + TypeScript (Vite) |
| UI Library | shadcn/ui + Tailwind CSS v4 |
| State | Zustand (global) + React Query (server) |
| HTTP Client | Axios |
| Charts | Recharts (Phase 8) |
| Infra | Docker + docker-compose (Phase 10) |

---

## Phase 1 — Project Setup & Foundation ✅

**Status:** Selesai

### Backend
- Inisialisasi struktur folder Go (`cmd`, `internal`, `pkg`, `migrations`)
- Setup Gin framework, PostgreSQL connection, konfigurasi `.env`
- Boilerplate: router, CORS middleware, standard response helper
- JWT utility: generate & validate token dengan claims (user_id, role, permissions)
- Auth middleware stub & RBAC permission middleware

### Frontend
- Inisialisasi project Vite + React + TypeScript
- Setup Tailwind CSS v4 + shadcn/ui (manual setup)
- Komponen UI dasar: Button, Input, Card, Badge
- Axios instance dengan interceptor auth & auto redirect 401
- TypeScript types lengkap: User, Menu, Order, Table, dll
- Zustand auth store dengan persistence & `hasPermission()`
- `PermissionGate` komponen untuk RBAC guard di UI

---

## Phase 2 — Database Schema & Auth

**Goal:** Semua tabel database terdefinisi, sistem login dashboard berjalan

### Backend
- Migration semua tabel:
  - `users` — id, name, email, password, role_id, created_at
  - `roles` — id, name
  - `permissions` — id, name (format: `resource:action`, misal `menu:create`)
  - `role_permissions` — role_id, permission_id
  - `tables` — id, table_number, qr_code, created_at
  - `categories` — id, name, created_at
  - `menus` — id, name, price, image, category_id, is_available, created_at
  - `orders` — id, table_id, status, total, customer_name, created_at
  - `order_items` — id, order_id, menu_id, qty, price
- Endpoint Auth:
  - `POST /api/v1/auth/login` — login dengan email & password, return JWT
  - `POST /api/v1/auth/me` — return data user yang sedang login
- Seed data: role Owner & Admin, permission awal, user Owner default

### Frontend
- Halaman Login dashboard (`/login`)
- Auth context + protected route guard
- Redirect ke dashboard setelah login berhasil
- Sidebar dinamis — menu tampil sesuai permission user

---

## Phase 3 — Master Data: Menu & Kategori (Owner)

**Goal:** Owner bisa kelola menu dan kategori cafe

### Backend
- CRUD endpoint `categories`:
  - `GET /api/v1/categories`
  - `POST /api/v1/categories` — permission: `category:create`
  - `PUT /api/v1/categories/:id` — permission: `category:update`
  - `DELETE /api/v1/categories/:id` — permission: `category:delete`
- CRUD endpoint `menus`:
  - `GET /api/v1/menus` — dengan filter kategori & status
  - `POST /api/v1/menus` — permission: `menu:create`
  - `PUT /api/v1/menus/:id` — permission: `menu:update`
  - `DELETE /api/v1/menus/:id` — permission: `menu:delete`
  - `PATCH /api/v1/menus/:id/availability` — toggle available/unavailable
- Upload gambar menu (local storage)

### Frontend (Dashboard — Owner)
- Halaman daftar menu dengan filter per kategori
- Form tambah/edit menu (nama, harga, gambar, kategori, deskripsi)
- Toggle switch available/unavailable per menu
- Halaman kelola kategori (tambah, edit, hapus)

---

## Phase 4 — Master Data: Meja & QR Code (Owner)

**Goal:** Owner bisa kelola meja dan generate QR code untuk customer

### Backend
- CRUD endpoint `tables`:
  - `GET /api/v1/tables`
  - `POST /api/v1/tables` — permission: `table:create`
  - `PUT /api/v1/tables/:id` — permission: `table:update`
  - `DELETE /api/v1/tables/:id` — permission: `table:delete`
- Generate QR code per meja — embed URL: `/menu?table=<table_id>`
- QR code tersimpan sebagai string base64 / file

### Frontend (Dashboard — Owner)
- Halaman daftar meja
- Form tambah/edit meja (nomor meja)
- Tampilkan QR code per meja
- Tombol download QR code sebagai gambar (PNG)
- Preview QR code di modal

---

## Phase 5 — Halaman Customer: Lihat Menu & Order

**Goal:** Customer bisa scan QR, lihat menu, dan buat order tanpa login

### Backend
- Public endpoint (tanpa auth):
  - `GET /api/v1/public/menu?table_id=<id>` — daftar menu aktif
  - `POST /api/v1/public/orders` — buat order baru (table_id, items, customer_name opsional)
  - `GET /api/v1/public/orders/:id` — cek status order by ID

### Frontend (Customer — mobile-first)
- Halaman menu responsif — grid card menu dengan filter kategori
- Keranjang belanja (cart) — tambah, kurang, hapus item
- Halaman ringkasan order sebelum submit
- Form nama pemesan (opsional)
- Halaman status order — tampilkan status: Pending → Diproses → Siap → Selesai
- Polling status order setiap 5 detik (upgrade ke WebSocket di Phase 9)

---

## Phase 6 — Order Management (Admin/Kasir)

**Goal:** Kasir bisa lihat dan update status semua order secara real-time

### Backend
- Endpoint order untuk dashboard:
  - `GET /api/v1/orders` — semua order, filter by status/tanggal/meja, permission: `order:read`
  - `GET /api/v1/orders/:id` — detail order dengan items
  - `PATCH /api/v1/orders/:id/status` — update status, permission: `order:update`
- Flow status: `pending` → `confirmed` → `preparing` → `ready` → `done`

### Frontend (Dashboard — Admin/Kasir)
- Halaman daftar order dengan kolom kanban per status
- Card order — tampil: nomor meja, nama pemesan, item, total, waktu masuk
- Tombol update status order
- Filter order by status & tanggal
- Auto-refresh setiap 10 detik (upgrade ke WebSocket di Phase 9)
- Badge notifikasi order baru di sidebar

---

## Phase 7 — Manajemen User & RBAC (Owner)

**Goal:** Owner bisa kelola user, role, dan permission secara dinamis

### Backend
- CRUD endpoint `users`:
  - `GET /api/v1/users` — permission: `user:read`
  - `POST /api/v1/users` — permission: `user:create`
  - `PUT /api/v1/users/:id` — permission: `user:update`
  - `DELETE /api/v1/users/:id` — permission: `user:delete`
- CRUD endpoint `roles`:
  - `GET /api/v1/roles`
  - `POST /api/v1/roles` — permission: `role:manage`
  - `PUT /api/v1/roles/:id/permissions` — assign permission ke role
- Endpoint assign role ke user

### Frontend (Dashboard — Owner)
- Halaman daftar user — tampil nama, email, role, status
- Form tambah/edit user dengan assign role
- Halaman daftar role beserta permission yang dimiliki
- Checkbox matrix: assign/unassign permission per role
- Konfirmasi sebelum hapus user

---

## Phase 8 — Laporan & Analitik (Owner)

**Goal:** Owner bisa lihat laporan penjualan dengan visualisasi

### Backend
- Endpoint laporan:
  - `GET /api/v1/reports/sales?from=&to=` — total penjualan per periode
  - `GET /api/v1/reports/sales/daily` — grafik penjualan harian
  - `GET /api/v1/reports/top-menus?limit=10` — menu terlaris
  - `GET /api/v1/reports/tables` — rekap per meja
- Semua endpoint laporan: permission `report:read`

### Frontend (Dashboard — Owner)
- Halaman laporan dengan filter rentang tanggal
- Line chart / bar chart penjualan (menggunakan Recharts)
- Tabel top menu terlaris dengan jumlah terjual
- Kartu ringkasan: total pendapatan, total order, rata-rata order
- Export laporan ke CSV

---

## Phase 9 — Real-time & UX Polish

**Goal:** Notifikasi real-time tanpa polling, UI lebih halus di semua role

### Backend
- Implementasi WebSocket endpoint:
  - `/ws/orders` — push event ke kasir saat ada order baru / update
  - `/ws/order/:id` — push update status ke customer
- Rate limiting per IP (mencegah spam order)
- Validasi input lebih ketat di semua endpoint
- Error response konsisten di seluruh API

### Frontend
- Integrasi WebSocket di halaman kasir — notifikasi order masuk real-time
- Update status otomatis di halaman customer tanpa reload
- Loading skeleton di semua halaman data
- Toast notification untuk aksi berhasil/gagal
- Animasi transisi antar halaman
- Mobile optimization halaman customer (safe area, touch gestures)

---

## Phase 10 — Testing, Security & Deployment

**Goal:** Aplikasi siap production — aman, teruji, dan mudah di-deploy

### Backend
- Unit test service layer (auth, order, menu)
- Integration test endpoint utama
- Setup CORS production (whitelist domain)
- Input sanitasi & SQL injection protection
- Helmet headers
- Dockerize: `Dockerfile` backend, multi-stage build
- `docker-compose.yml` — backend + PostgreSQL + migration runner

### Frontend
- Testing komponen kritis (Login, Cart, Order status)
- Lazy loading per route (Customer vs Dashboard terpisah bundle)
- Environment production config
- Dockerfile frontend (Nginx serve static)
- CI/CD pipeline sederhana (GitHub Actions): lint → build → Docker push

---

## Permission Matrix Lengkap

| Permission | Admin/Kasir | Owner |
|---|---|---|
| `order:read` | ✓ | ✓ |
| `order:update` | ✓ | ✓ |
| `menu:read` | ✓ | ✓ |
| `menu:create` | ✗ | ✓ |
| `menu:update` | ✗ | ✓ |
| `menu:delete` | ✗ | ✓ |
| `category:create/update/delete` | ✗ | ✓ |
| `table:create/update/delete` | ✗ | ✓ |
| `report:read` | ✗ | ✓ |
| `user:read/create/update/delete` | ✗ | ✓ |
| `role:manage` | ✗ | ✓ |

---

## Order Status Flow

```
[Customer submit order]
        ↓
    PENDING  ← kasir terima notifikasi
        ↓
  CONFIRMED  ← kasir konfirmasi
        ↓
  PREPARING  ← dapur sedang buat
        ↓
     READY   ← siap diambil / diantar
        ↓
     DONE    ← selesai
```

---

## Ringkasan Phase

| Phase | Fokus | Role | Status |
|---|---|---|---|
| 1 | Project setup & foundation | — | ✅ Selesai |
| 2 | Database schema & auth | Admin, Owner | 🔲 Belum |
| 3 | Master data menu & kategori | Owner | 🔲 Belum |
| 4 | Master data meja & QR code | Owner | 🔲 Belum |
| 5 | Halaman customer | Customer | 🔲 Belum |
| 6 | Order management | Admin/Kasir | 🔲 Belum |
| 7 | Manajemen user & RBAC | Owner | 🔲 Belum |
| 8 | Laporan & analitik | Owner | 🔲 Belum |
| 9 | Real-time & UX polish | Semua | 🔲 Belum |
| 10 | Testing & deployment | — | 🔲 Belum |
