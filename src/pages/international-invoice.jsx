import Head from 'next/head';
import MainLayout from '../components/Layout/MainLayout';
import InternationalInvoiceForm from '../components/InternationalInvoiceForm';

export default function InternationalInvoice() {
  return (
    <>
      <Head>
        <title>International Invoice - Invoice System</title>
      </Head>
      <MainLayout>
        <InternationalInvoiceForm />
      </MainLayout>
    </>
  );
}