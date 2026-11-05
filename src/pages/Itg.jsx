import { useEffect, useMemo, useState } from 'react';
import { fmt } from '../lib/calc.js';
import { Panel, Seg } from '../components/ui.jsx';
import { PAL, Rings, Steps } from '../components/charts.jsx';
import { autoDapRows } from '../lib/dapAuto.js';
import { DEFAULT_DAP, buildDap } from '../lib/dapModel.js';
import { buildContract } from '../lib/contract.js';
import { itgCompute, topSkus } from '../lib/itg.js';
import { makeCtx, progCodes, programsForStore } from '../lib/progcat.js';
import { defaultDapDate } from './Dap.jsx';

const MONF = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const ST = { tercapai: 'tag g', 'gagal syarat': 'tag r', berjalan: 'tag y' };
const jt = (v) => fmt.jt(v, 1);
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || 'null') ?? d; } catch { return d; } };

export default function Itg({ data, time, mode, depot, team, holidays, openPreview, onUpload }) {
  const C = useMemo(() => itgCompute(data, mode, time), [data, mode, time]);
  const codes = useMemo(() => progCodes(data), [data]);
  const pkey = `sm_itg_${depot}_${team}`;
  const [st, setSt] = useState(() => load(pkey, { progs: null, wajib: '' }));
  const [fs, setFs] = useState('ALL');
  const [fc, setFc] = useState('ALL');
  const [ft, setFt] = useState('ALL');
  const [open, setOpen] = useState(null);
  const [busy, setBusy] = useState('');
  useEffect(() => { localStorage.setItem(pkey, JSON.stringify(st)); }, [st, pkey]);
  const selProgs = st.progs || codes.filter((c) => c.jenis !== 'INSENTIF').map((c) => c.code);
  const ctx = useMemo(() => makeCtx(data), [data]);

  if (!data.itgList) {
    return (
      <Panel title="ITG">
        <div className="empty"><h2>Target ITG belum diupload</h2><p className="mut">Upload Excel ITG (kolom Nama Salesman, ID Pelanggan, Class, Target &lt;bulan&gt; untuk 2 bulan) di menu Upload, slot "Target ITG".</p><button className="btn coin" onClick={onUpload}>Upload target ITG</button></div>
      </Panel>
    );
  }
  const salesOpts = [...new Set(C.rows.map((r) => r.sales))];
  const clsOpts = [...new Set(C.rows.map((r) => r.cls))];
  const rows = C.rows.filter((r) => (fs === 'ALL' || r.sales === fs) && (fc === 'ALL' || r.cls === fc) && (ft === 'ALL' || r.status === ft)).sort((a, b) => (b.total ?? -1) - (a.total ?? -1));
  const T = C.rows.reduce((a, r) => a + r.T, 0), A = C.rows.reduce((a, r) => a + r.A, 0);
  const ok = C.rows.filter((r) => r.status === 'tercapai').length;
  const reward = C.rows.reduce((a, r) => a + r.reward, 0);
  const [m1, m2] = C.months;
  const periode = `${MONF[m1 - 1]} - ${MONF[m2 - 1]} ${time.y}`;
  const miss = C.rows.filter((r) => !r.store).length;

  const contracts = () => rows.filter((r) => r.store).map((r) => buildContract(data, r.store, { programs: selProgs, itg: C, wajib: st.wajib.split(',').map((x) => x.trim()).filter(Boolean), periode: `${MONF[time.m - 1]} ${time.y}` }));
  const contractPreview = () => openPreview({ title: `Kontrak ITG · ${rows.length} toko`, file: `Kontrak-ITG-${depot}-${team}`, make: async () => { const { makeContractPdf } = await import('../lib/contractPdf.js'); return makeContractPdf(contracts(), { depot, team: data.meta.teamLabel, periode: `${MONF[time.m - 1]} ${time.y}`, output: 'blob' }); } });
  const contractSave = async () => { setBusy('Menyusun kontrak…'); try { const { makeContractPdf } = await import('../lib/contractPdf.js'); makeContractPdf(contracts(), { depot, team: data.meta.teamLabel, periode: `${MONF[time.m - 1]} ${time.y}` }); } catch (e) { alert(e.message); } setBusy(''); };
  const dapModel = () => { const d = defaultDapDate(time); const ids = new Set(C.rows.map((r) => r.id)); const dd = { ...data, dap: autoDapRows(data, mode).rows.filter((r) => ids.has(r.id)) }; return { dd, d, model: buildDap(dd, time, d, holidays, DEFAULT_DAP) }; };
  const dapPreview = () => openPreview({ title: 'DAP ITG', file: `DAP-ITG-${depot}-${team}`, make: async () => { const { makeDapPdf } = await import('../lib/dapPdf.js'); const { dd, d, model } = dapModel(); return makeDapPdf({ data: dd, model, only: null, y: time.y, m: time.m, d, cfg: DEFAULT_DAP, asOf: time.asOf, depot, output: 'blob' }); } });
  const dapSave = async () => { setBusy('Menyusun DAP…'); try { const { makeDapPdf } = await import('../lib/dapPdf.js'); const { dd, d, model } = dapModel(); await makeDapPdf({ data: dd, model, only: null, y: time.y, m: time.m, d, cfg: DEFAULT_DAP, asOf: time.asOf, depot }); } catch (e) { alert(e.message); } setBusy(''); };
  const togProg = (c) => setSt({ ...st, progs: selProgs.includes(c) ? selProgs.filter((x) => x !== c) : [...selProgs, c] });

  return (
    <div className="grid">
      <Panel title={`ITG ${data.meta.teamLabel?.toUpperCase() || ''} · ${periode.toUpperCase()}`} right={`${C.rows.length} toko · basis ${mode === 'bti' ? 'BTI' : 'Milestone (BTI × 110%)'}`}>
        <Steps steps={[{ label: `${MONF[m1 - 1].slice(0, 3)} ≥ 70%`, text: 'bulan pertama' }, { label: `${MONF[m2 - 1].slice(0, 3)} ≥ 70%`, text: 'bulan kedua' }, { label: 'Total ≥ 100%', text: 'dua bulan' }, { label: 'Cashback', text: '% class × target 2 bulan' }]} />
        <div className="kpis k4" style={{ marginTop: 14 }}>
          <div className="kpi"><div className="l">Toko ITG</div><div className="v">{C.rows.length}</div><div className="s">{ok} tercapai · {C.rows.filter((r) => r.status === 'berjalan').length} berjalan</div></div>
          <div className="kpi"><div className="l">Target 2 bulan</div><div className="v">{jt(T)}<small>jt</small></div><div className="s">actual {jt(A)} jt</div></div>
          <div className="kpi hero"><div className="l">Achievement total</div><div className="v">{T ? fmt.pct(A / T, 0) : '-'}</div><div className="s">gap {jt(Math.max(0, T - A))} jt</div></div>
          <div className="kpi"><div className="l">Potensi cashback</div><div className="v">{jt(reward)}<small>jt</small></div><div className="s">jika semua syarat tercapai</div></div>
        </div>
        {miss > 0 && <div className="warn">{miss} toko di file ITG tidak ada di data utama (ID tidak cocok), actual-nya dihitung 0.</div>}
        {time.m !== m1 && time.m !== m2 && <div className="warn">Periode data ({MONF[time.m - 1]}) di luar periode ITG ({periode}); actual dihitung 0.</div>}
      </Panel>

      <div className="grid g2">
        <Panel title="PERSEN PER CLASS VS TARGET 100%">
          <Rings size={190} items={C.byCls.map((c, i) => ({ label: `${c.cls} (${c.n} toko)`, v: c.T ? c.A / c.T : 0, color: PAL[i % PAL.length] }))} center={T ? fmt.pct(A / T, 0) : '-'} sub="total" />
        </Panel>
        <Panel title="PER SALESMAN" flush>
          <div className="scroll"><table className="t"><thead><tr><th>Salesman</th><th>Toko</th><th>Target</th><th>Actual</th><th>%</th><th>Tercapai</th><th title="Omset toko ITG dibanding total omset salesman">% omset</th></tr></thead>
            <tbody>{C.bySales.map((s) => (<tr key={s.sales}><td className="l">{s.sales}</td><td>{s.n}</td><td>{jt(s.T)}</td><td>{jt(s.A)}</td><td className={s.T && s.A / s.T >= 1 ? 'ok' : 'mid'}>{s.T ? fmt.pct(s.A / s.T, 0) : '-'}</td><td>{s.ok}/{s.n}</td><td>{fmt.pct(s.share, 0)}</td></tr>))}</tbody></table></div>
          <div className="note">"% omset" = omset toko ITG dibanding total omset salesman itu.</div>
        </Panel>
      </div>

      <Panel title="KONTRAK DAN DAP ITG">
        <div className="row">
          <button className="btn" disabled={!rows.length} onClick={contractPreview}>Preview kontrak</button>
          <button className="btn coin" disabled={!rows.length || !!busy} onClick={contractSave}>{busy.startsWith('Menyusun kontrak') ? busy : `Unduh kontrak (${rows.length} toko)`}</button>
          <button className="btn" onClick={dapPreview}>Preview DAP ITG</button>
          <button className="btn" disabled={!!busy} onClick={dapSave}>Unduh DAP ITG</button>
          <span className="mut">Mengikuti filter di tabel bawah.</span>
        </div>
        <div className="opt-row" style={{ marginTop: 10 }}>
          <span className="mut">Item unggulan wajib order</span>
          <input className="input" style={{ width: 380 }} placeholder="mis. Garuda Rosta 2000, Malkist Keju 1000" value={st.wajib} onChange={(e) => setSt({ ...st, wajib: e.target.value })} />
        </div>
        {codes.length > 0 && (
          <details style={{ marginTop: 6 }}>
            <summary style={{ cursor: 'pointer' }}>Program yang ikut di kontrak ({selProgs.length}/{codes.length})</summary>
            <div className="cols-pick" style={{ marginTop: 8 }}>
              {codes.map((c) => <label key={c.code} className={selProgs.includes(c.code) ? 'on' : ''} title={c.jenis}><input type="checkbox" checked={selProgs.includes(c.code)} onChange={() => togProg(c.code)} />{c.nama.length > 34 ? c.nama.slice(0, 33) + '…' : c.nama}</label>)}
            </div>
          </details>
        )}
        {!codes.length && <div className="mut" style={{ marginTop: 8 }}>Katalog program belum diupload: kontrak hanya berisi baris ITG.</div>}
      </Panel>

      <Panel title="TOKO ITG" flush right={<span>{rows.length} toko</span>}>
        <div className="row" style={{ padding: '10px 14px' }}>
          <Seg wrap value={fs} onChange={setFs} options={[{ v: 'ALL', label: 'Semua salesman' }, ...salesOpts.map((s) => ({ v: s, label: s.split(' ')[0] }))]} />
          <Seg value={fc} onChange={setFc} options={[{ v: 'ALL', label: 'Semua class' }, ...clsOpts.map((c) => ({ v: c, label: c }))]} />
          <Seg value={ft} onChange={setFt} options={[{ v: 'ALL', label: 'Semua status' }, { v: 'tercapai', label: 'Tercapai' }, { v: 'berjalan', label: 'Berjalan' }, { v: 'gagal syarat', label: 'Gagal' }]} />
        </div>
        <div className="scroll"><table className="t">
          <thead><tr><th>Toko</th><th>Salesman</th><th>Class</th><th>Target {MONF[m1 - 1].slice(0, 3)}</th><th>Target {MONF[m2 - 1].slice(0, 3)}</th><th>Actual {MONF[m1 - 1].slice(0, 3)}</th><th>%</th><th>Actual {MONF[m2 - 1].slice(0, 3)}</th><th>%</th><th>Total %</th><th>Status</th><th>Cashback</th></tr></thead>
          <tbody>{rows.map((r) => (
            <>
              <tr key={r.id} className="clickable" onClick={() => setOpen(open === r.id ? null : r.id)}>
                <td className="l nm">{r.name}</td><td className="l">{r.sales.split(' ')[0]}</td><td>{r.cls}</td><td>{jt(r.t1)}</td><td>{jt(r.t2)}</td><td>{jt(r.a1)}</td>
                <td className={r.pass1 ? 'ok' : 'low'}>{r.p1 == null ? '-' : fmt.pct(r.p1, 0)}</td><td>{jt(r.a2)}</td><td className={r.pass2 ? 'ok' : r.know2 ? 'low' : 'mut'}>{r.p2 == null || !r.know2 ? '-' : fmt.pct(r.p2, 0)}</td>
                <td className={r.total >= 1 ? 'ok' : 'mid'}>{r.total == null ? '-' : fmt.pct(r.total, 0)}</td><td><span className={ST[r.status]}>{r.status}</span></td><td>{jt(r.reward)}</td>
              </tr>
              {open === r.id && (
                <tr key={r.id + 'x'}><td colSpan={12} style={{ background: 'var(--paper2)' }}>
                  <div className="grid g2" style={{ padding: 8 }}>
                    <div>
                      <b>Kontribusi SKU terbesar toko ini</b>
                      {topSkus(data, r.id).length ? topSkus(data, r.id).map((x) => <div key={x.i} className="row" style={{ justifyContent: 'space-between' }}><span>{x.sb?.n}</span><span className="mut">{jt(x.v)} jt · {fmt.pct(x.share, 0)}</span></div>) : <div className="mut">Data omset per SKU belum diupload.</div>}
                      {r.fb && <div className="mut" style={{ marginTop: 6 }}>Feedback: {r.fb}</div>}
                    </div>
                    <div>
                      <b>Program yang cocok</b>
                      {r.store && programsForStore(data, r.store, ctx).filter((g) => g.status === 'ya' && !/^ITG-GG/.test(g.code)).slice(0, 6).map((g) => <div key={g.code} className="row" style={{ justifyContent: 'space-between' }}><span>{g.nama}</span><span className={J2[g.jenis] || 'tag'}>{g.jenis}</span></div>)}
                      {!data.progcat && <div className="mut">Katalog program belum diupload.</div>}
                    </div>
                  </div>
                </td></tr>
              )}
            </>
          ))}</tbody>
        </table></div>
        <div className="note">Cashback = % class (Medium 1%, Big 1,5%, Superbig 1,75%) × target 2 bulan. Estimasi: batas maksimal (caps) dan SKU WCG4/Pilus 500 belum dihitung. Klik baris untuk melihat SKU dan program yang cocok.</div>
      </Panel>
    </div>
  );
}
const J2 = { 'OFF FAKTUR': 'tag b', 'ON FAKTUR': 'tag g', INSENTIF: 'tag y', VISIBILITY: 'tag', 'BONUS BARANG': 'tag r' };
