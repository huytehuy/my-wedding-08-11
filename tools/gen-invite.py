"""Sinh src/app/pages/invite/invite.html từ toạ độ lấy trong pptx.

Toạ độ slide: x, w theo % chiều rộng slide; y, h theo % chiều cao slide.
Mỗi "cmp" (khối) có bbox riêng; phần tử con được quy về % của khối,
cỡ chữ quy về cqw của khối -> khối co giãn mà bố cục bên trong giữ y slide.
"""
import sys

def f(v):
    s = ('%.3f' % v).rstrip('0').rstrip('.')
    return '0' if s in ('-0', '') else s

SZ = lambda sz: sz / 1440          # cỡ chữ pptx (1/100 pt) -> cqw của slide
TITLE = dict(fs=SZ(8982), ls=SZ(817), lh=SZ(8892))
BODY = dict(fs=SZ(4643), ls=SZ(422), lh=SZ(4318))
THANKS = dict(fs=SZ(4227), ls=SZ(384), lh=SZ(3931))


def img(cls, src, x, y, w, h, rot=0, crop=None, alt='', reveal='fade', d=None, view=None):
    """view: tên ảnh mở to khi bấm vào"""
    extra = """ (click)="view('%s')\"""" % view if view else ''
    return dict(kind='img', cls=cls, src=src, x=x, y=y, w=w, h=h, rot=rot, crop=crop, alt=alt,
                reveal=reveal, d=d, extra=extra)


def txt(cls, x, y, w, lines, fs, lh, ls=0, align='c', reveal='up', d=None, wrap=False, h=None):
    return dict(kind='txt', cls=cls, x=x, y=y, w=w, h=h, lines=lines, fs=fs, lh=lh, ls=ls, align=align,
                reveal=reveal, d=d, wrap=wrap)


def raw(html, x, y, w, h):
    return dict(kind='raw', html=html, x=x, y=y, w=w, h=h)


def cmp(cls, x, y, w, h, kids, reveal=None, d=None, rot=0, inner_open='', inner_close=''):
    return dict(cls=cls, x=x, y=y, w=w, h=h, kids=kids, reveal=reveal, d=d, rot=rot,
                inner_open=inner_open, inner_close=inner_close)


def render_cmp(c, ind='    '):
    bx, by, bw, bh = c['x'], c['y'], c['w'], c['h']
    ar = bw * 16 / (bh * 9)
    style = '--x:%s;--y:%s;--w:%s;--ar:%s' % (f(bx), f(by), f(bw), f(ar))
    if c['rot']:
        style += ';--r:%sdeg' % f(c['rot'])
    if c['d'] is not None:
        style += ';--d:%ss' % f(c['d'])
    extra = ' data-reveal="%s"' % c['reveal'] if c['reveal'] else ''
    out = ['%s<div class="cmp %s" style="%s"%s>' % (ind, c['cls'], style, extra)]
    if c['inner_open']:
        out.append(ind + '  ' + c['inner_open'])
    for k in c['kids']:
        rx = (k['x'] - bx) / bw * 100
        ry = (k['y'] - by) / bh * 100
        rw = k['w'] / bw * 100
        if k['kind'] == 'raw':
            rh = k['h'] / bh * 100
            out.append('%s  <div class="el" style="--x:%s;--y:%s;--w:%s;--h:%s">%s</div>' % (ind, f(rx), f(ry), f(rw), f(rh), k['html']))
            continue
        attrs = []
        if k['reveal']:
            attrs.append('data-reveal="%s"' % k['reveal'])
        st = '--x:%s;--y:%s;--w:%s' % (f(rx), f(ry), f(rw))
        if k.get('h') is not None:
            st += ';--h:%s' % f(k['h'] / bh * 100)
        if k.get('rot'):
            st += ';--r:%sdeg' % f(k['rot'])
        if k.get('d') is not None:
            st += ';--d:%ss' % f(k['d'])
        if k['kind'] == 'img':
            if k['crop']:
                l, t, r, b = k['crop']
                st += ';--cl:%s;--ct:%s;--cr:%s;--cb:%s' % (f(l), f(t), f(r), f(b))
                out.append('%s  <div class="el crop %s" style="%s" %s%s><img src="assets/img/%s" alt="%s" /></div>'
                           % (ind, k['cls'], st, ' '.join(attrs), k['extra'], k['src'], k['alt']))
            else:
                out.append('%s  <img class="el %s" src="assets/img/%s" alt="%s" style="%s" %s%s />'
                           % (ind, k['cls'], k['src'], k['alt'], st, ' '.join(attrs), k['extra']))
        else:
            fs = k['fs'] * 100 / bw
            lh = k['lh'] * 100 / bw
            ls = k['ls'] * 100 / bw
            st += ';--fs:%s;--lh:%s;--ls:%s' % (f(fs), f(lh), f(ls))
            cls = 'el t t--%s%s %s' % (k['align'], ' t--wrap' if k['wrap'] else '', k['cls'])
            body = ''.join('<span class="ln">%s</span>' % ln for ln in k['lines'])
            out.append('%s  <p class="%s" style="%s" %s>%s</p>' % (ind, cls.strip(), st, ' '.join(attrs), body))
    if c['inner_close']:
        out.append(ind + '  ' + c['inner_close'])
    out.append(ind + '</div>')
    return '\n'.join(out)


