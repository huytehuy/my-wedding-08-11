import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { getApps, initializeApp } from 'firebase/app';
import {
  RecaptchaVerifier,
  getAuth,
  onAuthStateChanged,
  signInWithPhoneNumber,
  signOut,
  type ConfirmationResult,
  type User,
} from 'firebase/auth';
import { FIREBASE } from '../../firebase.config';
import { buildInviteLink } from '../../guest-link';
import { WEDDING } from '../../wedding.config';

/** Một dòng log do trang thiệp / trang tạo link ghi (xem src/app/visit-log.ts) */
interface Entry {
  id: string;
  event: string;
  guest: string;
  detail: string;
  secs: number;
  session: string;
  url: string;
  referrer: string;
  ua: string;
  at: Date;
}

/** Gộp log theo từng khách */
interface GuestSummary {
  name: string;
  /** Số lần mở link (mỗi tab là một lần) */
  visits: number;
  last: Date;
  opened: boolean;
  /** Trang xa nhất đã xem, vd "8/9" */
  furthest: string;
  totalSecs: number;
  devices: string[];
  /** Link thiệp khách đã mở (lần gần nhất) */
  link: string;
  /** Mới nhất trước */
  entries: Entry[];
}

/** Một link đã tạo ở /tao-link và khách đã mở chưa */
interface CreatedLink {
  name: string;
  link: string;
  createdAt: Date;
  visits: number;
  lastVisit: Date | null;
  opened: boolean;
}

/** Giá trị một trường Firestore trả về qua REST API */
type FieldValue = { stringValue?: string; integerValue?: string; timestampValue?: string };

/** Số log tải về tối đa mỗi lần (mới nhất trước) */
const MAX_ENTRIES = 3000;

const app =
  getApps()[0] ??
  initializeApp({ apiKey: FIREBASE.apiKey, authDomain: FIREBASE.authDomain, projectId: FIREBASE.projectId });

@Component({
  selector: 'app-logs',
  imports: [FormsModule, RouterLink],
  templateUrl: './logs.html',
  styleUrls: ['../generator/generator.css', './logs.css'],
})
export class Logs {
  protected readonly w = WEDDING;

  private readonly auth = getAuth(app);
  private recaptcha?: RecaptchaVerifier;
  private confirmation?: ConfirmationResult;

  /** undefined = đang kiểm tra đăng nhập */
  protected readonly user = signal<User | null | undefined>(undefined);
  protected readonly signingIn = signal(false);
  protected readonly phone = signal('');
  protected readonly code = signal('');
  /** Đã gửi mã, đang chờ nhập mã */
  protected readonly codeSent = signal(false);

  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly loadedAt = signal<Date | null>(null);
  private readonly entries = signal<Entry[]>([]);

  /** Ẩn lượt mở thử (trên máy hoặc bấm "Mở thử" ở trang tạo link) */
  protected readonly hideTests = signal(true);
  protected readonly search = signal('');
  protected readonly expanded = signal<string | null>(null);

  /** Log của khách xem thiệp (không gồm log tạo link) */
  protected readonly visible = computed(() => {
    const q = this.search().trim().toLowerCase();
    return this.entries().filter(
      (e) =>
        e.event !== 'link' && (!this.hideTests() || !isTest(e)) && (!q || e.guest.toLowerCase().includes(q)),
    );
  });

  protected readonly guests = computed(() => summarize(this.visible()));

  protected readonly links = computed(() => {
    const q = this.search().trim().toLowerCase();
    const real = this.entries().filter((e) => e.event !== 'link' && !isTest(e));
    const byName = new Map<string, CreatedLink>();
    // entries mới nhất trước → duyệt ngược để giữ lần tạo đầu tiên
    for (const e of [...this.entries()].reverse()) {
      if (e.event !== 'link' || byName.has(e.guest.toLowerCase())) continue;
      if (q && !e.guest.toLowerCase().includes(q)) continue;
      const mine = real.filter((x) => x.guest.toLowerCase() === e.guest.toLowerCase());
      byName.set(e.guest.toLowerCase(), {
        name: e.guest,
        // Link thiệp nằm cùng tên miền với trang tạo link đã ghi log
        link: buildInviteLink(new URL('/', e.url || location.origin).href, e.guest),
        createdAt: e.at,
        visits: new Set(mine.map((x) => x.session)).size,
        lastVisit: mine[0]?.at ?? null,
        opened: mine.some((x) => x.event === 'open'),
      });
    }
    // Chưa ai mở lên đầu, rồi tới link mới tạo
    return [...byName.values()].sort(
      (a, b) => Number(!!a.visits) - Number(!!b.visits) || b.createdAt.getTime() - a.createdAt.getTime(),
    );
  });

