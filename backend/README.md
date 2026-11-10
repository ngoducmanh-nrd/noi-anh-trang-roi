# Backend — đợt siết Firebase Rules

> Tài liệu lịch sử: `public/` và `tests/browser-smoke.js` của bản HTML đã chuyển vào
> `D:/AI/web-clone/Luu-tru-Noi-Anh-Trang-Roi-20261110/legacy-html/`.
> Frontend hiện tại ở `app/`; kiểm thử trình duyệt hiện tại ở `app/tests/`.

## Trạng thái

Đã hoàn tất thay đổi và kiểm tra trên Firebase Emulator. **Chưa Publish rules mới lên Firebase thật.**
Không sửa `public/`, cấu hình Firebase, package/lockfile hoặc file giao diện Qoder đang làm.

## Thay đổi

- Lời mời chỉ được chuyển sang `accepted` khi phòng ghép đôi đúng mã đã tồn tại,
  có đúng host/guest và hai thành viên tương ứng. Client hiện đã tạo phòng trước khi chấp nhận.
- Gửi lời mời cần cả hai hồ sơ đang tìm đôi còn hiện diện trong vòng 4 phút,
  đúng với `ONLINE_MAX_AGE` hiện tại. Chặn timestamp lời mời quá xa quá khứ/tương lai.
- Giữ nguyên việc thu hồi, từ chối và gửi lại lời mời hợp lệ.
- Thật hay Thách: whitelist trường dữ liệu, trạng thái, kiểu boolean, độ dài câu hỏi/câu trả lời,
  quân bài 1–13, tham chiếu người chơi/thành viên và yêu cầu kết thúc hợp lệ.
- XO: whitelist dữ liệu, ô bàn cờ 0–224, dấu X/O, điểm 0–6, mã trận và ô thắng hợp lệ.
  Người dùng chỉ được nhận quân cho chính mình; không chiếm hoặc xóa quân đã có chủ.
- Các kiểm tra áp dụng cho cả phòng thường và phòng ghép đôi.
- Không đổi schema/path, cơ chế đăng nhập, dữ liệu chat, ví xu hay quyền hiệu ứng chung.

## Kiểm tra đã chạy

- `npm run check`: đạt.
- `npm test`: 18/18 đạt, gồm 6 bài hồi quy mới. Trước khi siết rules,
  các bài mới phát hiện được những đầu vào chưa bị từ chối.
- Hai context trình duyệt, Auth + Database Emulator, project `demo-inlove-owned`:
  tạo hồ sơ, mật khẩu đúng/sai, tin nhắn hai chiều, sticker, chat chung;
  Thật hay Thách từ rút bài đến hỏi/đáp/chuyển lượt/kết thúc/chơi lại;
  XO nhận quân, hoàn tất một ván và chuyển ván; lời mời và phòng ghép đôi;
  mở trò chơi trong phòng ghép đôi. Không có JavaScript page error.
- Cấu hình `public/app-config.js` giữ nguyên SHA-256.
- HTML thay đổi trong lúc làm do có phiên chỉnh giao diện đồng thời; không hoàn tác hay ghi đè.
  Bản thân đợt backend này không ghi vào file HTML/CSS/JS phía trình duyệt.

## File liên quan

- `../database.rules.json`: file dùng để Publish trong Firebase Console.
- `harden-rules.mjs`: tạo lại những phần rules do đợt backend này quản lý.
- `../tests/database.test.mjs`: kiểm thử quyền và dữ liệu hợp lệ/không hợp lệ.
- `../tests/browser-smoke.js`: bài kiểm tra tích hợp trình duyệt; mặc định dùng emulator.

Tạo lại rules khi cần, rồi kiểm tra:

```powershell
node backend/harden-rules.mjs
npm test
```

Không chạy lại generator nếu đã sửa thủ công những phần nó quản lý mà chưa ghép thay đổi;
generator sẽ thay toàn bộ schema Thật hay Thách/XO và điều kiện ghi lời mời.

## Đưa lên Firebase thật

Sau khi chốt và rà bản ghép với giao diện, mở Realtime Database → Rules,
thay bằng toàn bộ `database.rules.json` rồi Publish. Không cần sửa dữ liệu hay cấp quyền ghi toàn database.
Kiểm tra hai người dùng trên bản triển khai HTTPS sau đó. Kiểm thử emulator không thay thế bước này.

## Phần chưa giải quyết

1. **Chống spam phía server:** ghi tin hiện đi thẳng từ trình duyệt vào RTDB.
   Chưa có API máy chủ, bộ đếm đáng tin cậy hoặc cơ chế chống lách giới hạn bằng tài khoản ẩn danh mới.
   Giới hạn 1,8 giây trong trình duyệt không phải bảo vệ server. Cần chốt hợp đồng API với frontend,
   dùng credential phía server lưu trong môi trường triển khai và khóa đường ghi trực tiếp phù hợp.
2. **Chống gian lận trò chơi/xu:** schema chặt hơn không xác minh mọi nước đi, người thắng hoặc phần thưởng.
   Thành viên vẫn chia sẻ trạng thái game. Ví xu vẫn do client của chủ ví ghi trong giới hạn cũ,
   không dùng làm số dư tiền hoặc phần thưởng có thể quy đổi. Chưa sửa ví để tránh đổi hợp đồng client.
3. **Dọn dữ liệu cũ:** chưa chạy xóa dữ liệu hoặc tạo lịch dọn tự động.
4. **Thông tin cá nhân hóa:** chưa thay liên hệ/QR/game vì chưa nhận nội dung mới của chủ dự án.

Phần 1–3 cần đợt tích hợp backend tiếp theo; không được báo là đã có server chống spam/chống gian lận.
