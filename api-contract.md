# API CONTRACT

Hợp đồng API giữa **Frontend (React)**, **Backend (Laravel)** và **AI Service (FastAPI)** của Rental House Platform. Mọi thay đổi ở tài liệu này phải được thông báo cho cả nhóm.

| Mục | Giá trị |
|---|---|
| Phiên bản | 1.0.0 (Draft, chờ cả nhóm chốt) |
| Chủ trì | Backend |
| Tài liệu liên quan | `ERD.md` (schema DB), `GUIDE.md` (quy trình), `SYSTEM_FLOW.md` (luồng hoạt động) |

---

## MỤC LỤC

1. Quy ước chung
2. Dữ liệu tham chiếu (districts, schools, amenities)
3. Xác thực & tài khoản
4. Hồ sơ người dùng
5. Tin đăng (Listings)
6. Yêu thích
7. Nhắn tin
8. Thuê nhà (Tenancies)
9. Đánh giá
10. Tính năng AI (Frontend ↔ Backend)
11. Hợp đồng nội bộ Backend ↔ AI Service
12. Hướng dẫn triển khai cho Backend
13. Changelog

---

## 1. Quy ước chung

### 1.1 Địa chỉ và giao thức

| Môi trường | Base URL |
|---|---|
| Local (qua Nginx) | `http://localhost/api/v1` |
| Production | `https://{domain}/api/v1` |
| AI Service (chỉ trong mạng Docker) | `http://ai-service:8000/internal/v1` |

1. Toàn bộ API dùng JSON, mã hóa UTF-8. Header `Content-Type: application/json`, riêng upload tệp dùng `multipart/form-data`.
2. **Nginx phải chuyển tiếp cả `/api` và `/sanctum` về Backend** (cần cho CSRF cookie của Sanctum). Không có route public nào tới AI Service.
3. Tên trường JSON dùng `snake_case`. Thời gian theo ISO 8601 UTC (`2026-09-20T08:30:00Z`). Tiền là **số nguyên VND**. Khoảng cách tính bằng **km**, diện tích **m²**.
4. Trường không có giá trị trả `null`, không bỏ khỏi response (trừ khi tài liệu ghi rõ "chỉ có khi...").

### 1.2 Xác thực (Sanctum SPA, dùng cookie)

FE và BE cùng domain qua Nginx nên dùng session cookie, không lưu token ở JavaScript.

1. Trước khi đăng nhập/đăng ký, FE gọi `GET /sanctum/csrf-cookie` (không có tiền tố `/api/v1`) để nhận cookie `XSRF-TOKEN`.
2. Axios cấu hình `withCredentials: true`, `withXSRFToken: true`. Với các request ghi (POST, PUT, PATCH, DELETE), Axios tự gửi header `X-XSRF-TOKEN`.
3. Cookie session: `HttpOnly`, `SameSite=Lax`, `Secure` ở production. Session driver: Redis.
4. Biến môi trường Backend cần có: `SESSION_DRIVER=redis`, `SESSION_DOMAIN`, `SANCTUM_STATEFUL_DOMAINS`, `FRONTEND_URL`.
5. Hết phiên hoặc chưa đăng nhập: `401 UNAUTHENTICATED`. Thiếu hoặc sai CSRF: `419 CSRF_MISMATCH`.

### 1.3 Header

| Header | Chiều | Ghi chú |
|---|---|---|
| `Accept: application/json` | FE → BE | Bắt buộc |
| `X-XSRF-TOKEN` | FE → BE | Axios tự gắn |
| `X-Request-ID` | Nginx tạo, chuyển tiếp | Backend phản hồi lại cùng giá trị và gửi tiếp sang AI Service |

### 1.4 Cấu trúc response

**Thành công:**

```json
{
  "success": true,
  "data": { },
  "meta": { },
  "message": "Tùy chọn, chuỗi hiển thị"
}
```

`data` là object hoặc mảng tùy endpoint. `meta` chỉ xuất hiện khi có phân trang hoặc thông tin bổ sung.

