import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  getBooking,
  getCommissions,
  createPayment,
  createReview,
  createProject,
  updateProject,
  deleteProject,
  uploadUrl,
} from '../api';
import { formatRupiah, formatWithConversion, formatNumberWithDots, parseNumberInput } from '../currency';
import styles from './BookingDetail.module.css';
import formStyles from './BookingForm.module.css';

const PAYMENT_METHODS = [
  { value: 'BCA', label: 'Bank BCA' },
  { value: 'Mandiri', label: 'Bank Mandiri' },
  { value: 'BNI', label: 'Bank BNI' },
  { value: 'Credit Card', label: 'Credit Card' },
  { value: 'Cash', label: 'Cash' },
];

/** Auto-generated project name: Artist initial + Customer name + Booking month (editable). */
function getDefaultProjectName(booking) {
  if (!booking) return '';
  const parts = (booking.artist?.name || '').trim().split(/\s+/);
  const artistInitial = parts.length === 0 ? '' : parts.length === 1
    ? parts[0].charAt(0).toUpperCase()
    : (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  const customerName = (booking.customer?.name || '').trim() || 'Guest';
  const monthStr = booking.date
    ? new Date(booking.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : '';
  return [artistInitial, customerName, monthStr].filter(Boolean).join(' – ');
}

function CopyIcon({ className, title }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden title={title}>
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

export function BookingDetail() {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [commissions, setCommissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copiedId, setCopiedId] = useState(false);

  const [downPaymentForm, setDownPaymentForm] = useState({
    amount: '',
    percent: '',
    method: 'BCA',
    transferDestination: '',
    currency: 'IDR',
    status: 'completed',
  });
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState(null);

  const [projectForm, setProjectForm] = useState({ name: '', pricingType: 'fixed', fixedAmount: '', hourlyRate: '', agreedHours: '', notes: '' });
  const [editingProject, setEditingProject] = useState(false);
  const [projectSubmitting, setProjectSubmitting] = useState(false);

  const load = async () => {
    if (!id) return;
    try {
      const [b, co] = await Promise.all([getBooking(id), getCommissions()]);
      setBooking(b);
      setCommissions(co);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  useEffect(() => {
    if (!lightboxUrl) return;
    const onKey = (e) => { if (e.key === 'Escape') setLightboxUrl(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxUrl]);

  const getCommissionFor = (artistId, studioId) =>
    commissions.find((c) => c.artistId === artistId && c.studioId === studioId);

  const saveProject = async (e) => {
    e.preventDefault();
    if (!booking) return;
    setError(null);
    setProjectSubmitting(true);
    try {
      const projectName = booking.project
        ? projectForm.name.trim()
        : (projectForm.name.trim() || getDefaultProjectName(booking)).trim();
      const payload = {
        bookingId: booking.id,
        name: projectName,
        pricingType: projectForm.pricingType,
        notes: projectForm.notes.trim() || null,
      };
      if (projectForm.pricingType === 'fixed') {
        payload.fixedAmount = projectForm.fixedAmount ? Number(projectForm.fixedAmount) : null;
      } else {
        payload.hourlyRate = booking.artist?.rate != null ? Number(booking.artist.rate) : null;
        payload.agreedHours = projectForm.agreedHours ? Number(projectForm.agreedHours) : null;
      }
      if (booking.project) {
        await updateProject(booking.project.id, payload);
      } else {
        await createProject(payload);
      }
      const updated = await getBooking(booking.id);
      setBooking(updated);
      setEditingProject(false);
      setProjectForm({ name: '', pricingType: 'fixed', fixedAmount: '', hourlyRate: '', agreedHours: '', notes: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setProjectSubmitting(false);
    }
  };

  const removeProject = async () => {
    if (!booking?.project || !window.confirm('Remove this project?')) return;
    setError(null);
    try {
      await deleteProject(booking.project.id);
      const updated = await getBooking(booking.id);
      setBooking(updated);
      setProjectForm({ name: '', pricingType: 'fixed', fixedAmount: '', hourlyRate: '', agreedHours: '', notes: '' });
    } catch (err) {
      setError(err.message);
    }
  };

  const copyBookingId = () => {
    const text = booking?.shortCode || booking?.id || '';
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    });
  };

  const addDownPayment = async (e) => {
    e.preventDefault();
    if (!booking) return;
    const total = booking.totalAmount ?? 0;
    let amount = Number(downPaymentForm.amount);
    if (downPaymentForm.percent && total > 0) {
      const pct = Number(downPaymentForm.percent);
      if (pct > 0) amount = (total * pct) / 100;
    }
    if (amount <= 0) {
      setError('Enter amount or percentage (with total amount set on booking).');
      return;
    }
    setError(null);
    try {
      await createPayment({
        bookingId: booking.id,
        amount,
        currency: downPaymentForm.currency,
        method: downPaymentForm.method,
        type: 'down_payment',
        transferDestination: downPaymentForm.transferDestination || null,
        status: downPaymentForm.status,
      });
      const updated = await getBooking(booking.id);
      setBooking(updated);
      setDownPaymentForm((f) => ({ ...f, amount: '', percent: '' }));
    } catch (err) {
      setError(err.message);
    }
  };

  const submitReview = async (e) => {
    e.preventDefault();
    if (!booking) return;
    setReviewSubmitting(true);
    setError(null);
    try {
      await createReview({
        bookingId: booking.id,
        rating: Number(reviewForm.rating),
        comment: reviewForm.comment || null,
      });
      const updated = await getBooking(booking.id);
      setBooking(updated);
      setReviewForm({ rating: 5, comment: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setReviewSubmitting(false);
    }
  };

  if (loading) return <div className={formStyles.loading}>Loading…</div>;
  if (!booking) return <div className={formStyles.error}>Booking not found.</div>;

  const commission = booking.artistId && booking.studioId
    ? getCommissionFor(booking.artistId, booking.studioId)
    : null;

  function parsePreference(pref) {
    if (!pref) return { text: '', images: [] };
    try {
      const p = JSON.parse(pref);
      if (p && typeof p === 'object') return { text: p.text || '', images: Array.isArray(p.images) ? p.images : [] };
    } catch {}
    return { text: pref, images: [] };
  }
  const preference = parsePreference(booking.preference);
  const artistPhotos = (() => { try { const a = JSON.parse(booking.artist?.photos || '[]'); return Array.isArray(a) ? a : []; } catch { return []; } })();

  return (
    <div className={formStyles.wrap}>
      <header className={formStyles.header}>
        <Link to="/manage?tab=bookings" className={formStyles.backLink}>
          ← Back to Bookings
        </Link>
        <h1 className={formStyles.pageTitle}>
          Booking: {booking.date} {booking.startTime} – {booking.artist?.name}
        </h1>
      </header>

      {error && <div className={formStyles.error} role="alert">{error}</div>}

      <div className={formStyles.form}>
        <div className={formStyles.onePage}>

          <section className={formStyles.block}>
            <h2 className={formStyles.blockTitle}>Booking info</h2>
            <p className={formStyles.blockDesc}>ID, date & time, artist, customer, and amounts.</p>
            <div className={styles.bookingSummary}>
              <p className={styles.bookingIdRow}>
            <strong>Booking ID:</strong>{' '}
            <span title={booking.id} className={styles.bookingIdCode}>{booking.shortCode || booking.id?.slice(0, 8) || '—'}</span>
            <button type="button" onClick={copyBookingId} className={styles.copyBtn} title="Copy booking ID" aria-label="Copy booking ID">
              <CopyIcon title="Copy" />
            </button>
            {copiedId && <span className={styles.copiedHint}>Copied!</span>}
          </p>
          <p><strong>Date:</strong> {booking.date}</p>
          <p><strong>Time:</strong> {booking.startTime} – {booking.endTime}</p>
          <p><strong>Artist:</strong> {booking.artist?.name || '—'}</p>
          <p><strong>Customer:</strong> {booking.customer?.name || '—'}</p>
          {booking.studio?.name && <p><strong>Studio:</strong> {booking.studio.name}</p>}
          {booking.placement && <p><strong>Placement:</strong> {booking.placement}</p>}
          <p><strong>Total amount:</strong> {formatRupiah(booking.totalAmount)} <span className={styles.convHint}>{formatWithConversion(booking.totalAmount).usd}</span></p>
          <p><strong>Paid:</strong> {formatRupiah(booking.paidTotal)}</p>
          <p className={styles.remainingLine}>
            <strong>Remaining:</strong>{' '}
            <span className={(booking.remainingAmount ?? 0) > 0 ? styles.remainingDue : ''}>{formatRupiah(booking.remainingAmount)}</span>
          </p>
          {commission && (
            <div className={styles.commissionBreakdown}>
              <strong>Commission (studio {commission.commissionPercent}%):</strong> Studio {formatRupiah((booking.totalAmount ?? 0) * commission.commissionPercent / 100)} | Artist {formatRupiah((booking.totalAmount ?? 0) * (100 - commission.commissionPercent) / 100)}
            </div>
          )}
            </div>
            <div className={formStyles.actions}>
              <Link to={`/manage/bookings/${id}/edit`} className={formStyles.primaryBtn}>Edit booking</Link>
            </div>
          </section>

          <section className={formStyles.block}>
            <h2 className={formStyles.blockTitle}>Studio & artist</h2>
            <p className={formStyles.blockDesc}>Artist and studio for this booking.</p>
            {booking.artist && (
              <div className={formStyles.artistCard} aria-label="Artist">
                <div className={formStyles.artistCardMedia}>
                  {artistPhotos[0] ? (
                    <img src={uploadUrl(artistPhotos[0])} alt={booking.artist.name} className={formStyles.artistCardPhoto} />
                  ) : (
                    <div className={formStyles.artistCardPlaceholder}>No photo</div>
                  )}
                </div>
                <div className={formStyles.artistCardInfo}>
                  <p className={formStyles.artistCardName}>{booking.artist.name}</p>
                  {booking.artist.shortDescription && <p className={formStyles.artistCardDesc}>{booking.artist.shortDescription}</p>}
                  {booking.artist.speciality && (
                    <div className={formStyles.artistCardTags}>
                      {booking.artist.speciality.split(',').map((s) => s.trim()).filter(Boolean).map((tag) => (
                        <span key={tag} className={formStyles.artistCardTag}>{tag}</span>
                      ))}
                    </div>
                  )}
                  <div className={formStyles.artistCardMeta}>
                    {booking.artist.experiences && <span>{booking.artist.experiences}</span>}
                    {booking.artist.rate != null && <span>Rate: {formatRupiah(booking.artist.rate)}/hour</span>}
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className={formStyles.block}>
            <h2 className={formStyles.blockTitle}>Preference / referensi</h2>
            <p className={formStyles.blockDesc}>Customer reference and images.</p>
            {preference.text && <p className={styles.preferenceText}>{preference.text}</p>}
            {preference.images.length > 0 && (
              <>
                <p className={styles.preferenceThumbsHint}>Click a thumbnail to view full size</p>
                <div className={styles.preferenceThumbs}>
                  {preference.images.map((url, i) => (
                    <button key={url} type="button" onClick={() => setLightboxUrl(url)} className={styles.thumbBtn} aria-label={`View reference ${i + 1}`}>
                      <img src={url} alt="" className={styles.thumbImg} /><span className={styles.thumbLabel}>Ref {i + 1}</span>
                    </button>
                  ))}
                </div>
                {lightboxUrl && (
                  <div className={styles.lightbox} onClick={() => setLightboxUrl(null)} role="dialog" aria-modal="true" aria-label="Reference full size">
                    <button type="button" className={styles.lightboxClose} onClick={() => setLightboxUrl(null)} aria-label="Close">×</button>
                    <img src={lightboxUrl} alt="Reference full size" className={styles.lightboxImg} onClick={(e) => e.stopPropagation()} />
                  </div>
                )}
              </>
            )}
            {!preference.text && preference.images.length === 0 && <p className={formStyles.blockDesc}>No preference or reference images.</p>}
          </section>

          <section className={formStyles.block}>
            <h2 className={formStyles.blockTitle}>Project</h2>
            <p className={formStyles.blockDesc}>Work to be done. Fixed rate = admin-defined, customer agreed. Hourly = artist–customer agreement.</p>
            {booking.project ? (
          <div className={styles.bookingSummary}>
            {!editingProject ? (
              <>
                <p><strong>Name:</strong> {booking.project.name}</p>
                <p><strong>Pricing:</strong> {booking.project.pricingType === 'fixed'
                  ? `Fixed — ${formatRupiah(booking.project.fixedAmount)}`
                  : `Hourly — ${formatRupiah(booking.project.hourlyRate)}/hr${booking.project.agreedHours ? ` × ${booking.project.agreedHours} hrs` : ''}`}
                </p>
                {booking.project.notes && <p><strong>Notes:</strong> {booking.project.notes}</p>}
                <div className={styles.formActions}>
                  <button type="button" className={styles.smBtn} onClick={() => { setEditingProject(true); setProjectForm({ name: booking.project.name, pricingType: booking.project.pricingType, fixedAmount: booking.project.fixedAmount ?? '', hourlyRate: booking.project.hourlyRate ?? '', agreedHours: booking.project.agreedHours ?? '', notes: booking.project.notes ?? '' }); }}>Edit project</button>
                  <button type="button" className={styles.smBtnDanger} onClick={removeProject}>Remove project</button>
                </div>
              </>
            ) : (
              <form onSubmit={saveProject} className={styles.downPaymentForm}>
                <label>Project name * <input value={projectForm.name} onChange={(e) => setProjectForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Alpha" required /></label>
                <label>Pricing <select value={projectForm.pricingType} onChange={(e) => setProjectForm((f) => ({ ...f, pricingType: e.target.value }))}><option value="fixed">Fixed rate</option><option value="hourly">Hourly rate</option></select></label>
                {projectForm.pricingType === 'fixed' && <label>Fixed amount (IDR) <input type="number" min="0" step="1000" placeholder="e.g. 5000000" value={projectForm.fixedAmount} onChange={(e) => setProjectForm((f) => ({ ...f, fixedAmount: e.target.value }))} /></label>}
                {projectForm.pricingType === 'hourly' && (
                  <>
                    <label>Hourly rate (IDR) <input type="number" min="0" step="1000" placeholder="From artist profile" value={booking?.artist?.rate ?? ''} readOnly aria-readonly /></label>
                    <label>Agreed hours (optional) <input type="number" min="0" step="0.5" placeholder="e.g. 4" value={projectForm.agreedHours} onChange={(e) => setProjectForm((f) => ({ ...f, agreedHours: e.target.value }))} /></label>
                  </>
                )}
                <label>Notes <input value={projectForm.notes} onChange={(e) => setProjectForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Optional" /></label>
                <div className={styles.formActions}><button type="submit" disabled={projectSubmitting}>Save</button><button type="button" onClick={() => setEditingProject(false)}>Cancel</button></div>
              </form>
            )}
          </div>
        ) : (
          <form onSubmit={saveProject} className={styles.downPaymentForm}>
            <label>Project name * <input value={projectForm.name || getDefaultProjectName(booking)} onChange={(e) => setProjectForm((f) => ({ ...f, name: e.target.value }))} placeholder="Auto: Artist – Customer – Month" required /></label>
            <label>Pricing <select value={projectForm.pricingType} onChange={(e) => setProjectForm((f) => ({ ...f, pricingType: e.target.value }))}><option value="fixed">Fixed rate (admin-defined, customer agreed)</option><option value="hourly">Hourly rate (artist–customer agreement)</option></select></label>
            {projectForm.pricingType === 'fixed' && <label>Fixed amount (IDR) <input type="number" min="0" step="1000" placeholder="e.g. 5000000" value={projectForm.fixedAmount} onChange={(e) => setProjectForm((f) => ({ ...f, fixedAmount: e.target.value }))} /></label>}
            {projectForm.pricingType === 'hourly' && (
              <>
                <label>Hourly rate (IDR) <input type="number" min="0" step="1000" placeholder="From artist profile" value={booking?.artist?.rate ?? ''} readOnly aria-readonly /></label>
                <label>Agreed hours (optional) <input type="number" min="0" step="0.5" placeholder="e.g. 4" value={projectForm.agreedHours} onChange={(e) => setProjectForm((f) => ({ ...f, agreedHours: e.target.value }))} /></label>
              </>
            )}
            <label>Notes <input value={projectForm.notes} onChange={(e) => setProjectForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Optional" /></label>
            <div className={styles.formActions}><button type="submit" disabled={projectSubmitting}>Add project</button></div>
          </form>
            )}
          </section>

          <section className={formStyles.block}>
            <h2 className={formStyles.blockTitle}>Payments</h2>
            <p className={formStyles.blockDesc}>Down payments and transfers for this booking.</p>
            <ul className={styles.paymentList}>
              {(booking.payments || []).map((p) => (
                <li key={p.id}>{formatRupiah(p.amount)} – {p.method || '—'} {p.transferDestination ? `(${p.transferDestination})` : ''} – {p.type || 'payment'} – {p.status}</li>
              ))}
              {(booking.payments || []).length === 0 && <li>No payments yet.</li>}
            </ul>
            <h3 className={formStyles.blockTitle} style={{ fontSize: '1.1rem', marginTop: '1rem' }}>Add down payment</h3>
            <form onSubmit={addDownPayment} className={styles.downPaymentForm}>
              <label className={formStyles.label}><span className={formStyles.labelText}>Amount (fixed)</span><input className={formStyles.input} type="text" inputMode="numeric" placeholder="e.g. 500.000 or use % below" value={formatNumberWithDots(downPaymentForm.amount)} onChange={(e) => setDownPaymentForm((f) => ({ ...f, amount: parseNumberInput(e.target.value) }))} /></label>
              <label className={formStyles.label}><span className={formStyles.labelText}>Or % of total</span><input className={formStyles.input} type="number" step="1" min="0" max="100" placeholder="e.g. 30" value={downPaymentForm.percent} onChange={(e) => setDownPaymentForm((f) => ({ ...f, percent: e.target.value }))} /></label>
              <label className={formStyles.label}><span className={formStyles.labelText}>Transfer to</span><select className={formStyles.input} value={downPaymentForm.method} onChange={(e) => setDownPaymentForm((f) => ({ ...f, method: e.target.value }))}>{PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</select></label>
              <label className={formStyles.label}><span className={formStyles.labelText}>Transfer destination</span><input className={formStyles.input} placeholder="e.g. BCA 1234567890" value={downPaymentForm.transferDestination} onChange={(e) => setDownPaymentForm((f) => ({ ...f, transferDestination: e.target.value }))} /></label>
              <div className={styles.formActions}><button type="submit">Add down payment</button></div>
            </form>
          </section>

          {booking.status === 'completed' && !booking.review && (
            <section className={formStyles.block}>
              <h2 className={formStyles.blockTitle}>Leave a Review</h2>
              <p className={formStyles.blockDesc}>Rate and comment after completion.</p>
              <form onSubmit={submitReview} className={styles.reviewForm}>
                <label className={formStyles.label}><span className={formStyles.labelText}>Rating</span>
                  <div className={styles.starRow}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button key={s} type="button" className={`${styles.starBtn} ${s <= reviewForm.rating ? styles.starActive : ''}`} onClick={() => setReviewForm((f) => ({ ...f, rating: s }))}>★</button>
                    ))}
                    <span className={styles.ratingText}>{reviewForm.rating}/5</span>
                  </div>
                </label>
                <label className={formStyles.label}><span className={formStyles.labelText}>Comment</span><textarea className={formStyles.input} rows={3} placeholder="How was the experience?" value={reviewForm.comment} onChange={(e) => setReviewForm((f) => ({ ...f, comment: e.target.value }))} /></label>
                <div className={styles.formActions}><button type="submit" disabled={reviewSubmitting}>{reviewSubmitting ? 'Submitting…' : 'Submit Review'}</button></div>
              </form>
            </section>
          )}

          {booking.review && (
            <section className={formStyles.block}>
              <h2 className={formStyles.blockTitle}>Review</h2>
              <div className={styles.existingReview}>
                <div className={styles.reviewStars}>{'★'.repeat(booking.review.rating)}{'☆'.repeat(5 - booking.review.rating)} <span className={styles.ratingText}>{booking.review.rating}/5</span></div>
                {booking.review.comment && <p className={styles.reviewComment}>"{booking.review.comment}"</p>}
              </div>
            </section>
          )}

        </div>
      </div>
    </div>
  );
}
