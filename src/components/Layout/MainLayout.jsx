import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import styles from '../../styles/layout.module.css';

const MainLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className={styles.mainLayout}>
      <a href="#main-content" className={styles.skipLink}>
        Skip to content
      </a>

      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

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