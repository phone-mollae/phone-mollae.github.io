# 유플리 — 통신 정보 자동 발행 시스템

인스타 통신 정보 채널 '유플리'(@uplus_uply)의 무인 발행 저장소.
담당자가 대시보드에서 주제를 입력하면 → 자동 리서치(웹서치·출처 확인) → 카드뉴스·릴스 생성 → 검수 이슈 → 인스타 자동 게시.

## 구조
- `guide.md` — 콘텐츠 가이드 (브랜드·톤·가드레일·그로스 규칙)
- `design.json` — 디자인 값 (색상·로고·시리즈) — 대시보드 '디자인 설정'으로 변경
- `topics.json` — 주제 큐 (status: 대기 → 생성완료)
- `generate.js` → `make_cards.js`/`make_reel.js` — Claude API 생성 → 카드·릴스 렌더링
- `publish_carousel.js`/`publish_reel.js` — Instagram Graph API 게시
- `.github/workflows/` — 생성(월수금 아침) → 발행(10:07 KST, stop 댓글로 거부) → 지표 수집(매일) → 주제 보충(일요일) → 주제/디자인 이슈 자동 반영

## 필요 Secrets
`ANTHROPIC_API_KEY`, `IG_USER_ID`, `IG_ACCESS_TOKEN` (60일 갱신)

## 담당자 운영 (대시보드에서)
- 주제 추가: [＋ 주제 추가] 버튼 → 양식 채워 이슈 등록 → 자동으로 큐 반영
- 디자인 변경: [🎨 디자인 설정] 버튼 → 색상·문구 수정 → 다음 발행부터 적용
- 발행 중지: 아침 [발행 예고] 이슈에 10:00 전 `stop` 댓글
