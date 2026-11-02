import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

import MainLayout from '../components/Layout/MainLayout';
import ChallanPreview from '../components/ChallanPreview';
import { authenticatedFetch } from '../lib/supabaseClient';
import { formatDate } from '../utils/formatters';
import s from '../styles/challanWorkspace.module.css';

const challanTotal = (challan) =>
  (challan.items || []).reduce(
    (sum, item) =>
      sum + (Number(item.quantity) || 0) * (Number(item.price) || 0),
    0
  );

const formatAmount = (value) =>
  value.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function ViewChallans() {
  const router = useRouter();
  const [challans, setChallans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedChallan, setSelectedChallan] = useState(null);

  const fetchChallans = async () => {
    setLoadError('');

    try {
      const response = await authenticatedFetch('/api/challans');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load challans');
      }

      setChallans(data || []);
    } catch (error) {
      console.error('Error fetching challans:', error);
      setLoadError(error.message || 'Failed to load challans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChallans();
  }, []);

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredChallans = challans.filter((challan) => {
    const searchable = [
      challan.challanNo,
      challan.receiverDetails?.name,
      challan.receiverDetails?.city,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return !normalizedSearch || searchable.includes(normalizedSearch);
  });

  const recipients = new Set(
    challans
      .map((challan) => challan.receiverDetails?.name?.trim())
      .filter(Boolean)
  );
  const totalValue = challans.reduce(
    (sum, challan) => sum + challanTotal(challan),
    0
  );

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this challan?')) {
      return;
    }

    try {
      const response = await authenticatedFetch(
        `/api/challans/${id}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || 'Failed to delete challan');
      }

      await fetchChallans();
    } catch (error) {
      console.error('Error deleting challan:', error);
      setLoadError(error.message || 'Failed to delete challan');
    }
  };

  return (
    <>
      <Head>
        <title>All delivery challans - DC System</title>
      </Head>

      <MainLayout>
        <main className={s.listPage}>
          <header className={s.listHeader}>
            <div>
              <div className={s.eyebrow}>DOMESTIC SHIPPING</div>
              <h1>Delivery challans</h1>
              <p>Find, review, and manage your delivery challans.</p>
            </div>

            <div className={s.listActions}>
              <Link
                href="/"
                className={`${s.button} ${s.secondaryButton}`}
              >
                Back to dashboard
              </Link>
              <button
                type="button"
                className={`${s.button} ${s.secondaryButton}`}
                onClick={fetchChallans}
                disabled={loading}
              >
                Refresh
              </button>
              <Link
                href="/create-challan"
                className={`${s.button} ${s.primaryButton}`}
              >
                + New challan
              </Link>
            </div>
          </header>

          {loadError && (
            <div className={s.errorAlert} role="alert">
              {loadError}
            </div>
          )}

          <section className={s.statsGrid} aria-label="Challan summary">
            <div className={s.statCard}>
              <span className={s.statIcon} aria-hidden="true">DC</span>
              <div>
                <span>Total challans</span>
                <strong>{loading && !challans.length ? '—' : challans.length}</strong>
              </div>
            </div>
            <div className={s.statCard}>
              <span className={s.statIcon} aria-hidden="true">RC</span>
              <div>
                <span>Recipients</span>
                <strong>{loading && !challans.length ? '—' : recipients.size}</strong>
              </div>
            </div>
            <div className={s.statCard}>
              <span className={s.statIcon} aria-hidden="true">₹</span>
              <div>
                <span>Total value</span>
                <strong>
                  {loading && !challans.length
                    ? '—'
                    : `₹${formatAmount(totalValue)}`}
                </strong>
              </div>
            </div>
          </section>

          <section className={s.listCard} aria-labelledby="challan-library-heading">
            <div className={s.libraryHeader}>
              <div>
                <h2 id="challan-library-heading">Challan library</h2>
                <p>Search by challan number, recipient, or city.</p>
              </div>
              <span className={s.countBadge}>
                {filteredChallans.length} results
              </span>
            </div>

            <label className={s.searchBar} aria-label="Search challans">
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                placeholder="Search challans…"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </label>

            {loading ? (
              <div className={s.statePanel} role="status">
                <strong>Loading challans</strong>
                <p>Retrieving your challan library…</p>
              </div>
            ) : !filteredChallans.length ? (
              <div className={s.statePanel}>
                <strong>
                  {normalizedSearch
                    ? 'No matching challans'
                    : loadError
                      ? 'Challans could not be loaded'
                      : 'Your challan library is empty'}
                </strong>
                <p>
                  {normalizedSearch
                    ? 'Try another search.'
                    : loadError
                      ? 'Refresh to try loading your challans again.'
                      : 'Create your first delivery challan to get started.'}
                </p>
                {normalizedSearch ? (
                  <button
                    type="button"
                    className={`${s.button} ${s.secondaryButton}`}
                    onClick={() => setSearchTerm('')}
                  >
                    Clear search
                  </button>
                ) : loadError ? (
                  <button
                    type="button"
                    className={`${s.button} ${s.secondaryButton}`}
                    onClick={fetchChallans}
                  >
                    Try again
                  </button>
                ) : (
                  <Link
                    href="/create-challan"
                    className={`${s.button} ${s.primaryButton}`}
                  >
                    + Create challan
                  </Link>
                )}
              </div>
            ) : (
              <div className={s.tableScroller}>
                <table className={s.challanTable}>
                  <thead>
                    <tr>
                      <th scope="col">Challan</th>
                      <th scope="col">Recipient</th>
                      <th scope="col">City</th>
                      <th scope="col">Total value</th>
                      <th scope="col">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredChallans.map((challan) => (
                      <tr key={challan.id}>
                        <td>
                          <button
                            type="button"
                            className={s.challanNoButton}
                            onClick={() => setSelectedChallan(challan)}
                          >
                            {challan.challanNo || 'Untitled'}
                          </button>
                          <span className={s.subtext}>
                            {formatDate(challan.date)}
                          </span>
                        </td>
                        <td>{challan.receiverDetails?.name || '—'}</td>
                        <td>{challan.receiverDetails?.city || '—'}</td>
                        <td>
                          <strong>₹{formatAmount(challanTotal(challan))}</strong>
                        </td>
                        <td>
                          <div className={s.rowActions}>
                            <button
                              type="button"
                              className={s.actionButton}
                              onClick={() => setSelectedChallan(challan)}
                              aria-label={`Print or view challan ${challan.challanNo || ''}`}
                              title="Print / view"
                            >
                              View
                            </button>
                            <button
                              type="button"
                              className={s.actionButton}
                              onClick={() =>
                                router.push(`/edit-challan?id=${challan.id}`)
                              }
                              aria-label={`Edit challan ${challan.challanNo || ''}`}
                              title="Edit challan"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className={`${s.actionButton} ${s.deleteButton}`}
                              onClick={() => handleDelete(challan.id)}
                              aria-label={`Delete challan ${challan.challanNo || ''}`}
                              title="Delete challan"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </main>

        {selectedChallan && (
          <ChallanPreview
            challanData={selectedChallan}
            senderData={selectedChallan.senderDetails}
            onClose={() => setSelectedChallan(null)}
          />
        )}
      </MainLayout>
    </>
  );
}
