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
import { authenticatedFetch } from '../lib/supabaseClient';

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
  const [clientRefreshKey, setClientRefreshKey] = useState(0);
  const [savingClient, setSavingClient] = useState(false);
  const [clientNotice, setClientNotice] = useState({ type: '', text: '' });

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
        contactPerson: client.contactPerson || '',
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
    const hasTypedData = [
      'name', 'address', 'city', 'state', 'pin', 'contactNo', 'contactPerson', 'email',
    ].some((key) => String(current[key] || '').trim());
    if (
      hasTypedData &&
      !window.confirm('Replace the receiver details already on this form with the scanned address?')
    ) {
      return false;
    }

    updateReceiverDetails({
      clientId: null,
      name: recipient.name || '',
      contactPerson: recipient.contactPerson || '',
      address: recipient.address || '',
      city: recipient.city || '',
      state: recipient.state || '',
      pin: recipient.pin || '',
      contactNo: recipient.contactNo || '',
      email: recipient.email || '',
    });
    setHasScannedDraft(true);
    setClientNotice({ type: '', text: '' });
    document.getElementById('receiver-details')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
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

  const normalizeForCompare = (value) =>
    String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

  const handleSaveClient = async () => {
    const receiver = challanData.receiverDetails;
    const payload = {
      name: (receiver.name || '').trim(),
      address: (receiver.address || '').trim(),
      city: (receiver.city || '').trim(),
      state: (receiver.state || '').trim(),
      pin: (receiver.pin || '').trim(),
      contactNo: (receiver.contactNo || '').trim(),
      email: (receiver.email || '').trim(),
      contactPerson: (receiver.contactPerson || '').trim(),
    };

    if (!payload.name || !payload.address) {
      setClientNotice({ type: 'error', text: 'Enter at least the receiver name and address first.' });
      return;
    }
    if (payload.pin && !/^[1-9]\d{5}$/.test(payload.pin)) {
      setClientNotice({ type: 'error', text: 'PIN code must be 6 digits before saving this client.' });
      return;
    }

    const duplicate = savedClients.find((client) => {
      if (normalizeForCompare(client.name) !== normalizeForCompare(payload.name)) return false;
      if (client.pin && payload.pin) return client.pin === payload.pin;
      return normalizeForCompare(client.address) === normalizeForCompare(payload.address);
    });
    if (duplicate) {
      setClientNotice({
        type: 'error',
        text: `Already saved as "${duplicate.name}${duplicate.city ? ` - ${duplicate.city}` : ''}". Pick it from the list above.`,
      });
      return;
    }

    setSavingClient(true);
    setClientNotice({ type: '', text: '' });
    try {
      const response = await authenticatedFetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Unable to save this client. Please try again.');
      }
      setSavedClients((previous) => [...previous, data]);
      setClientRefreshKey((key) => key + 1);
      updateReceiverDetails({ clientId: data.id });
      setClientNotice({ type: 'success', text: 'Saved. Next time this recipient will be matched automatically.' });
    } catch (saveError) {
      console.error('Error saving client:', saveError);
      setClientNotice({ type: 'error', text: saveError.message || 'Unable to save this client.' });
    } finally {
      setSavingClient(false);
    }
  };

  const handleItemChange = (index, updates) => {
    updateItem(index, updates);
  };

  const getReceiverProblem = () => {
    const receiver = challanData.receiverDetails;
    if (!String(receiver.name || '').trim()) return 'Receiver name is required.';
    if (!String(receiver.address || '').trim()) return 'Receiver address is required.';
    if (!/^[1-9]\d{5}$/.test(String(receiver.pin || '').trim())) {
      return 'Enter a valid 6-digit PIN code for the receiver.';
    }
    const phoneDigits = String(receiver.contactNo || '').replace(/\D/g, '');
    if (phoneDigits && phoneDigits.length < 10) {
      return 'The receiver contact number looks incomplete.';
    }
    return '';
  };

  const handleSave = async () => {
    // The "required" attributes do nothing here because the fields are not inside a <form>,
    // so check the receiver details before saving.
    const problem = getReceiverProblem();
    if (problem) {
      setSuccessMessage(`Error: ${problem}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

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
          refreshKey={clientRefreshKey}
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
          <label>Contact Person</label>
          <input
            type="text"
            value={challanData.receiverDetails.contactPerson || ''}
            onChange={(e) => handleReceiverInputChange('contactPerson', e.target.value)}
            placeholder="Person to ask for at delivery (optional)"
            className={styles.formControl}
          />
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
              inputMode="numeric"
              maxLength={6}
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

        {!challanData.receiverDetails.clientId && (
          <div className={workspace.saveClientBox}>
            <button
              type="button"
              className={`${workspace.button} ${workspace.secondaryButton}`}
              onClick={handleSaveClient}
              disabled={
                savingClient ||
                !challanData.receiverDetails.name ||
                !challanData.receiverDetails.address
              }
            >
              {savingClient ? 'Saving client…' : 'Save as client for next time'}
            </button>
          </div>
        )}
        {clientNotice.text && (
          <p
            className={
              clientNotice.type === 'error'
                ? workspace.addressScanError
                : workspace.addressScanSuccess
            }
            role={clientNotice.type === 'error' ? 'alert' : 'status'}
          >
            {clientNotice.text}
          </p>
        )}
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