# Nơi Ánh Trăng Rơi

**Bản React + TypeScript + PWA mới nằm trong [`app/`](app/README.md).**
Chạy bản mới: `cd app` → `npm ci` → `npm run dev` → mở http://127.0.0.1:5173 .
Bản HTML bên dưới vẫn được giữ làm đối chiếu; khi triển khai React lên Vercel phải chọn Root Directory `app`.

Web dùng Firebase riêng `noi-anh-trang-roi`. Anonymous Authentication và Realtime Database
đã kết nối, rules đã Publish, các luồng hai người dùng trên Firebase thật đã được kiểm tra.
Chưa xác nhận bản Vercel vì chưa nhận URL triển khai.

## Các file cần giữ

- `public/`: mã website, thư viện, font và nhạc.
- `public/app-config.js`: cấu hình Firebase và thông tin của chủ website.
- `database.rules.json`: rules của Realtime Database.
- `firebase.json`, `tests/`, `scripts/check.mjs`: cấu hình và kiểm tra trên máy.
- `vercel.json`: cấu hình triển khai Vercel, phục vụ thư mục `public/`.
- `VALIDATION.md`: kết quả kiểm tra và phạm vi đã xác nhận.

## Chạy trên máy

Mở terminal trong thư mục `Nơi Ánh Trăng Rơi`:

```powershell
python -m http.server 8088 --bind 127.0.0.1 --directory public
```

Mở http://localhost:8088 . Ctrl+C để dừng.

## Tạo gói Vercel

```powershell
python scripts/package-vercel.py
```

File `Nơi Ánh Trăng Rơi - Vercel.zip` được tạo bên cạnh thư mục dự án.
ZIP chứa `index.html` ở gốc, dùng cho https://vercel.com/drop .
Để cập nhật project đã có, dùng luồng cập nhật của project đó hoặc CLI/Git;
không cần tạo project mới chỉ để đổi nội dung.
Nếu kết nối Git, đặt thư mục dự án này làm root; `vercel.json` đã trỏ đến `public/`.

## Kiểm tra mã và phân quyền

Cần Node.js và Java 21:

```powershell
npm ci
npm run check
npm test
```

Tests dùng project giả `demo-inlove-owned` và Firebase Emulator, không ghi vào database thật.
Sửa `public/app-config.js` để đổi Firebase, liên hệ, game hoặc QR donate.
Không thêm service account/private key vào file phía trình duyệt.

## Giới hạn

- Các trò chơi đồng bộ trạng thái giữa thành viên, chưa có máy chủ xác minh từng nước đi.
  Xu chỉ là xu ảo giải trí, không quy đổi hoặc rút tiền.
- Chưa có chống spam cấp máy chủ hoặc dọn tin tự động; giới hạn gửi hiện ở trình duyệt.
- Một phần hồ sơ, kỷ niệm và sticker lưu localStorage, không đồng bộ toàn bộ.
- Người dùng đã xác thực đều bật/tắt được hiệu ứng trái tim chung theo hành vi hiện tại.
- Dữ liệu thử trên Firebase được ghi rõ trong `VALIDATION.md`.
