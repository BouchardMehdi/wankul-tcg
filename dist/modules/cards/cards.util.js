"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeCardKey = normalizeCardKey;
function normalizeCardKey(input) {
    const raw = decodeURIComponent(input).trim();
    if (/^S\d+:\d{3}$/i.test(raw))
        return raw.toUpperCase();
    if (/^special:/i.test(raw))
        return raw;
    const m1 = raw.match(/^Wankul_S(\d+)_(\d{3})$/i);
    if (m1)
        return `S${m1[1]}:${m1[2]}`;
    const m2 = raw.match(/^S(\d+)[_-](\d{1,3})$/i);
    if (m2)
        return `S${m2[1]}:${String(Number(m2[2])).padStart(3, '0')}`;
    return raw;
}
//# sourceMappingURL=cards.util.js.map