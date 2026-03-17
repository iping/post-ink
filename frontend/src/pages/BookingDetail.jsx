import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  getBooking,
  getCommissions,
  createProject,
  updateProject,
  updateSession,
  updateBooking,
  createPayment,
  getPaymentDestinations,
  uploadUrl,
} from '../api';
import { formatRupiah, formatWithConversion } from '../currency';
import styles from './BookingDetail.module.css';
import layoutStyles from './Studio.module.css';
import formStyles from './BookingForm.module.css';
import artistStyles from './ArtistForm.module.css';

export function BookingDetail() {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [commissions, setCommissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const [creatingProject, setCreatingProject] = useState(false);
  const [completingProjectId, setCompletingProjectId] = useState(null);
  const [sessionActionId, setSessionActionId] = useState(null);
  const [completionConfirm, setCompletionConfirm] = useState(null);
  const [paymentDestinations, setPaymentDestinations] = useState([]);
  const [completionPaymentOption, setCompletionPaymentOption] = useState('pay_full');
  const [completionDepositSource, setCompletionDepositSource] = useState('studio');
  const [completionPaymentDestinationId, setCompletionPaymentDestinationId] = useState('');
  const [completionSubmitting, setCompletionSubmitting] = useState(false);
  const [showEditDisabledDialog, setShowEditDisabledDialog] = useState(false);

  /** True if any session under any project is completed (booking is then non-editable). */
  const isBookingCompleted = (b) =>
    (b?.projects ?? []).some((p) => (p?.sessions ?? []).some((s) => s?.status === 'completed'));

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
    if (!booking) return;
    getPaymentDestinations()
      .then((list) => setPaymentDestinations(Array.isArray(list) ? list : []))
      .catch(() => setPaymentDestinations([]));
  }, [booking?.id]);

  useEffect(() => {
    load();
  }, [id]);

  useEffect(() => {
    if (!lightboxUrl) return;
    const onKey = (e) => { if (e.key === 'Escape') setLightboxUrl(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxUrl]);

  useEffect(() => {
    if (!completionConfirm) return;
    const onKey = (e) => { if (e.key === 'Escape' && !completionSubmitting) closeCompletionConfirm(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [completionConfirm, completionSubmitting]);

  useEffect(() => {
    if (!showEditDisabledDialog) return;
    const onKey = (e) => { if (e.key === 'Escape') setShowEditDisabledDialog(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showEditDisabledDialog]);

  const getCommissionFor = (artistId, studioId) =>
    commissions.find((c) => c.artistId === artistId && c.studioId === studioId);


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

  /** Session value: hourly = actualHours * rate; fixed = fixedAmount / session count */
  const getSessionAmount = (session, project) => {
    if (!project) return 0;
    if (project.pricingType === 'hourly') {
      const hours = Number(session.actualHours);
      const rate = Number(project.hourlyRate) || 0;
      return (hours && rate) ? hours * rate : 0;
    }
    const fixed = Number(project.fixedAmount) || 0;
    const count = Array.isArray(project.sessions) ? project.sessions.length : 1;
    return count > 0 ? fixed / count : 0;
  };

  const openCompletionConfirm = (type, session, project, amount) => {
    const availStudio = booking?.availableDepositStudio ?? 0;
    const availArtist = booking?.availableDepositArtist ?? 0;
    setCompletionConfirm({ type, session, project, amount });
    setCompletionPaymentOption(amount <= 0 ? 'none' : (availStudio + availArtist >= amount ? 'deduct_only' : 'pay_full'));
    setCompletionDepositSource(availStudio > 0 ? 'studio' : 'artist');
    setCompletionPaymentDestinationId('');
  };

  const closeCompletionConfirm = () => {
    setCompletionConfirm(null);
    setCompletionSubmitting(false);
  };

  const handleWrapSessionClick = (session, project) => {
    const amount = getSessionAmount(session, project);
    openCompletionConfirm('session', session, project, amount);
  };

  const handleCompleteProjectClick = (project) => {
    const amount = booking?.remainingAmount ?? 0;
    openCompletionConfirm('project', null, project, amount);
  };

  const doCompleteAndPay = async () => {
    if (!booking || !completionConfirm) return;
    const { type, session, project, amount } = completionConfirm;
    const availStudio = booking.availableDepositStudio ?? 0;
    const availArtist = booking.availableDepositArtist ?? 0;
    const availTotal = booking.availableDepositTotal ?? (availStudio + availArtist);
    const useStudio = completionDepositSource === 'studio';
    const availChosen = useStudio ? availStudio : availArtist;

    setError(null);
    setCompletionSubmitting(true);
    try {
      if (amount > 0) {
        if (completionPaymentOption === 'deduct_only') {
          const deduct = Math.min(amount, availChosen);
          if (deduct > 0) {
            await createPayment({
              bookingId: booking.id,
              amount: deduct,
              type: 'deposit_deduction',
              status: 'completed',
              receiverType: useStudio ? 'studio' : 'artist',
              receiverStudioId: useStudio ? booking.studioId : null,
              receiverArtistId: useStudio ? null : booking.artistId,
            });
          }
        } else if (completionPaymentOption === 'combine') {
          const deduct = Math.min(amount, availChosen);
          const remainder = amount - deduct;
          if (deduct > 0) {
            await createPayment({
              bookingId: booking.id,
              amount: deduct,
              type: 'deposit_deduction',
              status: 'completed',
              receiverType: useStudio ? 'studio' : 'artist',
              receiverStudioId: useStudio ? booking.studioId : null,
              receiverArtistId: useStudio ? null : booking.artistId,
            });
          }
          if (remainder > 0 && completionPaymentDestinationId) {
            const dest = paymentDestinations.find((d) => d.id === completionPaymentDestinationId);
            await createPayment({
              bookingId: booking.id,
              amount: remainder,
              type: 'final',
              status: 'completed',
              paymentDestinationId: completionPaymentDestinationId,
              receiverType: dest?.ownerType || 'artist',
              receiverStudioId: dest?.ownerType === 'studio' ? (dest.studioId || booking.studioId) : null,
              receiverArtistId: dest?.ownerType === 'artist' ? (dest.artistId || booking.artistId) : null,
            });
          }
        } else if (completionPaymentOption === 'pay_full' && completionPaymentDestinationId) {
          const dest = paymentDestinations.find((d) => d.id === completionPaymentDestinationId);
          await createPayment({
            bookingId: booking.id,
            amount,
            type: 'final',
            status: 'completed',
            paymentDestinationId: completionPaymentDestinationId,
            receiverType: dest?.ownerType || 'artist',
            receiverStudioId: dest?.ownerType === 'studio' ? (dest.studioId || booking.studioId) : null,
            receiverArtistId: dest?.ownerType === 'artist' ? (dest.artistId || booking.artistId) : null,
          });
        }
      }

      if (type === 'session' && session?.id) {
        await updateSession(session.id, { status: 'completed' });
      } else if (type === 'project' && project?.id) {
        await updateProject(project.id, { status: 'completed' });
      }

      const updated = await getBooking(booking.id);
      const rem = updated?.remainingAmount ?? 0;
      if (updated?.id && rem <= 0 && updated.status !== 'Paid') {
        await updateBooking(updated.id, { status: 'Paid' });
      } else if (updated?.id && rem > 0 && updated.status !== 'Unpaid') {
        await updateBooking(updated.id, { status: 'Unpaid' });
      }
      await load();
      closeCompletionConfirm();
    } catch (e) {
      setError(e.message);
    } finally {
      setCompletionSubmitting(false);
    }
  };


  if (loading) return <div className={artistStyles.page}><div className={layoutStyles.loading}>Loading…</div></div>;
  if (!booking) return <div className={artistStyles.page}><div className={artistStyles.error}>Booking not found.</div></div>;

  const commission = booking.artistId && booking.studioId
    ? getCommissionFor(booking.artistId, booking.studioId)
    : null;
  const bookingTotal = booking.computedTotalAmount ?? booking.totalAmount;
  const depositTotal = Array.isArray(booking.payments)
    ? booking.payments
        .filter((p) => p.status === 'completed' && p.type === 'down_payment')
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
    : 0;
  const remainingAmount = booking.remainingAmount ?? (bookingTotal != null && booking.paidTotal != null
    ? bookingTotal - booking.paidTotal
    : null);

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
  const paymentHistory = Array.isArray(booking.payments)
    ? [...booking.payments].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    : [];
  const paymentReceiverLabel = (payment) => {
    if (payment.receiverType === 'studio') return payment.receiverStudio?.name || booking.studio?.name || 'Studio';
    if (payment.receiverType === 'artist') return payment.receiverArtist?.name || booking.artist?.name || 'Artist';
    return '—';
  };
  const paymentAccountLabel = (payment) => {
    if (payment.paymentDestination) {
      return `${payment.paymentDestination.name}${payment.paymentDestination.account ? ` — ${payment.paymentDestination.account}` : ''}`;
    }
    return payment.transferDestination || payment.method || '—';
  };
  const expectedStudioShare = commission && bookingTotal != null
    ? bookingTotal * commission.commissionPercent / 100
    : null;
  const expectedArtistShare = commission && bookingTotal != null
    ? bookingTotal * (100 - commission.commissionPercent) / 100
    : null;

  return (
    <div className={artistStyles.page}>
      <div className={artistStyles.topBar}>
        <Link to="/manage?tab=bookings" className={artistStyles.backBtn}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
          Back to Bookings
        </Link>
        <div className={artistStyles.topBarRight}>
          {isBookingCompleted(booking) ? (
            <button type="button" className={`${layoutStyles.addBtn} ${layoutStyles.addBtnDisabled}`} onClick={() => setShowEditDisabledDialog(true)} title="Edit is disabled for completed bookings">
              Edit booking
            </button>
          ) : (
            <Link to={'/manage/bookings/' + id + '/edit'} className={layoutStyles.addBtn}>Edit booking</Link>
          )}
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
                <p><strong>Date:</strong> {booking.date}</p>
                <p><strong>Time:</strong> {booking.startTime} – {booking.endTime}</p>
                <p><strong>Artist:</strong> {booking.artist?.name || '—'}</p>
                <p><strong>Customer:</strong> {booking.customer?.name || '—'}</p>
                {booking.studio?.name && <p><strong>Studio:</strong> {booking.studio.name}</p>}
                {booking.placement && <p><strong>Placement:</strong> {booking.placement}</p>}
                <p><strong>Total amount:</strong> {formatRupiah(bookingTotal)} <span className={styles.convHint}>{formatWithConversion(bookingTotal).usd}</span></p>
                <p><strong>Paid:</strong> {formatRupiah(booking.paidTotal)}</p>
                <p className={styles.remainingLine}>
                  <strong>Remaining:</strong>{' '}
                  <span className={(booking.remainingAmount ?? 0) > 0 ? styles.remainingDue : ''}>{formatRupiah(booking.remainingAmount)}</span>
                </p>
                <div className={styles.arSplitCard}>
                  <div className={styles.arSplitRow}>
                    <span>Collected by studio</span>
                    <strong>{formatRupiah(booking.studioPaidTotal)}</strong>
                  </div>
                  <div className={styles.arSplitRow}>
                    <span>Collected by artist</span>
                    <strong>{formatRupiah(booking.artistPaidTotal)}</strong>
                  </div>
                  {expectedStudioShare != null && (
                    <div className={styles.arSplitRow}>
                      <span>Expected studio commission</span>
                      <strong>{formatRupiah(expectedStudioShare)}</strong>
                    </div>
                  )}
                  {expectedArtistShare != null && (
                    <div className={styles.arSplitRow}>
                      <span>Expected artist share</span>
                      <strong>{formatRupiah(expectedArtistShare)}</strong>
                    </div>
                  )}
                </div>
                <p><strong>Payment status:</strong> {booking.status === 'Paid' ? 'Paid' : 'Unpaid'}</p>
                {commission && (
                  <div className={styles.commissionBreakdown}>
                    <strong>Commission (studio {commission.commissionPercent}%):</strong> Studio {formatRupiah(expectedStudioShare ?? 0)} | Artist {formatRupiah(expectedArtistShare ?? 0)}
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

            <div className={artistStyles.card}>
              <div className={artistStyles.cardHead}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 1v22" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                <h2>Payment history</h2>
              </div>
              {paymentHistory.length === 0 ? (
                <p className={artistStyles.cardHint}>No payments recorded yet.</p>
              ) : (
                <ul className={styles.paymentList}>
                  {paymentHistory.map((payment) => (
                    <li key={payment.id}>
                      <strong>{formatRupiah(payment.amount)}</strong> · {payment.type || 'payment'} · {payment.status}
                      <br />
                      To {paymentReceiverLabel(payment)} via {paymentAccountLabel(payment)}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {remainingAmount != null && remainingAmount > 0 && (
              <div className={styles.nextStepCard}>
                <h2>Next step: collect payment</h2>
                <p>
                  This booking still has <strong>{formatRupiah(remainingAmount)}</strong> to be paid.
                  Use this step before you wrap sessions or complete the project.
                </p>
                <ul className={styles.paymentChecklist}>
                  <li>
                    <strong>Total due now</strong>: {formatRupiah(remainingAmount)}
                  </li>
                  <li>
                    <strong>Suggested payment method</strong>: cash, bank transfer, or e‑wallet recorded under a
                    <em>Payment account</em> (Studio or Artist).
                  </li>
                  <li>
                    <strong>How to record</strong>: go to the <em>Payments</em> tab, create a new payment linked to this booking,
                    choose type <code>final</code> (or appropriate), select the correct owner (Studio / Artist) and account, then save.
                  </li>
                  {depositTotal > 0 && (
                    <li>
                      <strong>Customer deposit</strong>: {formatRupiah(depositTotal)} (kept as deposit). For required session payments,
                      take a fresh payment instead of deducting from this deposit.
                    </li>
                  )}
                </ul>
              </div>
            )}

            {/* Project & sessions card */}
            <div className={artistStyles.card}>
              <div className={artistStyles.cardHead}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 4h16v4H4z" /><path d="M4 10h10v4H4z" /><path d="M4 16h7v4H4z" /></svg>
                <h2>Project &amp; sessions</h2>
              </div>
              {projects.length === 0 ? (
                <>
                  <p className={artistStyles.cardHint}>
                    This booking does not have a project yet. Create a project to track sessions and progress.
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
                    const sessions = Array.isArray(p.sessions)
                      ? [...p.sessions].sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime))
                      : [];
                    const completedSessions = sessions.filter((s) => s.status === 'completed').length;
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
                          </div>
                          <div className={styles.projectBadgeGroup}>
                            <span className={styles.projectBadge}>
                              {sessions.length} session{sessions.length !== 1 ? 's' : ''}
                            </span>
                            <span className={styles.projectProgressBadge}>
                              {completedSessions}/{sessions.length || 0} completed
                            </span>
                            <button
                              type="button"
                              className={styles.projectCompleteBtn}
                              onClick={() => handleCompleteProjectClick(p)}
                              disabled={completionSubmitting}
                            >
                              {completionSubmitting && completionConfirm?.project?.id === p.id ? 'Completing…' : 'Project completed'}
                            </button>
                          </div>
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
                                <th>Notes</th>
                                <th>Progress</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sessions.map((s) => {
                                const status = s.status || 'scheduled';
                                return (
                                  <tr key={s.id}>
                                    <td>{s.date}</td>
                                    <td>{s.startTime} – {s.endTime}</td>
                                    <td className={styles.sessionNotesCell}>{s.notes || '—'}</td>
                                    <td className={styles.sessionActions}>
                                      <span>
                                        {status === 'completed'
                                          ? 'Completed — session wrapped'
                                          : 'Scheduled — waiting to be wrapped'}
                                      </span>
                                      {status !== 'completed' && (
                                        <button
                                          type="button"
                                          className={styles.sessionSmBtn}
                                          onClick={() => handleWrapSessionClick(s, p)}
                                          disabled={completionSubmitting}
                                        >
                                          {completionSubmitting && completionConfirm?.session?.id === s.id ? 'Completing…' : 'Mark completed'}
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                        <p className={styles.help}>
                          To add or reschedule sessions for this project, continue in your project management page.
                        </p>
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

      {/* Edit disabled (booking completed) dialog */}
      {showEditDisabledDialog && (
        <div className={styles.completionModalBackdrop} role="dialog" aria-modal="true" aria-labelledby="edit-disabled-modal-title">
          <div className={styles.completionModal}>
            <h2 id="edit-disabled-modal-title" className={styles.completionModalTitle}>
              Edit booking unavailable
            </h2>
            <p className={styles.completionModalSummary}>
              This booking cannot be edited because it has been marked as completed. Completed sessions lock the booking from further changes.
            </p>
            <div className={styles.completionModalActions}>
              <button type="button" onClick={() => setShowEditDisabledDialog(false)} className={styles.completionModalCancel}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Completion payment confirmation modal */}
      {completionConfirm && (
        <div className={styles.completionModalBackdrop} role="dialog" aria-modal="true" aria-labelledby="completion-modal-title">
          <div className={styles.completionModal}>
            <h2 id="completion-modal-title" className={styles.completionModalTitle}>
              {completionConfirm.type === 'session' ? 'Mark session completed' : 'Mark project completed'}
            </h2>
            {completionConfirm.amount <= 0 ? (
              <p className={styles.completionModalSummary}>
                No payment due for this {completionConfirm.type === 'session' ? 'session' : 'project'}. Confirm completion?
              </p>
            ) : (
              <>
                <p className={styles.completionModalSummary}>
                  Payment due: <strong>{formatRupiah(completionConfirm.amount)}</strong>
                  {completionConfirm.type === 'session' && completionConfirm.project?.pricingType === 'hourly' && (
                    <span className={styles.completionModalHint}>
                      {' '}({completionConfirm.session?.actualHours ?? 0} hrs × {formatRupiah(completionConfirm.project?.hourlyRate)}/hr)
                    </span>
                  )}
                </p>
                {(booking.availableDepositTotal ?? 0) > 0 && (
                  <p className={styles.completionModalDeposit}>
                    Customer deposit: Studio {formatRupiah(booking.availableDepositStudio ?? 0)} · Artist {formatRupiah(booking.availableDepositArtist ?? 0)}
                  </p>
                )}
                <div className={styles.completionModalOptions}>
                  {(booking.availableDepositTotal ?? 0) >= completionConfirm.amount && (
                    <label className={styles.completionModalOption}>
                      <input
                        type="radio"
                        name="completionPaymentOption"
                        checked={completionPaymentOption === 'deduct_only'}
                        onChange={() => setCompletionPaymentOption('deduct_only')}
                      />
                      <span>Deduct from deposit only</span>
                      {(booking.availableDepositStudio ?? 0) > 0 && (booking.availableDepositArtist ?? 0) > 0 && (
                        <select
                          value={completionDepositSource}
                          onChange={(e) => setCompletionDepositSource(e.target.value)}
                          className={styles.completionModalSelect}
                        >
                          <option value="studio">Use studio deposit</option>
                          <option value="artist">Use artist deposit</option>
                        </select>
                      )}
                    </label>
                  )}
                  {completionConfirm.amount > (booking.availableDepositTotal ?? 0) && (booking.availableDepositTotal ?? 0) > 0 && (
                    <label className={styles.completionModalOption}>
                      <input
                        type="radio"
                        name="completionPaymentOption"
                        checked={completionPaymentOption === 'combine'}
                        onChange={() => setCompletionPaymentOption('combine')}
                      />
                      <span>Combine: deduct from deposit and pay remainder</span>
                      {(booking.availableDepositStudio ?? 0) > 0 && (booking.availableDepositArtist ?? 0) > 0 && (
                        <select
                          value={completionDepositSource}
                          onChange={(e) => setCompletionDepositSource(e.target.value)}
                          className={styles.completionModalSelect}
                        >
                          <option value="studio">Use studio deposit first</option>
                          <option value="artist">Use artist deposit first</option>
                        </select>
                      )}
                      <select
                        value={completionPaymentDestinationId}
                        onChange={(e) => setCompletionPaymentDestinationId(e.target.value)}
                        className={styles.completionModalSelect}
                        required={completionPaymentOption === 'combine'}
                      >
                        <option value="">Select account for remainder</option>
                        {paymentDestinations
                          .filter((d) => d.isActive && (d.studioId === booking.studioId || d.artistId === booking.artistId))
                          .map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name}{d.account ? ` — ${d.account}` : ''} ({d.ownerType})
                            </option>
                          ))}
                      </select>
                    </label>
                  )}
                  <label className={styles.completionModalOption}>
                    <input
                      type="radio"
                      name="completionPaymentOption"
                      checked={completionPaymentOption === 'pay_full'}
                      onChange={() => setCompletionPaymentOption('pay_full')}
                    />
                    <span>Pay full amount (new payment)</span>
                    <select
                      value={completionPaymentDestinationId}
                      onChange={(e) => setCompletionPaymentDestinationId(e.target.value)}
                      className={styles.completionModalSelect}
                      required={completionPaymentOption === 'pay_full'}
                    >
                      <option value="">Select payment account</option>
                      {paymentDestinations
                        .filter((d) => d.isActive && (d.studioId === booking.studioId || d.artistId === booking.artistId))
                        .map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}{d.account ? ` — ${d.account}` : ''} ({d.ownerType})
                          </option>
                        ))}
                    </select>
                  </label>
                </div>
              </>
            )}
            <div className={styles.completionModalActions}>
              <button type="button" onClick={closeCompletionConfirm} className={styles.completionModalCancel} disabled={completionSubmitting}>
                Cancel
              </button>
              <button
                type="button"
                onClick={doCompleteAndPay}
                className={styles.completionModalConfirm}
                disabled={completionSubmitting || (completionConfirm.amount > 0 && (completionPaymentOption === 'pay_full' || completionPaymentOption === 'combine') && !completionPaymentDestinationId)}
              >
                {completionSubmitting ? 'Completing…' : completionConfirm.amount <= 0 ? 'Confirm completion' : 'Confirm payment & complete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
