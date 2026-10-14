import React from 'react';
import styles from '../styles/form.module.css';
import ProductSelector from './ProductSelector';

const ItemsTable = ({ items, onItemChange, onAddItem, onRemoveItem }) => {
  const handleProductSelect = (product) => {
    if (items.length > 0) {
      const lastIndex = items.length - 1;
      onItemChange(lastIndex, {
        description: product.code + ' - ' + product.name,
        price: product.price,
      });
    }
  };

  const calculateTotal = (qty, price) => {
    return (qty * price).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div>
      <h3>Products</h3>
      <ProductSelector onSelect={handleProductSelect} />

      <div className={styles.itemsTableWrapper}>
        <table className={styles.itemsTable}>
          <thead>
            <tr>
              <th style={{ width: '5%' }}>S.No</th>
              <th style={{ width: '8%' }}>Qty</th>
              <th style={{ width: '42%' }}>Description of Goods</th>
              <th style={{ width: '18%' }}>Per Pcs (₹)</th>
              <th style={{ width: '18%' }}>Total Value (₹)</th>
              <th style={{ width: '9%' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index}>
                <td>{index + 1}</td>
                <td>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) =>
                      onItemChange(index, {
                        quantity: parseInt(e.target.value) || 0,
                      })
                    }
                    className={styles.itemInput}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) =>
                      onItemChange(index, { description: e.target.value })
                    }
                    placeholder="e.g., EW 112 p G4-A1"
                    className={styles.itemInput}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.price}
                    onChange={(e) =>
                      onItemChange(index, { price: parseFloat(e.target.value) || 0 })
                    }
                    className={styles.itemInput}
                  />
                </td>
                <td style={{ textAlign: 'right' }}>
                  ₹{calculateTotal(item.quantity, item.price)}
                </td>
                <td>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onRemoveItem(index)}
                      className="btn btn-danger"
                      style={{ width: '100%' }}
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

      <button type="button" onClick={onAddItem} className="btn btn-secondary" style={{ marginTop: '1rem' }}>
        + Add Item
      </button>
    </div>
  );
};

export default ItemsTable;