import React, { useState, useEffect } from 'react';
import styles from '../styles/form.module.css';

const SenderSelector = ({ 
  senderDetails, 
  onSenderSelect, 
  onSenderDetailsChange 
}) => {
  const [senders, setSenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSenderId, setSelectedSenderId] = useState(1);

  useEffect(() => {
    fetchSenders();
  }, []);

  const fetchSenders = async () => {
    try {
      const response = await fetch('/api/senders');
      if (!response.ok) throw new Error('Failed to fetch senders');
      const data = await response.json();
      console.log('Fetched senders:', data);
      setSenders(data);
      setLoading(false);
      
      // Load first sender by default
      if (data && data.length > 0) {
        setSelectedSenderId(data[0].id);
        onSenderSelect(data[0]);
      }
    } catch (error) {
      console.error('Error fetching senders:', error);
      setLoading(false);
    }
  };

  const handleSenderChange = (e) => {
    const senderId = parseInt(e.target.value);
    console.log('Selected sender ID:', senderId);
    
    if (!isNaN(senderId)) {
      setSelectedSenderId(senderId);
      const selectedSender = senders.find((s) => s.id === senderId);
      console.log('Selected sender:', selectedSender);
      
      if (selectedSender) {
        onSenderSelect(selectedSender);
      }
    }
  };

  const handleFieldChange = (field, value) => {
    console.log(`Updating sender field: ${field} = ${value}`);
    onSenderDetailsChange({
      [field]: value,
    });
  };

  if (loading) {
    return <div className={styles.loading}>Loading senders...</div>;
  }

  if (!senders || senders.length === 0) {
    return <div className={styles.error}>No senders available</div>;
  }

  // Check if current sender is Bruker
  const isBruker = senderDetails.company?.toUpperCase().includes('BRUKER');
  const currentSender = senders.find(s => s.id === selectedSenderId);

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

          {/* Show Care Of only for Sennheiser, NOT for Bruker */}
          {!isBruker && (
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
          )}

          {/* If Bruker selected, show a hint instead */}
          {isBruker && (
            <div className={styles.formControl}>
              <label style={{ color: '#666', fontStyle: 'italic' }}>
                ℹ️ Care Of field is not needed for {currentSender?.company}
              </label>
            </div>
          )}
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
            <label>Area / Region {isBruker && '*'}</label>
            <input
              type="text"
              value={senderDetails.area || ''}
              onChange={(e) => handleFieldChange('area', e.target.value)}
              placeholder={isBruker ? "e.g., ANDHERI (E)" : "e.g., ANDHERI (E) (Optional)"}
              className={styles.formControl}
              required={isBruker}
            />
            {isBruker && (
              <small style={{ color: '#666', marginTop: '4px', display: 'block' }}>
                Area is required for {currentSender?.company}
              </small>
            )}
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

        {/* Info box for Bruker */}
        {isBruker && (
          <div style={{
            backgroundColor: '#e7f3ff',
            border: '1px solid #b3d9ff',
            padding: '1rem',
            borderRadius: '4px',
            marginTop: '1rem',
            fontSize: '0.9rem',
            color: '#004085'
          }}>
            <strong>📌 Note:</strong> For {currentSender?.company}, the "Care Of" field is hidden. 
            All sender details will be displayed directly on the challan.
          </div>
        )}
      </div>
    </div>
  );
};

export default SenderSelector;