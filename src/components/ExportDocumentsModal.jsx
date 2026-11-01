import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import d from '../styles/docs.module.css';
import ui from '../styles/documentCenter.module.css';

import {
  buildCertificateDefaults,
  buildAuthorisationDefaults,
} from '../utils/exportDocuments';

import { EXTRA_DOCS } from './extraDocs';

/* =========================================================
   PRINT CONFIGURATION
   ========================================================= */

const PRINT_CSS = `
  @media print {
    @page {
      size: A4;
      margin: 0;
    }

    html,
    body {
      margin: 0 !important;
      padding: 0 !important;
      height: auto !important;
      overflow: visible !important;
      background: #fff !important;
    }

    body > *:not(#docs-print-root) {
      display: none !important;
    }

    #docs-print-root {
      display: block !important;
    }
  }
`;

const LETTERHEAD_MARGINS = {
  top: 50,
  bottom: 25,
};

const PLAIN_MARGINS = {
  top: 20,
  bottom: 15,
};

/* =========================================================
   ICONS — NO ADDITIONAL ICON LIBRARY REQUIRED
   ========================================================= */

const ICON_PATHS = {
  file: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8M8 17h6" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m16 16 4 4" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v12m-5-5 5 5 5-5" />
      <path d="M5 16v4h14v-4" />
    </>
  ),
  print: (
    <>
      <path d="M7 8V3h10v5" />
      <path d="M7 17H4V9h16v8h-3" />
      <path d="M7 14h10v7H7z" />
      <path d="M17 11h.01" />
    </>
  ),
  edit: (
    <>
      <path d="m16 3 5 5-12 12-6 1 1-6Z" />
      <path d="m14 5 5 5" />
    </>
  ),
  close: <path d="m6 6 12 12M18 6 6 18" />,
  reset: (
    <>
      <path d="M3 10a9 9 0 1 1 2.5 8" />
      <path d="M3 4v6h6" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  chevron: <path d="m9 5 7 7-7 7" />,
};

