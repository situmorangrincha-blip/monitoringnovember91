import { useEffect, useMemo, useState } from 'react';
import { fmt, weekdayName } from '../lib/calc.js';
import { COLS, DEFAULT_DAP, colFor, promoCols, buildDap, cardColumns, cardHeadLine, cardRows, catOptions, skuOptions, skusOfCat } from '../lib/dapModel.js';
import { Panel } from '../components/ui.jsx';
import { autoDapRows } from '../lib/dapAuto.js';
import { catOf, ctargetIndex, nk } from '../lib/ctarget.js';

const pad = (n) => String(n).padStart(2, '0');
const MON = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const IND = [['tgt', 'Target'], ['act', 'Actual Rp'], ['qty', 'Qty'], ['gap', 'Gap'], ['ach', '% Ach'], ['ca', 'Sudah beli?']];
const load = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };

export function defaultDapDate(time, now = new Date()) {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' });
  const [y, m, d] = f.format(now).split('-').map(Number);
  return y === time.y && m === time.m ? d : 1;
}

export default function Dap({ data: data0, mode = 'milestone', time, day, setDay, holidays, setHolidays, depot, team, openPreview }) {
  const ckey = `sm_dap_${depot}_${team}`;
  const hasSheet = !!data0.dap?.length && !data0.meta?.dapAuto;
  const [cfg, setCfg] = useState(() => ({ ...DEFAULT_DAP, ...(load(ckey) || {}), par: { ...DEFAULT_DAP.par, ...(load(ckey)?.par || {}) } }));
  const [busy, setBusy] = useState('');
  const [holTxt, setHolTxt] = useState(holidays.join(', '));
  const [skuQ, setSkuQ] = useState('');
  const [skuQ2, setSkuQ2] = useState('');
  const [openCards, setOpenCards] = useState(null);
  useEffect(() => { localStorage.setItem(ckey, JSON.stringify(cfg)); }, [cfg, ckey]);
  const setPar = (p) => setCfg((c) => ({ ...c, par: { ...c.par, ...p } }));

  const last = new Date(time.y, time.m, 0).getDate();
  const d = Math.min(Math.max(1, day), last);
  const wd = new Date(time.y, time.m - 1, d).getDay();
  const iso = `${time.y}-${pad(time.m)}-${pad(d)}`;
  const useAuto = !hasSheet || cfg.src !== 'sheet';
  const auto = useMemo(() => (useAuto ? autoDapRows(data0, mode) : null), [useAuto, data0, mode]);
  const data = useMemo(() => (auto ? { ...data0, dap: auto.rows } : data0), [auto, data0]);
  const model = useMemo(() => buildDap(data, time, d, holidays, { ...cfg, mode }), [data, time, d, holidays, cfg, mode]);
  const stale = d > (time.dataDay || 0) + 1;
  const tot = model.groups.reduce((a, g) => ({ t: a.t + g.target, a: a.a + g.actual, p: a.p + g.plan, c: a.c + g.cards.length }), { t: 0, a: 0, p: 0, c: 0 });

  const skus = useMemo(() => skuOptions(data), [data]);
  const cats = useMemo(() => catOptions(data), [data]);
  const filt = (arr, q) => arr.filter((x) => !q || `${x.n} ${x.k} ${x.b}`.toLowerCase().includes(q.toLowerCase())).slice(0, 80);

  const move = (delta) => {
    let n = d;
    for (let i = 0; i < 40; i++) { n += delta; if (n < 1 || n > last) return; if (new Date(time.y, time.m - 1, n).getDay() !== 0) { setDay(n); return; } }
  };
  const saveHol = () => {
    const arr = [...new Set(holTxt.split(/[,\s]+/).map((x) => parseInt(x, 10)).filter((x) => x >= 1 && x <= last))].sort((a, b) => a - b);
    setHolidays(arr); setHolTxt(arr.join(', '));
  };

  const colMove = (k, dir) => setCfg((c) => {
    const a = [...c.cols]; const i = a.indexOf(k); const j = i + dir;
    if (i < 0 || j < 0 || j >= a.length) return c;
    [a[i], a[j]] = [a[j], a[i]];
    return { ...c, cols: a };
  });
  const toggleCol = (k) => setCfg((c) => ({ ...c, cols: c.cols.includes(k) ? c.cols.filter((x) => x !== k) : [...c.cols, k] }));
  const toggleSkuMain = (k) => setCfg((c) => ({ ...c, skuMain: c.skuMain.includes(k) ? c.skuMain.filter((x) => x !== k) : [...c.skuMain, k] }));
  const toggleFocus = (t, k) => setPar({ focus: cfg.par.focus.some((f) => f.t === t && f.k === k) ? cfg.par.focus.filter((f) => !(f.t === t && f.k === k)) : [...cfg.par.focus, { t, k }] });

  const addCatMain = (cat) => setCfg((c) => ({ ...c, skuMain: [...new Set([...c.skuMain, ...skusOfCat(data, cat).map((x) => x.k)])] }));
  const addCatFocus = (cat) => setPar({ focus: [...cfg.par.focus.filter((f) => !(f.t === 'sku' && skusOfCat(data, cat).some((x) => x.k === f.k))), ...skusOfCat(data, cat).map((x) => ({ t: 'sku', k: x.k, g: cat }))] });
  const ci = useMemo(() => ctargetIndex(data, mode), [data, mode]);
  const prins = useMemo(() => [...new Set(data.subs.map((sb) => sb.p).filter((p) => p && p !== '-'))].sort(), [data.subs]);
  const kcat = useMemo(() => [...new Set(data.subs.map(catOf).filter(Boolean))].sort(), [data.subs]);
  const togK = (kind, key) => setCfg((c) => ({ ...c, kpick: (c.kpick || []).some((p) => p.kind === kind && p.key === key) ? c.kpick.filter((p) => !(p.kind === kind && p.key === key)) : [...(c.kpick || []), { kind, key }] }));
  const togKC = (m) => setCfg((c) => ({ ...c, kcols: (c.kcols || ['act', 'tgt', 'ach']).includes(m) ? c.kcols.filter((x) => x !== m) : [...(c.kcols || ['act', 'tgt', 'ach']), m] }));
  const nCols = model.head.length;
  async function pdf(only) {
    setBusy('Menyusun PDF...');
    try {
      const { makeDapPdf } = await import('../lib/dapPdf.js');
      await makeDapPdf({ data, model, only, y: time.y, m: time.m, d, cfg, asOf: time.asOf, depot });
    } catch (e) { alert('Gagal membuat PDF: ' + (e?.message || e)); }
    setBusy('');
  }

  if (!data.dap?.length) {
    return (
      <Panel title="DAP (DAILY ACCOUNT PLAN)">
        <div className="empty">
          <h2>Belum ada data DAP</h2>
          <p className="mut">Tidak ada sheet DAP dan tidak ada toko dengan target + hari kunjungan di data utama. Tambahkan sheet berjudul DAP … (kolom: Salesman, Hari/Rute, ID Pelanggan, Nama, Target) lalu upload ulang.</p>
        </div>
      </Panel>
    );
  }

  const cardCols = cardColumns(cfg.par, model.hasTgt);

  return (
    <div className="grid">
      <Panel title={`DAP ${data.meta.teamLabel?.toUpperCase() || ''} · ${weekdayName(wd).toUpperCase()} ${d} ${MON[time.m - 1].toUpperCase()} ${time.y}`} right={`${model.total} toko · ${model.groups.length} salesman`}>
        <div className="row">
          <button className="btn sm" onClick={() => move(-1)} aria-label="Hari sebelumnya">◀</button>
          <input className="input" style={{ minWidth: 0, width: 160 }} type="date" value={iso} min={`${time.y}-${pad(time.m)}-01`} max={`${time.y}-${pad(time.m)}-${pad(last)}`} onChange={(e) => { const v = e.target.value; if (v) setDay(parseInt(v.slice(8, 10), 10)); }} />
          <button className="btn sm" onClick={() => move(1)} aria-label="Hari berikutnya">▶</button>
          <span className="mut">{weekdayName(wd)}</span>
          <span style={{ flex: 1 }} />
          {openPreview && <button className="btn" disabled={!model.total} onClick={() => openPreview({ title: `DAP ${data0.meta.teamLabel || ''} · ${d} ${MON[time.m - 1]}`, file: `DAP-${depot}-${team}-${time.y}-${pad(time.m)}-${pad(d)}`, make: async () => { const { makeDapPdf } = await import('../lib/dapPdf.js'); return makeDapPdf({ data, model, only: null, y: time.y, m: time.m, d, cfg, asOf: time.asOf, depot, output: 'blob' }); } })}>Preview</button>}
          <button className="btn coin" disabled={!model.total || !!busy} onClick={() => pdf(null)}>{busy || 'Unduh PDF (semua salesman)'}</button>
        </div>
        {wd === 0 && <div className="warn">Hari Minggu tidak ada kunjungan.</div>}
        {stale && <div className="warn">Actual s/d {time.asOf} (data H-1). Kunjungan antara tanggal itu dan {d} belum terhitung.</div>}
        <div className="kpis k4" style={{ marginTop: 10 }}>
          <div className="kpi"><div className="l">Toko dikunjungi</div><div className="v">{model.total}</div><div className="s">{model.groups.length} salesman</div></div>
          <div className="kpi"><div className="l">Target DAP</div><div className="v">{fmt.jt(tot.t)}<small>jt</small></div><div className="s">toko hari ini</div></div>
          <div className="kpi"><div className="l">Actual MTD</div><div className="v">{fmt.jt(tot.a)}<small>jt</small></div><div className="s">gap {fmt.jt(tot.a - tot.t)} jt</div></div>
          <div className="kpi hero"><div className="l">PLAN hari ini</div><div className="v">{fmt.jt(tot.p)}<small>jt</small></div><div className="s">{cfg.par.on ? `${tot.c} halaman Fokus Pareto` : 'minimal target kunjungan'}</div></div>
        </div>
        <details style={{ marginTop: 10 }}>
          <summary style={{ cursor: 'pointer' }}>Tanggal libur (opsional)</summary>
          <div className="row" style={{ marginTop: 8 }}>
            <input className="input" style={{ minWidth: 0, width: 200 }} placeholder="mis. 17, 20" value={holTxt} onChange={(e) => setHolTxt(e.target.value)} />
            <button className="btn sm" onClick={saveHol}>Simpan</button>
          </div>
        </details>
      </Panel>

      <Panel title="ATUR ISI DAP" right={nCols > 14 ? <span className="low">{nCols} kolom: font PDF mengecil</span> : `${nCols} kolom`}>
        {data.skuMissing?.length > 0 && <div className="warn" style={{ marginBottom: 8 }}>{data.skuMissing.length} kode SKU di data Qty tidak ada di Database SKU ({data.skuMissing.slice(0, 5).join(', ')}{data.skuMissing.length > 5 ? '…' : ''}). Nama dan kategorinya diambil dari file Qty.</div>}
        <div className="opt-row">
          <b>Target DAP</b>
          <div className="seg">{[['total', 'Total'], ['visit', 'Per kunjungan'], ['both', 'Keduanya']].map(([v, l]) => <button key={v} className={(cfg.tmode || 'both') === v ? 'on' : ''} onClick={() => setCfg({ ...cfg, tmode: v })}>{l}</button>)}</div>
          {hasSheet && <><span className="mut">Sumber</span><div className="seg"><button className={useAuto ? 'on' : ''} onClick={() => setCfg({ ...cfg, src: 'auto' })}>Kontribusi L3M</button><button className={!useAuto ? 'on' : ''} onClick={() => setCfg({ ...cfg, src: 'sheet' })}>Sheet DAP</button></div></>}
          <span className="mut">Basis: {mode === 'bti' ? 'BTI' : 'Milestone'} (ikut pilihan di Performa)</span>
        </div>
        {useAuto && auto?.notes?.some((n) => n.over > 1000) && <div className="warn" style={{ marginBottom: 8 }}>Batas minimum retail/grosir membuat total target toko melebihi target salesman: {auto.notes.filter((n) => n.over > 1000).map((n) => `${n.sales.split(' ')[0]} +${fmt.jt(n.over, 2)} jt`).join(', ')}.</div>}
        <b>Kolom tabel DAP</b> <span className="mut">(No, Nama Toko, ID selalu ada)</span>
        <div className="cols-pick">
          {[...COLS.filter((c) => c.k !== 'blank' && c.k !== 'tv'), ...promoCols(data).map((k) => colFor(k, data))].map((c) => (
            <label key={c.k} className={cfg.cols.includes(c.k) ? 'on' : ''}>
              <input type="checkbox" checked={cfg.cols.includes(c.k)} onChange={() => toggleCol(c.k)} />{c.label}
            </label>
          ))}
          <label className={cfg.cols.includes('blank') ? 'on' : ''}><input type="checkbox" checked={cfg.cols.includes('blank')} onChange={() => toggleCol('blank')} />Kolom kosong</label>
        </div>
        <div className="row" style={{ margin: '4px 0 8px' }}>
          <span className="mut">Urutan:</span>
          {cfg.cols.map((k) => (
            <span key={k} className="pill">{colFor(k, data)?.label || 'Kosong'}<span className="ordr"><button onClick={() => colMove(k, -1)}>◀</button><button onClick={() => colMove(k, 1)}>▶</button></span></span>
          ))}
        </div>
        <div className="row" style={{ margin: '10px 0 4px' }}>
          <b>SKU fokus di tabel DAP</b>
          <span className="mut">{skus.length ? `${skus.length} SKU tersedia${data.skudb?.length ? ' (database SKU)' : ' (dari data qty)'}` : 'belum ada database SKU / data qty'}</span>
          <span style={{ flex: 1 }} />
          <span className="mut">Isi kolom:</span>
          <div className="seg"><button className={cfg.skuMetric === 'qty' ? 'on' : ''} onClick={() => setCfg({ ...cfg, skuMetric: 'qty' })}>Qty</button><button className={cfg.skuMetric === 'rp' ? 'on' : ''} onClick={() => setCfg({ ...cfg, skuMetric: 'rp' })}>Rp</button><button className={cfg.skuMetric === 'both' ? 'on' : ''} onClick={() => setCfg({ ...cfg, skuMetric: 'both' })}>Keduanya</button></div>
        </div>
        {skus.length > 0 && (
          <>
            {cats.length > 0 && <div className="row" style={{ marginBottom: 6 }}><span className="mut">Tambah semua SKU kategori:</span>{cats.map((c) => <button key={c} className="btn sm" onClick={() => addCatMain(c)}>+ {c}</button>)}</div>}
            <input className="input" style={{ width: 240, marginBottom: 6 }} placeholder="cari SKU / brand" value={skuQ} onChange={(e) => setSkuQ(e.target.value)} />
            <div className="skulist">
              {filt(skus, skuQ).map((s) => (
                <label key={s.k}><input type="checkbox" checked={cfg.skuMain.includes(s.k)} onChange={() => toggleSkuMain(s.k)} /><b>{s.n}</b><span className="mut">{s.k !== s.n ? s.k : ''} {s.b}{s.inData ? '' : ' · belum ada datanya'}</span></label>
              ))}
            </div>
            {cfg.skuMain.length > 0 && <div className="mt">{cfg.skuMain.map((k) => <span key={k} className="pill">{skus.find((s) => s.k === k)?.n || k}<button className="x" onClick={() => toggleSkuMain(k)}>×</button></span>)}</div>}
          </>
        )}

        <div className="row" style={{ margin: '14px 0 4px', borderTop: '1px solid var(--line)', paddingTop: 10 }}>
          <b>Kategori / principal di tabel DAP</b>
          <span className="mut">{ci.has ? 'target dari slot "Target kategori / principal" (~ = estimasi: target salesman dibagi ke toko menurut kontribusi L3M toko)' : 'upload slot "Target kategori / principal" untuk menampilkan target; tanpa itu hanya Actual'}</span>
        </div>
        {(kcat.length > 0 || prins.length > 0) ? (
          <>
            <div className="cols-pick">
              {prins.map((p) => <label key={'p' + p} className={(cfg.kpick || []).some((x) => x.kind === 'prin' && x.key === p) ? 'on' : ''}><input type="checkbox" checked={(cfg.kpick || []).some((x) => x.kind === 'prin' && x.key === p)} onChange={() => togK('prin', p)} />Principal {p}{ci.keys.prin.has(nk(p)) ? ' ✓' : ''}</label>)}
              {kcat.map((c) => <label key={'k' + c} className={(cfg.kpick || []).some((x) => x.kind === 'kat' && x.key === c) ? 'on' : ''}><input type="checkbox" checked={(cfg.kpick || []).some((x) => x.kind === 'kat' && x.key === c)} onChange={() => togK('kat', c)} />{c}{ci.keys.kat.has(nk(c)) ? ' ✓' : ''}</label>)}
            </div>
            <div className="opt-row"><span className="mut">Isi kolom</span>{[['act', 'Actual'], ['tgt', 'Target'], ['ach', '% Ach']].map(([m, l]) => <label key={m} className={'btn sm tog' + ((cfg.kcols || ['act', 'tgt', 'ach']).includes(m) ? ' on' : '')} style={{ cursor: 'pointer' }}><input type="checkbox" hidden checked={(cfg.kcols || ['act', 'tgt', 'ach']).includes(m)} onChange={() => togKC(m)} />{l}</label>)}</div>
          </>
        ) : <div className="mut">Belum ada data SKU: upload Omset per SKU dan Database SKU dulu.</div>}

        <div className="row" style={{ margin: '14px 0 4px', borderTop: '1px solid var(--line)', paddingTop: 10 }}>
          <b>Halaman Fokus Pareto</b>
          <label className="row" style={{ gap: 5 }}><input type="checkbox" checked={cfg.par.on} onChange={(e) => setPar({ on: e.target.checked })} />ikut di PDF dan preview</label>
        </div>
        {cfg.par.on && (
          <>
            <div className="mut" style={{ marginBottom: 6 }}>Toko Pareto JKS salesman yang jadwal kunjungannya jatuh di tanggal ini, satu toko satu halaman. Sep dan L3M tampil di header sebagai angka level toko.</div>
            <div className="opt-row">
              <span className="mut">Satuan</span>
              <div className="seg">{[['qty', 'Qty'], ['rp', 'Value Rp'], ['both', 'Keduanya']].map(([v, l]) => <button key={v} className={cfg.par.unit === v ? 'on' : ''} onClick={() => setPar({ unit: v })}>{l}</button>)}</div>
              <span className="mut">Toko per halaman</span>
              <div className="seg">{[1, 2].map((v) => <button key={v} className={cfg.par.perPage === v ? 'on' : ''} onClick={() => setPar({ perPage: v })}>{v}</button>)}</div>
            </div>
            <div className="cols-pick">
              {IND.map(([k, l]) => (
                <label key={k} className={cfg.par.inds.includes(k) ? 'on' : ''}>
                  <input type="checkbox" checked={cfg.par.inds.includes(k)} onChange={() => setPar({ inds: cfg.par.inds.includes(k) ? cfg.par.inds.filter((x) => x !== k) : [...cfg.par.inds, k] })} />{l}
                </label>
              ))}
              {[['hdr', 'Header Sep / L3M'], ['notes', 'Kotak catatan'], ['blank', 'Kolom Order kosong']].map(([k, l]) => (
                <label key={k} className={cfg.par[k] ? 'on' : ''}><input type="checkbox" checked={!!cfg.par[k]} onChange={(e) => setPar({ [k]: e.target.checked })} />{l}</label>
              ))}
            </div>
            <b>Fokus Pareto: pilih kategori (semua SKU-nya masuk) atau SKU satuan</b>
            {(kcat.length > 0 || prins.length > 0) && <div className="row" style={{ margin: '6px 0' }}><span className="mut">Baris total (dengan target):</span>{prins.map((p) => <button key={'fp' + p} className={'btn sm' + (cfg.par.focus.some((f) => f.t === 'prin' && f.k === p) ? ' tog on' : '')} onClick={() => toggleFocus('prin', p)}>Principal {p}</button>)}{kcat.map((c) => <button key={'fk' + c} className={'btn sm' + (cfg.par.focus.some((f) => f.t === 'cat' && f.k === c) ? ' tog on' : '')} onClick={() => toggleFocus('cat', c)}>Kategori {c}</button>)}</div>}
            {cats.length > 0 && <div className="row" style={{ margin: '6px 0' }}><span className="mut">Kategori:</span>{cats.map((c) => <button key={c} className="btn sm" onClick={() => addCatFocus(c)}>+ {c}</button>)}</div>}
            <div className="row" style={{ marginTop: 4 }}>
              <input className="input" style={{ width: 240 }} placeholder="cari SKU" value={skuQ2} onChange={(e) => setSkuQ2(e.target.value)} />
              {cfg.par.focus.map((f) => <span key={f.t + f.k} className="pill">{f.t === 'prin' ? 'Principal ' : f.t === 'cat' ? 'Kategori ' : ''}{f.g ? f.g + ' · ' : ''}{f.t === 'sku' ? (skus.find((x) => x.k === f.k)?.n || f.k) : f.k}<button className="x" onClick={() => toggleFocus(f.t, f.k)}>×</button></span>)}
            </div>
            <div className="skulist" style={{ marginTop: 6 }}>
              {filt(skus, skuQ2).map((x) => (
                <label key={x.k}><input type="checkbox" checked={cfg.par.focus.some((f) => f.t === 'sku' && f.k === x.k)} onChange={() => toggleFocus('sku', x.k)} /><b>{x.n}</b><span className="mut">{x.cat || x.b}</span></label>
              ))}
              {!skus.length && <div className="mut" style={{ padding: 6 }}>Belum ada SKU. Upload slot Qty / Database SKU.</div>}
            </div>
            {!cfg.par.focus.length && <div className="warn">Pilih minimal satu SKU atau kategori fokus supaya halaman Pareto muncul.</div>}
          </>
        )}
      </Panel>

      {model.groups.map((g) => (
        <Panel key={g.name} title={g.name.toUpperCase()} right={<><span>{g.n} toko · PLAN {fmt.jt(g.plan, 2)} jt </span><button className="btn sm" style={{ marginLeft: 6 }} onClick={() => pdf(g.name)}>PDF</button></>} flush>
          <div className="scroll">
            <table className="t">
              <thead><tr>{model.head.map((c, i) => <th key={i} className={i === 1 || i === 2 ? 'l' : ''}>{c.label}</th>)}</tr></thead>
              <tbody>
                {g.rows.map((x) => (
                  <tr key={x.r.id + x.r.s}>
                    {x.cells.map((v, i) => <td key={i} className={i === 1 ? 'l nm' : i === 2 ? 'l mut' : model.head[i].neg && String(v).startsWith('-') ? 'neg' : v === 'tercapai' ? 'ok' : ''}>{v}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {cfg.par.on && (
            <div className="note">
              <div className="row">
                <b>Fokus Pareto: {g.cards.length} toko hari ini</b>
                {g.cards.length > 0 && cfg.par.focus.length > 0 && <button className="btn sm" onClick={() => setOpenCards(openCards === g.name ? null : g.name)}>{openCards === g.name ? 'Tutup preview' : 'Lihat preview'}</button>}
                {g.cards.length === 0 && <span className="mut">tidak ada toko Pareto hari ini</span>}
              </div>
              {openCards === g.name && g.cards.map((c) => (
                <div key={c.s.id} style={{ border: '1px solid var(--line)', borderRadius: 10, padding: 8, margin: '8px 0', background: '#fff' }}>
                  <div className="row" style={{ justifyContent: 'space-between' }}><b>{c.s.name} <span className="mut">{c.s.id}</span></b>{c.notInDap && <span className="tag y">tidak ada di DAP utama</span>}</div>
                  <div className="mut" style={{ fontSize: 12 }}>{cardHeadLine(c)}</div>
                  <table className="t" style={{ marginTop: 4 }}>
                    <thead><tr>{cardCols.map((cc) => <th key={cc.k} className={cc.k === 'name' ? 'l' : ''}>{cc.label}</th>)}</tr></thead>
                    <tbody>{(() => { const rr = cardRows(c, cardCols); return rr.map((r, i) => <tr key={i} className={rr.bold.has(i) ? 'tot' : ''}>{r.map((v, j) => <td key={j} className={j === 0 ? 'l' : ''}>{v}</td>)}</tr>); })()}</tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </Panel>
      ))}
      {!model.groups.length && <Panel title="TIDAK ADA KUNJUNGAN"><div className="empty"><p className="mut">Tidak ada toko yang dijadwalkan di tanggal ini.</p></div></Panel>}
    </div>
  );
}
