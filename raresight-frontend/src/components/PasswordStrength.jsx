import React from 'react';
import styles from './PasswordStrength.module.css';

const PasswordStrength = ({ password = '' }) => {
  const getStrength = (pwd) => {
    if (!pwd) return { score: 0, label: '', level: 'none' };
    const hasNumbers = /\d/.test(pwd);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pwd);
    const length = pwd.length;

    if (length >= 10 && hasNumbers && hasSpecial) {
      return { score: 3, label: 'Strong', level: 'strong' };
    }
    if (length >= 8 && hasNumbers) {
      return { score: 2, label: 'Fair', level: 'fair' };
    }
    return { score: 1, label: 'Weak', level: 'weak' };
  };

  const { score, label, level } = getStrength(password);

  if (!password) {
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.barsContainer}>
        <div
          className={`${styles.segment} ${
            score >= 1
              ? level === 'strong'
                ? styles.segmentStrong
                : level === 'fair'
                ? styles.segmentFair
                : styles.segmentWeak
              : ''
          }`}
        />
        <div
          className={`${styles.segment} ${
            score >= 2
              ? level === 'strong'
                ? styles.segmentStrong
                : styles.segmentFair
              : ''
          }`}
        />
        <div
          className={`${styles.segment} ${
            score >= 3 ? styles.segmentStrong : ''
          }`}
        />
      </div>
      <span
        className={`${styles.label} ${
          level === 'strong'
            ? styles.labelStrong
            : level === 'fair'
            ? styles.labelFair
            : styles.labelWeak
        }`}
      >
        {label}
      </span>
    </div>
  );
};

export default PasswordStrength;
