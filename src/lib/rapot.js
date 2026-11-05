// Rapot salesman: nilai 0-100 per indikator, dirata-rata berbobot (indikator tanpa data dilewati, bobotnya dibagi ke yang ada).
export const IND = [
  { id: 'omset', label: 'Omset vs target', w: 40, how: 'ACT ÷ (target × timegone), maksimal 100' },
  { id: 'ca', label: 'CA (toko transaksi)', w: 10, how: 'toko dengan ACT ≥ Rp1 ÷ jumlah toko' },
  { id: 'caprod', label: 'CA Produktif', w: 10, how: 'toko dengan ACT ≥ minimum ÷ jumlah toko' },
  { id: 'pareto', label: 'Toko Pareto', w: 15, how: 'ACT toko Pareto ÷ (targetnya × timegone), maksimal 100' },
  { id: 'gs', label: 'GreenStore', w: 15, how: 'actual ÷ target GreenStore, maksimal 100' },
  { id: 'growth', label: 'Pertumbuhan vs LM', w: 10, how: 'ACT ÷ (LM × timegone), maksimal 100' },
];
export const DEFAULT_W = Object.fromEntries(IND.map((i) => [i.id, i.w]));
const cap = (v) => Math.max(0, Math.min(100, v));
const sum = (a, f) => a.reduce((t, x) => t + f(x), 0);
export const grade = (v) => (v >= 85 ? 'Sangat baik' : v >= 70 ? 'Baik' : v >= 55 ? 'Cukup' : 'Perlu perhatian');

export function scoreSalesman(data, name, mode, time, W = DEFAULT_W) {
  const stores = data.stores.filter((s) => s.sales === name);
  const act = sum(stores, (s) => s.act);
  const tgt = data.targets?.[mode]?.[name]?.total || data.targets?.milestone?.[name]?.total || sum(stores, (s) => s.tgt);
  const tg = time.tg;
  const n = stores.length;
  const ind = {};
  ind.omset = tgt > 0 && tg > 0 ? { raw: act / (tgt * tg), score: cap((act / (tgt * tg)) * 100), note: `ACT ${Math.round(act / 1e6)} jt dari target ${Math.round(tgt / 1e6)} jt` } : null;
  ind.ca = n ? { raw: stores.filter((s) => s.act >= 1).length / n, score: cap((stores.filter((s) => s.act >= 1).length / n) * 100), note: `${stores.filter((s) => s.act >= 1).length} dari ${n} toko` } : null;
  ind.caprod = n ? { raw: stores.filter((s) => s.act >= (s.min || 200000)).length / n, score: cap((stores.filter((s) => s.act >= (s.min || 200000)).length / n) * 100), note: `${stores.filter((s) => s.act >= (s.min || 200000)).length} dari ${n} toko` } : null;
  const par = stores.filter((s) => s.pj);
  const pT = sum(par, (s) => (mode === 'bti' && s.tgtBti != null ? s.tgtBti : s.tgt));
  ind.pareto = par.length && pT > 0 && tg > 0 ? { raw: sum(par, (s) => s.act) / (pT * tg), score: cap((sum(par, (s) => s.act) / (pT * tg)) * 100), note: `${par.length} toko Pareto` } : null;
  const gs = (data.prog || []).filter((x) => /green/i.test(x.p) && !x.id && x.s && x.s.toLowerCase() === name.toLowerCase());
  const gT = sum(gs, (x) => x.t);
  ind.gs = gT > 0 ? { raw: sum(gs, (x) => x.a) / gT, score: cap((sum(gs, (x) => x.a) / gT) * 100), note: `${sum(gs, (x) => x.a)} dari ${gT}` } : null;
  const lm = sum(stores, (s) => s.lm);
  ind.growth = lm > 0 && tg > 0 ? { raw: act / (lm * tg), score: cap((act / (lm * tg)) * 100), note: `LM ${Math.round(lm / 1e6)} jt` } : null;

  let ws = 0, tot = 0;
  for (const i of IND) { const x = ind[i.id]; if (x && W[i.id] > 0) { ws += W[i.id]; tot += W[i.id] * x.score; } }
  const total = ws > 0 ? tot / ws : null;
  const sc = IND.filter((i) => ind[i.id]).map((i) => ({ id: i.id, label: i.label, score: ind[i.id].score }));
  const strong = [...sc].sort((a, b) => b.score - a.score).slice(0, 2);
  const weak = [...sc].sort((a, b) => a.score - b.score).slice(0, 2);
  const withT = stores.filter((s) => s.tgt > 0 && tg > 0).map((s) => ({ s, r: s.act / (s.tgt * tg) }));
  const best = [...stores].sort((a, b) => b.act - a.act).slice(0, 3);
  const worst = withT.sort((a, b) => a.r - b.r).slice(0, 3).map((x) => x.s);
  return { name, act, tgt, n, ind, total, strong, weak, best, worst, skipped: IND.filter((i) => !ind[i.id]).map((i) => i.label) };
}

export function rapotAll(data, mode, time, W = DEFAULT_W) {
  const ruled = new Set((data.rules?.items || []).map((r) => r.sales));
  const rows = data.salesmen.map((nm) => ({ ...scoreSalesman(data, nm, mode, time, W), ranked: !ruled.has(nm) }));
  const rk = rows.filter((r) => r.ranked && r.total != null).sort((a, b) => b.total - a.total);
  rk.forEach((r, i) => { r.rank = i + 1; });
  return { rows, ranked: rk, nRanked: rk.length };
}
