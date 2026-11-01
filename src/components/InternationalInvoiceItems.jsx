import React from 'react';

import s from '../styles/invoiceWorkspace.module.css';

import { getMode } from '../data/invoiceModes';
import HsnCodeLookup from './HsnCodeLookup';

const numberValue = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatAmount = (quantity, rate) =>
  (
    numberValue(quantity) * numberValue(rate)
  ).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const InternationalInvoiceItems = ({
  items = [],
  onItemChange,
  onAddItem,
  onRemoveItem,
  modeId,
  currencyCode,
  disabled = false,
}) => {
  const mode = getMode(modeId);
  const itemFields = mode?.itemFields || [];

  return (
    <div className={s.items}>
      <div className={s.itemsToolbar}>
        <div>
          <strong>
            {items.length} line item{items.length === 1 ? '' : 's'}
          </strong>

          <p>
            Items with the same box number are grouped on the invoice.
          </p>
        </div>

        <button
          type="button"
          className={`${s.button} ${s.secondaryButton}`}
          onClick={onAddItem}
          disabled={disabled}
        >
          + Add item
        </button>
      </div>

      <div className={s.itemCards}>
        {items.map((item, index) => {
          const prefix = `invoice-item-${index}`;

          const change = (key, value) =>
            onItemChange(index, { [key]: value });

          return (
            <article
              key={item.id ?? index}
              className={s.itemCard}
              aria-labelledby={`${prefix}-heading`}
            >
              <header className={s.itemHeader}>
                <div className={s.itemIdentity}>
                  <span className={s.itemNumber}>
                    {String(index + 1).padStart(2, '0')}
                  </span>

                  <div>
                    <h3 id={`${prefix}-heading`}>
                      Item {index + 1}
                    </h3>

                    <span>
                      {item.hsnCode
                        ? `HSN ${item.hsnCode}`
                        : 'Add product and pricing details'}
                    </span>
                  </div>
                </div>

                <div className={s.itemHeaderActions}>
                  <div className={s.itemAmount}>
                    <span>Amount</span>

                    <strong>
                      {currencyCode || ''}{' '}
                      {formatAmount(
                        item.quantity,
                        item.ratePerPiece
                      )}
                    </strong>
                  </div>

                  <button
                    type="button"
                    className={s.removeButton}
                    disabled={disabled || items.length <= 1}
                    onClick={() => onRemoveItem(index)}
                    aria-label={`Remove item ${index + 1}`}
                    title={
                      items.length <= 1
                        ? 'Keep at least one line item'
                        : `Remove item ${index + 1}`
                    }
                  >
                    Remove
                  </button>
                </div>
              </header>

              <div className={s.itemBody}>
                <div className={s.itemMainGrid}>
                  <div className={s.field}>
                    <label htmlFor={`${prefix}-description`}>
                      Description of goods
                    </label>

                    <textarea
                      id={`${prefix}-description`}
                      value={item.description || ''}
                      onChange={(event) =>
                        change('description', event.target.value)
                      }
                      placeholder="Product name and full description"
                      rows={3}
                      disabled={disabled}
                    />
                  </div>

                  <div className={s.hsnPanel}>
                    <HsnCodeLookup
                      itemIndex={index}
                      disabled={disabled}
                      onSelect={(match) =>
                        onItemChange(index, {
                          hsnCode: match.code,
                          description: match.description,
                        })
                      }
                    />

                    <div className={s.field}>
                      <label htmlFor={`${prefix}-hsn`}>
                        HSN code
                      </label>

                      <input
                        id={`${prefix}-hsn`}
                        type="text"
                        value={item.hsnCode || ''}
                        onChange={(event) =>
                          change('hsnCode', event.target.value)
                        }
                        placeholder="Enter or search above"
                        disabled={disabled}
                      />
                    </div>
                  </div>
                </div>

                <div className={s.gridThree}>
                  <div className={s.field}>
                    <label htmlFor={`${prefix}-quantity`}>
                      Quantity
                    </label>

                    <input
                      id={`${prefix}-quantity`}
                      type="number"
                      min="1"
                      step="1"
                      required
                      value={item.quantity ?? ''}
                      onChange={(event) =>
                        change(
                          'quantity',
                          event.target.value === ''
                            ? ''
                            : Number(event.target.value)
                        )
                      }
                      disabled={disabled}
                    />
                  </div>

                  <div className={s.field}>
                    <label htmlFor={`${prefix}-rate`}>
                      Rate per piece
                      {currencyCode ? ` (${currencyCode})` : ''}
                    </label>

                    <input
                      id={`${prefix}-rate`}
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={item.ratePerPiece ?? ''}
                      onChange={(event) =>
                        change(
                          'ratePerPiece',
                          event.target.value === ''
                            ? ''
                            : Number(event.target.value)
                        )
                      }
                      placeholder="0.00"
                      disabled={disabled}
                    />
                  </div>

                  <div className={s.field}>
                    <label htmlFor={`${prefix}-box`}>
                      Box number
                    </label>

                    <input
                      id={`${prefix}-box`}
                      type="text"
                      value={item.boxNo || ''}
                      onChange={(event) =>
                        change('boxNo', event.target.value)
                      }
                      placeholder="e.g. 1"
                      disabled={disabled}
                    />
                  </div>
                </div>

                {itemFields.length > 0 && (
                  <div className={s.itemSubsection}>
                    <h4>Additional product details</h4>

                    <div className={s.gridTwo}>
                      {itemFields.map((field) => (
                        <div
                          key={field.k}
                          className={`${s.field} ${
                            field.k === 'strength'
                              ? s.fullWidth
                              : ''
                          }`}
                        >
                          <label
                            htmlFor={`${prefix}-${field.k}`}
                          >
                            {field.label}
                          </label>

                          <input
                            id={`${prefix}-${field.k}`}
                            type="text"
                            value={item[field.k] || ''}
                            onChange={(event) =>
                              change(field.k, event.target.value)
                            }
                            placeholder={field.placeholder}
                            disabled={disabled}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <details className={s.itemDetails}>
                  <summary>
                    Weight information & return reference
                  </summary>

                  <div className={s.gridThree}>
                    <div className={s.field}>
                      <label htmlFor={`${prefix}-return`}>
                        Return order reference
                      </label>

                      <input
                        id={`${prefix}-return`}
                        type="text"
                        value={item.returnOrder || ''}
                        onChange={(event) =>
                          change('returnOrder', event.target.value)
                        }
                        placeholder="Return order number"
                        disabled={disabled}
                      />
                    </div>

                    <div className={s.field}>
                      <label htmlFor={`${prefix}-weight`}>
                        Actual weight (KG)
                      </label>

                      <input
                        id={`${prefix}-weight`}
                        type="text"
                        value={item.actualWeight || ''}
                        onChange={(event) =>
                          change('actualWeight', event.target.value)
                        }
                        placeholder="e.g. 2.50"
                        disabled={disabled}
                      />
                    </div>

                    <div className={s.field}>
                      <label htmlFor={`${prefix}-volume`}>
                        Dimensions / volumetric information
                      </label>

                      <input
                        id={`${prefix}-volume`}
                        type="text"
                        value={item.volWeight || ''}
                        onChange={(event) =>
                          change('volWeight', event.target.value)
                        }
                        placeholder="53 × 44 × 19"
                        disabled={disabled}
                      />
                    </div>
                  </div>
                </details>
              </div>
            </article>
          );
        })}
      </div>

      <button
        type="button"
        className={s.addItemButton}
        onClick={onAddItem}
        disabled={disabled}
      >
        + Add another line item
      </button>
    </div>
  );
};

export default InternationalInvoiceItems;