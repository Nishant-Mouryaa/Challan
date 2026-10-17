import React, { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import styles from '../../styles/layout.module.css';

const MainLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarPreferenceLoaded, setSidebarPreferenceLoaded] = useState(false);

  useEffect(() => {
    try {
      setSidebarCollapsed(window.localStorage.getItem('sidebarCollapsed') === 'true');
    } catch (error) {
      console.error('Unable to load sidebar preference:', error);
    } finally {
      setSidebarPreferenceLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!sidebarPreferenceLoaded) return;

    try {
      window.localStorage.setItem('sidebarCollapsed', String(sidebarCollapsed));
    } catch (error) {
      console.error('Unable to save sidebar preference:', error);
    }
  }, [sidebarCollapsed, sidebarPreferenceLoaded]);

  return (
    <div
      className={`${styles.mainLayout} ${
        sidebarCollapsed ? styles.mainLayoutCollapsed : ''
      }`}
    >
      <a href="#main-content" className={styles.skipLink}>
        Skip to content
      </a>

      <Sidebar
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        isCollapsed={sidebarCollapsed}
        setIsCollapsed={setSidebarCollapsed}
      />

      <div className={styles.mainContent}>
        <Header isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
        <main id="main-content" className={styles.contentArea}>
          <div className={styles.contentInner}>{children}</div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;