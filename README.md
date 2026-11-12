# Nơi Ánh Trăng Rơi

Ứng dụng đang dùng nằm trong [`app/`](app/README.md): React + TypeScript + Vite + PWA.

## Chạy và kiểm tra

### Docker (môi trường dev tách biệt)

Cài Docker Desktop với Compose, sau đó chạy từ thư mục gốc:

```powershell
docker compose up --build
```

Mở http://127.0.0.1:5173. Compose chạy Vite với hot reload và Firebase Auth/Database Emulator trên localhost (cổng 9099/9000). `docker/app-config.js` dùng project demo và được gắn đè chỉ trong container; file cấu hình Firebase thật trong `app/public/` không đổi. Dữ liệu emulator chỉ nằm trong bộ nhớ và mất khi dừng container. Không dùng Compose này để triển khai production.

```powershell
docker compose exec app npm run check       # kiểm tra TypeScript
docker compose exec app npm run test:games  # kiểm tra luật game
docker compose run --rm rules-test          # kiểm tra Firebase Rules trong emulator riêng
docker compose down                         # dừng môi trường dev
```

Sau khi đổi `app/package-lock.json`, chạy `docker compose exec app npm ci` để cập nhật volume dependency; lần mở tiếp theo có thể dùng `docker compose up --build`. Xem `app/README.md` để chạy trực tiếp không qua Docker.

```powershell
cd app
npm ci
npm run dev
```

Mở http://127.0.0.1:5173 . Build production: `npm run build` trong `app/`.
Vercel qua Git: Root Directory `app`, Framework Vite, Output Directory `dist`.
Cấu hình website/Firebase đang dùng: `app/public/app-config.js`.

Ở thư mục gốc, `npm run check` kiểm tra ứng dụng React và JSON rules;
`npm test` kiểm tra phân quyền bằng Firebase Emulator (cần Java 21).
Xem [`app/VALIDATION.md`](app/VALIDATION.md) cho kết quả kiểm tra và giới hạn.

## Các phần còn giữ

| Đường dẫn | Vai trò |
|---|---|
| `app/` | Source, tài nguyên, cấu hình build/deploy và tests của ứng dụng |
| `database.rules.json`, `firebase.json` | Phân quyền dữ liệu và cấu hình emulator |
| `tests/database.test.mjs` | Kiểm thử Firebase Rules |
| `scripts/check.mjs` | Kiểm tra bản React hiện tại |
| `backend/` | Tài liệu và công cụ bảo trì rules |
| `mobile/` | Repository mobile riêng trên máy, không thuộc Git repository này |

Không thêm service account/private key vào frontend. Không dùng kiểm thử live để ghi dữ liệu thử lên Firebase thật.

## Lưu trữ bản cũ

Theo yêu cầu chủ dự án, bản HTML cũ, cấu hình/script Vercel cũ, báo cáo kiểm thử cũ,
ảnh tham khảo và ZIP cũ đã chuyển ra ngoài repository, tại:

`D:\AI\web-clone\Luu-tru-Noi-Anh-Trang-Roi-20261110`

Thư mục đó có `README.md` và `manifest.json` ghi vị trí cũ/mới cùng SHA-256 để khôi phục.
Đây là lưu trữ trên máy; bản source đã push trước đây cũng còn trong lịch sử Git.
Các đường dẫn `public/` ở tài liệu lịch sử hoặc hướng dẫn AI cũ là bản HTML đã lưu trữ;
nguồn đang chạy hiện tại luôn là `app/`.
