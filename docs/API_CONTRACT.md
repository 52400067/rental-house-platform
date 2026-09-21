# Hợp đồng API: Frontend <-> Backend

Backend xây dựng, Frontend sử dụng. Nếu cần thay đổi, hãy sửa file này rồi báo cho cả nhóm.

## 1. Quy ước chung

- Base URL: `http://localhost:8000/api`. Mọi body là JSON (`Content-Type: application/json`), trừ upload tệp dùng `multipart/form-data`. Luôn gửi header `Accept: application/json`.
- Xác thực: `POST /login` trả về một token. Gửi `Authorization: Bearer {token}` ở mọi request cần đăng nhập. Frontend lưu token (dùng localStorage là đủ cho đồ án này) và xóa token khi đăng xuất hoặc khi nhận bất kỳ `401` nào.
- Tên trường dùng `snake_case`. Ngày giờ theo chuẩn ISO 8601. Tiền là số nguyên đơn vị VND. Khoảng cách tính bằng km.
- Thành công: `{ "data": ... }`. Danh sách có phân trang thêm `"meta": { "current_page", "last_page", "per_page", "total" }` và nhận `?page=`, `?per_page=` (mặc định 12, tối đa 50).
- Lỗi: `{ "message": "nội dung tiếng Việt" }`. Lỗi validate có thêm `"errors": { "field": ["thông báo"] }`.

| Mã | Ý nghĩa |
|---|---|
| 401 | Chưa đăng nhập hoặc token sai |
| 403 | Đã đăng nhập nhưng không có quyền (sai vai trò, không phải chủ sở hữu) |
| 404 | Không tìm thấy |
| 422 | Dữ liệu không hợp lệ (có `errors`) |
| 503 | AI service không khả dụng (chỉ với `/ai/*`) |
| 500 | Lỗi máy chủ |

- Cột "Quyền" bên dưới: **Công khai** = không cần token, **User** = bất kỳ người dùng đã đăng nhập, **Student** = sinh viên, **Landlord** = chủ nhà, **Owner** = chủ nhà sở hữu tin đăng đó.
- Endpoint công khai vẫn nhận token. Khi có token, các trường như `is_favorited` sẽ được cá nhân hóa.

## 2. Giá trị và tài khoản demo

| Trường | Giá trị |
|---|---|
| `role` | `student`, `landlord` |
| `type` (tin đăng) | `room` (phòng trọ), `apartment` (căn hộ), `house` (nhà nguyên căn) |
| `status` (tin đăng) | `available` (còn trống), `rented` (đã thuê), `hidden` (ẩn) |
| `sleep_schedule` | `early` (ngủ sớm), `normal` (bình thường), `late` (ngủ muộn) |
| `personality` | `introvert` (hướng nội), `ambivert` (trung tính), `extrovert` (hướng ngoại) |
| `priorities` | `cheap` (giá rẻ), `near_school` (gần trường), `well_rated` (đánh giá tốt), `many_options` (nhiều lựa chọn) |

Tài khoản mẫu (mật khẩu `password`): từ `student1@example.com` đến `student10@example.com`, từ `landlord1@example.com` đến `landlord3@example.com`.

## 3. Các đối tượng dữ liệu

**User**
```json
{ "id": 1, "name": "Nguyễn Văn A", "email": "a@example.com", "role": "student",
  "phone": "0901234567", "bio": null, "school_id": 1,
  "budget_min": 1500000, "budget_max": 3000000,
  "sleep_schedule": "normal", "cleanliness": 4, "smoking": false,
  "personality": "introvert", "interests": "music,gym", "looking_for_roommate": true }
```
Các trường chỉ dành cho sinh viên sẽ là `null` với chủ nhà. `cleanliness` từ 1 đến 5. `interests` là chuỗi ngăn cách bằng dấu phẩy.

**Listing (dạng tóm tắt, dùng cho danh sách và bản đồ)**
```json
{ "id": 101, "title": "Phòng trọ gần ĐHQG", "type": "room", "price": 2500000, "area_m2": 22.5,
  "address": "12 Đường số 5", "latitude": 10.8712, "longitude": 106.7801, "status": "available",
  "ward": { "id": 1, "name": "Thủ Đức" },
  "cover_image": "http://localhost:8000/storage/listings/1.jpg",
  "avg_rating": 4.3, "reviews_count": 7, "distance_km": 0.85, "is_favorited": false }
```
`cover_image` có thể là `null`. `avg_rating` có thể là `null`. `distance_km` chỉ có giá trị khi request gửi `school_id`, ngược lại là `null`. `is_favorited` luôn là `false` với khách.

