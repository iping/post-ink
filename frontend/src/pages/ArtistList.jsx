import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getArtists, uploadUrl, updateArtistStatus } from '../api';
import { formatRupiah } from '../currency';
import styles from './ArtistList.module.css';

export function ArtistList() {
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [savedId, setSavedId] = useState(null);

  const load = () => getArtists().then(setArtists).catch((e) => setError(e.message));

  useEffect(() => {
    load()
      .finally(() => setLoading(false));
  }, []);

  const handleToggleActive = async (artist) => {
    const next = !(artist.isActive !== false);
    setTogglingId(artist.id);
    setError(null);
    try {
      await updateArtistStatus(artist.id, next);
      setArtists((prev) => prev.map((a) => (a.id === artist.id ? { ...a, isActive: next } : a)));
      setSavedId(artist.id);
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
    <div className={styles.wrap}>
      <div className={styles.head}>
        <div>
          <h1>Tattoo Artist Management</h1>
          <p className={styles.headSub}>Manage your tattoo artists</p>
        </div>
        <Link to="/manage/artists/new" className={styles.addBtn}>+ Add Artist</Link>
      </div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>No.</th>
              <th>Photo</th>
              <th>Name</th>
              <th>Speciality</th>
              <th>Experience</th>
              <th>Rate</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {artists.length === 0 ? (
              <tr>
                <td colSpan={8} className={styles.emptyCell}>
                  No artists yet. <Link to="/manage/artists/new" className={styles.addBtn}>Add your first artist</Link>
                </td>
              </tr>
            ) : (
              artists.map((a, i) => {
                const photos = safeParse(a.photos);
                const thumb = photos[0];
                return (
                  <tr key={a.id} className={a.isActive === false ? styles.rowInactive : ''}>
                    <td className={styles.cellNum}>{i + 1}</td>
                    <td className={styles.cellPhoto}>
                      {thumb ? (
                        <img src={uploadUrl(thumb)} alt={a.name} className={styles.photoThumb} />
                      ) : (
                        <div className={styles.photoPlaceholder}>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="8" r="4"/><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/></svg>
                        </div>
                      )}
                    </td>
                    <td className={styles.cellName}>
                      <Link to={`/manage/artists/${a.id}`} className={styles.nameLink}>{a.name}</Link>
                    </td>
                    <td className={styles.cellSpec}>{a.speciality || '—'}</td>
                    <td className={styles.cellExp}>{a.experiences || '—'}</td>
                    <td className={styles.cellRate}>{a.rate != null ? formatRupiah(a.rate) + ' / hr' : '—'}</td>
                    <td className={styles.cellStatus}>
                      <span className={a.isActive === false ? styles.badgeInactive : styles.badgeActive}>
                        {a.isActive !== false ? 'Aktif' : 'Non-aktif'}
                      </span>
                      <button
                        type="button"
                        className={styles.toggleBtn}
                        onClick={() => handleToggleActive(a)}
                        disabled={togglingId === a.id}
                        aria-label={a.isActive !== false ? 'Set non-aktif' : 'Set aktif'}
                        title={a.isActive !== false ? 'Set non-aktif' : 'Set aktif'}
                      >
                        {togglingId === a.id ? '…' : (a.isActive !== false ? 'On' : 'Off')}
                      </button>
                      {savedId === a.id && <span className={styles.savedLabel}>Saved</span>}
                    </td>
                    <td className={styles.cellActions}>
                      <Link to={`/manage/artists/${a.id}/edit`} className={styles.tableBtn}>Edit</Link>
                      <Link to={`/manage/artists/${a.id}/availability`} className={styles.tableBtn}>Availability</Link>
                      <Link to={`/manage/artists/${a.id}`} className={styles.tableBtn}>View</Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
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
