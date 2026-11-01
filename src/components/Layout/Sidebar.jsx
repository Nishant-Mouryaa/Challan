import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

import styles from '../../styles/layout.module.css';
import Icon from './Icons';

const navGroups = [
  {
    label: null,
    items: [
      {
        label: 'Dashboard',
        icon: 'dashboard',
        href: '/',
      },
    ],
  },
  {
    label: 'Delivery challans',
    items: [
      {
        label: 'Create challan',
        icon: 'file-plus',
        href: '/create-challan',
      },
      {
        label: 'All challans',
        icon: 'files',
        href: '/view-challans',
      },
    ],
  },
  {
    label: 'International invoices',
    items: [
      {
        label: 'Create invoice',
        icon: 'globe',
        href: '/international-invoice',
      },
      {
        label: 'All invoices',
        icon: 'receipt',
        href: '/view-international-invoices',
        match: [
          '/view-international-invoices',
          '/edit-international-invoice',
        ],
      },
    ],
  },
  {
  label: 'Courier reporting',
  items: [
    {
      label: 'DTDC MIS',
      icon: 'files',
      href: '/dtdc-mis',
    },
  ],
},
  {
    label: 'Workspace',
    items: [
      {
        label: 'Business setup',
        icon: 'settings',
        href: '/settings',
      },
      {
        label: 'Plans and billing',
        icon: 'receipt',
        href: '/billing',
      },
    ],
  },
];

const matchesRoute = (pathname, route) => {
  if (route === '/') return pathname === '/';

  return (
    pathname === route ||
    pathname.startsWith(`${route}/`)
  );
};

const Sidebar = ({
  isOpen,
  setIsOpen,
  isCollapsed,
  setIsCollapsed,
  onContactSupport,
}) => {
  const router = useRouter();
  const mobileCloseRef = useRef(null);

  const isActive = (item) =>
    (item.match || [item.href]).some((route) =>
      matchesRoute(router.pathname, route)
    );

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousFocus = document.activeElement;
    const closeButton = mobileCloseRef.current;

    if (closeButton?.getClientRects().length) {
      closeButton.focus();
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('keydown', handleEscape);

      if (
        previousFocus instanceof HTMLElement &&
        previousFocus.isConnected
      ) {
        previousFocus.focus();
      }
    };
  }, [isOpen, setIsOpen]);

  return (
    <>
      {isOpen && (
        <div
          className={styles.sidebarOverlay}
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={[
          styles.sidebar,
          styles.sidebarPolished,
          isOpen ? styles.sidebarOpen : '',
          isCollapsed ? styles.sidebarCollapsed : '',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-label="Application navigation"
      >
        <div className={styles.sidebarHeader}>
          <Link
            href="/"
            className={styles.brand}
            aria-label="DC System dashboard"
            onClick={() => setIsOpen(false)}
          >
            <span className={styles.brandMark}>
              <Icon name="package" size={20} />
            </span>

            <span className={styles.brandText}>
              <span className={styles.brandName}>
                DC System
              </span>

              <span className={styles.brandSub}>
                Shipping workspace
              </span>
            </span>
          </Link>

          <button
            className={styles.collapseSidebarBtn}
            onClick={() =>
              setIsCollapsed((collapsed) => !collapsed)
            }
            type="button"
            aria-label={
              isCollapsed
                ? 'Expand sidebar'
                : 'Collapse sidebar'
            }
            aria-expanded={!isCollapsed}
            title={
              isCollapsed
                ? 'Expand sidebar'
                : 'Collapse sidebar'
            }
          >
            <Icon
              name="chevron"
              size={17}
              className={
                isCollapsed
                  ? ''
                  : styles.collapseIconExpanded
              }
            />
          </button>

          <button
            ref={mobileCloseRef}
            className={styles.closeMobileBtn}
            onClick={() => setIsOpen(false)}
            type="button"
            aria-label="Close menu"
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        <nav
          className={styles.sidebarNav}
          aria-label="Main navigation"
        >
          {navGroups.map((group, index) => (
            <div
              className={styles.navGroup}
              key={group.label || `group-${index}`}
            >
              {group.label && (
                <div className={styles.navLabel}>
                  {group.label}
                </div>
              )}

              {group.items.map((item) => {
                const active = isActive(item);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={[
                      styles.navItem,
                      active ? styles.navItemActive : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    aria-label={item.label}
                    aria-current={
                      active ? 'page' : undefined
                    }
                    title={isCollapsed ? item.label : undefined}
                    onClick={() => setIsOpen(false)}
                  >
                    <Icon
                      name={item.icon}
                      size={18}
                      className={styles.navIcon}
                    />

                    <span className={styles.navLabelText}>
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          {onContactSupport && (
            <button
              className={styles.footerLink}
              type="button"
              onClick={onContactSupport}
              aria-label="Contact support"
              title={
                isCollapsed ? 'Contact support' : undefined
              }
            >
              <Icon name="phone" size={16} />
              <span>Contact support</span>
            </button>
          )}

          <span className={styles.version}>v1.0.0</span>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;