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
import { UpperCasePipe } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { Reveal } from '../../shared/reveal.directive';
import { cleanName } from '../../guest-link';
import { WEDDING } from '../../wedding.config';

@Component({
  selector: 'app-invite',
  imports: [Reveal, UpperCasePipe],
  templateUrl: './invite.html',
  styleUrl: './invite.css',
  host: {
    '[class.is-open]': 'opened()',
    '(document:visibilitychange)': 'onVisibilityChange()',
    '(document:pointerdown)': 'onGesture($event)',
    '(document:touchend)': 'onGesture($event)',
    '(document:keydown)': 'onGesture($event)',
    '(document:keydown.escape)': 'viewing.set(null)',
  },
})
export class Invite {
  protected readonly w = WEDDING;
  private readonly doc = inject(DOCUMENT);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /** Tên khách lấy từ link, ví dụ /?to=Anh+Nam */
  protected readonly guest: string;

  protected readonly opened = signal(false);
  protected readonly playing = signal(false);
  /** Ảnh đang xem lớn (tên file trong assets/img) */
  protected readonly viewing = signal<string | null>(null);

  private readonly audio = viewChild.required<ElementRef<HTMLAudioElement>>('bgm');
  /** null = khách chưa bấm nút nhạc; true/false = khách đã tự bật/tắt */
  private wantMusic: boolean | null = null;
  /** Đã lướt tới trang 2 (đĩa than) — từ đây nhạc mới phát */
  private reachedStory = false;
  /** iPhone chỉ cho phát nhạc sau một lần chạm — lần chạm đầu "mở khoá" âm thanh */
  private unlocked = false;
  private unlocking = false;

  constructor() {
    const params = inject(ActivatedRoute).snapshot.queryParamMap;
    this.guest = cleanName(params.get(WEDDING.guestParam) ?? params.get('n')) || WEDDING.defaultGuest;
    inject(Title).setTitle(`Kính gửi ${this.guest} · Thiệp cưới ${WEDDING.groom} & ${WEDDING.bride}`);

    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      // Luôn mở thiệp từ trang bìa, kể cả khi tải lại trang
      if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
      scrollTo({ top: 0, behavior: 'instant' });

      // Lướt tới trang 2 thì bắt đầu phát nhạc
      const story = this.host.querySelector('.slide--story');
      if (!story) return;
      const io = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) return;
          io.disconnect();
          this.reachedStory = true;
          if (this.shouldPlay()) this.playMusic();
        },
        { threshold: 0.3 },
      );
      io.observe(story);
      destroyRef.onDestroy(() => io.disconnect());
    });
  }

  /** Bấm vào phong bì: con dấu bật ra, nắp lật mở */
  protected open(): void {
    this.opened.set(true);
  }

  protected view(file: string): void {
    this.viewing.set(file);
  }

  /** Bấm vào đĩa góc dưới bên phải: bật/tắt nhạc */
  protected toggleMusic(): void {
    const audio = this.audio().nativeElement;
    this.wantMusic = audio.paused || audio.muted;
    if (this.wantMusic) this.playMusic();
    else audio.pause();
  }

  /** Cập nhật trạng thái nút đĩa (bỏ qua lúc đang mở khoá im lặng) */
  protected onAudioEvent(): void {
    const audio = this.audio().nativeElement;
    if (!this.unlocking) this.playing.set(!audio.paused && !audio.muted);
  }

  protected onGesture(event: Event): void {
    // Bấm vào nút đĩa thì để toggleMusic() xử lý
    if ((event.target as Element | null)?.closest?.('.music')) return;
    if (!this.unlocked) this.unlock();
    // Lỡ trình duyệt chặn lúc lướt tới trang 2 thì phát ở lần chạm tiếp theo
    else if (this.shouldPlay() && this.audio().nativeElement.paused) this.playMusic();
  }

  protected onVisibilityChange(): void {
    if (this.doc.hidden) this.audio().nativeElement.pause();
    else if (this.shouldPlay()) this.playMusic();
  }

  private shouldPlay(): boolean {
    return this.wantMusic ?? this.reachedStory;
  }

  private playMusic(): void {
    const audio = this.audio().nativeElement;
    audio.muted = false;
    audio.play().then(
      () => (this.unlocked = true),
      () => {},
    );
  }

  /** Phát im lặng rồi dừng ngay trong lúc khách chạm, để về sau được phép phát nhạc. */
  private unlock(): void {
    if (this.shouldPlay()) {
      this.playMusic();
      return;
    }
    const audio = this.audio().nativeElement;
    this.unlocking = true;
    audio.muted = true;
    audio
      .play()
      .then(() => {
        this.unlocked = true;
        if (!this.shouldPlay()) {
          audio.pause();
          audio.currentTime = 0;
        }
      })
      .catch(() => {})
      .finally(() => {
        audio.muted = false;
        this.unlocking = false;
        this.onAudioEvent();
      });
  }
}
