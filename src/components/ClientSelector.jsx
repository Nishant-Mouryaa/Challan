import React, { useState, useEffect } from 'react';
import styles from '../styles/form.module.css';
import { authenticatedFetch } from '../lib/supabaseClient';

const ClientSelector = ({
  onSelect,
  selectedClientId,
  onClientsLoaded = () => {},
  refreshKey = 0, // bump this number to reload the client list (e.g. after saving a new client)
}) => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCustom, setIsCustom] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const fetchClients = async () => {
      try {
        const response = await authenticatedFetch('/api/clients');
        if (!response.ok) throw new Error('Failed to fetch clients');
        const data = await response.json();
        if (cancelled) return;
        setClients(data);
        setLoadError('');
        onClientsLoaded(data);
      } catch (error) {
        console.error('Error fetching clients:', error);
        if (!cancelled) setLoadError(error.message || 'Unable to load clients');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchClients();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const handleClientChange = (e) => {
    const clientId = e.target.value;
    if (clientId === 'custom') {
      setIsCustom(true);
      onSelect(null);
    } else {
      setIsCustom(false);
      const selectedClient = clients.find((c) => String(c.id) === clientId);
      onSelect(selectedClient);
    }
  };

  if (loading) return <div className={styles.loading}>Loading clients...</div>;

  return (
    <div className={styles.formControl}>
      <label>Select Receiver (or Add Custom)</label>
      {loadError && (
        <div className={styles.error} role="alert">
          {loadError}. You can still fill in the receiver details manually below.
        </div>
      )}
      <select
        onChange={handleClientChange}
        value={selectedClientId == null ? '' : String(selectedClientId)}
        className={styles.formControl}
      >
        <option value="">-- Select a Client --</option>
        {clients.map((client) => (
          <option key={client.id} value={String(client.id)}>
            {client.name}
            {client.city ? ` - ${client.city}` : ''}
            {client.pin ? ` (${client.pin})` : ''}
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