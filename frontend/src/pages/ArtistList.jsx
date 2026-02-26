import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getArtists } from '../api';
import { uploadUrl } from '../api';
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

  if (loading) return <div className={styles.loading}>Loading artists…</div>;
  if (error) return <div className={styles.error}>Error: {error}</div>;

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <h1>Tattoo Artists</h1>
        <Link to="/artists/new" className={styles.addBtn}>+ Add Artist</Link>
      </div>
      <ul className={styles.grid}>
        {artists.map((a) => {
          const photos = safeParse(a.photos);
          const thumb = photos[0];
          return (
            <li key={a.id} className={styles.card}>
              <Link to={`/artists/${a.id}`} className={styles.cardLink}>
                <div className={styles.thumb}>
                  {thumb ? (
                    <img src={uploadUrl(thumb)} alt={a.name} />
                  ) : (
                    <div className={styles.placeholder}>No photo</div>
                  )}
                </div>
                <div className={styles.cardBody}>
                  <h2>{a.name}</h2>
                  {a.speciality && <span className={styles.speciality}>{a.speciality}</span>}
                  {a.shortDescription && <p className={styles.desc}>{a.shortDescription}</p>}
                </div>
              </Link>
              <div className={styles.actions}>
                <Link to={`/artists/${a.id}/availability`} className={styles.availLink}>Availability</Link>
                <Link to={`/artists/${a.id}/edit`} className={styles.editLink}>Edit</Link>
              </div>
            </li>
          );
        })}
      </ul>
      {artists.length === 0 && (
        <p className={styles.empty}>No artists yet. <Link to="/artists/new">Add the first one</Link>.</p>
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
