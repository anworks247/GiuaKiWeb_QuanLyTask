# Web quản lý Task

## Task 1 – Phân tích & thiết kế
**Chức năng:** đăng ký/đăng nhập (JWT); CRUD task (tiêu đề, mô tả, trạng thái todo/doing/done, độ ưu tiên, hạn); lọc theo trạng thái; dashboard thống kê (tổng, theo trạng thái, quá hạn). Mỗi user chỉ thấy task của mình.

**Database:** `users(id, name, email UNIQUE, password_hash, created_at)` 1—N `tasks(id, user_id FK, title, description, status, priority, due_date, created_at, updated_at)` — xem `schema.sql`.

**API** (kèm header `Authorization: Bearer <token>` trừ auth):
| Method | Endpoint | Mô tả |
|---|---|---|
| POST | /api/auth/register | Đăng ký |
| POST | /api/auth/login | Đăng nhập, trả token |
| GET | /api/tasks?status= | Danh sách task |
| GET | /api/tasks/:id | Chi tiết |
| POST | /api/tasks | Tạo |
| PUT | /api/tasks/:id | Cập nhật (từng phần) |
| DELETE | /api/tasks/:id | Xóa |
| GET | /api/stats | Số liệu dashboard |

## Task 2 & 3 – Chạy dự án
```bash
npm install
createdb taskdb && psql taskdb -f schema.sql
cp .env.example .env   # sửa DATABASE_URL, JWT_SECRET
npm start              # mở http://localhost:3000
```

## Giao diện Bootstrap + cấu hình PHP
- `frontend/index.php` + `frontend/config.php`: giao diện Bootstrap 5, địa chỉ API đặt trong `config.php` (hoặc biến môi trường `API_BASE`).
- Chạy: `npm start` (API, cổng 3000) rồi `php -S localhost:8080 -t frontend` và mở http://localhost:8080
- Không có PHP: vẫn dùng được giao diện Bootstrap tại http://localhost:3000 (`public/index.html`).
