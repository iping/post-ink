import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  getBooking,
  updateBooking,
  getCommissions,
  createPayment,
  createReview,
  createProject,
  updateProject,
  deleteProject,
  createSession,
  updateSession,
  deleteSession,
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

/** Default name for a new project/session (e.g. "JD – Jane – Feb 2025 (Session 2)"). */
function getDefaultProjectNameForNew(booking) {
  const base = getDefaultProjectName(booking);
  const count = (booking.projects || []).length;
  if (count === 0) return base;
  return `${base} (Session ${count + 1})`;
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
  const [editingProject, setEditingProject] = useState(null); // project id when editing, null when adding
  const [projectSubmitting, setProjectSubmitting] = useState(false);

  const [sessionForm, setSessionForm] = useState({ date: '', startTime: '09:00', endTime: '17:00', actualHours: '', notes: '' });
  const [addingSessionProjectId, setAddingSessionProjectId] = useState(null); // project id when adding session
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [sessionSubmitting, setSessionSubmitting] = useState(false);
  const [viewSessionId, setViewSessionId] = useState(null);

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
      const isEditing = editingProject != null;
      const projectName = isEditing
        ? projectForm.name.trim()
        : (projectForm.name.trim() || getDefaultProjectNameForNew(booking)).trim();
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
      if (isEditing) {
        await updateProject(editingProject, payload);
      } else {
        payload.firstSession = { date: booking.date, startTime: booking.startTime || '09:00', endTime: booking.endTime || '17:00' };
        await createProject(payload);
      }
      const updated = await getBooking(booking.id);
      setBooking(updated);
      setEditingProject(null);
      setProjectForm({ name: '', pricingType: 'fixed', fixedAmount: '', hourlyRate: '', agreedHours: '', notes: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setProjectSubmitting(false);
    }
  };

  const removeProject = async (projectId) => {
    if (!projectId || !window.confirm('Remove this project/session?')) return;
    setError(null);
    try {
      await deleteProject(projectId);
      const updated = await getBooking(booking.id);
      setBooking(updated);
      if (editingProject === projectId) {
        setEditingProject(null);
        setProjectForm({ name: '', pricingType: 'fixed', fixedAmount: '', hourlyRate: '', agreedHours: '', notes: '' });
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const startNewSession = (projectId) => {
    if (!booking) return;
    setAddingSessionProjectId(projectId);
    setEditingSessionId(null);
    setViewSessionId(null);
    setSessionForm({
      date: booking.date || '',
      startTime: booking.startTime || '09:00',
      endTime: booking.endTime || '17:00',
      actualHours: '',
      notes: '',
    });
  };

  const startEditSession = (session) => {
    setEditingSessionId(session.id);
    setAddingSessionProjectId(session.projectId);
    setViewSessionId(null);
    setSessionForm({
      date: session.date || '',
      startTime: session.startTime || '09:00',
      endTime: session.endTime || '17:00',
      actualHours: session.actualHours != null ? String(session.actualHours) : '',
      notes: session.notes || '',
    });
  };

  const cancelSessionEdit = () => {
    setAddingSessionProjectId(null);
    setEditingSessionId(null);
    setSessionForm({ date: '', startTime: '09:00', endTime: '17:00', actualHours: '', notes: '' });
  };

  const saveSession = async (e) => {
    e.preventDefault();
    if (!booking) return;
    setError(null);
    setSessionSubmitting(true);
    try {
      if (editingSessionId) {
        await updateSession(editingSessionId, {
          date: sessionForm.date,
          startTime: sessionForm.startTime || '09:00',
          endTime: sessionForm.endTime || '17:00',
          actualHours: sessionForm.actualHours ? Number(sessionForm.actualHours) : null,
          notes: sessionForm.notes.trim() || null,
        });
      } else if (addingSessionProjectId) {
        await createSession({
          projectId: addingSessionProjectId,
          date: sessionForm.date,
          startTime: sessionForm.startTime || '09:00',
          endTime: sessionForm.endTime || '17:00',
          actualHours: sessionForm.actualHours ? Number(sessionForm.actualHours) : null,
          notes: sessionForm.notes.trim() || null,
        });
      }
      setEditingSessionId(null);
      setAddingSessionProjectId(null);
      setSessionForm({ date: '', startTime: '09:00', endTime: '17:00', actualHours: '', notes: '' });
      const updated = await getBooking(booking.id);
      setBooking(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setSessionSubmitting(false);
    }
  };

  const removeSession = async (sessionId, projectSessionsCount) => {
    if (projectSessionsCount <= 1) {
      setError('Project must have at least one session. Add another session before removing this one.');
      return;
    }
    if (!window.confirm('Remove this session?')) return;
    setError(null);
    try {
      await deleteSession(sessionId);
      const updated = await getBooking(booking.id);
      setBooking(updated);
      if (editingSessionId === sessionId) {
        setEditingSessionId(null);
        setSessionForm({ date: '', startTime: '09:00', endTime: '17:00', actualHours: '', notes: '' });
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const proceedToFirstSession = async () => {
    if (!booking || !['pending', 'confirmed'].includes(booking.status)) return;
    setError(null);
    try {
      const updated = await updateBooking(booking.id, { status: 'in_progress' });
      setBooking(updated);
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

  const projectsList = (booking.projects || []).slice().sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const hasProjects = projectsList.length > 0;
  const currentStep = !hasProjects ? 2 : 3;

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

      <nav className={styles.processSteps} aria-label="Booking process">
        <span className={styles.stepItem + ' ' + styles.stepItemDone}>
          <span className={styles.stepNum}>1</span> Booking
        </span>
        <span className={styles.stepConnector} aria-hidden />
        <span className={styles.stepItem + ' ' + (currentStep === 2 ? styles.stepItemCurrent : hasProjects ? styles.stepItemDone : '')}>
          <span className={styles.stepNum}>2</span> Project
        </span>
        <span className={styles.stepConnector} aria-hidden />
        <span className={styles.stepItem + ' ' + (currentStep === 3 ? styles.stepItemCurrent : '')}>
          <span className={styles.stepNum}>3</span> First session
        </span>
      </nav>

      <div className={formStyles.form}>
        <div className={formStyles.onePage}>

          <section className={formStyles.block}>
            <h2 className={formStyles.blockTitle}>1. Booking info</h2>
            <p className={formStyles.blockDesc}>Date, time, artist, customer. Continue below to add a project and first session.</p>
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
              {(booking.status === 'pending' || booking.status === 'confirmed') && (
                <button type="button" onClick={proceedToFirstSession} className={formStyles.primaryBtn}>Mark in progress</button>
              )}
              <Link to={'/manage/bookings/' + id + '/edit'} className={formStyles.secondaryBtn}>Edit booking</Link>
            </div>
          </section>

          <section className={formStyles.block}>
            <h2 className={formStyles.blockTitle}>2. Project</h2>
            <p className={formStyles.blockDesc}>
              {hasProjects ? 'Project and sessions from this booking (read-only).' : 'Add a project for this booking. Each project will have at least one session (date & time).'}
            </p>
            {!hasProjects && (
              <div className={styles.nextStepCard}>
                <h2>Continue: Add first project</h2>
                <p>Define the project (name, fixed or hourly pricing). A first session will be created from the booking date & time.</p>
                <form onSubmit={saveProject} className={styles.downPaymentForm}>
                  <label>Project name <span className={styles.fromBookingHint}>(from booking, not editable)</span>
                    <input readOnly aria-readonly value={getDefaultProjectNameForNew(booking)} className={styles.readOnlyInput} />
                  </label>
                  <label>Pricing <select value={projectForm.pricingType} onChange={(e) => setProjectForm((f) => ({ ...f, pricingType: e.target.value }))}><option value="fixed">Fixed rate</option><option value="hourly">Hourly rate</option></select></label>
                  {projectForm.pricingType === 'fixed' && <label>Fixed amount (IDR) <input type="number" min="0" step="1000" placeholder="e.g. 5000000" value={projectForm.fixedAmount} onChange={(e) => setProjectForm((f) => ({ ...f, fixedAmount: e.target.value }))} /></label>}
                  {projectForm.pricingType === 'hourly' && (
                    <>
                      <label>Hourly rate (IDR) <input type="number" min="0" step="1000" placeholder="From artist" value={booking?.artist?.rate ?? ''} readOnly aria-readonly /></label>
                      <label>Agreed hours (optional) <input type="number" min="0" step="0.5" placeholder="e.g. 4" value={projectForm.agreedHours} onChange={(e) => setProjectForm((f) => ({ ...f, agreedHours: e.target.value }))} /></label>
                    </>
                  )}
                  <label>Notes <input value={projectForm.notes} onChange={(e) => setProjectForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Optional" /></label>
                  <div className={styles.formActions}><button type="submit" disabled={projectSubmitting} className={formStyles.primaryBtn}>{projectSubmitting ? 'Adding…' : 'Add project & first session'}</button></div>
                </form>
              </div>
            )}
            {hasProjects && (
              <>
                {projectsList.map((proj) => {
                  const sessions = (proj.sessions || []).slice().sort((a, b) => a.date.localeCompare(b.date) || (a.startTime || '').localeCompare(b.startTime || ''));
                  const isEditingOrAdding = addingSessionProjectId === proj.id || sessions.some((s) => s.id === editingSessionId && s.projectId === proj.id);
                  const viewedSession = sessions.find((s) => s.id === viewSessionId);
                  return (
                    <div key={proj.id} className={styles.projectCard}>
                      <div className={styles.projectHeader}>
                        <div>
                          <p className={styles.projectTitle}>
                            <strong>{proj.name}</strong>
                          </p>
                          <p className={styles.projectMeta}>
                            {proj.pricingType === 'fixed'
                              ? `Fixed – ${formatRupiah(proj.fixedAmount)}`
                              : `Hourly – ${formatRupiah(proj.hourlyRate)}/hr${proj.agreedHours ? ` × ${proj.agreedHours}h` : ''}`}
                          </p>
                          {proj.notes && <p className={styles.projectNotes}>{proj.notes}</p>}
                        </div>
                        <button
                          type="button"
                          className={styles.sessionAddBtn}
                          onClick={() => startNewSession(proj.id)}
                        >
                          + New session
                        </button>
                      </div>

                      <h3 className={formStyles.blockTitle} style={{ fontSize: '0.95rem', marginTop: '0.75rem', marginBottom: '0.5rem' }}>Sessions</h3>
                      <div className={styles.sessionTableWrap}>
                        <table className={styles.sessionTable}>
                          <thead>
                            <tr>
                              <th>No.</th>
                              <th>Date</th>
                              <th>Time</th>
                              <th>Hours</th>
                              <th>Notes</th>
                              <th></th>
                            </tr>
                          </thead>
                          <tbody>
                            {sessions.map((sess, idx) => (
                              <tr key={sess.id} className={editingSessionId === sess.id ? styles.sessionRowEditing : ''}>
                                <td>{idx + 1}</td>
                                <td>
                                  {idx === 0 && <span className={styles.firstSessionBadge}>First</span>}{' '}
                                  <span>{sess.date}</span>
                                </td>
                                <td>{sess.startTime} – {sess.endTime}</td>
                                <td>{sess.actualHours != null ? `${sess.actualHours}h` : '—'}</td>
                                <td className={styles.sessionNotesCell}>
                                  {sess.notes || '—'}
                                </td>
                                <td className={styles.sessionActions}>
                                  <button
                                    type="button"
                                    className={styles.sessionSmBtn}
                                    onClick={() => setViewSessionId(sess.id)}
                                  >
                                    View
                                  </button>
                                  <button
                                    type="button"
                                    className={styles.sessionSmBtn}
                                    onClick={() => startEditSession(sess)}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    className={styles.sessionSmBtnDanger}
                                    disabled={sessions.length <= 1}
                                    onClick={() => removeSession(sess.id, sessions.length)}
                                  >
                                    Delete
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {viewedSession && (
                        <div className={styles.sessionDetail}>
                          <h4>Session details</h4>
                          <p><strong>Date:</strong> {viewedSession.date}</p>
                          <p><strong>Time:</strong> {viewedSession.startTime} – {viewedSession.endTime}</p>
                          <p><strong>Hours:</strong> {viewedSession.actualHours != null ? `${viewedSession.actualHours}h` : '—'}</p>
                          {viewedSession.notes && <p><strong>Notes:</strong> {viewedSession.notes}</p>}
                        </div>
                      )}

                      {isEditingOrAdding && (
                        <form onSubmit={saveSession} className={styles.sessionForm}>
                          <h4 className={styles.sessionFormTitle}>
                            {editingSessionId ? 'Edit session' : 'New session'}
                          </h4>
                          <div className={styles.sessionFormGrid}>
                            <label className={formStyles.label}>
                              <span className={formStyles.labelText}>Date</span>
                              <input
                                className={formStyles.input}
                                type="date"
                                value={sessionForm.date}
                                onChange={(e) => setSessionForm((f) => ({ ...f, date: e.target.value }))}
                                required
                              />
                            </label>
                            <label className={formStyles.label}>
                              <span className={formStyles.labelText}>Start time</span>
                              <input
                                className={formStyles.input}
                                type="time"
                                value={sessionForm.startTime}
                                onChange={(e) => setSessionForm((f) => ({ ...f, startTime: e.target.value }))}
                                required
                              />
                            </label>
                            <label className={formStyles.label}>
                              <span className={formStyles.labelText}>End time</span>
                              <input
                                className={formStyles.input}
                                type="time"
                                value={sessionForm.endTime}
                                onChange={(e) => setSessionForm((f) => ({ ...f, endTime: e.target.value }))}
                                required
                              />
                            </label>
                            <label className={formStyles.label}>
                              <span className={formStyles.labelText}>Actual hours (optional)</span>
                              <input
                                className={formStyles.input}
                                type="number"
                                min="0"
                                step="0.5"
                                value={sessionForm.actualHours}
                                onChange={(e) => setSessionForm((f) => ({ ...f, actualHours: e.target.value }))}
                              />
                            </label>
                            <label className={formStyles.label} style={{ gridColumn: '1 / -1' }}>
                              <span className={formStyles.labelText}>Notes</span>
                              <textarea
                                className={formStyles.input}
                                rows={2}
                                value={sessionForm.notes}
                                onChange={(e) => setSessionForm((f) => ({ ...f, notes: e.target.value }))}
                                placeholder="Optional notes about this session"
                              />
                            </label>
                          </div>
                          <div className={styles.sessionFormActions}>
                            <button type="submit" disabled={sessionSubmitting}>
                              {sessionSubmitting ? 'Saving…' : 'Save session'}
                            </button>
                            <button type="button" onClick={cancelSessionEdit}>
                              Cancel
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  );
                })}
              </>
            )}
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
                    <button key={url} type="button" onClick={() => setLightboxUrl(url)} className={styles.thumbBtn} aria-label={'View reference ' + (i + 1)}>
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
            <h2 className={formStyles.blockTitle}>Payments</h2>
            <p className={formStyles.blockDesc}>Down payments and transfers for this booking.</p>
            <ul className={styles.paymentList}>
              {(booking.payments || []).map((p) => (
                <li key={p.id}>{formatRupiah(p.amount)} – {p.method || '—'} {p.transferDestination ? '(' + p.transferDestination + ')' : ''} – {p.type || 'payment'} – {p.status}</li>
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
                      <button key={s} type="button" className={styles.starBtn + (s <= reviewForm.rating ? ' ' + styles.starActive : '')} onClick={() => setReviewForm((f) => ({ ...f, rating: s }))}>★</button>
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
