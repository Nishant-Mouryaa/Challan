import { DEFAULT_SIGNATORY, EXPORTER_DEFAULTS } from '../data/internationalInvoicePresets';
export const toDMY = (d) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d || '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : d || '';
};

const stripComma = (s) => (s || '').replace(/,\s*$/, '').trim();
const join = (parts) => parts.filter((p) => p !== false && p != null).join('\n');

export const CERT_STATEMENT = `This is to certify that the articles / substances of this shipment are properly described by name that they are not listed in the current edition of IATA / Dangerous Goods Regulations ( DGR ), Alphabetical List of Dangerous Goods, nor do they correspond to any of the hazard classes appearing in the DGR, Section 3, classification of Dangerous goods and that they are known not to be dangerous, i.e. not restricted.
Furthermore the shipper confirms that the goods are in proper condition for transportation on passenger carrying aircraft ( DGR, 8.1.23.) of International Air Transport Association ( I A T A )`;

export const CERT_FOOTER = `To be completed in duplicate duly signed & stamped by shipper
ONE COPY to be filed with the AWB copy at ORIGIN & ONE COPY to accompany DEST: AWB
Attach Lab Analysis Report, Material Safety Data Sheet for Bulk-Drugs/ medicines/ Chemicals/ Cosmetics.
pls certify that no hidden dangerous goods are stored or filled in any components or spare-parts.
e.g. Plastic components /Transformer Spares / Elect & Electronic Appliances / for Plastic & Rubber (specify)
PVC /etc Films ( non-nitro-cellulose base ) /
Please note that MSDS is available at www.msdssearch.com`;

export const LETTER_BODY = `I / we authorization to DHL Express (India) Pvt. Ltd. (‘DHL’), including its group companies and their customs brokers and agents, to act as our agent for the purpose of arranging customs clearance at various customs location within India for all our Shipments, departing from India under the provisions of the various Acts, Rules, regulations and procedure as laid down under the regulatory environment of India to enable DHL to arrange clearance of Export shipment on my/our behalf.

I/We also give our consent and authorize DHL to generate, sign, submit and file on our behalf, in physical form or digitally, the various forms like e-way bill, shipping bill, and other forms, as and when required, under various statutes for undertaking the carriage, clearance or delivery of Shipment. I / we have been guided to abide by the statutory requirements applicable for our Shipments and to keep myself / ourselves updated with all applicable acts and regulations for my Shipments. I/We will be responsible for the declaration being made to regulators based on our document / instructions.

I/We further declare that our GSTIN / Know Your Customer (“KYC”) are valid and we authorize DHL to use the same while undertaking transportation and clearance of our shipments on our behalf.

This authority letter shall hold good for all proceedings and can be produced before Customs and/or any statutory authority to confirm the authorization hereby given to DHL. The above authorization to DHL supersedes all previous authority letters issued in this behalf and shall remain valid, subsisting and continues until revoked in writing.`;

export const buildCertificateDefaults = (inv) => {
  const c = inv.consignorDetails || {};
  const e = inv.consigneeDetails || {};
  return {
    awbNo: inv.awbNo || '',
    mawbNo: inv.mawbNo || '',
    depAirport: inv.origin || '',
    depCountry: 'INDIA',
    destAirport: inv.destination || '',
    statement: CERT_STATEMENT,
    goods: (inv.items || []).map((i) => i.description).filter(Boolean).join('\n'),
    shipper: join([
      'Shipper:',
      c.company || false,
      stripComma(c.address) || false,
      c.building || false,
      [c.area, c.pin].filter(Boolean).join(' ,') || false,
      `TEL : ${c.phone || ''}`,
    ]),
    consignee: join([
      'Consignee:',
      e.name || false,
      e.company || false,
      e.address || false,
      `${e.city || ''} , ${e.country || ''}`,
      '',
      `PHONE :${e.phone || ''}`,
    ]),
    netWeight: inv.netWeight || '',
    grossWeight: inv.grossWeight || '',
    invoiceNo: inv.invoiceNo || '',
    totalPackages: inv.totalPackages || '',
    signerName: DEFAULT_SIGNATORY.name,
    signerDesignation: DEFAULT_SIGNATORY.designation,
    footer: CERT_FOOTER,
  };
};