  protected readonly stats = computed(() => {
    const g = this.guests();
    const l = this.links();
    return {
      links: l.length,
      clicked: l.filter((x) => x.visits).length,
      guests: g.length,
      opened: g.filter((x) => x.opened).length,
    };
  });

  protected readonly recent = computed(() => {
    const q = this.search().trim().toLowerCase();
    return this.entries()
      .filter((e) => (!this.hideTests() || e.event === 'link' || !isTest(e)) && (!q || e.guest.toLowerCase().includes(q)))
      .slice(0, 200);
  });

  constructor() {
    const stop = onAuthStateChanged(this.auth, (user) => {
      this.user.set(user);
      if (user) this.reload();
      else this.entries.set([]);
    });
    inject(DestroyRef).onDestroy(() => {
      stop();
      this.recaptcha?.clear();
    });
  }

  /**
   * Bước 1: gửi mã tới số điện thoại (chỉ các số trong FIREBASE.allowedPhones).
   * Các số này nằm trong "Phone numbers for testing" (Firebase Console → Authentication → Sign-in method → Phone)
   * nên Firebase không gửi SMS — mã là mã PIN cố định đặt ở đó.
   */
  protected async sendCode(): Promise<void> {
    const phone = toE164(this.phone());
    if (!(FIREBASE.allowedPhones as readonly string[]).includes(phone)) {
      this.error.set('Số điện thoại này không được xem log.');
      return;
    }
    this.signingIn.set(true);
    this.error.set('');
    try {
      this.recaptcha ??= new RecaptchaVerifier(this.auth, 'recaptcha', { size: 'invisible' });
      this.confirmation = await signInWithPhoneNumber(this.auth, phone, this.recaptcha);
      this.codeSent.set(true);
    } catch (e) {
      // reCAPTCHA chỉ dùng được một lần khi lỗi — tạo lại ở lần bấm sau
      this.recaptcha?.clear();
      this.recaptcha = undefined;
      this.error.set(authError(e));
    } finally {
      this.signingIn.set(false);
    }
  }

  /** Bước 2: nhập mã PIN */
  protected async confirmCode(): Promise<void> {
    if (!this.confirmation || !this.code().trim()) return;
    this.signingIn.set(true);
    this.error.set('');
    try {
      await this.confirmation.confirm(this.code().trim());
      this.code.set('');
      this.codeSent.set(false);
    } catch (e) {
      this.error.set(authError(e));
    } finally {
      this.signingIn.set(false);
    }
  }

  protected changePhone(): void {
    this.codeSent.set(false);
    this.code.set('');
    this.error.set('');
  }

  protected signOut(): void {
    signOut(this.auth);
    this.loadedAt.set(null);
    this.error.set('');
  }

