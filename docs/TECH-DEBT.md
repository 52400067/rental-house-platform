# Sổ theo dõi nợ kỹ thuật (Tech Debt Register)

Sinh bằng skill `tech-debt-tracker` (scan → prioritize → dashboard).
Snapshot ngày 2026-09-27: quét 285 file / 25,090 dòng code app, **1,760 item sau lọc**
(boilerplate cấu trúc và noise regex `BUG`/`APP_DEBUG` đã loại).

## Cách tái tạo snapshot

```bash
# 1. Scan (exclude vendor/node_modules/storage qua config)
python3 .agents/skills/tech-debt-tracker/scripts/debt_scanner.py . \
  --config /tmp/debt-config.json --format json \
  --output ~/tech-debt-tracker/rental-house-platform/debt_$(date +%F).json

# 2. Prioritize (framework wsjf)
python3 .agents/skills/tech-debt-tracker/scripts/debt_prioritizer.py \
  ~/tech-debt-tracker/rental-house-platform/debt_<ngay>.app-only.json \
  --framework wsjf --team-size 6 --sprint-capacity 20 \
  --format json --output ~/tech-debt-tracker/rental-house-platform/debt_priorities_<ngay>.json

# 3. Sau mỗi sprint dọn: quét lại + so trend bằng dashboard
python3 .agents/skills/tech-debt-tracker/scripts/debt_dashboard.py \
  --input-dir ~/tech-debt-tracker/rental-house-platform/ --period monthly --format both
```

## Debt thật sự cần xử lý (tinh chỉnh từ output máy)

| # | Debt | Bằng chứng từ scan | Ảnh hưởng | Hành động đề xuất | Effort |
|---|------|--------------------|-----------|-------------------|--------|
| 1 | `ListingStoreRequest` ≈ `ListingUpdateRequest` | 44 block trùng | Sửa rule validation phải sửa 2 nơi → lệch contract | Extract base class `ListingRules` (rules + messages + attributes dùng chung, update chỉ thêm `sometimes` + `status`) | ~0.5 ngày |
| 2 | `Login.jsx` ≈ `Register.jsx` | 45 block trùng | Sửa UX auth phải sửa 2 nơi | Hook dùng chung `useAuthForm` (state, lỗi, submit) | ~0.5 ngày |
| 3 | `Favorites.jsx` ≈ `MyListings.jsx` (và các page grid) | 34 block trùng | Pattern grid listing lặp ở nhiều page | Component `ListingGrid` + `useListingPage` dùng chung | ~1 ngày |
| 4 | CSS trùng lặp | `page.css` 57 + `components.css` 39 block | Bundle phình, style lệch nhau | Gộp rule trùng; cân nhắc tách `page.css` (982 dòng > 500) | ~0.5 ngày |
| 5 | Đường dẫn hardcode ở frontend | `App.jsx` (6), Footer/Navbar/MyListings | Đổi route phải quét tay | ✅ **Xong** (`5f34b80`): `constants/routes.js` là single source of truth, helper `route()` cho tham số động; `aiApi.js` giữ nguyên vì đó là API endpoint (axios baseURL), không phải SPA route | done |
| 6 | Long lines ở backend | `ListingController` (4), `LandlordListingController` (2) | Khó review | Pint đã chuẩn hóa phần lớn; xử lý khi chạm file | ~trivial |

**Không phải debt (giữ nguyên):** test file dài (`ConversationTest` 564 dòng — test feature dài là bình thường),
boilerplate FormRequest/config/migration (khung framework), `docker-compose*.yml` (override cố ý, có comment giải thích).

## Cảnh báo về con số tự động

`debt_prioritizer.py` ước tính tổng effort **25,741 giờ / 1,734 sprint** — đây là
heuristic gán mặc định cho từng item thô (phần lớn là boilerplate), **không dùng để
lập kế hoạch**. Con số đáng tin là bảng tinh chỉnh ở trên (~2.75 ngày công).

## Trend

| Ngày | Items (sau lọc) | Ghi chú |
|------|-----------------|---------|
| 2026-09-27 | 1,760 | Baseline đầu tiên sau Phase 4 |
| 2026-09-27 (run 2) | 1,762 | Sau refactor #5: hardcode trong 5 file mục tiêu **13 → 0**; tổng +2 là noise đo được (19 import `ROUTES` mới tạo block-trùng, 1 comment dài). Dashboard: velocity impact **↑ improving**, health 60/100, density ổn định 7.0%. Debt còn lại đo được: ListingStore↔Update 38 blocks, Login↔Register 26, Favorites↔MyListings 24 |
