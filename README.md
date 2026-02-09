# Clairity (client/server tách rời) — chạy trên VPS (IPv4) qua cổng 4000

Mục tiêu: **unzip → điền `server/.env` → chạy**.

## Kiến trúc runtime (production)

- **WEB** (Nginx container): lắng nghe `0.0.0.0:4000`
  - Serve UI (React build tĩnh)
  - Proxy `/api/*` và `/health/*` → API
- **API** (Node.js + TypeScript container): `:5000` (chỉ nội bộ Docker network)
- **DB**: Supabase Postgres qua `DATABASE_URL` (pooler `5432`)
- **AI**: Gemini REST `https://generativelanguage.googleapis.com/v1beta/models/<MODEL>:generateContent` (JSON Mode + response schema)

## 1) Chạy production trên VPS (khuyến nghị)

### 1.1 Mở cổng
- Mở inbound **4000/tcp** trên firewall/VPS provider.

### 1.2 Điền ENV
Copy file mẫu:
```bash
cd clairity-v2/server
cp .env.example .env
```

Sửa `server/.env`:
- `DATABASE_URL` (Supabase pooler URL, có `?sslmode=require`)
- `GEMINI_API_KEY`
- `JWT_ACCESS_SECRET` (chuỗi dài, ngẫu nhiên)

Gợi ý tạo secret:
```bash
openssl rand -base64 48 | tr -d '\n'
```

### 1.3 Run bằng Docker Compose
Tại thư mục gốc:
```bash
docker compose up -d --build
```

### 1.4 Kiểm tra nhanh (trên VPS)
```bash
curl http://127.0.0.1:4000/health/live
curl http://127.0.0.1:4000/health/ready
```

Mở trình duyệt:
- `http://160.250.180.105:4000`

## 2) Chạy dev (local)

### API
```bash
cd server
cp .env.example .env
npm install
npm run dev
```

### Client
```bash
cd client
npm install
npm run dev
```

Truy cập:
- `http://localhost:5173` (Vite proxy `/api` → `http://localhost:5000`)

## 3) Các endpoint chính (MVP)

- `POST /api/v1/auth/register` — đăng ký email/password (không verify)
- `POST /api/v1/auth/login` — login, trả `accessToken`, set cookie refresh
- `POST /api/v1/auth/refresh` — rotate refresh cookie, trả `accessToken`
- `POST /api/v1/auth/logout`
- `GET  /api/v1/auth/me`
- `POST /api/v1/analyze` — gọi Gemini, trả JSON result (có thể `save`)
- `POST /api/v1/snippets`, `GET /api/v1/snippets`, `GET/DELETE /api/v1/snippets/:id`
- `GET/PUT /api/v1/settings` — ngôn ngữ UI + mode mặc định

## 4) Checklist kiểm tra (bắt buộc)

### Compile / typecheck
- Server: `cd server && npm run typecheck`
- Client: `cd client && npm run typecheck`

### Runtime smoke test (VPS)
- Health:
  - `curl http://127.0.0.1:4000/health/live`
  - `curl http://127.0.0.1:4000/health/ready`
- Auth flow:
  - Đăng ký → đăng nhập → refresh → logout
- Analyze:
  - gửi 1 đoạn text ngắn → nhận JSON gồm `replySuggestions` 3 mục

### Edge cases quan trọng
- Email trùng → trả lỗi rõ ràng
- Sai mật khẩu → 401
- Refresh cookie thiếu/hết hạn → 401
- Text quá dài → 400 (TEXT_TOO_LONG)
- snippetId không thuộc user → 400

## 5) Rủi ro & rollback

### Rủi ro
- `argon2` cần build native khi `npm install` (đã tránh bằng image Debian + toolchain mặc định).
- DB quyền hạn: nếu role không có quyền tạo bảng, `ready` sẽ fail.

### Rollback (an toàn)
- Dừng phiên bản mới:
  ```bash
  docker compose down
  ```
- Chạy lại bản cũ (nếu bạn có image/tag cũ) hoặc checkout commit cũ, `docker compose up -d --build`.

---

Nếu bạn muốn tôi **đồng bộ schema “như dự án cũ”**, cần bạn đưa:
- SQL schema/ERD cũ hoặc dump migration
- danh sách field cần lưu (user/profile/session/log)
