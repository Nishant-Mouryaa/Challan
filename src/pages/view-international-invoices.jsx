import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import styles from '../styles/form.module.css';
import challanStyles from '../styles/challan.module.css';
import { formatDate } from '../utils/formatters';
import { authenticatedFetch } from '../lib/supabaseClient';

export default function ViewInternationalInvoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [editingInvoice, setEditingInvoice] = useState(null);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoadError('');
      const response = await authenticatedFetch('/api/international-invoices');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to load invoices');
      setInvoices(data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      setLoadError(error.message || 'Failed to load invoices');
      setLoading(false);
    }
  };

  const filteredInvoices = invoices.filter(
    (invoice) =>
      invoice.invoiceNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.consigneeDetails?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.consigneeDetails?.country?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this invoice?')) {
      try {
        const response = await authenticatedFetch(`/api/international-invoices/${id}`, {
          method: 'DELETE',
        });
        if (!response.ok) throw new Error('Failed to delete invoice');
        fetchInvoices();
      } catch (error) {
        console.error('Error deleting invoice:', error);
        setLoadError(error.message || 'Failed to delete invoice');
      }
    }
  };

  const handleEdit = (invoice) => {
    setEditingInvoice(invoice);
    // Redirect to edit page or open edit form
    window.location.href = `/edit-international-invoice?id=${invoice.id}`;
  };

  if (loading) {
    return (
      <div className={styles.formContainer}>
        <div className={styles.loading}>Loading invoices...</div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>View International Invoices - Invoice System</title>
      </Head>

      <div className={styles.formContainer}>
        <div className={styles.formHeader}>
          <h1>📋 International Invoices</h1>
          <p>View, edit, and manage all created invoices</p>
        </div>

        {loadError && <div className={styles.error}>{loadError}</div>}

        {/* Create New Button */}
        <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <Link href="/international-invoice">
            <button className="btn btn-primary" style={{ padding: '0.75rem 1.5rem' }}>
              ➕ Create New Invoice
            </button>
          </Link>
        </div>

        {/* Search Bar */}
        <div className={styles.formControl} style={{ marginBottom: '2rem' }}>
          <label>Search Invoices</label>
          <input
            type="text"
            placeholder="Search by invoice no, consignee name, or country..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.formControl}
          />
        </div>

        {/* Invoices Table */}
        {filteredInvoices.length === 0 ? (
          <div className={styles.error} style={{ textAlign: 'center', padding: '2rem' }}>
            No invoices found. <Link href="/international-invoice">Create a new one</Link>
          </div>
        ) : (
          <div className={styles.itemsTableWrapper}>
            <table className={styles.itemsTable}>
              <thead>
                <tr>
                  <th>Invoice No</th>
                  <th>Date</th>
                  <th>Consignee</th>
                  <th>Country</th>
                  <th>Total Amount</th>
                  <th>Currency</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>
                      <strong>{invoice.invoiceNo}</strong>
                    </td>
                    <td>{formatDate(invoice.invoiceDate)}</td>
                    <td>{invoice.consigneeDetails?.name}</td>
                    <td>{invoice.consigneeDetails?.country}</td>
                    <td style={{ textAlign: 'right' }}>
                      {(invoice.totalAmount || 0).toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td>{invoice.currencyCode}</td>
                    <td>
                      <button
                        onClick={() => setSelectedInvoice(invoice)}
                        className="btn btn-primary"
                        style={{ fontSize: '0.875rem', padding: '0.5rem 1rem', marginRight: '0.5rem' }}
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleEdit(invoice)}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.875rem', padding: '0.5rem 1rem', marginRight: '0.5rem' }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(invoice.id)}
                        className="btn btn-danger"
                        style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Invoice Detail Modal */}
        {selectedInvoice && (
          <div className={challanStyles.modalOverlay}>
            <div className={challanStyles.modalContent}>
              <button
                className={challanStyles.closeBtn}
                onClick={() => setSelectedInvoice(null)}
              >
                ✕
              </button>

              <div style={{ padding: '2rem' }}>
                <h2>Invoice Details - {selectedInvoice.invoiceNo}</h2>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '1rem',
                  marginBottom: '2rem'
                }}>
                  {/* Consignor */}
                  <div style={{ padding: '1rem', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
                    <h4>Consignor</h4>
                    <p><strong>{selectedInvoice.consignorDetails?.company}</strong></p>
                    <p>{selectedInvoice.consignorDetails?.address}</p>
                    <p>{selectedInvoice.consignorDetails?.building}</p>
                    <p>{selectedInvoice.consignorDetails?.area}</p>
                    <p>Phone: {selectedInvoice.consignorDetails?.phone}</p>
                    <p>GSTIN: {selectedInvoice.consignorDetails?.gstin}</p>
                  </div>

                  {/* Consignee */}
                  <div style={{ padding: '1rem', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
                    <h4>Consignee</h4>
                    <p><strong>{selectedInvoice.consigneeDetails?.name}</strong></p>
                    <p>{selectedInvoice.consigneeDetails?.company}</p>
                    <p style={{ whiteSpace: 'pre-wrap' }}>{selectedInvoice.consigneeDetails?.address}</p>
                    <p>{selectedInvoice.consigneeDetails?.city}</p>
                    <p>{selectedInvoice.consigneeDetails?.country}</p>
                    <p>Phone: {selectedInvoice.consigneeDetails?.phone}</p>
                  </div>
                </div>

                {/* Invoice Info */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '1rem',
                  marginBottom: '2rem'
                }}>
                  <div style={{ padding: '1rem', backgroundColor: '#f0f7ff', borderRadius: '4px' }}>
                    <p style={{ color: '#666', fontSize: '0.875rem' }}>Invoice No</p>
                    <p style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{selectedInvoice.invoiceNo}</p>
                  </div>
                  <div style={{ padding: '1rem', backgroundColor: '#f0f7ff', borderRadius: '4px' }}>
                    <p style={{ color: '#666', fontSize: '0.875rem' }}>Date</p>
                    <p style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{formatDate(selectedInvoice.invoiceDate)}</p>
                  </div>
                  <div style={{ padding: '1rem', backgroundColor: '#f0f7ff', borderRadius: '4px' }}>
                    <p style={{ color: '#666', fontSize: '0.875rem' }}>Total Amount</p>
                    <p style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
                      {selectedInvoice.currencyCode} {selectedInvoice.totalAmount?.toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                  <div style={{ padding: '1rem', backgroundColor: '#f0f7ff', borderRadius: '4px' }}>
                    <p style={{ color: '#666', fontSize: '0.875rem' }}>Currency</p>
                    <p style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{selectedInvoice.currencyCode}</p>
                  </div>
                </div>

                {/* Items */}
                <h4>Items</h4>
                <div className={styles.itemsTableWrapper}>
                  <table className={styles.itemsTable}>
                    <thead>
                      <tr>
                        <th>HSN Code</th>
                        <th>Description</th>
                        <th>Qty</th>
                        <th>Rate</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInvoice.items?.map((item, i) => (
                        <tr key={i}>
                          <td>{item.hsnCode}</td>
                          <td>{item.description}</td>
                          <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                          <td style={{ textAlign: 'right' }}>
                            {item.ratePerPiece?.toLocaleString('en-IN', {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {item.amount?.toLocaleString('en-IN', {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{
                  marginTop: '1rem',
                  textAlign: 'right',
                  fontSize: '0.875rem',
                  color: '#666'
                }}>
                  Created: {new Date(selectedInvoice.createdAt).toLocaleString()}
                </div>
              </div>

              <div style={{ padding: '1rem', textAlign: 'center', borderTop: '1px solid #ddd' }}>
                <button onClick={() => setSelectedInvoice(null)} className="btn btn-secondary">
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}