slides = []

# ---------- 1 · BÌA ----------
env_inner = '''<button class="env" type="button" aria-label="Mở thiệp" (click)="open()" [disabled]="opened()">
        <img class="env__body" src="assets/img/envelope-body.webp" alt="" />
        <span class="env__inside" aria-hidden="true"></span>
        <span class="env__flap" aria-hidden="true">
          <img class="env__flap-front" src="assets/img/envelope.webp" alt="" />
          <span class="env__flap-back"></span>
        </span>
        <img class="env__seal" src="assets/img/envelope.webp" alt="" />
      </button>'''
slides.append(('hero', 'Bìa', [
    cmp('c-head', 18.54, 9.19, 62.92, 45.81, [
        txt('script hero__title', 18.54, 9.19, 62.92, ['<span class="write">Lễ thành hôn</span>'],
            fs=SZ(15165), lh=SZ(21231), reveal=None),
        img('intro intro--1', 'date-oval.webp', 42.06, 30.42, 14.55, 8.04, reveal=None),
        txt('intro intro--1', 41.91, 30.13, 14.86, ['{{ w.dateText }}'], fs=SZ(4867), lh=SZ(6814), reveal=None),
        txt('intro intro--2', 34.07, 39.44, 31.87, ['{{ w.groom | uppercase }} &amp; {{ w.bride | uppercase }}'],
            fs=SZ(6658), lh=SZ(6525), ls=SZ(346), reveal=None),
    ]),
    cmp('c-envelope', 29.43, 58.53, 39.82, 47.23, [], rot=-6.64, inner_open=env_inner),
]))

# ---------- 2 · CÂU CHUYỆN ----------
slides.append(('story', 'Câu chuyện', [
    cmp('c-story-text', 4.41, 40.17, 31.12, 19.89, [
        txt('', 4.41, 40.17, 31.12, ['NĂM ẤY, LẦN ĐẦU TIÊN CHÚNG TA GẶP NHAU', 'VÀ VIẾT NÊN CÂU CHUYỆN TÌNH ĐẸP'],
            fs=SZ(2588), lh=SZ(2407), ls=SZ(235)),
        img('', 'waveform.gif', 8.83, 44.60, 22.29, 15.46, d=.3),
    ]),
    cmp('c-record', 36.58, 16.92, 55.88, 66.16, [
        img('', 'vinyl.webp', 61.76, 22.67, 30.70, 54.67),
        img('', 'record-sleeve.webp', 36.58, 16.92, 33.52, 66.16, crop=(-10.905, -0.978, -57.662, 0)),
        img('zoomable', 'photo-story.webp', 38.05, 19.41, 30.58, 61.18, crop=(0, -18.415, 0, -14.861),
            alt="{{ w.groom }} và {{ w.bride }}", d=.2, view='photo-story.webp'),
    ]),
]))

# ---------- 3 · LỜI NHẮN ----------
QUOTE = ('Chỉ cần là đúng người, muộn một chút cũng không sao. Thật may mắn vì chúng ta đã tìm thấy nhau vào '
         'những tháng năm rực rỡ nhất. Cảm ơn bạn vì đã luôn ở đây, đồng hành và minh chứng cho tình yêu của chúng mình.')
slides.append(('quote', 'Lời nhắn', [
    cmp('c-quote', 0, 0, 100, 100, [
        img('', 'ticket.svg', 14.29, 12.95, 71.42, 74.11),
        img('', 'bow.webp', 2.83, 6.36, 32.04, 87.28, d=.2),
        img('', 'rose.webp', 65.91, 61.59, 46.28, 88.66, rot=-37.95, d=.3),
        txt('quote__text', 34.87, 34.35, 36.76, [QUOTE], fs=SZ(3722), lh=SZ(3685), ls=SZ(338), align='l', wrap=True),
    ]),
]))

