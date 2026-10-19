/**
 * Thông tin đám cưới — dùng chung cho trang thiệp (/) và trang tạo link (/tao-link).
 * Muốn sửa chữ trên thiệp thì sửa ở đây.
 */
export const WEDDING = {
  groom: 'Bảo',
  bride: 'Hương',
  groomFull: 'Ngọc Bảo',
  brideFull: 'Cẩm Hương',
  groomFullName: 'Nguyễn Ngọc Bảo',
  brideFullName: 'Nguyễn Cẩm Hương',
  groomRank: 'Trưởng Nam',
  brideRank: 'Út Nữ',

  // Thời gian tiệc (giờ Việt Nam, UTC+7)
  dateISO: '2026-11-08T17:30:00+07:00',
  endISO: '2026-11-08T21:00:00+07:00',
  weekday: 'Chủ nhật',
  dateText: '08.11.2026',
  dateSlash: '08/11/2026',
  timeText: '17:30',
  lunarText: '(Tức ngày 30.09 Âm Lịch)',

  venueName: 'Trung tâm Hội nghị Tiệc cưới Golden Palace',
  venueHall: 'Sảnh 3 - KING ROOM',
  venueAddress: '04 - 06 Nguyễn Ái Quốc, P.Tam Hiệp, TP. Đồng Nai',
  mapQuery: 'Golden Palace, 04-06 Nguyễn Ái Quốc, Tam Hiệp, Biên Hòa, Đồng Nai',

  // Trang báo tin: bố mẹ hai bên (chữ "Ông Bà" in sẵn phía trên), nơi ở, lễ tại tư gia
  groomParents: ['Nguyễn Hữu Toàn', 'Võ Thị Hồng Lụa'],
  brideParents: ['Nguyễn Thành Tâm', 'Trần Thị Thu Nga'],
  groomHome: 'Phường Trảng Dài, TP Đồng Nai',
  brideHome: 'Phường Tam Hiệp, TP Đồng Nai',
  homeCeremony: 'Hôn lễ được cử hành tại tư gia',
  homeTime: '09:00',
  lunarFull: '(Nhằm ngày 30 Tháng 09 Năm Bính Ngọ)',

  /** Tên hiển thị khi link không kèm tên khách */
  defaultGuest: 'Quý khách',
  /** Tên tham số trên link: https://ten-mien/?to=Anh+Nam */
  guestParam: 'to',
} as const;

export type Wedding = typeof WEDDING;