export const buildAuthorisationDefaults = (inv) => {
  const c = inv.consignorDetails || {};
  return {
    body: LETTER_BODY,
    company: c.company || '',
    gstin: c.gstin || '',
    signerName: `MR ${DEFAULT_SIGNATORY.name}`,
    designation: DEFAULT_SIGNATORY.designation,
    date: toDMY(inv.invoiceDate),
    mobile: DEFAULT_SIGNATORY.mobile,
  };
};


export const fmtDate = (d, sep = '/') => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d || '');
  return m ? [m[3], m[2], m[1]].join(sep) : d || '';
};
const SYMBOL = { USD: '$', EUR: '€' };
const money = (n, code) => {
  const v = Number(n) || 0;
  return `${Number.isInteger(v) ? v : v.toFixed(2)}${SYMBOL[code] || ` ${code || ''}`}`;
};
const zipOf = (s) => ((s || '').match(/\b\d{4,6}\b/) || [''])[0];
const num2 = (v) => (v === '' || v == null || isNaN(Number(v)) ? v || '' : Number(v).toFixed(2));

/* ---------------- Packing list ---------------- */
export const buildPackingListDefaults = (inv) => {
  const c = inv.consignorDetails || {};
  const e = inv.consigneeDetails || {};
  const X = EXPORTER_DEFAULTS;
  const items = inv.items || [];
  return {
    invoiceNo: inv.invoiceNo || '',
    invoiceDate: fmtDate(inv.invoiceDate),
    buyersOrder: inv.buyersOrderNo || '',
    otherRef: inv.otherRef || '',
    iec: X.iecCode,
    ad: X.adCode,
    buyerOther: 'SAME AS CONSIGNEE',
    exporterBlock: join([
      c.company || false,
      stripComma(c.address) || false,
      c.building || false,
      `${c.area || ''} ,TEL NO:${c.phone || ''}`,
    ]),
    exporterZip: c.pin || '',
    exporterCountry: 'INDIA',
    exporterContact: X.contactPerson,
    exporterTel: X.mobile,
    exporterEmail: X.email,
    consigneeBlock: join([e.name || false, e.company || false, e.address || false, e.city || false, e.country || false]),
    consigneeZip: zipOf(e.city),
    consigneeCountry: e.country || '',
    consigneeContact: e.name || '',
    consigneeTel: e.phone || '',
    consigneeEmail: '',
    originCountry: 'INDIA',
    destCountry: e.country || inv.destination || '',
    preCarriage: '',
    placeOfReceipt: '',
    vessel: 'AIR',
    portLoading: X.portOfLoading,
    portDischarge: inv.portOfDischarge || '',
    finalDest: inv.finalDestination || '',
    termsDelivery: 'FOC',
    paymentTerms: 'FOC',
    marks: inv.totalPackages ? `${inv.totalPackages} BOX` : '',
    goodsDesc: items.map((i) => i.description).join('\n'),
    goodsQty: items.map((i) => i.quantity).join('\n'),
    goodsRemarks: items.map((i) => money(i.amount, inv.currencyCode)).join('\n'),
    totalRemark: money(inv.totalAmount, inv.currencyCode),
    netWt: inv.netWeight || '',
    grsWt: inv.grossWeight || '',
    dimWt: inv.dimensionalWeight || '',
    exporterName: c.company || '',
    declaration:
      'We declare that this invoice shows the actual price of the goods described and that all particulars are true & correct.',
  };
};

/* ---------------- DHL SLI ---------------- */
export const SB_TYPES = [
  ['A', 'NFEI (No Foreign Exchange Involved)', 'NO', 'Letter stating Reason for Export'],
  ['B', 'FREE SHIPPING BILL INVOLVING REMITTANCE', 'NO', ''],
  ['C', 'EOU SHIPPING BILL', 'NO', 'ANNEXURE C1'],
  ['D', 'DUTY DRAWBACK', 'N/A', 'DBK SL NO'],
  ['E', 'EPCG SHIPPING BILL', 'NO', 'REGN NO. & DT OF EPCG LIC, COPY OF EPCG LIC / REGN COPY'],
  ['F', 'ADVANCE LICENCE SHIPPING BILL', 'NO', 'REGN NO. & DT OF ADV LIC, COPY OF LIC / REGN COPY,CONSUMPTION SHEET'],
  ['G', 'ROSL (Rebate of State Levies)', 'NO', 'NO ADDITIONAL DOCUMENTS REQUIRED.'],
  ['H', 'REPAIR & RETURN', 'NO', 'B/E COPY, IMP INV/PKG LIST/GR WAIVER ON GR FORM,CHARTERED ENGG CERTIFICATE, EXPORT INV/PKG LIST, LETTER REQUESTING CUSTOMS FOR 100% EXAMINATION'],
];
export const SLI_DOCS = [
  ['invoice', '1. INVOICE (4 COPIES)'], ['packing', '2. PACKING LIST (4 COPIES)'],
  ['nondg', '3. NON-DG DECLARATION'], ['lab', '4. LAB ANALYSIS REPORT'],
  ['msds', '5. MSDS'], ['phyto', '6. PHYTOSANITARY CERT'],
  ['visa', '7. VISA/AEPC ENDORSEMENT'], ['letterDc', '8. LETTER TO DC'],
  ['scomet', '9. SCOMET DECLARATION'], ['rodtep', '10. RoDTEP DECLARATION'],
];

