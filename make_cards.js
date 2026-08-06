#!/usr/bin/env node
/* 카드뉴스 생성기 v1 — post.json → 1080×1350 PNG 캐러셀
 * 사용법: node make_cards.js post.json 출력폴더
 * 렌더: 시스템 chromium headless (Playwright 번들: /opt/pw-browsers/chromium)
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SERIES = {
  'TRUTH CUT':   { color: '#4DA8FF', desc: '가격·구조' },
  'DATA CUT':    { color: '#FFE14D', desc: '통계·트렌드' },
  'GUARD CUT':   { color: '#FF5A36', desc: '소비자 방어' },
};

const post = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const outDir = process.argv[3] || 'out';
fs.mkdirSync(outDir, { recursive: true });
const S = SERIES[post.series] || SERIES['TRUTH CUT'];

/* hl() : **텍스트** → 형광 마커 하이라이트 */
const hl = t => t
  .replace(/\*\*(.+?)\*\*/g, `<mark>$1</mark>`)
  .replace(/\n/g, '<br>');

function cardHTML(card, idx, total) {
  const isCover = card.type === 'cover';
  const isCta = card.type === 'cta';
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html,body { width:1080px; height:1350px; }
  body {
    font-family: "Noto Sans CJK KR", sans-serif;
    background:#0E0F12; color:#fff;
    display:flex; flex-direction:column;
    padding:72px 76px 64px;
    position:relative; overflow:hidden;
  }
  .grain { position:absolute; inset:0; opacity:.5;
    background-image: radial-gradient(rgba(255,255,255,.045) 1px, transparent 1px);
    background-size: 7px 7px; pointer-events:none; }
  .label-row { display:flex; align-items:center; gap:20px; }
  .series {
    font-weight:900; font-size:30px; letter-spacing:.14em;
    color:#101012; background:${S.color}; padding:10px 22px;
  }
  .no { font-size:28px; font-weight:700; color:#8a8a8e; letter-spacing:.1em; }
  .body { flex:1; display:flex; flex-direction:column; justify-content:center; }
  h1 {
    font-weight:900; font-size:${card.headlineSize || 88}px; line-height:1.28;
    letter-spacing:-0.02em; word-break:keep-all;
  }
  h2 { font-weight:900; font-size:56px; line-height:1.3; margin-bottom:44px; word-break:keep-all; }
  .txt { font-weight:400; font-size:40px; line-height:1.62; color:#d6d6da; word-break:keep-all; }
  .txt b { color:#fff; font-weight:700; }
  mark { background:${S.color}; color:#101012; padding:2px 10px; font-weight:900;
    -webkit-box-decoration-break: clone; box-decoration-break: clone; }
  ul.pts { list-style:none; margin-top:8px; }
  ul.pts li {
    font-size:40px; line-height:1.5; color:#d6d6da; word-break:keep-all;
    padding:26px 0 26px 44px; border-bottom:2px solid #2a2a2e; position:relative;
  }
  ul.pts li:first-child { border-top:2px solid #2a2a2e; }
  ul.pts li::before { content:""; position:absolute; left:0; top:47px;
    width:16px; height:16px; background:${S.color}; }
  .foot { display:flex; justify-content:space-between; align-items:flex-end; }
  .logo { font-weight:900; font-size:32px; letter-spacing:.06em; }
  .logo span { color:${S.color}; }
  .page { font-size:26px; color:#8a8a8e; font-weight:700; letter-spacing:.08em; }
  .swipe { font-size:26px; color:${S.color}; font-weight:700; letter-spacing:.06em; }
  .disc { position:absolute; bottom:20px; left:76px; right:76px;
    font-size:19px; color:#5c5c60; text-align:left; }
  .ctabox { border:3px solid ${S.color}; padding:52px 48px; margin-top:52px; }
  .ctabox .big { font-size:52px; font-weight:900; line-height:1.35; word-break:keep-all; }
  .ctabox .small { font-size:34px; color:#d6d6da; margin-top:20px; }
  </style></head><body>
  <div class="grain"></div>
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
    ${idx < total-1 ? `<span class="swipe">넘기기 →</span>` : `<span class="page">${post.issueNo} · 끝</span>`}
  </div>
  ${card.disclaimer ? `<div class="disc">${card.disclaimer}</div>` : ''}
  </body></html>`;
}

const total = post.cards.length;
post.cards.forEach((card, i) => {
  const htmlPath = path.join(outDir, `card${i+1}.html`);
  const pngPath = path.join(outDir, `card${i+1}.png`);
  fs.writeFileSync(htmlPath, cardHTML(card, i, total));
  const chrome = process.env.CHROME_BIN || '/usr/bin/google-chrome';
  execSync(`${chrome} --headless --no-sandbox --disable-gpu --hide-scrollbars ` +
    `--force-device-scale-factor=1 --window-size=1080,1350 ` +
    `--screenshot=${pngPath} file://${path.resolve(htmlPath)} 2>/dev/null`);
  console.log('rendered', pngPath);
});
fs.writeFileSync(path.join(outDir, 'caption.txt'), post.caption);
console.log('caption saved');
