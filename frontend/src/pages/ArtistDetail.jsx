import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { getArtist, deleteArtist, uploadUrl } from '../api';
import { formatRupiah, formatWithConversion } from '../currency';
import styles from './ArtistDetail.module.css';

export function ArtistDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isManage = location.pathname.startsWith('/manage');
  const [artist, setArtist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getArtist(id)
      .then(setArtist)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm('Delete this artist? This cannot be undone.')) return;
    try {
      await deleteArtist(id);
      navigate('/manage/artists');
    } catch (e) {
      setError(e.message);
    }
  };

  if (loading) return <div className={styles.loading}>Loading…</div>;
  if (error) return <div className={styles.error}>Error: {error}</div>;
  if (!artist) return null;

  if (!isManage && artist.isActive === false) {
    return (
      <div className={styles.wrap}>
        <div className={styles.toolbar}>
          <Link to="/">← Discover</Link>
        </div>
        <div className={styles.unavailableBlock}>
          <p>This tattoo artist is not currently available.</p>
          <Link to="/">Browse active artists</Link>
        </div>
      </div>
    );
  }

  const photos = safeParse(artist.photos);
  const portfolio = safeParse(artist.portfolio);
  const conv = artist.rate ? formatWithConversion(artist.rate) : null;

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        {isManage ? (
          <Link to="/manage/artists">← Artists</Link>
        ) : (
          <Link to="/">← Discover</Link>
        )}
        {isManage && (
          <div className={styles.actions}>
            <Link to={`/manage/artists/${id}/availability`} className={styles.availBtn}>Availability</Link>
            <Link to={`/manage/artists/${id}/edit`} className={styles.editBtn}>Edit</Link>
            <button type="button" onClick={handleDelete} className={styles.delBtn}>Delete</button>
          </div>
        )}
      </div>

      <div className={styles.hero}>
        {photos[0] ? (
          <img src={uploadUrl(photos[0])} alt={artist.name} className={styles.heroImg} />
        ) : (
          <div className={styles.heroPlaceholder}>No photo</div>
        )}
        <div className={styles.heroInfo}>
          <h1>{artist.name}</h1>
          {artist.speciality && <span className={styles.speciality}>{artist.speciality}</span>}
          {artist.experiences && <p className={styles.experiences}>{artist.experiences} experience</p>}
          {artist.rate != null && (
            <div className={styles.rateCard}>
              <span className={styles.rateLabel}>Session Rate</span>
              <span className={styles.rateAmount}>{formatRupiah(artist.rate)}</span>
              <span className={styles.ratePer}>per hour</span>
              {conv && <span className={styles.rateConv}>≈ {conv.usd} USD / hr</span>}
            </div>
          )}
          {artist.shortDescription && <p className={styles.desc}>{artist.shortDescription}</p>}
          <Link to={`/artists/${id}/book`} className={styles.bookBtn}>Book a Session</Link>
        </div>
      </div>

      {photos.length > 1 && (
        <section className={styles.section}>
          <h2>Photos</h2>
          <div className={styles.gallery}>
            {photos.slice(1).map((url, i) => (
              <img key={i} src={uploadUrl(url)} alt="" />
            ))}
          </div>
        </section>
      )}

      {portfolio.length > 0 && (
        <section className={styles.section}>
          <h2>Portfolio</h2>
          <div className={styles.gallery}>
            {portfolio.map((url, i) => (
              <img key={i} src={uploadUrl(url)} alt="" />
            ))}
          </div>
        </section>
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
