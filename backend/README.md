# Backend — API nhà trọ cho sinh viên (Laravel 11)

API theo `docs/API_CONTRACT.md`. Lỗi trả JSON `{ message }` (+ `errors` cho 422), thông báo tiếng Việt.

## Chạy nhanh

### Cách A: Docker (backend + PostgreSQL)

```bash
cp backend/.env.example backend/.env
docker compose up -d --build        # db + backend (+ ai-service nếu có thư mục)
docker compose exec backend php artisan key:generate
docker compose exec backend php artisan migrate --seed
```

Backend chạy ở http://localhost:8000. Kiểm tra: `curl http://localhost:8000/api/districts`

### Cách B: Không Docker

Cần PHP 8.2+, Composer, PostgreSQL 16. Chạy `docker compose up -d db` để có database, rồi:

```bash
cd backend
composer install
cp .env.example .env                # DB_HOST=127.0.0.1
php artisan key:generate
php artisan migrate --seed
php artisan serve                   # http://localhost:8000
```

## Test

```bash
cd backend
php artisan test                    # toàn bộ suite
vendor/bin/pint --test app tests    # check style
```

Tài khoản demo (mật khẩu `password`):
- Sinh viên: `student1@example.com` … `student10@example.com`
- Chủ nhà: `landlord1@example.com` … `landlord3@example.com`

## Cấu trúc chính

| Thư mục | Nội dung |
|---|---|
| `app/Http/Controllers` | Auth/Profile, Reference (districts/schools/amenities), Listing (duyệt + chi tiết + đánh giá), LandlordListing (CRUD + ảnh), Favorite, Conversation (nhắn tin), Attachment (signed URL) |
| `app/Http/Resources` | User, District, School, ListingSummary, ListingDetail, Review, Conversation, Message — shape đúng §3 hợp đồng |
| `app/Http/Middleware` | `role:student|landlord` (EnsureRole), `throttle.api` (429 tiếng Việt) |
| `lang/vi` | Thông báo lỗi validate tiếng Việt |

## Ghi chú kỹ thuật

- `role` **không** nằm trong `$fillable` — chỉ được đặt khi tạo qua `register`/factory (`forceCreate`). Không endpoint nào đổi vai trò được.
- Ảnh tin đăng: public disk `storage/app/public/listings`, tối đa 5 ảnh/tin, jpg/png/webp ≤ 2MB.
- Tệp nhắn tin: **private** disk, chỉ mở qua signed URL 60 phút (không cần token, mở thẳng trong tab).
- `Model::preventLazyLoading(!isProduction())` — N+1 sẽ ném exception trong dev/test.
- Login throttle 10 lần/phút/IP. Mọi request guest thiếu `Accept: application/json` vẫn nhận JSON 401 (không redirect).

## Khi AI service chưa có

Các endpoint `/ai/*` chưa được route — bạn của nhóm phụ trách AI tạo `ai-service/` (FastAPI, biến `FAKE_MODE=true` trong docker-compose) rồi backend sẽ gọi qua `AI_URL`. Nếu AI service chết, backend trả 503 JSON `"Dịch vụ AI tạm thời không khả dụng."` theo hợp đồng.
