import React, { useRef, useState } from 'react';
import Link from 'next/link';

import s from '../styles/invoiceWorkspace.module.css';

import InternationalInvoiceItems from './InternationalInvoiceItems';
import InternationalInvoicePreview from './InternationalInvoicePreview';
import ExportDocumentsModal from './ExportDocumentsModal';

import InvoiceModeSelector from './InvoiceModeSelector';
import ModeDetails from './ModeDetails';
import InternationalPartySelectors from './InternationalPartySelectors';

import { useInternationalInvoice } from '../hooks/useInternationalInvoice';
import { getMode } from '../data/invoiceModes';

/* =========================================================
   REUSABLE FIELD
   ========================================================= */

const InputField = ({
  id,
  label,
  value,
  onChange,
  type = 'text',
  required = false,
  placeholder,
  wide = false,
  multiline = false,
  hint,
  ...inputProps
}) => {
  const hintId = hint ? `${id}-hint` : undefined;

  return (
    <div className={`${s.field} ${wide ? s.fullWidth : ''}`}>
      <label htmlFor={id}>
        {label}
        {required && <span className={s.required}> *</span>}
      </label>

      {multiline ? (
        <textarea
          {...inputProps}
          id={id}
          value={value ?? ''}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          required={required}
          aria-describedby={hintId}
          rows={inputProps.rows || 3}
        />
      ) : (
        <input
          {...inputProps}
          id={id}
          type={type}
          value={value ?? ''}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          required={required}
          aria-describedby={hintId}
        />
      )}

      {hint && (
        <span id={hintId} className={s.fieldHint}>
          {hint}
        </span>
      )}
    </div>
  );
};

/* =========================================================
   NUMBERED SECTION
   ========================================================= */

const FormSection = ({
  id,
  number,
  title,
  description,
  children,
}) => (
  <section id={id} className={s.card}>
    <div className={s.cardHeader}>
      <span className={s.sectionNumber} aria-hidden="true">
        {number}
      </span>

      <div>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
    </div>

    <div className={s.cardBody}>{children}</div>
  </section>
);

const SECTION_LINKS = [
  ['invoice-details', 'Invoice'],
  ['sender-details', 'Sender'],
  ['receiver-details', 'Recipient'],
  ['shipping-details', 'Shipping'],
  ['invoice-items', 'Items'],
];

/* =========================================================
   FORM
   ========================================================= */

