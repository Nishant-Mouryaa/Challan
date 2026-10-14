import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import m from '../styles/challan.module.css';
import d from '../styles/docs.module.css';
import {
  buildCertificateDefaults,
  buildAuthorisationDefaults,
} from '../utils/exportDocuments';
import { EXTRA_DOCS } from './extraDocs';

const printCss = `
@media print {
  @page { size: A4; margin: 0; }
  html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
  body > *:not(#docs-print-root) { display: none !important; }
}
`;

const SIDE_CERT = 15;   // mm
const SIDE_LETTER = 25; // mm
const LETTERHEAD = { top: 50, bottom: 25 }; // keep close to your invoice letterhead margins
const PLAIN = { top: 20, bottom: 15 };

const savePdf = async (elements, filename) => {
  const html2canvas = (await import('html2canvas')).default;
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF('p', 'mm', 'a4');
  for (let i = 0; i < elements.length; i++) {
    const canvas = await html2canvas(elements[i], {
      scale: 3,
      backgroundColor: '#ffffff',
      logging: false,
      scrollX: 0,
      scrollY: -window.scrollY,
    });
    if (i > 0) pdf.addPage();
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, 297);
  }
  pdf.save(filename);
};

const Field = ({ label, value, onChange, rows, wide, options, check }) => (
  <label className={`${d.field} ${wide ? d.wide : ''}`}>
    {check ? (
      <span style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
        <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
        {label}
      </span>
    ) : (
      <>
        <span>{label}</span>
        {options ? (
          <select value={value} onChange={(e) => onChange(e.target.value)}>
            {options.map((o) => (
              <option key={o} value={o}>{o || '—'}</option>
            ))}
          </select>
        ) : rows ? (
          <textarea rows={rows} value={value} onChange={(e) => onChange(e.target.value)} />
        ) : (
          <input type="text" value={value} onChange={(e) => onChange(e.target.value)} />
        )}
      </>
    )}
  </label>
);

const ExportDocumentsModal = ({ invoiceData, onClose }) => {
  const certRef = useRef();
  const letterRef = useRef();
  const [tab, setTab] = useState('cert');
  const [showEdit, setShowEdit] = useState(false);
  const [letterhead, setLetterhead] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cert, setCert] = useState(() => buildCertificateDefaults(invoiceData));
  const [letter, setLetter] = useState(() => buildAuthorisationDefaults(invoiceData));

  if (typeof document === 'undefined') return null;

  const setC = (k) => (v) => setCert((p) => ({ ...p, [k]: v }));
  const setL = (k) => (v) => setLetter((p) => ({ ...p, [k]: v }));
  const mg = letterhead ? LETTERHEAD : PLAIN;
  const safeNo = (invoiceData.invoiceNo || 'draft').replace(/[\\/]/g, '-');
  const paras = letter.body.split(/\n\s*\n/).filter(Boolean);

const extraRefs = useRef({});
const [extra, setExtra] = useState(() =>
  Object.fromEntries(EXTRA_DOCS.map((doc) => [doc.id, doc.build(invoiceData)]))
);
const setX = (id, k) => (v) => setExtra((p) => ({ ...p, [id]: { ...p[id], [k]: v } }));

const refFor = (id) =>
  id === 'cert' ? certRef.current : id === 'letter' ? letterRef.current : extraRefs.current[id];
const fileFor = (id) =>
  ({ cert: 'NonHazardous-Certificate', letter: 'DHL-Authorisation' }[id] ||
    EXTRA_DOCS.find((doc) => doc.id === id).file);

const regenerate = () => {
  setCert(buildCertificateDefaults(invoiceData));
  setLetter(buildAuthorisationDefaults(invoiceData));
  setExtra(Object.fromEntries(EXTRA_DOCS.map((doc) => [doc.id, doc.build(invoiceData)])));
};

