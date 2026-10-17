import React from 'react';
import Link from 'next/link';
import styles from '../../styles/layout.module.css';
import Icon from './Icons';

/**
 * An action row: icon, title, short description, and a trailing label.
 * `icon` can be an icon name from Icons.jsx (string) or any React node.
 * variant "primary" tints the icon red; "secondary" keeps it neutral.
 */
const FeatureCard = ({ icon, title, description, href, buttonText, variant = 'primary' }) => {
  const iconClass =
    variant === 'secondary' ? styles.actionIconNeutral : styles.actionIconBrand;

  const content = (
    <>
      <span className={`${styles.actionIcon} ${iconClass}`}>
        {typeof icon === 'string' ? <Icon name={icon} size={20} /> : icon}
      </span>
      <span className={styles.actionBody}>
        <span className={styles.actionTitle}>{title}</span>
        <span className={styles.actionDesc}>{description}</span>
      </span>
      {href && (
        <span className={styles.actionCta}>
          {buttonText || 'Open'}
          <Icon name="chevron" size={16} />
        </span>
      )}
    </>
  );

  return href ? (
    <Link href={href} className={styles.actionRow}>
      {content}
    </Link>
  ) : (
    <div className={styles.actionRow}>{content}</div>
  );
};

export default FeatureCard;