  /** Đọc log mới nhất qua Firestore REST API (chỉ số điện thoại được phép mới đọc được — xem firestore.rules) */
  protected async reload(): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) return;
    this.loading.set(true);
    this.error.set('');
    const db = `projects/${FIREBASE.projectId}/databases/(default)/documents`;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`https://firestore.googleapis.com/v1/${db}:runQuery?key=${FIREBASE.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          structuredQuery: {
            from: [{ collectionId: FIREBASE.collection }],
            orderBy: [{ field: { fieldPath: 'at' }, direction: 'DESCENDING' }],
            limit: MAX_ENTRIES,
          },
        }),
      });
      if (!res.ok) throw new Error(res.status === 403 ? 'số này chưa có quyền đọc log trong firestore.rules' : `HTTP ${res.status}`);
      const rows: { document?: { name: string; fields: Record<string, FieldValue> } }[] = await res.json();
      this.entries.set(
        rows.flatMap(({ document: d }) => {
          if (!d) return [];
          const f = d.fields;
          return {
            id: d.name.split('/').pop() ?? d.name,
            event: f['event']?.stringValue ?? '',
            guest: f['guest']?.stringValue ?? '',
            detail: f['detail']?.stringValue ?? '',
            secs: Number(f['secs']?.integerValue ?? 0),
            session: f['session']?.stringValue ?? '',
            url: f['url']?.stringValue ?? '',
            referrer: f['referrer']?.stringValue ?? '',
            ua: f['ua']?.stringValue ?? '',
            at: new Date(f['at']?.timestampValue ?? 0),
          };
        }),
      );
      this.loadedAt.set(new Date());
    } catch (e) {
      this.error.set(`Không tải được log (${(e as Error).message || e}).`);
    } finally {
      this.loading.set(false);
    }
  }

  protected toggle(name: string): void {
    this.expanded.update((cur) => (cur === name ? null : name));
  }

  /** Hiện link dễ đọc: "?to=Cô+Chú+Hùng" thay vì "?to=C%C3%B4+Ch%C3%BA…" (href vẫn giữ nguyên) */
  protected prettyLink(url: string): string {
    try {
      return decodeURIComponent(url.replace(/\+/g, ' '));
    } catch {
      return url;
    }
  }

  protected readonly time = formatTime;
  protected readonly duration = formatDuration;
  protected readonly device = device;
  protected readonly label = label;
}

function summarize(entries: Entry[]): GuestSummary[] {
  const byGuest = new Map<string, Entry[]>();
  for (const e of entries) {
    const list = byGuest.get(e.guest);
    if (list) list.push(e);
    else byGuest.set(e.guest, [e]);
  }
  return [...byGuest].map(([name, list]) => {
    // Thời gian xem của mỗi lần mở = số giây lớn nhất ghi được trong lần đó
    const perSession = new Map<string, number>();
    for (const e of list) perSession.set(e.session, Math.max(perSession.get(e.session) ?? 0, e.secs));
    const pages = list
      .filter((e) => e.event === 'leave')
      .map((e) => e.detail.match(/^(\d+)\/(\d+)/))
      .filter((m) => !!m);
    const best = pages.sort((a, b) => Number(b[1]) - Number(a[1]))[0];
    return {
      name,
      visits: perSession.size,
      last: list[0].at,
      opened: list.some((e) => e.event === 'open'),
      furthest: best ? `${best[1]}/${best[2]}` : '',
      totalSecs: [...perSession.values()].reduce((a, b) => a + b, 0),
      devices: [...new Set(list.map((e) => device(e.ua)))],
      link: list.find((e) => e.event === 'visit')?.url ?? list[0].url,
      entries: list,
    };
  });
}

/** Lượt mở thử: chạy trên máy (localhost), hoặc tự bấm mở link từ trang tạo link / trang xem log */
function isTest(e: Entry): boolean {
  return (
    /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(e.url) ||
    e.referrer.includes('/tao-link') ||
    e.referrer.includes('/xem-log')
  );
}

/** "0366 889 853" / "84366889853" / "+84366889853" → "+84366889853" */
function toE164(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (raw.trim().startsWith('+')) return '+' + digits;
  if (digits.startsWith('0')) return '+84' + digits.slice(1);
  if (digits.startsWith('84')) return '+' + digits;
  return '+84' + digits;
}

function authError(e: unknown): string {
  const code = (e as { code?: string }).code ?? '';
  switch (code) {
    case 'auth/invalid-verification-code':
      return 'Mã không đúng.';
    case 'auth/billing-not-enabled':
    case 'auth/quota-exceeded':
      return 'Số này chưa có trong "Phone numbers for testing" của Firebase Console.';
    case 'auth/code-expired':
      return 'Mã đã hết hạn, bấm "Đổi số" rồi gửi lại.';
    case 'auth/too-many-requests':
      return 'Thử nhiều lần quá, đợi một lúc rồi thử lại.';
    case 'auth/operation-not-allowed':
      return 'Chưa bật đăng nhập bằng số điện thoại trong Firebase Console.';
    case 'auth/unauthorized-domain':
    case 'auth/captcha-check-failed':
      return `Tên miền ${location.hostname} chưa có trong Authorized domains của Firebase Console.`;
    default:
      return `Đăng nhập không được (${code || e}).`;
  }
}

const timeFormat = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

function formatTime(d: Date): string {
  return timeFormat.format(d);
}

function formatDuration(secs: number): string {
  if (secs < 60) return `${secs} giây`;
  const m = Math.floor(secs / 60);
  return m < 60 ? `${m} phút ${secs % 60} giây` : `${Math.floor(m / 60)} giờ ${m % 60} phút`;
}

/** "iPhone · Zalo", "Android · Messenger", "Windows"… */
function device(ua: string): string {
  const os = /iPhone/.test(ua)
    ? 'iPhone'
    : /iPad/.test(ua)
      ? 'iPad'
      : /Android/.test(ua)
        ? 'Android'
        : /Windows/.test(ua)
          ? 'Windows'
          : /Mac OS X/.test(ua)
            ? 'Mac'
            : 'Khác';
  const app = /Zalo/i.test(ua)
    ? 'Zalo'
    : /Messenger|FB_IAB\/MESSENGER/i.test(ua)
      ? 'Messenger'
      : /FBAN|FBAV|FB_IAB/.test(ua)
        ? 'Facebook'
        : /Instagram/.test(ua)
          ? 'Instagram'
          : '';
  return app ? `${os} · ${app}` : os;
}

function label(e: Entry): string {
  switch (e.event) {
    case 'link':
      return 'Tạo link';
    case 'visit':
      return 'Mở link';
    case 'open':
      return 'Mở phong bì';
    case 'music':
      return e.detail === 'off' ? 'Tắt nhạc' : 'Bật nhạc';
    case 'photo':
      return `Xem ảnh ${e.detail.replace(/\.\w+$/, '')}`;
    case 'leave':
      return `Rời trang · tới trang ${e.detail} · ${formatDuration(e.secs)}`;
    default:
      return e.event;
  }
}