**Listing (dạng chi tiết)**: gồm mọi trường của dạng tóm tắt, cộng thêm
```json
{ "description": "...", "created_at": "2026-09-20T08:30:00Z",
  "images": [ { "id": 1, "url": "http://localhost:8000/storage/listings/1.jpg" } ],
  "amenities": [ { "id": 1, "name": "Wifi" } ],
  "landlord": { "id": 5, "name": "Trần Thị B", "phone": "0909999999" },
  "ratings": { "listing_avg": 4.3, "landlord_avg": 4.6, "area_avg": 4.1 },
  "my_conversation_id": null, "can_review": false }
```
`landlord.phone` là `null` với khách. Các giá trị trong `ratings` có thể là `null`. `my_conversation_id` và `can_review` chỉ có ý nghĩa với sinh viên.

**Conversation (hội thoại)**
```json
{ "id": 33, "listing": { "id": 101, "title": "Phòng trọ gần ĐHQG", "cover_image": null },
  "other_user": { "id": 5, "name": "Trần Thị B" },
  "last_message": { "body": "Phòng còn trống không ạ?", "created_at": "2026-09-20T08:30:00Z" },
  "unread_count": 2 }
```

**Message (tin nhắn)**
```json
{ "id": 901, "sender_id": 1, "is_mine": true, "body": "Phòng còn trống không ạ?",
  "attachment_name": "hop-dong.pdf", "attachment_url": "http://localhost:8000/attachments/901?signature=...",
  "created_at": "2026-09-20T08:30:00Z" }
```
`attachment_url` là link tạm thời có chữ ký (hiệu lực 60 phút). Mở thẳng trong tab trình duyệt, không cần token. Cả hai trường tệp đính kèm là `null` khi tin nhắn không có tệp.

**Review (đánh giá)**
```json
{ "id": 21, "student": { "id": 1, "name": "Nguyễn Văn A" },
  "listing_rating": 4, "landlord_rating": 5, "comment": "Chủ nhà nhiệt tình", "created_at": "2026-09-21T10:00:00Z" }
```

## 4. Danh sách endpoint

### Xác thực và hồ sơ

| Endpoint | Quyền | Body | Trả về |
|---|---|---|---|
| `POST /register` | Công khai | `name`, `email` (duy nhất), `password` (tối thiểu 8 ký tự), `password_confirmation`, `role` | 201 `data: { token, user }` (đăng nhập luôn) |
| `POST /login` | Công khai | `email`, `password` | `data: { token, user }`. Sai thông tin: 422 |
| `POST /logout` | User | | `data: null` |
| `GET /me` | User | | `data: User` |
| `PUT /profile` | User | Một hoặc nhiều trường: `name`, `phone`, `bio`, và với sinh viên `school_id`, `budget_min`, `budget_max` (max >= min), `sleep_schedule`, `cleanliness`, `smoking`, `personality`, `interests`, `looking_for_roommate` | `data: User` |

### Dữ liệu tham chiếu (cho dropdown và bản đồ)

| Endpoint | Quyền | Trả về |
|---|---|---|
| `GET /wards` | Công khai | `data: [{ id, name, latitude, longitude }]` |
| `GET /schools` | Công khai | `data: [{ id, name, latitude, longitude }]` |
| `GET /amenities` | Công khai | `data: [{ id, name }]` |

### Duyệt tin đăng

| Endpoint | Quyền | Query | Trả về |
|---|---|---|---|
| `GET /listings` | Công khai | `q` (tiêu đề hoặc địa chỉ), `price_min`, `price_max`, `ward_id`, `type`, `amenity_ids[]` (phải có tất cả), `school_id` + `max_km` (lọc theo khoảng cách), `sort` = `newest` (mặc định), `price_asc`, `price_desc`, `distance` (cần `school_id`), `rating`, `page`, `per_page` | `Listing (tóm tắt)` có phân trang. Chỉ tin `available` |
| `GET /listings/{id}` | Công khai | | `data: Listing (chi tiết)`. Tin `hidden`: trả 404 trừ chủ tin |
| `GET /listings/{id}/reviews` | Công khai | `page` | `Review` có phân trang, mới nhất trước |

Với bản đồ, Frontend gọi `GET /listings` với cùng bộ lọc và `per_page=50`, rồi vẽ các điểm theo `latitude`, `longitude` của kết quả.

### Chủ nhà: quản lý tin đăng

| Endpoint | Quyền | Body | Trả về |
|---|---|---|---|
| `GET /my/listings` | Landlord | `page`, `status` | `Listing (tóm tắt)` có phân trang, mọi trạng thái |
| `POST /listings` | Landlord | `title` (5-200 ký tự), `type`, `price` (100000-100000000), `area_m2` (5-1000), `address`, `latitude`, `longitude`, `ward_id`, `description` (tùy chọn), `amenity_ids[]` (tùy chọn) | 201 `data: Listing (chi tiết)` |
| `PUT /listings/{id}` | Owner | Các trường như trên (đều tùy chọn) và thêm `status` | `data: Listing (chi tiết)` |
| `DELETE /listings/{id}` | Owner | | `data: null` |
| `POST /listings/{id}/images` | Owner | `multipart`: `images[]` (jpg/png/webp, tối đa 2 MB mỗi ảnh, tối đa 5 ảnh mỗi tin tính tổng) | `data: [{ id, url }]` (toàn bộ ảnh của tin). Ảnh đầu tiên là ảnh bìa |
| `DELETE /listings/{id}/images/{image_id}` | Owner | | `data: null` |

