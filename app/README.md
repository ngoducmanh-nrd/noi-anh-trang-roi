# Nơi Ánh Trăng Rơi · React app

Bản nâng cấp React + TypeScript + Vite + PWA được chủ dự án yêu cầu riêng.
Bản HTML cũ đã chuyển vào thư mục lưu trữ bên ngoài repository; xem README ở thư mục cha.

## Chạy bản mới

Cần Node.js 22.12+ hoặc 24. Mở terminal trong thư mục `app`:

```powershell
npm ci
npm run dev
```

Mở http://127.0.0.1:5173 . Bản chạy bình thường dùng Firebase riêng của anh qua
`public/app-config.js`. Không tự thêm `emulators: true` vào cấu hình triển khai.

## Đã chuyển sang React

- Khung ứng dụng với 5 mục chính, URL riêng, nút Back/Forward của trình duyệt.
- Hồ sơ dạng thẻ cá nhân, màn sửa riêng `/profile/edit`, 16 avatar anime/link/tải lên; vẫn đọc avatar emoji cũ.
- Phòng có mật khẩu, tin nhắn hai chiều, sticker tự tạo/lưu lại và chat chung.
- Tìm đôi, hiện diện, lời mời đến/đi, đồng ý/từ chối/thu hồi và phòng ghép đôi.
- Thật hay Thách: rút bài, hỏi/đáp, đổi lượt không giới hạn, yêu cầu kết thúc có xác nhận.
- XO 15×15, năm quân liên tiếp, sáu ván thắng, chơi lại và xu ảo.
- Ngày kỷ niệm, ghi chú, câu hỏi, bói vui; liên kết game/liên hệ/QR theo cấu hình.
- Nhạc nền, hiệu ứng chung, thông báo mất mạng, lỗi và cập nhật phiên bản.
- PWA có manifest, icon, service worker, bộ khung và kỷ niệm mở lại khi ngoại tuyến.
- Trang chủ gọn với hai lối vào Phòng đôi/Tìm người; chat chung là màn riêng `/chat`.
  Mobile có nút quay lại ở màn chi tiết và ẩn tab dưới khi đang trò chuyện.
  Xem `DESIGN.md` cho hướng thiết kế từ ảnh tham khảo và skill UI/UX Pro Max.

Trò chuyện/ghép đôi/game đồng bộ vẫn cần mạng. Đây là PWA, không phải ứng dụng native
đã phát hành lên App Store/Google Play.

## Giữ dữ liệu khi chuyển bản

Sử dụng cùng Firebase project và app `[DEFAULT]` để giữ phiên Anonymous hiện có trên cùng origin.
Hồ sơ, kỷ niệm/ngày hẹn và sticker đọc được từ các khóa localStorage của bản cũ;
không xóa hoặc ghi đè khóa gốc. Phòng cloud hiện tại được phục hồi nếu phù hợp.
Chủ phòng có thể lấy lại mật khẩu từ đường dẫn owner-only của Firebase.

Việc chuyển sang domain/origin khác không mang theo localStorage hoặc phiên đăng nhập của trình duyệt.
Trước khi đổi domain cần chủ động sao lưu kỷ niệm/hồ sơ và kiểm tra việc vào lại phòng.

## Build và xem bản production

```powershell
npm run build
npm run preview
```

Vite nén mã production; không xuất source map. Không có cơ chế nào bảo đảm frontend
không thể bị sao chép. Firebase Rules vẫn quyết định quyền dữ liệu.

## Đưa lên Vercel

Nếu kết nối Git từ repository hiện tại:

1. Root Directory là `app` nếu repository bắt đầu tại thư mục `Nơi Ánh Trăng Rơi`;
   nếu repository bắt đầu tại workspace, chọn `Nơi Ánh Trăng Rơi/app`.
2. Framework Preset: Vite. Build Command: `npm run build`. Output Directory: `dist`.
3. Dùng `app/vercel.json`, không dùng cấu hình static HTML ở thư mục cha.
4. Giữ đúng cấu hình Firebase của anh. Publish `../database.rules.json` sau khi rà thay đổi backend.
5. Kiểm tra URL HTTPS thật bằng hai thiết bị trước khi thay bản đang dùng.

Đợt này không tự tạo Git repo, push hoặc deploy.

## Kiểm thử

Kiểm tra TypeScript và luật game:

```powershell
npm run check
npm run test:games
```

Các bài kiểm tra trình duyệt dùng emulator. Cần Java 21 và ba terminal:

```powershell
# Terminal 1: từ thư mục dự án cha
npx firebase emulators:start --only auth,database --project demo-inlove-owned

# Terminal 2: từ app/
npm run dev

# Terminal 3: từ app/, sau khi build
node scripts/serve-test-build.mjs
```

Sau đó, từ `app/` chạy `npm run test:e2e`. Cần Chrome cài trên máy.
Server ở cổng 4173 chỉ phục vụ bài kiểm tra production/PWA với cấu hình emulator.
Không dùng server/script test này làm website thật.

Ảnh kiểm tra ở `artifacts/`. Kiểm thử Firebase Rules ở thư mục cha vẫn chạy bằng `npm test`.

## Icon chuyển động

Giao diện dùng 35 component Hugeicons từ Animate UI, cùng `@animate-ui/react` và `motion`.
Icon chuyển động khi rê chuột/chạm nút hoặc liên kết, tôn trọng `prefers-reduced-motion`.
Không tải cả danh mục icon; hình trăng trang trí và avatar vẫn giữ riêng.
Ngoài ra có 1 icon Lucide của Animate UI (`trash-2`, nút xóa sticker khi nhấn giữ) trong `src/components/animate-ui/lucide/`, cùng commit ghim và cùng giấy phép.

Nguồn được ghim tại commit `22a9236ae107328f8564edb7e3299375da3247af`.
Mã, thông tin nguồn và giấy phép MIT + Commons Clause nằm trong `src/components/animate-ui/`.
Giữ thông báo giấy phép khi phân phối; không bán lại các component thư viện riêng lẻ.
Muốn đồng bộ lại đúng bản: `node scripts/sync-animate-icons.mjs 22a9236ae107328f8564edb7e3299375da3247af`.
Việc lấy phiên bản mới cần rà lại diff và chạy build cùng kiểm tra icon.

Kiểm tra riêng icon, sau khi mở dev server: `npm run test:e2e -- tests/icons.spec.ts`.
Bài kiểm tra này dùng cấu hình giả lập tại trình duyệt, chặn kết nối Firebase thật và không cần emulator.

## Những việc còn tách riêng

- Rules backend mới ở thư mục cha chưa tự động được Publish.
- Chưa có API chống spam cấp server hay máy chủ xác minh nước đi/phần thưởng.
  Xu chỉ là xu ảo giải trí, không quy đổi tiền.
- Thông tin liên hệ, QR donate và game ngoài giữ theo cấu hình được cung cấp.
- Kỷ niệm còn lưu trên thiết bị, chưa có sao lưu đa thiết bị.
- Thông báo đẩy và phát hành app native chưa nằm trong bản này.
- Xem `VALIDATION.md` để biết các kiểm tra thực tế và giới hạn.
