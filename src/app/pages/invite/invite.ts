import { Component, DOCUMENT, ElementRef, afterNextRender, inject, signal, viewChild } from '@angular/core';
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
    '(document:pointerdown)': 'onFirstInteraction($event)',
    '(document:keydown)': 'onFirstInteraction($event)',
    '(document:keydown.escape)': 'viewing.set(null)',
  },
})
export class Invite {
  protected readonly w = WEDDING;
  private readonly doc = inject(DOCUMENT);

  /** Tên khách lấy từ link, ví dụ /?to=Anh+Nam */
  protected readonly guest: string;

  protected readonly opened = signal(false);
  protected readonly playing = signal(false);
  /** Ảnh đang xem lớn (tên file trong assets/img) */
  protected readonly viewing = signal<string | null>(null);

  private readonly audio = viewChild.required<ElementRef<HTMLAudioElement>>('bgm');
  /** null = khách chưa bấm gì; true/false = khách đã bật/tắt nhạc */
  private wantMusic: boolean | null = null;

  constructor() {
    const params = inject(ActivatedRoute).snapshot.queryParamMap;
    this.guest = cleanName(params.get(WEDDING.guestParam) ?? params.get('n')) || WEDDING.defaultGuest;
    inject(Title).setTitle(`Kính gửi ${this.guest} · Thiệp cưới ${WEDDING.groom} & ${WEDDING.bride}`);

    afterNextRender(() => {
      // Luôn mở thiệp từ trang bìa, kể cả khi tải lại trang
      if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
      scrollTo({ top: 0, behavior: 'instant' });
      // Thử phát nhạc ngay; nếu trình duyệt chặn thì phát ở lần chạm đầu tiên
      this.playMusic();
    });
  }

  /** Bấm vào phong bì: con dấu bật ra, nắp lật mở */
  protected open(): void {
    this.opened.set(true);
    this.wantMusic = true;
    this.playMusic();
  }

  protected view(file: string): void {
    this.viewing.set(file);
  }

  /** Bấm vào đĩa góc dưới bên phải: bật/tắt nhạc */
  protected toggleMusic(): void {
    const audio = this.audio().nativeElement;
    this.wantMusic = audio.paused;
    if (this.wantMusic) this.playMusic();
    else audio.pause();
  }

  protected onFirstInteraction(event: Event): void {
    // Bấm vào nút đĩa thì để toggleMusic() xử lý
    if ((event.target as Element | null)?.closest?.('.music')) return;
    if (this.wantMusic === null && this.audio().nativeElement.paused) this.playMusic();
  }

  protected onVisibilityChange(): void {
    if (this.doc.hidden) this.audio().nativeElement.pause();
    else if (this.wantMusic) this.playMusic();
  }

  private playMusic(): void {
    this.audio().nativeElement.play().catch(() => {});
  }
}