### Yêu thích (sinh viên)

| Endpoint | Quyền | Trả về |
|---|---|---|
| `GET /favorites` | Student | `Listing (tóm tắt)` có phân trang |
| `PUT /favorites/{listing_id}` | Student | `data: { is_favorited: true }`. Gọi hai lần vẫn an toàn |
| `DELETE /favorites/{listing_id}` | Student | `data: { is_favorited: false }`. Gọi hai lần vẫn an toàn |

### Nhắn tin (sinh viên <-> chủ nhà, mỗi tin đăng một hội thoại)

| Endpoint | Quyền | Body | Trả về |
|---|---|---|---|
| `POST /conversations` | Student | `listing_id` | `data: Conversation`. Nếu đã có thì trả hội thoại cũ |
| `GET /conversations` | User | | `data: [Conversation]`, hoạt động mới nhất trước (không phân trang) |
| `GET /conversations/{id}/messages` | Participant | `after_id` (tùy chọn, chỉ lấy tin mới hơn) | `data: [Message]` cũ nhất trước. Frontend có thể gọi lặp lại mỗi 5 giây |
| `POST /conversations/{id}/messages` | Participant | JSON `{ body }` (tối đa 1000 ký tự), hoặc multipart `body` + `file` (pdf, jpg, png, docx, tối đa 5 MB) | 201 `data: Message` |
| `POST /conversations/{id}/read` | Participant | | `data: null`. Đánh dấu đã đọc các tin của người kia |

Participant = một trong hai người tham gia hội thoại. Người ngoài nhận 404. Số tin chưa đọc trên thanh menu = tổng `unread_count` từ `GET /conversations`.

### Đánh giá (sinh viên)

| Endpoint | Quyền | Body | Trả về |
|---|---|---|---|
| `POST /listings/{id}/reviews` | Student | `listing_rating` (1-5), `landlord_rating` (1-5), `comment` (tùy chọn, tối đa 1000 ký tự) | 201 `data: Review`. 403 nếu sinh viên chưa có hội thoại về tin này. 422 nếu đã đánh giá rồi |

Chỉ hiển thị form đánh giá khi chi tiết tin có `can_review: true`.

### AI (gọi AI service thông qua Backend)

Các lệnh gọi này có thể mất đến khoảng 30 giây. Hãy hiển thị vòng quay loading. Nếu AI service không chạy, trạng thái là 503 kèm `message` tiếng Việt. Luôn gắn nhãn cho kết quả: "Gợi ý tham khảo do AI tạo ra".

| Endpoint | Quyền | Body | Trả về |
|---|---|---|---|
| `POST /ai/roommates` | Student | không có | `data: [{ user_id, name, school, phone, score, reason }]` (tối đa 5, `score` từ 0 đến 100, cao nhất trước). 422 nếu hồ sơ sinh viên chưa đủ hoặc `looking_for_roommate` là false |
| `POST /ai/price-advice` | Student | `listing_id` | `data: { listing_price, verdict, fair_min, fair_max, tips: [string], message, stats: { count, min, median, max } }`. `verdict` là `high`, `fair` hoặc `low`. `message` là đoạn tin nhắn mẫu để gửi cho chủ nhà |
| `POST /ai/area-suggestions` | Student | `budget_min`, `budget_max`, `school_id`, `priorities[]` (đều tùy chọn, thiếu thì lấy từ hồ sơ) | `data: [{ ward_id, name, reason, stats: { listings_count, avg_price, avg_rating, distance_to_school_km } }]` (tối đa 3) |
| `POST /ai/chat` | User | `message` (1-1000 ký tự), `history` (tùy chọn, 10 lượt gần nhất dạng `{ role: "user" hoặc "assistant", content }`), `listing_id` (tùy chọn, làm ngữ cảnh) | `data: { reply }`. Frontend giữ lịch sử và gửi lại mỗi lần |
| `POST /ai/description` | Landlord | `title`, `type`, `price`, `area_m2`, `address`, `ward_id`, `amenity_ids[]` (đều tùy chọn) | `data: { description }`. Frontend điền vào ô mô tả để chủ nhà chỉnh sửa |

## 5. Thay đổi hợp đồng này

Sửa file này, báo trong nhóm chat, và chờ người bị ảnh hưởng đồng ý trước khi merge. Việc bổ sung nhỏ (thêm một trường tùy chọn) không cần chờ duyệt nhưng vẫn phải thông báo.