**Lỗi:**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dữ liệu không hợp lệ",
    "details": { "price_max": ["Giá tối đa phải lớn hơn hoặc bằng giá tối thiểu."] }
  },
  "request_id": "b1f7c1f6-1d5f-4d3c-9a54-5f5a7a1b2c3d"
}
```

`details` chỉ có ở lỗi validation (khóa là tên field, giá trị là mảng thông báo tiếng Việt). Thông báo lỗi trả về tiếng Việt.

**Phân trang kiểu trang** (mặc định cho danh sách):

Query `page` (mặc định 1), `per_page` (mặc định 20, tối đa 50). Response:

```json
"meta": { "current_page": 1, "per_page": 20, "total": 134, "last_page": 7 }
```

**Phân trang kiểu con trỏ** (chỉ dùng cho tin nhắn): xem mục 7.

### 1.5 Bảng mã lỗi

| HTTP | `error.code` | Khi nào |
|---|---|---|
| 400 | `BAD_REQUEST` | Request sai cấu trúc |
| 401 | `UNAUTHENTICATED` | Chưa đăng nhập hoặc hết phiên |
| 401 | `INVALID_CREDENTIALS` | Sai email hoặc mật khẩu |
| 403 | `FORBIDDEN` | Không đủ quyền (sai vai trò, không phải chủ sở hữu) |
| 403 | `EMAIL_NOT_VERIFIED` | Cần xác thực email cho thao tác này |
| 403 | `ACCOUNT_DISABLED` | Tài khoản bị khóa (`is_active = false`) |
| 403 | `TENANCY_NOT_ELIGIBLE` | Chưa đủ điều kiện đánh giá |
| 404 | `NOT_FOUND` | Không tìm thấy tài nguyên (hoặc không có quyền biết nó tồn tại) |
| 409 | `CONFLICT` | Xung đột chung |
| 409 | `INVALID_STATUS_TRANSITION` | Chuyển trạng thái không hợp lệ |
| 409 | `REVIEW_ALREADY_EXISTS` | Đã đánh giá lần thuê này |
| 413 | `FILE_TOO_LARGE` | Tệp vượt giới hạn |
| 419 | `CSRF_MISMATCH` | Thiếu hoặc sai CSRF token |
| 422 | `VALIDATION_ERROR` | Dữ liệu không hợp lệ |
| 422 | `PROFILE_INCOMPLETE` | Hồ sơ chưa đủ để dùng tính năng (AI) |
| 429 | `TOO_MANY_REQUESTS` | Vượt giới hạn tần suất. Kèm header `Retry-After` |
| 500 | `INTERNAL_ERROR` | Lỗi máy chủ. Không lộ chi tiết nội bộ |
| 502 | `AI_BAD_RESPONSE` | AI Service trả dữ liệu sai cấu trúc |
| 503 | `AI_UNAVAILABLE` | AI Service không sẵn sàng |
| 504 | `AI_TIMEOUT` | AI Service quá thời gian |

### 1.6 Giới hạn tần suất

| Nhóm | Giới hạn | Khóa đếm |
|---|---|---|
| Đăng nhập | 5 lần/phút | email + IP |
| Đăng ký, quên mật khẩu | 10 lần/giờ | IP |
| API chung (đã đăng nhập) | 120 request/phút | user |
| API chung (khách) | 60 request/phút | IP |
| Gửi tin nhắn | 30 tin/phút | user |
| Upload tệp | 20 lần/phút | user |
| Tạo đánh giá | 10 lần/giờ | user |
| Endpoint AI | 10 lần/phút | user |
| Chatbot | 20 tin/phút | user |

### 1.7 Vai trò và quyền

`R` = xem, `C` = tạo, `U` = sửa, `D` = xóa. `own` = chỉ của chính mình.

| Tài nguyên | Khách | Sinh viên | Chủ nhà | Admin |
|---|---|---|---|---|
| Danh sách, chi tiết, bản đồ tin (`published`) | R | R | R | R |
| Tin đăng | | | C, U, D (own) | R, U (ẩn) |
| Hồ sơ | | R, U (own) | R, U (own) | R |
| Yêu thích | | C, R, D (own) | | |
| Hội thoại và tin nhắn | | C, R (own) | R, tạo tin nhắn trong hội thoại của mình | |
| Thuê nhà | | C (own) | Xác nhận, từ chối (own) | R |
| Đánh giá | R | C (own, đủ điều kiện) | Phản hồi (own) | Ẩn/hiện |
| Endpoint AI | | Roommate, giá, khu vực, chatbot | Mô tả từ ảnh, chatbot | |

Admin chỉ là vai trò tối thiểu ở giai đoạn này. Xem mục 9.5.

### 1.8 Danh sách giá trị enum

| Enum | Giá trị |
|---|---|
| `role` | `student`, `landlord`, `admin` |
| `property_type` | `room` (phòng trọ), `apartment` (căn hộ mini), `house` (nhà nguyên căn), `shared_room` (ở ghép) |
| `listing.status` | `draft`, `published`, `rented`, `hidden` |
| `tenancy.status` | `pending`, `confirmed`, `ended`, `cancelled` |
| `message.type` | `text`, `attachment`, `system` |
| `ai_job.status` | `pending`, `processing`, `done`, `failed` |
| `gender` | `male`, `female`, `other` |

---

## 2. Dữ liệu tham chiếu (công khai)

Dữ liệu ít đổi, FE nên cache phía client. Backend cache Redis 1 giờ.

### 2.1 `GET /districts`

```json
{ "success": true, "data": [
  { "id": 1, "city": "TP. Hồ Chí Minh", "name": "Thủ Đức", "slug": "thu-duc",
    "latitude": 10.8494, "longitude": 106.7537,
    "avg_rating": 4.2, "reviews_count": 35, "listings_count": 41 }
]}
```

`listings_count` là số tin `published` của khu vực đó.

### 2.2 `GET /schools`

Tham số tùy chọn: `district_id`.

```json
{ "success": true, "data": [
  { "id": 1, "name": "Đại học Quốc gia TP.HCM", "short_name": "ĐHQG",
    "address": "...", "district_id": 1, "latitude": 10.8700, "longitude": 106.8030 }
]}
```

### 2.3 `GET /amenities`

```json
{ "success": true, "data": [
  { "id": 1, "code": "wifi", "name": "Wifi", "icon": "wifi" }
]}
```

---

## 3. Xác thực & tài khoản

Đối tượng `user` dùng chung ở mọi response:

```json
{
  "id": 12, "name": "Nguyễn Văn A", "email": "a@example.com",
  "role": "student", "phone": "0901234567",
  "avatar_url": "https://.../storage/avatars/12.jpg",
  "email_verified": true,
  "profile_completed": false,
  "created_at": "2026-09-01T03:00:00Z"
}
```

`profile_completed` của sinh viên là true khi đủ điều kiện ở `ERD.md` mục 3.2. Của chủ nhà là true khi có `phone`.

### 3.1 `GET /sanctum/csrf-cookie`

Nhận cookie CSRF. Trả `204 No Content`. Không có tiền tố `/api/v1`.

### 3.2 `POST /auth/register`

Công khai. Tự đăng nhập sau khi đăng ký thành công, đồng thời gửi email xác thực bằng queue.

**Body**

| Trường | Kiểu | Bắt buộc | Quy tắc |
|---|---|---|---|
| name | string | có | 2 đến 100 ký tự |
| email | string | có | Email hợp lệ, duy nhất, không phân biệt hoa thường |
| password | string | có | Tối thiểu 8 ký tự, có chữ và số |
| password_confirmation | string | có | Khớp `password` |
| role | string | có | `student` hoặc `landlord` (không cho tự đăng ký `admin`) |
| phone | string | không | 9 đến 11 chữ số |

**Response 201:** `data.user` là đối tượng `user`.
**Lỗi:** `422 VALIDATION_ERROR`, `429`.

### 3.3 `POST /auth/login`

**Body:** `email`, `password`, `remember` (boolean, tùy chọn).
**Response 200:** `data.user`.
**Lỗi:** `401 INVALID_CREDENTIALS`, `403 ACCOUNT_DISABLED`, `422`, `429`.

### 3.4 `POST /auth/logout`

Cần đăng nhập. Hủy session. **Response 200:** `data: null`.

### 3.5 `GET /auth/me`

Trả `data.user` của phiên hiện tại, hoặc `401 UNAUTHENTICATED` nếu là khách. FE gọi khi khởi động để xác định trạng thái đăng nhập.

### 3.6 Xác thực email

1. `POST /auth/email/resend`: cần đăng nhập, gửi lại email xác thực. Giới hạn 3 lần/giờ. **Response 200.**
2. `GET /auth/email/verify/{id}/{hash}`: đường dẫn có chữ ký (signed URL) nằm trong email. Backend xác thực rồi **redirect 302** về `{FRONTEND_URL}/verify-email?status=success` hoặc `?status=invalid`.

Các thao tác cần email đã xác thực: **publish tin** và **gửi tin nhắn**. Nếu chưa xác thực trả `403 EMAIL_NOT_VERIFIED`. Bật/tắt bằng biến môi trường `REQUIRE_EMAIL_VERIFICATION` (dev có thể đặt `false`).

### 3.7 Quên và đặt lại mật khẩu

1. `POST /auth/forgot-password`. Body `email`. Luôn trả `200` dù email có tồn tại hay không (tránh lộ thông tin). Email chứa link `{FRONTEND_URL}/reset-password?token=...&email=...`.
2. `POST /auth/reset-password`. Body `token`, `email`, `password`, `password_confirmation`. **Lỗi:** `422 VALIDATION_ERROR` khi token sai hoặc hết hạn.

### 3.8 `PUT /auth/password`

Đổi mật khẩu khi đã đăng nhập. Body `current_password`, `password`, `password_confirmation`. Lỗi `422` nếu sai mật khẩu hiện tại.

---

## 4. Hồ sơ người dùng

### 4.1 `GET /profile`

Cần đăng nhập. Trả hồ sơ của chính mình.

**Sinh viên:**

```json
{ "success": true, "data": {
  "user": { "...": "đối tượng user" },
  "profile": {
    "bio": "Sinh viên năm 3, thích yên tĩnh",
    "gender": "male",
    "date_of_birth": "2004-05-10",
    "school": { "id": 1, "name": "Đại học Quốc gia TP.HCM" },
    "year_of_study": 3,
    "budget_min": 1500000, "budget_max": 3000000,
    "preferred_district_ids": [1, 3],
    "lifestyle": {
      "sleep_schedule": "normal", "cleanliness": 4, "noise_tolerance": 2,
      "smoking": "never", "guests_frequency": "sometimes", "cooking": "often",
      "pets": false, "personality": "introvert", "study_place": "home"
    },
    "interests": ["music", "gym", "reading"],
    "matching_opt_in": true,
    "roommate_gender_preference": "same_gender",
    "onboarding_completed_at": "2026-09-02T04:00:00Z"
  }
}}
```

**Chủ nhà:** `profile` gồm `bio`, `contact_note`, `avg_rating`, `reviews_count`, `onboarding_completed_at`.

### 4.2 `PUT /profile`

Cần đăng nhập. Ghi đè các trường gửi lên (partial update: trường không gửi thì giữ nguyên). Các trường của vai trò khác bị bỏ qua.

| Trường | Áp dụng | Quy tắc |
|---|---|---|
| name | cả hai | 2 đến 100 ký tự |
| phone | cả hai | 9 đến 11 chữ số |
| bio | cả hai | Tối đa 1000 ký tự |
| gender | cả hai | Enum |
| date_of_birth | cả hai | Ngày trong quá khứ, tuổi từ 16 |
| school_id | sinh viên | Tồn tại trong `schools` |
| year_of_study | sinh viên | 1 đến 8 |
| budget_min, budget_max | sinh viên | Số nguyên VND, `budget_max >= budget_min`, tối đa 100.000.000 |
| preferred_district_ids | sinh viên | Mảng id tồn tại, tối đa 5 |
| lifestyle | sinh viên | Object đúng schema `ERD.md` mục 3.2, khóa lạ bị từ chối |
| interests | sinh viên | Mảng chuỗi, tối đa 10, mỗi chuỗi tối đa 30 ký tự |
| matching_opt_in | sinh viên | boolean. Chỉ bật được khi hồ sơ đủ điều kiện, nếu không trả `422 PROFILE_INCOMPLETE` |
| roommate_gender_preference | sinh viên | `any` hoặc `same_gender` |
| contact_note | chủ nhà | Tối đa 500 ký tự |
| complete_onboarding | cả hai | boolean. true thì gán `onboarding_completed_at` |

**Response 200:** như `GET /profile`. Sau khi cập nhật, Backend xóa cache `ai:roommates:{user_id}`.

### 4.3 Ảnh đại diện

1. `POST /profile/avatar`: `multipart/form-data`, trường `avatar` (jpeg, png, webp, tối đa 2 MB). Backend cắt vuông 512×512. **Response 200:** `data.avatar_url`.
2. `DELETE /profile/avatar`: **Response 200.**

### 4.4 `GET /landlords/{id}` (công khai)

Hồ sơ công khai của chủ nhà:

```json
{ "success": true, "data": {
  "id": 5, "name": "Trần Thị B", "avatar_url": null, "bio": "...",
  "avg_rating": 4.6, "reviews_count": 18, "listings_count": 6,
  "member_since": "2025-11-01T00:00:00Z"
}}
```

Không trả email, số điện thoại. `404` nếu người dùng đó không phải chủ nhà.

---

## 5. Tin đăng (Listings)

### 5.1 Đối tượng

**Dạng tóm tắt (`listing_summary`)** dùng ở danh sách:

```json
{
  "id": 101, "title": "Phòng trọ gần ĐHQG, có gác",
  "property_type": "room", "status": "published",
  "price_monthly": 2500000, "area_m2": 22.5, "max_occupants": 2,
  "address_line": "12 Đường số 5, P. Linh Trung",
  "district": { "id": 1, "name": "Thủ Đức" },
  "latitude": 10.8712, "longitude": 106.7801,
  "cover_image_url": "https://.../listings/101/thumb_1.jpg",
  "amenities": ["wifi", "air_conditioner", "parking"],
  "avg_rating": 4.3, "reviews_count": 7,
  "distance_km": 0.85,
  "is_favorited": false,
  "created_at": "2026-09-01T03:00:00Z"
}
```

`distance_km` chỉ có giá trị khi request có `school_id` và tin nằm trong bán kính 15 km, ngược lại `null`. `is_favorited` là `false` với khách.

**Dạng chi tiết (`listing_detail`)** gồm mọi trường của `listing_summary` cộng thêm:

```json
{
  "description": "...", "description_source": "manual",
  "deposit_amount": 2500000, "electricity_price": 3500, "water_price": 20000,
  "available_from": "2026-10-01",
  "images": [ { "id": 1, "url": "https://.../1.jpg", "thumbnail_url": "https://.../thumb_1.jpg", "is_cover": true, "sort_order": 0 } ],
  "amenities_detail": [ { "code": "wifi", "name": "Wifi", "icon": "wifi" } ],
  "nearby_schools": [ { "school_id": 1, "name": "ĐHQG TP.HCM", "distance_km": 0.85 } ],
  "landlord": { "id": 5, "name": "Trần Thị B", "avatar_url": null, "phone": "0901234567", "avg_rating": 4.6, "reviews_count": 18 },
  "favorites_count": 12, "views_count": 340,
  "my_conversation_id": null,
  "published_at": "2026-09-01T03:00:00Z"
}
```

Quy tắc hiển thị: `landlord.phone` chỉ có giá trị với người dùng **đã đăng nhập**, khách nhận `null`. `my_conversation_id` là id hội thoại của sinh viên đang xem với tin này (nếu đã có).

### 5.2 `GET /listings` (công khai)

Chỉ trả tin `status = published`.

**Query**

| Tham số | Kiểu | Ghi chú |
|---|---|---|
| q | string | Tìm trong tiêu đề, địa chỉ (ILIKE), tối thiểu 2 ký tự |
| price_min, price_max | int | VND/tháng |
| area_min, area_max | number | m² |
| district_id | int | Có thể lặp: `district_id[]=1&district_id[]=3` |
| property_type | string | Có thể lặp |
| amenities[] | string | Danh sách `code`. Tin phải có **tất cả** tiện ích được chọn |
| max_occupants_min | int | Số người ở tối thiểu tin phải hỗ trợ |
| school_id | int | Để tính `distance_km` và lọc/sắp xếp theo khoảng cách |
| max_distance_km | number | 0.1 đến 15. Bắt buộc kèm `school_id` |
| available_before | date | Tin có `available_from` nhỏ hơn hoặc bằng ngày này (hoặc null) |
| sort | string | `newest` (mặc định), `price_asc`, `price_desc`, `distance_asc`, `rating_desc`. `distance_asc` bắt buộc kèm `school_id` |
| page, per_page | int | Mặc định 1 và 20, tối đa 50 |

**Response 200:** `data` là mảng `listing_summary`, `meta` có phân trang.
**Lỗi:** `422` khi tham số không hợp lệ (ví dụ `price_max < price_min`, `max_distance_km` thiếu `school_id`).

### 5.3 `GET /listings/map` (công khai)

Dữ liệu tối giản cho bản đồ theo khung nhìn.

**Query:** `bbox` (bắt buộc, dạng `minLng,minLat,maxLng,maxLat`) cùng các bộ lọc như 5.2 (không có `sort`, `page`).

```json
{ "success": true,
  "data": [ { "id": 101, "latitude": 10.8712, "longitude": 106.7801, "price_monthly": 2500000, "thumbnail_url": "https://.../thumb_1.jpg", "title": "Phòng trọ gần ĐHQG" } ],
  "meta": { "total": 312, "returned": 300, "truncated": true }
}
```

Trả tối đa **300** điểm. Khi vượt quá, `truncated = true` và FE nên yêu cầu người dùng phóng to.

### 5.4 `GET /listings/{id}` (công khai)

Trả `listing_detail`. Tin `published` ai cũng xem được. Tin `draft`, `hidden` chỉ chủ tin và admin xem được, còn lại trả `404`. Tin `rented` vẫn xem được kèm `status = rented`. Mỗi lượt xem tăng bộ đếm Redis (bỏ qua chủ tin).

### 5.5 `GET /me/listings` (chủ nhà)

Danh sách tin của chính chủ nhà, gồm mọi trạng thái. Query: `status`, `page`, `per_page`. Trả mảng `listing_summary`.

### 5.6 `POST /listings` (chủ nhà)

Tạo tin. Mặc định tạo ở trạng thái `draft`. Ảnh upload riêng ở 5.9.

| Trường | Kiểu | Bắt buộc | Quy tắc |
|---|---|---|---|
| title | string | có | 10 đến 200 ký tự |
| description | string | không | Tối đa 5000 ký tự |
| property_type | string | có | Enum |
| price_monthly | int | có | 100.000 đến 100.000.000 |
| deposit_amount | int | không | 0 đến 100.000.000 |
| electricity_price | int | không | 0 đến 20.000 |
| water_price | int | không | 0 đến 500.000 |
| area_m2 | number | có | 5 đến 1000 |
| max_occupants | int | có | 1 đến 20 |
| available_from | date | không | |
| address_line | string | có | 5 đến 300 ký tự |
| district_id | int | có | Tồn tại |
| latitude, longitude | number | có | Trong phạm vi Việt Nam (lat 8 đến 24, lng 102 đến 110) |
| amenity_codes | string[] | không | Mỗi phần tử là `code` tồn tại |

**Response 201:** `listing_detail`. Sau khi lưu, Backend đẩy job `RecalculateListingDistances`.

### 5.7 `PUT /listings/{id}` (chủ tin)

Cập nhật một phần, cùng quy tắc như 5.6. Nếu `latitude`/`longitude` đổi thì chạy lại job khoảng cách. Xóa cache tag `listings`. **Lỗi:** `403` nếu không phải chủ tin.

### 5.8 `PATCH /listings/{id}/status` (chủ tin)

Body: `status`. Chuyển trạng thái hợp lệ theo `ERD.md` mục 4.1:

| Từ | Sang được |
|---|---|
| `draft` | `published` |
| `published` | `hidden`, `rented` |
| `hidden` | `published` |
| `rented` | `published` |

`draft → published` cần: ít nhất 1 ảnh, `description` từ 30 ký tự, email đã xác thực (nếu bật cờ). Nếu thiếu, trả `422 VALIDATION_ERROR` với `details` chỉ rõ thiếu gì. Chuyển sai luồng trả `409 INVALID_STATUS_TRANSITION`.

### 5.9 Ảnh của tin

1. `POST /listings/{id}/images`: `multipart/form-data`, trường `images[]` (jpeg, png, webp, mỗi tệp tối đa 5 MB, tối đa 10 ảnh mỗi tin tính cả ảnh đã có). Ảnh đầu tiên của tin tự thành ảnh bìa. **Response 201:** mảng `images` của tin. Thumbnail được tạo bằng job.
2. `PUT /listings/{id}/images/order`: body `{ "image_ids": [3,1,2] }`, sắp xếp lại. Ảnh đầu danh sách thành ảnh bìa.
3. `DELETE /listings/{id}/images/{image_id}`: xóa ảnh. Nếu xóa ảnh bìa, ảnh kế tiếp thành bìa. Không cho xóa ảnh cuối cùng của tin đang `published` (`409 CONFLICT`).

### 5.10 `DELETE /listings/{id}` (chủ tin)

Xóa mềm. Tin đang có `tenancy` ở trạng thái `pending` hoặc `confirmed` không được xóa (`409 CONFLICT`), phải chuyển sang `hidden`.

---

## 6. Yêu thích

Chỉ sinh viên. Các thao tác **idempotent**.

| Endpoint | Mô tả |
|---|---|
| `GET /favorites` | Danh sách tin đã lưu (`listing_summary`), mới nhất trước, phân trang. Tin đã bị ẩn/xóa vẫn có trong danh sách với `status` tương ứng |
| `PUT /favorites/{listing_id}` | Thêm yêu thích. Gọi nhiều lần không lỗi, không tạo trùng. `200`, `data: { "listing_id": 101, "is_favorited": true, "favorites_count": 13 }` |
| `DELETE /favorites/{listing_id}` | Bỏ yêu thích. Gọi khi chưa lưu vẫn `200`. `data: { "listing_id": 101, "is_favorited": false, "favorites_count": 12 }` |

`404` nếu `listing_id` không tồn tại hoặc không phải tin công khai (khi thêm mới).

---

## 7. Nhắn tin

Nhắn tin theo cơ chế **polling** (FE gọi lại mỗi 3 đến 5 giây khi mở hội thoại, 15 giây cho danh sách hội thoại). Hợp đồng được thiết kế để sau này chuyển sang WebSocket mà không đổi cấu trúc dữ liệu.

**Quyền:** chỉ sinh viên tạo hội thoại. Chỉ 2 thành viên của hội thoại mới đọc và gửi. Người ngoài nhận `404`.

### 7.1 Đối tượng

**`conversation`**

```json
{
  "id": 33,
  "listing": { "id": 101, "title": "Phòng trọ gần ĐHQG", "cover_image_url": "...", "price_monthly": 2500000, "status": "published" },
  "counterpart": { "id": 5, "name": "Trần Thị B", "avatar_url": null, "role": "landlord" },
  "last_message": { "id": 900, "type": "text", "body_preview": "Phòng còn trống không ạ?", "sender_id": 12, "created_at": "..." },
  "unread_count": 2,
  "last_message_at": "2026-09-20T08:30:00Z"
}
```

**`message`**

```json
{
  "id": 901, "conversation_id": 33, "sender_id": 12, "is_mine": true,
  "type": "text", "body": "Phòng còn trống không ạ?",
  "attachments": [
    { "id": 7, "original_name": "hop-dong-mau.pdf", "mime_type": "application/pdf", "size_bytes": 182340, "download_url": "https://.../api/v1/attachments/7/download" }
  ],
  "created_at": "2026-09-20T08:30:00Z"
}
```

### 7.2 `POST /conversations` (sinh viên)

Body `{ "listing_id": 101 }`. Nếu đã có hội thoại (cùng tin và sinh viên) thì trả hội thoại đó `200`, ngược lại tạo mới `201`. Chỉ áp dụng cho tin `published` hoặc `rented`. Chủ nhà không thể nhắn cho chính tin của mình (`403`). **Response:** `conversation`.

### 7.3 `GET /conversations`

Danh sách hội thoại của người dùng, sắp xếp theo `last_message_at` giảm dần, phân trang kiểu trang.

### 7.4 `GET /conversations/unread-count`

`data: { "unread_count": 5 }` là tổng số tin chưa đọc, dùng cho biểu tượng trên thanh điều hướng.

### 7.5 `GET /conversations/{id}/messages`

Phân trang kiểu **con trỏ theo `id`** (tăng đơn điệu):

| Tham số | Ý nghĩa |
|---|---|
| `after_id` | Lấy tin mới hơn id này, sắp xếp tăng dần. Dùng cho polling |
| `before_id` | Lấy tin cũ hơn id này, để tải lịch sử khi cuộn lên |
| `limit` | Mặc định 30, tối đa 100 |

Không truyền cả hai thì lấy `limit` tin mới nhất (trả theo thứ tự tăng dần). `meta`: `{ "has_more_older": true }`.

### 7.6 `POST /conversations/{id}/messages`

Gửi tin nhắn (cần email đã xác thực nếu bật cờ).

- **Chỉ văn bản:** `application/json`, body `{ "body": "..." }`.
- **Có tệp:** `multipart/form-data`, trường `body` (tùy chọn) và `files[]`.

| Quy tắc | Giá trị |
|---|---|
| `body` | Tối đa 2000 ký tự, bắt buộc nếu không có tệp |
| Tệp | Tối đa 5 tệp/tin nhắn, mỗi tệp tối đa 10 MB |
| Loại cho phép | `pdf`, `jpg`, `jpeg`, `png`, `webp`, `docx`. Kiểm tra MIME thực từ nội dung |

**Response 201:** `message`. Cập nhật `last_message_at` và đánh dấu đã đọc cho người gửi.
**Lỗi:** `413 FILE_TOO_LARGE`, `422 VALIDATION_ERROR`, `429`.

### 7.7 `POST /conversations/{id}/read`

Đánh dấu đã đọc toàn bộ tin đến thời điểm hiện tại. `data: { "unread_count": 0 }`. FE gọi khi mở hội thoại.

### 7.8 `GET /attachments/{id}/download`

Kiểm tra người gọi là thành viên hội thoại rồi stream tệp từ disk riêng tư kèm `Content-Disposition`. Tệp không có URL công khai.

---

## 8. Thuê nhà (Tenancies)

Ghi nhận việc thuê, là điều kiện để đánh giá. Luồng trạng thái xem `ERD.md` mục 4.2.

**`tenancy`**

```json
{
  "id": 8, "status": "pending",
  "listing": { "id": 101, "title": "Phòng trọ gần ĐHQG" },
  "student": { "id": 12, "name": "Nguyễn Văn A" },
  "landlord": { "id": 5, "name": "Trần Thị B" },
  "start_date": "2026-10-01", "end_date": null, "confirmed_at": null,
  "has_review": false,
  "created_at": "2026-09-20T09:00:00Z"
}
```

| Endpoint | Ai | Mô tả |
|---|---|---|
| `POST /tenancies` | Sinh viên | Body `{ "listing_id": 101, "start_date": "2026-10-01" }`. Cần đã có hội thoại với chủ nhà về tin này (nếu không: `403 FORBIDDEN`). Trùng bản ghi `pending`/`confirmed` cho cùng tin: `409 CONFLICT`. Response `201` |
| `GET /tenancies` | Sinh viên, chủ nhà | Của chính mình (sinh viên) hoặc của các tin do mình sở hữu (chủ nhà). Query: `status`, `page` |
| `POST /tenancies/{id}/confirm` | Chủ nhà của tin | `pending → confirmed`. Không tự đổi trạng thái tin |
| `POST /tenancies/{id}/cancel` | Sinh viên (khi `pending`) hoặc chủ nhà (từ chối khi `pending`, hủy khi `confirmed`) | Chuyển sang `cancelled` |
| `POST /tenancies/{id}/end` | Sinh viên hoặc chủ nhà | `confirmed → ended`. Body tùy chọn `{ "end_date": "..." }` (mặc định hôm nay) |

Chuyển trạng thái sai luồng: `409 INVALID_STATUS_TRANSITION`. Không phải bên liên quan: `404`.

---

## 9. Đánh giá

Mỗi lần thuê có tối đa **một** đánh giá gồm 3 phần: nhà, chủ nhà, khu vực.

**`review`**

```json
{
  "id": 21,
  "reviewer": { "id": 12, "name": "Nguyễn Văn A", "avatar_url": null },
  "listing_id": 101, "district_id": 1,
  "listing_rating": 4, "listing_comment": "Phòng sạch, thoáng.",
  "landlord_rating": 5, "landlord_comment": "Chủ nhà nhiệt tình.",
  "area_rating": 4, "area_comment": "Gần chợ và trường.",
  "landlord_reply": "Cảm ơn bạn!", "landlord_replied_at": "2026-09-22T05:00:00Z",
  "created_at": "2026-09-21T10:00:00Z"
}
```

### 9.1 `POST /tenancies/{tenancy_id}/review` (sinh viên)

| Trường | Kiểu | Bắt buộc | Quy tắc |
|---|---|---|---|
| listing_rating, landlord_rating, area_rating | int | có | 1 đến 5 |
| listing_comment, landlord_comment, area_comment | string | không | Tối đa 1000 ký tự, escape HTML |

Điều kiện: người gọi là `student` của tenancy, `status` là `confirmed` hoặc `ended`.
**Lỗi:** `403 TENANCY_NOT_ELIGIBLE`, `409 REVIEW_ALREADY_EXISTS`, `422`, `429`.
**Response 201:** `review`. Sau khi lưu, đẩy job `UpdateRatingAggregates` và xóa cache tag `listings`.

### 9.2 Xem đánh giá (công khai)

Phân trang kiểu trang, mới nhất trước, chỉ trả review `is_hidden = false`. Ba endpoint trả cùng mảng `review`:

| Endpoint | Ý nghĩa |
|---|---|
| `GET /listings/{id}/reviews` | Đánh giá của một tin |
| `GET /landlords/{id}/reviews` | Đánh giá của một chủ nhà |
| `GET /districts/{id}/reviews` | Đánh giá của một khu vực |

`meta` mở rộng: `{ ..., "summary": { "avg_rating": 4.3, "reviews_count": 7, "distribution": { "1": 0, "2": 0, "3": 1, "4": 3, "5": 3 } } }`. `distribution` tính theo loại rating tương ứng với endpoint (listing, landlord hoặc area).

### 9.3 `POST /reviews/{id}/reply` (chủ nhà)

Chủ nhà của review phản hồi một lần. Body `{ "reply": "..." }` (tối đa 1000 ký tự). Đã phản hồi rồi: `409 CONFLICT`. **Response 200:** `review`.

### 9.4 Kiểm duyệt (admin)

`PATCH /admin/reviews/{id}` body `{ "is_hidden": true }`. Sau khi đổi, chạy lại job tổng hợp điểm.

### 9.5 Phạm vi Admin ở phiên bản này

Chỉ gồm: ẩn/hiện review (9.4) và ẩn tin đăng vi phạm bằng `PATCH /admin/listings/{id}/status` (chỉ chuyển sang `hidden`). Khóa tài khoản qua `PATCH /admin/users/{id}` body `{ "is_active": false }`. Các tính năng báo cáo vi phạm, dashboard nằm ngoài phạm vi.

---

## 10. Tính năng AI (Frontend ↔ Backend)

**Nguyên tắc cho mọi endpoint AI:**

1. Frontend chỉ gọi các endpoint dưới đây. Backend gọi AI Service (mục 11). Frontend **không bao giờ** gọi AI trực tiếp.
2. Cần đăng nhập, tuân theo giới hạn tần suất mục 1.6.
3. Mọi response AI đều có `meta.source`: `"ai"` (từ AI Service) hoặc `"fallback"` (Backend tự tính khi AI lỗi, nếu tính năng hỗ trợ dự phòng), và `meta.generated_at`.
4. Kết quả AI là **gợi ý tham khảo**. FE cần hiển thị nhãn rõ ràng như vậy.
5. Lỗi AI: `502 AI_BAD_RESPONSE`, `503 AI_UNAVAILABLE`, `504 AI_TIMEOUT`.

### 10.1 `POST /ai/roommates` (sinh viên)

Gợi ý bạn cùng phòng.

**Body:** `{ "listing_id": 101, "limit": 10 }`. Cả hai tùy chọn (`limit` mặc định 10, tối đa 20, `listing_id` để ngữ cảnh hóa theo tin).

**Điều kiện:** hồ sơ đủ điều kiện và `matching_opt_in = true`, nếu không: `422 PROFILE_INCOMPLETE` với `details` nêu các trường còn thiếu.

**Response 200**

```json
{ "success": true,
  "data": { "candidates": [
    { "user_id": 45, "name": "Lê Văn C", "avatar_url": null,
      "school": "ĐHQG TP.HCM", "year_of_study": 2,
      "score": 87.5,
      "reasons": ["Cùng thói quen sinh hoạt bình thường", "Cả hai đều thích yên tĩnh"],
      "common_interests": ["music", "reading"],
      "conversation_hint": "Cùng ngân sách 2 đến 3 triệu" } ] },
  "meta": { "source": "ai", "generated_at": "2026-09-20T08:30:00Z", "cached": false }
}
```

Backend chọn tập ứng viên trước khi gọi AI (ví dụ: `matching_opt_in = true`, khác người yêu cầu, khoảng ngân sách giao nhau, thỏa `roommate_gender_preference` hai chiều, tối đa 100 ứng viên). Không có phương án `fallback`, khi AI lỗi trả lỗi AI. Kết quả cache 1 giờ. Điểm `score` trong khoảng 0 đến 100, danh sách sắp xếp giảm dần.

### 10.2 `POST /ai/price-suggestion` (sinh viên)

**Body:** `{ "listing_id": 101 }`.

```json
{ "success": true,
  "data": {
    "listing_price": 2500000,
    "fair_price": 2300000,
    "fair_range": { "min": 2100000, "max": 2500000 },
    "verdict": "above_market",
    "confidence": 0.78,
    "market_sample_size": 24,
    "reasoning": ["Giá trung vị các phòng tương tự trong khu vực là 2,3 triệu", "Phòng có gác và điều hòa nên cao hơn mức nền"],
    "negotiation_tips": ["Đề xuất thuê từ 6 tháng để xin giảm giá"],
    "suggested_message": "Chào anh/chị, em thấy mức giá 2,5 triệu hơi cao so với khu vực..."
  },
  "meta": { "source": "ai", "generated_at": "..." } }
