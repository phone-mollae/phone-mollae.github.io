#!/usr/bin/env node
/* 유플리 — 주제 큐 자동 보충 (LLM 웹서치)
 * topics.json의 '대기' 주제가 MIN_QUEUE개 미만이면 웹서치 리서치로 ADD_COUNT개를 생성해 추가한다.
 * 실행: collect_topics.yml (매주 일요일 21:17 KST) 또는 수동 실행.
 * 필요 env: OPENAI_API_KEY(GPT 우선) 또는 ANTHROPIC_API_KEY(Claude 폴백)
 */
const fs = require('fs');
const path = require('path');
const { generate } = require('./llm');
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
  const text = await generate(`너는 인스타 통신 정보 채널 '유플리'의 편집장이다.

## 운영 가이드 (가드레일 반드시 준수)
${guide}

## 기존 주제 (중복 금지)
${existingList}

## 작업
웹서치로 지금 한국 통신·휴대폰 시장(신제품 출시·요금제·혜택·사용 팁 중심)의 새 소식과 소비자 관심사를 리서치해서, 새 주제 ${ADD_COUNT}개를 제안하라.
- 시리즈 배분: 신모델(신제품·출시·사전예약), 혜택(요금제·결합·멤버십), 꿀팁(설정·사용법·절약)을 고르게 섞어라.
- 관점은 소비자에게 유용한 정제된 정보. 공식 공개 정보로 확인 가능한 주제만. 지원금 구체 액수·특정 매장 유도·타사 비방 소재 금지.
- note에는 핵심 메시지와 근거(출처 매체명 포함)를 적어라. 웹서치로 확인 안 되는 수치는 쓰지 마라.

응답은 JSON 배열만 출력하라. 코드블록 없이:
[{"series":"신모델","topic":"주제","note":"핵심 메시지 / 근거·출처"}]`);
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
