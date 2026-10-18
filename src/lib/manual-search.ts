export interface ManualPage { number: number; text: string }
export interface ManualIndex { id: string; title: string; manufacturer: string; model: string; pages: ManualPage[]; blankPages: number }
export interface ManualHit { manual: ManualIndex; page: ManualPage; excerpt: string; score: number }
export function normalizeManualText(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\b([fes])\s*[.:-]?\s*(\d{1,5})\b/g, (_match, prefix: string, digits: string) => prefix + String(Number(digits))).replace(/\s+/g, ' ').trim();
}
export function searchManuals(manuals: ManualIndex[], query: string, selected = ''): ManualHit[] {
  const words = normalizeManualText(query).split(' ').filter(Boolean);
  if (!words.length) return [];
  const hits: ManualHit[] = [];
  for (const manual of manuals) {
    if (selected && manual.id !== selected) continue;
    for (const page of manual.pages) {
      const text = normalizeManualText(page.text);
      // Fault codes are whole tokens: F.022 must not match F.0220.
      const found = words.map(w => /^[fes]\d+$/.test(w) ? new RegExp('\\b' + w + '\\b').test(text) : text.includes(w));
      if (!found.every(Boolean)) continue;
      const lines = page.text.split('\n');
      const line = Math.max(0, lines.findIndex(l => words.some(w => normalizeManualText(l).includes(w))));
      const excerpt = lines.slice(Math.max(0, line - 1), line + 7).join('\n').slice(0, 1100);
      hits.push({manual, page, excerpt, score: text.includes(words.join(' ')) ? 2 : 1});
    }
  }
  return hits.sort((a,b) => b.score-a.score || a.page.number-b.page.number);
}
