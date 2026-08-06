#!/usr/bin/env node
/* 사장님몰래 — 주제 큐 자동 보충 (Claude API 웹서치)
 * topics.json의 '대기' 주제가 MIN_QUEUE개 미만이면 웹서치 리서치로 ADD_COUNT개를 생성해 추가한다.
 * 실행: collect_topics.yml (매주 일요일 21:17 KST) 또는 수동 실행. 필요 env: ANTHROPIC_API_KEY
 */
const fs = require('fs');
const path = require('path');

const KEY = process.env.ANTHROPIC_API_KEY;
if (!KEY) { console.error('ANTHROPIC_API_KEY 필요'); process.exit(1); }
const MODEL = process.env.MODEL || 'claude-sonnet-4-5';
const MIN_QUEUE = parseInt(process.env.MIN_QUEUE || '6', 10);
const ADD_COUNT = parseInt(process.env.ADD_COUNT || '6', 10);
const root = __dirname;

const topicsPath = path.join(root, 'topics.json');
const topics = JSON.parse(fs.readFileSync(topicsPath, 'utf8'));
const waiting = topics.filter(t => t.status === '대기').length;
console.log(`대기 주제 ${waiting}개 (보충 기준: ${MIN_QUEUE}개 미만)`);
if (waiting >= MIN_QUEUE) { console.log('충분 — 보충 불필요'); process.exit(0); }

const guide = fs.readFileSync(path.join(root, 'guide.md'), 'utf8');
const existingList = topics.map(t => `- [${t.series}] ${t.topic}`).join('\n');

function nextIssueNo(series) {
  const nums = topics.filter(t => t.series === series)
    .map(t => parseInt(String(t.issueNo).replace(/[^0-9]/g, ''), 10) || 0);
  const n = (nums.length ? Math.max(...nums) : 0) + 1;
  return '#' + String(n).padStart(3, '0');
}

async function main() {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4000,
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 8 }],
      messages: [{
        role: 'user',
        content: `너는 통신 소비자 대상 인스타 정보지 '사장님몰래'의 편집장이다.

## 운영 가이드 (가드레일 반드시 준수)
${guide}

## 기존 주제 (중복 금지)
${existingList}

## 작업
웹서치로 지금 한국 통신·휴대폰 시장(지원금·요금제·유통 구조·단말 트렌드 중심)의 화제·통계·논쟁·제도 변화를 리서치해서, 새 주제 ${ADD_COUNT}개를 제안하라.
- 시리즈 배분: TRUTH CUT(지원금·요금제·가격 구조 해부), GUARD CUT(매장 영업 패턴·소비자 방어법), DATA CUT(시장 통계·비용 구조)를 고르게 섞어라.
- 관점은 소비자의 실익. 판매인·사장 전체를 적대화하지 말 것. 실명·특정 업체·특정 매장 비판 금지, '성지' 구매 유도 금지, 지원금 구체 액수 금지.
- note에는 핵심 메시지와 근거(출처 매체명 포함)를 적어라. 웹서치로 확인 안 되는 수치는 쓰지 마라.

응답은 JSON 배열만 출력하라. 코드블록 없이:
[{"series":"TRUTH CUT","topic":"주제","note":"핵심 메시지 / 근거·출처"}]`,
      }],
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(JSON.stringify(data.error));
  const text = data.content.filter(b => b.type === 'text').map(b => b.text).join('');
  const jsonStr = text.slice(text.indexOf('['), text.lastIndexOf(']') + 1);
  const newTopics = JSON.parse(jsonStr);
  let added = 0;
  for (const t of newTopics) {
    if (!t.series || !t.topic) continue;
    if (topics.some(x => x.topic === t.topic)) continue;
    topics.push({ series: t.series, issueNo: nextIssueNo(t.series), topic: t.topic, note: t.note || '', status: '대기' });
    added++;
  }
  fs.writeFileSync(topicsPath, JSON.stringify(topics, null, 2));
  console.log(`${added}개 주제 추가 — 총 대기 ${waiting + added}개`);
}
main().catch(e => { console.error('주제 수집 실패:', e.message); process.exit(1); });