const Icon = ({ name, size = 18, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
    focusable="false"
  >
    {ICON_PATHS[name] || ICON_PATHS.file}
  </svg>
);

/* =========================================================
   EXISTING CERTIFICATE TEMPLATE
   ========================================================= */

const CertificateSheet = ({ d: cert }) => (
  <div className={d.cBox}>
    <div className={d.cTitle}>
      Shipper&apos;s Certification for Non - Hazardous Cargo
    </div>

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
      <div className={d.pre}>
        {'Marks and\nNumber of\nPackages'}
      </div>

      <div className={`${d.cVl} ${d.pre}`}>
        {
          'Proper description of goods / give technical name\n(Trade Names not Permitted)'
        }
      </div>

      <div className={`${d.center} ${d.pre}`}>
        {'Net Quantity\nPer Package'}
      </div>
    </div>

    <div className={d.cBody}>
      <div className={d.cLeft}>
        <div className={d.pre}>
          {`${cert.shipper || ''}\n\n${cert.consignee || ''}`}
        </div>

        <div className={d.cInv}>
          <div>Invoice No : {cert.invoiceNo}</div>
          <div>Total No Of Package : {cert.totalPackages}</div>
        </div>
      </div>

      <div className={`${d.cMid} ${d.pre}`}>
        {cert.goods}
      </div>

      <div className={d.cRight}>
        <div>
          NET WEIGHT: <span className={d.kgs}>KGS</span>
        </div>

        <div className={d.center}>{cert.netWeight}</div>

        <div className={d.gap} />

        <div>
          GROSS WEIGHT: <span className={d.kgs}>KGS</span>
        </div>

        <div className={d.center}>{cert.grossWeight}</div>
      </div>

      <div className={d.cSign}>
        <div className={d.sRow}>
          <div className={d.sLabel}>NAME</div>
          <div className={d.sVal}>{cert.signerName}</div>
        </div>

        <div className={d.sRow}>
          <div className={d.sLabel}>DESIGNATION</div>

          <div className={`${d.sVal} ${d.italic}`}>
            {cert.signerDesignation}
          </div>
        </div>

        <div className={d.sStamp}>
          SIGNATURE &amp; COMPANY STAMP
        </div>
      </div>
    </div>

    <div className={d.cFoot}>{cert.footer}</div>
  </div>
);

/* =========================================================
   EXISTING DHL AUTHORIZATION TEMPLATE
   ========================================================= */

const AuthorisationSheet = ({ d: letter }) => {
  const paragraphs = String(letter.body || '')
    .split(/\n\s*\n/)
    .filter(Boolean);

  return (
    <div className={d.letter}>
      <div className={d.lTitle}>
        Authorization for Export shipment
      </div>

      <div className={d.lSub}>
        To whomsoever it may concern
      </div>

      {paragraphs.map((paragraph, index) => (
        <p key={index} className={d.lPara}>
          {paragraph}
        </p>
      ))}

      <div className={d.lThanks}>Thanking you,</div>
      <div className={d.lYours}>Yours sincerely,</div>

      <div className={d.lBoxes}>
        <div className={d.lBox}>
          <div>Company Name: {letter.company}</div>
          <div>GSTIN : {letter.gstin}</div>
          <div>Signature:</div>
          <div>Name: {letter.signerName}</div>
          <div>Designation: {letter.designation}</div>
          <div>Date: {letter.date}</div>
          <div>Mobile No: {letter.mobile}</div>
          <div>Company Stamp</div>
        </div>

        <div className={d.lBox}>
          <div>Individual Shipper Name :</div>

          <div>
            KYC Document :
            <br />
            KYC Document No:
            <br />
            ADHAR CARD NO :
          </div>

          <div>Signature:</div>

          <div>
            Date:
            <br />
            Mobile No:
          </div>
        </div>
      </div>
    </div>
  );
};

/* =========================================================
   FIELD CONFIGURATION
   ========================================================= */

const F = (k, label, options = {}) => ({
  k,
  label,
  ...options,
});

const CERTIFICATE_FIELDS = [
  F('awbNo', 'AWB number'),
  F('mawbNo', 'MAWB number'),

  F('depAirport', 'Departure airport'),
  F('depCountry', 'Departure country'),
  F('destAirport', 'Destination airport'),

  F('invoiceNo', 'Invoice number'),
  F('totalPackages', 'Total packages'),

  F('netWeight', 'Net weight (KGS)'),
  F('grossWeight', 'Gross weight (KGS)'),

  F('signerName', 'Signatory name'),
  F('signerDesignation', 'Designation'),

  F('goods', 'Description of goods', {
    rows: 4,
    wide: true,
  }),

  F('shipper', 'Shipper name and address', {
    rows: 6,
    wide: true,
  }),

  F('consignee', 'Consignee name and address', {
    rows: 6,
    wide: true,
  }),

  F('statement', 'Certification text', {
    rows: 7,
    wide: true,
  }),

  F('footer', 'Footer notes', {
    rows: 6,
    wide: true,
  }),
];

const AUTHORISATION_FIELDS = [
  F('company', 'Company name', {
    wide: true,
  }),

  F('gstin', 'GSTIN'),
  F('signerName', 'Signatory name'),
  F('designation', 'Designation'),
  F('date', 'Date'),
  F('mobile', 'Mobile number'),

  F('body', 'Letter text — blank line starts a new paragraph', {
    rows: 14,
    wide: true,
  }),
];

/* =========================================================
   DOCUMENT REGISTRY
   ========================================================= */

const CATEGORY_ORDER = [
  'Shipping documents',
  'Authorizations & KYC',
  'Declarations & certificates',
  'Other documents',
];

const DOCUMENT_META = {
  cert: {
    category: 'Declarations & certificates',
    description:
      'Review the non-hazardous cargo certificate and shipment details.',
  },

  letter: {
    category: 'Authorizations & KYC',
    description:
      'Authorize DHL to handle customs clearance for your shipment.',
  },

  packing: {
    category: 'Shipping documents',
    description:
      'Package contents, quantities, weights, and delivery information.',
  },

  sli: {
    category: 'Shipping documents',
    description:
      'DHL shipping instructions, customs information, and declarations.',
  },

  annexure: {
    category: 'Declarations & certificates',
    description:
      'Export value declaration, valuation method, and transaction details.',
  },

  scomet: {
    category: 'Declarations & certificates',
    description:
      'Review the Non-SCOMET declaration for this shipment.',
  },

  self_decl: {
    category: 'Declarations & certificates',
    description:
      'Shipper declaration for medicine shipments and recipient details.',
  },

  indemnity: {
    category: 'Declarations & certificates',
    description:
      'Fragile-shipment indemnity letter and shipment contents.',
  },

  non_hazardous: {
    category: 'Declarations & certificates',
    description:
      'Additional non-hazardous cargo certification format.',
  },

  export_authority: {
    category: 'Authorizations & KYC',
    description:
      'Authorize the selected courier to clear export consignments.',
  },

  kyc_authorization: {
    category: 'Authorizations & KYC',
    description:
      'Courier authorization and the KYC documents enclosed.',
  },
};

const DOCUMENTS = [
  {
    id: 'cert',
    label: 'Non-Hazardous Certificate',
    file: 'NonHazardous-Certificate',
    build: buildCertificateDefaults,
    fields: CERTIFICATE_FIELDS,
    Sheet: CertificateSheet,
    side: 15,
    margins: PLAIN_MARGINS,
    letterhead: true,
  },

  {
    id: 'letter',
    label: 'DHL Authorisation',
    file: 'DHL-Authorisation',
    build: buildAuthorisationDefaults,
    fields: AUTHORISATION_FIELDS,
    Sheet: AuthorisationSheet,
    side: 25,
    margins: PLAIN_MARGINS,
    letterhead: true,
  },

  ...EXTRA_DOCS,
].map((doc) => ({
  ...doc,

  category:
    doc.category ||
    DOCUMENT_META[doc.id]?.category ||
    'Other documents',

  description:
    doc.description ||
    DOCUMENT_META[doc.id]?.description ||
    'Review and edit this supporting document.',
}));

/* =========================================================
   INITIAL DOCUMENT VALUES
   ========================================================= */

const getInitialValues = (invoiceData) => {
  const saved = invoiceData.supportingDocuments || {};

  return Object.fromEntries(
    DOCUMENTS.map((doc) => {
      let savedValues;

      if (doc.id === 'cert') {
        savedValues = saved.certificate;
      } else if (doc.id === 'letter') {
        savedValues = saved.authorizationLetter;
      } else {
        savedValues = saved.extraDocuments?.[doc.id];
      }

      return [
        doc.id,
        {
          ...doc.build(invoiceData),
          ...(savedValues || {}),
        },
      ];
    })
  );
};

/* =========================================================
   PDF EXPORT

   Each document begins on a new PDF page.
   Longer documents continue onto additional pages.
   ========================================================= */

const savePdf = async (elements, filename, onProgress) => {
  const html2canvas = (await import('html2canvas')).default;
  const { jsPDF } = await import('jspdf');

  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pageWidth = 210;
  const pageHeight = 297;

  let addedPages = 0;

  for (let index = 0; index < elements.length; index += 1) {
    const element = elements[index];

    if (!element) {
      throw new Error('A document preview is unavailable.');
    }

    onProgress?.(index + 1, elements.length);

    const captureId = `capture-${Date.now()}-${index}`;

    const previousCaptureId =
      element.getAttribute('data-pdf-capture');

    element.setAttribute('data-pdf-capture', captureId);

    let canvas;

    try {
      canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
        scrollX: 0,
        scrollY: 0,

        onclone: (clonedDocument) => {
          const clonedSheet = clonedDocument.querySelector(
            `[data-pdf-capture="${captureId}"]`
          );

          if (!clonedSheet) {
            throw new Error('Could not prepare document capture.');
          }

          // Remove the sheet from hidden or scrolling UI containers
          // in the cloned document only.
          clonedDocument.body.appendChild(clonedSheet);

          const overrides = {
            display: 'block',
            position: 'relative',
            inset: 'auto',
            left: 'auto',
            top: 'auto',

            width: '210mm',
            'min-width': '210mm',
            'max-width': '210mm',

            height: 'auto',
            'min-height': '297mm',
            'max-height': 'none',

            margin: '0',
            transform: 'none',
            visibility: 'visible',
            opacity: '1',

            'box-sizing': 'border-box',
            'box-shadow': 'none',
            overflow: 'visible',
            background: '#ffffff',
          };

          Object.entries(overrides).forEach(([property, value]) => {
            clonedSheet.style.setProperty(
              property,
              value,
              'important'
            );
          });
        },
      });
    } finally {
      if (previousCaptureId === null) {
        element.removeAttribute('data-pdf-capture');
      } else {
        element.setAttribute(
          'data-pdf-capture',
          previousCaptureId
        );
      }
    }

    if (!canvas.width || !canvas.height) {
      throw new Error('The document could not be rendered.');
    }

    const pixelsPerPage = Math.max(
      1,
      Math.round((canvas.width * pageHeight) / pageWidth)
    );

    // Ignore tiny rounding differences around an exact A4 height.
    const totalHeight =
      Math.abs(canvas.height - pixelsPerPage) <= 2
        ? Math.min(canvas.height, pixelsPerPage)
        : canvas.height;

    for (
      let offset = 0;
      offset < totalHeight;
      offset += pixelsPerPage
    ) {
      const sliceHeight = Math.min(
        pixelsPerPage,
        totalHeight - offset
      );

      const pageCanvas = document.createElement('canvas');

      pageCanvas.width = canvas.width;
      pageCanvas.height = sliceHeight;

      const context = pageCanvas.getContext('2d');

      if (!context) {
        throw new Error('Could not create the PDF page.');
      }

      context.fillStyle = '#ffffff';
      context.fillRect(
        0,
        0,
        pageCanvas.width,
        pageCanvas.height
      );

      context.drawImage(
        canvas,
        0,
        offset,
        canvas.width,
        sliceHeight,
        0,
        0,
        canvas.width,
        sliceHeight
      );

      if (addedPages > 0) {
        pdf.addPage();
      }

      pdf.addImage(
        pageCanvas.toDataURL('image/png'),
        'PNG',
        0,
        0,
        pageWidth,
        (sliceHeight * pageWidth) / canvas.width
      );

      addedPages += 1;

      pageCanvas.width = 0;
      pageCanvas.height = 0;
    }

    canvas.width = 0;
    canvas.height = 0;
  }

  pdf.save(filename);
};

