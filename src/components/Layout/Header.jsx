import React, { useState } from 'react';
import { useRouter } from 'next/router';
import styles from '../../styles/layout.module.css';
import Icon from './Icons';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';

const pageTitles = {
  '/': 'Dashboard',
  '/create-challan': 'Create challan',
  '/view-challans': 'All challans',
  '/international-invoice': 'Create international invoice',
  '/view-international-invoices': 'All international invoices',
  '/edit-international-invoice': 'Edit international invoice',
  '/settings': 'Business setup',
  '/billing': 'Plans and billing',
};

const Header = ({ isOpen, setIsOpen }) => {
  const router = useRouter();
  const { workspace, session, signOut } = useAuth();
  const title = pageTitles[router.pathname] || 'DC Challan Management';
  const [signOutError, setSignOutError] = useState('');

  const handleSignOut = async () => {
    try {
      await signOut();
      await router.replace('/login');
    } catch (error) {
      console.error('Unable to sign out:', error);
      setSignOutError('Unable to sign out. Please try again.');
    }
  };

  return (
    <header className={styles.header}>
      <div className={styles.headerContent}>
        <button
          type="button"
          className={styles.menuToggle}
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle menu"
          aria-expanded={isOpen}
        >
          <Icon name="menu" size={20} />
        </button>

        <div className={styles.headerTitle}>
          <span className={styles.headerTitleText}>{title}</span>
        </div>

        <div className={styles.headerActions}>
          <Link href="/settings" className={styles.headerBtn} title="Business setup" aria-label="Business setup">
            <Icon name="settings" size={18} />
          </Link>
          <span className={styles.workspaceName} title={session?.user?.email}>{workspace?.name}</span>
          <button type="button" className={`${styles.headerBtn} ${styles.signOutButton}`} onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      </div>
      {signOutError && <span role="alert">{signOutError}</span>}
    </header>
  );
};

export default Header;