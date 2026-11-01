import React from 'react';

import { DOC_LABELS, MODE_LIST } from '../data/invoiceModes';
import s from '../styles/invoiceWorkspace.module.css';

const InvoiceModeSelector = ({
  value,
  onChange,
  disabled = false,
}) => {
  const mode =
    MODE_LIST.find((item) => item.id === value) ||
    MODE_LIST[0];

  return (
    <section
      className={s.modeCard}
      aria-labelledby="invoice-mode-heading"
    >
      <div className={s.modeHeading}>
        <div>
          <div className={s.eyebrow}>START HERE</div>

          <h2 id="invoice-mode-heading">
            What are you shipping?
          </h2>

          <p>
            Choose a shipment type to tailor product fields and
            document recommendations.
          </p>
        </div>

        <span className={s.badge}>Shipment type</span>
      </div>

      <div
        className={s.modeGrid}
        role="group"
        aria-labelledby="invoice-mode-heading"
      >
        {MODE_LIST.map((item) => {
          const selected = mode?.id === item.id;

          return (
            <button
              key={item.id}
              type="button"
              className={`${s.modeOption} ${
                selected ? s.modeOptionActive : ''
              }`}
              onClick={() => onChange(item.id)}
              aria-pressed={selected}
              disabled={disabled}
            >
              <span
                className={s.modeIndicator}
                aria-hidden="true"
              >
                {selected ? '✓' : ''}
              </span>

              <span>
                <strong>{item.label}</strong>
                <span>{item.tagline}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className={s.recommendedDocs} aria-live="polite">
        <span className={s.recommendedLabel}>
          Recommended documents
        </span>

        <div className={s.chipList}>
          {(mode?.docs || []).map((documentId) => (
            <span key={documentId} className={s.chip}>
              {DOC_LABELS[documentId] || documentId}
            </span>
          ))}

          {!mode?.docs?.length && (
            <span className={s.mutedText}>
              No additional recommendations for this mode.
            </span>
          )}
        </div>
      </div>
    </section>
  );
};

export default InvoiceModeSelector;