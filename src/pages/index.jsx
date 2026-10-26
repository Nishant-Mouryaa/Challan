import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import MainLayout from '../components/Layout/MainLayout';
import FeatureCard from '../components/Layout/FeatureCard';
import Icon from '../components/Layout/Icons';
import layoutStyles from '../styles/layout.module.css';
import { authenticatedFetch } from '../lib/supabaseClient';

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
  const [stats, setStats] = useState(null);
  const [statsError, setStatsError] = useState('');

  useEffect(() => {
    let active = true;

    Promise.all(['/api/challans', '/api/international-invoices', '/api/clients'].map(async (url) => {
      const response = await authenticatedFetch(url);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to load dashboard totals');
      return data.length;
    }))
      .then(([challans, invoices, clients]) => {
        if (active) setStats([
          { label: 'Challans created', value: challans },
          { label: 'Invoices created', value: invoices },
          { label: 'Clients', value: clients },
        ]);
      })
      .catch((error) => {
        console.error('Unable to load dashboard totals:', error);
        if (active) setStatsError(error.message || 'Unable to load dashboard totals');
      });

    return () => {
      active = false;
    };
  }, []);

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
        {(stats || [
          { label: 'Challans created', value: '—' },
          { label: 'Invoices created', value: '—' },
          { label: 'Clients', value: '—' },
        ]).map((stat) => (
          <div key={stat.label} className={layoutStyles.stat}>
            <dd className={layoutStyles.statValue}>{stat.value}</dd>
            <dt className={layoutStyles.statLabel}>{stat.label}</dt>
          </div>
        ))}
      </dl>
      {statsError && <p role="alert">{statsError}</p>}

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