```

`verdict` thuộc `above_market`, `fair`, `below_market`. `confidence` từ 0 đến 1. Backend tạo tập so sánh (`comparables`) từ các tin cùng khu vực và loại hình, diện tích chênh không quá 40%, còn hiển thị hoặc mới `rented` trong 180 ngày, tối đa 50 tin, không tính chính tin đang xét.

**Dự phòng:** nếu AI lỗi mà `market_sample_size >= 5`, Backend tự trả `fair_range` = phân vị 25 đến 75 của tập so sánh, `verdict` suy ra từ vị trí của giá, `reasoning` là câu chuẩn bị sẵn, `negotiation_tips` và `suggested_message` là `null`, `meta.source = "fallback"`. Nếu mẫu dưới 5 thì trả lỗi AI.

### 10.3 `POST /ai/area-recommendations` (sinh viên)

**Body** (mọi trường tùy chọn, thiếu thì lấy từ hồ sơ):

```json
{ "budget_min": 1500000, "budget_max": 3000000, "school_id": 1,
  "priorities": ["cheap", "near_school", "quiet", "convenient"], "limit": 5 }
```

`priorities` chọn từ `cheap`, `near_school`, `quiet`, `safe`, `convenient`, `well_rated`.

```json
{ "success": true,
  "data": { "areas": [
    { "district_id": 1, "name": "Thủ Đức", "score": 91.2,
      "reasons": ["Giá trung vị 2,3 triệu nằm trong ngân sách", "Trung bình 1,2 km tới trường"],
      "stats": { "listings_count": 41, "median_price": 2300000, "avg_distance_to_school_km": 1.2, "avg_rating": 4.2 } } ] },
  "meta": { "source": "ai", "generated_at": "..." } }
