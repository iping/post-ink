import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getArtists, getAvailability, getReviews, uploadUrl } from '../api';
import { formatRupiah, formatWithConversion } from '../currency';
import styles from './Discover.module.css';

function safeParse(str) {
  if (!str) return [];
  try {
    const v = JSON.parse(str);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function getAllStyles(artists) {
  const set = new Set();
  for (const a of artists) {
    if (!a.speciality) continue;
    a.speciality.split(',').forEach((s) => {
      const trimmed = s.trim();
      if (trimmed) set.add(trimmed);
    });
  }
  return [...set].sort();
}

export function Discover() {
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [availability, setAvailability] = useState([]);
  const [loadingAvail, setLoadingAvail] = useState(false);
  const [artistReviews, setArtistReviews] = useState([]);
  const [lightboxImg, setLightboxImg] = useState(null);

  useEffect(() => {
    getArtists()
      .then(setArtists)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const allStyles = getAllStyles(artists);

  const filtered = artists.filter((a) => {
    if (filter && !(a.speciality || '').toLowerCase().includes(filter.toLowerCase())) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (a.name || '').toLowerCase().includes(q) ||
        (a.speciality || '').toLowerCase().includes(q) ||
        (a.shortDescription || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const openProfile = async (artist) => {
    setSelectedArtist(artist);
    setLoadingAvail(true);
    setArtistReviews([]);
    try {
      const today = new Date();
      const from = today.toISOString().slice(0, 10);
      const future = new Date(today);
      future.setDate(future.getDate() + 30);
      const to = future.toISOString().slice(0, 10);
      const [slots, reviews] = await Promise.all([
        getAvailability(artist.id, from, to),
        getReviews({ artistId: artist.id }),
      ]);
      setAvailability(slots.filter((s) => s.isAvailable));
      setArtistReviews(reviews);
    } catch {
      setAvailability([]);
      setArtistReviews([]);
    } finally {
      setLoadingAvail(false);
    }
  };

  const closeProfile = () => {
    setSelectedArtist(null);
    setAvailability([]);
    setArtistReviews([]);
  };

  const availByDate = {};
  for (const s of availability) {
    if (!availByDate[s.date]) availByDate[s.date] = [];
    availByDate[s.date].push(s);
  }
  const availDates = Object.keys(availByDate).sort().slice(0, 10);

  if (loading) {
    return (
      <div className={styles.loadingWrap}>
        <span className={styles.spinner} />
        <span>Discovering artists…</span>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <section className={styles.hero}>
        <h1>Find Your Artist</h1>
        <p>Browse our roster of professional tattoo artists. Explore their style, portfolio, and availability to find the perfect match for your next piece.</p>
      </section>

      <div className={styles.controls}>
        <div className={styles.searchWrap}>
          <svg className={styles.searchIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></svg>
          <input
            type="text"
            placeholder="Search by name, style, or keyword…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        <div className={styles.filters}>
          <button
            type="button"
            className={`${styles.chip} ${!filter ? styles.chipActive : ''}`}
            onClick={() => setFilter('')}
          >
            All Styles
          </button>
          {allStyles.map((s) => (
            <button
              key={s}
              type="button"
              className={`${styles.chip} ${filter === s ? styles.chipActive : ''}`}
              onClick={() => setFilter(filter === s ? '' : s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className={styles.empty}>
          <p>No artists found matching your criteria.</p>
          <button type="button" className={styles.clearBtn} onClick={() => { setFilter(''); setSearch(''); }}>Clear filters</button>
        </div>
      ) : (
        <div className={styles.grid}>
          {filtered.map((a) => {
            const photos = safeParse(a.photos);
            const portfolio = safeParse(a.portfolio);
            const revs = a.reviews || [];
            const avg = revs.length > 0 ? Math.round((revs.reduce((s, r) => s + r.rating, 0) / revs.length) * 10) / 10 : null;
            return (
              <article key={a.id} className={styles.card} onClick={() => openProfile(a)}>
                <div className={styles.cardImg}>
                  {photos[0] ? (
                    <img src={uploadUrl(photos[0])} alt={a.name} />
                  ) : (
                    <div className={styles.cardPlaceholder}>
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><circle cx="12" cy="8" r="4"/><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/></svg>
                    </div>
                  )}
                  {portfolio.length > 0 && (
                    <div className={styles.portfolioCount}>{portfolio.length} works</div>
                  )}
                </div>
                <div className={styles.cardContent}>
                  <h3>{a.name}</h3>
                  {avg != null && (
                    <div className={styles.cardRating}>
                      <span className={styles.cardStars}>{'★'.repeat(Math.round(avg))}</span>
                      <span className={styles.cardRatingNum}>{avg}</span>
                      <span className={styles.cardReviewCount}>({revs.length})</span>
                    </div>
                  )}
                  {a.speciality && (
                    <div className={styles.tags}>
                      {a.speciality.split(',').map((s) => (
                        <span key={s.trim()} className={styles.tag}>{s.trim()}</span>
                      ))}
                    </div>
                  )}
                  {a.experiences && <span className={styles.exp}>{a.experiences} experience</span>}
                  {a.shortDescription && <p className={styles.cardDesc}>{a.shortDescription}</p>}
                  <span className={styles.viewProfile}>View profile & portfolio</span>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {selectedArtist && (
        <div className={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) closeProfile(); }}>
          <div className={styles.profilePanel}>
            <button type="button" className={styles.closeBtn} onClick={closeProfile}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>

            <div className={styles.profileHero}>
              {(() => {
                const photos = safeParse(selectedArtist.photos);
                return photos[0] ? (
                  <img src={uploadUrl(photos[0])} alt={selectedArtist.name} className={styles.profileImg} />
                ) : (
                  <div className={styles.profileImgPlaceholder}>
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><circle cx="12" cy="8" r="4"/><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/></svg>
                  </div>
                );
              })()}
              <div className={styles.profileInfo}>
                <h2>{selectedArtist.name}</h2>
                {selectedArtist.speciality && (
                  <div className={styles.profileTags}>
                    {selectedArtist.speciality.split(',').map((s) => (
                      <span key={s.trim()} className={styles.profileTag}>{s.trim()}</span>
                    ))}
                  </div>
                )}
                {selectedArtist.experiences && <p className={styles.profileExp}>{selectedArtist.experiences} experience</p>}
                {selectedArtist.rate != null && (
                  <div className={styles.profileRate}>
                    <span className={styles.profileRateAmount}>{formatRupiah(selectedArtist.rate)}</span>
                    <span className={styles.profileRatePer}> / hr</span>
                    <span className={styles.profileRateConv}>≈ {formatWithConversion(selectedArtist.rate).usd} USD</span>
                  </div>
                )}
                {selectedArtist.shortDescription && <p className={styles.profileDesc}>{selectedArtist.shortDescription}</p>}
                <Link
                  to={`/artists/${selectedArtist.id}/book`}
                  className={styles.heroBookBtn}
                  onClick={closeProfile}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                  Book a Session
                </Link>
              </div>
            </div>

            {(() => {
              const portfolio = safeParse(selectedArtist.portfolio);
              if (portfolio.length === 0) return null;
              return (
                <section className={styles.portfolioSection}>
                  <h3>Portfolio</h3>
                  <div className={styles.portfolioGrid}>
                    {portfolio.map((url, i) => (
                      <button
                        key={i}
                        type="button"
                        className={styles.portfolioItem}
                        onClick={(e) => { e.stopPropagation(); setLightboxImg(uploadUrl(url)); }}
                      >
                        <img src={uploadUrl(url)} alt={`Work ${i + 1}`} />
                      </button>
                    ))}
                  </div>
                </section>
              );
            })()}

            {(() => {
              const photos = safeParse(selectedArtist.photos);
              if (photos.length <= 1) return null;
              return (
                <section className={styles.portfolioSection}>
                  <h3>Photos</h3>
                  <div className={styles.portfolioGrid}>
                    {photos.slice(1).map((url, i) => (
                      <button
                        key={i}
                        type="button"
                        className={styles.portfolioItem}
                        onClick={(e) => { e.stopPropagation(); setLightboxImg(uploadUrl(url)); }}
                      >
                        <img src={uploadUrl(url)} alt={`Photo ${i + 2}`} />
                      </button>
                    ))}
                  </div>
                </section>
              );
            })()}

            <section className={styles.availSection}>
              <h3>Upcoming Availability</h3>
              {loadingAvail ? (
                <p className={styles.availHint}>Loading…</p>
              ) : availDates.length === 0 ? (
                <p className={styles.availHint}>No open slots in the next 30 days. Contact the studio for inquiries.</p>
              ) : (
                <div className={styles.availList}>
                  {availDates.map((date) => (
                    <div key={date} className={styles.availDate}>
                      <span className={styles.availDateLabel}>{new Date(date + 'T00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                      <div className={styles.availSlots}>
                        {availByDate[date].map((s) => (
                          <span key={s.id} className={styles.availSlot}>{s.startTime} – {s.endTime}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {artistReviews.length > 0 && (
              <section className={styles.reviewsSection}>
                <h3>Reviews ({artistReviews.length})</h3>
                {(() => {
                  const avg = Math.round((artistReviews.reduce((s, r) => s + r.rating, 0) / artistReviews.length) * 10) / 10;
                  return (
                    <div className={styles.reviewSummary}>
                      <span className={styles.reviewAvgNum}>{avg}</span>
                      <span className={styles.reviewStars}>{'★'.repeat(Math.round(avg))}{'☆'.repeat(5 - Math.round(avg))}</span>
                      <span className={styles.reviewCount}>{artistReviews.length} review{artistReviews.length !== 1 ? 's' : ''}</span>
                    </div>
                  );
                })()}
                <div className={styles.reviewList}>
                  {artistReviews.slice(0, 5).map((r) => (
                    <div key={r.id} className={styles.reviewItem}>
                      <div className={styles.reviewItemHeader}>
                        <span className={styles.reviewerBubble}>{(r.customer?.name || 'A')[0].toUpperCase()}</span>
                        <div className={styles.reviewerMeta}>
                          <span className={styles.reviewerLabel}>{r.customer?.name || 'Anonymous'}</span>
                          <span className={styles.reviewItemStars}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                        </div>
                      </div>
                      {r.comment && <p className={styles.reviewItemText}>{r.comment}</p>}
                    </div>
                  ))}
                  {artistReviews.length > 5 && (
                    <p className={styles.moreReviews}>
                      + {artistReviews.length - 5} more review{artistReviews.length - 5 !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </section>
            )}

            <div className={styles.profileCta}>
              <div className={styles.ctaCard}>
                <span className={styles.ctaIcon}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/></svg>
                </span>
                <h4 className={styles.ctaTitle}>Ready to get inked?</h4>
                <p className={styles.ctaDesc}>Book a session with {selectedArtist.name} — pick your date, time, and let's create something amazing.</p>
                <Link
                  to={`/artists/${selectedArtist.id}/book`}
                  className={styles.ctaBtn}
                  onClick={closeProfile}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                  Book a Session Now
                </Link>
                {selectedArtist.rate != null && (
                  <span className={styles.ctaRate}>Starting from {formatRupiah(selectedArtist.rate)} / hr</span>
                )}
              </div>
              <p className={styles.ctaHint}>Or contact the studio directly via WhatsApp</p>
            </div>
          </div>
        </div>
      )}

      {lightboxImg && (
        <div className={styles.lightbox} onClick={() => setLightboxImg(null)}>
          <img src={lightboxImg} alt="" />
        </div>
      )}
    </div>
  );
}
