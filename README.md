# Tối nay web gì? — V2.3

Mini game mở hòm và sưu tập 50 vật phẩm, viết bằng HTML, CSS và JavaScript thuần. V2.3 tổ chức toàn bộ trải nghiệm trong một game shell cố định, ưu tiên cảm giác nhanh, gọn và rõ như một game inventory thực thụ.

Dự án chỉ lưu metadata an toàn và logo cục bộ. Không item nào chứa URL đích và không có liên kết ra website nội dung người lớn.

## Game shell

Giao diện có ba màn hình, chuyển tại chỗ trong khoảng 150–250 ms:

- **CASE** — màn hình mặc định, gồm hòm vật lý, roulette, nút mở hòm, bộ đếm toàn cục và recent drop.
- **COLLECTION** — inventory 50 slot theo thứ tự cố định; slot khóa hiển thị `? / UNKNOWN`, slot đã mở chỉ dẫn tới trang 404 nội bộ.
- **INFO** — hướng dẫn, tỷ lệ rarity, thông tin lưu trữ/quyền sở hữu và các thao tác reset.

HUD trên cùng hiển thị tiến độ, âm thanh và GitHub stars. Thanh điều hướng dưới cùng luôn nằm trong viewport, hỗ trợ click, bàn phím mũi tên, Home/End, safe area trên thiết bị di động và trạng thái `aria-selected`.

## Luật mở hòm

- Dataset có đúng 50 item, không trùng ID và không đổi thứ tự collection.
- Winner được chọn trước bằng weighted random; roulette chỉ trình diễn kết quả đó.
- Tỷ lệ gốc: Common 45%, Uncommon 25%, Rare 15%, Epic 9%, Legendary 5%, Mythic 1%.
- Tier đã hết item được loại khỏi pool; trọng số được phân phối lại cho các tier còn lại.
- Một item đã mở không thể xuất hiện lần hai.
- Roulette dùng một đường cong giảm tốc quartic liên tục: 5,4 giây desktop, 5,1 giây mobile và 520 ms khi bật reduced motion.
- Epic, Legendary và Mythic có reveal tăng dần; Legendary/Mythic dùng reward screen toàn màn hình. Nút Continue xuất hiện sau lần lượt 400/600/800 ms.

Canvas particle engine, âm thanh cơ học local và hiệu ứng hòm đều tôn trọng `prefers-reduced-motion`. Particle loop được dọn khi đóng reward screen.

## Lưu trữ cục bộ

`js/storage.js` quản lý:

- xác nhận Age Gate;
- danh sách item đã mở;
- trạng thái Sound On/Off;
- recent drop.

Nếu `localStorage` không khả dụng, game dùng bộ nhớ trong session hiện tại. Reset Collection chỉ xóa tiến độ collection; Reset Age yêu cầu xác nhận tuổi lại.

## Backend và GitHub stars

Cloudflare Worker trong `worker/` cung cấp:

- `GET /stats` — tổng số lượt mở;
- `POST /open-case` — tăng bộ đếm nguyên tử trong D1;
- `GET /github-stars` — stars của repository với cache;
- CORS allowlist và rate limit 2 lượt mở / 10 giây / IP.

Frontend vẫn hoạt động đầy đủ khi backend chưa cấu hình. `API_BASE_URL` hiện để trống trong `js/config.js`, vì vậy repository này **chưa khai báo một Worker production đã deploy**. Sau khi tự deploy Worker theo `worker/README.md`, điền URL thật vào hằng số đó.

## Chạy local

ES modules cần một HTTP server:

```bash
npx serve .
```

Hoặc dùng bất kỳ static server nào và mở `index.html` qua HTTP.

## Kiểm thử

Chạy unit/integration/static suite:

```bash
npm test
```

Suite kiểm tra dataset, trọng số, không trùng, exhaustion redistribution, predetermined winner, đường cong roulette, persistence fallback, URL audit, cấu trúc game shell và Worker.

Browser smoke test dùng Chrome DevTools Protocol tại cổng 9222:

```bash
chrome --remote-debugging-port=9222 --headless --disable-gpu http://127.0.0.1:4173/index.html
npm run test:browser
```

Smoke test đi qua Age Gate, ba màn hình, sound persistence, nhiều lượt roulette đủ thời lượng, Common/Epic/Legendary/Mythic reveal, điểm dừng winner, inventory, 360/390/430/1366/1440 px, debug mode, 404 và console errors.

## Debug mode

Mở `index.html?debug=true` để hiện bảng thử nghiệm:

- ép một item chưa mở ở từng rarity;
- thử âm thanh Legendary;
- reset dữ liệu local.

Các lượt debug không gọi endpoint tăng global counter.

## Cấu trúc chính

```text
index.html                 Game shell và các overlay
404.html                   Trang 404 nội bộ / Access Denied
css/style.css              Visual system, shell, inventory, result screens
js/app.js                  State UI và game controller
js/data.js                 Dataset 50 item và rarity config
js/random.js               Weighted random, no-duplicate logic
js/roulette.js             Strip, landing và continuous deceleration
js/collection.js           Renderer inventory cố định
js/storage.js              Local persistence và memory fallback
js/sound.js                SoundManager và audio preload
js/particles.js            Canvas reveal engine
js/config.js               API và GitHub configuration
worker/                    Cloudflare Worker + D1 schema
tests/                     Node tests và CDP browser smoke test
```

## Triển khai

Frontend tương thích GitHub Pages vì mọi asset/navigation path nội bộ đều là relative path. Để triển khai:

1. Push nhánh cần phát hành lên GitHub.
2. Trong **Settings → Pages**, chọn **Deploy from a branch**.
3. Chọn branch và thư mục `/ (root)`.

Backend không được deploy tự động từ repository này. Làm theo `worker/README.md`, tạo D1 database, áp dụng `worker/schema.sql`, cấu hình `wrangler.toml`, deploy Worker, rồi cập nhật `API_BASE_URL`.

## Ghi chú nội dung

Đây là mini game parody độc lập. Tên thương hiệu thuộc về chủ sở hữu tương ứng. Dự án không lưu, phát hoặc liên kết tới nội dung explicit; click item đã mở luôn dẫn tới `404.html` trong cùng project.
