# Website tìm nhà trọ cho sinh viên: Hướng dẫn nhóm

Đây là tài liệu duy nhất mọi người đều phải đọc. Sau đó đọc hợp đồng API của phần mình:

- Frontend: `docs/API_CONTRACT.md`
- AI: `docs/AI_CONTRACT.md`
- Backend: đọc cả hai, cộng thêm `docs/ERD.md` (cơ sở dữ liệu)

## 1. Kiến trúc

```mermaid
graph LR
    FE["Frontend (trình duyệt)"] -->|"JSON + Bearer token"| BE["Backend: Laravel API :8000"]
    BE --> DB[("PostgreSQL :5432")]
    BE -->|"JSON"| AI["AI service: FastAPI :8001"]
```

Ba nguyên tắc giúp ba phần làm việc độc lập:

1. Frontend chỉ nói chuyện với Backend. **Không bao giờ** gọi thẳng AI service.
2. AI service không truy cập database. Backend gửi cho nó mọi dữ liệu cần thiết.
3. Các file hợp đồng là nguồn sự thật. Nếu cần đổi, hãy sửa file hợp đồng rồi báo cho cả nhóm.

## 2. Ai làm gì

| Vai trò | Xây dựng | Bàn giao |
|---|---|---|
| Backend | Laravel JSON API, PostgreSQL, xác thực, upload file, dữ liệu mẫu, gọi AI service | API chạy được + dữ liệu demo đã seed |
| Frontend | Toàn bộ trang và giao diện, bản đồ Leaflet, gọi API của Backend | Website chạy được |
| AI | FastAPI service với 5 endpoint | AI service chạy được, có chế độ fake |

Phân công theo tính năng:

| Tính năng | Backend | Frontend | AI |
|---|---|---|---|
| Duyệt nhà và lọc | `GET /listings`, dữ liệu mẫu | Form lọc, thẻ nhà, phân trang | |
| Bản đồ | lat/lng trong danh sách nhà | Bản đồ Leaflet từ kết quả `/listings` | |
| Đăng nhập và hồ sơ | `/register` `/login` `/me` `/profile` | Form, lưu token, chặn route cần đăng nhập | |
| Yêu thích | `/favorites` | Nút tim, trang yêu thích | |
| Nhắn tin và tệp | `/conversations...` | Hộp thư, trang chat, upload tệp | |
| Đánh giá | `/listings/{id}/reviews` | Form chấm sao, danh sách đánh giá | |
| Tin đăng của chủ nhà | CRUD tin đăng, ảnh | Form đăng tin, chọn vị trí trên bản đồ, upload ảnh | |
| AI: bạn cùng phòng | `/ai/roommates` (chuẩn bị ứng viên) | Trang kết quả | `POST /roommates` |
| AI: đánh giá giá | `/ai/price-advice` (tính thống kê) | Trang kết quả | `POST /price-advice` |
| AI: gợi ý khu vực | `/ai/area-suggestions` (tính thống kê) | Form + kết quả | `POST /areas` |
| AI: chatbot | `/ai/chat` | Khung chat, giữ lịch sử hội thoại | `POST /chat` + `knowledge.md` |
| AI: tạo mô tả | `/ai/description` | Nút trên form đăng tin | `POST /description` |

## 3. Công nghệ

| Phần | Công nghệ |
|---|---|
| Backend | PHP 8.2+, Laravel 11, PostgreSQL 16, Laravel Sanctum (xác thực bằng token) |
| Frontend | Tự chọn: React + Vite + Bootstrap 5 + Axios, hoặc HTML/JS thuần + Bootstrap 5. Dùng Leaflet cho bản đồ |
| AI | Python 3.10+, FastAPI. Gọi API LLM bất kỳ hoặc model riêng, tự chọn |
| Hạ tầng | Docker Compose (tùy chọn) để chạy PostgreSQL + Backend + AI. Không cần Redis, Nginx hay CI |

## 4. Cấu trúc thư mục

Một repo, mỗi người một thư mục cấp 1 riêng, nên ít bị xung đột khi merge.

```
rental-house/
├── docker-compose.yml    # PostgreSQL + Backend + AI (tùy chọn)
├── .env.example          # biến cho docker compose (copy thành .env)
├── docs/                 # API_CONTRACT.md, AI_CONTRACT.md, ERD.md
├── frontend/             # Frontend phụ trách (cấu trúc tự do)
├── backend/              # Laravel (Backend phụ trách)
│   ├── Dockerfile  .dockerignore
│   ├── app/Http/Controllers/
│   ├── app/Models/
│   ├── app/Services/AiClient.php   # gọi sang AI service
│   ├── database/migrations/  database/seeders/
│   └── routes/api.php
├── ai-service/           # FastAPI (AI phụ trách)
│   ├── Dockerfile  .dockerignore
│   ├── main.py
│   ├── knowledge.md      # kiến thức cho chatbot
│   └── requirements.txt
└── README.md             # chính là file hướng dẫn nhóm này
```

Mỗi thư mục có `.gitignore` riêng (`vendor/`, `node_modules/`, `venv/`, `.env`). `.gitignore` ở gốc repo cũng cần có dòng `.env`.

## 5. Chạy trên máy

Có hai cách. Frontend luôn chạy ngoài Docker (`npm install`, `npm run dev`).

### Cách A: Docker (khuyên dùng)

Cần cài Docker Desktop. Một lệnh chạy cả PostgreSQL, Backend và AI service.

