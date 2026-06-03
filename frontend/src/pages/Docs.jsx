// Bundled from frontend/DOCUMENTATION.md (synced from repo root via npm prebuild)
import docSource from '../../DOCUMENTATION.md?raw';
import { MermaidBlock } from './DocsMermaid';
import styles from './Docs.module.css';

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function stripLeadingBlankLines(lines) {
  const arr = [...lines];
  while (arr.length && arr[0].trim() === '') arr.shift();
  return arr;
}

/** Split markdown into line chunks: preamble (before first ##), then each ## block includes its heading line. */
function splitIntoH2Chunks(md) {
  const lines = md.split('\n');
  const chunks = [];
  let buf = [];
  for (const line of lines) {
    if (line.startsWith('## ') && !line.startsWith('###')) {
      if (buf.length) chunks.push(buf);
      buf = [line];
    } else {
      buf.push(line);
    }
  }
  if (buf.length) chunks.push(buf);
  return chunks;
}

function chunksToSections(chunks) {
  const sections = [];
  chunks.forEach((chunk, i) => {
    const first = chunk[0];
    if (i === 0 && first && !first.startsWith('## ')) {
      let body = [...chunk];
      while (body[0]?.startsWith('# ') && !body[0]?.startsWith('##')) body.shift();
      body = stripLeadingBlankLines(body);
      if (body.length) {
        sections.push({ id: 'introduction', title: 'Introduction', body });
      }
      return;
    }
    if (first?.startsWith('## ') && !first.startsWith('###')) {
      const title = first.slice(3).trim();
      const body = stripLeadingBlankLines(chunk.slice(1));
      sections.push({ id: slugify(title) || `section-${sections.length}`, title, body });
    }
  });
  return sections;
}

function parseTableRow(line) {
  const t = line.trim();
  if (!t.startsWith('|') || !t.endsWith('|')) return null;
  return t
    .slice(1, -1)
    .split('|')
    .map((c) => c.trim());
}

function isTableSeparator(line) {
  const t = line.trim();
  if (!t.includes('|')) return false;
  const inner = t.replace(/^\|/, '').replace(/\|$/, '');
  return /^[\s\-:|]+$/.test(inner);
}

/**
 * Markdown subset inside one section: ### headings, lists, fences, hr, paragraphs, pipe tables.
 */
function renderSectionBody(lines, keyPrefix) {
  const out = [];
  let i = 0;
  let key = 0;
  const k = () => `${keyPrefix}-${key++}`;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('```')) {
      const fenceLang = line.replace(/^```/, '').trim();
      i += 1;
      const code = [];
      while (i < lines.length && !lines[i].startsWith('```')) {
        code.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) i += 1;
      const body = code.join('\n');
      if (fenceLang === 'mermaid') {
        out.push(<MermaidBlock key={k()} chart={body} />);
      } else {
        out.push(
          <pre key={k()}>
            <code>{body}</code>
          </pre>,
        );
      }
      continue;
    }

    if (line.startsWith('### ')) {
      out.push(<h3 key={k()}>{line.slice(4)}</h3>);
      i += 1;
      continue;
    }

    if (line.startsWith('## ')) {
      out.push(<h3 key={k()}>{line.slice(3)}</h3>);
      i += 1;
      continue;
    }

    if (line.startsWith('# ') && !line.startsWith('##')) {
      i += 1;
      continue;
    }

    if (line.trim() === '---') {
      out.push(<hr key={k()} />);
      i += 1;
      continue;
    }

    if (line.trim().startsWith('|')) {
      const header = parseTableRow(line);
      if (header && header.length > 0) {
        i += 1;
        if (i < lines.length && isTableSeparator(lines[i])) {
          i += 1;
        }
        const body = [];
        while (i < lines.length && lines[i].trim().startsWith('|')) {
          if (isTableSeparator(lines[i])) {
            i += 1;
            continue;
          }
          const row = parseTableRow(lines[i]);
          if (row) body.push(row);
          i += 1;
        }
        out.push(
          <div key={k()} className={styles.tableWrap}>
            <table className={styles.docTable}>
              <thead>
                <tr>
                  {header.map((cell, j) => (
                    <th key={j}>{cell}</th>
                  ))}
                </tr>
              </thead>
              {body.length > 0 && (
                <tbody>
                  {body.map((row, ri) => (
                    <tr key={ri}>
                      {row.map((cell, ci) => (
                        <td key={ci}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              )}
            </table>
          </div>,
        );
        continue;
      }
    }

    if (line.startsWith('- ') || line.startsWith('* ')) {
      const items = [];
      while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('* '))) {
        items.push(lines[i].slice(2));
        i += 1;
      }
      out.push(
        <ul key={k()}>
          {items.map((t, j) => (
            <li key={j}>{t}</li>
          ))}
        </ul>,
      );
      continue;
    }
    if (line.trim() === '') {
      i += 1;
      continue;
    }

    const para = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].startsWith('#') &&
      !lines[i].startsWith('- ') &&
      !lines[i].startsWith('* ') &&
      !lines[i].startsWith('```') &&
      lines[i].trim() !== '---' &&
      !lines[i].trim().startsWith('|')
    ) {
      para.push(lines[i]);
      i += 1;
    }
    out.push(<p key={k()}>{para.join(' ')}</p>);
  }

  return out;
}

export function Docs() {
  const sections = chunksToSections(splitIntoH2Chunks(docSource));

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <h1 className={styles.title}>Documentation</h1>
        <p className={styles.lead}>
          Post.Ink roles, data model, constants, and diagrams. Source: <code>DOCUMENTATION.md</code> (synced from the repo root on build).
        </p>
      </header>

      <div className={styles.layout}>
        {sections.length > 0 && (
          <aside className={styles.toc} aria-label="On this page">
            <p className={styles.tocLabel}>On this page</p>
            <nav className={styles.tocNav}>
              {sections.map((s) => (
                <a key={s.id} href={`#${s.id}`} className={styles.tocLink}>
                  {s.title}
                </a>
              ))}
            </nav>
          </aside>
        )}

        <div className={styles.main}>
          {sections.map((s) => (
            <section key={s.id} id={s.id} className={styles.section} aria-labelledby={`${s.id}-heading`}>
              <h2 className={styles.sectionHeading} id={`${s.id}-heading`}>
                {s.title}
              </h2>
              <div className={styles.sectionBody}>{renderSectionBody(s.body, s.id)}</div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
