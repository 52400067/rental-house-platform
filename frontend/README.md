# TroTot - Frontend

React 18 + Vite + Bootstrap 5. Gọi toàn bộ API qua Backend (`docs/API_CONTRACT.md`).

## Chạy

```bash
npm install
cp .env.example .env   # VITE_API_URL=http://localhost:8000/api
npm run dev            # http://localhost:5173
```

Cần Backend chạy ở `:8000` (và AI service ở `:8001` cho các tính năng AI). Xem README gốc ở thư mục repo.

## Tài khoản demo (mật khẩu `password`)

- `student1@example.com` … `student10@example.com` - sinh viên
- `landlord1@example.com` … `landlord3@example.com` - chủ nhà

## Trang

| Đường dẫn | Chức năng |
|---|---|
| `/` | Trang chủ: tin mới nhất, loại tin, tính năng AI |
| `/rooms` | Duyệt + lọc tin đăng (từ khóa, loại, khu vực, giá, gần trường, tiện ích), phân trang |
| `/rooms/:id` | Chi tiết: ảnh, tiện ích, đánh giá, yêu thích, nhắn tin, tư vấn giá AI, gửi đánh giá |
| `/map` | Bản đồ Leaflet: điểm tin đăng + trường, lọc bán kính km |
| `/login`, `/register` | Đăng nhập / đăng ký (theo vai trò) |
| `/favorites` | Phòng yêu thích (sinh viên) |
| `/messages`, `/messages/:id` | Hộp thư, chat có đính kèm tệp, tự cập nhật 5 giây |
| `/profile` | Hồ sơ cá nhân (cập nhật `PUT /profile`) |
| `/students/:id` | Hồ sơ công khai của sinh viên: chip sở thích, lối sống (từ kết quả Tìm bạn cùng phòng) |
| `/ai/roommates` | AI gợi ý bạn cùng phòng (sinh viên), tên ứng viên link tới hồ sơ công khai |
| `/ai/area-suggestions` | AI gợi ý khu vực (sinh viên) |
| `/ai/chat` | Trợ lý AI (mọi user), hỗ trợ ngữ cảnh tin đăng qua `?listing_id=` |
| `/landlord` | Quản lý tin đăng (chủ nhà): đổi trạng thái, xóa, sửa |
| `/landlord/new`, `/landlord/edit/:id` | Đăng/sửa tin: chọn vị trí trên bản đồ (bấm để đặt marker, kéo để chỉnh), ảnh, tiện ích, "Viết mô tả giúp tôi" (AI) |

## Kiểm thử smoke (e2e)

Script `e2e-smoke.sh` gọi toàn bộ API mà các trang dùng, theo đúng luồng người dùng bấm qua từng trang (60+ kiểm tra): duyệt/lọc, đăng nhập/đăng ký, hồ sơ, yêu thích, nhắn tin kèm tệp, đánh giá, AI (chấp nhận cả khi AI service tắt - 503 fallback), CRUD tin đăng của chủ nhà, upload ảnh, phân quyền, đăng xuất.

```bash
# Cần backend đang chạy và đã seed:
cd backend && php artisan serve

# Chạy test (ở terminal khác):
bash frontend/e2e-smoke.sh

# Biến hữu dụng:
API=http://host:8000/api bash frontend/e2e-smoke.sh   # backend ở máy khác
DEBUG=1 bash frontend/e2e-smoke.sh                     # in raw response
```

Script chạy lại được nhiều lần không cần seed lại (tự tạo tài khoản test mới mỗi lần và tự dọn fixture). Kết quả mong đợi: `ALL GREEN`.

## Kiểm thử E2E qua trình duyệt

Ngoài smoke test qua API ở trên, `npm run test:e2e` chạy **trình duyệt thật** (Chromium headless qua Playwright) đi hết hành trình người dùng trên giao diện thật: vào trang chủ → tìm kiếm → đăng nhập → xem phòng → yêu thích → mở chat **và gửi tin nhắn thật** → yêu thích/hồ sơ → đăng xuất, kèm kiểm tra responsive mobile 390px và bắt lỗi console.

```bash
# Cần frontend (:5173) và backend (:8000) đang chạy và đã seed.
# Cài Playwright (một lần) và dùng Chromium hệ thống:
pip install --user playwright

npm run test:e2e        # hoặc: python3 .browser-check/e2e-journey.py
```

Biến môi trường hữu dụng:

```bash
APP_URL=http://localhost:5173 API_URL=http://localhost:8000 \
E2E_EMAIL=student1@example.com E2E_PASSWORD=password \
CHROME_PATH=/usr/bin/chromium-browser npm run test:e2e
```

Kết quả mong đợi: `all checks passed` (13/13 mục `[OK]`). Ảnh chụp màn hình các bước nằm trong `.browser-check/shots/e2e-*.png`.

Hai script kiểm thử bổ sung:

```bash
npm run test:skeletons   # giữ API treo (route interception) để xác nhận skeleton hiển thị + shimmer chạy, sau đó trang render nội dung thật
npm run test:prod        # smoke test bản build production (vite preview :4173) - kiểm tra bundle minified, font, lỗi console
```

`test:prod` cần origin `http://localhost:4173` trong CORS backend (`FRONTEND_PREVIEW_URL`, đã cấu hình mặc định).

## Ghi chú kỹ thuật

- Token lưu `localStorage` (`token`, `user`); tự xóa khi nhận 401.
- Màu thương hiệu nằm ở `src/styles/theme.css` (biến `--brand`) - đổi một chỗ là đổi cả app.
- Design system "sổ tay thuê trọ": giấy ấm + mực xanh ngọc, amber cho đánh giá/flag, font Bricolage Grotesque (tiêu đề), Be Vietnam Pro (thân) và IBM Plex Mono (số liệu) - tự host qua Fontsource, không CDN. Toàn bộ style nằm trong `theme.css`.
