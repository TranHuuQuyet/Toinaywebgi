# Tối nay web gì? — Version 2.2

Một mini case-opening game lấy cảm hứng từ trải nghiệm mở hòm CS2 nhưng mang giao diện Dark Game UI độc lập và tối giản. Game chọn ngẫu nhiên một trong 50 thương hiệu website 18+ để người chơi sưu tập vào album; project chỉ sử dụng tên thương hiệu và favicon/icon local, hoàn toàn không lưu trữ URL thật, không có link ra ngoài và không chứa nội dung explicit.

---

## 1. Tính năng nổi bật (V2.2)

- **Roulette Suspense & Mechanical Deceleration**:
  - Thời lượng quay 6.2s với đường cong giảm tốc 3 giai đoạn (Cruise $\rightarrow$ Braking $\rightarrow$ Suspense Tail).
  - Khoảng 1.5 giây cuối cùng chuyển động chậm dần từng nấc cơ học (`tick... tick... tick...... CLACK`) tạo cảm giác hồi hộp chân thực.
  - Winner được tính toán và chọn trước (`predetermined winner`), không fake near-miss thao túng kết quả.
  - Kim roulette phát sáng và phát âm thanh tick đồng bộ khi từng thẻ lướt qua.

- **Âm thanh Cơ học & Khắc phục Preload**:
  - 10 mẫu âm thanh WAV cơ học tự sản xuất (procedural synthesis) với họa âm kim loại bất hài hòa, xung kích transient clank, luồng khí whoosh và ngân vang shimmer.
  - Kiến trúc `SoundManager.ready()` tải trước toàn bộ audio ngay sau Age Gate, giải quyết dứt điểm lỗi mất tiếng ở lượt mở hòm đầu tiên.
  - Tùy chỉnh bật/tắt âm thanh (Sound Toggle) được lưu tự động trên trình duyệt.

- **Hiệu ứng Khai mở & Canvas Particle Engine**:
  - Động cơ hạt 2D Canvas siêu nhẹ kết hợp sóng xung kích (shockwave) bung tỏa theo từng phẩm cấp:
    - **Common**: Âm báo gọn gàng, hiệu ứng tinh tế.
    - **Uncommon**: Xung nhịp xanh lá dịu nhẹ.
    - **Rare**: Lóe sáng xanh dương, tia lửa và sóng xung kích nhỏ.
    - **Epic**: Nổ năng lượng tím, luồng lốc xoáy, chấn động màn hình nhẹ.
    - **Legendary**: Tạm dừng 200ms hồi hộp $\rightarrow$ chấn động ánh vàng rực rỡ $\rightarrow$ luồng sáng xoay vòng $\rightarrow$ hạt lơ lửng ambient.
    - **Mythic (Jackpot)**: Tạm dừng 300ms im lặng $\rightarrow$ dư chấn sub-bass địa chấn $\rightarrow$ sóng xung kích kép đỏ-vàng bùng nổ $\rightarrow$ rung lắc màn hình cực mạnh.
  - Tự động dọn dẹp (cleanup) toàn bộ hạt và requestAnimationFrame khi đóng hộp thoại, không rò rỉ bộ nhớ.
  - Tự động giảm hoặc tắt hiệu ứng khi người dùng bật `prefers-reduced-motion`.

- **Bộ đếm Mở hòm Toàn cầu (Global Shared Counter)**:
  - Hiển thị số lượt mở hòm của **tất cả người dùng trên toàn thế giới**: `Lượt khai mở: 1.622.237` (định dạng `vi-VN`).
  - Được hỗ trợ bởi backend serverless Cloudflare Worker và cơ sở dữ liệu Cloudflare D1 SQL với cơ chế tăng nguyên tử (`UPDATE ... RETURNING value`).
  - Hoạt động độc lập và không làm gián đoạn game nếu API gặp sự cố (graceful fallback).

- **GitHub Header Badge & Live Stars**:
  - Nút GitHub nhỏ gọn ở góc phải thanh header, hiển thị số sao thật qua Cloudflare Worker cache (hoặc GitHub API).
  - Tương thích responsive hoàn hảo trên mọi kích thước màn hình từ 360px đến 1440px.

- **Vết rơi gần nhất (Recent Drop)**:
  - Ghi nhớ và hiển thị gọn gàng thương hiệu vừa mở được: `Lần gần nhất: [logo] Brand Name · RARITY`.

- **Debug Mode Tinh gọn**:
  - Truy cập `?debug=true` để mở bảng điều khiển ép thử từng phẩm cấp (`COMMON` đến `MYTHIC`), thử âm thanh (`TEST SOUND`) hoặc xóa dữ liệu (`RESET DATA`).
  - Kiến trúc `openCase(forcedWinner)` sạch sẽ, không monkey-patch DOM.

---

## 2. Cấu trúc Dự án

