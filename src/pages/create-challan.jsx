import Head from 'next/head';
import ChallanForm from '../components/ChallanForm';

export default function CreateChallan() {
  return (
    <>
      <Head>
        <title>Create Delivery Challan - DC System</title>
      </Head>
      <ChallanForm />
    </>
  );
}