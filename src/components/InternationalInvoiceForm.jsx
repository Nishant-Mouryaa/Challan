import React, { useState } from 'react';
import styles from '../styles/form.module.css';
import InternationalInvoiceItems from './InternationalInvoiceItems';
import InternationalInvoicePreview from './InternationalInvoicePreview';
import PresetSelectors from './PresetSelectors';
import { useInternationalInvoice } from '../hooks/useInternationalInvoice';
import ExportDocumentsModal from './ExportDocumentsModal';

const InternationalInvoiceForm = () => {
  const {
    invoiceData,              // <- comes from the hook again
    updateInvoiceData,
    updateConsignorDetails,
    updateConsigneeDetails,
    addItem,
    removeItem,
    updateItem,
    saveInvoice,
    resetForm,
    getTotalAmount,
    getAmountInWords,
  } = useInternationalInvoice();

  const [showPreview, setShowPreview] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
const [showDocs, setShowDocs] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      await saveInvoice();
      setSuccessMessage('Invoice saved successfully!');
      setTimeout(() => {
        setSuccessMessage('');
        resetForm();
      }, 3000);
    } catch (error) {
      console.error('Error saving invoice:', error);
      setSuccessMessage('Error saving invoice. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.formContainer}>
      <div className={styles.formHeader}>
        <h1>Create International Invoice</h1>
        <p>Generate international export invoices</p>
      </div>

      {successMessage && (
        <div className={successMessage.includes('Error') ? styles.error : styles.success}>
          {successMessage}
        </div>
      )}
<PresetSelectors onPick={updateInvoiceData} />

      {/* Invoice Details */}
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Invoice Details</legend>
        <div className={styles.formRow}>
          <div className={styles.formControl}>
            <label>Invoice Number *</label>
            <input
              type="text"
              value={invoiceData.invoiceNo}
              onChange={(e) => updateInvoiceData({ invoiceNo: e.target.value })}
              placeholder="e.g., 61056923/25-26"
              className={styles.formControl}
              required
            />
          </div>
          <div className={styles.formControl}>
            <label>Invoice Date *</label>
            <input
              type="date"
              value={invoiceData.invoiceDate}
              onChange={(e) => updateInvoiceData({ invoiceDate: e.target.value })}
              className={styles.formControl}
              required
            />
          </div>
          <div className={styles.formControl}>
            <label>Currency Code</label>
            <input
              type="text"
              value={invoiceData.currencyCode}
onChange={(e) =>
  updateInvoiceData({ currencyCode: e.target.value.toUpperCase(), currencyName: '' })
}              placeholder="USD, EUR, INR, etc."
              className={styles.formControl}
              maxLength="3"
            />
          </div>
          
        </div>

        <div className={styles.formRow}>
          <div className={styles.formControl}>
            <label>Buyer's Order No</label>
            <input
              type="text"
              value={invoiceData.buyersOrderNo}
              onChange={(e) => updateInvoiceData({ buyersOrderNo: e.target.value })}
              placeholder="Order number"
              className={styles.formControl}
            />
          </div>
          <div className={styles.formControl}>
            <label>Other Reference</label>
            <input
              type="text"
              value={invoiceData.otherRef}
              onChange={(e) => updateInvoiceData({ otherRef: e.target.value })}
              placeholder="Reference information"
              className={styles.formControl}
            />
          </div>
        </div>
      </fieldset>

      {/* Consignor Details (Fixed - Bruker) */}
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Consignor Details (Fixed)</legend>
        <div style={{
          backgroundColor: '#f0f7ff',
          padding: '1rem',
          borderRadius: '4px',
          marginBottom: '1rem',
        }}>
          <p style={{ margin: 0, color: '#004085' }}>
            ℹ️ Consignor details are pre-filled with Bruker India Scientific details. You can edit if needed.
          </p>
        </div>

        <div className={styles.formRow}>
          <div className={styles.formControl}>
            <label>Company Name</label>
            <input
              type="text"
              value={invoiceData.consignorDetails.company}
              onChange={(e) => updateConsignorDetails({ company: e.target.value })}
              className={styles.formControl}
            />
          </div>
        </div>

        <div className={styles.formControl}>
          <label>Address Line 1</label>
          <input
            type="text"
            value={invoiceData.consignorDetails.address}
            onChange={(e) => updateConsignorDetails({ address: e.target.value })}
            className={styles.formControl}
          />
        </div>

        <div className={styles.formControl}>
          <label>Building Name</label>
          <input
            type="text"
            value={invoiceData.consignorDetails.building}
            onChange={(e) => updateConsignorDetails({ building: e.target.value })}
            className={styles.formControl}
          />
        </div>

        <div className={styles.formRow}>
          <div className={styles.formControl}>
            <label>Area</label>
            <input
              type="text"
              value={invoiceData.consignorDetails.area}
              onChange={(e) => updateConsignorDetails({ area: e.target.value })}
              className={styles.formControl}
            />
          </div>
          <div className={styles.formControl}>
            <label>City</label>
            <input
              type="text"
              value={invoiceData.consignorDetails.city}
              onChange={(e) => updateConsignorDetails({ city: e.target.value })}
              className={styles.formControl}
            />
          </div>
          <div className={styles.formControl}>
            <label>Phone</label>
            <input
              type="tel"
              value={invoiceData.consignorDetails.phone}
              onChange={(e) => updateConsignorDetails({ phone: e.target.value })}
              className={styles.formControl}
            />
          </div>
        </div>

        <div className={styles.formControl}>
          <label>GSTIN</label>
          <input
            type="text"
            value={invoiceData.consignorDetails.gstin}
            onChange={(e) => updateConsignorDetails({ gstin: e.target.value })}
            className={styles.formControl}
          />
        </div>
      </fieldset>

      {/* Consignee Details */}
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Consignee Details *</legend>
        
        <div className={styles.formRow}>
          <div className={styles.formControl}>
            <label>Consignee Name *</label>
            <input
              type="text"
              value={invoiceData.consigneeDetails.name}
              onChange={(e) => updateConsigneeDetails({ name: e.target.value })}
              placeholder="Full name"
              className={styles.formControl}
              required
            />
          </div>
          <div className={styles.formControl}>
            <label>Company</label>
            <input
              type="text"
              value={invoiceData.consigneeDetails.company}
              onChange={(e) => updateConsigneeDetails({ company: e.target.value })}
              placeholder="Company name"
              className={styles.formControl}
            />
          </div>
        </div>

        <div className={styles.formControl}>
          <label>Address *</label>
          <textarea
            value={invoiceData.consigneeDetails.address}
            onChange={(e) => updateConsigneeDetails({ address: e.target.value })}
            placeholder="Full address"
            className={styles.formControl}
            required
            style={{ minHeight: '80px' }}
          />
        </div>

        <div className={styles.formRow}>
          <div className={styles.formControl}>
            <label>City *</label>
            <input
              type="text"
              value={invoiceData.consigneeDetails.city}
              onChange={(e) => updateConsigneeDetails({ city: e.target.value })}
              placeholder="City"
              className={styles.formControl}
              required
            />
          </div>
          <div className={styles.formControl}>
            <label>Country *</label>
            <input
              type="text"
              value={invoiceData.consigneeDetails.country}
              onChange={(e) => updateConsigneeDetails({ country: e.target.value })}
              placeholder="Country"
              className={styles.formControl}
              required
            />
          </div>
          <div className={styles.formControl}>
            <label>Phone</label>
            <input
              type="tel"
              value={invoiceData.consigneeDetails.phone}
              onChange={(e) => updateConsigneeDetails({ phone: e.target.value })}
              placeholder="Phone number"
              className={styles.formControl}
            />
          </div>
        </div>
      </fieldset>

      {/* Origin & Destination */}
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Shipping Details</legend>
        
        <div className={styles.formRow}>
          <div className={styles.formControl}>
            <label>Origin (Port of Loading)</label>
            <input
              type="text"
              value={invoiceData.origin}
              onChange={(e) => updateInvoiceData({ origin: e.target.value })}
              className={styles.formControl}
            />
          </div>
          <div className={styles.formControl}>
            <label>Destination</label>
            <input
              type="text"
              value={invoiceData.destination}
              onChange={(e) => updateInvoiceData({ destination: e.target.value })}
              placeholder="Country/City"
              className={styles.formControl}
            />
          </div>
        </div>

        <div className={styles.formRow}>
          <div className={styles.formControl}>
            <label>Port of Discharge</label>
            <input
              type="text"
              value={invoiceData.portOfDischarge}
              onChange={(e) => updateInvoiceData({ portOfDischarge: e.target.value })}
              className={styles.formControl}
            />
          </div>
          <div className={styles.formControl}>
            <label>Final Destination</label>
            <input
              type="text"
              value={invoiceData.finalDestination}
              onChange={(e) => updateInvoiceData({ finalDestination: e.target.value })}
              className={styles.formControl}
            />
          </div>
        </div>

        <div className={styles.formControl}>
          <label>Shipment Notes</label>
          <textarea
            value={invoiceData.shipmentNotes}
            onChange={(e) => updateInvoiceData({ shipmentNotes: e.target.value })}
            className={styles.formControl}
            style={{ minHeight: '60px' }}
          />
        </div>
      </fieldset>

<fieldset className={styles.fieldset}>
  <legend className={styles.legend}>Shipment Details for Certificates (optional)</legend>
  <div className={styles.formRow}>
    <div className={styles.formControl}>
      <label>AWB No</label>
      <input type="text" value={invoiceData.awbNo || ''}
        onChange={(e) => updateInvoiceData({ awbNo: e.target.value })}
        className={styles.formControl} />
    </div>
    <div className={styles.formControl}>
      <label>MAWB No</label>
      <input type="text" value={invoiceData.mawbNo || ''}
        onChange={(e) => updateInvoiceData({ mawbNo: e.target.value })}
        className={styles.formControl} />
    </div>
  </div>
  <div className={styles.formRow}>
    <div className={styles.formControl}>
      <label>Net Weight (KGS)</label>
      <input type="text" value={invoiceData.netWeight || ''}
        onChange={(e) => updateInvoiceData({ netWeight: e.target.value })}
        className={styles.formControl} />
    </div>
    <div className={styles.formControl}>
      <label>Gross Weight (KGS)</label>
      <input type="text" value={invoiceData.grossWeight || ''}
        onChange={(e) => updateInvoiceData({ grossWeight: e.target.value })}
        className={styles.formControl} />
    </div>
    <div className={styles.formControl}>
      <label>Total No. of Packages</label>
      <input type="text" value={invoiceData.totalPackages || ''}
        onChange={(e) => updateInvoiceData({ totalPackages: e.target.value })}
        className={styles.formControl} />
    </div>
    <div className={styles.formControl}>
  <label>Dimensional Weight</label>
  <input type="text" value={invoiceData.dimensionalWeight || ''}
    onChange={(e) => updateInvoiceData({ dimensionalWeight: e.target.value })}
    placeholder="53 X58 X96 = 60 KGS"
    className={styles.formControl} />
</div>
  </div>
</fieldset>

      {/* Items */}
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Line Items</legend>
        <InternationalInvoiceItems
          items={invoiceData.items}
          onItemChange={updateItem}
          onAddItem={addItem}
          onRemoveItem={removeItem}
        />
      </fieldset>

      {/* Total Section */}
      <div className={styles.totalSection}>
        <div className={styles.totalLabel}>Total Amount</div>
        <div className={styles.totalAmount}>
          {invoiceData.currencyCode} {getTotalAmount().toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </div>
        <div className={styles.amountInWords}>
          ({getAmountInWords(getTotalAmount()).toUpperCase()})
        </div>
      </div>

      {/* Action Buttons */}
      <div className={styles.actionButtons}>
        <button
          type="button"
          onClick={() => setShowPreview(true)}
          className="btn btn-primary"
          disabled={loading || !invoiceData.invoiceNo || !invoiceData.consigneeDetails.name}
        >
          Preview & Print
        </button>
        <button
  type="button"
  onClick={() => setShowDocs(true)}
  className="btn btn-primary"
  disabled={loading || !invoiceData.invoiceNo || !invoiceData.consigneeDetails.name}
>
  Certificate & Authorisation
</button>
        <button
          type="button"
          onClick={handleSave}
          className="btn btn-success"
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save Invoice'}
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
        <InternationalInvoicePreview
          invoiceData={invoiceData}
          onClose={() => setShowPreview(false)}
        />
      )}
      {showDocs && (
  <ExportDocumentsModal
    invoiceData={invoiceData}
    onClose={() => setShowDocs(false)}
  />
)}
    </div>
  );
};

export default InternationalInvoiceForm;