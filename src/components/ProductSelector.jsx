import React, { useState, useEffect } from 'react';
import styles from '../styles/form.module.css';

const ProductSelector = ({ onSelect }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products');
      const data = await response.json();
      setProducts(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching products:', error);
      setLoading(false);
    }
  };

  const handleProductChange = (e) => {
    const product = products.find((p) => p.id === parseInt(e.target.value));
    if (product) {
      onSelect(product);
    }
  };

  if (loading) return <div className={styles.loading}>Loading products...</div>;

  return (
    <div className={styles.formControl}>
      <label>Quick Select Product</label>
      <select onChange={handleProductChange} defaultValue="" className={styles.formControl}>
        <option value="">-- Select a Product --</option>
        {products.map((product) => (
          <option key={product.id} value={product.id}>
            {product.code} - ₹{product.price.toLocaleString('en-IN')}
          </option>
        ))}
      </select>
    </div>
  );
};

export default ProductSelector;