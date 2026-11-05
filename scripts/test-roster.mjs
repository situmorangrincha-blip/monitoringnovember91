import * as XLSX from 'xlsx';
import fs from 'node:fs';
import { parseAll } from '../src/lib/parse.js';
const f = process.argv[2];
const wb = XLSX.read(fs.readFileSync(f), { type: 'buffer', sheetRows: 8000 });
const a = parseAll(wb, { fileName: 'x', roster: { arjuna: ['hendra'], bima: ['asep'] } }); // roster sengaja dibuat sempit
console.log('arjuna:', a.arjuna?.salesmen, '| bima:', a.bima?.salesmen);
console.log('warnings:', a.warnings.filter((w) => /tidak terbaca/.test(w)));
const b = parseAll(wb, { fileName: 'x' });
console.log('default roster arjuna:', b.arjuna?.salesmen);
