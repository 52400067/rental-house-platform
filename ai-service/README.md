# AI service

FastAPI service triển khai [docs/AI_CONTRACT.md](../docs/AI_CONTRACT.md)
(5 endpoint + `/health`). **Chỉ Backend gọi service này** - frontend không
bao giờ gọi trực tiếp.

Trạng thái hiện tại: **stub**. `FAKE_MODE=true` (mặc định) trả dữ liệu mẫu
hợp lý đúng shape hợp đồng - không cần internet hay LLM key. Khi
`FAKE_MODE=false` mà chưa có logic thật, endpoint trả 503 (backend tự xử
lý lịch sự).

## Chạy

```bash
# Trong docker stack:
docker compose --profile ai up -d ai-service

# Độc lập:
pip install -r requirements.txt
FAKE_MODE=true uvicorn main:app --port 8001
```

Swagger UI: http://localhost:8001/docs

## Thử nhanh

```bash
curl localhost:8001/health
curl -X POST localhost:8001/description -H 'Content-Type: application/json' \
  -d '{"title":"Phong tro gan DHQG","type":"room","price":2500000,"area_m2":22.5,"ward":"Thu Duc","amenities":["Wi-Fi","May lanh"]}'
```

Kết quả mong đợi: `/health` → `{"status":"ok"}`, `/description` → JSON có
trường `description` (tiếng Việt). Backend tự kiểm tra shape; sai shape
bị tính là 503 phía backend.

## Xây phần LLM thật

Yêu cầu từ hợp đồng ([docs/AI_CONTRACT.md](../docs/AI_CONTRACT.md)):

- 5 endpoint: `/roommates`, `/price-advice`, `/area-suggestions`,
  `/chat`, `/description` - request/response shape bám đúng hợp đồng.
- **Stateless**: backend gửi đủ ngữ cảnh trong body; cần thêm dữ liệu DB
  thì báo backend bổ sung vào body thay vì kết nối database.
- Thời gian phản hồi ≤ 30 giây.
- `LLM_API_KEY` đọc từ biến môi trường; `FAKE_MODE=false` + có key mới gọi
  LLM thật. Không trả name/email/phone vào output ngoài các trường hợp
  đồng thư hợp đồng.
