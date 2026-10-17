import React from 'react';
import styles from '../styles/form.module.css';
import { PRODUCTS } from '../data/internationalInvoicePresets';
import { getMode } from '../data/invoiceModes';

const InternationalInvoiceItems = ({ items, onItemChange, onAddItem, onRemoveItem, modeId }) => {
  const mode = getMode(modeId);

  const calculateAmount = (qty, rate) =>
    (qty * rate).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <div>
      <h3>Invoice Items</h3>

      <div className={styles.itemsTableWrapper}>
        <table className={styles.itemsTable}>
          <thead>
            <tr>
              <th style={{ width: '5%' }}>S.No</th>
              <th style={{ width: '6%' }}>Box</th>
              <th style={{ width: '9%' }}>HSN Code</th>
              <th style={{ width: '27%' }}>Description of Goods</th>
              <th style={{ width: '7%' }}>Qty</th>
              <th style={{ width: '11%' }}>Rate/Piece</th>
              <th style={{ width: '11%' }}>Amount</th>
              <th style={{ width: '15%' }}>Weight Info</th>
              <th style={{ width: '9%' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index}>
                <td style={{ textAlign: 'center' }}>{index + 1}</td>

                {/* Box no: items with the same box are grouped on the invoice */}
                <td>
                  <input
                    type="text"
                    value={item.boxNo || ''}
                    onChange={(e) => onItemChange(index, { boxNo: e.target.value })}
                    placeholder="1"
                    className={styles.itemInput}
                  />
                </td>

                <td>
                  <input
                    type="text"
                    value={item.hsnCode || ''}
                    onChange={(e) => onItemChange(index, { hsnCode: e.target.value })}
                    placeholder="HSN"
                    className={styles.itemInput}
                  />
                </td>

                <td>
                  <select
                    value=""
                    onChange={(e) => {
                      const p = PRODUCTS.find((x) => x.id === e.target.value);
                      if (p) onItemChange(index, p.data);
                    }}
                    className={styles.itemInput}
                    style={{ marginBottom: '4px', fontSize: '0.85rem' }}
                  >
                    <option value="">Select product…</option>
                    {PRODUCTS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                  <textarea
                    value={item.description || ''}
                    onChange={(e) => onItemChange(index, { description: e.target.value })}
                    placeholder="Product description"
                    className={styles.itemInput}
                    style={{ minHeight: '40px', resize: 'vertical' }}
                  />

                  {/* Mode-specific fields (medicine: batch/expiry, electronics: model/serial) */}
                  {mode.itemFields.length > 0 && (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '4px',
                        marginTop: '4px',
                      }}
                    >
                      {mode.itemFields.map((f) => (
                        <input
                          key={f.k}
                          type="text"
                          value={item[f.k] || ''}
                          onChange={(e) => onItemChange(index, { [f.k]: e.target.value })}
                          placeholder={f.placeholder}
                          aria-label={f.label}
                          title={f.label}
                          className={styles.itemInput}
                          style={{
                            fontSize: '0.85rem',
                            gridColumn: f.k === 'strength' ? '1 / -1' : 'auto',
                          }}
                        />
                      ))}
                    </div>
                  )}
                </td>

                <td>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) =>
                      onItemChange(index, { quantity: parseInt(e.target.value) || 0 })
                    }
                    className={styles.itemInput}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.ratePerPiece}
                    onChange={(e) =>
                      onItemChange(index, { ratePerPiece: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="Rate"
                    className={styles.itemInput}
                  />
                </td>
                <td style={{ textAlign: 'right' }}>
                  {calculateAmount(item.quantity, item.ratePerPiece)}
                </td>
                <td>
                  <input
                    type="text"
                    value={item.returnOrder || ''}
                    onChange={(e) => onItemChange(index, { returnOrder: e.target.value })}
                    placeholder="Return order #"
                    className={styles.itemInput}
                    style={{ fontSize: '0.85rem', marginBottom: '4px' }}
                  />
                  <input
                    type="text"
                    value={item.actualWeight || ''}
                    onChange={(e) => onItemChange(index, { actualWeight: e.target.value })}
                    placeholder="Actual weight (kg)"
                    className={styles.itemInput}
                    style={{ fontSize: '0.85rem', marginBottom: '4px' }}
                  />
                  <input
                    type="text"
                    value={item.volWeight || ''}
                    onChange={(e) => onItemChange(index, { volWeight: e.target.value })}
                    placeholder="53 x 44 x 19"
                    className={styles.itemInput}
                    style={{ fontSize: '0.85rem' }}
                  />
                </td>
                <td>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onRemoveItem(index)}
                      className="btn btn-danger"
                      style={{ width: '100%', padding: '0.4rem' }}
                    >
                      Remove
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={onAddItem}
        className="btn btn-secondary"
        style={{ marginTop: '1rem' }}
      >
        + Add Item
      </button>
    </div>
  );
};

export default InternationalInvoiceItems;