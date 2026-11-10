# Giao diện ứng dụng · Nơi Ánh Trăng Rơi

Đợt này được chủ dự án yêu cầu sau khi xem năm ảnh ứng dụng 12Vibe trong `ảnh tham khảo/`.
Áp dụng skill `D:/SKILL code/ui-ux-pro-max-final/ui-ux-pro-max/SKILL.md`:
ưu tiên nội dung trên mobile, năm tab, thao tác chạm, nút quay lại, safe area, tương phản và giảm chuyển động.

## Quyết định thiết kế

- Giữ font Be Vietnam Pro, hai theme tím trăng và bộ avatar anime đã duyệt.
- Trang chủ là màn sử dụng: hồ sơ/xu, banner trăng ngang, hai hành động Phòng đôi/Tìm người,
  rồi danh sách Chat chung/Kỷ niệm/Một chút vui. Không đưa tính năng chưa có từ ảnh tham khảo vào app.
- Hồ sơ là thẻ nhận diện và nhóm mục; form sửa nằm ở `/profile/edit`, nút quay lại về `/profile`.
- Chat chung nằm ở `/chat`, có nút quay lại và Escape; giữ subscription, cách gửi và trạng thái chưa đọc.
  Header có lối vào chat trên mobile. Trong chat và màn phòng đang tham gia, ẩn tab dưới trên mobile.
- Desktop giữ sidebar; mobile giữ header và năm tab. Bỏ footer giới thiệu trong khung ứng dụng.
- CSS bổ sung ở `src/app-interface.css`, dùng token theme và khoảng cách bội số 4/8.

## Cách dùng kết quả skill

Đã chạy truy vấn design system `couple relationship mobile app` với density 8.
Kết quả màu hồng/landing hero + testimonials không phù hợp định hướng đêm trăng của chủ dự án,
nên không áp dụng phần đó. Dùng kết quả đúng ngữ cảnh từ domain `web`:
`mobile tab bar navigation` (Bottom Tabs, Back Behavior, Modal Escape), cùng checklist của skill.
Đã đọc `references/pro-rules.md` và mục 1–3 của `references/quick-reference.md`.

Backend, schema, rules và cấu hình triển khai không thuộc đợt này.

## Bổ sung Hỗ trợ & góp ý — 2026-11-11

Theo yêu cầu mới, hỗ trợ là chat riêng ngay trong website, có hộp thư nhận/trả lời của quản trị.
Phần chức năng này có Firebase service và Rules riêng; không triển khai quản lý/xóa phòng cùng lúc.

- Giữ theme/font/icon hiện có; không đổi toàn bộ định hướng hoặc thêm CDN/dependency.
- Desktop giữ nhóm điều hướng chính và thêm nhóm Tiện ích & hỗ trợ (Một chút vui, Hỗ trợ & góp ý).
  Sidebar cuộn được ở màn thấp. Mobile giữ 5 tab, đặt tiện ích trong Cá nhân; trang hỗ trợ là màn chi tiết.
- `/support` là một cuộc trò chuyện, 3 lựa chọn nội dung, cảnh báo không gửi bí mật; không dựng
  trạng thái online, thời gian phản hồi hoặc biên nhận đã đọc giả. `/support/inbox` có danh sách
  và khung trả lời trên desktop; mobile chọn danh sách rồi vào chat, Back về đúng danh sách.
- Quyền quản trị được Rules kiểm tra bằng `supportAdmins/{uid}`, không dựa vào nút ẩn hoặc localStorage.
  Trang bị chặn có mục thiết lập dành cho chủ website để sao chép UID; không cho tự cấp quyền.
- Truy vấn design-system cho support trả ra hero/testimonials và màu hồng không phù hợp, không áp dụng.
  Truy vấn product hẹp hơn gần mô hình inbox/email tối giản; chỉ dùng nguyên tắc danh sách + cuộc trò chuyện.
  Giữ hướng đêm trăng đã duyệt. UX search dùng Back Button, Sticky Navigation và Mobile Keyboards;
  áp dụng nút Back rõ, không thêm tab thứ sáu, composer không bị menu che trên điện thoại.
