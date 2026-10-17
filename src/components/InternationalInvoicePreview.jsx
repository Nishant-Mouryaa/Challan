import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import m from '../styles/challan.module.css';   // modal / buttons (already exists)
import s from '../styles/invoice.module.css';   // new file below
import { formatDate } from '../utils/formatters';
import { convertAmountToWords } from '../utils/amountInWords';
// all values in mm
const LETTERHEAD_MARGINS = { top: 55, bottom: 30, left: 15, right: 15 }; // pre-printed paper
const PLAIN_MARGINS      = { top: 14, bottom: 14, left: 15, right: 15 }; // blank paper / PDF

const fmt = (n) =>
  Number(n || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const printCss = `
@media print {
  @page { size: A4; margin: 0; }
  html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
  body > *:not(#invoice-print-root) { display: none !important; }
}
`;

const DEFAULT_SHIPMENT_NOTE =
  'THIS SHIPMENT HAS NO COMMERCIAL VALUE\nTHE VALUE MENTIONED IS FOR CUSTOMS PURPOSE ONLY';
const InternationalInvoicePreview = ({ invoiceData, onClose }) => {
  const printRef = useRef();
  const [useLetterhead, setUseLetterhead] = useState(true);

  if (typeof document === 'undefined') return null;

  const mg = useLetterhead ? LETTERHEAD_MARGINS : PLAIN_MARGINS;
  const items = invoiceData.items || [];
  const totalAmount = invoiceData.totalAmount || 0;
  const consignor = invoiceData.consignorDetails || {};
  const consignee = invoiceData.consigneeDetails || {};
  const currency = invoiceData.currencyCode || '';
  const itemsWithNotes = items.filter(
    (i) => i.returnOrder || i.actualWeight || i.volWeight
  );

    // group items by box, keep first-seen order, number continuously
  const groups = [];
  items.forEach((item) => {
    const key = item.boxNo ?? '';
    let g = groups.find((x) => x.key === key);
    if (!g) {
      g = { key, items: [] };
      groups.push(g);
    }
    g.items.push(item);
  });
  let sr = 0;
  groups.forEach((g) => {
    g.rows = g.items.map((item) => ({ ...item, sr: ++sr }));
  });
  const multiBox = groups.length > 1;

  const renderNotes = (list) =>
    list
      .filter((i) => i.returnOrder || i.actualWeight || i.volWeight)
      .map((item, i) => (
        <div key={i} className={s.noteBlock}>
          {item.returnOrder && (
            <div className={s.noteMain}>RETURN ORDER #{item.returnOrder}</div>
          )}
          {item.actualWeight && (
            <div className={s.noteLine}>Actual Weight : {item.actualWeight}</div>
          )}
          {item.volWeight && (
            <div className={s.noteLine}>Vol Weight : {item.volWeight}</div>
          )}
        </div>
      ));

  const handlePrint = () => window.print();

  const handleDownloadPDF = async () => {
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const canvas = await html2canvas(printRef.current, {
        scale: 3,
        backgroundColor: '#ffffff',
        logging: false,
        scrollX: 0,
        scrollY: -window.scrollY,
      });

      const pdf = new jsPDF('p', 'mm', 'a4');
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, 297);
      pdf.save(`Invoice-${(invoiceData.invoiceNo || 'draft').replace(/[\\/]/g, '-')}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    }
  };

  const modal = (
    <div id="invoice-print-root" className={m.modalOverlay}>
      <style>{printCss}</style>

      <div className={m.modalContent}>
        <button className={m.closeBtn} onClick={onClose}>✕</button>

        {/* ================= A4 SHEET ================= */}
<div
  ref={printRef}
  className={s.sheet}
  style={{ padding: `${mg.top}mm ${mg.right}mm ${mg.bottom}mm ${mg.left}mm` }}
>          <div className={s.box}>

            {/* ---------- TOP: consignor / consignee | invoice info ---------- */}
            <div className={s.top}>
              <div className={s.topLeft}>
 <div className={s.consignorBlock}>
  <div className={s.bold}>CONSIGNOR</div>
  <div>{consignor.company}</div>
  <div>{consignor.address}</div>
  <div>{consignor.building}</div>
  <div>
    {consignor.area} , TEL NO :{consignor.phone}
  </div>
  {(consignor.idType || 'gstin') === 'gstin' ? (
    <div>GSTIN:{consignor.gstin}</div>
  ) : (
    <div>AADHAAR CARD NO:{consignor.aadhaar}</div>
  )}
</div>

  <div className={s.consigneeBlock}>
    <div className={s.bold}>CONSIGNEE</div>
    <div>{consignee.name}</div>
    <div>{consignee.company}</div>
    <div className={s.pre}>{consignee.address}</div>
    <div>
      {consignee.city} ,{consignee.country}
    </div>
    <div>PHONE :{consignee.phone}</div>
  </div>
</div>

              <div className={s.topRight}>
                <div className={`${s.r} ${s.r1}`}>
                  <div className={s.center}>
                    <span className={s.underline}>INVOICE NO. &amp; DATE</span>
                  </div>
                  <div className={s.center}>
                    INVOICE NO:{invoiceData.invoiceNo}
                    <span className={s.gap} />
DATE:{formatDate(invoiceData.invoiceDate)}                  </div>
                </div>
                <div className={`${s.r} ${s.r2}`} />
                <div className={`${s.r} ${s.r3}`}>
                  BUYER'S ORDER NO {invoiceData.buyersOrderNo}
                </div>
                <div className={`${s.r} ${s.r3}`}>
                  OTHER REF {invoiceData.otherRef}
                </div>
                <div className={`${s.r} ${s.r5}`}>
                  <div>BUYER (IF OTHER THAN CONSIGNEE)</div>
                  <div className={s.pre}>{invoiceData.buyerIfOther}</div>
                </div>
                <div className={s.r6}>
                  <div className={s.odCell}>
                    <div className={s.odLabelOrigin}>ORIGIN</div>
                    <div className={s.odValue}>{invoiceData.origin}</div>
                  </div>
                  <div className={s.odCell}>
                    <div>DESTINATION</div>
                    <div className={s.odValue}>{invoiceData.destination}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* ---------- SHIPMENT STRIP ---------- */}
            <div className={s.ship}>
              <div className={s.shipLeft}>
                <div className={s.sc} />
                <div className={`${s.sc} ${s.scCenter}`}>BY PR-CARRIER</div>
                <div className={s.sc} />
                <div className={s.sc} />
                <div className={s.sc}>PORT OF DISCHARGE</div>
                <div className={`${s.sc} ${s.scCenter}`}>FINAL DESTINATION</div>
                <div className={s.sc} />
                <div className={s.sc} />
                <div className={s.sc}>{invoiceData.portOfDischarge}</div>
                <div className={`${s.sc} ${s.scCenter}`}>
                  {invoiceData.finalDestination}
                </div>
              </div>
              <div className={s.shipRight}>
                <div className={`${s.shipNote} ${s.pre}`}>
                  {invoiceData.shipmentNotes || DEFAULT_SHIPMENT_NOTE}
                </div>
                <div className={s.shipBlank} />
              </div>
            </div>

{/* ---------- ITEMS ---------- */}
<div className={s.items}>
  <div className={`${s.gridRow} ${s.head}`}>
    <div className={`${s.hCell} ${s.hSr}`}>SR.<br />NO</div>
    <div className={`${s.hCell} ${s.hHsn} ${s.cHsn}`}>HSN CODE</div>
    <div className={`${s.hCell} ${s.hDesc} ${s.c2}`}>DESCRIPTION OF GOODS</div>
    <div className={`${s.hCell} ${s.c3} ${s.hTop}`}>QUANTITY</div>
    <div className={`${s.hCell} ${s.c4} ${s.hTop}`}>
      <div>RATE / PIECE</div>
      <div className={s.hCur}>{currency}</div>
    </div>
    <div className={`${s.hCell} ${s.c5} ${s.hTop}`}>
      <div className={s.hCenter}>AMOUNT</div>
      <div className={s.hCur}>{currency}</div>
    </div>
  </div>

  <div className={s.itemsBody}>
    {groups.map((g, gi) => (
      <React.Fragment key={gi}>
        {multiBox && (
          <div className={`${s.gridRow} ${s.boxRow}`}>
            <div className={s.cell} />
            <div className={`${s.cell} ${s.cHsn}`} />
            <div className={`${s.cell} ${s.c2} ${s.boxTitle}`}>
              {g.key ? `BOX ${g.key}` : 'OTHER ITEMS'}
            </div>
            <div className={`${s.cell} ${s.c3}`} />
            <div className={`${s.cell} ${s.c4}`} />
            <div className={`${s.cell} ${s.c5}`} />
          </div>
        )}

        {g.rows.map((item, i) => (
          <div key={i} className={`${s.gridRow} ${s.itemRow}`}>
            <div className={`${s.cell} ${s.cCenter}`}>{item.sr}</div>
            <div className={`${s.cell} ${s.cHsn} ${s.cCenter}`}>{item.hsnCode}</div>
            <div className={`${s.cell} ${s.c2}`}>{item.description}</div>
            <div className={`${s.cell} ${s.c3} ${s.cCenter}`}>{item.quantity}</div>
            <div className={`${s.cell} ${s.c4} ${s.cRight}`}>{fmt(item.ratePerPiece)}</div>
            <div className={`${s.cell} ${s.c5} ${s.cRight}`}>{fmt(item.amount)}</div>
          </div>
        ))}

        {/* multi-box: notes sit right under their own box */}
        {multiBox && g.rows.some((i) => i.returnOrder || i.actualWeight || i.volWeight) && (
          <div className={`${s.gridRow} ${s.boxNotesRow}`}>
            <div className={s.cell} />
            <div className={`${s.cell} ${s.cHsn}`} />
            <div className={`${s.cell} ${s.c2}`}>{renderNotes(g.rows)}</div>
            <div className={`${s.cell} ${s.c3}`} />
            <div className={`${s.cell} ${s.c4}`} />
            <div className={`${s.cell} ${s.c5}`} />
          </div>
        )}
      </React.Fragment>
    ))}

    {/* filler row keeps column lines running down */}
    <div className={`${s.gridRow} ${s.fillerRow}`}>
      <div className={s.cell} />
      <div className={`${s.cell} ${s.cHsn}`} />
      <div className={`${s.cell} ${s.c2} ${s.notesCell}`}>
        {!multiBox && renderNotes(items)}
      </div>
      <div className={`${s.cell} ${s.c3}`} />
      <div className={`${s.cell} ${s.c4}`} />
      <div className={`${s.cell} ${s.c5}`} />
    </div>
  </div>
</div>
            {/* ---------- TOTAL ---------- */}
            <div className={s.foot}>
              <div className={s.footLeft}>
                <div className={s.words}>
                  ({convertAmountToWords(Math.round(totalAmount)).toUpperCase()}
                  {invoiceData.currencyName || currency ? ` ${(invoiceData.currencyName || currency).toUpperCase()}` : ''})
                </div>
                <div className={s.blank} />
              </div>
              <div className={s.totalCell}>{fmt(totalAmount)}</div>
            </div>

            {/* ---------- DECLARATION ---------- */}
            <div className={s.decl}>
              <div className={s.declLeft}>
                <div>DECLARATION</div>
                <div>{invoiceData.declaration}</div>
              </div>
              <div className={s.declRight}>
                <div className={s.forLabel}>FOR</div>
                <div>{consignor.company}</div>
              </div>
            </div>

          </div>
        </div>

        <div className={m.buttonContainer}>
            
          <button onClick={handlePrint} className={m.printBtn}>🖨️ Print Invoice</button>
          <button onClick={handleDownloadPDF} className={m.downloadBtn}>📥 Download PDF</button>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.95rem' }}>
  <input
    type="checkbox"
    checked={useLetterhead}
    onChange={(e) => setUseLetterhead(e.target.checked)}
  />
  Letterhead paper
</label>
          <button onClick={onClose} className={m.closeModalBtn}>Close</button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

export default InternationalInvoicePreview;