// Target DAP otomatis: target toko = kontribusi L3M toko × target total salesman (milestone / BTI), minimal batas retail/grosir.
// Toko aturan khusus (mis. Vini) memakai target BTI per toko yang sudah ditentukan (milestone = BTI × 1,1).
import { parseRoute, visitDays } from './calc.js';
import { ruleTarget } from './rules.js';

const r1000 = (n) => Math.round(n / 1000) * 1000;

export function autoDapRows(data, mode) {
  const T = data.targets?.[mode] || data.targets?.milestone || {};
  const rows = [];
  const notes = [];
  for (const name of data.salesmen) {
    const list = data.stores.filter((s) => s.sales === name && s.hk && parseRoute(s.hk).wd);
    if (!list.length) continue;
    const ruled = list.filter((s) => s.rule);
    const normal = list.filter((s) => !s.rule);
    const tTotal = T[name]?.total || normal.reduce((a, s) => a + s.tgt, 0);
    const sumL3 = normal.reduce((a, s) => a + s.l3m, 0);
    let sumT = 0;
    let floored = 0;
    for (const s of normal) {
      const raw = sumL3 > 0 ? (s.l3m / sumL3) * tTotal : tTotal / normal.length;
      const min = s.min || 200000;
      let t = r1000(raw);
      if (t < min) { t = min; floored++; }
      sumT += t;
      rows.push(mk(s, t, 'L3M'));
    }
    for (const s of ruled) {
      const r = (data.rules?.items || []).find((x) => x.sales === name);
      const bti = s.tgtBti ?? 0;
      const t = ruleTarget({ bti }, mode, r?.factor);
      sumT += t;
      rows.push(mk(s, t, 'aturan'));
    }
    notes.push({ sales: name, target: tTotal, sum: sumT, over: sumT - (ruled.length ? tTotal : tTotal), floored, n: list.length });
  }
  return { rows, notes };
}

const mk = (s, t, src) => ({ id: s.id, n: s.name, s: s.sales, r: s.hk, ch: s.cc1 && s.cc1 !== '-' ? s.cc1 : '', t, e: 0, hp: '', par: s.pj ? 'P' : '', so: 0, m: [0, 0, 0], a: s.act, src });

export const visitsInMonth = (hk, y, m, holidays) => { try { return visitDays(parseRoute(hk), y, m, holidays).length; } catch { return 0; } };
