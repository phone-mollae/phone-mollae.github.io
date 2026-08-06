#!/usr/bin/env node
/* 유플리 릴스 생성기 v2 — post.json → 1080×1920 프레임 → reel.mp4 (무음 슬라이드)
 * 사용법: node make_reel.js post.json 출력폴더
 * 디자인 값은 design.json에서 읽는다. 렌더: CHROME_BIN headless → ffmpeg 크롭 + xfade
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = __dirname;
const D = JSON.parse(fs.readFileSync(path.join(root, 'design.json'), 'utf8'));

const soften = hex => {
  const n = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map(i => parseInt(n.slice(i, i + 2), 16));
  const mix = v => Math.round(v + (255 - v) * 0.86).toString(16).padStart(2, '0');
  return `#${mix(r)}${mix(g)}${mix(b)}`;
};

const post = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const outDir = process.argv[3] || 'out';
fs.mkdirSync(outDir, { recursive: true });

const seriesKeys = Object.keys(D.series);
const SD = D.series[post.series] || D.series[seriesKeys[0]];
const S = { color: SD.color, soft: soften(SD.color), en: SD.en || '' };
const C = D.colors;
const nameA = D.brand.name.slice(0, D.brand.accent_from_char);
const nameB = D.brand.name.slice(D.brand.accent_from_char);

const hl = t => t
  .replace(/\*\*(.+?)\*\*/g, `<em>$1</em>`)
  .replace(/\n/g, '<br>');

/* 프레임별 노출 시간(초) */
const DUR = { cover: 3, content: 5, cta: 3.5 };
const FADE = 0.4;

