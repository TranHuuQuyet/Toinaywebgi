# Tối nay web gì?

Một mini game static mở `Web Case`, săn rarity và hoàn thành album 50 thương hiệu website 18+. Project chỉ dùng tên thương hiệu và các biểu trưng chữ viết tắt trung tính; không lưu URL thật, không có outbound link, không embed và không chứa hình ảnh hoặc video explicit.

## Features

- Age gate 18+ với trạng thái được lưu trên trình duyệt.
- Roulette ngang chọn trước winner và luôn dừng đúng item đã chọn.
- Sáu rarity với weighted random và tự phân phối lại khi một tier đã hết item.
- Không duplicate; mỗi lần mở case luôn tạo một discovery mới.
- Album 50 fixed slot, progress bar, thống kê theo rarity và complete state.
- Local persistence cho collection, age confirmation và sound setting.
- Âm thanh gốc được tổng hợp bằng Web Audio API, không dùng audio từ game khác.
- Rarity reveal, reduced-motion mode, keyboard focus và layout responsive.
- Trang `404.html` nội bộ cho mọi unlocked card.
- Tương thích GitHub Pages repository subpath nhờ toàn bộ asset path dạng relative.

## Tech stack

- HTML5
- CSS3
- Vanilla JavaScript ES modules
- Node.js built-in test runner (chỉ dùng để kiểm tra; website không cần Node khi chạy)

Không có framework, backend, database, authentication hoặc API server.

## Screenshots

> Placeholder: thêm ảnh chụp desktop và mobile sau khi publish.

## Cấu trúc

```text
.
├── index.html
├── 404.html
├── css/style.css
├── js/
│   ├── app.js
│   ├── collection.js
│   ├── data.js
│   ├── random.js
│   ├── roulette.js
│   ├── sound.js
│   └── storage.js
├── assets/logos/brand-placeholder.svg
├── tests/
│   ├── random.test.js
│   ├── roulette.test.js
│   └── static-audit.test.js
└── package.json
```

## Chạy local

JavaScript sử dụng ES modules, vì vậy hãy chạy qua static server thay vì mở trực tiếp bằng `file://`.

```bash
npx serve .
```

Chạy kiểm tra:

```bash
npm test
```

Browser smoke test (`npm run test:browser`) dùng Chrome DevTools Protocol tại cổng `9222` và static server tại `4173`. Test này kiểm tra age gate, sound toggle, một lượt mở case, persistence, mobile overflow, trạng thái 50/50, reset và trang 404.

## Deploy GitHub Pages

1. Push repository lên GitHub.
2. Mở **Settings → Pages**.
3. Chọn **Deploy from a branch**.
4. Chọn branch `main`, thư mục `/ (root)`, rồi **Save**.
5. Kiểm tra `index.html`, `404.html`, CSS, JS và logo tại đường dẫn repository Pages.

Project dùng toàn bộ relative path, nên hoạt động khi deploy dưới dạng `USERNAME.github.io/REPOSITORY/`.

## Rarity & probability

| Rarity | Số item | Trọng số |
|---|---:|---:|
| Common | 15 | 45% |
| Uncommon | 11 | 25% |
| Rare | 9 | 15% |
| Epic | 7 | 9% |
| Legendary | 5 | 5% |
| Mythic | 3 | 1% |

`random.js` chỉ đưa những rarity còn item chưa unlock vào pool. Trọng số của các tier còn lại được chuẩn hóa theo tổng mới, vì vậy probability tự redistribute. Sau khi chọn rarity, code lọc tiếp những item chưa unlock và chọn một winner trong pool đó. Winner được quyết định trước khi animation bắt đầu.

## localStorage

- `ageConfirmed`: xác nhận age gate.
- `unlockedSites`: mảng ID item đã unlock.
- `soundEnabled`: trạng thái sound toggle.

`RESET COLLECTION` chỉ xóa `unlockedSites`. Footer có control riêng để reset age confirmation.

## Thêm website mới

1. Thêm tên vào đúng mảng rarity trong `js/data.js`.
2. Chỉ giữ metadata an toàn: ID, name, initials, local logo path và rarity.
3. Điều chỉnh test distribution nếu chủ đích thay đổi tổng hoặc số item của tier.
4. Chạy `npm test` để kiểm tra unique ID, distribution, no-outbound-field và no-duplicate logic.

Không thêm các field `url`, `link`, `website` hoặc `redirect`.

## Thêm logo

1. Chỉ dùng logo hoặc favicon không explicit và có quyền sử dụng phù hợp.
2. Tối ưu thành SVG, WebP hoặc PNG nhỏ rồi lưu trong `assets/logos/`.
3. Sửa local relative path trong `js/data.js`.
4. Không hotlink ảnh bên ngoài. Nếu quyền sử dụng không rõ, giữ placeholder chữ viết tắt hiện tại.

## Thêm sound

Sound hiện được tạo trực tiếp bằng oscillator và envelope trong `js/sound.js`, giúp project nhẹ và tránh bản quyền. Có thể thêm file royalty-free hoặc public-domain vào `assets/sounds/` rồi tải bằng relative path. Không sử dụng sound trích từ Counter-Strike hoặc game khác.

## Copyright disclaimer

Đây là một parody randomizer và collection project độc lập. Gameplay dùng các khái niệm phổ biến như case opening, roulette, weighted rarity và collection; không sao chép code, UI, font, crate, icon, hình ảnh hoặc âm thanh của Counter-Strike. Tên thương hiệu thuộc về chủ sở hữu tương ứng. Project không liên kết, chuyển hướng, phát hoặc lưu trữ nội dung người lớn.
