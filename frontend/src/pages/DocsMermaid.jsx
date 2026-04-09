import { useEffect, useRef, useId } from 'react';
import mermaid from 'mermaid';
import styles from './Docs.module.css';

let mermaidInitialized = false;

export function MermaidBlock({ chart }) {
  const ref = useRef(null);
  const reactId = useId().replace(/:/g, '');

  useEffect(() => {
    if (!mermaidInitialized) {
      mermaid.initialize({
        startOnLoad: false,
        theme: 'neutral',
        securityLevel: 'loose',
        er: { fontSize: 12 },
      });
      mermaidInitialized = true;
    }
    const el = ref.current;
    if (!el || !chart?.trim()) return undefined;
    el.innerHTML = '';
    let cancelled = false;
    const renderId = `mmd-${reactId}-${Date.now()}`;
    mermaid
      .render(renderId, chart.trim())
      .then(({ svg }) => {
        if (!cancelled && el) el.innerHTML = svg;
      })
      .catch(() => {
        if (!cancelled && el) el.textContent = 'Could not render diagram.';
      });
    return () => {
      cancelled = true;
    };
  }, [chart, reactId]);

  return <div ref={ref} className={styles.mermaid} role="img" aria-label="Entity relationship diagram" />;
}