```text
.
├── index.html                           # Giao diện chính game
├── 404.html                             # Trang lỗi nội bộ khi click thẻ đã unlock
├── css/
│   └── style.css                        # Toàn bộ CSS Dark Game UI & Responsive
├── js/
│   ├── app.js                           # Controller chính
│   ├── config.js                        # Cấu hình API_BASE_URL & GitHub URL
│   ├── collection.js                    # Quản lý hiển thị album 50 slot
│   ├── data.js                          # Danh mục 50 thương hiệu & phân bổ rarity
│   ├── logo.js                          # Xử lý logo và fallback initials
│   ├── particles.js                     # Canvas 2D Particle & Shockwave Engine
│   ├── random.js                        # Weighted random & thuật toán không trùng
│   ├── roulette.js                      # Roulette băng chuyền ngang & staged easing
│   ├── sound.js                         # Web Audio & SoundManager preload/play
│   └── storage.js                       # Quản lý localStorage & session fallback
├── assets/
│   ├── icons/favicon.svg                # Favicon game
│   ├── logos/                           # 50 brand logo/favicon PNG & ICO
│   └── sounds/                          # 10 file WAV âm thanh cơ học
├── docs/
│   ├── audio-credits.md                 # Bản quyền & phương pháp tổng hợp âm thanh
│   └── dataset-research.md              # Phương pháp và cơ sở dữ liệu thương hiệu
├── scripts/
│   └── generate-sound-samples.mjs       # Script tạo 10 file WAV cơ học
├── worker/                              # Backend Cloudflare Worker & D1
│   ├── schema.sql                       # D1 Database SQL schema
│   ├── wrangler.toml.example            # Cấu hình mẫu Cloudflare Wrangler
│   ├── README.md                        # Hướng dẫn chi tiết triển khai Worker
│   └── src/
│       └── index.js                     # Worker code (/stats, /open-case, /github-stars)
├── tests/
│   ├── browser-smoke.mjs                # CDP Browser smoke test toàn diện
│   ├── random.test.js                   # Unit test thuật toán ngẫu nhiên
│   ├── roulette.test.js                 # Unit test độ mượt và điểm dừng roulette
│   ├── static-audit.test.js             # Kiểm tra bảo mật tĩnh, relative path & copy
│   ├── storage.test.js                  # Unit test lưu trữ và fallback bộ nhớ
│   └── worker.test.js                   # Unit test các endpoint của Cloudflare Worker
└── package.json
```

---

## 3. Chạy Local & Kiểm thử

### Chạy Local Web Server:
Do sử dụng Vanilla JavaScript ES Modules, bạn cần chạy qua web server cục bộ:
```bash
npx serve .
```
Truy cập: `http://localhost:3000` hoặc `http://127.0.0.1:4173`.

### Chạy Unit Test Suite:
```bash
npm test
```
Tất cả 25 bài kiểm tra tích hợp trong Node.js test runner sẽ được thực thi:
- Phân bổ 50 item theo tỷ lệ chuẩn.
- Đảm bảo không trùng lặp và phân phối lại khi cạn tier.
- Kiểm tra tính đơn điệu của đường cong giảm tốc roulette.
- Kiểm tra bảo mật tĩnh (không chứa URL ngoài trừ GitHub & Worker).
- Kiểm tra logic của Worker backend và atomic increment.

### Chạy Browser Smoke Test:
Khởi chạy Chrome với cờ DevTools Protocol tại cổng `9222`:
```bash
chrome --remote-debugging-port=9222 --headless --disable-gpu
node tests/browser-smoke.mjs
```

---

## 4. Triển khai Backend Cloudflare Worker & D1

Xem hướng dẫn chi tiết tại [worker/README.md](file:///d:/C/Toinaywebgi/worker/README.md).
Tóm tắt các bước:
1. Tạo database D1:
   ```bash
   wrangler d1 create toinaywebgi-db
   ```
2. Thực thi schema:
   ```bash
   wrangler d1 execute toinaywebgi-db --remote --file=./worker/schema.sql
   ```
3. Cập nhật `database_id` vào `worker/wrangler.toml` và triển khai:
   ```bash
   cd worker && wrangler deploy
   ```
4. Điền URL Worker vào `js/config.js`:
   ```javascript
   export const API_BASE_URL = 'https://toinaywebgi-counter.<your-subdomain>.workers.dev';
   ```

---

## 5. Triển khai Frontend lên GitHub Pages

1. Push repository lên nhánh `main` của GitHub.
2. Truy cập **Settings $\rightarrow$ Pages**.
3. Tại **Build and deployment**, chọn source **Deploy from a branch** $\rightarrow$ nhánh `main` $\rightarrow$ thư mục `/ (root)` $\rightarrow$ **Save**.
4. Toàn bộ đường dẫn asset và script sử dụng đường dẫn tương đối (`./`), tương thích hoàn toàn với URL subdomain của GitHub Pages (`username.github.io/repository/`).

---

## 6. Phân bổ Xác suất Rarity (Tỷ lệ Vàng)

| Phẩm cấp | Số lượng | Xác suất trúng | Màu sắc nhận diện |
|---|---:|---:|---|
| **Common** | 15 | 45% | `#9aa4a8` (Xám tro) |
| **Uncommon** | 11 | 25% | `#52d273` (Xanh lục) |
| **Rare** | 9 | 15% | `#4ba7ff` (Xanh lam) |
| **Epic** | 7 | 9% | `#b56dff` (Tím huyền bí) |
| **Legendary** | 5 | 5% | `#ffb33f` (Vàng kim) |
| **Mythic** | 3 | 1% | `#ff456d` (Hồng ruby độc đắc) |

---

## 7. Bản quyền & Miễn trừ trách nhiệm

- Đây là một mini game parody mang tính giải trí độc lập. Trò chơi không liên kết, không sao chép nguyên mẫu hay sử dụng mã nguồn, hình ảnh hay âm thanh từ Counter-Strike (CS:GO / CS2) hay bất kỳ tựa game nào khác.
- Tên các thương hiệu thuộc quyền sở hữu của các đơn vị chủ quản tương ứng. Dự án không cung cấp đường dẫn chuyển hướng ra ngoài, không phát và không lưu trữ bất kỳ nội dung đa phương tiện người lớn nào.
