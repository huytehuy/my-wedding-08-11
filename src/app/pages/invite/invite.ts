import {
  Component,
  DestroyRef,
  DOCUMENT,
  ElementRef,
  afterNextRender,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { DomSanitizer, Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { Reveal } from '../../shared/reveal.directive';
import { cleanName } from '../../guest-link';
import { WEDDING } from '../../wedding.config';

interface Photo {
  src: string;
  alt: string;
}

interface Countdown {
  d: string;
  h: string;
  m: string;
  s: string;
}

const pad = (n: number) => (n < 10 ? '0' + n : String(n));
const gcalDate = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

@Component({
  selector: 'app-invite',
  imports: [Reveal],
  templateUrl: './invite.html',
  styleUrl: './invite.css',
  host: {
    '[class.is-open]': 'opened()',
    '(document:visibilitychange)': 'onVisibilityChange()',
    '(document:keydown.escape)': 'lightbox.set(null)',
  },
})
export class Invite {
  protected readonly w = WEDDING;
  private readonly doc = inject(DOCUMENT);
  private readonly reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /** Tên khách lấy từ link, ví dụ /?to=Anh+Nam */
  protected readonly guest: string;

  protected readonly opened = signal(false);
  protected readonly playing = signal(false);
  protected readonly lightbox = signal<Photo | null>(null);
  protected readonly bursts = signal<{ id: number; style: Record<string, string> }[]>([]);
  protected readonly countdown = signal<Countdown | null>(null);
  protected readonly countdownDoneText = signal('');

  private readonly audio = viewChild.required<ElementRef<HTMLAudioElement>>('bgm');
  private readonly hero = viewChild.required<ElementRef<HTMLElement>>('hero');
  private readonly seal = viewChild.required<ElementRef<HTMLElement>>('seal');
  private wantMusic = false;

  protected readonly photos: Photo[] = [
    { src: 'assets/img/photo-2.webp', alt: 'Ảnh cưới 1' },
    { src: 'assets/img/photo-1.webp', alt: 'Ảnh cưới 2' },
    { src: 'assets/img/photo-3.webp', alt: 'Ảnh cưới 3' },
  ];

  protected readonly sparkles = this.reduceMotion
    ? []
    : Array.from({ length: innerWidth < 600 ? 14 : 24 }, () => ({
        left: Math.random() * 100 + '%',
        top: Math.random() * 100 + '%',
        '--s': 6 + Math.random() * 12 + 'px',
        '--t': 3 + Math.random() * 4 + 's',
        '--dl': Math.random() * 6 + 's',
      }));

  private readonly mapQ = encodeURIComponent(WEDDING.mapQuery);
  protected readonly mapUrl = 'https://www.google.com/maps/search/?api=1&query=' + this.mapQ;
  protected readonly mapEmbedUrl = inject(DomSanitizer).bypassSecurityTrustResourceUrl(
    'https://maps.google.com/maps?q=' + this.mapQ + '&z=16&output=embed',
  );
  protected readonly calendarUrl: string;

  constructor() {
    const params = inject(ActivatedRoute).snapshot.queryParamMap;
    this.guest = cleanName(params.get(WEDDING.guestParam) ?? params.get('n')) || WEDDING.defaultGuest;

    inject(Title).setTitle(`Kính gửi ${this.guest} · Thiệp cưới ${WEDDING.groom} & ${WEDDING.bride}`);

    this.calendarUrl =
      'https://calendar.google.com/calendar/render?action=TEMPLATE' +
      '&text=' + encodeURIComponent(`Đám cưới ${WEDDING.groom} & ${WEDDING.bride}`) +
      '&dates=' + gcalDate(WEDDING.dateISO) + '/' + gcalDate(WEDDING.endISO) +
      '&location=' + encodeURIComponent(`${WEDDING.venueName}, ${WEDDING.venueHall}, ${WEDDING.venueAddress}`) +
      '&details=' + encodeURIComponent(`Trân trọng kính mời ${this.guest} đến chung vui cùng gia đình chúng tôi.`);

    // Khoá cuộn cho tới khi khách mở phong bì
    this.doc.body.classList.add('is-locked');

    this.tick();
    const timer = setInterval(() => this.tick(), 1000);

    inject(DestroyRef).onDestroy(() => {
      clearInterval(timer);
      this.doc.body.classList.remove('is-locked');
    });

    afterNextRender(() => scrollTo(0, 0));
  }

  protected open(): void {
    if (this.opened()) return;
    this.opened.set(true);
    this.doc.body.classList.remove('is-locked');
    this.burst();
    this.wantMusic = true;
    this.playMusic();
  }

  protected toggleMusic(): void {
    const audio = this.audio().nativeElement;
    if (audio.paused) {
      this.wantMusic = true;
      this.playMusic();
    } else {
      this.wantMusic = false;
      audio.pause();
    }
  }

  protected onVisibilityChange(): void {
    if (this.doc.hidden) this.audio().nativeElement.pause();
    else if (this.wantMusic) this.playMusic();
  }

  protected scrollTo(event: Event, id: string): void {
    event.preventDefault();
    this.doc.getElementById(id)?.scrollIntoView({ behavior: this.reduceMotion ? 'auto' : 'smooth' });
  }

  private playMusic(): void {
    // Trình duyệt có thể chặn tự phát — khi đó khách bấm nút nhạc.
    this.audio().nativeElement.play().catch(() => {});
  }

  private burst(): void {
    if (this.reduceMotion) return;
    const hr = this.hero().nativeElement.getBoundingClientRect();
    const sr = this.seal().nativeElement.getBoundingClientRect();
    const cx = sr.left + sr.width / 2 - hr.left;
    const cy = sr.top + sr.height / 2 - hr.top;
    const parts = Array.from({ length: 18 }, (_, i) => {
      const a = (Math.PI * 2 * i) / 18 + Math.random() * 0.3;
      const r = 80 + Math.random() * 120;
      return {
        id: i,
        style: {
          left: cx + 'px',
          top: cy + 'px',
          '--x': Math.cos(a) * r + 'px',
          '--y': Math.sin(a) * r + 'px',
        },
      };
    });
    this.bursts.set(parts);
    setTimeout(() => this.bursts.set([]), 1300);
  }

  private tick(): void {
    const diff = new Date(WEDDING.dateISO).getTime() - Date.now();
    if (diff <= 0) {
      this.countdown.set(null);
      this.countdownDoneText.set(
        diff > -86_400_000 ? 'Hôm nay là ngày vui của chúng mình!' : 'Cảm ơn bạn đã đến chung vui!',
      );
      return;
    }
    const s = Math.floor(diff / 1000);
    this.countdown.set({
      d: pad(Math.floor(s / 86400)),
      h: pad(Math.floor((s % 86400) / 3600)),
      m: pad(Math.floor((s % 3600) / 60)),
      s: pad(s % 60),
    });
  }
}
