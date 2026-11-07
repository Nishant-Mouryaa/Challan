import React, { useState } from 'react';
import Link from 'next/link';
import styles from '../styles/form.module.css';
import workspace from '../styles/challanWorkspace.module.css';
import SenderSelector from './SenderSelector';
import ClientSelector from './ClientSelector';
import ItemsTable from './ItemsTable';
import ChallanPreview from './ChallanPreview';
import ChallanAddressScanner from './ChallanAddressScanner';
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
  const [hasScannedDraft, setHasScannedDraft] = useState(false);
  const [savedClients, setSavedClients] = useState([]);

  const handleSenderSelect = (sender) => {
    if (sender) {
      updateChallanData({ senderId: sender.id });
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

const handleAddressDraft = (recipient) => {
  const current = challanData.receiverDetails;
  const hasTypedData = ['name', 'address', 'city', 'state', 'pin', 'contactNo', 'email']
    .some((key) => String(current[key] || '').trim());
  if (hasTypedData && !window.confirm('Replace the receiver details already on this form with the scanned address?')) {
    return false;
  }

  const address = [
    recipient.address,
    recipient.contactPerson ? `Attn: ${recipient.contactPerson}` : '',
  ].filter(Boolean).join('\n');

  updateReceiverDetails({
    clientId: null,
    name: recipient.name || '',
    address,
    city: recipient.city || '',
    state: recipient.state || '',
    pin: recipient.pin || '',
    contactNo: recipient.contactNo || '',
    email: recipient.email || '',
  });
  setHasScannedDraft(true);
  document.getElementById('receiver-details')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  return true;
};
  const handleMatchedClient = (client) => {
    handleClientSelect(client);
    setHasScannedDraft(true);
    document.getElementById('receiver-details')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
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
    } catch (error) {
      console.error('Error saving challan:', error);
      setSuccessMessage(error.message || 'Error saving challan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={workspace.page}>
      <header className={workspace.pageHeader}>
        <div>
          <div className={workspace.eyebrow}>DOMESTIC SHIPPING</div>
          <h1>
            {initialData ? 'Edit delivery challan' : 'Create delivery challan'}
          </h1>
          <p>Prepare, review, and manage delivery challan details.</p>
        </div>
        <Link
          href="/view-challans"
          className={`${workspace.button} ${workspace.secondaryButton}`}
        >
          View all challans
        </Link>
      </header>

      {successMessage && (
        <div
          className={
            successMessage.includes('Error')
              ? workspace.errorAlert
              : workspace.successAlert
          }
          role={successMessage.includes('Error') ? 'alert' : 'status'}
        >
          {successMessage}
        </div>
      )}

      <div className={workspace.formWorkspace}>
        <div className={workspace.formColumn}>
          <nav className={workspace.sectionNav} aria-label="Challan sections">
            {[
              ['challan-details', 'Details'],
              ['sender-details', 'Sender'],
              ['receiver-details', 'Recipient'],
              ['challan-items', 'Items'],
            ].map(([id, label], index) => (
              <a key={id} href={`#${id}`}>
                <span>{index + 1}</span>
                {label}
              </a>
            ))}
          </nav>

          <div className={workspace.formSections}>
      {/* Challan Details */}
      <fieldset id="challan-details" className={`${styles.fieldset} ${workspace.sectionCard}`}>
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
      <fieldset id="sender-details" className={`${styles.fieldset} ${workspace.sectionCard}`}>
        <legend className={styles.legend}>Sender Details</legend>
        <SenderSelector
          senderId={challanData.senderId}
          senderDetails={challanData.senderDetails}
          onSenderSelect={handleSenderSelect}
          onSenderDetailsChange={updateSenderDetails}
        />
      </fieldset>

      {/* Receiver Details */}
      <fieldset id="receiver-details" className={`${styles.fieldset} ${workspace.sectionCard}`}>
        <legend className={styles.legend}>Receiver Details</legend>
        {!initialData && (
          <ChallanAddressScanner
            clients={savedClients}
            onDraftReady={handleAddressDraft}
            onClientMatch={handleMatchedClient}
          />
        )}
        {hasScannedDraft && (
          <p className={workspace.addressReviewNote} role="status">
            Scanned challan draft — review and edit the recipient fields below.
            This draft is not saved until you choose Save Challan.
          </p>
        )}
        <ClientSelector
          onSelect={handleClientSelect}
          selectedClientId={challanData.receiverDetails.clientId}
          onClientsLoaded={setSavedClients}
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
      <fieldset id="challan-items" className={`${styles.fieldset} ${workspace.sectionCard}`}>
        <legend className={styles.legend}>Items</legend>
        <ItemsTable
          items={challanData.items}
          onItemChange={handleItemChange}
          onAddItem={addItem}
          onRemoveItem={removeItem}
        />
      </fieldset>

      {/* Total Section */}
      <div className={`${styles.totalSection} ${workspace.totalSection}`}>
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
      <div className={`${styles.actionButtons} ${workspace.actionButtons}`}>
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
          </div>
        </div>

        <aside className={workspace.summary} aria-label="Challan summary">
          <div className={workspace.summaryHeader}>
            <span className={workspace.summaryIcon} aria-hidden="true">
              DC
            </span>
            <div>
              <strong>Challan summary</strong>
              <span>Live document overview</span>
            </div>
          </div>

          <dl className={workspace.summaryDetails}>
            <div>
              <dt>Challan number</dt>
              <dd>{challanData.challanNo || '—'}</dd>
            </div>
            <div>
              <dt>Date</dt>
              <dd>{challanData.date || '—'}</dd>
            </div>
            <div>
              <dt>Recipient</dt>
              <dd>{challanData.receiverDetails.name || 'Not selected'}</dd>
            </div>
            <div>
              <dt>Line items</dt>
              <dd>{challanData.items.length}</dd>
            </div>
          </dl>

          <div className={workspace.summaryTotal}>
            <span>Total value</span>
            <strong>
              ₹{getTotalAmount().toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </strong>
          </div>
          <p className={workspace.summaryNote}>
            This value is for customs / courier purposes only.
          </p>
        </aside>
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