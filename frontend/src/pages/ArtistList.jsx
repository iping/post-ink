import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getArtists, uploadUrl } from '../api';
import { formatRupiah } from '../currency';
import styles from './ArtistList.module.css';

export function ArtistList() {
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getArtists()
      .then(setArtists)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className={styles.loading}><span className={styles.spinner} /> Loading artists…</div>;
  if (error) return <div className={styles.error}>Error: {error}</div>;

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <div>
          <h1>Our Artists</h1>
          <p className={styles.headSub}>World-class tattoo artists, each with a unique vision</p>
        </div>
        <Link to="/manage/artists/new" className={styles.addBtn}>+ Add Artist</Link>
      </div>
      <ul className={styles.grid}>
        {artists.map((a) => {
          const photos = safeParse(a.photos);
          const portfolio = safeParse(a.portfolio);
          const thumb = photos[0];
          const workSample = portfolio[0];
          return (
            <li key={a.id} className={styles.card}>
              <Link to={`/manage/artists/${a.id}`} className={styles.cardLink}>
                <div className={styles.thumbWrap}>
                  {thumb ? (
                    <img src={uploadUrl(thumb)} alt={a.name} className={styles.thumb} />
                  ) : (
                    <div className={styles.placeholder}>
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="8" r="4"/><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/></svg>
                    </div>
                  )}
                  {workSample && (
                    <div className={styles.workPreview}>
                      <img src={uploadUrl(workSample)} alt="Work sample" />
                    </div>
                  )}
                </div>
                <div className={styles.cardBody}>
                  <h2>{a.name}</h2>
                  {a.speciality && <span className={styles.speciality}>{a.speciality}</span>}
                  {a.experiences && <span className={styles.exp}>{a.experiences} experience</span>}
                  {a.rate != null && <span className={styles.rate}>{formatRupiah(a.rate)} / hr</span>}
                  {a.shortDescription && <p className={styles.desc}>{a.shortDescription}</p>}
                </div>
              </Link>
              <div className={styles.actions}>
                <Link to={`/manage/artists/${a.id}/availability`} className={styles.actionBtn}>Availability</Link>
                <Link to={`/manage/artists/${a.id}/edit`} className={styles.actionBtn}>Edit</Link>
                <Link to={`/manage/artists/${a.id}`} className={`${styles.actionBtn} ${styles.viewBtn}`}>View Profile</Link>
              </div>
            </li>
          );
        })}
      </ul>
      {artists.length === 0 && (
        <div className={styles.empty}>
          <p>No artists yet.</p>
          <Link to="/manage/artists/new" className={styles.addBtn}>Add your first artist</Link>
        </div>
      )}
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
