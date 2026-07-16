/**
 * Light sanitizer for organiser-authored rich text (bold/italic/underline,
 * h3/h4, paragraphs and bullet lists from the listing wizard). Strips
 * anything executable rather than whitelisting, since the input is
 * semi-trusted (organiser-authored, admin-reviewed).
 */
export function sanitizeHtml(html: string): string {
  return html
    // remove dangerous elements and their content
    .replace(/<(script|style|iframe|object|embed|form)\b[\s\S]*?<\/\1>/gi, "")
    // remove self-closing / unclosed dangerous tags
    .replace(/<\/?(script|style|iframe|object|embed|form|link|meta|base)\b[^>]*>/gi, "")
    // strip inline event handlers (onclick="…", onerror='…', onload=x)
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    // neutralise javascript:/data: URLs in href/src
    .replace(/\s(href|src)\s*=\s*("|')?\s*(javascript|data|vbscript):[^"'\s>]*("|')?/gi, "");
}