```

Nếu thiếu cả tham số lẫn hồ sơ (không có ngân sách): `422 PROFILE_INCOMPLETE`.
**Dự phòng:** Backend xếp hạng bằng công thức điểm có trọng số từ `stats` theo `priorities`, `meta.source = "fallback"`, `reasons` là câu chuẩn bị sẵn.

### 10.4 `POST /ai/chatbot` (sinh viên, chủ nhà)

**Body**

| Trường | Bắt buộc | Ghi chú |
|---|---|---|
| message | có | 1 đến 1000 ký tự |
| session_id | không | UUID. Không gửi thì Backend tạo phiên mới |
| listing_id | không | Ngữ cảnh: đang hỏi về tin này |
| district_id | không | Ngữ cảnh: đang hỏi về khu vực này |

```json
{ "success": true,
  "data": {
    "session_id": "6f0d0c1a-5e0e-4b63-8f0a-1c2b3d4e5f60",
    "reply": "Theo thông tin tin đăng, phòng đã bao gồm wifi. Tiền điện tính 3.500đ/kWh...",
    "sources": [ { "type": "listing", "title": "Phòng trọ gần ĐHQG" }, { "type": "contract_template", "title": "Mẫu hợp đồng thuê phòng" } ],
    "suggested_questions": ["Tiền cọc được hoàn lại khi nào?", "Có được nuôi thú cưng không?"] },
  "meta": { "source": "ai", "generated_at": "..." } }
