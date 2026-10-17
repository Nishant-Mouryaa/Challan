import React from 'react';
import x from '../styles/extraDocs.module.css';

/*
 * Extra documents for the invoice modes. They reuse the letter styles from the
 * Indemnity Letter (indWrap, indDate, ...) so they print the same way.
 * These are drafts: have your compliance contact confirm the wording.
 */

const lines = (s) => (s || '').split('\n').filter((l) => l.trim());

const today = () => new Date().toLocaleDateString('en-GB');
const docDate = (data) =>
  data.invoiceDate ? new Date(data.invoiceDate).toLocaleDateString('en-GB') : today();

const F = (k, label, o = {}) => ({ k, label, ...o });

/** "1) DESCRIPTION - QTY 2 | BATCH: X EXP: Y" per item, one per line */
const itemsAsLines = (items = []) =>
  items
    .map((i, idx) => {
      const extra = (i.details || '').split('\n').filter(Boolean).join(' | ');
      return `${idx + 1}) ${i.description || ''} - QTY ${i.quantity || ''}${extra ? ` | ${extra}` : ''}`;
    })
    .join('\n');

/* =============== MEDICINE DECLARATION =============== */
const MedicineSheet = ({ d }) => (
  <div className={x.indWrap}>
    <div className={x.indDate}>DATE: {d.date}</div>

    <div className={x.indTitle}>
      {d.companyName} <br />
      <br />
      DECLARATION FOR MEDICINES (PERSONAL USE)
    </div>

    <div className={x.indTo}>
      <div>TO</div>
      <div>DHL EXPRESS LTD</div>
      <div>MUMBAI</div>
    </div>

    <div className={x.indBody}>
      <p>
        WE HEREBY DECLARE THAT THE MEDICINES LISTED BELOW, BEING SENT THROUGH DHL EXPRESS LTD
        UNDER AWB NO {d.awbNo}, ARE FOR THE PERSONAL USE OF {d.patientName}
        {d.prescriptionRef ? ` AS PER PRESCRIPTION (${d.prescriptionRef})` : ''} AND ARE NOT FOR
        COMMERCIAL SALE OR RESALE.
      </p>
      {!d.controlled && (
        <p>
          WE FURTHER DECLARE THAT THE SHIPMENT DOES NOT CONTAIN ANY NARCOTIC OR PSYCHOTROPIC
          SUBSTANCE.
        </p>
      )}
      <div className={x.indRef}>
        <div>AWB NO: {d.awbNo}</div>
        <div>CONTENT:</div>
        {lines(d.contents).map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>
    </div>

    <div className={x.indSign}>
      <div>THANKING YOU</div>
      <div style={{ marginTop: '20px' }}>For {d.companyName}</div>
      <div className={x.indSignSpace}></div>
      <div style={{ fontWeight: 'bold' }}>{d.companyName}</div>
    </div>
  </div>
);

const medicineFields = [
  F('date', 'Date'),
  F('companyName', 'Company name', { wide: true }),
  F('awbNo', 'AWB No'),
  F('patientName', 'Patient name'),
  F('prescriptionRef', 'Prescription reference', { wide: true }),
  F('contents', 'Medicines (one per line)', { rows: 5, wide: true }),
];

/* =============== ELECTRONICS DECLARATION =============== */
const ElectronicsSheet = ({ d }) => (
  <div className={x.indWrap}>
    <div className={x.indDate}>DATE: {d.date}</div>

    <div className={x.indTitle}>
      {d.companyName} <br />
      <br />
      DECLARATION FOR ELECTRONIC GOODS
    </div>

    <div className={x.indTo}>
      <div>TO</div>
      <div>DHL EXPRESS LTD</div>
      <div>MUMBAI</div>
    </div>

    <div className={x.indBody}>
      <p>
        WE HEREBY DECLARE THE DETAILS OF THE ELECTRONIC GOODS BEING SENT THROUGH DHL EXPRESS LTD
        UNDER AWB NO {d.awbNo}.
      </p>
      <div className={x.indRef}>
        <div>CONTENT:</div>
        {lines(d.contents).map((l, i) => (
          <div key={i}>{l}</div>
        ))}
        <div>CONDITION: {d.condition}</div>
        <div>BATTERY: {d.battery}</div>
      </div>
      <p>THE ABOVE DETAILS ARE TRUE AND CORRECT TO THE BEST OF OUR KNOWLEDGE.</p>
    </div>

    <div className={x.indSign}>
      <div>THANKING YOU</div>
      <div style={{ marginTop: '20px' }}>For {d.companyName}</div>
      <div className={x.indSignSpace}></div>
      <div style={{ fontWeight: 'bold' }}>{d.companyName}</div>
    </div>
  </div>
);

const electronicsFields = [
  F('date', 'Date'),
  F('companyName', 'Company name', { wide: true }),
  F('awbNo', 'AWB No'),
  F('condition', 'Condition'),
  F('battery', 'Battery', { wide: true }),
  F('contents', 'Contents (one per line)', { rows: 5, wide: true }),
];

/* =============== REGISTRY ENTRIES =============== */
export const MODE_DOCS = [
  {
    id: 'medicine_decl',
    label: 'Medicine Declaration',
    file: 'Medicine-Declaration',
    build: (data) => {
      const md = data.modeDetails || {};
      return {
        date: docDate(data),
        companyName: (data.consignorDetails || {}).company || '',
        awbNo: data.awbNo || '',
        patientName: md.patientName || (data.consigneeDetails || {}).name || '',
        prescriptionRef: md.prescriptionRef || '',
        controlled: !!md.controlled,
        contents: itemsAsLines(data.items),
      };
    },
    fields: medicineFields,
    Sheet: MedicineSheet,
    side: 20,
    margins: { top: 20, bottom: 20 },
    letterhead: true,
  },
  {
    id: 'electronics_decl',
    label: 'Electronics Declaration',
    file: 'Electronics-Declaration',
    build: (data) => {
      const md = data.modeDetails || {};
      return {
        date: docDate(data),
        companyName: (data.consignorDetails || {}).company || '',
        awbNo: data.awbNo || '',
        condition: md.condition || 'New',
        battery: md.battery || 'No battery',
        contents: itemsAsLines(data.items),
      };
    },
    fields: electronicsFields,
    Sheet: ElectronicsSheet,
    side: 20,
    margins: { top: 20, bottom: 20 },
    letterhead: true,
  },
];

/*
 * Commercial mode: copies IEC, AD code, Incoterms and payment terms into the
 * existing Packing List / DHL SLI / Annexure-A defaults (only when filled in).
 */
const COMMERCIAL_MAP = {
  packing: { iec: 'iec', adCode: 'ad', incoterms: 'termsDelivery', paymentTerms: 'paymentTerms' },
  sli: { iec: 'iec', adCode: 'adCode', incoterms: 'incoterms' },
  annexure: { incoterms: 'termsDelivery', paymentTerms: 'termsPayment' },
};

export const overlayCommercial = (docId, defaults, data) => {
  if (data.mode !== 'commercial') return defaults;
  const map = COMMERCIAL_MAP[docId] || {};
  const md = data.modeDetails || {};
  const out = { ...defaults };
  Object.entries(map).forEach(([from, to]) => {
    if (md[from]) out[to] = md[from];
  });
  return out;
};