import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

import MainLayout from '../components/Layout/MainLayout';
import InternationalInvoiceForm from '../components/InternationalInvoiceForm';
import styles from '../styles/invoiceWorkspace.module.css';

export default function EditInternationalInvoice() {
  const router = useRouter();
  const invoiceId =
    typeof router.query.id === 'string'
      ? router.query.id
      : '';

  let content;

  if (!router.isReady) {
    content = (
      <div className={styles.page}>
        <div
          className={`${styles.alert} ${styles.successAlert}`}
          role="status"
        >
          Loading invoice…
        </div>
      </div>
    );
  } else if (invoiceId) {
    content = (
      <InternationalInvoiceForm
        key={invoiceId}
        invoiceId={invoiceId}
      />
    );
  } else {
    content = (
      <div className={styles.page}>
        <div
          className={`${styles.alert} ${styles.errorAlert}`}
          role="alert"
        >
          <span>No invoice was selected for editing.</span>
          <Link
            href="/view-international-invoices"
            className={`${styles.button} ${styles.secondaryButton}`}
          >
            Back to all invoices
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Edit International Invoice - Invoice System</title>
      </Head>

      <MainLayout>{content}</MainLayout>
    </>
  );
}
