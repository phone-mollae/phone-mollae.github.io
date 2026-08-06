#!/usr/bin/env node
/* 유플리 카드뉴스 생성기 v2 — post.json → 1080×1350 PNG 캐러셀
 * 사용법: node make_cards.js post.json 출력폴더
 * 디자인 값은 design.json에서 읽는다 (대시보드 '디자인 설정'으로 변경 가능).
 * 렌더: CHROME_BIN 크로미움 headless → ffmpeg 크롭(뷰포트 오차 방지)
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = __dirname;
const D = JSON.parse(fs.readFileSync(path.join(root, 'design.json'), 'utf8'));

/* 시리즈 색상 + 연한 배경색 자동 파생 (흰색과 86% 혼합) */
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

function cardHTML(card, idx, total) {
  const isCover = card.type === 'cover';
  const isCta = card.type === 'cta';
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html,body { width:1080px; height:1350px; }
  body {
    font-family:"Noto Sans CJK KR",sans-serif;
    background:linear-gradient(160deg,${C.bg_from} 0%,${C.bg_mid} 62%,${C.bg_to} 100%);
    color:${C.ink}; display:flex; flex-direction:column;
    padding:72px 80px 60px; position:relative; overflow:hidden;
  }
  .blob { position:absolute; border-radius:50%; filter:blur(2px); opacity:.55; }
  .b1 { width:420px; height:420px; right:-160px; top:-170px;
    background:radial-gradient(circle at 30% 30%, ${S.soft}, transparent 70%); }
  .b2 { width:340px; height:340px; left:-140px; bottom:-120px;
    background:radial-gradient(circle at 60% 40%, ${S.soft}, transparent 70%); }
  .top { display:flex; align-items:center; justify-content:space-between; }
  .logo { display:flex; align-items:center; gap:12px; font-weight:900; font-size:34px; }
  .logo .dot { width:46px; height:46px; border-radius:16px;
    background:linear-gradient(135deg,${C.accent_from},${C.accent_to});
    display:flex; align-items:center; justify-content:center;
    color:#fff; font-size:26px; font-weight:900; }
  .logo b { color:${C.accent_from}; }
  .series { font-weight:800; font-size:26px;
    color:${S.color}; background:#fff; border:2.5px solid ${S.color};
    padding:10px 26px; border-radius:999px; }
  .body { flex:1; display:flex; flex-direction:column; justify-content:center; position:relative; }
  h1 { font-weight:900; font-size:${card.headlineSize || 84}px; line-height:1.32;
    letter-spacing:-0.02em; word-break:keep-all; }
  h1 em, h2 em, .txt em, li em { font-style:normal; color:${S.color}; font-weight:900;
    text-decoration:underline; text-decoration-color:${S.soft}; text-decoration-thickness:14px;
    text-underline-offset:-2px; text-decoration-skip-ink:none; }
  .kicker { display:inline-block; font-size:30px; font-weight:800; color:${S.color};
    background:${S.soft}; border-radius:999px; padding:12px 28px; margin-bottom:34px; align-self:flex-start; }
  h2 { font-weight:900; font-size:54px; line-height:1.34; margin-bottom:40px; word-break:keep-all; }
  .txt { font-weight:400; font-size:38px; line-height:1.7; color:${C.ink_soft}; word-break:keep-all;
    background:#fff; border-radius:28px; padding:44px 46px;
    box-shadow:0 14px 40px rgba(0,0,0,.06); }
  .txt b { color:${C.ink}; font-weight:800; }
  ul.pts { list-style:none; display:flex; flex-direction:column; gap:22px; }
  ul.pts li { font-size:37px; line-height:1.55; color:${C.ink_soft}; word-break:keep-all;
    background:#fff; border-radius:24px; padding:34px 38px 34px 96px; position:relative;
    box-shadow:0 12px 34px rgba(0,0,0,.05); }
  ul.pts li b { font-weight:800; color:${C.ink}; }
  ul.pts li::before { content:"✓"; position:absolute; left:34px; top:32px;
    width:44px; height:44px; border-radius:14px; background:${S.soft};
    color:${S.color}; font-weight:900; font-size:28px;
    display:flex; align-items:center; justify-content:center; }
  .ctabox { background:linear-gradient(135deg,${C.accent_from},${C.accent_to}); color:#fff;
    border-radius:32px; padding:56px 52px; margin-top:44px;
    box-shadow:0 18px 50px rgba(0,0,0,.15); }
  .ctabox .big { font-size:48px; font-weight:900; line-height:1.4; word-break:keep-all; }
  .ctabox .small { font-size:32px; margin-top:18px; opacity:.92; }
  .ctabox em { font-style:normal; color:#FFE14D; text-decoration:none; }
  .foot { display:flex; justify-content:space-between; align-items:center; }
  .handle { font-size:27px; font-weight:800; color:#8A8494; }
  .swipe { font-size:27px; font-weight:800; color:${S.color}; }
  .disc { position:absolute; bottom:18px; left:80px; right:80px; font-size:19px; color:#A9A3B3; }
  </style></head><body>
  <div class="blob b1"></div><div class="blob b2"></div>
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
    ${idx < total-1 ? `<span class="swipe">다음 장 →</span>` : `<span class="handle">${post.issueNo} · 끝</span>`}
  </div>
  ${card.disclaimer ? `<div class="disc">${card.disclaimer}</div>` : ''}
  </body></html>`;
}

const total = post.cards.length;
post.cards.forEach((card, i) => {
  const htmlPath = path.join(outDir, `card${i+1}.html`);
  const rawPath = path.join(outDir, `card${i+1}_raw.png`);
  const pngPath = path.join(outDir, `card${i+1}.png`);
  fs.writeFileSync(htmlPath, cardHTML(card, i, total));
  const chrome = process.env.CHROME_BIN || '/usr/bin/google-chrome';
  execSync(`${chrome} --headless --no-sandbox --disable-gpu --hide-scrollbars ` +
    `--force-device-scale-factor=1 --window-size=1080,1500 ` +
    `--screenshot=${rawPath} file://${path.resolve(htmlPath)} 2>/dev/null`);
  execSync(`ffmpeg -y -i ${rawPath} -vf crop=1080:1350:0:0 ${pngPath} 2>/dev/null`);
  fs.unlinkSync(rawPath);
  console.log('rendered', pngPath);
});
fs.writeFileSync(path.join(outDir, 'caption.txt'), post.caption);
