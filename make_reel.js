#!/usr/bin/env node
/* 릴스 생성기 v1 — post.json → 1080×1920 프레임 → reel.mp4 (무음 슬라이드)
 * 사용법: node make_reel.js post.json 출력폴더
 * 렌더: CHROME_BIN 크로미움 headless + ffmpeg (xfade 크로스페이드)
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SERIES = {
  'TRUTH CUT':   { color: '#4DA8FF' },
  'DATA CUT':    { color: '#FFE14D' },
  'GUARD CUT':   { color: '#FF5A36' },
};

const post = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const outDir = process.argv[3] || 'out';
fs.mkdirSync(outDir, { recursive: true });
const S = SERIES[post.series] || SERIES['TRUTH CUT'];

const hl = t => t
  .replace(/\*\*(.+?)\*\*/g, `<mark>$1</mark>`)
  .replace(/\n/g, '<br>');

/* 프레임별 노출 시간(초) */
const DUR = { cover: 3, content: 5, cta: 3.5 };
const FADE = 0.4; // 크로스페이드 길이

function frameHTML(card, idx, total) {
  const isCover = card.type === 'cover';
  const isCta = card.type === 'cta';
  const segs = Array.from({ length: total }, (_, i) =>
    `<span class="seg${i <= idx ? ' on' : ''}"></span>`).join('');
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html,body { width:1080px; height:1920px; }
  body {
    font-family: "Noto Sans CJK KR", sans-serif;
    background:#0E0F12; color:#fff;
    display:flex; flex-direction:column;
    padding:150px 84px 120px;
    position:relative; overflow:hidden;
  }
  .grain { position:absolute; inset:0; opacity:.5;
    background-image: radial-gradient(rgba(255,255,255,.045) 1px, transparent 1px);
    background-size: 7px 7px; pointer-events:none; }
  .prog { position:absolute; top:76px; left:84px; right:84px; display:flex; gap:12px; }
  .prog .seg { flex:1; height:8px; background:#2a2a2e; }
  .prog .seg.on { background:${S.color}; }
  .label-row { display:flex; align-items:center; gap:22px; }
  .series {
    font-weight:900; font-size:34px; letter-spacing:.14em;
    color:#101012; background:${S.color}; padding:12px 26px;
  }
  .no { font-size:32px; font-weight:700; color:#8a8a8e; letter-spacing:.1em; }
  .body { flex:1; display:flex; flex-direction:column; justify-content:center; }
  h1 {
    font-weight:900; font-size:${Math.round((card.headlineSize || 88) * 1.1)}px; line-height:1.28;
    letter-spacing:-0.02em; word-break:keep-all;
  }
  h2 { font-weight:900; font-size:64px; line-height:1.3; margin-bottom:52px; word-break:keep-all; }
  .txt { font-weight:400; font-size:46px; line-height:1.62; color:#d6d6da; word-break:keep-all; }
  .txt b { color:#fff; font-weight:700; }
  mark { background:${S.color}; color:#101012; padding:2px 12px; font-weight:900;
    -webkit-box-decoration-break: clone; box-decoration-break: clone; }
  ul.pts { list-style:none; margin-top:8px; }
  ul.pts li {
    font-size:46px; line-height:1.5; color:#d6d6da; word-break:keep-all;
    padding:32px 0 32px 50px; border-bottom:2px solid #2a2a2e; position:relative;
  }
  ul.pts li:first-child { border-top:2px solid #2a2a2e; }
  ul.pts li::before { content:""; position:absolute; left:0; top:56px;
    width:18px; height:18px; background:${S.color}; }
  .foot { display:flex; justify-content:space-between; align-items:flex-end; }
  .logo { font-weight:900; font-size:36px; letter-spacing:.06em; }
  .logo span { color:${S.color}; }
  .page { font-size:30px; color:#8a8a8e; font-weight:700; letter-spacing:.08em; }
  .disc { position:absolute; bottom:44px; left:84px; right:84px;
    font-size:21px; color:#5c5c60; text-align:left; }
  .ctabox { border:3px solid ${S.color}; padding:60px 54px; margin-top:60px; }
  .ctabox .big { font-size:58px; font-weight:900; line-height:1.35; word-break:keep-all; }
  .ctabox .small { font-size:38px; color:#d6d6da; margin-top:24px; }
  </style></head><body>
  <div class="grain"></div>
  <div class="prog">${segs}</div>
  <div class="label-row">
    <span class="series">${post.series}</span>
    <span class="no">${post.issueNo}</span>
  </div>
  <div class="body">
    ${isCover ? `<h1>${hl(card.headline)}</h1>` : ''}
    ${!isCover && !isCta ? `${card.title ? `<h2>${hl(card.title)}</h2>` : ''}
      ${card.text ? `<p class="txt">${hl(card.text)}</p>` : ''}
      ${card.points ? `<ul class="pts">${card.points.map(p=>`<li>${hl(p)}</li>`).join('')}</ul>` : ''}` : ''}
    ${isCta ? `<h2>${hl(card.title)}</h2>
      <div class="ctabox"><div class="big">${hl(card.text)}</div>
      ${card.sub ? `<div class="small">${hl(card.sub)}</div>` : ''}</div>` : ''}
  </div>
  <div class="foot">
    <span class="logo">${post.brand.replace(/\{c\}(.+?)\{\/c\}/g,'<span>$1</span>')}</span>
    <span class="page">${idx+1} / ${total}</span>
  </div>
  ${card.disclaimer ? `<div class="disc">${card.disclaimer}</div>` : ''}
  </body></html>`;
}

/* 1) 프레임 렌더 */
const total = post.cards.length;
const frames = [];
post.cards.forEach((card, i) => {
  const htmlPath = path.join(outDir, `frame${i+1}.html`);
  const pngPath = path.join(outDir, `frame${i+1}.png`);
  fs.writeFileSync(htmlPath, frameHTML(card, i, total));
  const chrome = process.env.CHROME_BIN || '/usr/bin/google-chrome';
  execSync(`${chrome} --headless --no-sandbox --disable-gpu --hide-scrollbars ` +
    `--force-device-scale-factor=1 --window-size=1080,1920 ` +
    `--screenshot=${pngPath} file://${path.resolve(htmlPath)} 2>/dev/null`);
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
