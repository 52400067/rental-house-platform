# Rental House Platform

Nền tảng kết nối sinh viên tìm phòng trọ và chủ nhà, tích hợp trợ lý AI.

## Cài đặt

Chạy toàn bộ hệ thống (Frontend, Backend, AI Service, DB, Redis) bằng Docker:

```bash
docker compose up -d --build
```

## Tài liệu

Vui lòng đọc kỹ các file trong thư mục `docs/` để nắm rõ cấu trúc và nguyên tắc phát triển:
- `docs/GUIDE.md`: Hướng dẫn workflow và cách chia role.
- `docs/project-tree.md`: Cấu trúc thư mục Monorepo.
- `docs/ERD.md`: Thiết kế Cơ sở dữ liệu.
- `docs/api-contract.md`: Đặc tả API.
- `docs/system-flow.md`: Luồng hoạt động hệ thống.
