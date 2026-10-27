import React, { useState, useEffect } from 'react';
import styles from '../styles/form.module.css';
import { authenticatedFetch } from '../lib/supabaseClient';

const SenderSelector = ({ 
  senderId,
  senderDetails, 
  onSenderSelect, 
  onSenderDetailsChange 
}) => {
  const [senders, setSenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSenderId, setSelectedSenderId] = useState('');
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    fetchSenders();
  }, []);

  const fetchSenders = async () => {
    try {
      const response = await authenticatedFetch('/api/senders');
      if (!response.ok) throw new Error('Failed to fetch senders');
      const data = await response.json();
      setSenders(data);

      if (data.length > 0) {
        const selectedSender =
          data.find((sender) => String(sender.id) === String(senderId)) ||
          data.find(
            (sender) =>
              sender.company &&
              sender.company.trim().toLowerCase() ===
                senderDetails.company?.trim().toLowerCase()
          ) ||
          data[0];
        setSelectedSenderId(String(selectedSender.id));

        const hasSavedSenderDetails = Object.values(senderDetails).some(
          (value) => typeof value === 'string' && value.trim()
        );
        if (!hasSavedSenderDetails) onSenderSelect(selectedSender);
      }
    } catch (error) {
      console.error('Error fetching senders:', error);
      setLoadError(error.message || 'Unable to load senders');
    } finally {
      setLoading(false);
    }
  };

  const handleSenderChange = (e) => {
    const nextSenderId = e.target.value;
    setSelectedSenderId(nextSenderId);
    const selectedSender = senders.find((sender) => String(sender.id) === nextSenderId);

    if (selectedSender) {
      onSenderSelect(selectedSender);
    }
  };

  const handleFieldChange = (field, value) => {
    onSenderDetailsChange({
      [field]: value,
    });
  };

  if (loading) {
    return <div className={styles.loading}>Loading senders...</div>;
  }

  if (loadError) return <div className={styles.error} role="alert">{loadError}</div>;

  if (!senders || senders.length === 0) {
    return <div className={styles.error}>No senders available</div>;
  }

  return (
    <div>
      <div className={styles.formControl}>
        <label><strong>Select Sender</strong></label>
        <select 
          value={selectedSenderId}
          onChange={handleSenderChange}
          className={styles.formControl}
        >
          {senders.map((sender) => (
            <option key={sender.id} value={sender.id}>
              {sender.company} - {sender.city}
            </option>
          ))}
        </select>
      </div>

      {/* Editable Sender Details */}
      <div style={{
        backgroundColor: '#f9f9f9',
        padding: '1.5rem',
        borderRadius: '4px',
        marginTop: '1rem',
        border: '1px solid #ddd'
      }}>
        <h4 style={{ marginBottom: '1rem', color: '#0066cc', marginTop: 0 }}>Sender Details (Editable)</h4>
        
        <div className={styles.formRow}>
          <div className={styles.formControl}>
            <label>Company Name *</label>
            <input
              type="text"
              value={senderDetails.company || ''}
              onChange={(e) => handleFieldChange('company', e.target.value)}
              placeholder="Company name"
              className={styles.formControl}
            />
          </div>

          <div className={styles.formControl}>
            <label>Care Of (Optional)</label>
            <input
              type="text"
              value={senderDetails.careOf || ''}
              onChange={(e) => handleFieldChange('careOf', e.target.value)}
              placeholder="Care Of name"
              className={styles.formControl}
            />
          </div>
        </div>

        <div className={styles.formControl}>
          <label>Address *</label>
          <textarea
            value={senderDetails.address || ''}
            onChange={(e) => handleFieldChange('address', e.target.value)}
            placeholder="Full address (use Enter for new lines)"
            className={styles.formControl}
            style={{ minHeight: '80px' }}
          />
        </div>

        <div className={styles.formRow}>
          <div className={styles.formControl}>
            <label>Area / Region (Optional)</label>
            <input
              type="text"
              value={senderDetails.area || ''}
              onChange={(e) => handleFieldChange('area', e.target.value)}
              placeholder="Area or region"
              className={styles.formControl}
            />
          </div>
          <div className={styles.formControl}>
            <label>City *</label>
            <input
              type="text"
              value={senderDetails.city || ''}
              onChange={(e) => handleFieldChange('city', e.target.value)}
              placeholder="City"
              className={styles.formControl}
            />
          </div>
        </div>

        <div className={styles.formRow}>
          <div className={styles.formControl}>
            <label>PIN Code *</label>
            <input
              type="text"
              value={senderDetails.pin || ''}
              onChange={(e) => handleFieldChange('pin', e.target.value)}
              placeholder="6-digit PIN"
              className={styles.formControl}
            />
          </div>
          <div className={styles.formControl}>
            <label>State *</label>
            <input
              type="text"
              value={senderDetails.state || ''}
              onChange={(e) => handleFieldChange('state', e.target.value)}
              placeholder="State"
              className={styles.formControl}
            />
          </div>
        </div>

        <div className={styles.formRow}>
          <div className={styles.formControl}>
            <label>Contact Number</label>
            <input
              type="tel"
              value={senderDetails.contactNo || ''}
              onChange={(e) => handleFieldChange('contactNo', e.target.value)}
              placeholder="Contact number"
              className={styles.formControl}
            />
          </div>
          <div className={styles.formControl}>
            <label>Email</label>
            <input
              type="email"
              value={senderDetails.email || ''}
              onChange={(e) => handleFieldChange('email', e.target.value)}
              placeholder="Email address"
              className={styles.formControl}
            />
          </div>
        </div>

      </div>
    </div>
  );
};

export default SenderSelector;