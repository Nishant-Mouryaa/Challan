import Head from 'next/head';
import InternationalInvoiceForm from '../components/InternationalInvoiceForm';

export default function InternationalInvoice() {
  return (
    <>
      <Head>
        <title>International Invoice - Invoice System</title>
      </Head>
      <InternationalInvoiceForm />
    </>
  );
}