```

Backend giữ lịch sử phiên trong Redis (`ai:chat:{session_id}`, 20 lượt gần nhất, hết hạn sau 2 giờ) và gửi kèm cho AI. Backend cũng chọn tối đa 3 bài `knowledge_articles` liên quan cộng dữ liệu tin/khu vực làm ngữ cảnh. Phiên thuộc về người tạo, dùng `session_id` của người khác: `404`.

Câu trả lời liên quan hợp đồng phải kèm nội dung cảnh báo "thông tin tham khảo, không phải tư vấn pháp lý" do AI Service trả về hoặc Backend gắn thêm. Không có phương án dự phòng.

`DELETE /ai/chatbot/sessions/{session_id}` xóa lịch sử phiên. `200`.

### 10.5 Tạo mô tả tự động (chủ nhà, bất đồng bộ)

Luồng FE: tạo tin `draft` → upload ảnh (5.9) → gọi endpoint dưới → polling trạng thái job → điền vào ô mô tả để chủ nhà chỉnh sửa → lưu bằng `PUT /listings/{id}`.

**`POST /ai/listing-description`**

Body: `{ "listing_id": 101, "tone": "friendly" }` (`tone`: `friendly` hoặc `professional`, mặc định `friendly`).
Điều kiện: chủ tin, tin có ít nhất 1 ảnh, không có job cùng tin đang `pending` hoặc `processing` (nếu có: `409 CONFLICT` kèm `job_id` hiện tại trong `details`).

**Response 202**

```json
{ "success": true, "data": { "job_id": "0e5e0c62-....", "status": "pending" } }
```

**`GET /ai/jobs/{job_id}`** (chỉ người tạo job, còn lại `404`)

```json
{ "success": true, "data": {
  "job_id": "0e5e0c62-....", "type": "listing_description", "status": "done",
  "result": {
    "description": "Phòng trọ thoáng mát, có gác lửng, cách ĐHQG chỉ 850m...",
    "suggested_title": "Phòng trọ có gác gần ĐHQG, đầy đủ tiện nghi",
    "highlights": ["Có gác lửng", "Gần trường"],
    "detected_amenities": ["air_conditioner", "wifi"]
  },
  "error": null,
  "created_at": "...", "finished_at": "..." } }