# ---------- 4 · CÔ DÂU CHÚ RỂ ----------
slides.append(('couple', 'Cô dâu chú rể', [
    cmp('c-frame', 32.82, 16.44, 34.36, 70.61, [
        # pptx: ảnh ở 7.375/10.618/86.198/78.763 % khung, nhưng lỗ của khung bắt đầu ở 6.94% -> hở 1 vệt nền.
        # Đặt ảnh dưới khung, mở rộng tới 6.6–94.2% x 11.8–88.4% (giữ nguyên vị trí nội dung ảnh)
        img('zoomable', 'photo-couple.webp', 32.82 + 34.36 * .066, 16.44 + 70.61 * .118, 34.36 * .876, 70.61 * .766,
            crop=(0, -45.89, -14.35, -38.29), alt="{{ w.groom }} và {{ w.bride }}", reveal=None,
            view='photo-couple.webp'),
        img('no-pe', 'gold-frame.webp', 32.82, 16.44, 34.36, 70.61, crop=(-7.47, 0, -7.47, 0), reveal=None),
    ], reveal='fade'),
    cmp('c-name c-name--groom', 2.72, 38.17, 30.10, 24.36, [
        txt('hand', 2.72, 38.17, 30.10, ['{{ w.groom }}'], fs=SZ(14609), lh=SZ(20453), d=.2),
    ]),
    cmp('c-name c-name--bride', 67.18, 36.47, 33.47, 24.27, [
        txt('hand', 67.18, 36.47, 33.47, ['{{ w.bride }}'], fs=SZ(14565), lh=SZ(20391), d=.35),
    ]),
]))

# ---------- 5 · TRÂN TRỌNG KÍNH MỜI ----------
slides.append(('invite', 'Trân trọng kính mời', [
    cmp('c-invite', 21.30, 11.22, 57.40, 80, [
        img('', 'heart.webp', 25.84, 11.22, 47.47, 80),
        img('', 'star.webp', 47.61, 45.75, 4.78, 8.51, d=.4),
        txt('script', 21.30, 25.82, 57.40, ['Trân trọng kính mời'], reveal='write', d=.2, **TITLE),
        # tên khách: đặt vào khoảng trống dưới ngôi sao của slide
        txt('hand invite__guest', 21.30, 56.5, 57.40, ['{{ guest }}'], fs=4.6, lh=5.4, wrap=True, d=.6),
    ]),
]))

# ---------- 6 · THỜI GIAN ----------
slides.append(('time', 'Thời gian', [
    cmp('c-time-info', 7.00, 25.90, 31.26, 55.78, [
        txt('script', 7.00, 25.90, 31.26, ['Thời gian'], reveal='write', **TITLE),
        img('', 'star.webp', 20.69, 40.17, 3.90, 6.93, d=.3),
        txt('', 15.07, 51.02, 15.13, ['{{ w.weekday | uppercase }}', '{{ w.dateText }}'], d=.2, **BODY),
        txt('italic', 7.95, 64.73, 29.38, ['{{ w.lunarText }}'], fs=SZ(3814), lh=SZ(3776), ls=SZ(347), d=.3),
        txt('', 14.43, 72.34, 16.41, ['{{ w.timeText }}'], fs=SZ(7099), lh=SZ(7028), ls=SZ(646), d=.4),
    ]),
    # Khung tem xoay 90°: bbox nhìn thấy x42.51 y13.31 w46.71 h73.38; ly rượu tràn xuống mép slide
    cmp('c-time-art', 38.27, 8.48, 50.95, 91.52, [
        img('', 'stamp.webp', 45.23, 8.48, 41.28, 83.04, rot=90),
        img('', 'wine.webp', 38.27, 24.05, 50.95, 80, crop=(-14.573, 0, -17.778, 0), d=.2),
    ]),
]))

# ---------- 7 · ĐỊA ĐIỂM ----------
slides.append(('place', 'Địa điểm', [
    cmp('c-place', 14.05, 11.22, 71.91, 80, [
        img('', 'heart.webp', 25.84, 11.22, 47.47, 80),
        img('', 'star.webp', 48.05, 37.31, 3.90, 6.93, d=.3),
        txt('', 14.05, 49.04, 71.91, ['{{ w.venueName | uppercase }}'], fs=SZ(5128), lh=SZ(4769), ls=SZ(466), d=.2),
        txt('script', 34.37, 24.89, 31.26, ['Địa điểm'], reveal='write', **TITLE),
        txt('italic', 15.25, 60.01, 69.50, ['{{ w.venueHall }}', '{{ w.venueAddress }}'], d=.3, **BODY),
    ]),
]))

