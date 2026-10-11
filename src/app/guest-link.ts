import { WEDDING } from './wedding.config';

/** Bỏ ký tự điều khiển / thẻ HTML, gộp khoảng trắng, giới hạn độ dài. */
export function cleanName(raw: string | null | undefined): string {
  return String(raw ?? '')
    .replace(/[\u0000-\u001f\u007f<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

/** Tạo link thiệp cho một khách, hoặc '' nếu địa chỉ gốc không hợp lệ. */
export function buildInviteLink(base: string, guest: string): string {
  let url: URL;
  try {
    url = new URL(base.trim());
  } catch {
    return '';
  }
  url.searchParams.set(WEDDING.guestParam, guest);
  return url.href;
}
