# Thiệp cưới Bảo & Hương · 08.11.2026

Thiệp mời cưới online viết bằng Angular, dựng lại y như thiệp PowerPoint (toạ độ, cách cắt ảnh, cỡ chữ và font lấy thẳng từ file pptx), dạng trang cuộn.

- Máy tính: mỗi slide là một khung 16:9 giống hệt slide.
- Điện thoại: các khối của slide xếp dọc, bố cục bên trong mỗi khối vẫn giữ như slide.
- Bấm con dấu để mở nắp phong bì; nhạc phát khi lướt tới trang 2 (đĩa than); bấm đĩa góc dưới bên phải để bật/tắt nhạc; bấm ảnh để xem lớn.

| Đường dẫn | Dùng để |
|---|---|
| `/?to=Anh+Nam` | Thiệp mời, hiện tên khách lấy từ link |
| `/tao-link` | Tạo link riêng cho từng khách (cho cô dâu chú rể dùng) |
| `/xem-log` | Xem link đã tạo, khách nào đã mở (đăng nhập bằng số điện thoại) |

## Sửa nội dung

- Chữ trên thiệp (tên, ngày giờ, địa điểm, bố mẹ hai bên, nơi ở, giờ lễ tại tư gia): `src/app/wedding.config.ts`
- Ảnh: `public/assets/img/` (thay file cùng tên là xong)
- Nhạc nền: `public/assets/audio/music.m4a`
- Font (tách từ pptx): `public/assets/fonts/`
- Vị trí các phần tử: `tools/gen-invite.py` chứa toạ độ lấy từ pptx và sinh ra
  `src/app/pages/invite/invite.html`. Sửa toạ độ thì chạy lại:

  ```bash
  python tools/gen-invite.py src/app/pages/invite/invite.html
  ```

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
  pages/invite/              trang thiệp (/) — invite.html sinh từ tools/gen-invite.py
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

## Ghi log khách xem thiệp (Firebase)

Thiệp và trang tạo link ghi log vào Firestore, collection `wedding_logs`. Ghi ngầm: lỗi thì bỏ qua,
khách không thấy gì.

| `event` | Khi nào | `detail` |
|---|---|---|
| `link` | Tạo link cho khách mới ở `/tao-link` | |
| `visit` | Khách mở link | |
| `open` | Bấm con dấu mở phong bì | |
| `music` | Bấm nút đĩa bật/tắt nhạc | `on` / `off` |
| `photo` | Bấm xem ảnh lớn | tên file ảnh |
| `leave` | Rời tab / tắt màn hình | trang xa nhất đã xem, vd `9/10 album` |

Mỗi dòng còn có: `guest` (tên khách trên link), `at` (giờ máy chủ), `secs` (số giây từ lúc mở trang),
`session` (cùng một lần xem), `url`, `referrer`, `ua` (máy/trình duyệt), `lang`, `screen`.

Cài đặt một lần:

1. Vào https://console.firebase.google.com → **Add project** (không cần bật Google Analytics).
2. **Build → Firestore Database → Create database**, chọn vùng `asia-southeast1`, chế độ **production**.
3. Tab **Rules**: dán nội dung file `firestore.rules` → **Publish**.
4. **Project settings → General → Your apps → Web (`</>`)**, đặt tên rồi chép `projectId` và `apiKey`
   vào `src/app/firebase.config.ts`.
5. Push lên `main` để Vercel build lại.

Xem log: mở `/xem-log` và đăng nhập. Trang liệt kê các link đã tạo (chưa ai mở / đã mở mấy lần),
từng khách đã xem thế nào (mở phong bì chưa, xem bao lâu, tới trang nào, máy gì) và hoạt động gần đây.
Lượt tự bấm mở link từ `/tao-link` hay `/xem-log` và lượt mở trên máy (localhost) không tính là khách mở.
Hoặc xem thô ở Firebase Console → Firestore Database → `wedding_logs`.

Đăng nhập `/xem-log` bằng số điện thoại + mã PIN cố định. Chỉ 0366889853 và 0832213838 vào được.
Hai số nằm trong Firebase Console → Authentication → Sign-in method → Phone → **Phone numbers for testing**
nên Firebase không gửi SMS (dự án chưa gắn billing cũng dùng được); mã PIN đặt/đổi ở đó.

Thêm/bớt số được vào thì sửa cả 3 chỗ:

1. `allowedPhones` trong `src/app/firebase.config.ts`
2. dòng `allow read` của `wedding_logs` trong `firestore.rules` (rồi Publish lại trên Firebase Console)
3. "Phone numbers for testing" trong Firebase Console

Tên miền mở `/xem-log` phải có trong Authentication → Settings → Authorized domains
(đã có `localhost` và `my-wedding-08-11.vercel.app`).

Để trống `projectId` thì không ghi log.

## Ghi chú

- Danh sách khách ở `/tao-link` chỉ lưu trên trình duyệt đang dùng. Bấm **Tải file Excel (CSV)** để giữ lại.
- Trình duyệt chặn tự phát nhạc, nên nhạc bắt đầu khi khách chạm vào con dấu trên phong bì.
- Trang `/tao-link` không có mật khẩu; ai biết địa chỉ cũng mở được (chỉ tạo link, không sửa được thiệp).
