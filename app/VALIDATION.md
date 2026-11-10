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

## Theme sáng/tối cho bản React — 2026-11-10

- `src/components/ThemeToggle.tsx`: nút Sáng/Tối tối thiểu 44px, nhãn trợ năng ổn định,
  `aria-pressed`, lưu khóa riêng `localKey(':theme')`; mặc định trăng đêm.
- `src/components/Shell.tsx`, `src/App.tsx`: gắn nút ở header và màn hình tạo hồ sơ.
  `src/components/ui.tsx`: thêm SVG mặt trời; các icon và xử lý hiện có giữ nguyên.
- `src/app.css`: bổ sung palette trăng ngày, màu form/thẻ/chat/modal và bố cục nút ở màn hình hẹp.
  Các quy tắc theme đêm cũ không bị thay thế; giảm chuyển động và focus bàn phím được giữ.
- `npm run check` trong `app/` và thư mục dự án cha: pass. `git diff --check`: pass.
- Playwright chạy với browser context riêng, cấu hình Firebase thử chỉ tồn tại trong response
  được chặn/thay thế ở trình duyệt. Không sửa file cấu hình, không gọi Firebase thật.
  Hồ sơ thử chỉ lưu trong context này; cảnh báo thiếu kết nối trong ảnh là trạng thái thử có chủ đích.
- Kiểm tra 56 tổ hợp: 6 route chính + onboarding, 2 theme, 360/390/768/1440px;
  sau khi nội dung và viewport ổn định, không tràn ngang.
- Chuyển bằng chuột/Space, focus rõ; cả hai theme giữ sau reload và qua bước tạo hồ sơ.
  Giá trị theme không hợp lệ về mặc định; khi storage bị chặn vẫn đổi theme trong phiên được.
  `prefers-reduced-motion` được tôn trọng; popup chat mở và đóng bằng Escape.
- Không có page error hoặc console error/warning trong lượt kiểm tra các route và popup.
- Sáu màu chữ chính trên sáu nền sáng đã đo đạt tối thiểu 4,65:1; nút chính đạt 7,27:1.
  Đây là kiểm tra các cặp token, không phải chứng nhận WCAG cho toàn bộ ứng dụng.
- 76 file ngoài phạm vi sửa có hash tổng trước/sau giống nhau:
  `f4ea62b8a2f1ce3d9747c2cd8d91149720882190ddb0a32fca1312c1686e7de9`.
  Bao gồm bản HTML/script cũ, Firebase/rules, tests, dependency/config và logic React không liên quan.
- Ảnh: `artifacts/theme-before-1440.png`, `theme-day-1440.png`, `theme-night-1440.png`,
  `theme-day-390.png`, `theme-night-390.png`, `theme-day-chat-390.png`,
  `theme-day-room-390.png`, `theme-day-profile-390.png`, `theme-day-onboarding-390.png`.
- Chưa chạy lại luồng hai người/emulator, gửi tin thật, gameplay hoặc PWA cài trên thiết bị;
  đợt này chỉ kiểm tra theme và tương tác giao diện, không push/deploy.

## Khóa Không gian của bạn — 2026-11-10

- `src/pages/Profile.tsx`: khóa hai công tắc bằng `disabled`, thêm nhãn “Đang phát triển”
  và mô tả trợ năng; đổi “Hiệu ứng trái tim chung” thành “Hiệu ứng động”, chú thích “Tắt hiệu ứng động.”
- `src/app.css`: giảm độ nổi và đổi con trỏ cho công tắc bị khóa; không thay logic nhạc/hiệu ứng phía sau.
- `npm run check` tại `app/` và thư mục cha: pass.
- Playwright trên Vite đang chạy, context riêng chặn Firebase thật: cả hai công tắc không đổi trạng thái
  khi bấm chuột và không nhận focus bàn phím. Không có page error/console error trong lượt kiểm tra.
