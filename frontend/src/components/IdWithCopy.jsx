import { useState, useCallback } from 'react';
import styles from './IdWithCopy.module.css';

/**
 * Compact ID display with one-click copy. Shortcut: click the copy icon to copy ID.
 * @param {{ id: string, title?: string }} props
 */
export function IdWithCopy({ id, title }) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(() => {
    if (!id) return;
    navigator.clipboard.writeText(id).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [id]);

  if (id == null || id === '') return <span>—</span>;

  const display = id.length <= 10 ? id : `${id.slice(0, 6)}…${id.slice(-4)}`;

  return (
    <span className={styles.wrap} title={title ?? `ID: ${id}. Click copy to copy.`}>
      <span className={styles.id}>{display}</span>
      <button
        type="button"
        className={styles.copyBtn}
        onClick={copy}
        title={copied ? 'Copied!' : 'Copy ID'}
        aria-label={copied ? 'Copied!' : 'Copy ID'}
      >
        {copied ? (
          <span className={styles.check} aria-hidden>✓</span>
        ) : (
          <span className={styles.icon} aria-hidden>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
          </span>
        )}
      </button>
    </span>
  );
}