# ---------- 8 · ALBUM ----------
PH = (28.69, 59.98)
slides.append(('album', 'Khoảnh khắc chung đôi', [
    cmp('c-album-title', 6.79, 13.03, 43.21, 7.44, [
        txt('hand', 6.79, 13.03, 43.21, ['Khoảnh khắc chung đôi'], fs=SZ(5830), lh=SZ(5772), ls=SZ(530), align='l'),
    ]),
    cmp('c-photo c-photo--b', 3.80, 34.61, *PH, [
        img('zoomable', 'photo-2.webp', 3.80, 34.61, *PH, crop=(0, -18.072, -8.878, -20.801), alt='Ảnh cưới', reveal=None, view='photo-2.webp'),
    ], reveal='fade'),
    cmp('c-photo c-photo--a', 35.66, 24.10, *PH, [
        img('zoomable', 'photo-1.webp', 35.66, 24.10, *PH, crop=(0, -9.12, -4.934, -24.724), alt='Ảnh cưới', reveal=None, view='photo-1.webp'),
    ], reveal='fade', d=.15),
    cmp('c-photo c-photo--c', 67.52, 10.00, *PH, [
        img('zoomable', 'photo-3.webp', 67.52, 10.00, *PH, crop=(0, -22.036, 0, -28.688), alt='Ảnh cưới', reveal=None, view='photo-3.webp'),
    ], reveal='fade', d=.3),
]))

# ---------- 9 · CẢM ƠN ----------
slides.append(('thanks', 'Cảm ơn', [
    cmp('c-thanks', 11.60, 17.16, 76.79, 67.53, [
        txt('script', 12.70, 17.16, 74.60, ['Hân hạnh được đón tiếp'], reveal='write', **TITLE),
        txt('', 11.60, 31.45, 76.79, ['Sự hiện diện của quý khách là món quà vô giá đối với gia đình!'], d=.2, **THANKS),
        raw('<span class="lines" data-reveal="fade" style="--d:.3s"></span>', 21.51, 41.42, 56.98, 31.73),
        txt('', 24.15, 45.75, 20.02, ['Nhà trai'], d=.35, **THANKS),
        txt('', 55.83, 45.75, 20.02, ['Nhà gái'], d=.35, **THANKS),
        txt('bold', 18.32, 52.99, 31.68, ['{{ w.groomParents[0] }}', '&amp;', '{{ w.groomParents[1] }}'], d=.45, **THANKS),
        txt('bold', 49.84, 52.99, 31.99, ['{{ w.brideParents[0] }}', '&amp;', '{{ w.brideParents[1] }}'], d=.45, **THANKS),
        txt('', 26.75, 78.90, 46.51, ['CHÂN THÀNH CẢM ƠN!'], fs=SZ(4632), lh=SZ(4308), ls=SZ(421), d=.3),
    ]),
]))

out = ['<!-- File này được sinh từ toạ độ trong pptx (xem README). Mỗi <section> là một slide. -->',
       '<audio #bgm src="assets/audio/music.m4a" loop preload="auto" (play)="playing.set(true)" (pause)="playing.set(false)"></audio>',
       '<button class="music" type="button" aria-label="Bật/tắt nhạc" [class.is-playing]="playing()" (click)="toggleMusic()">',
       '  <img src="assets/img/vinyl.webp" alt="" />',
       '</button>',
       '', '<main>']
for i, (key, label, cmps) in enumerate(slides, 1):
    out.append('  <!-- %d · %s -->' % (i, label))
    out.append('  <section class="slide slide--%s">' % key)
    for c in cmps:
        out.append(render_cmp(c))
    if key == 'quote':
        # Điện thoại: slide ngang quá nhỏ để đọc, nên xếp tấm vé dọc với cùng ảnh & chữ
        out.append('    <div class="quote-m">')
        out.append('      <img class="quote-m__bow" src="assets/img/bow.webp" alt="" data-reveal="fade" style="--d:.2s" />')
        out.append('      <p class="quote-m__text" data-reveal="fade">%s</p>' % QUOTE)
        out.append('      <img class="quote-m__rose" src="assets/img/rose.webp" alt="" data-reveal="fade" style="--d:.3s" />')
        out.append('    </div>')
    out.append('  </section>')
    out.append('')
out.append('</main>')
out.append('')
out.append('<!-- Xem ảnh lớn -->')
out.append('@if (viewing(); as src) {')
out.append('  <div class="lightbox" (click)="viewing.set(null)">')
out.append('    <button class="lightbox__close" type="button" aria-label="Đóng">×</button>')
out.append("""    <img [src]="'assets/img/' + src" alt="" (click)="$event.stopPropagation()" />""")
out.append('  </div>')
out.append('}')
html = '\n'.join(out) + '\n'
open(sys.argv[1], 'w', encoding='utf8').write(html)
print('ok', len(html))
