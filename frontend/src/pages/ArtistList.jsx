import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getArtists, uploadUrl, updateArtistStatus } from '../api';
import { formatRupiah } from '../currency';
import styles from './ArtistList.module.css';
import layoutStyles from './Studio.module.css';

const ROWS_PER_PAGE = 8;

function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;
  const pages = useMemo(() => {
    const items = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = start + maxVisible - 1;
    if (end > totalPages) {
      end = totalPages;
      start = Math.max(1, end - maxVisible + 1);
    }
    if (start > 1) {
      items.push(1);
      if (start > 2) items.push('...');
    }
    for (let i = start; i <= end; i++) items.push(i);
    if (end < totalPages) {
      if (end < totalPages - 1) items.push('...');
      items.push(totalPages);
    }
    return items;
  }, [currentPage, totalPages]);
  return (
    <div className={layoutStyles.pagination}>
      <button className={layoutStyles.pageBtn} disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)} aria-label="Previous page">&lsaquo;</button>
      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`e${i}`} className={layoutStyles.pageEllipsis}>&hellip;</span>
        ) : (
          <button key={p} className={`${layoutStyles.pageBtn} ${p === currentPage ? layoutStyles.pageBtnActive : ''}`} onClick={() => onPageChange(p)}>{p}</button>
        ),
      )}
      <button className={layoutStyles.pageBtn} disabled={currentPage === totalPages} onClick={() => onPageChange(currentPage + 1)} aria-label="Next page">&rsaquo;</button>
      <span className={layoutStyles.pageInfo}>{totalPages} pages</span>
    </div>
  );
}

export function ArtistList() {
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [savedId, setSavedId] = useState(null);
  const [page, setPage] = useState(1);
  const [statusModalArtist, setStatusModalArtist] = useState(null);

  const load = () => getArtists().then(setArtists).catch((e) => setError(e.message));

  useEffect(() => {
    load()
      .finally(() => setLoading(false));
  }, []);

  const totalPages = Math.max(1, Math.ceil(artists.length / ROWS_PER_PAGE));
  const paginatedArtists = artists.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

  const handleToggleActive = async (artist, next) => {
    setTogglingId(artist.id);
    setError(null);
    try {
      await updateArtistStatus(artist.id, next);
      setArtists((prev) => prev.map((a) => (a.id === artist.id ? { ...a, isActive: next } : a)));
      setSavedId(artist.id);
      setStatusModalArtist(null);
      setTimeout(() => setSavedId(null), 2000);
    } catch (e) {
      setError(e.message);
    } finally {
      setTogglingId(null);
    }
  };

  if (loading) return <div className={styles.loading}><span className={styles.spinner} /> Loading artists…</div>;
  if (error) return <div className={styles.error}>Error: {error}</div>;

  return (
    <section className={layoutStyles.section}>
      <div className={layoutStyles.sectionHead}>
        <div>
          <h2>Tattoo Artist</h2>
          {artists.length > 0 ? (
            <span className={layoutStyles.countHint}>
              Showing {(page - 1) * ROWS_PER_PAGE + 1}–{Math.min(page * ROWS_PER_PAGE, artists.length)} of {artists.length}
            </span>
          ) : null}
        </div>
        <Link to="/manage/artists/new" className={layoutStyles.addBtn}>+ Add Artist</Link>
      </div>
      <div className={layoutStyles.tableWrap}>
          <table className={layoutStyles.table}>
            <thead>
              <tr>
                <th>No.</th>
                <th>Photo</th>
                <th>Name</th>
                <th>Speciality</th>
                <th>Experience</th>
                <th>Rate</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {paginatedArtists.length === 0 ? (
                <tr>
                  <td colSpan={7} className={styles.emptyCell}>
                    No artists yet. <Link to="/manage/artists/new" className={layoutStyles.addBtn}>Add your first artist</Link>
                  </td>
                </tr>
              ) : (
                paginatedArtists.map((a, i) => {
                  const photos = safeParse(a.photos);
                  const thumb = photos[0];
                  const rowNum = (page - 1) * ROWS_PER_PAGE + i + 1;
                  return (
                    <tr key={a.id} className={a.isActive === false ? styles.rowInactive : ''}>
                      <td className={styles.cellNum}>{rowNum}</td>
                      <td className={styles.cellPhoto}>
                        {thumb ? (
                          <img src={uploadUrl(thumb)} alt={a.name} className={styles.photoThumb} />
                        ) : (
                          <div className={styles.photoPlaceholder}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="8" r="4"/><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/></svg>
                          </div>
                        )}
                      </td>
                      <td className={layoutStyles.cellEmphasis}>
                        <Link to={`/manage/artists/${a.id}`} className={styles.nameLink}>{a.name}</Link>
                      </td>
                      <td className={styles.cellSpec}>{a.speciality || '—'}</td>
                      <td className={styles.cellExp}>{a.experiences || '—'}</td>
                      <td className={layoutStyles.cellAmount}>{a.rate != null ? formatRupiah(a.rate) + ' / hr' : '—'}</td>
                      <td>
                        <button type="button" className={layoutStyles.smBtn} onClick={() => setStatusModalArtist(a)}>Change status</button>
                        <Link to={`/manage/artists/${a.id}/edit`} className={layoutStyles.smBtn}>Edit</Link>
                        <Link to={`/manage/artists/${a.id}/availability`} className={layoutStyles.smBtn}>Availability</Link>
                        <Link to={`/manage/artists/${a.id}`} className={layoutStyles.smBtn}>View</Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
      </div>
      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />

      {statusModalArtist && (
        <div
          className={layoutStyles.modal}
          role="dialog"
          aria-modal="true"
          aria-label="Change artist status"
          onClick={(e) => e.target === e.currentTarget && setStatusModalArtist(null)}
        >
          <div className={layoutStyles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3>Change status – {statusModalArtist.name}</h3>
            <p className={styles.modalHelp}>
              Current status: <strong>{statusModalArtist.isActive !== false ? 'Aktif' : 'Non-aktif'}</strong>
            </p>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={layoutStyles.smBtn}
                disabled={togglingId === statusModalArtist.id}
                onClick={() => handleToggleActive(statusModalArtist, true)}
              >
                {togglingId === statusModalArtist.id ? '…' : 'Set Aktif'}
              </button>
              <button
                type="button"
                className={layoutStyles.smBtn}
                disabled={togglingId === statusModalArtist.id}
                onClick={() => handleToggleActive(statusModalArtist, false)}
              >
                {togglingId === statusModalArtist.id ? '…' : 'Set Non-aktif'}
              </button>
              <button type="button" className={styles.modalCloseBtn} onClick={() => setStatusModalArtist(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function safeParse(str) {
  if (!str) return [];
  try {
    const v = JSON.parse(str);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
