import * as XLSX from 'xlsx';
import fs from 'node:fs';
import { parseAll } from '../src/lib/parse.js';
const wb = XLSX.read(fs.readFileSync(process.argv[2]), { type: 'buffer', sheetRows: 8000 });
const ws = wb.Sheets['JKS SALESMAN'];
let n = 0;
for (const k of Object.keys(ws)) if (k[0] !== '!' && ws[k].v === 'Mikael Pangomoan Naibaho') { ws[k].v = 'Andi Salesman Baru'; ws[k].w = 'Andi Salesman Baru'; n++; }
console.log('sel diubah:', n);
const a = parseAll(wb, { fileName: 'x' });
console.log('arjuna:', a.arjuna?.salesmen);
console.log('warn:', a.arjuna?.warnings.filter((w) => /Andi|pivot/i.test(w)).map((w) => w.slice(0, 160)));
