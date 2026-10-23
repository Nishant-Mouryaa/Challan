import React, { useState, useEffect } from 'react';
import styles from '../styles/form.module.css';
import SenderSelector from './SenderSelector';
import ClientSelector from './ClientSelector';
import ItemsTable from './ItemsTable';
import ChallanPreview from './ChallanPreview';
import { useChallan } from '../hooks/useChallan';

const ChallanForm = ({ initialData = null }) => {
  const {
    challanData,
    updateChallanData,
    updateSenderDetails,
    updateReceiverDetails,
    addItem,
    removeItem,
    updateItem,
    saveChallan,
    resetForm,
    getAmountInWords,
    getTotalAmount,
  } = useChallan(initialData);

  const [showPreview, setShowPreview] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSenderSelect = (sender) => {
    console.log('Sender selected:', sender);
    if (sender) {
      updateSenderDetails({
        company: sender.company || '',
        careOf: sender.careOf || '',
        address: sender.address || '',
        area: sender.area || '',
        city: sender.city || '',
        pin: sender.pin || '',
        state: sender.state || '',
        contactNo: sender.contactNo || '',
        email: sender.email || '',
      });
    }
  };

  const handleClientSelect = (client) => {
    console.log('Client selected:', client);
    if (client) {
      updateReceiverDetails({
        clientId: client.id,
        name: client.name,
        address: client.address,
        city: client.city,
        state: client.state,
        pin: client.pin,
        contactNo: client.contactNo,
        email: client.email,
      });
    }
  };

  const handleReceiverInputChange = (field, value) => {
    updateReceiverDetails({
      [field]: value,
    });
  };

  const handleItemChange = (index, updates) => {
    updateItem(index, updates);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await saveChallan();
      setSuccessMessage(
        initialData ? 'Challan updated successfully!' : 'Challan saved successfully!'
      );
      if (!initialData) {
        setTimeout(() => {
          setSuccessMessage('');
          resetForm();
        }, 3000);
      }
    } catch (error) {
      console.error('Error saving challan:', error);
      setSuccessMessage(error.message || 'Error saving challan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  console.log('Current challan data:', challanData); // Debug log

  return (
    <div className={styles.formContainer}>
      <div className={styles.formHeader}>
        <h1>Create Delivery Challan</h1>
        <p>Fill in the details below to generate a delivery challan</p>
      </div>

      {successMessage && (
        <div className={successMessage.includes('Error') ? styles.error : styles.success}>
          {successMessage}
        </div>
      )}

      {/* Challan Details */}
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Challan Details</legend>
        <div className={styles.formRow}>
          <div className={styles.formControl}>
            <label>Challan Number</label>
            <input
              type="text"
              value={challanData.challanNo}
              className={styles.formControl}
              disabled
              readOnly
            />
          </div>
          <div className={styles.formControl}>
            <label>Date</label>
            <input
              type="date"
              value={challanData.date}
              onChange={(e) => updateChallanData({ date: e.target.value })}
              className={styles.formControl}
            />
          </div>
        </div>
      </fieldset>

      {/* Sender Details - Now Editable and Selectable */}
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Sender Details</legend>
        <SenderSelector
          senderDetails={challanData.senderDetails}
          onSenderSelect={handleSenderSelect}
          onSenderDetailsChange={updateSenderDetails}
        />
      </fieldset>

      {/* Receiver Details */}
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Receiver Details</legend>
        <ClientSelector
          onSelect={handleClientSelect}
          selectedClientId={challanData.receiverDetails.clientId}
        />

        <div className={styles.formRow}>
          <div className={styles.formControl}>
            <label>Receiver Name *</label>
            <input
              type="text"
              value={challanData.receiverDetails.name}
              onChange={(e) => handleReceiverInputChange('name', e.target.value)}
              placeholder="Full Name"
              className={styles.formControl}
              required
            />
          </div>
          <div className={styles.formControl}>
            <label>Contact Number</label>
            <input
              type="tel"
              value={challanData.receiverDetails.contactNo}
              onChange={(e) => handleReceiverInputChange('contactNo', e.target.value)}
              placeholder="10-digit mobile number"
              className={styles.formControl}
            />
          </div>
        </div>

        <div className={styles.formControl}>
          <label>Address *</label>
          <textarea
            value={challanData.receiverDetails.address}
            onChange={(e) => handleReceiverInputChange('address', e.target.value)}
            placeholder="Complete Address"
            className={styles.formControl}
            required
            style={{ minHeight: '80px' }}
          />
        </div>

        <div className={styles.formRow}>
          <div className={styles.formControl}>
            <label>City</label>
            <input
              type="text"
              value={challanData.receiverDetails.city}
              onChange={(e) => handleReceiverInputChange('city', e.target.value)}
              placeholder="City"
              className={styles.formControl}
            />
          </div>
          <div className={styles.formControl}>
            <label>State</label>
            <input
              type="text"
              value={challanData.receiverDetails.state}
              onChange={(e) => handleReceiverInputChange('state', e.target.value)}
              placeholder="State"
              className={styles.formControl}
            />
          </div>
          <div className={styles.formControl}>
            <label>PIN Code *</label>
            <input
              type="text"
              value={challanData.receiverDetails.pin}
              onChange={(e) => handleReceiverInputChange('pin', e.target.value)}
              placeholder="6-digit PIN"
              className={styles.formControl}
              required
            />
          </div>
        </div>

        <div className={styles.formControl}>
          <label>Email</label>
          <input
            type="email"
            value={challanData.receiverDetails.email}
            onChange={(e) => handleReceiverInputChange('email', e.target.value)}
            placeholder="Email Address"
            className={styles.formControl}
          />
        </div>
      </fieldset>

      {/* Items */}
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Items</legend>
        <ItemsTable
          items={challanData.items}
          onItemChange={handleItemChange}
          onAddItem={addItem}
          onRemoveItem={removeItem}
        />
      </fieldset>

      {/* Total Section */}
      <div className={styles.totalSection}>
        <div className={styles.totalLabel}>Total Value</div>
        <div className={styles.totalAmount}>
          ₹{getTotalAmount().toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </div>
        <div className={styles.amountInWords}>
          ({getAmountInWords()} ONLY)
        </div>
        <div className={styles.disclaimerText}>
          This value for custom / Courier Purpose Only
        </div>
      </div>

      {/* Action Buttons */}
      <div className={styles.actionButtons}>
        <button
          type="button"
          onClick={() => setShowPreview(true)}
          className="btn btn-primary"
          disabled={loading || !challanData.receiverDetails.name}
          title={!challanData.receiverDetails.name ? 'Please fill receiver name' : ''}
        >
          Preview & Print
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="btn btn-success"
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save Challan'}
        </button>
        <button
          type="button"
          onClick={resetForm}
          className="btn btn-secondary"
          disabled={loading}
        >
          Reset
        </button>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <ChallanPreview
          challanData={challanData}
          senderData={challanData.senderDetails}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
};

export default ChallanForm;