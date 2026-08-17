import React from 'react';
import styles from './Toast.module.css';

const Toast = ({ id, message, type = 'info', onDismiss }) => {
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <span className={`${styles.icon} ${styles.iconSuccess}`}>✓</span>;
      case 'error':
        return <span className={`${styles.icon} ${styles.iconError}`}>⚠</span>;
      case 'info':
      default:
        return <span className={`${styles.icon} ${styles.iconInfo}`}>ℹ</span>;
    }
  };

  const getTypeClass = () => {
    switch (type) {
      case 'success':
        return styles.success;
      case 'error':
        return styles.error;
      case 'info':
      default:
        return styles.info;
    }
  };

  return (
    <div className={`${styles.toast} ${getTypeClass()}`} role="alert">
      {getIcon()}
      <span className={styles.message}>{message}</span>
      <button
        type="button"
        className={styles.closeButton}
        onClick={() => onDismiss(id)}
        aria-label="Dismiss notification"
      >
        ✕
      </button>
    </div>
  );
};

export default Toast;
