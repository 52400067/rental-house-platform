# Chính sách bảo mật — TROSV

## Báo cáo lỗ hổng

**KHÔNG** tạo issue công khai cho lỗ hổng bảo mật.

Email: **security@trosv.example** *(thay bằng địa chỉ thật trước khi chạy production)*

Vui lòng kèm theo:

1. Mô tả lỗ hổng và loại (ví dụ: IDOR, upload bypass, race condition)
2. Các bước tái hiện / request HTTP cụ thể
3. Ảnh chụp hoặc response minh họa tác động
4. Đánh giá mức độ nghiêm trọng của bạn (CRITICAL / HIGH / MEDIUM / LOW)

Phản hồi trong vòng **72 giờ**; cam kết không truy cứu người báo cáo tốt (safe harbor).

## Phạm vi

- Backend API (Laravel): xác thực Sanctum, tin đăng, hội thoại, AI proxy
- Frontend SPA (React/Vite)
- Cấu hình Docker / Reverb / Caddy trong repo này

Ngoài phạm vi: dịch vụ AI chạy riêng (`AI_URL`), hạ tầng VPS bên ngoài repo.

## Biện pháp đã có (tóm tắt audit Phase 4)

- Header bảo mật toàn cục: `X-Content-Type-Options`, `Referrer-Policy`,
  `X-Frame-Options`, CSP **enforcing** chọn theo loại response — nghiêm
  `default-src 'none'; frame-ancestors 'none'` cho JSON/binary (toàn bộ API),
  policy tinh chỉnh cho trang HTML duy nhất, không ghi đè policy có sẵn
  (`backend/app/Http/Middleware/SecurityHeaders.php`)
- Prod fail-fast: từ chối phục vụ HTTP khi `APP_DEBUG=true` hoặc thiếu `APP_KEY`
  (`backend/app/Http/Middleware/EnsureProductionConfig.php` — console/composer
  vẫn boot bình thường để không vỡ CI và deploy script)
- Token Sanctum hết hạn sau 30 ngày (`SANCTUM_TOKEN_TTL_MINUTES`)
- Extension ảnh tin đăng suy từ nội dung đã xác thực, không tin tên file client
- Quét secret trong CI (gitleaks, report-only giai đoạn đầu)
- Ảnh đính kèm chat là file riêng tư, chỉ mở qua URL ký có hạn 60 phút

## Lưu ý triển khai

- Luôn chạy production với `APP_ENV=production`, `APP_DEBUG=false` — backend
  sẽ từ chối phục vụ mọi request nếu ngược lại (500 chung, lý do chi tiết chỉ vào log).
- Đặt mật khẩu DB/AI mạnh; không dùng `rental/rental` ngoài môi trường demo.
- CORS: `FRONTEND_URL` phải khớp chính xác origin frontend (kể cả scheme/port).
