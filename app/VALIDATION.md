# Xác nhận bản React/PWA — 2026-11-10

## Đợt cá nhân hoá Home theo tham chiếu 12Vibe (2026-11-10, tối)

- Tham khảo 5 screenshot app 12Vibe trong `ảnh tham khảo/`; chỉ mượn cách bố trí (dải hồ sơ đầu trang,
  thẻ tính năng gradient + tagline chữ hoa nhỏ, pill xu), KHÔNG mượn nền trắng/đỏ — giữ nguyên bảng màu trăng/đêm.
- Home.tsx thêm dải `.home-profile`: AvatarView lg (viền kép), tên, trạng thái (mối quan hệ hoặc fallback
  "Đang ở dưới ánh trăng") + chấm xanh theo `connection` (nhấp nháy khi connecting/offline), pill xu
  `subscribeWallet` (chỉ đọc, có guard `uid` trước khi gọi để `requireConnection` không ném lúc đang kết nối).
- 3 thẻ `.feature-card` thêm `.feature-tagline` caps (xanh đêm/lavender/vàng) + nền gradient dịu theo tông
  từng thẻ; hover dùng `filter:brightness(1.07)` (tắt khi `prefers-reduced-motion`).
- Kiểm tra Playwright: render DOM đúng, wallet hiển thị số xu thật, không lỗi console;
  `overflowX = 0` ở 360/390/768/1440px; pill xu tự xuống hàng dưới ở ≤560px;
  `npm run check` đạt sau thay đổi. Không chạm logic/Firebase; chỉ Home.tsx + styles.css.

## Đợt hiệu ứng cảnh trăng + FAB (2026-11-10, muộn nữa)

- Vệ tinh chạy đúng trên đường quỹ đạo elip bằng CSS Motion Path
  (`offset-path:ellipse(50% 50% at 50% 50%)` + `offset-distance`), quỹ đạo ngoài 26s, quỹ đạo trong 44s ngược chiều;
  dùng `%` nên tự khớp mọi breakpoint. Bọc trong `@supports` — trình duyệt cũ giữ dot tĩnh.
- Trăng nổi nhẹ (`moon-float` 9s), sao nhấp nháy (`star-twinkle` lệch pha), cảnh onboarding có riêng
  `onboard-moon-float` + vệ tinh trên `onboard-orbit`. Các breakpoint mobile đặt `transform:none`
  cho trăng đã kèm `animation:none` để keyframes không kéo lệch vị trí.
- Đã thử tách vòng quỹ đạo 2 lớp "Saturn" (nửa trước đè trăng, nửa sau trăng che) nhưng chủ dự án thấy
  xấu nên đã hoàn tác: quay về 1 vòng duy nhất nằm sau trăng, markup hero-art gốc (Home.tsx).
- Trăng đưa về đúng tâm hai vòng quỹ đạo ở mọi breakpoint (hero 53%/49%, khổ 1000/760/560 và onboarding
  `top:calc(18% - 125px)`); đo Playwright: tâm trăng và tâm quỹ đạo trùng nhau (lệch ≤7px là do trăng đang nhấp nhô).
- `prefers-reduced-motion` đặt chỗ sẵn bằng rule toàn cục có từ trước (đóng băng animation).
- FAB "Chuyện dưới trăng" và update-notice nâng lên `bottom:calc(78px + safe-area)` trên desktop,
  hết đè chân trang (đo thực tế: FAB đáy 822, footer đỉnh 842, hở 20px); mobile giữ vị trí trên thanh nav dưới.
- Tham khảo animate-ui docs troubleshooting: trang đó chỉ dặn lỗi CLI/alias và flicker Strict Mode;
  vì cảnh trang trí nên chọn CSS thuần để tránh hẳn lớp lỗi Strict Mode flicker.
- Đã verify bằng Playwright: `offset-path` được hỗ trợ, `offset-distance` đổi theo thời gian ở cả 3 cảnh
  (hero, onboarding desktop, onboarding mobile tắt đúng), chấm nằm trên đường elip trong ảnh chụp,
  390px không tràn ngang. `npm run check` đạt sau thay đổi.

## Đợt tinh chỉnh UI/UX + font mới (2026-11-10, muộn)

- Đổi font thân → **Plus Jakarta Sans**, font tiêu đề → **Bricolage Grotesque** (biến thiên wght),
  tự host woff2 tại `app/public/fonts/` gồm subset vietnamese/latin/latin-ext, giữ Be Vietnam Pro làm fallback.
  Không dùng CDN; `font-display:swap`. Bộ cyrillic-ext đã tải nhưng bỏ (không dùng, bớt dung lượng).