export const buildSliDefaults = (inv) => {
  const c = inv.consignorDetails || {};
  const e = inv.consigneeDetails || {};
  const X = EXPORTER_DEFAULTS;
  const cur = inv.currencyCode || 'USD';
  const d = {
    shipper: c.company || '',
    consignee: e.company || e.name || '',
    invoiceNo: inv.invoiceNo || '',
    invoiceDate: fmtDate(inv.invoiceDate, '.'),
    awb: inv.awbNo || '',
    iec: X.iecCode,
    branch: X.iecBranchCode,
    pan: X.pan,
    gstin: c.gstin ? `GSTIN:${c.gstin}` : '',
    igstA: 'N/A (SAMPLE)',
    igstB: 'YES',
    igstC: 'TAXABLE AMOUNT -\nIGST RATE -\nIGST AMOUNT -\nCess -',
    adCode: X.adCode,
    incoterms: '',
    nature: 'SAMPLE',
    fob: `${Number(inv.totalAmount) || 0} ${cur}`,
    freight: '-', insurance: '-', commission: '-', discount: '-', packing: '-',
    pkgs: inv.totalPackages || '',
    net: num2(inv.netWeight),
    gross: num2(inv.grossWeight),
    state: X.stateOfOrigin,
    district: X.districtOfOrigin,
    pta: 'NCPTI - Preferential Trade Benefit not claimed at Importing Country',
    special: '',
  };
  SB_TYPES.forEach(([l, , flag]) => { d[`sb${l}`] = flag; });
  SLI_DOCS.forEach(([k]) => {
    d[`tick_${k}`] = ['invoice', 'packing', 'nondg', 'scomet'].includes(k);
  });
  return d;
};

/* ---------------- Annexure-A ---------------- */
export const buildAnnexureDefaults = (inv) => ({
  shippingBill: '',
  invoiceRef: `${inv.invoiceNo || ''} : ${fmtDate(inv.invoiceDate, '-')}`,
  nature: 'Sale',
  valuationRule: '',
  related: 'No',
  influenced: 'No',
  termsPayment: 'CNF',
  termsDelivery: 'AP',
  previousExport: '',
  otherInfo: '',
  place: 'MUMBAI',
  date: fmtDate(inv.invoiceDate, '.'),
  company: (inv.consignorDetails || {}).company || '',
  designation: 'DIRECTOR',
});

/* ---------------- Non-SCOMET declaration ---------------- */
export const buildNonScometDefaults = (inv) => {
  const c = inv.consignorDetails || {};
  const e = inv.consigneeDetails || {};
  const goods = (inv.items || []).map((i) => i.description).filter(Boolean).join(' , ');
  const addr = [(e.address || '').replace(/\n/g, ' , '), e.city, e.country].filter(Boolean).join(' , ');
  return {
    toBlock: 'TO,\nAssistant Commissioner Of Customs.- EXPORT\nSAHAR ACC,ANDHERI (E)\nMUMBAI',
    invoiceRef: `${inv.invoiceNo || ''} .DT. ${fmtDate(inv.invoiceDate, '.')}`,
    body: [
      `We are exporting ${goods} To ${e.company || e.name || ''} which is our factory at ${addr}`,
      `We hereby declare that the ${goods} ( AS PER INVOICE ) are not covered in the list of SCOMET items or in any other respective list of exports.`,
      'You are requested to complete the shipping procedure and send the shipment to the destination at the earliest.',
      'We request you to allow the same for export.',
    ].join('\n\n'),
    company: c.company || '',
  };
};