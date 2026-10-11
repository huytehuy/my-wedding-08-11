import { Component, DOCUMENT, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { buildInviteLink, cleanName } from '../../guest-link';
import { WEDDING } from '../../wedding.config';

interface Guest {
  name: string;
  at: number;
}

interface Saved {
  guests?: Guest[];
  base?: string;
  tpl?: string;
}

const STORAGE_KEY = 'wedding-links-v1';

const DEFAULT_TEMPLATE =
  `Trân trọng kính mời {ten} đến dự lễ thành hôn của ${WEDDING.groom} & ${WEDDING.bride}` +
  ` vào lúc ${WEDDING.timeText}, ${WEDDING.weekday} ${WEDDING.dateText} tại ${WEDDING.venueName}.\n` +
  `Thiệp mời: {link}`;

function load(): Saved {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') ?? {};
  } catch {
    return {};
  }
}

@Component({
  selector: 'app-generator',
  imports: [FormsModule, RouterLink],
  templateUrl: './generator.html',
  styleUrl: './generator.css',
})
export class Generator {
  protected readonly w = WEDDING;
  private readonly doc = inject(DOCUMENT);
  private readonly saved = load();
  private readonly defaultBase = this.doc.location.origin + '/';

  protected readonly prefixes = ['', 'Anh', 'Chị', 'Em', 'Bạn', 'Cô', 'Chú', 'Bác', 'Dì', 'Ông', 'Bà', 'Anh Chị', 'Cô Chú', 'Ông Bà', 'Gia đình'];
  protected readonly suffixes = ['', '& Người thương', '& Gia đình', '& Vợ', '& Chồng', '& Bạn đồng hành'];
  protected readonly bulkPlaceholder = 'Anh Nam & Người thương\nCô Chú Hùng\nChị Lan & Gia đình';
  protected readonly canShare = typeof navigator.share === 'function';

  protected readonly prefix = signal('Anh');
  protected readonly name = signal('');
  protected readonly suffix = signal('');
  protected readonly search = signal('');
  protected readonly base = signal(this.saved.base || this.defaultBase);
  protected readonly template = signal(this.saved.tpl || DEFAULT_TEMPLATE);
  protected readonly guests = signal<Guest[]>(Array.isArray(this.saved.guests) ? this.saved.guests : []);
  protected readonly toastText = signal('');
  protected readonly toastShow = signal(false);

  private readonly nameInput = viewChild.required<ElementRef<HTMLInputElement>>('nameInput');
  private toastTimer?: ReturnType<typeof setTimeout>;

  protected readonly fullName = computed(() => {
    const n = cleanName(this.name());
    return n ? cleanName(`${this.prefix()} ${n} ${this.suffix()}`) : '';
  });
  protected readonly link = computed(() => (this.fullName() ? buildInviteLink(this.base(), this.fullName()) : ''));
  protected readonly linkPlaceholder = computed(() =>
    this.fullName() ? 'Địa chỉ trang thiệp ở mục 4 chưa đúng' : 'Nhập tên khách để tạo link',
  );
  protected readonly filteredGuests = computed(() => {
    const q = cleanName(this.search()).toLowerCase();
    return q ? this.guests().filter((g) => g.name.toLowerCase().includes(q)) : this.guests();
  });

  constructor() {
    // Lưu lại trên trình duyệt mỗi khi danh sách / cài đặt thay đổi
    effect(() => {
      const data: Saved = { guests: this.guests() };
      if (this.base() !== this.defaultBase) data.base = this.base();
      if (this.template() !== DEFAULT_TEMPLATE) data.tpl = this.template();
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch {
        /* chế độ ẩn danh */
      }
    });
  }

  protected linkFor(name: string): string {
    return buildInviteLink(this.base(), name);
  }

  private message(name: string, link: string): string {
    return this.template().split('{ten}').join(name).split('{link}').join(link);
  }

  /** Thêm khách vào danh sách, trả về false nếu đã có. */
  private addGuest(name: string): boolean {
    const exists = this.guests().some((g) => g.name.toLowerCase() === name.toLowerCase());
    if (!exists) this.guests.update((list) => [{ name, at: Date.now() }, ...list]);
    return !exists;
  }

  protected remember(): void {
    if (this.link()) this.addGuest(this.fullName());
  }

  protected copyLink(): void {
    if (!this.link()) {
      this.nameInput().nativeElement.focus();
      return;
    }
    this.remember();
    this.copy(this.link(), 'Đã sao chép link');
  }

  protected copyMessage(): void {
    if (!this.link()) return;
    this.remember();
    this.copy(this.message(this.fullName(), this.link()), 'Đã sao chép lời mời');
  }

  protected share(): void {
    if (!this.link()) return;
    this.remember();
    navigator
      .share({
        title: `Thiệp mời cưới ${WEDDING.groom} & ${WEDDING.bride}`,
        text: this.message(this.fullName(), '').trim(),
        url: this.link(),
      })
      .catch(() => {});
  }

  protected copyGuest(name: string, withMessage: boolean): void {
    const link = this.linkFor(name);
    if (withMessage) this.copy(this.message(name, link), 'Đã sao chép lời mời');
    else this.copy(link, 'Đã sao chép link của ' + name);
  }

  protected removeGuest(name: string): void {
    this.guests.update((list) => list.filter((g) => g.name !== name));
  }

  protected addBulk(area: HTMLTextAreaElement): void {
    const lines = area.value.split(/\r?\n/).map(cleanName).filter(Boolean);
    if (!lines.length) {
      area.focus();
      return;
    }
    let added = 0;
    [...lines].reverse().forEach((n) => this.addGuest(n) && added++);
    area.value = '';
    this.showToast(added ? `Đã thêm ${added} khách` : 'Các khách này đã có trong danh sách');
  }

  protected clearAll(): void {
    const n = this.guests().length;
    if (n && confirm(`Xoá toàn bộ ${n} khách khỏi danh sách?`)) this.guests.set([]);
  }

  protected resetTemplate(): void {
    this.template.set(DEFAULT_TEMPLATE);
    this.showToast('Đã khôi phục mẫu mặc định');
  }

  protected exportCsv(): void {
    if (!this.guests().length) {
      this.showToast('Danh sách đang trống');
      return;
    }
    const cell = (s: string | number) => '"' + String(s).replace(/"/g, '""') + '"';
    const rows = [['STT', 'Tên khách', 'Link thiệp', 'Lời mời'].map(cell).join(',')];
    [...this.guests()].reverse().forEach((g, i) => {
      const link = this.linkFor(g.name);
      rows.push([i + 1, g.name, link, this.message(g.name, link)].map(cell).join(','));
    });
    const blob = new Blob(['﻿' + rows.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = this.doc.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'danh-sach-khach-moi.csv';
    this.doc.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  private copy(text: string, done: string): void {
    const write = navigator.clipboard && isSecureContext ? navigator.clipboard.writeText(text) : Promise.reject();
    write.catch(() => this.fallbackCopy(text)).then(() => this.showToast(done));
  }

  private fallbackCopy(text: string): void {
    const ta = this.doc.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    this.doc.body.appendChild(ta);
    ta.select();
    this.doc.execCommand('copy');
    ta.remove();
  }

  private showToast(msg: string): void {
    this.toastText.set(msg);
    this.toastShow.set(true);
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastShow.set(false), 1800);
  }
}
