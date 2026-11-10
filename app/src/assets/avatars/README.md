# Bộ avatar Ánh Trăng

16 nhân vật được chủ dự án duyệt trong cuộc trò chuyện, tạo bằng công cụ imagegen tích hợp.
Tách nguyên hình từ bảng được duyệt, không vẽ lại; mỗi ảnh WebP 288×288.

Định hướng prompt: 8 nam và 8 nữ trưởng thành, nét anime mềm, sơn dầu loang nhẹ,
tông tím trăng/kem/vàng nhạt; từng nhân vật khác nhau về tóc, mắt, kính, biểu cảm và trang phục.
Tham chiếu cổ phong được dùng làm cảm hứng; không sao chép chữ, logo hoặc QR trong ảnh tham khảo.

Nguồn bảng đã duyệt: `exec-dc72e2af-634d-4e5d-b83d-f59727b68f93.png`.
Script tách: `scripts/extract-avatar-assets.mjs <đường-dẫn-bảng-4x4.png>`.
`components-extra/avatar-presets.ts` nhập ảnh dạng data URI để tương thích schema avatar hiện có;
không lưu đường dẫn localhost hay tên miền triển khai vào hồ sơ.
