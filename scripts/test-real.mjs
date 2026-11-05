import * as XLSX from 'xlsx';
import fs from 'node:fs';
import { parseMain, buildData } from '../src/lib/ingest.js';
import { derive, timeInfo } from '../src/lib/calc.js';
const f = process.argv[2];
const wb = XLSX.read(fs.readFileSync(f), { type: 'buffer', sheetRows: 8000 });
const r = parseMain(wb, { team: 'arjuna', fileName: f });
const d = buildData({ main: r.data }, 'kebayoran', 'arjuna');
console.log('salesmen:', d.salesmen);
console.log('warnings:'); for (const w of d.warnings) console.log(' -', w.slice(0, 330));
const vs = d.stores.filter((s) => s.sales === 'Vini');
console.log('Vini stores', vs.length, 'ACT jt', (vs.reduce((a, s) => a + s.act, 0) / 1e6).toFixed(1), 'tgt milestone jt', (vs.reduce((a, s) => a + s.tgt, 0) / 1e6).toFixed(1), '| targets:', JSON.stringify(d.targets.milestone.Vini), JSON.stringify(d.targets.bti?.Vini));
const t = timeInfo(d.meta.period, null);
for (const mode of ['milestone', 'bti']) { const D = derive(d, mode, t); console.log(mode, D.sales.map((x) => `${x.name.split(' ')[0]} tgt ${(x.tgt / 1e6).toFixed(1)} act ${(x.act / 1e6).toFixed(1)}`).join(' | ')); }

import { autoDapRows, visitsInMonth } from '../src/lib/dapAuto.js';
import { buildDap, DEFAULT_DAP } from '../src/lib/dapModel.js';
for (const mode of ['milestone', 'bti']) {
  const a = autoDapRows(d, mode);
  console.log(`\nDAP otomatis [${mode}] baris ${a.rows.length}`);
  for (const n of a.notes) console.log(`  ${n.sales.split(' ')[0].padEnd(8)} target ${(n.target / 1e6).toFixed(1)} jt | jumlah target toko ${(n.sum / 1e6).toFixed(1)} jt | selisih ${(n.over / 1e6).toFixed(2)} jt | toko kena batas minimum ${n.floored} / ${n.n}`);
}
const a = autoDapRows(d, 'milestone');
const dd = { ...d, dap: a.rows };
const tt = { y: 2026, m: 11, tg: 0.1, sisa: 24, hk: 2, total: 26, asOf: '2 Nov' };
const m = buildDap(dd, tt, 6, [], { ...DEFAULT_DAP, tmode: 'both' });
console.log('\nkolom:', m.head.map((h) => h.label).join(' | '));
const g = m.groups.find((x) => x.name === 'Vini') || m.groups[0];
console.log('grup', g.name, 'toko', g.rows.length);
for (const r of g.rows.slice(0, 4)) console.log('  ', r.cells.slice(0, 9).join(' | '));
