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
        txt('intro intro--2', 26.87, 39.44, 46.51, ['{{ w.groomFull | uppercase }} &amp; {{ w.brideFull | uppercase }}'],
            fs=SZ(6658), lh=SZ(6525), ls=SZ(346), reveal=None),
    ]),
    cmp('c-envelope', 30.68, 50.03, 38.88, 46.13, [], rot=-6.64, inner_open=env_inner),
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
        txt('italic quote__text', 34.87, 34.35, 36.76, [QUOTE], fs=SZ(3722), lh=SZ(3685), ls=SZ(338), align='l', wrap=True),
    ]),
]))

# ---------- 4 · CÔ DÂU CHÚ RỂ ----------
# Tên hai bên dùng hộp cùng bề rộng (33.47) và cách đều khung ảnh -> cùng cỡ chữ, cân hai bên
NAME = dict(fs=SZ(11000), lh=SZ(15400))
slides.append(('couple', 'Cô dâu chú rể', [
    # Khung oval như slide, nhưng viền vàng mảnh 2 lớp + 2 ngôi sao (giống khung ngày ở trang bìa)
    cmp('c-frame', 36.83, 22.32, 26.33, 58.83, [
        raw('<span class="oval-ring oval-ring--outer"></span>'
            '<span class="oval-ring oval-ring--inner"></span>'
            '<div class="oval-photo zoomable" (click)="view(' + "'photo-couple.webp'" + ')">'
            '<img src="assets/img/photo-couple.webp" alt="{{ w.groomFull }} và {{ w.brideFull }}" /></div>'
            '<img class="oval-star oval-star--a" src="assets/img/star.webp" alt="" />'
            '<img class="oval-star oval-star--b" src="assets/img/star.webp" alt="" />',
            36.83, 22.32, 26.33, 58.83),
    ], reveal='fade'),
    cmp('c-name c-name--groom', 1.03, 38.82, 33.47, 18.40, [
        txt('hand', 1.03, 38.82, 33.47, ['{{ w.groomFull }}'], d=.2, **NAME),
    ]),
    cmp('c-name c-name--bride', 65.47, 38.82, 33.47, 18.40, [
        txt('hand', 65.47, 38.82, 33.47, ['{{ w.brideFull }}'], d=.35, **NAME),
    ]),
]))

