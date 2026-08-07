#!/usr/bin/env node
/* 유플리 — 콘텐츠 자동 생성
 * topics.json에서 '대기' 주제를 꺼내 → LLM(웹서치 포함)으로 post.json 생성
 * → posts/YYYY-MM-DD/ 에 저장하고 topics.json 상태 갱신.
 * 필요 env: OPENAI_API_KEY(GPT 우선) 또는 ANTHROPIC_API_KEY(Claude 폴백). 선택: MODEL
 */
const fs = require('fs');
const path = require('path');
const { generate } = require('./llm');

const root = __dirname;

const topics = JSON.parse(fs.readFileSync(path.join(root, 'topics.json'), 'utf8'));
const guide = fs.readFileSync(path.join(root, 'guide.md'), 'utf8');
const todo = topics.find(t => t.status === '대기');
if (!todo) { console.error('대기 주제가 없습니다 — topics.json을 채워주세요'); process.exit(2); }

const today = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10); // KST 기준 날짜 (UTC 크론이 한국 새벽에 돌아도 오늘 폴더가 맞도록)
const outDir = path.join(root, 'posts', today);

const SCHEMA_EXAMPLE = {
  series: '신모델', issueNo: '#002',
  cards: [
    { type: 'cover', kicker: '주제 라벨 한 줄', headline: '한 줄씩 줄바꿈한\n정보형 헤드라인\n**핵심 강조**', headlineSize: 84 },
    { type: 'content', title: '소제목', text: '본문. **마커 강조**와 <b>흰색 강조</b> 사용, \\n\\n 단락 구분' },
    { type: 'content', title: '체크리스트형 소제목', points: ['항목 1 **강조**', '항목 2', '항목 3', '항목 4'] },
    { type: 'cta', title: 'CTA 소제목', text: 'CTA 본문\n**강조**', sub: '프로필 링크 안내', disclaimer: '면책 문구' },
  ],
  caption: '캡션 본문 + 해시태그 15개 (#유플리 포함)',
};

async function main() {
  console.log(`주제: [${todo.series} ${todo.issueNo}] ${todo.topic}`);
  const text = await generate(`너는 인스타 통신 정보 채널 '유플리'의 콘텐츠 에디터다. 유플리는 통신 소식을 알기 쉽게 정리해주는 친절한 큐레이터다 — 밝고 단정한 존댓말, 과장 없는 정보 전달.

## 운영 가이드 (가드레일 반드시 준수)
${guide}

## 오늘의 주제
- 시리즈: ${todo.series} ${todo.issueNo}
- 주제: ${todo.topic}
- 핵심 메시지/근거: ${todo.note}

## 작업
1. 필요하면 웹서치로 사실·통계·출처를 확인하라 (통계는 출처 필수, 확인 안 되는 수치는 쓰지 마라).
2. 카드뉴스 post.json을 작성하라. 표지 1장 + 본문 2~3장 + CTA 1장. 아래 스키마를 정확히 따르라:
${JSON.stringify(SCHEMA_EXAMPLE, null, 2)}

규칙: **텍스트**는 포인트 컬러 강조, <b>텍스트</b>는 진한 굵게. 표지에는 kicker(주제 라벨 한 줄)를 넣어라. 카드 본문에 특정 연·월 표기 금지(현재형 프레이밍). 법률·세무 주제면 CTA 카드에 disclaimer 필수. 캡션 끝에 출처 표기와 해시태그(#유플리 포함 15개 내외).

응답은 post.json의 JSON만 출력하라. 코드블록 없이 순수 JSON.`);
  const jsonStr = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
  const post = JSON.parse(jsonStr);
  post.series = todo.series; post.issueNo = todo.issueNo; 

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'post.json'), JSON.stringify(post, null, 2));
  todo.status = `생성완료(${today})`;
  fs.writeFileSync(path.join(root, 'topics.json'), JSON.stringify(topics, null, 2));
  console.log(`post.json 저장: posts/${today}/`);
  fs.writeFileSync(path.join(root, '.last_post_dir'), `posts/${today}`);
}
main().catch(e => { console.error('생성 실패:', e.message); process.exit(1); });
