/* 유플리 — LLM 호출 공용 모듈 (웹서치 포함 생성)
 * 우선순위: OPENAI_API_KEY 있으면 GPT(Responses API) → 없으면 ANTHROPIC_API_KEY로 Claude.
 * 두 키 모두 없으면 에러. 스크립트 쪽은 프롬프트만 넘기면 된다.
 */
async function generate(prompt, { maxTokens = 6000 } = {}) {
  const OPENAI = process.env.OPENAI_API_KEY;
  const ANTHROPIC = process.env.ANTHROPIC_API_KEY;

  if (OPENAI) {
    const res = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${OPENAI}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.MODEL || 'gpt-5.6',
        tools: [{ type: 'web_search' }],
        input: prompt,
        max_output_tokens: maxTokens,
      }),
    });
    const data = await res.json();
    if (data.error) throw new Error('OpenAI: ' + JSON.stringify(data.error));
    const text = (data.output || [])
      .filter(o => o.type === 'message')
      .flatMap(m => m.content || [])
      .filter(c => c.type === 'output_text')
      .map(c => c.text).join('');
    if (!text) throw new Error('OpenAI 응답에 텍스트가 없습니다: ' + JSON.stringify(data).slice(0, 300));
    console.log('LLM: OpenAI (' + (process.env.MODEL || 'gpt-5.6') + ')');
    return text;
  }

  if (ANTHROPIC) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.MODEL || 'claude-sonnet-4-5',
        max_tokens: Math.min(maxTokens, 8000),
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 5 }],
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const data = await res.json();
    if (data.error) throw new Error('Anthropic: ' + JSON.stringify(data.error));
    const text = data.content.filter(b => b.type === 'text').map(b => b.text).join('');
    console.log('LLM: Claude (' + (process.env.MODEL || 'claude-sonnet-4-5') + ')');
    return text;
  }

  throw new Error('OPENAI_API_KEY 또는 ANTHROPIC_API_KEY 시크릿이 필요합니다');
}

module.exports = { generate };
