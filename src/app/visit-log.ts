import { Injectable } from '@angular/core';
import { FIREBASE } from './firebase.config';

/** Các sự kiện được ghi lại ('link' = tạo link ở /tao-link, còn lại là khách xem thiệp) */
export type LogEvent = 'link' | 'visit' | 'open' | 'music' | 'photo' | 'leave';

const SESSION_KEY = 'wedding-session';

/**
 * Ghi log vào Firestore qua REST API (không cần SDK Firebase cho nhẹ trang).
 * Mỗi sự kiện là một document trong collection `wedding_logs`; giờ ghi lấy theo máy chủ.
 * Lỗi mạng / chưa cấu hình thì bỏ qua, không ảnh hưởng thiệp.
 */
@Injectable({ providedIn: 'root' })
export class VisitLog {
  private readonly enabled = !!(FIREBASE.projectId && FIREBASE.apiKey);
  private readonly started = performance.now();
  private readonly session = sessionId();
  private guest = '';

  /** Gọi một lần khi mở thiệp, các sự kiện sau tự kèm tên khách */
  setGuest(guest: string): void {
    this.guest = guest;
  }

  log(event: LogEvent, detail = '', guest = this.guest): void {
    if (!this.enabled) return;
    const db = `projects/${FIREBASE.projectId}/databases/(default)/documents`;
    const fields = {
      event: str(event),
      guest: str(guest),
      detail: str(detail.slice(0, 100)),
      secs: { integerValue: String(Math.round((performance.now() - this.started) / 1000)) },
      session: str(this.session),
      url: str(location.href.slice(0, 500)),
      referrer: str(document.referrer.slice(0, 500)),
      ua: str(navigator.userAgent.slice(0, 300)),
      lang: str(navigator.language),
      screen: str(`${screen.width}x${screen.height}`),
    };
    const body = {
      writes: [
        {
          update: { name: `${db}/${FIREBASE.collection}/${randomId()}`, fields },
          // Giờ ghi lấy theo máy chủ Firestore (firestore.rules bắt buộc at == request.time)
          updateTransforms: [{ fieldPath: 'at', setToServerValue: 'REQUEST_TIME' }],
          currentDocument: { exists: false },
        },
      ],
    };
    fetch(`https://firestore.googleapis.com/v1/${db}:commit?key=${FIREBASE.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      // Vẫn gửi được khi khách đóng tab
      keepalive: true,
    }).catch(() => {});
  }
}

function str(value: string) {
  return { stringValue: value };
}

function randomId(): string {
  return crypto.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
}

/** Cùng một tab (kể cả tải lại trang) dùng chung một mã phiên */
function sessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) sessionStorage.setItem(SESSION_KEY, (id = randomId()));
    return id;
  } catch {
    return randomId();
  }
}
