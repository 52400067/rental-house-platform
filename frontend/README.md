# Frontend

React 18 + TypeScript strict + Vite + Bootstrap 5 (Node 22 theo `.nvmrc`).
Build luôn chạy `tsc --noEmit` trước - TypeScript lỗi thì không build được.
Gọi toàn bộ API qua Backend theo [docs/API_CONTRACT.md](../docs/API_CONTRACT.md).

## Chạy

```bash
npm install
cp .env.example .env   # VITE_API_URL=http://localhost:8000/api
npm run dev            # http://localhost:5173
```

Cần Backend chạy ở `:8000`. Khi chạy full Docker stack, web ở
http://localhost:5174 và API same-origin `/api`.

## Tài khoản demo (mật khẩu `password`)

- `student1@example.com` … `student10@example.com` - sinh viên
- `landlord1@example.com` … `landlord3@example.com` - chủ nhà

## Trang

| Đường dẫn | Chức năng |
|---|---|
| `/` | Trang chủ: tin mới nhất, loại tin, tính năng AI |
| `/rooms` | Duyệt + lọc tin (từ khóa, loại, tỉnh/TP → phường, trường, giá, tiện ích), phân trang |
| `/rooms/:id` | Chi tiết: ảnh, tiện ích, đánh giá, yêu thích, nhắn tin, tư vấn giá AI |
| `/map` | Bản đồ Leaflet: điểm tin đăng + trường, lọc bán kính km |
| `/login`, `/register` | Đăng nhập / đăng ký theo vai trò |
| `/favorites` | Phòng yêu thích (sinh viên) |
| `/messages`, `/messages/:id` | Hộp thư, chat realtime có tệp đính kèm |
| `/profile` | Hồ sơ cá nhân (`PUT /profile`) |
| `/students/:id` | Hồ sơ công khai của sinh viên |
| `/ai/roommates` | AI gợi ý bạn cùng phòng (sinh viên) |
| `/ai/area-suggestions` | AI gợi ý khu vực (sinh viên) |
| `/ai/chat` | Trợ lý AI, hỗ trợ ngữ cảnh tin đăng qua `?listing_id=` |
| `/landlord` | Quản lý tin đăng (chủ nhà) |
| `/landlord/new`, `/landlord/edit/:id` | Đăng/sửa tin: chọn vị trí trên bản đồ, ảnh, tiện ích, "Viết mô tả giúp tôi" (AI) |

## Kiểm thử

| Lệnh | Phạm vi |
|---|---|
| `npm run lint` | ESLint (TypeScript parser, gồm cả spec e2e) |
| `npm run build` | check:css → tsc strict → vite build |
| `npx playwright test` | 11+ spec E2E trình duyệt thật; cần API :8000 đã seed + web :4173 (`E2E_BASE_URL`) |
| `bash e2e-smoke.sh` | Smoke mọi API theo luồng người dùng, AI tắt vẫn xanh |
| `npm run test:e2e` | Hành trình người dùng đầy đủ (Python + Chromium hệ thống) |

```bash
# Playwright với Docker stack local:
E2E_BASE_URL=http://localhost:5174 npx playwright test
```

## Ghi chú kỹ thuật

- Token lưu `localStorage` (`token`, `user`); nhận 401 "mất phiên" thì xóa
  cả hai và chuyển `/login` (xem `src/api/axiosClient.ts` - 401 từ form
  login sai mật khẩu không gây redirect).
- Style tách theo lớp trong `src/styles/`: theme → layout → chrome → auth
  → messages → chat → widgets → components. Thứ tự import là
  **load-bearing**; sau mọi sửa style chạy `npm run check:css` (guard so
  manifest `scripts/css-selectors.json`).
- Bundle bake `VITE_*` lúc build - đổi `.env` xong phải build lại, restart
  không đủ.
