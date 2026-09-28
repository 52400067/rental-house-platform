# TROSV AI service (stub FAKE_MODE)

FastAPI service implementing `docs/AI_CONTRACT.md` (5 endpoints + `/health`).
**Chi Backend goi service nay** - frontend khong bao gio goi truc tiep.

Trang thai hien tai: **stub**. `FAKE_MODE=true` (mac dinh) tra du lieu gia
hop ly DUNG SHAPE hop dong - khong can internet hay LLM key. `FAKE_MODE=false`
thi moi endpoint tra 503 (logic LLM that se bu sung sau).

## Chay

```bash
# Cach 1: trong docker stack (khuyen dung)
docker compose --profile ai up -d ai-service

# Cach 2: doc lap
pip install -r requirements.txt
FAKE_MODE=true uvicorn main:app --port 8001
```

Trang thu API: http://localhost:8001/docs

## Thu nhanh

```bash
curl localhost:8001/health
curl -X POST localhost:8001/description -H 'Content-Type: application/json' \
  -d '{"title":"Phong tro gan DHQG","type":"room","price":2500000,"area_m2":22.5,"ward":"Thu Duc","amenities":["Wi-Fi","May lanh"]}'
```

Ket qua mong doi: `/health` -> `{"status":"ok"}`, `/description` -> JSON co
truong `description` (tieng Viet). Backend tu kiem tra shape; sai shape se
bi tinh la 503 phia backend.