- Hai theme × 360/390/768/1440px: 8 trường hợp không tràn ngang; đã xem ảnh sáng/tối 390px.
- Lưu hồ sơ thử vào storage riêng và tải lại: pass; liên kết “Khám phá” ở thẻ bên cạnh: pass.
  Bước chờ toast lưu hồ sơ hết thời gian; kết quả lưu được xác nhận bằng storage và giá trị form sau reload.
- 80 file ngoài phạm vi mã giao diện lần này có hash trước/sau giống nhau:
  `0ccc8081d25ce022d564e4b810411943190f389001056ab4191b3e2668c5a101`.
  Firebase, rules, cấu hình, dependency, tests và các thay đổi theme trước đó giữ nguyên.
- Ảnh: `artifacts/space-before-390.png`, `space-day-390.png`, `space-night-390.png`.
- Không kiểm thử đa người dùng/emulator, không ghi Firebase thật, không push/deploy.

## Animate UI Hugeicons — 2026-11-10

- Thay bộ icon dùng chung bằng 35 component Hugeicons chính thức, ghim nguồn tại commit
  `22a9236ae107328f8564edb7e3299375da3247af`; giữ giấy phép MIT + Commons Clause và manifest SHA-256.
- Nút dùng chung, liên kết thẻ trang chủ, điều hướng và nút đổi theme kích hoạt animation trên toàn vùng thao tác.
  Giữ class callback của React Router qua adapter riêng để không mất bố cục/trạng thái active.
- `npm run build`: pass (bao gồm TypeScript); còn cảnh báo chunk chính khoảng 533 kB.
  Chunk UI chứa icon/motion khoảng 213 kB, gzip 64 kB; không nhập toàn bộ danh mục icon.
- `npm audit --omit=dev`: 0 lỗ hổng. `git diff --check`: pass.
- Playwright `tests/icons.spec.ts`: 3 bài pass, kiểm tra animation từ toàn liên kết,
  giảm chuyển động, điều hướng bằng chạm và lưu theme sau reload.
- Kiểm tra icon trang trí có `aria-hidden`, không nhận focus và không gây page error
  trên sáu route ở hai theme. Ảnh desktop 1440px và mobile 390px ở
  `artifacts/hugeicons-{night,day}-{desktop,mobile}.png`; đã xem ảnh thật để sửa bố cục.
- Trang chủ không tràn ngang ở 360/390/768/1440px trong cả hai theme.
- Không sửa cấu hình Firebase/rules, logic dữ liệu/game, bản HTML cũ hoặc deployment.
  Kiểm thử dùng cấu hình riêng tại trình duyệt và chặn Firebase thật; không chạy lại luồng hai người/emulator.
- Chưa push/deploy.

## Dọn file và lưu trữ — 2026-11-10

- Theo yêu cầu chủ dự án, chuyển 119 file/16 nhóm vào
  `D:/AI/web-clone/Luu-tru-Noi-Anh-Trang-Roi-20261110` ngoài repository.
  Có manifest đường dẫn gốc/đích, kích thước và SHA-256; kiểm tra hash sau chuyển đều trùng khớp.
- Lưu bản HTML `public/`, Vercel/script/test trình duyệt cũ, README/VALIDATION cũ,
  ảnh tham khảo, ảnh và báo cáo kiểm thử, ZIP/build/cache/log cũ. Không xóa vĩnh viễn.
- Root `scripts/check.mjs` nay kiểm tra TypeScript của app, cấu hình public hiện tại và JSON rules;
  bản kiểm tra HTML cũ được giữ trong archive. README cập nhật đúng lệnh chạy và vị trí source.
- Gỡ dependency `@animate-ui/react` cài dư tại root; bản dependency của `app/` không thay đổi.
  Giữ repository `mobile/` riêng, backend/rules và test phân quyền.
- `npm run check` tại root, `npm run build` tại app và `npm test` tại root: pass.
  Không ghi Firebase thật. Log emulator phát sinh từ lượt kiểm tra này cũng được lưu trữ.
- So SHA-256: cả 36 file production vừa build khớp từng byte với build trước khi dọn.
  `git diff --exit-code` cho source/assets/config/dependency của app, rules và test backend: không đổi.
