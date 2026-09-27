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
| 1 | `ListingStoreRequest` ≈ `ListingUpdateRequest` | 44 block trùng | Sửa rule validation phải sửa 2 nơi → lệch contract | ✅ **Xong** (`0aeba67`): base class `ListingFormRequest` (rules canonical + `asPartial()` biến đổi `required→sometimes`), dup blocks của cặp `44 → 0`, 22 test contract pass nguyên vẹn | done |
| 2 | `Login.jsx` ≈ `Register.jsx` | 45 block trùng | Sửa UX auth phải sửa 2 nơi | ✅ **Xong** (`3be7602`): hook `useAuthForm` (busy, chặn submit kép, navigate) + `AuthLayout`/`AuthVisual` (khung split, header, alert, footer); mọi chi tiết UI giữ nguyên. Logíc trùng tách hết - block còn lại chỉ là trùng dòng ngẫu nhiên | done |
| 3 | `Favorites.jsx` ≈ `MyListings.jsx` (và các page grid) | 34 block trùng | Pattern grid listing lặp ở nhiều page | ✅ **Xong** (`370c555`): hook `useListingPage` (fetch phân trang + skeleton-reset + refresh không nháy) + `ListingGrid` (dùng chung bởi Favorites **và Home**); MyListings giữ list-rows nhưng dùng chung hook. UX cải thiện: xóa tin không còn nháy skeleton | done |
| 4 | CSS trùng lặp | `page.css` 57 + `components.css` 39 block | Bundle phình, style lệch nhau | ✅ **Xong** (`4065631`): tách page.css theo họ selector thành `chrome/auth/messages/chat/widgets` (mọi file ≤ 500 dòng), gom toàn bộ `ai-widget-*` về một file, FAB shape chung `.corner-fab`, token `--focus-ring`. Selector parity kiểm chứng bằng script - không mất rule nào ngoài chuyển đổi có chủ ý | done |
| 5 | Đường dẫn hardcode ở frontend | `App.jsx` (6), Footer/Navbar/MyListings | Đổi route phải quét tay | ✅ **Xong** (`5f34b80`): `constants/routes.js` là single source of truth, helper `route()` cho tham số động; `aiApi.js` giữ nguyên vì đó là API endpoint (axios baseURL), không phải SPA route | done |
| 6 | Long lines ở backend | `ListingController` (4), `LandlordListingController` (2) | Khó review | Pint đã chuẩn hóa phần lớn; xử lý khi chạm file | ~trivial |

**Không phải debt (giữ nguyên):** test file dài (`ConversationTest` 564 dòng - test feature dài là bình thường),
boilerplate FormRequest/config/migration (khung framework), `docker-compose*.yml` (override cố ý, có comment giải thích).

## Cảnh báo về con số tự động

`debt_prioritizer.py` ước tính tổng effort **25,741 giờ / 1,734 sprint** - đây là
heuristic gán mặc định cho từng item thô (phần lớn là boilerplate), **không dùng để
lập kế hoạch**. Con số đáng tin là bảng tinh chỉnh ở trên (~2.75 ngày công).

## Trend

| Ngày | Items (sau lọc) | Ghi chú |
|------|-----------------|---------|
| 2026-09-27 | 1,760 | Baseline đầu tiên sau Phase 4 |
| 2026-09-27 (run 2) | 1,762 | Sau refactor #5: hardcode trong 5 file mục tiêu **13 → 0**; tổng +2 là noise đo được (19 import `ROUTES` mới tạo block-trùng, 1 comment dài) |
| 2026-09-27 (final) | **1,635 (−125)** | Sau refactor #1-#4: **large_file = 0** (page.css 982 → 5 file ≤ 500 dòng), density 7.0 → **6.5%**, dashboard báo **"Good progress on debt reduction"**, density trend ↑ improving (−0.335/period, forecast 5.2) |

**Kết quả 5 mục targeted (baseline → final):** #1 FormRequests 44→0 block rules thật (10 còn lại là boilerplate `}`/docblock khớp chéo) · #2 auth 45→30 (30 = coincidental line-match sau khi tách hết hook/layout) · #3 Fv↔ML 34→6 (6 = khung import/div) · #4 large_file CSS 2→0 · #5 hardcode 13→0. Mọi refactor giữ hành vi: 202 test backend + e2e + CI xanh xuyên suốt |