1. Copy `.env.example` thành `.env` ở gốc repo (chứa mật khẩu DB, `FAKE_MODE`, `LLM_API_KEY`).
2. **Backend (làm một lần, rồi commit):** tạo project Laravel trước khi thêm `Dockerfile` vào `backend/`:
   `docker run --rm -v "${PWD}:/app" composer:2 create-project laravel/laravel:^11.0 backend`
   Sau đó đặt `Dockerfile` và `.dockerignore` vào `backend/`. Trong `backend/.env.example`, đặt `DB_CONNECTION=pgsql` và bỏ dấu `#` ở các dòng `DB_*`.
3. Chạy: `docker compose up -d --build`
4. Backend làm lần đầu:
   - `cp backend/.env.example backend/.env`
   - `docker compose exec backend php artisan key:generate`
   - `docker compose exec backend php artisan migrate --seed`
   - `docker compose exec backend php artisan storage:link --relative`

| Dịch vụ | Địa chỉ |
|---|---|
| Backend | http://localhost:8000 |
| AI service (có trang thử API) | http://localhost:8001/docs |
| PostgreSQL | `localhost:5432`, database `rental`, user `rental`, mật khẩu `rental` (kết nối bằng DBeaver hoặc pgAdmin) |

Lệnh hay dùng:
- `docker compose logs -f backend`: xem log.
- `docker compose down`: tắt (giữ nguyên dữ liệu DB).
- `docker compose down -v`: tắt và **xóa cả dữ liệu DB** (dùng khi muốn làm lại từ đầu).
- `docker compose up -d db`: chỉ chạy PostgreSQL, còn Backend và AI chạy trực tiếp trên máy (cách C bên dưới).

### Cách B: Không dùng Docker

Cần PHP 8.2+, Composer, Python 3.10+ và PostgreSQL 16 cài sẵn trên máy.

| Phần | Cổng | Lệnh |
|---|---|---|
| Backend | 8000 | `composer install`, copy `.env.example` thành `.env`, `php artisan key:generate`, `php artisan migrate --seed`, `php artisan storage:link --relative`, `php artisan serve` |
| AI | 8001 | `pip install -r requirements.txt`, sau đó `uvicorn main:app --port 8001` |
| Frontend | 5173 (hoặc tùy) | `npm install`, `npm run dev` |

**Cách C (kết hợp):** chỉ chạy PostgreSQL bằng Docker (`docker compose up -d db`), còn Backend, AI, Frontend chạy trực tiếp như cách B với `DB_HOST=127.0.0.1`.

### Biến môi trường

| File | Biến |
|---|---|
| `.env` (gốc repo, cho Docker) | `DB_PASSWORD=rental`, `FRONTEND_URL=http://localhost:5173`, `FAKE_MODE=true`, `LLM_API_KEY=` |
| `backend/.env` | `APP_URL=http://localhost:8000` (dùng để tạo link ảnh), `DB_CONNECTION=pgsql`, `DB_HOST=127.0.0.1` (Docker tự đổi thành `db`), `DB_PORT=5432`, `DB_DATABASE=rental`, `DB_USERNAME=rental`, `DB_PASSWORD=rental`, `FRONTEND_URL=http://localhost:5173` (cho CORS), `AI_URL=http://localhost:8001` |
| `frontend/.env` | `VITE_API_URL=http://localhost:8000/api` |
| `ai-service/.env` (chỉ khi chạy không Docker) | `LLM_API_KEY=`, `FAKE_MODE=true` |

Không commit file `.env` thật hay API key. Chỉ commit `.env.example`.

### Lỗi thường gặp

- Backend báo không kết nối được DB khi chạy ngoài Docker: kiểm tra `DB_HOST=127.0.0.1` (không phải `db`) và `docker compose up -d db` đã chạy.
- Ảnh không hiện: chạy lại `storage:link --relative` ở đúng nơi chạy Backend (trong Docker thì dùng `docker compose exec backend ...`) và kiểm tra `APP_URL`.
- Trên Linux, file do container tạo ra có thể thuộc về root: chạy `sudo chown -R $USER:$USER backend`.

## 6. Cách phối hợp

**Git**
- `main` luôn chạy được. Làm việc trên nhánh riêng: `be/...`, `fe/...`, `ai/...`.
- Khi tính năng chạy được thì merge vào `main` và báo cho nhóm. Không push code lỗi lên `main`.
- Commit theo dạng: `feat(be): thêm đăng nhập`, `fix(fe): sửa reset bộ lọc`.

**Làm song song**
- Frontend: khi endpoint chưa có, dùng JSON mẫu copy từ `API_CONTRACT.md`. Khi Backend báo sẵn sàng thì chuyển sang API thật.
- AI: làm khung trước. Trả dữ liệu giả đúng cấu trúc hợp đồng (`FAKE_MODE=true`) để Backend tích hợp sớm, sau đó thay dần bằng logic thật.
- Backend: dữ liệu mẫu và các endpoint đọc dữ liệu làm trước, vì Frontend cần chúng nhất.

## 7. Checklist demo

1. Clone mới về chạy được chỉ bằng cách làm theo mục 5.
2. `php artisan migrate:fresh --seed` tạo dữ liệu demo và các tài khoản sau (mật khẩu `password`): `student1@example.com` ... `student10@example.com`, `landlord1@example.com` ... `landlord3@example.com`.
3. Mọi tính năng ở mục 2 chạy được với các tài khoản demo.
4. `FAKE_MODE=true` cho phép demo AI mà không cần internet hay API key. Giữ làm phương án dự phòng cho ngày thi.
5. Không có bí mật (key, mật khẩu thật) trong repo.
