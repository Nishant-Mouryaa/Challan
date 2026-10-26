import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from '../../styles/layout.module.css';
import Icon from './Icons';

const navGroups = [
  {
    label: null,
    items: [{ label: 'Dashboard', icon: 'dashboard', href: '/' }],
  },
  {
    label: 'Delivery challans',
    items: [
      { label: 'Create challan', icon: 'file-plus', href: '/create-challan' },
      { label: 'All challans', icon: 'files', href: '/view-challans' },
    ],
  },
  {
    label: 'International invoices',
    items: [
      { label: 'Create invoice', icon: 'globe', href: '/international-invoice' },
      {
        label: 'All invoices',
        icon: 'receipt',
        href: '/view-international-invoices',
        // keep highlighted while editing an invoice
        match: ['/view-international-invoices', '/edit-international-invoice'],
      },
    ],
  },
  {
    label: 'Workspace',
    items: [
      { label: 'Business setup', icon: 'settings', href: '/settings' },
      { label: 'Plans and billing', icon: 'receipt', href: '/billing' },
    ],
  },
];

const Sidebar = ({ isOpen, setIsOpen, isCollapsed, setIsCollapsed }) => {
  const router = useRouter();

  const isActive = (item) =>
    (item.match || [item.href]).includes(router.pathname);

  return (
    <>
      {isOpen && (
        <div className={styles.sidebarOverlay} onClick={() => setIsOpen(false)} />
      )}

      <aside
        className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''} ${
          isCollapsed ? styles.sidebarCollapsed : ''
        }`}
      >
        <div className={styles.sidebarHeader}>
          <div className={styles.brand}>
            <span className={styles.brandMark} title="DC System">
              <Icon name="package" size={18} />
            </span>
            <span className={styles.brandText}>
              <span className={styles.brandName}>DC System</span>
              <span className={styles.brandSub}>Challan management</span>
            </span>
          </div>
          <button
            className={styles.collapseSidebarBtn}
            onClick={() => setIsCollapsed((collapsed) => !collapsed)}
            type="button"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!isCollapsed}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <Icon
              name="chevron"
              size={18}
              className={isCollapsed ? '' : styles.collapseIconExpanded}
            />
          </button>
          <button
            className={styles.closeMobileBtn}
            onClick={() => setIsOpen(false)}
            type="button"
            aria-label="Close menu"
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        <nav className={styles.sidebarNav} aria-label="Main">
          {navGroups.map((group, i) => (
            <div className={styles.navGroup} key={i}>
              {group.label && <div className={styles.navLabel}>{group.label}</div>}
              {group.items.map((item) => {
                const active = isActive(item);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`${styles.navItem} ${active ? styles.navItemActive : ''}`}
                    aria-current={active ? 'page' : undefined}
                    title={isCollapsed ? item.label : undefined}
                    onClick={() => setIsOpen(false)}
                  >
                    <Icon name={item.icon} size={18} className={styles.navIcon} />
                    <span className={styles.navLabelText}>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <button
            className={styles.footerLink}
            type="button"
            aria-label="Contact support"
            title={isCollapsed ? 'Contact support' : undefined}
          >
            <Icon name="phone" size={16} />
            <span>Contact support</span>
          </button>
          <span className={styles.version}>v1.0.0</span>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;