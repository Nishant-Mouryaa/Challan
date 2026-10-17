import React from 'react';
import { useRouter } from 'next/router';
import styles from '../../styles/layout.module.css';
import Icon from './Icons';

const pageTitles = {
  '/': 'Dashboard',
  '/create-challan': 'Create challan',
  '/view-challans': 'All challans',
  '/international-invoice': 'Create international invoice',
  '/view-international-invoices': 'All international invoices',
  '/edit-international-invoice': 'Edit international invoice',
};

const Header = ({ isOpen, setIsOpen }) => {
  const router = useRouter();
  const title = pageTitles[router.pathname] || 'DC Challan Management';

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
          <button type="button" className={styles.headerBtn} title="Settings" aria-label="Settings">
            <Icon name="settings" size={18} />
          </button>
          <button type="button" className={styles.headerBtn} title="User profile" aria-label="User profile">
            <Icon name="user" size={18} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;