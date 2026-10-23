import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import styles from '../styles/form.module.css';
import InternationalInvoiceItems from '../components/InternationalInvoiceItems';
import InternationalInvoicePreview from '../components/InternationalInvoicePreview';
import ExportDocumentsModal from '../components/ExportDocumentsModal';
import { useInternationalInvoice } from '../hooks/useInternationalInvoice';

export default function EditInternationalInvoice() {
  const router = useRouter();
  const { id } = router.query;
  const [invoiceToEdit, setInvoiceToEdit] = useState(null);
  const [loading, setLoading] = useState(true);

  const {
    invoiceData,
    updateInvoiceData,
    updateConsignorDetails,
    updateConsigneeDetails,
    addItem,
    removeItem,
    updateItem,
    getTotalAmount,
    getAmountInWords,
  } = useInternationalInvoice();

  const [showPreview, setShowPreview] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [loadError, setLoadError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Fetch invoice on mount
  useEffect(() => {
    if (id) {
      fetchInvoice();
    }
  }, [id]);

  const fetchInvoice = async () => {
    try {
      const response = await fetch(`/api/international-invoices/${id}`);
      const invoice = await response.json();
      if (!response.ok) throw new Error(invoice.error || 'Failed to load invoice');
      
      if (invoice) {
        setInvoiceToEdit(invoice);
        // Load invoice data into form
        updateInvoiceData(invoice);
        setLoading(false);
      } else {
        router.push('/view-international-invoices');
      }
    } catch (error) {
      console.error('Error fetching invoice:', error);
      setLoadError(error.message || 'Failed to load invoice');
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Update the invoice
      const response = await fetch(`/api/international-invoices/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoiceData),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to update invoice');

      setSuccessMessage('Invoice updated successfully!');
      setTimeout(() => {
        setSuccessMessage('');
        router.push('/view-international-invoices');
      }, 2000);
    } catch (error) {
      console.error('Error saving invoice:', error);
      setSuccessMessage(error.message || 'Error updating invoice. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.formContainer}>
        <div className={styles.loading}>Loading invoice...</div>
      </div>
    );
  }

  if (!invoiceToEdit) {
    return (
      <div className={styles.formContainer}>
        <div className={styles.error}>{loadError || 'Invoice not found'}</div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Edit Invoice - {invoiceData.invoiceNo} - Invoice System</title>
      </Head>

      <div className={styles.formContainer}>
        <div className={styles.formHeader}>
          <h1>✏️ Edit International Invoice</h1>
          <p>Invoice No: {invoiceData.invoiceNo}</p>
        </div>

        {successMessage && (
          <div className={successMessage.includes('Error') ? styles.error : styles.success}>
            {successMessage}
          </div>
        )}

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
                  updateInvoiceData({ currencyCode: e.target.value.toUpperCase() })
                }
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
                className={styles.formControl}
              />
            </div>
            <div className={styles.formControl}>
              <label>Other Reference</label>
              <input
                type="text"
                value={invoiceData.otherRef}
                onChange={(e) => updateInvoiceData({ otherRef: e.target.value })}
                className={styles.formControl}
              />
            </div>
          </div>
        </fieldset>

        {/* Consignor Details */}
        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>Consignor Details</legend>
          
          <div className={styles.formRow}>
            <div className={styles.formControl}>
              <label>Company Name</label>
              <input
                type="text"
                value={invoiceData.consignorDetails?.company || ''}
                onChange={(e) => updateConsignorDetails({ company: e.target.value })}
                className={styles.formControl}
              />
            </div>
          </div>

          <div className={styles.formControl}>
            <label>Address Line 1</label>
            <input
              type="text"
              value={invoiceData.consignorDetails?.address || ''}
              onChange={(e) => updateConsignorDetails({ address: e.target.value })}
              className={styles.formControl}
            />
          </div>

          <div className={styles.formControl}>
            <label>Building Name</label>
            <input
              type="text"
              value={invoiceData.consignorDetails?.building || ''}
              onChange={(e) => updateConsignorDetails({ building: e.target.value })}
              className={styles.formControl}
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formControl}>
              <label>Area</label>
              <input
                type="text"
                value={invoiceData.consignorDetails?.area || ''}
                onChange={(e) => updateConsignorDetails({ area: e.target.value })}
                className={styles.formControl}
              />
            </div>
            <div className={styles.formControl}>
              <label>City</label>
              <input
                type="text"
                value={invoiceData.consignorDetails?.city || ''}
                onChange={(e) => updateConsignorDetails({ city: e.target.value })}
                className={styles.formControl}
              />
            </div>
            <div className={styles.formControl}>
              <label>Phone</label>
              <input
                type="tel"
                value={invoiceData.consignorDetails?.phone || ''}
                onChange={(e) => updateConsignorDetails({ phone: e.target.value })}
                className={styles.formControl}
              />
            </div>
          </div>

          <div className={styles.formControl}>
            <label>GSTIN</label>
            <input
              type="text"
              value={invoiceData.consignorDetails?.gstin || ''}
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
                value={invoiceData.consigneeDetails?.name || ''}
                onChange={(e) => updateConsigneeDetails({ name: e.target.value })}
                className={styles.formControl}
                required
              />
            </div>
            <div className={styles.formControl}>
              <label>Company</label>
              <input
                type="text"
                value={invoiceData.consigneeDetails?.company || ''}
                onChange={(e) => updateConsigneeDetails({ company: e.target.value })}
                className={styles.formControl}
              />
            </div>
          </div>

          <div className={styles.formControl}>
            <label>Address *</label>
            <textarea
              value={invoiceData.consigneeDetails?.address || ''}
              onChange={(e) => updateConsigneeDetails({ address: e.target.value })}
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
                value={invoiceData.consigneeDetails?.city || ''}
                onChange={(e) => updateConsigneeDetails({ city: e.target.value })}
                className={styles.formControl}
                required
              />
            </div>
            <div className={styles.formControl}>
              <label>Country *</label>
              <input
                type="text"
                value={invoiceData.consigneeDetails?.country || ''}
                onChange={(e) => updateConsigneeDetails({ country: e.target.value })}
                className={styles.formControl}
                required
              />
            </div>
            <div className={styles.formControl}>
              <label>Phone</label>
              <input
                type="tel"
                value={invoiceData.consigneeDetails?.phone || ''}
                onChange={(e) => updateConsigneeDetails({ phone: e.target.value })}
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
              <label>Origin</label>
              <input
                type="text"
                value={invoiceData.origin || ''}
                onChange={(e) => updateInvoiceData({ origin: e.target.value })}
                className={styles.formControl}
              />
            </div>
            <div className={styles.formControl}>
              <label>Destination</label>
              <input
                type="text"
                value={invoiceData.destination || ''}
                onChange={(e) => updateInvoiceData({ destination: e.target.value })}
                className={styles.formControl}
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formControl}>
              <label>Port of Discharge</label>
              <input
                type="text"
                value={invoiceData.portOfDischarge || ''}
                onChange={(e) => updateInvoiceData({ portOfDischarge: e.target.value })}
                className={styles.formControl}
              />
            </div>
            <div className={styles.formControl}>
              <label>Final Destination</label>
              <input
                type="text"
                value={invoiceData.finalDestination || ''}
                onChange={(e) => updateInvoiceData({ finalDestination: e.target.value })}
                className={styles.formControl}
              />
            </div>
          </div>

          <div className={styles.formControl}>
            <label>Shipment Notes</label>
            <textarea
              value={invoiceData.shipmentNotes || ''}
              onChange={(e) => updateInvoiceData({ shipmentNotes: e.target.value })}
              className={styles.formControl}
              style={{ minHeight: '60px' }}
            />
          </div>
        </fieldset>

        {/* Items */}
        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>Line Items</legend>
          <InternationalInvoiceItems
            items={invoiceData.items || []}
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
            disabled={isSaving}
          >
            Preview & Print
          </button>
          <button
            type="button"
            onClick={() => setShowDocs(true)}
            className="btn btn-primary"
            disabled={isSaving}
          >
            Supporting Documents
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="btn btn-success"
            disabled={isSaving}
          >
            {isSaving ? 'Updating...' : 'Update Invoice'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/view-international-invoices')}
            className="btn btn-secondary"
            disabled={isSaving}
          >
            Cancel
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
            onSave={(supportingDocuments) =>
              updateInvoiceData({ supportingDocuments })
            }
          />
        )}
      </div>
    </>
  );
}