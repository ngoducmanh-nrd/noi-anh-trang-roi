# Phạm vi bản React

Chủ dự án đã yêu cầu riêng đợt nâng cấp React + TypeScript + PWA và phân công nhiều agent.
Trong `app/`, được phép sửa React, TypeScript, CSS, cấu hình build, dependency và tests cần thiết
cho bản nâng cấp này. Quy định chỉ sửa CSS/HTML của đợt giao diện cũ không áp dụng cho đợt React đã được yêu cầu.

- Làm việc trong `app/`; bản HTML `../public/` là bản đối chiếu, không ghi đè.
- Bảo toàn Firebase project, đường dẫn dữ liệu và hợp đồng trong `../database.rules.json`.
- Không tự Publish rules, ghi dữ liệu thử thật, push hay deploy.
- Kiểm thử đa người dùng bằng emulator `demo-inlove-owned` trên localhost.
- Không cache tin nhắn/xác thực vào service worker. Cấu hình Firebase Web App là công khai;
  tuyệt đối không thêm service account, admin token hay private key vào frontend.
- Giữ cùng Firebase app `[DEFAULT]` để không tự đổi danh tính Anonymous khi chuyển bản trên cùng origin.
- Không dùng obfuscation trên source đang phát triển. Build production được nén và không có source map.
- Đọc `README.md` để chạy/check/build/tests. Khi nhiều agent cùng làm, phân quyền theo file và không ghi đè nhau.
- SVG icon là mã tự dựng; tôn trọng giảm chuyển động, focus bàn phím và layout 360–1440px.
- Cập nhật `VALIDATION.md` với kết quả đã chạy, không tuyên bố có chống spam/chống gian lận phía server khi chưa làm.