```

- `status = failed` thì `result = null`, `error = { "code": "AI_TIMEOUT", "message": "..." }`.
- `detected_amenities` chỉ là **gợi ý**, không tự gán vào tin. FE hỏi chủ nhà có muốn thêm không.
- Tin sẽ được đánh dấu `description_source = "ai_draft"` khi chủ nhà lưu mô tả có nguồn từ AI (FE gửi cờ `description_source` trong `PUT /listings/{id}`).
- FE polling mỗi 2 đến 3 giây, tối đa 60 giây. Quá thời gian thì báo lỗi và cho thử lại.

---

## 11. Hợp đồng nội bộ Backend ↔ AI Service

Chỉ Backend gọi. AI Service **không** truy cập PostgreSQL. Mọi dữ liệu cần thiết đều nằm trong request.

### 11.1 Quy ước

| Mục | Giá trị |
|---|---|
| Base URL | `http://ai-service:8000/internal/v1` |
| Xác thực | Header `X-Internal-Token` bằng biến `AI_SERVICE_TOKEN` (cùng giá trị ở hai phía). Sai token: `401` |
| Truy vết | Header `X-Request-ID` được chuyển tiếp từ Backend |
| Timeout Backend | Roommate, price, area: 10 giây. Chatbot: 30 giây. Mô tả từ ảnh: 90 giây |
| Retry | Tối đa 1 lần cho lỗi mạng hoặc `5xx` với các endpoint đọc (roommate, price, area). Chatbot và mô tả không retry trong request, job mô tả retry qua queue tối đa 2 lần |
| Dữ liệu cá nhân | Chỉ gửi trường cần cho tính toán. **Không** gửi email, số điện thoại, tên đầy đủ, avatar |
| Định danh ứng viên | Trường `ref` là chuỗi `u_{user_id}`, AI chỉ trả lại `ref` |