# ---------- 5 · BÁO TIN ----------
# Slide gốc hai bảng lệch tâm (vạch giữa ở 48.1% và 53%), tên cô dâu chú rể tràn khỏi bảng và
# chữ "Trưởng Nam" đè lên tên -> ở đây cả hai bảng cùng rộng 7.5..92.5, vạch giữa đúng 50%.
REPORT = dict(fs=SZ(4227), lh=SZ(3931), ls=SZ(384))
SMALL = dict(fs=SZ(2799), lh=SZ(2603), ls=SZ(254))
COL_L, COL_R, COL_W = 7.5, 50, 42.5
slides.append(('report', 'Báo tin', [
    cmp('c-report', 0, 0, 100, 100, [
        raw('<span class="lines" data-reveal="fade"></span>', 7.5, 4.84, 85, 31.6),
        txt('', COL_L, 7.6, COL_W, ['Ông Bà'], d=.1, **REPORT),
        txt('', COL_R, 7.6, COL_W, ['Ông Bà'], d=.1, **REPORT),
        txt('bold', COL_L, 15.3, COL_W, ['{{ w.groomParents[0] }}', '&amp;', '{{ w.groomParents[1] }}'], d=.2, **REPORT),
        txt('bold', COL_R, 15.3, COL_W, ['{{ w.brideParents[0] }}', '&amp;', '{{ w.brideParents[1] }}'], d=.2, **REPORT),
        txt('', COL_L, 30.4, COL_W, ['{{ w.groomHome }}'], d=.3, **SMALL),
        txt('', COL_R, 30.4, COL_W, ['{{ w.brideHome }}'], d=.3, **SMALL),
        txt('bold', 7.5, 39.6, 85, ['TRÂN TRỌNG BÁO TIN', 'LỄ THÀNH HÔN CỦA CON CHÚNG TÔI'],
            fs=SZ(3498), lh=SZ(3253), ls=SZ(318), d=.2),
        raw('<span class="lines" data-reveal="fade" style="--d:.3s"></span>', 7.5, 51.7, 85, 18.3),
        # Tên cô dâu chú rể: chữ nghiêng TH Sarabun (Dancing Script nét tròn quá, Ballet thì chữ hoa dính nhau khó đọc)
        txt('italic', COL_L, 54.7, COL_W, ['{{ w.groomFullName }}'], fs=SZ(5600), lh=SZ(6440), ls=SZ(450), d=.35),
        txt('italic', COL_R, 54.7, COL_W, ['{{ w.brideFullName }}'], fs=SZ(5600), lh=SZ(6440), ls=SZ(450), d=.35),
        txt('italic', COL_L, 63.2, COL_W, ['{{ w.groomRank }}'], fs=SZ(2800), lh=SZ(3100), ls=SZ(230), d=.45),
        txt('italic', COL_R, 63.2, COL_W, ['{{ w.brideRank }}'], fs=SZ(2800), lh=SZ(3100), ls=SZ(230), d=.45),
        txt('bold', 7.5, 78.6, 85, ['{{ w.homeCeremony | uppercase }}', 'VÀO LÚC {{ w.homeTime | uppercase }}'],
            fs=SZ(2927), lh=SZ(2722), ls=SZ(266), d=.2),
        txt('bold', 7.5, 85.7, 85, ['{{ w.dateSlash }}'], fs=SZ(4527), lh=SZ(4210), ls=SZ(412), d=.3),
        txt('bold', 7.5, 92.4, 85, ['{{ w.lunarFull }}'], fs=SZ(2127), lh=SZ(1978), ls=SZ(193), d=.4),
    ]),
]))

# ---------- 6 · TRÂN TRỌNG KÍNH MỜI ----------
slides.append(('invite', 'Trân trọng kính mời', [
    cmp('c-invite', 10.87, 11.22, 77.79, 78.78, [
        # trái tim mờ phóng to, chỉ lấy dải giữa (fillRect t-32.265 b-59.87)
        img('', 'heart.webp', 10.87, 11.22, 77.79, 68.23, crop=(0, -32.265, 0, -59.87)),
        img('', 'star.webp', 47.61, 45.75, 4.78, 8.51, d=.4),
        txt('script', 21.30, 25.82, 57.40, ['Trân trọng kính mời'], reveal='write', d=.2, **TITLE),
        # tên khách: đặt vào khoảng trống dưới ngôi sao của slide
        txt('hand invite__guest', 15.25, 58.2, 69.50, ['{{ guest }}'], fs=4.6, lh=5.4, wrap=True, d=.6),
        txt('', 15.25, 84.19, 69.50, ['Đến dự buổi tiệc chung vui cùng gia đình chúng tôi'], d=.8, **BODY),
    ]),
]))
# ---------- 7 · THỜI GIAN ----------
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

# ---------- 8 · ĐỊA ĐIỂM ----------
slides.append(('place', 'Địa điểm', [
    cmp('c-place', 14.05, 11.22, 71.91, 80, [
        img('', 'heart.webp', 25.84, 11.22, 47.47, 80),
        img('', 'star.webp', 48.05, 37.31, 3.90, 6.93, d=.3),
        txt('', 14.05, 49.04, 71.91, ['{{ w.venueName | uppercase }}'], fs=SZ(5128), lh=SZ(4769), ls=SZ(466), d=.2),
        txt('script', 34.37, 24.89, 31.26, ['Địa điểm'], reveal='write', **TITLE),
        txt('italic', 15.25, 60.01, 69.50, ['{{ w.venueHall }}', '{{ w.venueAddress }}'], d=.3, **BODY),
    ]),
]))

# ---------- 9 · ALBUM ----------
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

