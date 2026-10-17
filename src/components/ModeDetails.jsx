import React from 'react';
import styles from '../styles/form.module.css';
import m from '../styles/modes.module.css';
import { COURIER_PURPOSES } from '../data/invoiceModes';

const INCOTERMS = ['EXW', 'FCA', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DDP'];
const CONDITIONS = ['New', 'Used', 'Refurbished', 'For repair', 'Repaired'];
const BATTERIES = [
  'No battery',
  'Lithium-ion battery built into the device',
  'Lithium-ion battery packed with the equipment',
  'Spare lithium-ion battery in the box',
  'Other battery (describe in the document)',
];

const Field = ({ label, children }) => (
  <div className={styles.formControl}>
    <label>{label}</label>
    {children}
  </div>
);

/**
 * Extra fields that only make sense for the selected mode.
 * `details` = invoiceData.modeDetails, `onChange` = updateModeDetails.
 */
const ModeDetails = ({ mode, details = {}, onChange }) => {
  if (mode === 'courier') {
    return (
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Courier details</legend>
        <div className={styles.formRow}>
          <Field label="Purpose of shipment">
            <select
              value={details.purpose || 'standard'}
              onChange={(e) => onChange({ purpose: e.target.value })}
              className={styles.formControl}
            >
              {Object.entries(COURIER_PURPOSES).map(([k, p]) => (
                <option key={k} value={k}>
                  {p.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </fieldset>
    );
  }

  if (mode === 'commercial') {
    return (
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Commercial terms</legend>
        <div className={styles.formRow}>
          <Field label="Terms of delivery (Incoterms)">
            <select
              value={details.incoterms || ''}
              onChange={(e) => onChange({ incoterms: e.target.value })}
              className={styles.formControl}
            >
              <option value="">Select…</option>
              {INCOTERMS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Payment terms">
            <input
              type="text"
              value={details.paymentTerms || ''}
              onChange={(e) => onChange({ paymentTerms: e.target.value })}
              placeholder="e.g. 100% advance"
              className={styles.formControl}
            />
          </Field>
        </div>
        <div className={styles.formRow}>
          <Field label="IEC code">
            <input
              type="text"
              value={details.iec || ''}
              onChange={(e) => onChange({ iec: e.target.value })}
              className={styles.formControl}
            />
          </Field>
          <Field label="Bank AD code">
            <input
              type="text"
              value={details.adCode || ''}
              onChange={(e) => onChange({ adCode: e.target.value })}
              className={styles.formControl}
            />
          </Field>
        </div>
        <p className={m.hint} style={{ margin: 0 }}>
          These fill the Packing List, DHL SLI and Annexure-A automatically.
        </p>
      </fieldset>
    );
  }

  if (mode === 'medicine') {
    return (
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Medicine details</legend>
        <div className={styles.formRow}>
          <Field label="Patient name">
            <input
              type="text"
              value={details.patientName || ''}
              onChange={(e) => onChange({ patientName: e.target.value })}
              className={styles.formControl}
            />
          </Field>
          <Field label="Prescription reference">
            <input
              type="text"
              value={details.prescriptionRef || ''}
              onChange={(e) => onChange({ prescriptionRef: e.target.value })}
              placeholder="Doctor name, date or Rx no"
              className={styles.formControl}
            />
          </Field>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'normal' }}>
          <input
            type="checkbox"
            checked={!!details.controlled}
            onChange={(e) => onChange({ controlled: e.target.checked })}
          />
          Includes narcotic or psychotropic drugs
        </label>
        {details.controlled && (
          <div className={m.warn} role="alert">
            Controlled drugs need separate export permission. Check with DHL and
            the relevant authority before booking. The declaration will leave out
            the "no narcotic or psychotropic substance" statement.
          </div>
        )}
        <p className={m.hint} style={{ margin: '0.75rem 0 0' }}>
          Add strength, batch and expiry on each item below. They print under the
          description on the invoice. This mode is for personal-use shipments.
        </p>
      </fieldset>
    );
  }

  if (mode === 'electronics') {
    return (
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Electronics details</legend>
        <div className={styles.formRow}>
          <Field label="Condition">
            <select
              value={details.condition || 'New'}
              onChange={(e) => onChange({ condition: e.target.value })}
              className={styles.formControl}
            >
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Battery">
            <select
              value={details.battery || 'No battery'}
              onChange={(e) => onChange({ battery: e.target.value })}
              className={styles.formControl}
            >
              {BATTERIES.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <p className={m.hint} style={{ margin: 0 }}>
          Add model and serial number on each item below. They print under the
          description on the invoice.
        </p>
      </fieldset>
    );
  }

  return null;
};

export default ModeDetails;