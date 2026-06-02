export function normalizeCardKey(input: string): string {
  const raw = decodeURIComponent(input).trim();

  // Déjà au bon format: S1:001
  if (/^S\d+:\d{3}$/i.test(raw)) return raw.toUpperCase();

  // Special keys
  if (/^special:/i.test(raw)) return raw;

  // Wankul_S1_001 -> S1:001
  const m1 = raw.match(/^Wankul_S(\d+)_(\d{3})$/i);
  if (m1) return `S${m1[1]}:${m1[2]}`;

  // S1_001 ou S1-001 -> S1:001
  const m2 = raw.match(/^S(\d+)[_-](\d{1,3})$/i);
  if (m2) return `S${m2[1]}:${String(Number(m2[2])).padStart(3, '0')}`;

  return raw;
}