- Local http://127.0.0.1:5173 trả HTTP 200. Không chạy lại browser/game tests vì runtime build giữ nguyên.
- npm báo 19 cảnh báo audit ở bộ công cụ root (14 moderate, 5 high); chưa nâng dependency ngoài phạm vi dọn.
- Không commit/push/deploy trong đợt dọn này.

## Bố cục ứng dụng từ ảnh tham khảo — 2026-11-10

- Đã áp dụng skill `D:/SKILL code/ui-ux-pro-max-final/ui-ux-pro-max/SKILL.md`,
  đọc checklist và truy vấn hướng thiết kế/điều hướng. Quyết định áp dụng trong `DESIGN.md`.
- `Home.tsx`: hồ sơ/xu ở đầu, banner trăng ngang, hai ô Phòng đôi/Tìm người và nhóm lối tắt.
  `Profile.tsx`: thẻ cá nhân và danh sách mục; form chuyển vào `/profile/edit`.
  `App.tsx`, `Shell.tsx`: `/chat`, trạng thái chưa đọc, header/quay lại và tab theo ngữ cảnh.
  `main.tsx` nạp CSS bổ sung `app-interface.css`.
- `npm run check` trong app và thư mục cha: pass; `npm run build`: pass.
  Vẫn có cảnh báo chunk chính khoảng 986 kB (gzip 500 kB), do phụ thuộc/ảnh inline sẵn có.
- Một lượt Playwright tuần tự: 9/9 pass (app-interface, app, avatars, icons).
  Bao gồm hai người tạo/vào phòng đúng và sai mật khẩu, nhắn tin/sticker, Thật hay Thách,
  XO, kỷ niệm, chat chung/chưa đọc, ghép đôi và rời phòng trên emulator `demo-inlove-owned`.
  Test chat cũ đã đổi selector từ modal sang route, giữ các kiểm tra đồng bộ/chưa đọc.
- Matrix giao diện: 8 route × 2 theme × 6 viewport (360×800, 375×812, 390×844,
  768×1024, 1440×1000, 844×390). Không tràn ngang, composer chat trong viewport,
  tab ẩn ở chat mobile, hai ô chính Trang chủ nằm trong màn hình đầu ở 390×844.
  Chạy lại 2/2 bài app-interface sau khi bổ sung chờ nội dung route: pass; ảnh không còn trạng thái tải.
- Kiểm tra chọn/lưu avatar sau khi tách màn sửa, browser Back, nút quay lại, Escape,
  sticker mở/đóng và focus bàn phím: pass. Icon vẫn hỗ trợ giảm chuyển động.
- Đo 5 cặp chữ/nền của thẻ chức năng và hàng danh sách: tối thiểu 6,17:1 ở tối,
  5,09:1 ở sáng. Không phải đánh giá WCAG toàn bộ ứng dụng.
- Ảnh `artifacts/app-{night,day}-{390,1440}-{home,profile,profile-edit,chat}.png`;
  có ảnh riêng `app-reviewed-profile-day-390.png`. Cảnh báo kết nối trong ảnh là fixture chủ đích,
  không dùng cấu hình Firebase thật trong các context kiểm tra giao diện.
- `git diff --exit-code` trên public cũ, rules, Firebase/config, service/state, chat/game logic:
  không có thay đổi. Không sửa schema hoặc dữ liệu thật.
- Chưa kiểm tra trên điện thoại vật lý, bàn phím ảo, cỡ chữ hệ điều hành hoặc cài PWA lại;
  không push/deploy.

## Avatar anime đã duyệt — 2026-11-10

- Tách 16 ảnh WebP 288×288 vào `src/assets/avatars/` từ bảng nhân vật được chủ dự án chọn.
  `ProfileForm.tsx` dùng bộ này thay tám lựa chọn emoji; CSS thêm ô ảnh và viền chọn.
- Giữ avatar cũ, tải ảnh và ảnh URL. Preset dùng `kind: data` hiện có, không đổi schema,
  Firebase, rules hoặc cấu hình; không lưu đường dẫn phụ thuộc domain.
