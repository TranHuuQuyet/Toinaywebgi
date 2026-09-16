# Tài liệu Âm thanh & Bản quyền (Audio Credits & Documentation)

Tất cả các tệp âm thanh WAV trong thư mục `assets/sounds/` của dự án **TỐI NAY WEB GÌ?** được tạo bằng thuật toán tổng hợp âm thanh thủ tục (Procedural Audio Synthesis) tự sản xuất trong tệp `scripts/generate-sound-samples.mjs`.

## 1. Nguồn gốc & Bản quyền
- **Giấy phép**: Creative Commons Zero (CC0 1.0 Universal) / Public Domain.
- **Tác quyền**: Tự sản xuất (Self-created procedural sound synthesis).
- **Không sử dụng**: Dự án **hoàn toàn không trích xuất (rip)** bất kỳ mẫu âm thanh nào từ Counter-Strike (CS:GO / CS2), Valorant, PUBG, các tựa game gacha hay bất kỳ trò chơi thương mại nào khác.

## 2. Phương pháp Tổng hợp (Synthesis Method)
Mỗi mẫu âm thanh được cấu thành từ các thành phần vật lý mô phỏng:
1. **Chế độ họa âm kim loại (Inharmonic Metallic Resonances)**: Mô phỏng dao động dầm/thanh kim loại với các tần số phi điều hòa ($f, 2.756f, 4.142f, 5.418f, 8.914f$) phản ánh rung chấn của khối thép và ổ khóa cơ khí.
2. **Xung kích va đập (Instantaneous Clank Attack)**: Xung transient < 15ms tạo tiếng gõ đanh, khô và dứt khoát.
3. **Ma sát & Nén khí (Friction Scrape & Air Whoosh)**: Lọc dải thông dải tần quét (swept bandpass) mô phỏng tiếng mở nắp hòm nặng và vòng quay xé gió.
4. **Họa âm ánh sáng (High-Frequency Shimmer Ring)**: Tần số cao (3kHz - 9kHz) tắt dần theo hàm mũ mô phỏng ánh sáng lóe lên ở các phẩm cấp Rare, Epic, Legendary, Mythic.
5. **Rung chấn hạ âm (Sub-bass Seismic Rumble)**: Tần số trầm 35Hz - 55Hz tạo độ nặng và độ giật cho phẩm cấp Legendary và Mythic.

## 3. Danh mục Tệp âm thanh
| Tệp | Mục đích | Thời lượng | Đặc tính |
|---|---|---|---|
| `case-click.wav` | Nút bấm mở hòm | 0.15s | Click kim loại đanh |
| `case-unlock.wav` | Mở chốt khóa | 0.45s | Hai tiếng lách cách liên hoàn |
| `case-open.wav` | Nắp hòm mở hắt sáng | 0.78s | Tiếng bản lề cọ sát và luồng gió |
| `roulette-tick.wav` | Bánh răng roulette lướt qua kim | 0.055s | Click khô, sắc, cơ học |
| `roulette-stop.wav` | Kim dừng ở ô trúng | 0.36s | Tiếng cạch (CLACK) dứt khoát |
| `reveal-common.wav` | Khai mở Common | 0.26s | Âm báo ngắn gọn |
| `reveal-rare.wav` | Khai mở Rare | 0.65s | Va đập xanh + shimmer ngân vang |
| `reveal-epic.wav` | Khai mở Epic | 0.90s | Va đập tím + tiếng gió lốc + shimmer |
| `reveal-legendary.wav` | Khai mở Legendary | 1.25s | Va đập vàng trầm + luồng sáng lớn |
| `reveal-mythic.wav` | Khai mở Mythic (Jackpot) | 1.50s | Chấn động sub-bass + nổ sóng năng lượng |