**Cấu trúc lỗi từ AI Service:**

```json
{ "error": { "code": "MODEL_ERROR", "message": "..." } }
```

Backend ánh xạ: lỗi mạng/`5xx` sang `AI_UNAVAILABLE`, quá timeout sang `AI_TIMEOUT`, JSON sai schema sang `AI_BAD_RESPONSE`.

### 11.2 `GET /health`

```json
{ "status": "ok", "model_version": "v1.0.0", "uptime_seconds": 1234 }
```

Không cần token. Dùng cho healthcheck Docker.

### 11.3 `POST /roommate-matching`

**Request**

```json
{
  "requester": {
    "ref": "u_12",
    "gender": "male", "year_of_study": 3, "school_id": 1,
    "budget_min": 1500000, "budget_max": 3000000,
    "preferred_district_ids": [1, 3],
    "lifestyle": { "sleep_schedule": "normal", "cleanliness": 4, "noise_tolerance": 2, "smoking": "never", "guests_frequency": "sometimes", "cooking": "often", "pets": false, "personality": "introvert", "study_place": "home" },
    "interests": ["music", "gym"]
  },
  "candidates": [ { "ref": "u_45", "...": "cùng cấu trúc với requester" } ],
  "listing_context": { "price_monthly": 2500000, "district_id": 1, "max_occupants": 2 },
  "limit": 10
}
```

`listing_context` có thể `null`.

**Response 200**

```json
{ "results": [ { "ref": "u_45", "score": 87.5, "reasons": ["..."], "common_interests": ["music"] } ], "model_version": "v1.0.0" }
```

Kết quả sắp xếp giảm dần theo `score` (0 đến 100), tối đa `limit` phần tử, `reasons` bằng tiếng Việt.

### 11.4 `POST /price-suggestion`

**Request**

```json
{
  "listing": {
    "property_type": "room", "price_monthly": 2500000, "area_m2": 22.5,
    "district_id": 1, "max_occupants": 2,
    "amenities": ["wifi", "air_conditioner"],
    "nearest_school_distance_km": 0.85, "avg_rating": 4.3, "age_days": 20
  },
  "comparables": [
    { "property_type": "room", "price_monthly": 2200000, "area_m2": 20.0, "district_id": 1,
      "amenities": ["wifi"], "nearest_school_distance_km": 1.5, "status": "rented" }
  ],
  "market_stats": { "count": 24, "median_price": 2300000, "p25": 2100000, "p75": 2500000 }
}
```

**Response 200**

```json
{
  "fair_price": 2300000,
  "fair_range": { "min": 2100000, "max": 2500000 },
  "verdict": "above_market",
  "confidence": 0.78,
  "reasoning": ["..."],
  "negotiation_tips": ["..."],
  "suggested_message": "...",
  "model_version": "v1.0.0"
}
```

### 11.5 `POST /area-recommendation`

**Request**

```json
{
  "preferences": {
    "budget_min": 1500000, "budget_max": 3000000, "school_id": 1,
    "priorities": ["cheap", "near_school"],
    "lifestyle": { "noise_tolerance": 2, "personality": "introvert" }
  },
  "areas": [
    { "district_id": 1, "name": "Thủ Đức", "listings_count": 41, "median_price": 2300000,
      "avg_distance_to_school_km": 1.2, "avg_rating": 4.2, "reviews_count": 35 }
  ],
  "limit": 5
}
```

**Response 200**

```json
{ "results": [ { "district_id": 1, "score": 91.2, "reasons": ["..."] } ], "model_version": "v1.0.0" }
```

### 11.6 `POST /chatbot`

**Request**

```json
{
  "message": "Tiền cọc được hoàn lại khi nào?",
  "history": [ { "role": "user", "content": "..." }, { "role": "assistant", "content": "..." } ],
  "context": {
    "listing": { "title": "...", "price_monthly": 2500000, "deposit_amount": 2500000, "electricity_price": 3500, "water_price": 20000, "amenities": ["wifi"], "address_line": "...", "description": "..." },
    "district": { "name": "Thủ Đức", "median_price": 2300000, "avg_rating": 4.2 },
    "knowledge": [ { "type": "contract_template", "title": "Mẫu hợp đồng thuê phòng", "content": "..." } ]
  }
}
```

