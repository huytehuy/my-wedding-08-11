import { DestroyRef, Directive, ElementRef, Injectable, afterNextRender, inject } from '@angular/core';

/** Một IntersectionObserver dùng chung cho mọi phần tử [data-reveal]. */
@Injectable({ providedIn: 'root' })
export class RevealObserver {
  private readonly watchers = new Map<Element, Element[]>();
  private io?: IntersectionObserver;

  watch(el: Element): void {
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion || !('IntersectionObserver' in window)) {
      el.classList.add('is-in');
      return;
    }
    this.io ??= new IntersectionObserver((entries) => this.onIntersect(entries), {
      threshold: 0.18,
      rootMargin: '0px 0px -6% 0px',
    });
    // Chữ "viết tay" bị clip-path che hết nên observer không thấy nó —
    // theo dõi phần tử cha thay vào đó.
    const trigger = el.getAttribute('data-reveal') === 'write' && el.parentElement ? el.parentElement : el;
    const list = this.watchers.get(trigger);
    if (list) list.push(el);
    else this.watchers.set(trigger, [el]);
    this.io.observe(trigger);
  }

  unwatch(el: Element): void {
    for (const [trigger, list] of this.watchers) {
      const next = list.filter((x) => x !== el);
      if (next.length === list.length) continue;
      if (next.length) this.watchers.set(trigger, next);
      else {
        this.watchers.delete(trigger);
        this.io?.unobserve(trigger);
      }
    }
  }

  private onIntersect(entries: IntersectionObserverEntry[]): void {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      this.watchers.get(e.target)?.forEach((el) => el.classList.add('is-in'));
      this.watchers.delete(e.target);
      this.io?.unobserve(e.target);
    }
  }
}

/**
 * Hiện dần phần tử khi cuộn tới. Kiểu hiệu ứng lấy từ giá trị data-reveal
 * (up, down, left, right, zoom, blur, write, ...) và được định nghĩa trong CSS.
 */
@Directive({ selector: '[data-reveal]' })
export class Reveal {
  constructor() {
    const el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const observer = inject(RevealObserver);
    afterNextRender(() => observer.watch(el));
    inject(DestroyRef).onDestroy(() => observer.unwatch(el));
  }
}
