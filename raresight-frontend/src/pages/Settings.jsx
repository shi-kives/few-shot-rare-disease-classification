import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import HealthIndicator from '../components/HealthIndicator.jsx';
import styles from './Settings.module.css';

const Settings = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [showDisclaimer, setShowDisclaimer] = useState(true);
  const [showWelcome, setShowWelcome] = useState(true);

  useEffect(() => {
    const disclaimerDismissed =
      localStorage.getItem('rs_disclaimer_dismissed') === 'true';
    setShowDisclaimer(!disclaimerDismissed);

    const welcomeDismissed =
      localStorage.getItem('rs_welcome_dismissed') === 'true';
    setShowWelcome(!welcomeDismissed);
  }, []);

  const handleDisclaimerToggle = () => {
    const nextVal = !showDisclaimer;
    setShowDisclaimer(nextVal);
    if (nextVal) {
      localStorage.removeItem('rs_disclaimer_dismissed');
      showToast('Clinical disclaimer banner enabled', 'info');
    } else {
      localStorage.setItem('rs_disclaimer_dismissed', 'true');
      showToast('Clinical disclaimer banner hidden', 'info');
    }
  };

  const handleWelcomeToggle = () => {
    const nextVal = !showWelcome;
    setShowWelcome(nextVal);
    if (nextVal) {
      localStorage.removeItem('rs_welcome_dismissed');
      showToast('Welcome onboarding card enabled', 'info');
    } else {
      localStorage.setItem('rs_welcome_dismissed', 'true');
      showToast('Welcome onboarding card hidden', 'info');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>System Settings & Configuration</h1>
        <p className={styles.pageSubheading}>
          Review model telemetry, clinician profile details, and adjust workspace display preferences.
        </p>
      </div>

      <div className={styles.cardsStack}>
        {/* 1. Model Status */}
        <section aria-labelledby="model-status-title">
          <h2 id="model-status-title" style={{ display: 'none' }}>
            Model Status
          </h2>
          <HealthIndicator full={true} />
        </section>

        {/* 2. Clinician Profile & Session */}
        <section className={styles.card} aria-labelledby="account-info-title">
          <div className={styles.cardHeader}>
            <h2 id="account-info-title" className={styles.cardTitle}>
              Clinician Profile & Session
            </h2>
          </div>

          <div className={styles.accountGrid}>
            <div className={styles.accountItem}>
              <div className={styles.accountLabel}>Full Name</div>
              <div className={styles.accountValue}>{user?.name || 'Dr. Clinician'}</div>
            </div>
            <div className={styles.accountItem}>
              <div className={styles.accountLabel}>Registered Email</div>
              <div className={styles.accountValue}>{user?.email || 'clinician@hospital.org'}</div>
            </div>
            <div className={styles.accountItem}>
              <div className={styles.accountLabel}>Clinical Role</div>
              <div className={styles.accountValue}>{user?.role || 'Specialist Doctor'}</div>
            </div>
          </div>

          <div className={styles.comingSoonNote}>
            Edit profile, multi-factor authentication, and institutional credentials: <strong>Coming soon</strong>.
          </div>
        </section>

        {/* 3. Display Preferences */}
        <section className={styles.card} aria-labelledby="display-prefs-title">
          <div className={styles.cardHeader}>
            <h2 id="display-prefs-title" className={styles.cardTitle}>
              Display & Workspace Preferences
            </h2>
          </div>

          <div className={styles.toggleList}>
            <div className={styles.toggleRow}>
              <div className={styles.toggleInfo}>
                <span className={styles.toggleTitle}>Show clinical disclaimer banner</span>
                <span className={styles.toggleDescription}>
                  Displays the warning that predictions are decision support only.
                </span>
              </div>
              <label className={styles.switch}>
                <input
                  type="checkbox"
                  checked={showDisclaimer}
                  onChange={handleDisclaimerToggle}
                  aria-label="Toggle clinical disclaimer banner"
                />
                <span className={styles.slider} />
              </label>
            </div>

            <div className={styles.toggleRow}>
              <div className={styles.toggleInfo}>
                <span className={styles.toggleTitle}>Show welcome card</span>
                <span className={styles.toggleDescription}>
                  Displays guidance card on the Analyse page when history is empty.
                </span>
              </div>
              <label className={styles.switch}>
                <input
                  type="checkbox"
                  checked={showWelcome}
                  onChange={handleWelcomeToggle}
                  aria-label="Toggle welcome card"
                />
                <span className={styles.slider} />
              </label>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Settings;