`history` tối đa 20 phần tử. `listing`, `district` có thể `null`. `knowledge` tối đa 3 phần tử.

**Response 200**

```json
{
  "reply": "...",
  "sources": [ { "type": "contract_template", "title": "Mẫu hợp đồng thuê phòng" } ],
  "suggested_questions": ["..."],
  "model_version": "v1.0.0"
}
```

### 11.7 `POST /listing-description`

**Request**

```json
{
  "tone": "friendly", "language": "vi",
  "facts": {
    "title": "Phòng trọ gần ĐHQG", "property_type": "room", "price_monthly": 2500000,
    "area_m2": 22.5, "max_occupants": 2, "address_line": "...", "district_name": "Thủ Đức",
    "amenities": ["wifi", "air_conditioner"],
    "nearby_schools": [ { "name": "ĐHQG TP.HCM", "distance_km": 0.85 } ]
  },
  "images": [ { "mime_type": "image/jpeg", "data_base64": "..." } ]
}
```

Backend gửi tối đa **6 ảnh**, đã thu nhỏ về cạnh dài tối đa 1024px, định dạng JPEG, mã hóa base64. Cách này tránh phải mount chung volume ảnh giữa hai container.

**Response 200**

```json
{
  "description": "...",
  "suggested_title": "...",
  "highlights": ["..."],
  "detected_amenities": ["air_conditioner"],
  "model_version": "v1.0.0"
}
```

`detected_amenities` chỉ chứa `code` nằm trong danh sách tiện ích của hệ thống (mục 2.3).

---

## 12. Hướng dẫn triển khai cho Backend

Phần này dành cho người (hoặc AI) build Backend.

### 12.1 Công nghệ và quy ước code

1. PHP 8.2, Laravel 11, PostgreSQL 15, Redis 7, Laravel Sanctum (chế độ SPA), PHPUnit.
2. Theo cấu trúc thư mục trong `project-tree.md`: `app/Http/Controllers/Api/V1`, `app/Http/Requests`, `app/Http/Resources`, `app/Services`, `app/Http/Clients/AIServiceClient.php`, `app/Jobs`, `app/Models`, `app/Enums`, `app/Policies`.
3. **Controller mỏng**: chỉ nhận request, gọi Service, trả Resource. Logic nghiệp vụ nằm trong Service.
4. Mỗi endpoint có một `FormRequest` để validate, một `JsonResource` để định dạng response, một `Policy` cho phân quyền.
5. Tất cả response thành công và lỗi đi qua một lớp thống nhất (trait `ApiResponse` hoặc macro `response()->success()`), cùng `Handler` xử lý exception để sinh đúng cấu trúc ở mục 1.4 và mã lỗi ở mục 1.5.
6. Tránh N+1 bằng eager loading. Mọi danh sách đều phân trang.
7. Route đặt trong `routes/api.php`, nhóm `Route::prefix('v1')`. Route `/sanctum/csrf-cookie` do Sanctum cung cấp.

### 12.2 Thứ tự làm đề xuất

| Bước | Nội dung | Endpoint / Việc |
|---|---|---|
| 1 | Nền tảng | Project, Docker, `.env.example`, lớp response và exception handler, CORS, Sanctum, migrations theo `ERD.md` mục 6 |
| 2 | Dữ liệu mẫu | Seeder, Factory theo `ERD.md` mục 7, mục 2 (districts, schools, amenities) |
| 3 | Xác thực | Mục 3, rate limit, verify email |
| 4 | Hồ sơ | Mục 4 |
| 5 | Duyệt nhà | 5.2, 5.3, 5.4, job tính khoảng cách, cache Redis |
| 6 | Quản lý tin | 5.5 đến 5.10, upload ảnh, job thumbnail |
| 7 | Yêu thích | Mục 6 |
| 8 | Nhắn tin | Mục 7 |
| 9 | Thuê nhà và đánh giá | Mục 8, 9, job tổng hợp điểm |
| 10 | Tích hợp AI | `AIServiceClient` (kèm chế độ mock), mục 10, bảng `ai_jobs`, job mô tả |
| 11 | Hoàn thiện | Rà soát bảo mật, tối ưu, Supervisor, tài liệu |

### 12.3 Chế độ mock cho AI Service

Biến môi trường `AI_SERVICE_MOCK=true` khiến `AIServiceClient` trả dữ liệu giả **đúng cấu trúc** mục 11 mà không gọi mạng. Nhờ vậy Frontend dựng giao diện AI song song trong lúc AI Engineer chưa xong. Khi tắt cờ, client gọi AI Service thật.

### 12.4 Tiêu chí hoàn thành cho mỗi endpoint (Definition of Done)

1. Khớp chính xác đường dẫn, phương thức, tên trường, kiểu dữ liệu và mã lỗi trong tài liệu này.
2. Có `FormRequest` validate đúng quy tắc và trả thông báo tiếng Việt.
3. Có kiểm tra quyền bằng Policy/Middleware, người không có quyền nhận đúng `403` hoặc `404`.
4. Có test PHPUnit (Feature test) cho: luồng thành công, lỗi validation, chưa đăng nhập, sai quyền.
5. Không có N+1 (kiểm tra bằng `preventLazyLoading` ở môi trường dev).
6. Lỗi nội bộ không lộ stack trace, `request_id` có mặt trong mọi response lỗi.

### 12.5 Cấu hình môi trường Backend (`.env.example`)

```
APP_ENV=local
APP_URL=http://localhost
FRONTEND_URL=http://localhost
DB_CONNECTION=pgsql
DB_HOST=postgres
DB_PORT=5432
DB_DATABASE=rental_house
DB_USERNAME=
DB_PASSWORD=
REDIS_HOST=redis
CACHE_STORE=redis
SESSION_DRIVER=redis
QUEUE_CONNECTION=redis
SESSION_DOMAIN=localhost
SANCTUM_STATEFUL_DOMAINS=localhost
REQUIRE_EMAIL_VERIFICATION=false
FILESYSTEM_DISK=public
AI_SERVICE_URL=http://ai-service:8000/internal/v1
AI_SERVICE_TOKEN=
AI_SERVICE_MOCK=true
SEED_CITY="TP. Hồ Chí Minh"
```

Không commit giá trị thật của `DB_PASSWORD`, `AI_SERVICE_TOKEN`.

---

## 13. Changelog

| Phiên bản | Ngày | Thay đổi |
|---|---|---|
| 1.0.0 | 2026-09-20 | Bản nháp đầu tiên: auth, hồ sơ, listings, yêu thích, chat (polling), thuê nhà, đánh giá, 5 tính năng AI, hợp đồng nội bộ Backend ↔ AI |

**Quy trình đổi contract:** người đề xuất cập nhật file này, ghi vào Changelog, tăng phiên bản (thay đổi phá vỡ tương thích thì tăng số đầu), thông báo cả nhóm và chờ xác nhận từ bên bị ảnh hưởng trước khi merge.