function frameHTML(card, idx, total) {
  const isCover = card.type === 'cover';
  const isCta = card.type === 'cta';
  const segs = Array.from({ length: total }, (_, i) =>
    `<span class="seg${i <= idx ? ' on' : ''}"></span>`).join('');
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html,body { width:1080px; height:1920px; }
  body {
    font-family:"Noto Sans CJK KR",sans-serif;
    background:linear-gradient(160deg,${C.bg_from} 0%,${C.bg_mid} 62%,${C.bg_to} 100%);
    color:${C.ink}; display:flex; flex-direction:column;
    padding:170px 88px 120px; position:relative; overflow:hidden;
  }
  .blob { position:absolute; border-radius:50%; filter:blur(2px); opacity:.55; }
  .b1 { width:520px; height:520px; right:-190px; top:-200px;
    background:radial-gradient(circle at 30% 30%, ${S.soft}, transparent 70%); }
  .b2 { width:420px; height:420px; left:-170px; bottom:-150px;
    background:radial-gradient(circle at 60% 40%, ${S.soft}, transparent 70%); }
  .prog { position:absolute; top:84px; left:88px; right:88px; display:flex; gap:12px; }
  .prog .seg { flex:1; height:9px; border-radius:999px; background:rgba(0,0,0,.08); }
  .prog .seg.on { background:${S.color}; }
  .top { display:flex; align-items:center; justify-content:space-between; }
  .logo { display:flex; align-items:center; gap:14px; font-weight:900; font-size:38px; }
  .logo .dot { width:52px; height:52px; border-radius:18px;
    background:linear-gradient(135deg,${C.accent_from},${C.accent_to});
    display:flex; align-items:center; justify-content:center;
    color:#fff; font-size:29px; font-weight:900; }
  .logo b { color:${C.accent_from}; }
  .series { font-weight:800; font-size:29px;
    color:${S.color}; background:#fff; border:3px solid ${S.color};
    padding:12px 30px; border-radius:999px; }
  .body { flex:1; display:flex; flex-direction:column; justify-content:center; }
  h1 { font-weight:900; font-size:${Math.round((card.headlineSize || 84) * 1.1)}px; line-height:1.32;
    letter-spacing:-0.02em; word-break:keep-all; }
  h1 em, h2 em, .txt em, li em { font-style:normal; color:${S.color}; font-weight:900;
    text-decoration:underline; text-decoration-color:${S.soft}; text-decoration-thickness:16px;
    text-underline-offset:-2px; text-decoration-skip-ink:none; }
  .kicker { display:inline-block; font-size:34px; font-weight:800; color:${S.color};
    background:${S.soft}; border-radius:999px; padding:14px 32px; margin-bottom:40px; align-self:flex-start; }
  h2 { font-weight:900; font-size:62px; line-height:1.34; margin-bottom:48px; word-break:keep-all; }
  .txt { font-weight:400; font-size:44px; line-height:1.7; color:${C.ink_soft}; word-break:keep-all;
    background:#fff; border-radius:32px; padding:52px 52px;
    box-shadow:0 16px 46px rgba(0,0,0,.06); }
  .txt b { color:${C.ink}; font-weight:800; }
  ul.pts { list-style:none; display:flex; flex-direction:column; gap:26px; }
  ul.pts li { font-size:43px; line-height:1.55; color:${C.ink_soft}; word-break:keep-all;
    background:#fff; border-radius:28px; padding:38px 42px 38px 110px; position:relative;
    box-shadow:0 14px 38px rgba(0,0,0,.05); }
  ul.pts li b { font-weight:800; color:${C.ink}; }
  ul.pts li::before { content:"✓"; position:absolute; left:38px; top:36px;
    width:50px; height:50px; border-radius:16px; background:${S.soft};
    color:${S.color}; font-weight:900; font-size:32px;
    display:flex; align-items:center; justify-content:center; }
  .ctabox { background:linear-gradient(135deg,${C.accent_from},${C.accent_to}); color:#fff;
    border-radius:36px; padding:64px 58px; margin-top:52px;
    box-shadow:0 20px 56px rgba(0,0,0,.16); }
  .ctabox .big { font-size:56px; font-weight:900; line-height:1.4; word-break:keep-all; }
  .ctabox .small { font-size:36px; margin-top:22px; opacity:.92; }
  .ctabox em { font-style:normal; color:#FFE14D; text-decoration:none; }
  .foot { display:flex; justify-content:space-between; align-items:center; }
  .handle { font-size:30px; font-weight:800; color:#8A8494; }
  .page { font-size:30px; font-weight:800; color:${S.color}; }
  .disc { position:absolute; bottom:44px; left:88px; right:88px; font-size:21px; color:#A9A3B3; }
  </style></head><body>
  <div class="blob b1"></div><div class="blob b2"></div>
  <div class="prog">${segs}</div>
  <div class="top">
    <span class="logo"><span class="dot">${D.brand.logo_letter}</span>${nameA}<b>${nameB}</b></span>
    <span class="series">${post.series}${S.en ? ` · ${S.en}` : ''}</span>
  </div>
  <div class="body">
    ${isCover ? `${card.kicker ? `<span class="kicker">${hl(card.kicker)}</span>` : ''}<h1>${hl(card.headline)}</h1>` : ''}
    ${!isCover && !isCta ? `${card.title ? `<h2>${hl(card.title)}</h2>` : ''}
      ${card.text ? `<p class="txt">${hl(card.text)}</p>` : ''}
      ${card.points ? `<ul class="pts">${card.points.map(p=>`<li>${hl(p)}</li>`).join('')}</ul>` : ''}` : ''}
    ${isCta ? `<h2>${hl(card.title)}</h2>
      <div class="ctabox"><div class="big">${hl(card.text)}</div>
      ${card.sub ? `<div class="small">${hl(card.sub)}</div>` : ''}</div>` : ''}
  </div>
  <div class="foot">
    <span class="handle">${D.brand.handle}</span>
    <span class="page">${idx+1} / ${total}</span>
  </div>
  ${card.disclaimer ? `<div class="disc">${card.disclaimer}</div>` : ''}
  </body></html>`;
}

/* 1) 프레임 렌더 (크게 찍고 ffmpeg로 1080×1920 크롭 — 뷰포트 오차 방지) */
const total = post.cards.length;
const frames = [];
post.cards.forEach((card, i) => {
  const htmlPath = path.join(outDir, `frame${i+1}.html`);
  const rawPath = path.join(outDir, `frame${i+1}_raw.png`);
  const pngPath = path.join(outDir, `frame${i+1}.png`);
  fs.writeFileSync(htmlPath, frameHTML(card, i, total));
  const chrome = process.env.CHROME_BIN || '/usr/bin/google-chrome';
  execSync(`${chrome} --headless --no-sandbox --disable-gpu --hide-scrollbars ` +
    `--force-device-scale-factor=1 --window-size=1080,2070 ` +
    `--screenshot=${rawPath} file://${path.resolve(htmlPath)} 2>/dev/null`);
  execSync(`ffmpeg -y -i ${rawPath} -vf crop=1080:1920:0:0 ${pngPath} 2>/dev/null`);
  fs.unlinkSync(rawPath);
  frames.push({ png: pngPath, dur: DUR[card.type] ?? DUR.content });
  console.log('rendered', pngPath);
});

/* 2) ffmpeg 조립 — xfade 크로스페이드 체인 */
const inputs = frames.map(f => `-loop 1 -t ${f.dur + FADE} -i ${f.png}`).join(' ');
let filter = '', prev = '[0:v]';
let offset = 0;
for (let i = 1; i < frames.length; i++) {
  offset += frames[i-1].dur;
  const out = i === frames.length - 1 ? '[v]' : `[x${i}]`;
  filter += `${prev}[${i}:v]xfade=transition=fade:duration=${FADE}:offset=${offset}${out};`;
  prev = `[x${i}]`;
}
filter = filter.replace(/;$/, '');
const reelPath = path.join(outDir, 'reel.mp4');
const cmd = frames.length > 1
  ? `ffmpeg -y ${inputs} -filter_complex "${filter}" -map "[v]" ` +
    `-r 30 -c:v libx264 -pix_fmt yuv420p -crf 23 -movflags +faststart ${reelPath}`
  : `ffmpeg -y ${inputs} -r 30 -c:v libx264 -pix_fmt yuv420p -crf 23 -movflags +faststart ${reelPath}`;
execSync(cmd, { stdio: 'pipe' });
frames.forEach((f, i) => fs.unlinkSync(path.join(outDir, `frame${i+1}.html`)));
console.log('reel saved:', reelPath);
