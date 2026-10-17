import React from 'react';
import Link from 'next/link';
import MainLayout from '../components/Layout/MainLayout';
import FeatureCard from '../components/Layout/FeatureCard';
import Icon from '../components/Layout/Icons';
import layoutStyles from '../styles/layout.module.css';

// TODO: replace these placeholder numbers with real counts
// (e.g. fetch from /api/challans, /api/international-invoices, /api/clients).
const stats = [
  { label: 'Challans created', value: '156' },
  { label: 'Invoices created', value: '42' },
  { label: 'Clients', value: '28' },
];

const challanActions = [
  {
    icon: 'file-plus',
    title: 'Create delivery challan',
    description: 'Pick a client and sender, add items, then print or save as PDF.',
    href: '/create-challan',
    buttonText: 'Create',
    variant: 'primary',
  },
  {
    icon: 'files',
    title: 'All challans',
    description: 'Search, reopen and reprint challans you have already made.',
    href: '/view-challans',
    buttonText: 'View',
    variant: 'secondary',
  },
];

const invoiceActions = [
  {
    icon: 'globe',
    title: 'Create international invoice',
    description: 'Export invoice with certificate and DHL authorisation letter.',
    href: '/international-invoice',
    buttonText: 'Create',
    variant: 'primary',
  },
  {
    icon: 'receipt',
    title: 'All international invoices',
    description: 'Edit, reprint and download saved export invoices.',
    href: '/view-international-invoices',
    buttonText: 'View',
    variant: 'secondary',
  },
];

export default function Home() {
  return (
    <MainLayout>
      <div className={layoutStyles.pageHeader}>
        <div>
          <h2 className={layoutStyles.pageTitle}>Dashboard</h2>
          <p className={layoutStyles.pageSubtitle}>
            Create and manage delivery challans and international invoices.
          </p>
        </div>
        <div className={layoutStyles.pageActions}>
          <Link href="/create-challan" className={layoutStyles.btnPrimary}>
            <Icon name="plus" size={16} />
            New challan
          </Link>
          <Link href="/international-invoice" className={layoutStyles.btnOutline}>
            <Icon name="plus" size={16} />
            New invoice
          </Link>
        </div>
      </div>

      <dl className={layoutStyles.statsStrip}>
        {stats.map((stat) => (
          <div key={stat.label} className={layoutStyles.stat}>
            <dd className={layoutStyles.statValue}>{stat.value}</dd>
            <dt className={layoutStyles.statLabel}>{stat.label}</dt>
          </div>
        ))}
      </dl>

      <div className={layoutStyles.panelGrid}>
        <section className={layoutStyles.panel} aria-labelledby="challans-heading">
          <h3 id="challans-heading" className={layoutStyles.panelTitle}>
            Delivery challans
          </h3>
          <div className={layoutStyles.actionList}>
            {challanActions.map((action) => (
              <FeatureCard key={action.href} {...action} />
            ))}
          </div>
        </section>

        <section className={layoutStyles.panel} aria-labelledby="invoices-heading">
          <h3 id="invoices-heading" className={layoutStyles.panelTitle}>
            International invoices
          </h3>
          <div className={layoutStyles.actionList}>
            {invoiceActions.map((action) => (
              <FeatureCard key={action.href} {...action} />
            ))}
          </div>
        </section>
      </div>
    </MainLayout>
  );
}