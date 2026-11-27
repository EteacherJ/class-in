import React from 'react';

/**
 * 📝 메모 글 서식 보여주기
 *  - **굵게**, *기울임*, <u>밑줄</u> 표시를 실제 모양으로 바꿔서 보여줘요 (기호가 화면에 그대로 나오지 않게)
 *  - 예전 버전의 '📌 [중요] 텍스트📌 [중요]' 같은 남은 표시는 깔끔하게 정리해요
 *  - HTML을 직접 넣지 않고 React 글자로만 만들어서 안전해요
 */
export function cleanLegacyMemo(text: string): string {
  return String(text || '')
    .replace(/📌 \[중요\] 텍스트📌 \[중요\] ?/g, '')
    .replace(/📌 \[중요\] ?/g, '📌 ');
}

const TOKEN = /(\*\*[^*\n]+\*\*|<u>[^<\n]+<\/u>|\*[^*\n]+\*)/g;

export function renderMemoText(text: string): React.ReactNode[] {
  const clean = cleanLegacyMemo(text);
  const out: React.ReactNode[] = [];
  clean.split(TOKEN).forEach((part, i) => {
    if (!part) return;
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) out.push(<strong key={i}>{part.slice(2, -2)}</strong>);
    else if (part.startsWith('<u>') && part.endsWith('</u>')) out.push(<u key={i}>{part.slice(3, -4)}</u>);
    else if (part.startsWith('*') && part.endsWith('*') && part.length > 2) out.push(<em key={i}>{part.slice(1, -1)}</em>);
    else out.push(<React.Fragment key={i}>{part}</React.Fragment>);
  });
  return out;
}