/* =========================================================
   EDITABLE FIELD
   ========================================================= */

const Field = ({
  label,
  value,
  onChange,
  rows,
  wide,
  options,
  check,
}) => (
  <label
    className={[
      ui.field,
      wide ? ui.fieldWide : '',
      check ? ui.checkField : '',
    ]
      .filter(Boolean)
      .join(' ')}
  >
    {check ? (
      <>
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(event.target.checked)}
        />

        <span>{label}</span>
      </>
    ) : (
      <>
        <span className={ui.fieldLabel}>{label}</span>

        {options ? (
          <select
            value={value ?? ''}
            onChange={(event) => onChange(event.target.value)}
          >
            {options.map((option) => (
              <option key={option} value={option}>
                {option || '— Select —'}
              </option>
            ))}
          </select>
        ) : rows ? (
          <textarea
            rows={rows}
            value={value ?? ''}
            onChange={(event) => onChange(event.target.value)}
          />
        ) : (
          <input
            type="text"
            value={value ?? ''}
            onChange={(event) => onChange(event.target.value)}
          />
        )}
      </>
    )}
  </label>
);

/* =========================================================
   DOCUMENT CENTER MODAL
   ========================================================= */

const ExportDocumentsModal = ({
  invoiceData = {},
  onClose,
  onSave,
}) => {
  const savedDocuments = invoiceData.supportingDocuments || {};

  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const sheetRefs = useRef({});
  const busyRef = useRef(false);

  const [activeId, setActiveId] = useState('cert');
  const [search, setSearch] = useState('');
  const [showEditor, setShowEditor] = useState(false);

  const [selectedIds, setSelectedIds] = useState([
    'cert',
    'letter',
  ]);

  const [values, setValues] = useState(() =>
    getInitialValues(invoiceData)
  );

  const [letterhead, setLetterhead] = useState(
    () => savedDocuments.letterhead ?? false
  );

  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(null);
  const [progress, setProgress] = useState('');
  const [notice, setNotice] = useState(null);

  const activeDocument =
    DOCUMENTS.find((doc) => doc.id === activeId) ||
    DOCUMENTS[0];

  const normalizedSearch = search.trim().toLowerCase();

  const filteredDocuments = DOCUMENTS.filter((doc) => {
    const searchable =
      `${doc.label} ${doc.category} ${doc.description}`.toLowerCase();

    return searchable.includes(normalizedSearch);
  });

  const categories = [
    ...new Set([
      ...CATEGORY_ORDER,
      ...DOCUMENTS.map((doc) => doc.category),
    ]),
  ];

  const groups = categories
    .map((category) => ({
      category,
      documents: filteredDocuments.filter(
        (doc) => doc.category === category
      ),
    }))
    .filter((group) => group.documents.length > 0);

  const allVisibleSelected =
    filteredDocuments.length > 0 &&
    filteredDocuments.every((doc) =>
      selectedIds.includes(doc.id)
    );

  const safeInvoiceNumber = String(
    invoiceData.invoiceNo || 'draft'
  ).replace(/[\\/:*?"<>|]/g, '-');

  const isBusy = Boolean(busy);

  /* ---------------- Modal lifecycle ---------------- */

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement;

    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;

      if (
        previousFocus instanceof HTMLElement &&
        previousFocus.isConnected
      ) {
        previousFocus.focus();
      }
    };
  }, []);

  /* ---------------- Change tracking ---------------- */

  const markChanged = () => {
    setDirty(true);
    setNotice(null);
  };

  const updateField = (documentId, key, value) => {
    setValues((previous) => ({
      ...previous,
      [documentId]: {
        ...previous[documentId],
        [key]: value,
      },
    }));

    markChanged();
  };

  const updateLetterhead = (checked) => {
    setLetterhead(checked);
    markChanged();
  };

  /* ---------------- Selection ---------------- */

  const toggleSelected = (documentId) => {
    setSelectedIds((previous) =>
      previous.includes(documentId)
        ? previous.filter((id) => id !== documentId)
        : [...previous, documentId]
    );
  };

  const toggleVisibleSelection = () => {
    const visibleIds = filteredDocuments.map((doc) => doc.id);

    setSelectedIds((previous) =>
      allVisibleSelected
        ? previous.filter((id) => !visibleIds.includes(id))
        : [...new Set([...previous, ...visibleIds])]
    );
  };

  /* ---------------- Close and keyboard handling ---------------- */

  const requestClose = () => {
    if (busyRef.current) return;

    if (
      dirty &&
      !window.confirm(
        'You have unapplied document changes. Close without applying them?'
      )
    ) {
      return;
    }

    onClose?.();
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      requestClose();
      return;
    }

    if (event.key !== 'Tab') return;

    const dialog = dialogRef.current;

    if (!dialog) return;

    const focusableElements = Array.from(
      dialog.querySelectorAll(
        [
          'button:not(:disabled)',
          'input:not(:disabled)',
          'select:not(:disabled)',
          'textarea:not(:disabled)',
          'a[href]',
          '[tabindex="0"]',
        ].join(',')
      )
    ).filter(
      (element) => element.getClientRects().length > 0
    );

    if (!focusableElements.length) {
      event.preventDefault();
      dialog.focus();
      return;
    }

    const first = focusableElements[0];
    const last =
      focusableElements[focusableElements.length - 1];

    const currentFocus = document.activeElement;

    if (
      event.shiftKey &&
      (currentFocus === first || currentFocus === dialog)
    ) {
      event.preventDefault();
      last.focus();
    } else if (
      !event.shiftKey &&
      (currentFocus === last || currentFocus === dialog)
    ) {
      event.preventDefault();
      first.focus();
    }
  };

  /* ---------------- Reset current document ---------------- */

  const resetCurrentDocument = () => {
    if (busyRef.current) return;

    const confirmed = window.confirm(
      `Reset "${activeDocument.label}" to invoice data? ` +
        'Any edits to this document will be replaced.'
    );

    if (!confirmed) return;

    try {
      const defaults = activeDocument.build(invoiceData);

      setValues((previous) => ({
        ...previous,
        [activeDocument.id]: defaults,
      }));

      markChanged();

      setNotice({
        type: 'info',
        text:
          'This document was reset to invoice data. ' +
          'Apply changes if you want to keep the reset.',
      });
    } catch (error) {
      console.error('Document reset failed:', error);

      setNotice({
        type: 'error',
        text: 'Could not reset this document. Please try again.',
      });
    }
  };

  /* ---------------- Download ---------------- */

  const downloadDocuments = async (ids) => {
    if (!ids.length || busyRef.current) return;

    const documentsToDownload = DOCUMENTS.filter((doc) =>
      ids.includes(doc.id)
    );

    if (!documentsToDownload.length) return;

    busyRef.current = true;
    setBusy('download');
    setProgress('Preparing PDF…');
    setNotice(null);

    try {
      const elements = documentsToDownload.map(
        (doc) => sheetRefs.current[doc.id]
      );

      const filename =
        documentsToDownload.length === 1
          ? `${documentsToDownload[0].file}-${safeInvoiceNumber}.pdf`
          : `Export-Documents-${safeInvoiceNumber}.pdf`;

      await savePdf(
        elements,
        filename,
        (current, total) => {
          setProgress(
            `Preparing document ${current} of ${total}…`
          );
        }
      );

      setNotice({
        type: 'success',
        text:
          documentsToDownload.length === 1
            ? 'Document PDF prepared.'
            : `${documentsToDownload.length} documents combined into one PDF.`,
      });
    } catch (error) {
      console.error('PDF generation failed:', error);

      setNotice({
        type: 'error',
        text: 'Could not generate the PDF. Please try again.',
      });
    } finally {
      busyRef.current = false;
      setBusy(null);
      setProgress('');
    }
  };

  /* ---------------- Apply document edits ---------------- */

  const applyChanges = async () => {
    if (busyRef.current || !onSave) return;

    busyRef.current = true;
    setBusy('save');
    setNotice(null);

    try {
      // Preserve saved extra-document data not currently registered.
      const extraDocuments = {
        ...(savedDocuments.extraDocuments || {}),
      };

      EXTRA_DOCS.forEach((doc) => {
        extraDocuments[doc.id] = values[doc.id];
      });

      await onSave({
        certificate: values.cert,
        authorizationLetter: values.letter,
        extraDocuments,
        letterhead,
      });

      setDirty(false);

      setNotice({
        type: 'success',
        text:
          'Document changes applied. Save or update the invoice ' +
          'to keep them permanently.',
      });
    } catch (error) {
      console.error('Applying document changes failed:', error);

      setNotice({
        type: 'error',
        text: 'Could not apply changes. Please try again.',
      });
    } finally {
      busyRef.current = false;
      setBusy(null);
    }
  };

  /* ---------------- Rendering ---------------- */

  if (typeof document === 'undefined') {
    return null;
  }

  const modal = (
    <div id="docs-print-root" className={ui.overlay}>
      <style>{PRINT_CSS}</style>

      <section
        ref={dialogRef}
        className={ui.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="document-center-title"
        aria-describedby="document-center-description"
        aria-busy={isBusy}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        {/* ================= HEADER ================= */}

        <header className={ui.header}>
          <div className={ui.headerIdentity}>
            <div className={ui.headerIcon}>
              <Icon name="file" size={23} />
            </div>

            <div>
              <div className={ui.eyebrow}>
                SHIPMENT WORKSPACE
              </div>

              <h2
                id="document-center-title"
                className={ui.title}
              >
                Export documents
              </h2>

              <p
                id="document-center-description"
                className={ui.subtitle}
              >
                Review, customize, and download supporting documents.
              </p>
            </div>
          </div>

          <div className={ui.headerActions}>
            <div className={ui.invoiceBadge}>
              <span>Invoice</span>
              <strong>
                {invoiceData.invoiceNo || 'Draft'}
              </strong>
            </div>

            <button
              ref={closeButtonRef}
              type="button"
              className={ui.iconButton}
              onClick={requestClose}
              disabled={isBusy}
              aria-label="Close document center"
              title="Close"
            >
              <Icon name="close" size={20} />
            </button>
          </div>
        </header>

        <div className={ui.workspace}>
          {/* ================= DOCUMENT LIBRARY ================= */}

          <aside
            className={ui.sidebar}
            aria-label="Document library"
          >
            <div className={ui.sidebarTop}>
              <div className={ui.sectionHeading}>
                <h3>Document library</h3>

                <span className={ui.countBadge}>
                  {DOCUMENTS.length}
                </span>
              </div>

              <label className={ui.search}>
                <Icon name="search" size={17} />

                <span className={ui.srOnly}>
                  Search documents
                </span>

                <input
                  type="search"
                  placeholder="Search documents…"
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                />
              </label>

              <div className={ui.selectionTools}>
                <label>
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    disabled={
                      !filteredDocuments.length || isBusy
                    }
                    onChange={toggleVisibleSelection}
                  />

                  Select visible
                </label>

                <button
                  type="button"
                  className={ui.textButton}
                  disabled={!selectedIds.length || isBusy}
                  onClick={() => setSelectedIds([])}
                >
                  Clear
                </button>
              </div>
            </div>

            <div className={ui.documentList}>
              {groups.map(({ category, documents }) => (
                <section
                  key={category}
                  className={ui.documentGroup}
                >
                  <h4>{category}</h4>

                  {documents.map((doc) => {
                    const current = activeId === doc.id;
                    const selected = selectedIds.includes(
                      doc.id
                    );

                    return (
                      <div
                        key={doc.id}
                        className={[
                          ui.documentRow,
                          current
                            ? ui.documentRowActive
                            : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        <input
                          type="checkbox"
                          className={ui.documentCheckbox}
                          checked={selected}
                          disabled={isBusy}
                          onChange={() =>
                            toggleSelected(doc.id)
                          }
                          aria-label={`Include ${doc.label} in combined PDF`}
                        />

                        <button
                          type="button"
                          className={ui.documentButton}
                          disabled={isBusy}
                          onClick={() =>
                            setActiveId(doc.id)
                          }
                          aria-current={
                            current ? 'true' : undefined
                          }
                        >
                          <span
                            className={ui.documentLabel}
                          >
                            {doc.label}
                          </span>

                          <span
                            className={ui.documentCaption}
                          >
                            {current
                              ? 'Currently viewing'
                              : 'Preview document'}
                          </span>
                        </button>

                        {current && (
                          <span
                            className={ui.currentIndicator}
                          >
                            <Icon
                              name="chevron"
                              size={15}
                            />
                          </span>
                        )}
                      </div>
                    );
                  })}
                </section>
              ))}

              {!filteredDocuments.length && (
                <div className={ui.emptyState}>
                  <Icon name="search" size={26} />

                  <strong>No documents found</strong>

                  <span>
                    Try a different name or clear your search.
                  </span>

                  <button
                    type="button"
                    className={ui.textButton}
                    onClick={() => setSearch('')}
                  >
                    Clear search
                  </button>
                </div>
              )}
            </div>

            <div className={ui.sidebarHint}>
              <Icon name="file" size={17} />

              <p>
                Click a document to preview it. Select its
                checkbox to include it in a combined PDF.
              </p>
            </div>
          </aside>

          {/* ================= MAIN WORKSPACE ================= */}

          <main className={ui.main}>
            <div className={ui.toolbar}>
              <div className={ui.documentHeading}>
                <div className={ui.breadcrumb}>
                  {activeDocument.category}
                </div>

                <h3>{activeDocument.label}</h3>

                <p>{activeDocument.description}</p>
              </div>

              <div className={ui.toolbarActions}>
                <button
                  type="button"
                  className={`${ui.button} ${
                    showEditor
                      ? ui.buttonSelected
                      : ui.buttonSecondary
                  }`}
                  onClick={() =>
                    setShowEditor((previous) => !previous)
                  }
                  disabled={isBusy}
                  aria-expanded={showEditor}
                  aria-controls="document-editor"
                >
                  <Icon name="edit" size={16} />

                  {showEditor
                    ? 'Hide editor'
                    : 'Edit details'}
                </button>

                <button
                  type="button"
                  className={`${ui.button} ${ui.buttonSecondary}`}
                  onClick={() => window.print()}
                  disabled={isBusy}
                  title="Print the currently displayed document"
                >
                  <Icon name="print" size={16} />
                  Print
                </button>

                <button
                  type="button"
                  className={`${ui.button} ${ui.buttonPrimary}`}
                  onClick={() =>
                    downloadDocuments([activeId])
                  }
                  disabled={isBusy}
                >
                  {busy === 'download' ? (
                    <span
                      className={ui.spinner}
                      aria-hidden="true"
                    />
                  ) : (
                    <Icon name="download" size={16} />
                  )}

                  {busy === 'download'
                    ? 'Preparing…'
                    : 'Download PDF'}
                </button>
              </div>
            </div>

            {/* ================= PAPER OPTIONS ================= */}

            <div className={ui.previewOptions}>
              <span className={ui.previewBadge}>
                A4 document
              </span>

              <span
                className={ui.optionDivider}
                aria-hidden="true"
              />

              <label className={ui.letterheadToggle}>
                <input
                  type="checkbox"
                  checked={letterhead}
                  onChange={(event) =>
                    updateLetterhead(event.target.checked)
                  }
                  disabled={isBusy}
                />

                Reserve letterhead space
              </label>

              <span className={ui.optionHint}>
                Adds blank space for pre-printed letterhead on
                supported documents.
              </span>
            </div>

            {/* ================= NOTIFICATIONS ================= */}

            {notice && (
              <div
                className={[
                  ui.notice,
                  notice.type === 'error'
                    ? ui.noticeError
                    : notice.type === 'success'
                      ? ui.noticeSuccess
                      : ui.noticeInfo,
                ].join(' ')}
                role={
                  notice.type === 'error'
                    ? 'alert'
                    : 'status'
                }
              >
                <span>{notice.text}</span>

                <button
                  type="button"
                  className={ui.noticeClose}
                  onClick={() => setNotice(null)}
                  aria-label="Dismiss notification"
                >
                  <Icon name="close" size={15} />
                </button>
              </div>
            )}

            {/* ================= PREVIEW + EDITOR ================= */}

            <div
              className={`${ui.canvasLayout} ${
                showEditor ? ui.withEditor : ''
              }`}
            >
              <div
                className={ui.previewScroller}
                aria-label={`${activeDocument.label} preview`}
              >
                <div className={ui.stage}>
                  {DOCUMENTS.map((doc) => {
                    const Sheet = doc.Sheet;

                    const margins =
                      letterhead && doc.letterhead
                        ? LETTERHEAD_MARGINS
                        : doc.margins || PLAIN_MARGINS;

                    const current = activeId === doc.id;

                    return (
                      <div
                        key={doc.id}
                        ref={(element) => {
                          if (element) {
                            sheetRefs.current[doc.id] =
                              element;
                          } else {
                            delete sheetRefs.current[doc.id];
                          }
                        }}
                        className={[
                          d.sheet,
                          ui.paper,
                          current ? '' : ui.hiddenPaper,
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        style={{
                          padding:
                            `${margins.top}mm ` +
                            `${doc.side ?? 20}mm ` +
                            `${margins.bottom}mm`,
                        }}
                        aria-hidden={
                          current ? undefined : true
                        }
                      >
                        <Sheet d={values[doc.id]} />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ================= EDIT PANEL ================= */}

              {showEditor && (
                <aside
                  id="document-editor"
                  className={ui.editor}
                  aria-label="Edit current document"
                >
                  <div className={ui.editorHeader}>
                    <div>
                      <h3>Edit details</h3>

                      <p>
                        Changes appear in the preview.
                      </p>
                    </div>

                    <button
                      type="button"
                      className={ui.smallIconButton}
                      onClick={() =>
                        setShowEditor(false)
                      }
                      aria-label="Close document editor"
                    >
                      <Icon name="close" size={17} />
                    </button>
                  </div>

                  <fieldset
                    className={ui.editorFields}
                    disabled={isBusy}
                  >
                    <legend className={ui.srOnly}>
                      {activeDocument.label} fields
                    </legend>

                    <div className={ui.fieldGrid}>
                      {(activeDocument.fields || []).map(
                        (field) => (
                          <Field
                            key={`${activeId}-${field.k}`}
                            label={field.label}
                            value={
                              values[activeId]?.[field.k]
                            }
                            onChange={(value) =>
                              updateField(
                                activeId,
                                field.k,
                                value
                              )
                            }
                            rows={field.rows}
                            wide={field.wide}
                            options={field.options}
                            check={field.check}
                          />
                        )
                      )}
                    </div>
                  </fieldset>

                  <div className={ui.editorFooter}>
                    <button
                      type="button"
                      className={ui.resetButton}
                      onClick={resetCurrentDocument}
                      disabled={isBusy}
                    >
                      <Icon name="reset" size={15} />

                      Reset this document
                    </button>

                    <span>
                      Restores values from the invoice.
                    </span>
                  </div>
                </aside>
              )}
            </div>
          </main>
        </div>

        {/* ================= FOOTER ================= */}

        <footer className={ui.footer}>
          <div className={ui.footerSelection}>
            <div className={ui.selectionCount}>
              <Icon name="file" size={17} />

              <strong>
                {selectedIds.length} document
                {selectedIds.length === 1 ? '' : 's'} selected
              </strong>
            </div>

            <span>
              Selected documents download together as one PDF.
            </span>
          </div>

          <div className={ui.footerActions}>
            <div
              className={ui.saveStatus}
              aria-live="polite"
            >
              {busy === 'download' ? (
                progress
              ) : dirty ? (
                <>
                  <span className={ui.unsavedDot} />
                  Unapplied changes
                </>
              ) : (
                <>
                  <Icon name="check" size={15} />
                  No unapplied changes
                </>
              )}
            </div>

            <button
              type="button"
              className={`${ui.button} ${ui.buttonSecondary}`}
              onClick={() =>
                downloadDocuments(selectedIds)
              }
              disabled={isBusy || !selectedIds.length}
            >
              <Icon name="download" size={16} />

              Download selected ({selectedIds.length})
            </button>

            <button
              type="button"
              className={`${ui.button} ${ui.buttonPrimary}`}
              onClick={applyChanges}
              disabled={isBusy || !dirty || !onSave}
            >
              {busy === 'save' ? (
                <span
                  className={ui.spinner}
                  aria-hidden="true"
                />
              ) : (
                <Icon name="check" size={16} />
              )}

              {busy === 'save'
                ? 'Applying…'
                : 'Apply changes'}
            </button>
          </div>
        </footer>

        <div
          className={ui.srOnly}
          role="status"
          aria-live="polite"
        >
          {progress}
        </div>
      </section>
    </div>
  );

  return createPortal(modal, document.body);
  
};

export default ExportDocumentsModal;