# 사장님몰래 — 자동 발행 시스템

통신 소비자 정보지 '사장님몰래'(@sajang.mollae)의 완전 무인 발행 저장소.
현직 판매인이 익명으로 알려주는 폰 시장의 진실 — 지원금·요금제·계약 구조 해부.

## 구조
- `guide.md` — 콘텐츠 가이드 (브랜드·후킹·가드레일·그로스 규칙)
- `topics.json` — 주제 큐 (status: 대기 → 생성완료)
- `generate.js` → `make_cards.js`/`make_reel.js` — Claude API 생성 → 카드·릴스 렌더링
- `publish_carousel.js`/`publish_reel.js` — Instagram Graph API 게시
- `.github/workflows/` — 생성(월수금 아침) → 발행(10:07 KST, stop 댓글로 거부) → 지표 수집(매일) → 주제 보충(일요일)

## 필요 Secrets
`ANTHROPIC_API_KEY`, `IG_USER_ID`, `IG_ACCESS_TOKEN` (60일 갱신)

## 운영
- 발행 전 아침에 [발행 예고] 이슈가 열림 — 중지하려면 10:00 전에 `stop` 댓글
- 주제 추가: 대시보드의 주제 추가 버튼 (topic-request 이슈 → 자동 반영)
