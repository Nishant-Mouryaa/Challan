import React, { useState, useEffect } from 'react';
import styles from '../styles/form.module.css';
import { authenticatedFetch } from '../lib/supabaseClient';

const ClientSelector = ({ onSelect, selectedClientId }) => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCustom, setIsCustom] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await authenticatedFetch('/api/clients');
      if (!response.ok) throw new Error('Failed to fetch clients');
      const data = await response.json();
      setClients(data);
    } catch (error) {
      console.error('Error fetching clients:', error);
      setLoadError(error.message || 'Unable to load clients');
    } finally {
      setLoading(false);
    }
  };

  const handleClientChange = (e) => {
    const clientId = e.target.value;
    if (clientId === 'custom') {
      setIsCustom(true);
      onSelect(null);
    } else {
      setIsCustom(false);
      const selectedClient = clients.find((c) => c.id === parseInt(clientId));
      onSelect(selectedClient);
    }
  };

  if (loading) return <div className={styles.loading}>Loading clients...</div>;
  if (loadError) return <div className={styles.error} role="alert">{loadError}</div>;

  return (
    <div className={styles.formControl}>
      <label>Select Receiver (or Add Custom)</label>
      <select onChange={handleClientChange} value={selectedClientId || ''} className={styles.formControl}>
        <option value="">-- Select a Client --</option>
        {clients.map((client) => (
          <option key={client.id} value={client.id}>
            {client.name} - {client.city}
          </option>
        ))}
        <option value="custom">+ Add Custom Receiver</option>
      </select>

      {isCustom && (
        <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#666' }}>
          Fill in the receiver details manually below
        </p>
      )}
    </div>
  );
};

export default ClientSelector;