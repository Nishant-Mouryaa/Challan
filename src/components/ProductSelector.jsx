import React, { useState, useEffect } from 'react';
import styles from '../styles/form.module.css';
import { authenticatedFetch } from '../lib/supabaseClient';

const ProductSelector = ({ onSelect }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await authenticatedFetch('/api/products');
      if (!response.ok) throw new Error(`Failed to load products (${response.status})`);

      const data = await response.json();
      const productList = Array.isArray(data) ? data : data.products;
      if (!Array.isArray(productList)) {
        throw new Error('Product API returned an invalid product list');
      }

      setProducts(productList);
    } catch (error) {
      console.error('Error fetching products:', error);
      setLoadError('Unable to load products. Please try again later.');
    } finally {
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
  if (loadError) return <div className={styles.error} role="alert">{loadError}</div>;

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