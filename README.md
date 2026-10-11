# Thiệp cưới Bảo & Hương · 08.11.2026

Thiệp mời cưới online viết bằng Angular, dựng lại từ thiệp PowerPoint thành trang cuộn có hiệu ứng.

| Đường dẫn | Dùng để |
|---|---|
| `/?to=Anh+Nam` | Thiệp mời, hiện tên khách lấy từ link |
| `/tao-link` | Tạo link riêng cho từng khách (cho cô dâu chú rể dùng) |

## Sửa nội dung

- Chữ trên thiệp (tên, ngày giờ, địa điểm, bố mẹ hai bên): `src/app/wedding.config.ts`
- Ảnh: `public/assets/img/` (thay file cùng tên là xong)
- Nhạc nền: `public/assets/audio/music.m4a`

## Chạy trên máy

Cần Node 24 trở lên.

```bash
npm install
npm start
```

Mở http://localhost:4200/tao-link

## Cấu trúc

```
src/app/
  wedding.config.ts          thông tin đám cưới
  guest-link.ts              tạo link / làm sạch tên khách
  shared/reveal.directive.ts hiệu ứng hiện dần khi cuộn ([data-reveal])
  pages/invite/              trang thiệp (/)
  pages/generator/           trang tạo link (/tao-link)
public/assets/               ảnh, nhạc
vercel.json                  cấu hình deploy (SPA rewrite cho /tao-link)
```

## Deploy lên Vercel

1. Vào https://vercel.com/new và import repo này.
2. Vercel tự nhận Angular, không cần chỉnh gì (cấu hình nằm sẵn trong `vercel.json`).
3. Sau khi deploy, mở `https://<ten-mien>/tao-link` để tạo link. Link tự dùng đúng tên miền đang mở và dùng được ngay.

Mỗi lần push lên nhánh `main`, Vercel sẽ tự build lại.

> Ảnh xem trước khi gửi link qua Zalo/Messenger lấy từ thẻ `og:image` trong `src/index.html`.
> Nếu tên miền Vercel khác `my-wedding-08-11.vercel.app`, hãy sửa lại đường dẫn đó.

## Ghi chú

- Danh sách khách ở `/tao-link` chỉ lưu trên trình duyệt đang dùng. Bấm **Tải file Excel (CSV)** để giữ lại.
- Trình duyệt chặn tự phát nhạc, nên nhạc bắt đầu khi khách chạm vào con dấu trên phong bì.
- Trang `/tao-link` không có mật khẩu; ai biết địa chỉ cũng mở được (chỉ tạo link, không sửa được thiệp).
