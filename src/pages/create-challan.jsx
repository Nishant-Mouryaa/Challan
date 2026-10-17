import Head from 'next/head';
import MainLayout from '../components/Layout/MainLayout';
import ChallanForm from '../components/ChallanForm';

export default function CreateChallan() {
  return (
    <>
      <Head>
        <title>Create Delivery Challan - DC System</title>
      </Head>
      <MainLayout>
        <ChallanForm />
      </MainLayout>
    </>
  );
}