- `npm run check`, `npm run build`: pass. Build còn cảnh báo chunk chính >500 kB;
  ảnh inline làm chunk chính tăng lên khoảng 986 kB (gzip 500 kB).
- `tests/avatars.spec.ts`: 1 bài pass; đủ 16 ảnh khác nhau tải thành công, chọn/xem trước,
  lưu rồi reload giữ lựa chọn, avatar emoji cũ vẫn hiện, tải ảnh riêng vẫn hoạt động.
- Hai theme × 360/390/768/1440px: không tràn ngang. Đã xem ảnh mobile thực tế;
  ảnh kiểm tra ở `artifacts/avatars-{night,day}-{390,1440}.png`.
- Test dùng cấu hình trình duyệt riêng, chặn Firebase thật; không có page error.
  Chưa kiểm thử lại chat/ghép đôi hai người với emulator. Không push/deploy.

## Chat và thao tác sticker — 2026-11-11

- Sửa nền bong bóng tin nhắn, chiều cao vùng chat và kích thước điều khiển sticker trong
  `src/app.css`, `src/styles.css`, `src/app-interface.css`; cuộn nằm trong vùng chat.
- `src/features/chat/ChatPanel.tsx`: ảnh tải lên được vẽ theo đúng tỷ lệ, căn giữa canvas
  vuông với phần thừa trong suốt. Sticker đã lưu bị méo trước đây cần tạo lại từ ảnh gốc.
- `src/features/chat/StickerPanel.tsx`: mở/đóng bằng Motion và token Animate UI; có reduced motion,
  reflow khi xóa, trả focus khi đóng. Nhấn giữ 450ms mới hiện thanh Xóa; thả tay không gửi/xóa.
  Di chuyển quá 10px hủy giữ; chạm sticker khác để hủy không gửi nhầm. Có chuột phải,
  Delete/Backspace để mở, Escape để hủy và trả focus khi thao tác bằng bàn phím.
- Nút Xóa dùng `trash-2` chính thức của Animate UI Lucide, cùng commit ghim với Hugeicons;
  giữ giấy phép, thêm vào script đồng bộ/manifest/registry. Không thêm dependency hoặc CDN.
- `npm run check` tại gốc repo: pass (TypeScript, public config và JSON rules).
- Playwright `tests/icons.spec.ts tests/app-interface.spec.ts -g "icon|real routes"`: 4/4 pass.
  Các bài dùng cấu hình mock và chặn Firebase thật.
- Kiểm tra trình duyệt tạm thời đã chạy rồi gỡ: tỷ lệ ảnh 100×200 trong canvas 192×192
  giữ đúng, hai bên trong suốt; animation mở/đóng, bật tắt nhanh, reflow và giảm chuyển động: pass.
  Kiểm tra nhấn giữ, nhấn nhanh, di chuyển để hủy, bấm ngoài, chuột phải, xóa từng sticker,
  icon Lucide, focus bàn phím và Escape: 1/1 pass; nút Xóa cao ít nhất 44px.
- Layout chat đã đo ở 390/1440px, không tràn ngang; thao tác nhấn giữ đo ở viewport 390px
  bằng chuột Playwright, chưa thử cảm ứng/điện thoại thật. Chưa xác nhận lại đầy đủ 360/768px.
  Lượt matrix app-interface đầy đủ bị timeout 120s; không coi là pass.
- Đối chiếu Git: rules, cấu hình Firebase/dependency, service/state, game và test hiện có
  không đổi so với HEAD. `git diff --check` với CRLF được nhận diện: pass.
  Không ghi Firebase thật, không commit/push/deploy. Không chạy lại emulator hai người hoặc build production.

## Thông báo gọn và dịu hơn — 2026-11-11

- Chỉ sửa CSS trình bày trong `src/app-interface.css`: toast (tạo/vào phòng, sao chép và
  các thông báo dùng chung) giới hạn rộng 360px, giảm padding; thông báo cập nhật rộng tối đa
  336px, không còn đẩy nút đóng xuống hàng riêng trên mobile. Giữ vùng bấm tối thiểu 44×44px.
