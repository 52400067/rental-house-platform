# AI Service — Handoff cho người phụ trách AI

Backend đã xong 8/10 bước + bước 10 phần backend. Việc của bạn: tạo **AI service (Python/FastAPI)** trong thư mục này. Hợp đồng đầu-cuối: `docs/API_CONTRACT.md` (mục **AI** ở §4, shapes ở §3).

## 1. Bạn cần tạo gì (trong thư mục `ai-service/` này)

```
ai-service/
├── main.py            # FastAPI app — bắt buộc tên file này
├── requirements.txt   # fastapi, uvicorn, (+ thư viện AI của bạn)
└── Dockerfile         # tùy chọn — compose mount thư mục này vào /app
```

`docker-compose.yml` ở gốc repo **đã trỏ sẵn** vào thư mục này:

```
command: uvicorn main:app --host 0.0.0.0 --port 8001 --reload
volumes: ./ai-service:/app
ports: 8001:8001
environment:
  FAKE_MODE: true          # mặc định — chạy không cần LLM key
  LLM_API_KEY: (để trống)
```

Chỉ cần `docker compose up -d --build ai-service` là chạy.

## 2. Interface nội bộ (Backend → AI service)

Backend sẽ làm phần proxy: `POST /api/ai/*` (hợp đồng §4) → forward JSON body sang `AI_URL` (docker: `http://ai-service:8001`, chạy local: `http://localhost:8001`).

Vì vậy bạn expose **5 endpoint cùng tên, không tiền tố `/api`**:

| Endpoint | Request (JSON) | Phải trả về (JSON, đúng shape hợp đồng §4) |
|---|---|---|
| `POST /roommates` | profile sinh viên (backend gửi sẵn) | `{ user_id, name, school, phone, score, reason }[]` — tối đa 5, score 0–100 giảm dần |
| `POST /price-advice` | dữ liệu tin + stats | `{ listing_price, verdict, fair_min, fair_max, tips[], message, stats{count,min,median,max} }` — verdict: `high`/`fair`/`low` |
| `POST /area-suggestions` | budget + school + priorities | `{ district_id, name, reason, stats{...} }[]` — tối đa 3 |
| `POST /chat` | `message`, `history[]`, `listing_id?` | `{ reply }` |
| `POST /description` | thông tin tin đăng | `{ description }` |

Shape chi tiết từng trường: đọc `docs/API_CONTRACT.md` §4 mục AI — đây là chuẩn để frontend gọi qua backend.

## 3. FAKE_MODE (quan trọng cho integration)

Với `FAKE_MODE=true` (mặc định trong compose): **không cần LLM key**, trả dữ liệu mẫu hợp lý đủ shape — để backend + frontend tích hợp được ngay từ ngày đầu. Khi `FAKE_MODE=false` và có `LLM_API_KEY` mới gọi LLM thật.

## 4. Quy tắc làm việc

- **Stateless khuyến nghị**: backend gửi đủ ngữ cảnh trong body; nếu buộc cần dữ liệu DB thì báo backend team gửi thêm vào body (đơn giản hơn việc bạn kết nối PostgreSQL).
- Thời gian phản hồi **≤ 30 giây** (hợp đồng cho phép tối đa ~30s; frontend sẽ hiện loading).
- Lỗi nào cũng trả JSON có nghĩa (vd `{"error": "..."}`); backend sẽ chuyển mọi lỗi khác 200 thành **503** `"Dịch vụ AI tạm thời không khả dụng."` theo hợp đồng — bạn không cần dịch tiếng Việt.
- **Đừng sửa** `backend/` hay `docs/API_CONTRACT.md` — cần đổi interface thì báo nhóm backend, sửa hợp đồng theo §5 rồi cả nhóm đồng thuận.
- Test nhanh sau khi tạo xong:

```bash
docker compose up -d --build ai-service
curl -X POST http://localhost:8001/chat -H "Content-Type: application/json" \
  -d '{"message": "cho hỏi giá phòng quận Thủ Đức"}'
```

## 5. Definition of done

- [ ] 5 endpoint trả đúng shape hợp đồng với FAKE_MODE=true
- [ ] `docker compose up -d --build` chạy được service (không cần key)
- [ ] Response time < 30s cho mọi endpoint
- [ ] Báo lại nhóm: backend sẽ thêm proxy routes + integration test (bước 9)