- Tăng cỡ chữ tối thiểu: mọi cỡ <10px nâng lên bậc 9–10px (nav-label, message-meta, footer, badge kèm theo media queries).
- Tương phản: `--faint` `#9299b2` → `#9aa3c2`; placeholder input nâng tương tự.
- Mềm hoá letter-spacing âm trên h1/h2/h3, hero, onboarding, question-card, anniversary (dấu tiếng Việt đỡ dồn).
- Thêm shadow nhẹ: `.surface` (`--shadow-card`), `.hero-card` (glow đêm), `.button-primary`.
- `theme-color` `#111320` → `#0c101b` khớp `--bg`; thêm `<link rel="icon">` dùng `icons/moon-192.png` (hết 404 favicon).
- Kiểm tra lại sau thay đổi: `npm run check` đạt; `npm run test:games` **5/5** đạt;
  dev server + Playwright: onboarding, Home, Room, LittleThings render đúng, font loaded
  (`document.fonts.check` với chuỗi có dấu tiếng Việt → true), 6 route đều `overflowX = 0` ở 390px.
  Console chỉ còn React DevTools info; không lỗi mới.

## Kết quả đã chạy

- `npm run check` và `npm run build`: đạt, TypeScript strict.
- `npm run test:games`: **5/5** đạt (hướng thắng, biên bàn cờ, chặn quân, schema/ID và giá trị lá bài).
- `npm run test:e2e`: **7/7** đạt, dùng Chrome và Auth/Database Emulator `demo-inlove-owned`.
- Sau đó chạy lại riêng 3 bài giao diện với kiểm tra bổ sung unread chat và rời phòng ghép đôi/tải lại:
  **3/3** đạt.
- `npm audit --omit=dev`: **0 lỗ hổng được báo**. Đã nâng dependency bắc cầu gRPC qua override
  tương thích để loại 4 cảnh báo high từ dependency Firebase. Audit toàn bộ công cụ dev vẫn có
  2 cảnh báo low và 4 moderate; không dùng `audit fix --force` để hạ Firebase hoặc đổi major ngoài ý muốn.
- ZIP production đã kiểm tra CRC, có `index.html` ở gốc và không chứa source map.

## Các luồng trình duyệt

1. Hai người dùng độc lập tạo hồ sơ, tạo/vào phòng; mật khẩu sai bị từ chối.
2. Tin nhắn hai chiều, tạo và gửi sticker, chat chung, số chưa đọc và đánh dấu đã đọc.
3. Thật hay Thách: tham gia hai người, yêu cầu/ký nhận kết thúc; model kiểm tra schema/rút bài.
4. XO: hai người chọn quân, đi một nước và đồng bộ ô cờ; model kiểm tra điều kiện thắng.
5. Tìm đôi: bật hiện diện, gửi lời mời, đồng ý và cả hai mở cùng phòng riêng.
6. Rời phòng ghép đôi rồi tải lại không tự bị kéo vào phòng từ lời mời cũ.
7. Ghi/lưu kỷ niệm, tải lại; chuyển trang bằng URL, browser Back.
8. Khôi phục hồ sơ/kỷ niệm từ localStorage bản cũ mà không xóa khóa cũ.
9. Quyền owner/guest/outsider; khôi phục UID qua tải lại và mật khẩu owner-only.
10. Avatar dữ liệu: giữ ảnh hồ sơ hợp lệ và nén ảnh trong tin nhắn đúng giới hạn rules.
11. Hiện diện bật/tắt liên tiếp, lời mời/phòng ghép đôi đúng thứ tự ghi, dọn listener khi unsubscribe.
12. Production PWA: manifest192/512px, service worker, cache cấu hình công khai,
    mở lại kỷ niệm khi tắt mạng và hiển thị ngoại tuyến đúng.

## Giao diện

- Các route chính đã kiểm tra không tràn ngang ở360/390/768/1440px.
- Bàn XO có cuộn riêng trên mobile, không làm tràn trang.
- Đã xem ảnh thực tế: trang chủ desktop/mobile, onboarding desktop/mobile,
  game trên mobile và kỷ niệm ngoại tuyến.
- `artifacts/` chứa các ảnh đã chụp. Dữ liệu/tên/mã phòng trong ảnh là dữ liệu emulator.
- Screenshot full-page hiển thị thanh nav cố định ở vị trí viewport; đây không phải lỗi bố cục trang.

## Phạm vi và giới hạn

- Chưa deploy/push bản React này và chưa kiểm tra trên URL Vercel HTTPS thật.
- Bộ test React dùng emulator; các host Firebase/Google API thật bị chặn trong các bài kiểm tra dịch vụ.
- Bản HTML cũ, Firebase config và rules của dự án cha không bị thay thế trong đợt React.
- Build có cảnh báo chunk chính khoảng530KB minified (~163KB gzip). Các route phụ đã lazy-load;
  có thể tối ưu tiếp khi đo trên thiết bị thật. Cảnh báo không làm build thất bại.
- Kiểm thử installability bằng manifest/service worker; chưa thử thao tác cài thực tế trên iPhone/Android.
- Offline hỗ trợ bộ khung/hồ sơ/kỷ niệm đã lưu; chat/ghép đôi/game trực tuyến vẫn cần mạng.
- Chưa có server chống spam, xác minh chiến thắng/xu hoặc thông báo đẩy.
- Cùng origin mới kế thừa localStorage và phiên Anonymous; chuyển domain cần kế hoạch mang dữ liệu sang.