- Thay animation thay đổi margin của toast bằng opacity + translateY 4px, 200ms;
  dùng thời gian `transition.fade` và đường cong `ease.soft` của Animate UI, không nảy/zoom.
  Áp dụng cùng chuyển động cho khung cập nhật; reduced motion chỉ fade, không trượt.
- `npm run check` tại app và gốc repo: pass. `git diff --check` nhận diện CRLF: pass.
- Playwright kiểm tra tạm thời: 1/1 pass (11,7s), sau đó gỡ file test tạm.
  Kiểm tra hai theme × 360/390/768/1440px: popup nằm trong viewport, không tràn nội dung/ngang,
  các nút đạt 44px; animation đúng 200ms và chỉ di chuyển 4px, reduced motion không có transform.
  Toast thực tế được kích hoạt qua sao chép mã phòng bằng clipboard mock; nút đóng và tự ẩn
  sau 5s vẫn hoạt động. Khung cập nhật dùng hook PWA giả lập trong browser; nút Để sau đóng được.
- Đã xem ảnh trước/sau 390px: `artifacts/notifications-before-390.png` và
  `artifacts/notifications-after-390.png`. Cấu hình browser riêng chặn Firebase thật;
  không có page error. Không tạo phòng hoặc kích hoạt cập nhật trên môi trường thật.
- Runtime React/JavaScript, Firebase/rules, dữ liệu, thời gian tự ẩn và hành vi nút không đổi;
  diff chỉ có CSS và tài liệu xác nhận này. Chưa thử điện thoại thật, emulator hai người,
  cập nhật service worker production hoặc build lại. Chưa commit/push/deploy đợt này.
- Chỉnh tiếp theo ảnh chụp của chủ dự án: toast không còn nút × (`state/AppContext.tsx`, chỉ bỏ nút
  đóng, thêm `key` để thông báo mới chạy lại hiệu ứng). Giữ nguyên hẹn giờ 5 giây; CSS cho toast hiện
  200ms, giữ nguyên rồi mờ dần ở 0,8 giây cuối trước khi gỡ. Toast không chặn thao tác bên dưới
  (`pointer-events:none`). Khung cập nhật vẫn giữ nút Để sau vì cần quyết định của người dùng.
- Playwright tạm thời (đã gỡ): không có nút trong toast; độ mờ 1 trong 1–3,5 giây,
  giảm dần 0,66→0,25→0,09→0,01 rồi biến mất ở ~5,05 giây; reduced motion cũng mờ dần và gỡ ở ~5,1 giây;
  thông báo thứ hai chạy lại; không có page error. `npm run check`: pass. Chưa thử điện thoại thật.

  ## Nút nổi "Chuyện dưới trăng" thu vào cạnh — 2026-11-11

  - Chỉ sửa CSS trong `src/app-interface.css`. Nút nổi (hiện từ 760px trở lên; dưới đó đã ẩn,
    dùng lối vào chat trên header) dính sát cạnh phải, chỉ lộ icon rộng 45px. Di chuột hoặc focus
    bàn phím thì trượt ra kèm chữ, 0,28s bằng `transform`; rời chuột/mất focus thì thu lại.
    Huy hiệu tin chưa đọc chuyển sang góc trên bên trái để luôn thấy khi thu vào. Link, nhãn
    `aria-label` và đích `/chat` không đổi; click vẫn mở chat chung.
  - Playwright tạm thời (đã gỡ) 1/1 pass: 2 theme × 1440/1000/768px, phần lộ ra 44–56px khi thu vào,
    mở ra nằm trọn trong viewport, không tràn ngang; focus bàn phím mở, blur thu lại; click đi đến `/chat`;
    huy hiệu (giả lập bằng phần tử thử) nằm trong phần lộ ra. Đã xem ảnh thu vào/mở ra ở theme tối.
    `npm run check`: pass. Không dùng Firebase thật; chưa chạy `app.spec.ts` (cần emulator) và chưa
    thử màn hình cảm ứng lớn, nơi không có hover. Chưa commit/push đợt này.
