/**
 * ============================================================================
 * [sanitizeHtml.ts] 서식 메모(contentEditable)용 HTML 정화기
 * ============================================================================
 * 웹페이지에서 복사·붙여넣기한 HTML에 숨어 있는 스크립트, 이벤트 속성(onerror 등),
 * javascript: 링크, iframe 등을 제거하고 굵게·색상·목록 같은 기본 서식만 남깁니다.
 */

const ALLOWED_TAGS = new Set([
  'B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'MARK', 'SMALL', 'SUB', 'SUP',
  'SPAN', 'FONT', 'DIV', 'P', 'BR', 'UL', 'OL', 'LI', 'H1', 'H2', 'H3', 'H4', 'BLOCKQUOTE', 'HR',
]);

// 태그 자체와 내부 내용까지 통째로 제거할 위험 요소
const DROP_WITH_CONTENT = new Set([
  'SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'LINK', 'META', 'TEMPLATE', 'SVG', 'MATH', 'NOSCRIPT', 'FORM', 'INPUT', 'TEXTAREA', 'SELECT', 'BUTTON',
]);

const ALLOWED_STYLE_PROPS = new Set([
  'color', 'background-color', 'font-weight', 'font-style', 'text-decoration', 'text-align', 'font-size',
]);

function cleanStyle(style: string): string {
  return style
    .split(';')
    .map((decl) => decl.trim())
    .filter(Boolean)
    .filter((decl) => {
      const [prop, ...rest] = decl.split(':');
      const value = rest.join(':').toLowerCase();
      return (
        ALLOWED_STYLE_PROPS.has(prop.trim().toLowerCase()) &&
        !value.includes('url(') &&
        !value.includes('expression') &&
        !value.includes('javascript')
      );
    })
    .join('; ');
}

function sanitizeNode(node: Node, doc: Document): Node | null {
  if (node.nodeType === Node.TEXT_NODE) return doc.createTextNode(node.textContent || '');
  if (node.nodeType !== Node.ELEMENT_NODE) return null;

  const el = node as Element;
  const tag = el.tagName.toUpperCase();
  if (DROP_WITH_CONTENT.has(tag)) return null;

  const children = Array.from(el.childNodes)
    .map((child) => sanitizeNode(child, doc))
    .filter((c): c is Node => c !== null);

  // 허용되지 않은 태그는 껍데기만 벗기고 내용(텍스트)은 유지
  if (!ALLOWED_TAGS.has(tag)) {
    const frag = doc.createDocumentFragment();
    children.forEach((c) => frag.appendChild(c));
    return frag;
  }

  const clean = doc.createElement(tag.toLowerCase());
  const style = el.getAttribute('style');
  if (style) {
    const safeStyle = cleanStyle(style);
    if (safeStyle) clean.setAttribute('style', safeStyle);
  }
  if (tag === 'FONT') {
    const color = el.getAttribute('color');
    if (color && /^#?[0-9a-z]{3,20}$/i.test(color)) clean.setAttribute('color', color);
    const size = el.getAttribute('size');
    if (size && /^[1-7]$/.test(size)) clean.setAttribute('size', size);
  }
  children.forEach((c) => clean.appendChild(c));
  return clean;
}

/**
 * 신뢰할 수 없는 HTML 문자열을 안전한 서식 HTML로 변환합니다.
 */
export function sanitizeRichHtml(dirty: string | null | undefined): string {
  if (!dirty) return '';
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return String(dirty).replace(/[<>]/g, '');
  }
  try {
    // DOMParser 로 만든 문서는 스크립트가 실행되지 않는 비활성 문서입니다.
    const parsed = new DOMParser().parseFromString(`<body>${dirty}</body>`, 'text/html');
    const out = document.implementation.createHTMLDocument('');
    const container = out.createElement('div');
    Array.from(parsed.body.childNodes).forEach((child) => {
      const cleaned = sanitizeNode(child, out);
      if (cleaned) container.appendChild(cleaned);
    });
    return container.innerHTML;
  } catch {
    return '';
  }
}
