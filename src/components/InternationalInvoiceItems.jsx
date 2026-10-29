import React from 'react';
import styles from '../styles/form.module.css';
import { getMode } from '../data/invoiceModes';
import HsnCodeLookup from './HsnCodeLookup';

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
              <th className={styles.quantityColumn} style={{ width: '9%' }}>
                Quantity
              </th>
              <th className={styles.hsnColumn} style={{ width: '18%' }}>
                HSN Code
              </th>
              <th style={{ width: '6%' }}>Box</th>
              <th style={{ width: '20%' }}>Description of Goods</th>
              <th style={{ width: '11%' }}>Rate/Piece</th>
              <th style={{ width: '11%' }}>Amount</th>
              <th style={{ width: '12%' }}>Weight Info</th>
              <th style={{ width: '8%' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index}>
                <td style={{ textAlign: 'center' }}>{index + 1}</td>

                <td className={styles.quantityColumn}>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) =>
                      onItemChange(index, { quantity: parseInt(e.target.value) || 0 })
                    }
                    aria-label={`Quantity for item ${index + 1}`}
                    className={`${styles.itemInput} ${styles.quantityInput}`}
                  />
                </td>

                <td className={styles.hsnColumn}>
                  <HsnCodeLookup
                    itemIndex={index}
                    onSelect={(match) =>
                      onItemChange(index, {
                        hsnCode: match.code,
                        description: match.description,
                      })
                    }
                  />
                  <input
                    type="text"
                    value={item.hsnCode || ''}
                    onChange={(e) => onItemChange(index, { hsnCode: e.target.value })}
                    placeholder="HSN"
                    aria-label={`HSN code for item ${index + 1}`}
                    className={styles.itemInput}
                  />
                </td>

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