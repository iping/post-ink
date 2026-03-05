import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  getBooking,
  getCommissions,
  createPayment,
  createReview,
} from '../api';
import { formatRupiah, formatWithConversion } from '../currency';
import styles from './BookingDetail.module.css';

const PAYMENT_METHODS = [
  { value: 'BCA', label: 'Bank BCA' },
  { value: 'Mandiri', label: 'Bank Mandiri' },
  { value: 'BNI', label: 'Bank BNI' },
  { value: 'Credit Card', label: 'Credit Card' },
  { value: 'Cash', label: 'Cash' },
];

export function BookingDetail() {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [commissions, setCommissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  if (loading) return <div className={styles.loading}>Loading…</div>;
  if (!booking) return <div className={styles.error}>Booking not found.</div>;

  const commission = booking.artistId && booking.studioId
    ? getCommissionFor(booking.artistId, booking.studioId)
    : null;

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <Link to="/manage?tab=bookings" className={styles.backLink}>
          ← Back to Bookings
        </Link>
        <h1>Booking: {booking.date} {booking.startTime} – {booking.artist?.name}</h1>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.content}>
        <div className={styles.bookingSummary}>
          {booking.placement && (
            <p><strong>Placement:</strong> {booking.placement}</p>
          )}
          {booking.preference && (() => {
            let text = '';
            let images = [];
            try {
              const parsed = JSON.parse(booking.preference);
              if (parsed && typeof parsed === 'object') {
                text = parsed.text || '';
                images = Array.isArray(parsed.images) ? parsed.images : [];
              } else {
                text = booking.preference;
              }
            } catch {
              text = booking.preference;
            }
            return (
              <div className={styles.preferenceBlock}>
                <strong>Preference / Referensi:</strong>
                {text && <p className={styles.preferenceText}>{text}</p>}
                {images.length > 0 && (
                  <>
                    <p className={styles.preferenceThumbsHint}>Click a thumbnail to view full size</p>
                    <div className={styles.preferenceThumbs}>
                      {images.map((url, i) => (
                        <button
                          key={url}
                          type="button"
                          onClick={() => setLightboxUrl(url)}
                          className={styles.thumbBtn}
                          aria-label={`View reference image ${i + 1} full size`}
                        >
                          <img src={url} alt={`Reference ${i + 1}`} className={styles.thumbImg} />
                          <span className={styles.thumbLabel}>Ref {i + 1}</span>
                        </button>
                      ))}
                    </div>
                    {lightboxUrl && (
                      <div
                        className={styles.lightbox}
                        onClick={() => setLightboxUrl(null)}
                        role="dialog"
                        aria-modal="true"
                        aria-label="Reference image full size"
                      >
                        <button type="button" className={styles.lightboxClose} onClick={() => setLightboxUrl(null)} aria-label="Close">×</button>
                        <img src={lightboxUrl} alt="Reference full size" className={styles.lightboxImg} onClick={(e) => e.stopPropagation()} />
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })()}
          <p><strong>Total amount:</strong> {formatRupiah(booking.totalAmount)} <span className={styles.convHint}>{formatWithConversion(booking.totalAmount).usd}</span></p>
          <p><strong>Paid:</strong> {formatRupiah(booking.paidTotal)}</p>
          <p className={styles.remainingLine}>
            <strong>Remaining to pay:</strong>{' '}
            <span className={(booking.remainingAmount ?? 0) > 0 ? styles.remainingDue : ''}>
              {formatRupiah(booking.remainingAmount)}
            </span>
          </p>
          {commission && (() => {
            const total = booking.totalAmount ?? 0;
            const studioCut = (total * commission.commissionPercent) / 100;
            const artistCut = total - studioCut;
            return (
              <div className={styles.commissionBreakdown}>
                <strong>Commission (studio {commission.commissionPercent}%):</strong> Studio {formatRupiah(studioCut)} | Artist {formatRupiah(artistCut)}
              </div>
            );
          })()}
        </div>

        <div className={styles.actions}>
          <Link to={`/manage/bookings/${id}/edit`} className={styles.editBtn}>Edit booking</Link>
        </div>

        <h4>Payments (down payment / transfer)</h4>
        <ul className={styles.paymentList}>
          {(booking.payments || []).map((p) => (
            <li key={p.id}>
              {formatRupiah(p.amount)} – {p.method || '—'} {p.transferDestination ? `(${p.transferDestination})` : ''} – {p.type || 'payment'} – {p.status}
            </li>
          ))}
          {(booking.payments || []).length === 0 && <li>No payments yet.</li>}
        </ul>

        <h4>Add down payment</h4>
        <form onSubmit={addDownPayment} className={styles.downPaymentForm}>
          <label>
            Amount (fixed)
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="Or use % below"
              value={downPaymentForm.amount}
              onChange={(e) => setDownPaymentForm((f) => ({ ...f, amount: e.target.value }))}
            />
          </label>
          <label>
            Or % of total
            <input
              type="number"
              step="1"
              min="0"
              max="100"
              placeholder="e.g. 30"
              value={downPaymentForm.percent}
              onChange={(e) => setDownPaymentForm((f) => ({ ...f, percent: e.target.value }))}
            />
          </label>
          <label>
            Transfer to (method)
            <select
              value={downPaymentForm.method}
              onChange={(e) => setDownPaymentForm((f) => ({ ...f, method: e.target.value }))}
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </label>
          <label>
            Transfer destination (e.g. BCA 1234567890)
            <input
              placeholder="Account number or reference"
              value={downPaymentForm.transferDestination}
              onChange={(e) => setDownPaymentForm((f) => ({ ...f, transferDestination: e.target.value }))}
            />
          </label>
          <div className={styles.formActions}>
            <button type="submit">Add down payment</button>
          </div>
        </form>

        {booking.status === 'completed' && !booking.review && (
          <>
            <h4>Leave a Review</h4>
            <form onSubmit={submitReview} className={styles.reviewForm}>
              <label>
                Rating
                <div className={styles.starRow}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`${styles.starBtn} ${s <= reviewForm.rating ? styles.starActive : ''}`}
                      onClick={() => setReviewForm((f) => ({ ...f, rating: s }))}
                    >
                      ★
                    </button>
                  ))}
                  <span className={styles.ratingText}>{reviewForm.rating}/5</span>
                </div>
              </label>
              <label>
                Comment
                <textarea
                  rows={3}
                  placeholder="How was the experience?"
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm((f) => ({ ...f, comment: e.target.value }))}
                />
              </label>
              <div className={styles.formActions}>
                <button type="submit" disabled={reviewSubmitting}>
                  {reviewSubmitting ? 'Submitting…' : 'Submit Review'}
                </button>
              </div>
            </form>
          </>
        )}

        {booking.review && (
          <div className={styles.existingReview}>
            <h4>Review</h4>
            <div className={styles.reviewStars}>
              {'★'.repeat(booking.review.rating)}{'☆'.repeat(5 - booking.review.rating)}
              <span className={styles.ratingText}>{booking.review.rating}/5</span>
            </div>
            {booking.review.comment && (
              <p className={styles.reviewComment}>"{booking.review.comment}"</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
