/**
 * Invoice modes for international invoices.
 * Each mode decides: which extra fields show, what the invoice note says by
 * default, which per-item fields appear, and which documents are recommended.
 *
 * Document ids must match ids in EXTRA_DOCS (components/extraDocs.jsx).
 */

const NO_VALUE_TAIL = 'THE VALUE MENTIONED IS FOR CUSTOMS PURPOSE ONLY';

export const COURIER_PURPOSES = {
  standard: {
    label: 'Standard (no commercial value)',
    note: `THIS SHIPMENT HAS NO COMMERCIAL VALUE\n${NO_VALUE_TAIL}`,
  },
  gift: {
    label: 'Gift',
    note: `GIFT - NO COMMERCIAL VALUE\n${NO_VALUE_TAIL}`,
  },
  sample: {
    label: 'Sample',
    note: `SAMPLE - NO COMMERCIAL VALUE\n${NO_VALUE_TAIL}`,
  },
  personal: {
    label: 'Personal effects',
    note: `PERSONAL EFFECTS - NO COMMERCIAL VALUE\n${NO_VALUE_TAIL}`,
  },
  return: {
    label: 'Return / repair',
    note: `RETURN SHIPMENT - NO COMMERCIAL VALUE\n${NO_VALUE_TAIL}`,
  },
};

export const MEDICINE_NOTE =
  'MEDICINES FOR PERSONAL USE ONLY\nNOT FOR COMMERCIAL SALE';

export const DOC_LABELS = {
  self_decl: 'Shipper Self Declaration',
  indemnity: 'Indemnity Letter',
  packing: 'Packing List',
  sli: 'DHL SLI',
  annexure: 'Annexure-A',
  scomet: 'Non-SCOMET Declaration',
  medicine_decl: 'Medicine Declaration',
  electronics_decl: 'Electronics Declaration',
};

export const MODES = {
  courier: {
    id: 'courier',
    label: 'Courier',
    icon: 'package',
    tagline: 'Gifts, samples and personal shipments with no commercial value',
    defaults: { shipmentNotes: COURIER_PURPOSES.standard.note },
    detailDefaults: { purpose: 'standard' },
    itemFields: [],
    docs: ['self_decl', 'indemnity'],
  },
  commercial: {
    id: 'commercial',
    label: 'Commercial',
    icon: 'briefcase',
    tagline: 'Sale of goods: packing list, SLI, Annexure-A and SCOMET declaration',
    defaults: { shipmentNotes: '' },
    detailDefaults: { incoterms: '', paymentTerms: '', iec: '', adCode: '' },
    itemFields: [],
    docs: ['packing', 'sli', 'annexure', 'scomet'],
  },
  medicine: {
    id: 'medicine',
    label: 'Medicine',
    icon: 'pill',
    tagline: 'Personal-use medicines with batch and expiry details',
    defaults: { shipmentNotes: MEDICINE_NOTE },
    detailDefaults: { patientName: '', prescriptionRef: '', controlled: false },
    itemFields: [
      { k: 'strength', label: 'Strength / composition', placeholder: 'e.g. 500 mg tablets' },
      { k: 'batchNo', label: 'Batch no', placeholder: 'Batch' },
      { k: 'mfgDate', label: 'Mfg', placeholder: 'MM/YYYY' },
      { k: 'expDate', label: 'Expiry', placeholder: 'MM/YYYY' },
    ],
    docs: ['medicine_decl', 'self_decl', 'packing'],
  },
  electronics: {
    id: 'electronics',
    label: 'Electronics',
    icon: 'chip',
    tagline: 'Devices with model, serial number and battery details',
    defaults: { shipmentNotes: COURIER_PURPOSES.standard.note },
    detailDefaults: { condition: 'New', battery: 'No battery' },
    itemFields: [
      { k: 'modelNo', label: 'Model', placeholder: 'Model no' },
      { k: 'serialNo', label: 'Serial no', placeholder: 'Serial no' },
    ],
    docs: ['electronics_decl', 'indemnity', 'packing'],
  },
};

export const MODE_LIST = Object.values(MODES);

export const getMode = (id) => MODES[id] || MODES.courier;

/** True if the note is empty or one of our own defaults (safe to replace). */
export const isAutoNote = (value) => {
  const v = (value || '').trim();
  if (!v) return true;
  const known = [
    ...Object.values(MODES).map((m) => m.defaults.shipmentNotes),
    ...Object.values(COURIER_PURPOSES).map((p) => p.note),
  ];
  return known.some((k) => k.trim() === v);
};

/** Text printed under the item description on the invoice. */
export const buildItemDetails = (item, modeId) => {
  const g = (k) => (item[k] || '').toString().trim();
  if (modeId === 'medicine') {
    const lines = [];
    if (g('strength')) lines.push(g('strength').toUpperCase());
    const batch = [
      g('batchNo') && `BATCH: ${g('batchNo')}`,
      g('mfgDate') && `MFG: ${g('mfgDate')}`,
      g('expDate') && `EXP: ${g('expDate')}`,
    ].filter(Boolean);
    if (batch.length) lines.push(batch.join('   '));
    return lines.join('\n');
  }
  if (modeId === 'electronics') {
    return [g('modelNo') && `MODEL: ${g('modelNo')}`, g('serialNo') && `SERIAL NO: ${g('serialNo')}`]
      .filter(Boolean)
      .join('\n');
  }
  return '';
};