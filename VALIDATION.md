# Kết quả kiểm tra — 2026-11-10

## Đợt backend mới: local, chưa Publish

- `npm test`: **18/18** đạt sau khi siết rules lời mời và schema Thật hay Thách/XO.
- `npm run check`: đạt.
- Kiểm thử hai phiên trình duyệt trên emulator đạt: phòng/chat/sticker, chu trình Thật hay Thách,
  XO hết một ván/chuyển ván, lời mời/phòng ghép đôi và trò chơi trong phòng ghép đôi.
- Không Publish rules mới hoặc ghi phòng/chat thử lên Firebase thật trong đợt này.
- Không sửa file giao diện; cấu hình Firebase giữ nguyên. Qoder đang sửa HTML đồng thời.
- Chi tiết thay đổi, phạm vi và giới hạn: `backend/README.md`.

## Lịch sử kiểm tra trước đợt backend mới

- `npm run check`: đạt. JavaScript của frontend và cấu hình phân tích được; tài nguyên tĩnh tồn tại; cấu hình chủ cũ không còn trong HTML triển khai.
- `npm test`: 12/12 bài kiểm tra đạt với Firebase Realtime Database Emulator.
- Kiểm tra trình duyệt: hai context độc lập, UID khác nhau, sử dụng Auth Emulator và Database Emulator của project `demo-inlove-owned`.
  Tạo hồ sơ bằng form, tạo/vào phòng bằng mật khẩu, gửi tin hai chiều, sticker,
  tham gia Thật hay Thách, chọn quân XO và đi một nước, chat chung, bật tìm đôi,
  gửi và chấp nhận lời mời, cùng vào một phòng ghép đôi. Không có JavaScript page error.
- File `tests/browser-smoke.js` là hàm dành cho Playwright runner có đối số `page`;
  cấu hình emulator được thay bằng route trong context thử nghiệm, không ghi đè cấu hình thật.
- Kiểm tra Firebase thật `noi-anh-trang-roi`: cấu hình đầy đủ, đăng nhập Anonymous thành công.
  Sau khi anh Publish Rules, đọc `serverSettings/hearts` và `matchLounge` thành công.
  Hai phiên trình duyệt độc lập đã kiểm tra tạo hồ sơ, tạo/vào phòng, chặn mật khẩu sai,
  chat hai chiều, sticker, tham gia Thật hay Thách, chọn quân và đi một nước XO,
  chat chung, tìm đôi, lời mời và cùng mở phòng ghép đôi. Không có JavaScript page error.
  Phòng thử: `YJHEFTNF`; phòng ghép đôi thử: `DHSV99HA`.
  Hai hồ sơ có tên “Kiểm thử Alice” và “Kiểm thử Bobby”. Một số dữ liệu thử vẫn nằm
  trong database vì client được thiết kế không có quyền xóa lịch sử/phòng tùy ý.
- Firebase thật: phiên người dùng thứ ba không đọc được phòng `YJHEFTNF`, mật khẩu
  phòng hoặc phòng ghép đôi `DHSV99HA` (`PERMISSION_DENIED`). Đọc chat chung không xác thực
  bị từ chối với HTTP 401.
- Cloudflare: `wrangler deploy --dry-run` đạt, nhận diện 17 file tài nguyên.
  Chưa triển khai; đang chờ đăng nhập Cloudflare.

Các bài kiểm tra trên máy không xác nhận cấu hình, hạn mức hay quyền của Firebase thật.
