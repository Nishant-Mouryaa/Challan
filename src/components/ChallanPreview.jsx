import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import styles from '../styles/challan.module.css';
import { convertAmountToWords } from '../utils/amountInWords';
import { formatDate } from '../utils/formatters';

const fmt = (n) =>
  Number(n).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// Print-only rules: hide everything on the page except the challan
const printCss = `
@media print {
  @page { size: A4; margin: 0; }
  html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
  body > *:not(#challan-print-root) { display: none !important; }
}
`;

const ChallanPreview = ({ challanData, senderData, onClose }) => {
  const printRef = useRef();

  if (typeof document === 'undefined') return null;

  const items = challanData.items || [];
  const receiver = challanData.receiverDetails || {};
  const totalAmount = items.reduce((s, i) => s + i.quantity * i.price, 0);

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
      pdf.save(`Challan-${challanData.challanNo || 'draft'}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    }
  };

  const modal = (
    <div id="challan-print-root" className={styles.modalOverlay}>
      <style>{printCss}</style>

      <div className={styles.modalContent}>
        <button className={styles.closeBtn} onClick={onClose}>✕</button>

        {/* ===== A4 SHEET ===== */}
        <div ref={printRef} className={styles.sheet}>
          <div className={styles.box}>
            <div className={styles.title}>DELIVERY CHALLAN</div>

            <div className={styles.metaRow}>
              <div className={styles.metaCell}>
                Date- {formatDate(challanData.date)}
              </div>
              <div className={styles.metaCell}>No: {challanData.challanNo}</div>
            </div>

            <div className={styles.partyRow}>
              <div className={`${styles.party} ${styles.partyLeft}`}>
  <div>FROM,</div>
  <div className={styles.big}>{senderData?.company}</div>
  
  {/* Show CARE OFF only for Sennheiser (not for Bruker) */}
  {senderData?.careOf && !senderData?.company?.toUpperCase().includes('BRUKER') && (
    <>
      <div className={styles.normal}>CARE OFF</div>
      <div>{senderData.careOf}</div>
    </>
  )}
  
  <div className={styles.pre}>{senderData?.address}</div>
  
  {/* Show Area if available */}
  {senderData?.area && (
    <div className={styles.bigger}>{senderData.area}</div>
  )}
  
  <div>
    {senderData?.city} {senderData?.pin}
  </div>
</div>

              <div className={styles.party}>
                <div>TO,</div>
                <div className={styles.big}>{receiver.name}</div>
                <div className={styles.pre}>{receiver.address}</div>
                <div className={styles.big}>
                  {receiver.city} {receiver.pin}
                </div>
                <div className={styles.big}>{receiver.state}</div>
                {receiver.contactNo && (
                  <div className={styles.big}>
                    MOBILE NO. - {receiver.contactNo}
                  </div>
                )}
              </div>
            </div>

            {/* ===== ITEMS ===== */}
            <div className={styles.items}>
              <div className={`${styles.gridRow} ${styles.headRow}`}>
                <div className={`${styles.cell} ${styles.cellLeft}`}>S.No</div>
                <div className={styles.cell}>QTY</div>
                <div className={styles.cell}>Description of Goods</div>
                <div className={styles.cell}>Per Pcs</div>
                <div className={styles.cell}>Total Value (INR)</div>
              </div>

              <div className={styles.itemsBody}>
                {items.map((item, i) => (
                  <div key={i} className={`${styles.gridRow} ${styles.itemRow}`}>
                    <div className={styles.cell}>{i + 1}</div>
                    <div className={styles.cell}>{item.quantity}</div>
                    <div className={styles.cell}>{item.description}</div>
                    <div className={styles.cell}>{fmt(item.price)}</div>
                    <div className={styles.cell}>
                      {fmt(item.quantity * item.price)}
                    </div>
                  </div>
                ))}

                {/* filler row: keeps the column lines running to the bottom */}
                <div className={`${styles.gridRow} ${styles.fillerRow}`}>
                  <div className={styles.cell} />
                  <div className={styles.cell} />
                  <div className={styles.cell} />
                  <div className={styles.cell} />
                  <div className={`${styles.cell} ${styles.totalHolder}`}>
                    <div className={styles.totalBox}>{fmt(totalAmount)}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.blankRow} />

            <div className={styles.wordsRow}>
              ( {convertAmountToWords(Math.round(totalAmount))})
            </div>

            <div className={styles.declaration}>
              <div>This value for custom / Courier Purpose Only</div>
              <div>
                I Declare all the information contained in this delivery challan
                are true and correct
              </div>
              <div>Signature Of Sender :-</div>
            </div>
          </div>
        </div>

        <div className={styles.buttonContainer}>
          <button onClick={handlePrint} className={styles.printBtn}>
            🖨️ Print Challan
          </button>
          <button onClick={handleDownloadPDF} className={styles.downloadBtn}>
            📥 Download PDF
          </button>
          <button onClick={onClose} className={styles.closeModalBtn}>
            Close
          </button>
        </div>
      </div>
    </div>
  );

  // Portal to <body> so print CSS can hide the rest of the app cleanly
  return createPortal(modal, document.body);
};

export default ChallanPreview;