import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import MainLayout from '../components/Layout/MainLayout';
import ChallanForm from '../components/ChallanForm';
import styles from '../styles/form.module.css';

export default function EditChallan() {
  const router = useRouter();
  const { id } = router.query;
  const [challan, setChallan] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;
    fetch(`/api/challans/${id}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to load challan');
        if (!cancelled) setChallan(data);
      })
      .catch((requestError) => {
        console.error('Error fetching challan:', requestError);
        if (!cancelled) setError(requestError.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <>
      <Head>
        <title>Edit Delivery Challan - DC System</title>
      </Head>
      <MainLayout>
        {loading ? (
          <div className={styles.formContainer}>
            <div className={styles.loading}>Loading challan...</div>
          </div>
        ) : challan ? (
          <ChallanForm key={challan.id} initialData={challan} />
        ) : (
          <div className={styles.formContainer}>
            <div className={styles.error}>{error || 'Challan not found'}</div>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => router.push('/view-challans')}
            >
              Back to challans
            </button>
          </div>
        )}
      </MainLayout>
    </>
  );
}
