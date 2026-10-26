import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import styles from '../styles/form.module.css';
import { formatDate } from '../utils/formatters';
import ChallanPreview from '../components/ChallanPreview';
import { authenticatedFetch } from '../lib/supabaseClient';

export default function ViewChallans() {
  const router = useRouter();
  const [challans, setChallans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedChallan, setSelectedChallan] = useState(null);

  useEffect(() => {
    fetchChallans();
  }, []);

  const fetchChallans = async () => {
    try {
      setLoadError('');
      const response = await authenticatedFetch('/api/challans');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to load challans');
      setChallans(data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching challans:', error);
      setLoadError(error.message || 'Failed to load challans');
      setLoading(false);
    }
  };

  const filteredChallans = challans.filter(
    (challan) =>
      challan.challanNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      challan.receiverDetails?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      challan.receiverDetails?.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this challan?')) {
      try {
        const response = await authenticatedFetch(`/api/challans/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Failed to delete challan');
        fetchChallans();
      } catch (error) {
        console.error('Error deleting challan:', error);
        setLoadError(error.message || 'Failed to delete challan');
      }
    }
  };

  if (loading) {
    return (
      <div className={styles.formContainer}>
        <div className={styles.loading}>Loading challans...</div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>View Challans - DC System</title>
      </Head>

      <div className={styles.formContainer}>
        <div className={styles.formHeader}>
          <h1>📊 All Delivery Challans</h1>
          <p>View and manage all created delivery challans</p>
        </div>

        {loadError && <div className={styles.error}>{loadError}</div>}

        {/* Search Bar */}
        <div className={styles.formControl} style={{ marginBottom: '2rem' }}>
          <label>Search Challans</label>
          <input
            type="text"
            placeholder="Search by challan number, client name, or city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.formControl}
          />
        </div>

        {/* Challans Table */}
        {filteredChallans.length === 0 ? (
          <div className={styles.error} style={{ textAlign: 'center', padding: '2rem' }}>
            No challans found. <a href="/create-challan">Create a new one</a>
          </div>
        ) : (
          <div className={styles.itemsTableWrapper}>
            <table className={styles.itemsTable}>
              <thead>
                <tr>
                  <th>Challan No</th>
                  <th>Date</th>
                  <th>Receiver</th>
                  <th>City</th>
                  <th>Total Amount (₹)</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredChallans.map((challan) => {
                  const total = challan.items?.reduce(
                    (sum, item) => sum + item.quantity * item.price,
                    0
                  ) || 0;

                  return (
                    <tr key={challan.id}>
                      <td>
                        <strong>{challan.challanNo}</strong>
                      </td>
                      <td>{formatDate(challan.date)}</td>
                      <td>{challan.receiverDetails?.name}</td>
                      <td>{challan.receiverDetails?.city}</td>
                      <td style={{ textAlign: 'right' }}>
                        ₹{total.toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td>
                        <button
                          onClick={() => setSelectedChallan(challan)}
                          className="btn btn-primary"
                          style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
                        >
                          Print / View
                        </button>
                        <button
                          onClick={() =>
                            router.push(`/edit-challan?id=${challan.id}`)
                          }
                          className="btn btn-secondary"
                          style={{
                            fontSize: '0.875rem',
                            padding: '0.5rem 1rem',
                            marginLeft: '0.5rem',
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(challan.id)}
                          className="btn btn-danger"
                          style={{
                            fontSize: '0.875rem',
                            padding: '0.5rem 1rem',
                            marginLeft: '0.5rem',
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {selectedChallan && (
          <ChallanPreview
            challanData={selectedChallan}
            senderData={selectedChallan.senderDetails}
            onClose={() => setSelectedChallan(null)}
          />
        )}
      </div>
    </>
  );
}