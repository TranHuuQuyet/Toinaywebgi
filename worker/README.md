# Hướng dẫn Triển khai Cloudflare Worker & D1 (Backend V2.2)

Dự án sử dụng Cloudflare Worker kết hợp cơ sở dữ liệu Cloudflare D1 Serverless SQL để lưu trữ bộ đếm mở hòm dùng chung (Global Counter) cho tất cả người truy cập trên toàn cầu.

## 1. Cài đặt công cụ
Cài đặt Wrangler CLI (công cụ dòng lệnh của Cloudflare):
```bash
npm install -g wrangler
```
Đăng nhập tài khoản Cloudflare:
```bash
wrangler login
```

## 2. Tạo Cơ sở dữ liệu Cloudflare D1
Tại thư mục gốc của repository, chạy lệnh:
```bash
wrangler d1 create toinaywebgi-db
```
Lệnh trên sẽ in ra thông tin cấu hình cơ sở dữ liệu, ví dụ:
```toml
[[d1_databases]]
binding = "DB"
database_name = "toinaywebgi-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

## 3. Khởi tạo Bảng dữ liệu (Schema)
Chạy lệnh thực thi file `worker/schema.sql` trên cơ sở dữ liệu D1 (cả local và remote):
```bash
# Thực thi trên Cloudflare cloud:
wrangler d1 execute toinaywebgi-db --remote --file=./worker/schema.sql
```

## 4. Cấu hình Wrangler
1. Copy file `worker/wrangler.toml.example` thành `worker/wrangler.toml`:
   ```bash
   cp worker/wrangler.toml.example worker/wrangler.toml
   ```
2. Mở file `worker/wrangler.toml` và điền `database_id` thu được từ Bước 2.

## 5. Triển khai Worker
Di chuyển vào thư mục `worker` và deploy:
```bash
cd worker
wrangler deploy
```
Sau khi triển khai thành công, Wrangler sẽ cấp cho bạn một URL, ví dụ:
```text
https://toinaywebgi-counter.<your-subdomain>.workers.dev
```

## 6. Kết nối Frontend với Worker
Mở file `js/config.js` trong thư mục gốc và cập nhật hằng số `API_BASE_URL`:
```javascript
export const API_BASE_URL = 'https://toinaywebgi-counter.<your-subdomain>.workers.dev';
```
Commit và push lên GitHub để GitHub Pages tự động cập nhật và hiển thị số đếm thật!

