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
| `/ai/roommates` | AI gợi ý bạn cùng phòng (sinh viên) |
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

## Ghi chú kỹ thuật

- Token lưu `localStorage` (`token`, `user`); tự xóa khi nhận 401.
- Màu thương hiệu nằm ở `src/styles/theme.css` (biến `--brand`) - đổi một chỗ là đổi cả app.
- Style cố tình tối giản (barebone): dùng utility của Bootstrap, ít CSS tự viết.
