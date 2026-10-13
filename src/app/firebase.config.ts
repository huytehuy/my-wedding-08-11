/**
 * Firebase dùng để ghi log khách mở thiệp và link đã tạo (Firestore, collection `wedding_logs`).
 * Lấy ở Firebase Console → Project settings → General → Your apps → Web app (firebaseConfig).
 * Để trống projectId thì không ghi log.
 *
 * apiKey của Firebase web không phải mật khẩu — được phép để công khai.
 * Quyền do `firestore.rules` quyết định: khách chỉ thêm được log; chỉ các số điện thoại bên dưới đọc được log.
 */
export const FIREBASE = {
  projectId: 'allinone-f261e',
  apiKey: 'AIzaSyCMh_xBBY3DxfbBw-tqcDrzHPFpX2IG8WE',
  /** Dùng cho đăng nhập bằng số điện thoại ở trang /xem-log */
  authDomain: 'allinone-f261e.firebaseapp.com',
  /** Tên collection trong Firestore */
  collection: 'wedding_logs',
  /**
   * Số điện thoại được đăng nhập /xem-log (dạng +84…). Sửa ở đây thì sửa cả trong firestore.rules
   * và "Phone numbers for testing" trong Firebase Console (nơi đặt mã PIN).
   */
  allowedPhones: ['+84366889853', '+84832213838'],
} as const;
