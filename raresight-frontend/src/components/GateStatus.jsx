import React from 'react';
import styles from './GateStatus.module.css';

const GateStatus = ({ gates = {} }) => {
  // Support various backend payload formats
  const similarityPassed =
    gates.similarity_threshold_passed ??
    gates.similarity_passed ??
    gates.threshold_passed ??
    true;

  const dispersionPassed =
    gates.prototype_dispersion_passed ??
    gates.dispersion_passed ??
    gates.dispersion_ok ??
    true;

  const oodPassed =
    gates.ood_status_passed ??
    gates.ood_passed ??
    gates.in_distribution ??
    !gates.is_ood ??
    true;

  const gateItems = [
    {
      label: 'Similarity Threshold',
      passed: similarityPassed,
      passedText: 'Similarity Threshold: Passed',
      flaggedText: 'Similarity Threshold: Flagged',
    },
    {
      label: 'Prototype Dispersion',
      passed: dispersionPassed,
      passedText: 'Prototype Dispersion: Normal',
      flaggedText: 'Prototype Dispersion: High Variance',
    },
    {
      label: 'OOD Status',
      passed: oodPassed,
      passedText: 'OOD Status: In-Distribution',
      flaggedText: 'OOD Status: Out-of-Distribution',
    },
  ];

  return (
    <div className={styles.container} aria-label="Diagnostic Gate Checks">
      {gateItems.map((gate, index) => (
        <span
          key={index}
          className={`${styles.pill} ${
            gate.passed ? styles.passed : styles.flagged
          }`}
          title={gate.passed ? gate.passedText : gate.flaggedText}
        >
          <span className={styles.icon}>{gate.passed ? '✓' : '⚠'}</span>
          <span>{gate.label}</span>
        </span>
      ))}
    </div>
  );
};

export default GateStatus;
