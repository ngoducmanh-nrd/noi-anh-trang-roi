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
- Phòng tùy chọn mật khẩu tự đặt/tự tạo, danh sách phòng đang mở; tin nhắn hai chiều, sticker tự tạo/lưu lại và chat chung.
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
Chủ phòng cũ có thể lấy lại mật khẩu dạng token từ đường dẫn owner-only của Firebase.
Phòng mới dùng tùy chọn mật khẩu lưu SHA-256 (gắn mã phòng) ở Firebase; mật khẩu rõ chỉ giữ
ở khóa localStorage của chủ phòng như trước. Xóa dữ liệu trình duyệt sẽ không lấy lại được
mật khẩu mới từ digest; chủ phòng cần tự nhớ hoặc lưu lại mật khẩu.

Việc chuyển sang domain/origin khác không mang theo localStorage hoặc phiên đăng nhập của trình duyệt.
Trước khi đổi domain cần chủ động sao lưu kỷ niệm/hồ sơ và kiểm tra việc vào lại phòng.

## Phòng đôi và danh sách phòng

- Tạo phòng: bật/tắt mật khẩu, đặt riêng 8–64 ký tự; bật mật khẩu nhưng để trống thì tạo tự động.
  Tùy chọn này được chốt khi tạo phòng, không đổi khóa của phòng đang có.
- Bật **Hiện trong danh sách phòng** để công khai mã phòng, tên/ảnh đại diện chủ phòng và trạng thái khóa.
  Tắt mục này thì vẫn vào được bằng mã/lời mời, không xuất hiện trong danh sách. Phòng cũ và
  phòng ghép đôi `selectedRooms` không tự được công khai.
- Danh sách lấy từ `roomLobby/{hostUid}`, không đọc công khai `rooms/`, tin nhắn hoặc mật khẩu.
  Chỉ chủ phòng được ghi một mục của chính mình, và Rules đối chiếu phòng/UID/trạng thái khóa.
  Khi rời phòng hoặc mất kết nối, mục được gỡ; heartbeat 45 giây và lọc mục cũ quá 4 phút
  là dự phòng khi trình duyệt treo/mất mạng. Danh sách hiển thị tối đa 60 mục mới nhất.
- Hàng avatar/số người trong phòng lấy từ hiện diện theo từng tab ở
  `roomPresence/{kind}/{code}/{uid}/{session}` (chỉ thành viên được đọc), không dùng danh sách
  `members` lưu lâu dài làm số người đang có mặt. Bấm Rời phòng gỡ phiên ngay khi còn kết nối;
  đóng tab/mất mạng dùng `onDisconnect`. Heartbeat 30s, lọc phiên quá 90s mỗi 5s là dự phòng.
  Một UID mở nhiều tab chỉ tính một người, còn tab khác trong phòng thì vẫn hiện diện.
  Không xóa membership, tin nhắn hoặc vai trò game khi rời phòng. Mất mạng đột ngột có thể trễ
  đến khi Firebase phát hiện ngắt kết nối, không bảo đảm tức thời tuyệt đối.
- Phòng không khóa: bấm Vào phòng để tham gia ngay. Phòng khóa: nhập đúng mật khẩu trong popup.
  Người ngoài chưa tham gia vẫn không đọc được nội dung của bất kỳ phòng nào.
- **Cần cập nhật `../database.rules.json` trước khi đưa frontend mới lên môi trường thật.**
  Rules thêm các trường tùy chọn `rooms/{code}/meta/{passwordless,passwordFormat,listed}` và
  path `roomLobby`, `roomPresence`; không migration hay đổi dữ liệu phòng cũ. Chỉ deploy frontend mà chưa cập nhật
  Rules sẽ khiến tạo phòng kiểu mới, tải danh sách và báo hiện diện bị từ chối. Đợt sửa hiện diện
    cần Publish bản Rules mới và cập nhật/reload cả hai phía; client cũ chưa gửi trạng thái hiện diện.
    Không tự Publish Rules trong đợt này.
- Kiểm tra riêng: sau khi chạy emulator auth/database và dev server như bên dưới,
  `npx playwright test tests/rooms.spec.ts tests/firebase-service.spec.ts` trong `app/`.

## Chat hỗ trợ và hộp thư quản trị

- `/support`: mỗi UID có một cuộc trò chuyện riêng; chọn Cần hỗ trợ/Báo lỗi/Góp ý tính năng,
  gửi văn bản tối đa 1500 ký tự và nhận phản hồi ngay trong website. Hiện 100 tin mới nhất.
- `/support/inbox`: hộp thư dành cho quản trị, hiện 50 cuộc trò chuyện mới cập nhật gần nhất;
  chọn một người để đọc/trả lời. Ghi chú Chờ phản hồi/Đã trả lời dựa trên người gửi tin cuối,
  không phải biên nhận đã đọc. Không thêm thông báo đẩy, email hay kênh liên hệ ngoài website.
- Desktop có nhóm **Tiện ích & hỗ trợ** trong sidebar; mobile giữ 5 tab, lối vào nằm trong Cá nhân.
  Màn hỗ trợ có nút quay lại, không bị nút nổi chat chung che. CSS riêng được lazy-load cùng trang.
- Dữ liệu mới: `supportMessages/{uid}/{messageId}` và `supportThreads/{uid}`. Tin nhắn và preview
  được ghi nguyên tử; tin đã gửi không sửa/xóa qua client. Người dùng chỉ đọc/ghi luồng của mình;
  quản trị chỉ có quyền hỗ trợ, không tự có quyền đọc phòng/chat riêng khác.

### Cấp quyền nhận và trả lời cho chủ website

1. Publish bản `../database.rules.json` mới, rồi phát hành frontend mới. Không mở quyền toàn database.
2. Trên **website thật, đúng trình duyệt anh sẽ dùng quản lý**, mở `/support/inbox`.
   Mở **Thiết lập dành cho chủ website** rồi bấm **Sao chép mã thiết bị**.
3. Trong Firebase Console → Realtime Database → Data, thêm một con tại
   `supportAdmins/<mã thiết bị vừa sao chép>` với giá trị **boolean `true`**, không phải chuỗi `"true"`.
   Chỉ thêm đúng mục đó, không thay toàn bộ dữ liệu. Không dùng UID của emulator hoặc localhost.
4. Hộp thư sẽ mở tự động khi quyền được nhận; sau đó trang hỗ trợ có nút **Hộp thư hỗ trợ**.
   Muốn thu hồi, xóa mục của UID đó trong Console. Muốn dùng thiết bị khác, cấp riêng UID của thiết bị đó.

`supportAdmins` không cho bất kỳ client nào tự ghi, kể cả client quản trị; chỉ người có quyền quản lý
Firebase mới cấu hình được. Không cần thêm mật khẩu hoặc private key vào frontend. Đây là quyền gắn
với Anonymous UID hiện tại: xóa dữ liệu trình duyệt/đổi origin có thể mất phiên, cần cấp lại cho UID mới.
Lịch sử hỗ trợ vẫn lưu trên Firebase nhưng người dùng mất UID không tự lấy lại được luồng cũ.

Tính năng dùng RTDB hiện có (đọc/ghi/lưu trữ tính vào hạn mức), không thêm dependency/dịch vụ ngoài.
Chưa có API chống spam hoặc tự dọn lịch sử hỗ trợ; không thay đổi chính sách lưu/xóa phòng trong đợt này.
Kiểm tra riêng sau khi mở emulator và dev server: `npx playwright test tests/support.spec.ts`.

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