const InternationalInvoiceForm = () => {
  const {
    invoiceData,
    updateInvoiceData,
    updateConsignorDetails,
    updateConsigneeDetails,
    addItem,
    removeItem,
    updateItem,
    applyMode,
    updateModeDetails,
    saveInvoice,
    resetForm,
    getTotalAmount,
    getAmountInWords,
  } = useInternationalInvoice();

  const formRef = useRef(null);
  const savingRef = useRef(false);

  const [showPreview, setShowPreview] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const mode = getMode(invoiceData.mode);

  const consignor = invoiceData.consignorDetails || {};
  const consignee = invoiceData.consigneeDetails || {};

  const items = invoiceData.items || [];

  const calculatedTotal = Number(getTotalAmount());
  const total = Number.isFinite(calculatedTotal)
    ? calculatedTotal
    : 0;

  const amountInWords = String(
    getAmountInWords(total) || ''
  ).toUpperCase();

  const currency = invoiceData.currencyCode || '—';

  const idType = consignor.idType || 'gstin';

  const canPreview = Boolean(
    invoiceData.invoiceNo && consignee.name
  );

  const updateRoot = (key) => (value) =>
    updateInvoiceData({ [key]: value });

  const updateSender = (key) => (value) =>
    updateConsignorDetails({ [key]: value });

  const updateReceiver = (key) => (value) =>
    updateConsigneeDetails({ [key]: value });

  const rootField = (key, label, options = {}) => (
    <InputField
      key={key}
      id={`invoice-${key}`}
      label={label}
      value={invoiceData[key]}
      onChange={updateRoot(key)}
      {...options}
    />
  );

  const senderField = (key, label, options = {}) => (
    <InputField
      key={key}
      id={`sender-${key}`}
      label={label}
      value={consignor[key]}
      onChange={updateSender(key)}
      {...options}
    />
  );

  const receiverField = (key, label, options = {}) => (
    <InputField
      key={key}
      id={`receiver-${key}`}
      label={label}
      value={consignee[key]}
      onChange={updateReceiver(key)}
      {...options}
    />
  );

  const handleSave = async (event) => {
    event.preventDefault();

    if (savingRef.current) return;

    if (!formRef.current?.reportValidity()) return;

    savingRef.current = true;
    setLoading(true);
    setMessage(null);

    try {
      await saveInvoice();

      setMessage({
        type: 'success',
        text:
          'Invoice saved successfully. You can continue reviewing it ' +
          'or use Reset to start a new invoice.',
      });
    } catch (error) {
      console.error('Error saving invoice:', error);

      setMessage({
        type: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Could not save the invoice. Please try again.',
      });
    } finally {
      savingRef.current = false;
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (
      !window.confirm(
        'Reset this form? Any changes not saved to an invoice will be lost.'
      )
    ) {
      return;
    }

    resetForm();
    setMessage(null);
    setShowPreview(false);
    setShowDocs(false);
  };

  return (
    <div className={s.page}>
      {/* ================= PAGE HEADER ================= */}

      <header className={s.pageHeader}>
        <div>
          <div className={s.eyebrow}>INTERNATIONAL SHIPPING</div>

          <h1>Create export invoice</h1>

          <p>
            Add shipment details, prepare your invoice, and generate
            supporting documents.
          </p>
        </div>

        <Link
          href="/view-international-invoices"
          className={`${s.button} ${s.secondaryButton}`}
        >
          View all invoices
        </Link>
      </header>

      {message && (
        <div
          className={`${s.alert} ${
            message.type === 'error'
              ? s.errorAlert
              : s.successAlert
          }`}
          role={message.type === 'error' ? 'alert' : 'status'}
        >
          <span>{message.text}</span>

          <button
            type="button"
            onClick={() => setMessage(null)}
            aria-label="Dismiss message"
            className={s.dismissButton}
          >
            ×
          </button>
        </div>
      )}

      <form
        ref={formRef}
        onSubmit={handleSave}
        noValidate
        aria-busy={loading}
      >
        <div className={s.workspace}>
          <div className={s.formColumn}>
            {/* Navigation between sections */}
            <nav
              className={s.sectionNav}
              aria-label="Invoice sections"
            >
              {SECTION_LINKS.map(([id, label], index) => (
                <a key={id} href={`#${id}`}>
                  <span>{index + 1}</span>
                  {label}
                </a>
              ))}
            </nav>

            <fieldset
              className={s.formFields}
              disabled={loading}
            >
              <legend className={s.srOnly}>
                Export invoice details
              </legend>

              <InvoiceModeSelector
                value={invoiceData.mode}
                onChange={applyMode}
                disabled={loading}
              />

              <div className={s.modeDetails}>
                <ModeDetails
                  mode={invoiceData.mode}
                  details={invoiceData.modeDetails}
                  onChange={updateModeDetails}
                />
              </div>

              {/* ================= INVOICE ================= */}

              <FormSection
                id="invoice-details"
                number="01"
                title="Invoice details"
                description="Basic references, invoice date, and currency."
              >
                <div className={s.gridThree}>
                  {rootField('invoiceNo', 'Invoice number', {
                    required: true,
                    placeholder: 'e.g. 61056923/25-26',
                  })}

                  {rootField('invoiceDate', 'Invoice date', {
                    type: 'date',
                    required: true,
                  })}

                  <InputField
                    id="invoice-currency"
                    label="Currency code"
                    value={invoiceData.currencyCode}
                    onChange={(value) =>
                      updateInvoiceData({
                        currencyCode: value.toUpperCase(),
                        currencyName: '',
                      })
                    }
                    maxLength={3}
                    placeholder="USD"
                    hint="Three-letter code, such as USD or EUR."
                  />

                  {rootField(
                    'buyersOrderNo',
                    "Buyer's order number",
                    {
                      placeholder: 'Order reference',
                    }
                  )}

                  {rootField('otherRef', 'Other reference', {
                    placeholder: 'Optional reference',
                  })}
                </div>
              </FormSection>

              {/* ================= SENDER ================= */}

              <FormSection
                id="sender-details"
                number="02"
                title="Sender / consignor"
                description="Business identity and collection address."
              >
                <div className={s.partySelector}>
                  <InternationalPartySelectors
                    invoiceData={invoiceData}
                    updateInvoiceData={updateInvoiceData}
                    updateConsignorDetails={
                      updateConsignorDetails
                    }
                    updateConsigneeDetails={
                      updateConsigneeDetails
                    }
                    showSender
                  />
                </div>

                <div className={s.gridTwo}>
                  {senderField('company', 'Company / shipper name', {
                    wide: true,
                    placeholder: 'Registered company or shipper name',
                  })}

                  {senderField('address', 'Address line 1', {
                    wide: true,
                    placeholder: 'Street address',
                  })}

                  {senderField('building', 'Building name')}
                  {senderField('area', 'Area / locality')}
                  {senderField('city', 'City')}

                  {senderField('phone', 'Phone number', {
                    type: 'tel',
                  })}

                  <fieldset className={s.choiceField}>
                    <legend>ID proof type</legend>

                    <div className={s.segmentedControl}>
                      {[
                        ['gstin', 'GSTIN'],
                        ['aadhaar', 'Aadhaar'],
                      ].map(([value, label]) => (
                        <label
                          key={value}
                          className={
                            idType === value
                              ? s.segmentSelected
                              : ''
                          }
                        >
                          <input
                            type="radio"
                            name="consignorIdType"
                            value={value}
                            checked={idType === value}
                            onChange={() =>
                              updateConsignorDetails({
                                idType: value,
                              })
                            }
                          />

                          {label}
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <InputField
                    id="sender-identification"
                    label={
                      idType === 'gstin'
                        ? 'GSTIN'
                        : 'Aadhaar number'
                    }
                    value={
                      idType === 'gstin'
                        ? consignor.gstin
                        : consignor.aadhaar
                    }
                    onChange={(value) =>
                      updateConsignorDetails({
                        [idType === 'gstin'
                          ? 'gstin'
                          : 'aadhaar']: value,
                      })
                    }
                    maxLength={idType === 'gstin' ? 15 : 14}
                    placeholder={
                      idType === 'gstin'
                        ? 'Enter GSTIN'
                        : '1234 5678 9012'
                    }
                  />
                </div>
              </FormSection>

              {/* ================= RECIPIENT ================= */}

              <FormSection
                id="receiver-details"
                number="03"
                title="Recipient / consignee"
                description="Delivery contact and destination address."
              >
                <div className={s.partySelector}>
                  <InternationalPartySelectors
                    invoiceData={invoiceData}
                    updateInvoiceData={updateInvoiceData}
                    updateConsignorDetails={
                      updateConsignorDetails
                    }
                    updateConsigneeDetails={
                      updateConsigneeDetails
                    }
                    showReceiver
                  />
                </div>

                <div className={s.gridTwo}>
                  {receiverField('name', 'Recipient name', {
                    required: true,
                    placeholder: 'Full name',
                  })}

                  {receiverField('company', 'Company', {
                    placeholder: 'Optional company name',
                  })}

                  {receiverField('address', 'Delivery address', {
                    required: true,
                    multiline: true,
                    wide: true,
                    placeholder: 'Full delivery address',
                  })}

                  {receiverField('city', 'City', {
                    required: true,
                  })}

                  {receiverField('country', 'Country', {
                    required: true,
                  })}

                  {receiverField('phone', 'Phone number', {
                    type: 'tel',
                    placeholder: 'Include country code',
                  })}
                </div>
              </FormSection>

              {/* ================= SHIPPING ================= */}

              <FormSection
                id="shipping-details"
                number="04"
                title="Shipping details"
                description="Route, airway bill references, and package weights."
              >
                <div className={s.gridTwo}>
                  {rootField('origin', 'Origin / port of loading')}
                  {rootField('destination', 'Destination')}
                  {rootField('portOfDischarge', 'Port of discharge')}
                  {rootField('finalDestination', 'Final destination')}

                  {rootField('shipmentNotes', 'Shipment notes', {
                    wide: true,
                    multiline: true,
                    placeholder: 'Handling instructions or shipment notes',
                  })}
                </div>

                <div className={s.subsection}>
                  <h3>Certificate and package information</h3>

                  <p>
                    Optional details used when preparing supporting
                    documents.
                  </p>

                  <div className={s.gridThree}>
                    {rootField('awbNo', 'AWB number')}
                    {rootField('mawbNo', 'MAWB number')}

                    {rootField(
                      'totalPackages',
                      'Total number of packages'
                    )}

                    {rootField('netWeight', 'Net weight (KGS)')}
                    {rootField('grossWeight', 'Gross weight (KGS)')}

                    {rootField(
                      'dimensionalWeight',
                      'Dimensional weight',
                      {
                        placeholder: '53 × 58 × 96 = 60 KGS',
                      }
                    )}
                  </div>
                </div>
              </FormSection>

              {/* ================= ITEMS ================= */}

              <FormSection
                id="invoice-items"
                number="05"
                title="Goods and line items"
                description="Descriptions, HSN codes, quantities, and pricing."
              >
                <InternationalInvoiceItems
                  modeId={invoiceData.mode}
                  currencyCode={invoiceData.currencyCode}
                  items={items}
                  onItemChange={updateItem}
                  onAddItem={addItem}
                  onRemoveItem={removeItem}
                  disabled={loading}
                />
              </FormSection>
            </fieldset>
          </div>

          {/* ================= SUMMARY ================= */}

          <aside
            className={s.summaryColumn}
            aria-label="Invoice summary and actions"
          >
            <div className={s.summaryCard}>
              <div className={s.summaryHeader}>
                <h2>Invoice summary</h2>
                <span className={s.badge}>Current form</span>
              </div>

              <dl className={s.summaryList}>
                <div>
                  <dt>Invoice number</dt>
                  <dd>{invoiceData.invoiceNo || 'Not added'}</dd>
                </div>

                <div>
                  <dt>Recipient</dt>
                  <dd>{consignee.name || 'Not added'}</dd>
                </div>

                <div>
                  <dt>Destination</dt>
                  <dd>{consignee.country || 'Not added'}</dd>
                </div>

                <div>
                  <dt>Line items</dt>
                  <dd>{items.length}</dd>
                </div>

                <div>
                  <dt>Shipment mode</dt>
                  <dd>{mode?.label || 'Standard'}</dd>
                </div>
              </dl>

              <div className={s.totalBlock}>
                <span>Total invoice value</span>

                <strong>
                  <small>{currency}</small>{' '}
                  {total.toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </strong>

                {amountInWords && <p>{amountInWords}</p>}
              </div>

              <div className={s.summaryActions}>
                <button
                  type="submit"
                  className={`${s.button} ${s.primaryButton}`}
                  disabled={loading}
                >
                  {loading ? 'Saving invoice…' : 'Save invoice'}
                </button>

                <button
                  type="button"
                  className={`${s.button} ${s.secondaryButton}`}
                  disabled={loading || !canPreview}
                  onClick={() => setShowPreview(true)}
                >
                  Preview & print
                </button>

                <button
                  type="button"
                  className={`${s.button} ${s.secondaryButton}`}
                  disabled={loading || !canPreview}
                  onClick={() => setShowDocs(true)}
                >
                  Open document center
                </button>

                <button
                  type="button"
                  className={s.resetButton}
                  disabled={loading}
                  onClick={handleReset}
                >
                  Reset form
                </button>
              </div>

              {!canPreview && (
                <p className={s.summaryHint}>
                  Add an invoice number and recipient name to
                  enable previews and documents.
                </p>
              )}

              <p className={s.summaryHint}>
                Apply document edits in the Document Center,
                then save this invoice to retain them.
              </p>
            </div>
          </aside>
        </div>
      </form>

      {showPreview && (
        <InternationalInvoicePreview
          invoiceData={invoiceData}
          onClose={() => setShowPreview(false)}
        />
      )}

      {showDocs && (
        <ExportDocumentsModal
          invoiceData={invoiceData}
          onClose={() => setShowDocs(false)}
          onSave={(supportingDocuments) =>
            updateInvoiceData({ supportingDocuments })
          }
        />
      )}
    </div>
  );
};

export default InternationalInvoiceForm;