const download = async (which) => {
  setBusy(true);
  try {
    if (which === 'both') {
      const ids = ['cert', 'letter', ...EXTRA_DOCS.map((doc) => doc.id)];
      await savePdf(ids.map(refFor), `Export-Documents-${safeNo}.pdf`);
    } else {
      await savePdf([refFor(which)], `${fileFor(which)}-${safeNo}.pdf`);
    }
  } catch (err) {
    console.error('Error generating PDF:', err);
    alert('Error generating PDF. Please try again.');
  } finally {
    setBusy(false);
  }
};

  const cls = (name) => `${d.sheet} ${tab === name ? d.active : d.inactive}`;

  const modal = (
    <div id="docs-print-root" className={m.modalOverlay}>
      <style>{printCss}</style>
      <div className={m.modalContent}>
        <button className={m.closeBtn} onClick={onClose}>✕</button>

        {/* ---------- tabs ---------- */}
        <div className={`${d.tabs} ${d.noPrint}`}>
          <button
            className={`${d.tab} ${tab === 'cert' ? d.tabActive : ''}`}
            onClick={() => setTab('cert')}
          >
            Non-Hazardous Certificate
          </button>
          <button
            className={`${d.tab} ${tab === 'letter' ? d.tabActive : ''}`}
            onClick={() => setTab('letter')}
          >
            DHL Authorisation
          </button>
          <button className={d.editToggle} onClick={() => setShowEdit((v) => !v)}>
            ✏️ {showEdit ? 'Hide editor' : 'Edit details'}
          </button>
        </div>

        {/* ---------- edit panel ---------- */}
        {showEdit && tab === 'cert' && (
          <div className={`${d.panel} ${d.noPrint}`}>
            <Field label="AWB No" value={cert.awbNo} onChange={setC('awbNo')} />
            <Field label="MAWB No" value={cert.mawbNo} onChange={setC('mawbNo')} />
            <Field label="Airport of Dep." value={cert.depAirport} onChange={setC('depAirport')} />
            <Field label="Country" value={cert.depCountry} onChange={setC('depCountry')} />
            <Field label="Airport of Dest." value={cert.destAirport} onChange={setC('destAirport')} />
            <Field label="Invoice No" value={cert.invoiceNo} onChange={setC('invoiceNo')} />
            <Field label="Total No of Packages" value={cert.totalPackages} onChange={setC('totalPackages')} />
            <Field label="Net Weight (KGS)" value={cert.netWeight} onChange={setC('netWeight')} />
            <Field label="Gross Weight (KGS)" value={cert.grossWeight} onChange={setC('grossWeight')} />
            <Field label="Signer name" value={cert.signerName} onChange={setC('signerName')} />
            <Field label="Designation" value={cert.signerDesignation} onChange={setC('signerDesignation')} />
            <Field label="Description of goods" value={cert.goods} onChange={setC('goods')} rows={3} wide />
            <Field label="Shipper block" value={cert.shipper} onChange={setC('shipper')} rows={6} />
            <Field label="Consignee block" value={cert.consignee} onChange={setC('consignee')} rows={7} />
            <Field label="Certification text" value={cert.statement} onChange={setC('statement')} rows={6} wide />
            <Field label="Footer notes" value={cert.footer} onChange={setC('footer')} rows={6} wide />
          </div>
        )}

        {showEdit && tab === 'letter' && (
          <div className={`${d.panel} ${d.noPrint}`}>
            <Field label="Company name" value={letter.company} onChange={setL('company')} wide />
            <Field label="GSTIN" value={letter.gstin} onChange={setL('gstin')} />
            <Field label="Signer name" value={letter.signerName} onChange={setL('signerName')} />
            <Field label="Designation" value={letter.designation} onChange={setL('designation')} />
            <Field label="Date" value={letter.date} onChange={setL('date')} />
            <Field label="Mobile No" value={letter.mobile} onChange={setL('mobile')} />
            <Field
              label="Letter text (blank line = new paragraph)"
              value={letter.body}
              onChange={setL('body')}
              rows={12}
              wide
            />
          </div>
        )}

        {showEdit && EXTRA_DOCS.filter((doc) => doc.id === tab).map((doc) => (
  <div key={doc.id} className={`${d.panel} ${d.noPrint}`}>
    {doc.fields.map((f) => (
      <Field
        key={f.k}
        label={f.label}
        value={extra[doc.id][f.k]}
        onChange={setX(doc.id, f.k)}
        rows={f.rows}
        wide={f.wide}
        options={f.options}
        check={f.check}
      />
    ))}
  </div>
))}

        <div className={d.stage}>
          {/* ================= NON-HAZARDOUS CERTIFICATE ================= */}
          <div
            ref={certRef}
            className={cls('cert')}
            style={{ padding: `${mg.top}mm ${SIDE_CERT}mm ${mg.bottom}mm` }}
          >
            <div className={d.cBox}>
              <div className={d.cTitle}>Shipper's Certification for Non - Hazardous Cargo</div>

              <div className={d.cAwb}>
                <div className={d.cAwbL}>
                  <div>AWB No : {cert.awbNo}</div>
                  <div>MAWB no. {cert.mawbNo}</div>
                </div>
                <div className={d.cAwbM}>
                  <div>Airport of Dep.</div>
                  <div>{cert.depAirport}</div>
                  <div>{cert.depCountry}</div>
                </div>
                <div className={d.cAwbR}>
                  <div>Airport of Dest.</div>
                  <div>{cert.destAirport}</div>
                </div>
              </div>

              <div className={d.cStatement}>{cert.statement}</div>

              <div className={d.cHead}>
                <div className={d.pre}>{'Marks and\nNumber of\nPackages'}</div>
                <div className={`${d.cVl} ${d.pre}`}>
                  {'Proper description of goods / give technical name\n(Trade Names not Permitted)'}
                </div>
                <div className={`${d.center} ${d.pre}`}>{'Net Quantity\nPer Package'}</div>
              </div>

              <div className={d.cBody}>
                <div className={d.cLeft}>
                  <div className={d.pre}>{`${cert.shipper}\n\n${cert.consignee}`}</div>
                  <div className={d.cInv}>
                    <div>Invoice No : {cert.invoiceNo}</div>
                    <div>Total No Of Package : {cert.totalPackages}</div>
                  </div>
                </div>
                <div className={`${d.cMid} ${d.pre}`}>{cert.goods}</div>
                <div className={d.cRight}>
                  <div>NET WEIGHT: <span className={d.kgs}>KGS</span></div>
                  <div className={d.center}>{cert.netWeight}</div>
                  <div className={d.gap} />
                  <div>GROSS WEIGHT: <span className={d.kgs}>KGS</span></div>
                  <div className={d.center}>{cert.grossWeight}</div>
                </div>

                <div className={d.cSign}>
                  <div className={d.sRow}>
                    <div className={d.sLabel}>NAME</div>
                    <div className={d.sVal}>{cert.signerName}</div>
                  </div>
                  <div className={d.sRow}>
                    <div className={d.sLabel}>DESIGNATION</div>
                    <div className={`${d.sVal} ${d.italic}`}>{cert.signerDesignation}</div>
                  </div>
                  <div className={d.sStamp}>SIGNATURE &amp; COMPANY STAMP</div>
                </div>
              </div>

              <div className={d.cFoot}>{cert.footer}</div>
            </div>
          </div>

          {/* ================= DHL AUTHORISATION LETTER ================= */}
          <div
            ref={letterRef}
            className={`${cls('letter')} ${d.letter}`}
            style={{ padding: `${mg.top}mm ${SIDE_LETTER}mm ${mg.bottom}mm` }}
          >
            <div className={d.lTitle}>Authorization for Export shipment</div>
            <div className={d.lSub}>To whomsoever it may concern</div>

            {paras.map((p, i) => (
              <p key={i} className={d.lPara}>{p}</p>
            ))}

            <div className={d.lThanks}>Thanking you,</div>
            <div className={d.lYours}>Yours sincerely,</div>

            <div className={d.lBoxes}>
              <div className={d.lBox}>
                <div>Company Name:{letter.company}</div>
                <div>GSTIN : {letter.gstin}</div>
                <div>Signature:</div>
                <div>Name:{letter.signerName}</div>
                <div>Designation: {letter.designation}</div>
                <div>Date :{letter.date}</div>
                <div>Mobile No:{letter.mobile}</div>
                <div>Company Stamp</div>
              </div>
              <div className={d.lBox}>
                <div>Individual Shipper Name :</div>
                <div>
                  KYC Document :<br />KYC Document No:<br />ADHAR CARD NO :
                </div>
                <div>Signature:</div>
                <div>
                  Date:<br />Mobile No:
                </div>
              </div>
            </div>
          </div>
          {EXTRA_DOCS.map((doc) => {
  const mgn = doc.letterhead ? mg : doc.margins;
  return (
    <div
      key={doc.id}
      ref={(el) => { extraRefs.current[doc.id] = el; }}
      className={`${d.sheet} ${tab === doc.id ? '' : d.inactive}`}
      style={{ padding: `${mgn.top}mm ${doc.side}mm ${mgn.bottom}mm` }}
    >
      <doc.Sheet d={extra[doc.id]} />
    </div>
  );
})}
        </div>

        {EXTRA_DOCS.map((doc) => (
  <button
    key={doc.id}
    className={`${d.tab} ${tab === doc.id ? d.tabActive : ''}`}
    onClick={() => setTab(doc.id)}
  >
    {doc.label}
  </button>
))}

        {/* ---------- actions ---------- */}
        <div className={m.buttonContainer} style={{ flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <input
              type="checkbox"
              checked={letterhead}
              onChange={(e) => setLetterhead(e.target.checked)}
            />
            Letterhead paper
          </label>
          <button onClick={() => window.print()} className={m.printBtn}>
            🖨️ Print this
          </button>
          <button
            onClick={() => download(tab)}
            className={m.downloadBtn}
            disabled={busy}
          >
            📥 {busy ? 'Preparing…' : 'Download this PDF'}
          </button>
          <button
            onClick={() => download('both')}
            className={m.downloadBtn}
            disabled={busy}
          >
            📥 Download both (1 PDF)
          </button>
          <button onClick={regenerate} className={m.closeModalBtn}>
            ↺ Reset to invoice data
          </button>
          <button onClick={onClose} className={m.closeModalBtn}>Close</button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

export default ExportDocumentsModal;