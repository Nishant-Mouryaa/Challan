import React, { useState, useEffect } from 'react';
import styles from '../styles/form.module.css';

const ClientSelector = ({ onSelect, selectedClientId }) => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCustom, setIsCustom] = useState(false);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/clients');
      const data = await response.json();
      setClients(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching clients:', error);
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