import { DOC_LABELS, MODE_LIST } from '../data/invoiceModes';
import styles from '../styles/modes.module.css';

const InvoiceModeSelector = ({ value, onChange }) => {
  const mode = MODE_LIST.find((item) => item.id === value) || MODE_LIST[0];

  return (
    <section className={styles.wrap} aria-labelledby="invoice-mode-heading">
      <h2 className={styles.heading} id="invoice-mode-heading">
        Invoice mode
      </h2>
      <p className={styles.hint}>
        Choose the type of shipment to tailor the invoice and recommended documents.
      </p>
      <div className={styles.grid}>
        {MODE_LIST.map((item) => (
          <button
            className={`${styles.option} ${
              value === item.id ? styles.optionActive : ''
            }`}
            type="button"
            key={item.id}
            aria-pressed={value === item.id}
            onClick={() => onChange(item.id)}
          >
            <span className={styles.optionText}>
              <span className={styles.optionLabel}>{item.label}</span>
              <span className={styles.optionTagline}>{item.tagline}</span>
            </span>
          </button>
        ))}
      </div>
      <div className={styles.docs} aria-live="polite">
        <span>Recommended documents:</span>
        {mode.docs.map((documentId) => (
          <span className={styles.chip} key={documentId}>
            {DOC_LABELS[documentId] || documentId}
          </span>
        ))}
      </div>
    </section>
  );
};

export default InvoiceModeSelector;
