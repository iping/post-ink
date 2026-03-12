import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  getBooking,
  getCommissions,
  createProject,
  createSession,
  updateSession,
  uploadUrl,
} from '../api';
import { formatRupiah, formatWithConversion } from '../currency';
import styles from './BookingDetail.module.css';
import layoutStyles from './Studio.module.css';
import formStyles from './BookingForm.module.css';
import artistStyles from './ArtistForm.module.css';

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
  const [lightboxUrl, setLightboxUrl] = useState(null);
   const [creatingProject, setCreatingProject] = useState(false);
  const [creatingSessionFor, setCreatingSessionFor] = useState(null);
  const [sessionDrafts, setSessionDrafts] = useState({});
  const [sessionActionId, setSessionActionId] = useState(null); // id of session we're start/pause/stopping

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


  const copyBookingId = () => {
    const text = booking?.shortCode || booking?.id || '';
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    });
  };

  const handleCreateProject = async () => {
    if (!booking) return;
    setError(null);
    setCreatingProject(true);
    try {
      const pricingType = booking.pricingType === 'hourly' ? 'hourly' : 'fixed';
      const payload = {
        bookingId: booking.id,
        name: booking.projectName || `Project – ${booking.customer?.name || booking.artist?.name || 'Customer'}`,
        pricingType,
        fixedAmount: pricingType === 'fixed' ? booking.totalAmount : null,
        hourlyRate: pricingType === 'hourly' ? (booking.artist?.rate ?? null) : null,
        agreedHours: null,
        notes: booking.notes || null,
        firstSession: {
          date: booking.date,
          startTime: booking.startTime || '09:00',
          endTime: booking.endTime || '17:00',
          actualHours: null,
          notes: null,
        },
      };
      await createProject(payload);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setCreatingProject(false);
    }
  };

  const handleSessionFieldChange = (projectId, field, value) => {
    setSessionDrafts((prev) => ({
      ...prev,
      [projectId]: {
        date: prev[projectId]?.date || '',
        startTime: prev[projectId]?.startTime || '',
        endTime: prev[projectId]?.endTime || '',
        notes: prev[projectId]?.notes || '',
        actualHours: prev[projectId]?.actualHours || '',
        [field]: value,
      },
    }));
  };

  const handleAddSession = async (projectId) => {
    if (!booking) return;
    const draft = sessionDrafts[projectId] || {};
    if (!draft.date) {
      setError('Session date is required.');
      return;
    }
    setError(null);
    setCreatingSessionFor(projectId);
    try {
      await createSession({
        projectId,
        date: draft.date,
        startTime: draft.startTime || booking.startTime || '09:00',
        endTime: draft.endTime || booking.endTime || '17:00',
        actualHours: draft.actualHours ? Number(draft.actualHours) : null,
        notes: draft.notes || null,
      });
      await load();
      setSessionDrafts((prev) => {
        const next = { ...prev };
        delete next[projectId];
        return next;
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setCreatingSessionFor(null);
    }
  };

  const handleSessionStatus = async (sessionId, newStatus) => {
    setError(null);
    setSessionActionId(sessionId);
    try {
      await updateSession(sessionId, { status: newStatus });
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSessionActionId(null);
    }
  };

  const formatSessionTime = (d) => {
    if (!d) return '—';
    const date = new Date(d);
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDurationMinutes = (minutes) => {
    if (!minutes || minutes <= 0) return null;
    const total = Math.round(minutes);
    const hours = Math.floor(total / 60);
    const mins = total % 60;
    if (hours && mins) return `${hours}h ${mins}m`;
    if (hours) return `${hours}h`;
    return `${mins}m`;
  };

  if (loading) return <div className={artistStyles.page}><div className={layoutStyles.loading}>Loading…</div></div>;
  if (!booking) return <div className={artistStyles.page}><div className={artistStyles.error}>Booking not found.</div></div>;

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
  const projects = Array.isArray(booking.projects) ? booking.projects : [];

  return (
    <div className={artistStyles.page}>
      <div className={artistStyles.topBar}>
        <Link to="/manage?tab=bookings" className={artistStyles.backBtn}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
          Back to Bookings
        </Link>
        <div className={artistStyles.topBarRight}>
          <Link to={'/manage/bookings/' + id + '/edit'} className={layoutStyles.addBtn}>Edit booking</Link>
        </div>
      </div>

      <div className={artistStyles.hero}>
        <h1>Booking: {booking.date} {booking.startTime} – {booking.artist?.name}</h1>
        <p className={artistStyles.heroSub}>
          {booking.customer?.name && `${booking.customer.name} · `}
          {booking.studio?.name || 'Studio'} · {booking.status}
        </p>
      </div>

      {error && (
        <div className={artistStyles.error} role="alert">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
          {error}
        </div>
      )}

      <div className={artistStyles.form}>
        <div className={artistStyles.grid}>
          <div className={artistStyles.col}>
            {/* Booking info card */}
            <div className={artistStyles.card}>
              <div className={artistStyles.cardHead}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
                <h2>Booking info</h2>
              </div>
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
                <p><strong>Payment status:</strong> {booking.status === 'Paid' ? 'Paid (evidence recorded)' : 'Unpaid'}</p>
                {commission && (
                  <div className={styles.commissionBreakdown}>
                    <strong>Commission (studio {commission.commissionPercent}%):</strong> Studio {formatRupiah((booking.totalAmount ?? 0) * commission.commissionPercent / 100)} | Artist {formatRupiah((booking.totalAmount ?? 0) * (100 - commission.commissionPercent) / 100)}
                  </div>
                )}
              </div>
            </div>

            {/* Preference card */}
            <div className={artistStyles.card}>
              <div className={artistStyles.cardHead}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
                <h2>Preference / referensi</h2>
              </div>
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
              {!preference.text && preference.images.length === 0 && <p className={artistStyles.cardHint}>No preference or reference images.</p>}
            </div>
          </div>

          <div className={artistStyles.col}>
            {/* Studio & artist card */}
            <div className={artistStyles.card}>
              <div className={artistStyles.cardHead}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                <h2>Studio &amp; artist</h2>
              </div>
              {booking.artist ? (
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
              ) : (
                <p className={artistStyles.cardHint}>No artist assigned.</p>
              )}
            </div>

            {/* Project & sessions card */}
            <div className={artistStyles.card}>
              <div className={artistStyles.cardHead}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 4h16v4H4z" /><path d="M4 10h10v4H4z" /><path d="M4 16h7v4H4z" /></svg>
                <h2>Project &amp; sessions</h2>
              </div>
              {projects.length === 0 ? (
                <>
                  <p className={artistStyles.cardHint}>
                    This booking does not have a project yet. Create a project to track multiple tattoo sessions (visits)
                    under one long‑running work, like a full back piece.
                  </p>
                  <button
                    type="button"
                    onClick={handleCreateProject}
                    className={layoutStyles.addBtn}
                    disabled={creatingProject}
                  >
                    {creatingProject ? 'Creating project…' : 'Create project from this booking'}
                  </button>
                </>
              ) : (
                <div className={styles.projectSection}>
                  {projects.map((p) => {
                    const draft = sessionDrafts[p.id] || { date: '', startTime: '', endTime: '', actualHours: '', notes: '' };
                    const sessions = Array.isArray(p.sessions) ? [...p.sessions].sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime)) : [];
                    const totalActiveMinutes = sessions.reduce((mins, s) => {
                      if (!s.startedAt) return mins;
                      const start = new Date(s.startedAt);
                      const end = s.completedAt ? new Date(s.completedAt) : new Date();
                      const diffMs = end - start;
                      if (!Number.isFinite(diffMs) || diffMs <= 0) return mins;
                      return mins + diffMs / 60000;
                    }, 0);
                    const totalDurationLabel = formatDurationMinutes(totalActiveMinutes);
                    return (
                      <div key={p.id} className={styles.projectCard}>
                        <div className={styles.projectHeader}>
                          <div>
                            <h3 className={styles.projectTitle}>{p.name}</h3>
                            <p className={styles.projectMeta}>
                              {p.pricingType === 'hourly'
                                ? `Hourly project${p.hourlyRate ? ` · Rate ${formatRupiah(p.hourlyRate)}/hour` : ''}`
                                : `Fixed project${p.fixedAmount ? ` · ${formatRupiah(p.fixedAmount)}` : ''}`}
                            </p>
                            {totalDurationLabel && (
                              <p className={styles.projectDuration}>
                                Total active time: <strong>{totalDurationLabel}</strong>
                              </p>
                            )}
                          </div>
                          <span className={styles.projectBadge}>{sessions.length} session{sessions.length !== 1 ? 's' : ''}</span>
                        </div>
                        {p.notes && <p className={styles.projectNotes}>{p.notes}</p>}
                        {sessions.length === 0 ? (
                          <p className={artistStyles.cardHint}>No sessions yet for this project.</p>
                        ) : (
                          <table className={styles.sessionTable}>
                            <thead>
                              <tr>
                                <th>Date</th>
                                <th>Time</th>
                                <th>Hours</th>
                                <th>Status</th>
                                <th>Notes</th>
                                <th className={styles.sessionActionsCol}>Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sessions.map((s) => {
                                const status = s.status || 'scheduled';
                                const isBusy = sessionActionId === s.id;
                                return (
                                  <tr key={s.id} className={status === 'in_progress' ? styles.sessionRowActive : ''}>
                                    <td>{s.date}</td>
                                    <td>{s.startTime} – {s.endTime}</td>
                                    <td>{s.actualHours != null ? s.actualHours : '—'}</td>
                                    <td>
                                      <span className={styles[`sessionStatus_${status}`]} aria-label={`Status: ${status}`}>
                                        {status === 'scheduled' && 'Scheduled'}
                                        {status === 'in_progress' && 'In progress'}
                                        {status === 'paused' && 'Paused'}
                                        {status === 'completed' && 'Completed'}
                                      </span>
                                      {s.startedAt && status !== 'scheduled' && (
                                        <span className={styles.sessionTimeHint}>Started {formatSessionTime(s.startedAt)}</span>
                                      )}
                                      {s.completedAt && (
                                        <span className={styles.sessionTimeHint}>Ended {formatSessionTime(s.completedAt)}</span>
                                      )}
                                    </td>
                                    <td>{s.notes || '—'}</td>
                                    <td className={styles.sessionActionsCell}>
                                      {status === 'scheduled' && (
                                        <button
                                          type="button"
                                          className={styles.startSessionBtn}
                                          onClick={() => handleSessionStatus(s.id, 'in_progress')}
                                          disabled={isBusy}
                                        >
                                          <span className={styles.startSessionIcon} aria-hidden>▶</span>
                                          {isBusy ? 'Starting…' : 'Start session'}
                                        </button>
                                      )}
                                      {status === 'in_progress' && (
                                        <div className={styles.sessionControlGroup}>
                                          <button
                                            type="button"
                                            className={styles.pauseSessionBtn}
                                            onClick={() => handleSessionStatus(s.id, 'paused')}
                                            disabled={isBusy}
                                          >
                                            {isBusy ? '…' : 'Pause'}
                                          </button>
                                          <button
                                            type="button"
                                            className={styles.stopSessionBtn}
                                            onClick={() => handleSessionStatus(s.id, 'completed')}
                                            disabled={isBusy}
                                          >
                                            {isBusy ? '…' : 'Stop'}
                                          </button>
                                        </div>
                                      )}
                                      {status === 'paused' && (
                                        <div className={styles.sessionControlGroup}>
                                          <button
                                            type="button"
                                            className={styles.resumeSessionBtn}
                                            onClick={() => handleSessionStatus(s.id, 'in_progress')}
                                            disabled={isBusy}
                                          >
                                            {isBusy ? '…' : 'Resume'}
                                          </button>
                                          <button
                                            type="button"
                                            className={styles.stopSessionBtn}
                                            onClick={() => handleSessionStatus(s.id, 'completed')}
                                            disabled={isBusy}
                                          >
                                            {isBusy ? '…' : 'Stop'}
                                          </button>
                                        </div>
                                      )}
                                      {status === 'completed' && (
                                        <span className={styles.sessionCompletedLabel}>Recorded</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                        <div className={styles.sessionForm}>
                          <h4 className={styles.sessionFormTitle}>Add session</h4>
                          <div className={styles.sessionFormRow}>
                            <label className={styles.sessionField}>
                              <span>Date</span>
                              <input
                                type="date"
                                value={draft.date}
                                onChange={(e) => handleSessionFieldChange(p.id, 'date', e.target.value)}
                              />
                            </label>
                            <label className={styles.sessionField}>
                              <span>Start</span>
                              <input
                                type="time"
                                value={draft.startTime}
                                onChange={(e) => handleSessionFieldChange(p.id, 'startTime', e.target.value)}
                              />
                            </label>
                            <label className={styles.sessionField}>
                              <span>End</span>
                              <input
                                type="time"
                                value={draft.endTime}
                                onChange={(e) => handleSessionFieldChange(p.id, 'endTime', e.target.value)}
                              />
                            </label>
                          </div>
                          <div className={styles.sessionFormRow}>
                            <label className={styles.sessionField}>
                              <span>Hours (optional)</span>
                              <input
                                type="number"
                                step="0.5"
                                min="0"
                                value={draft.actualHours}
                                onChange={(e) => handleSessionFieldChange(p.id, 'actualHours', e.target.value)}
                              />
                            </label>
                            <label className={`${styles.sessionField} ${styles.sessionFieldWide}`}>
                              <span>Notes (optional)</span>
                              <input
                                type="text"
                                value={draft.notes}
                                onChange={(e) => handleSessionFieldChange(p.id, 'notes', e.target.value)}
                                placeholder="What was done in this session?"
                              />
                            </label>
                          </div>
                          <button
                            type="button"
                            className={layoutStyles.addBtn}
                            onClick={() => handleAddSession(p.id)}
                            disabled={creatingSessionFor === p.id}
                          >
                            {creatingSessionFor === p.id ? 'Saving session…' : 'Save session'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Notes card */}
            <div className={artistStyles.card}>
              <div className={artistStyles.cardHead}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M16 13H8" /><path d="M16 17H8" /><path d="M10 9H8" /></svg>
                <h2>Notes</h2>
              </div>
              {booking.notes ? <p className={styles.preferenceText}>{booking.notes}</p> : <p className={artistStyles.cardHint}>No notes.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