# ---------- 10 · CẢM ƠN ----------
# Slide gốc đặt tiêu đề & lời cảm ơn lệch phải (tâm 52-53%); ở đây canh đúng giữa slide
slides.append(('thanks', 'Cảm ơn', [
    cmp('c-thanks', 11.60, 35.57, 76.79, 49.12, [
        txt('script', 12.70, 35.57, 74.60, ['Hân hạnh được đón tiếp'], reveal='write',
            fs=SZ(10682), lh=SZ(10575), ls=SZ(972)),
        # sticker đôi nhẫn vàng lấp khoảng trống giữa tiêu đề và lời cảm ơn
        img('', 'rings.svg', 43, 50.6, 14, 12.44, d=.15),
        txt('', 11.60, 64.9, 76.79, ['Sự hiện diện của quý khách là món quà vô giá', 'đối với gia đình chúng tôi!'],
            d=.2, **THANKS),
        txt('', 26.75, 78.90, 46.51, ['CHÂN THÀNH CẢM ƠN!'], fs=SZ(4632), lh=SZ(4308), ls=SZ(421), d=.3),
    ]),
]))

out = ['<!-- File này được sinh từ toạ độ trong pptx (xem README). Mỗi <section> là một slide. -->',
       '<audio #bgm src="assets/audio/music.m4a" loop preload="auto" (play)="onAudioEvent()" (pause)="onAudioEvent()" (volumechange)="onAudioEvent()"></audio>',
       '<button class="music" type="button" aria-label="Bật/tắt nhạc" [class.is-playing]="playing()" (click)="toggleMusic()">',
       '  <img src="assets/img/vinyl.webp" alt="" />',
       '</button>',
       '', '<main>']
for i, (key, label, cmps) in enumerate(slides, 1):
    out.append('  <!-- %d · %s -->' % (i, label))
    out.append('  <section class="slide slide--%s">' % key)
    for c in cmps:
        out.append(render_cmp(c))
    if key == 'hero':
        out.append('    <p class="hero-hint">Chạm vào con dấu để mở thiệp</p>')
    if key == 'couple':
        # Điện thoại: tên nằm dưới khung ảnh thành 1 hàng "Bảo & Hương"
        out.append('    <span class="couple-amp hand" aria-hidden="true" data-reveal="up" style="--d:.3s">&amp;</span>')
    if key == 'report':
        # Điện thoại: bảng ngang co lại thì chữ quá nhỏ, nên xếp lại thành cột với cùng nội dung
        out.append('''    <div class="report-m">
      <div class="report-m__parents" data-reveal="fade">
        <div class="report-m__col">
          <p class="report-m__label">Ông Bà</p>
          <p class="report-m__names">{{ w.groomParents[0] }}<br />&amp;<br />{{ w.groomParents[1] }}</p>
          <p class="report-m__home">{{ w.groomHome.split(', ')[0] }},<br />{{ w.groomHome.split(', ')[1] }}</p>
        </div>
        <div class="report-m__col">
          <p class="report-m__label">Ông Bà</p>
          <p class="report-m__names">{{ w.brideParents[0] }}<br />&amp;<br />{{ w.brideParents[1] }}</p>
          <p class="report-m__home">{{ w.brideHome.split(', ')[0] }},<br />{{ w.brideHome.split(', ')[1] }}</p>
        </div>
      </div>
      <p class="report-m__news" data-reveal="up">TRÂN TRỌNG BÁO TIN<br />LỄ THÀNH HÔN CỦA CON CHÚNG TÔI</p>
      <div class="report-m__couple" data-reveal="fade" style="--d:.15s">
        <p class="report-m__person"><span class="report-m__name">{{ w.groomFullName }}</span><span class="report-m__rank">{{ w.groomRank }}</span></p>
        <p class="report-m__person"><span class="report-m__name">{{ w.brideFullName }}</span><span class="report-m__rank">{{ w.brideRank }}</span></p>
      </div>
      <p class="report-m__ceremony" data-reveal="up">{{ w.homeCeremony | uppercase }}<br />VÀO LÚC {{ w.homeTime | uppercase }}<span class="report-m__date">{{ w.dateSlash }}</span><span class="report-m__lunar">{{ w.lunarFull }}</span></p>
    </div>''')
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
