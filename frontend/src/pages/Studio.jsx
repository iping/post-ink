import { useState, useEffect, useMemo } from 'react';
import {
  getBookings,
  getBooking,
  getPayments,
  getArtists,
  getCustomers,
  getStudios,
  createBooking,
  updateBooking,
  deleteBooking,
  createPayment,
  updatePayment,
  createCustomer,
  getCommissions,
  createCommission,
  updateCommission,
  deleteCommission,
  createReview,
  getSpecialities,
  createSpeciality,
  updateSpeciality,
  deleteSpeciality,
} from '../api';
import { AvailabilityCalendar } from '../components/AvailabilityCalendar';
import { formatRupiah, formatWithConversion } from '../currency';
import styles from './Studio.module.css';

const ROWS_PER_PAGE = 8;

function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const pages = useMemo(() => {
    const items = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = start + maxVisible - 1;
    if (end > totalPages) {
      end = totalPages;
      start = Math.max(1, end - maxVisible + 1);
    }
    if (start > 1) {
      items.push(1);
      if (start > 2) items.push('...');
    }
    for (let i = start; i <= end; i++) items.push(i);
    if (end < totalPages) {
      if (end < totalPages - 1) items.push('...');
      items.push(totalPages);
    }
    return items;
  }, [currentPage, totalPages]);

  return (
    <div className={styles.pagination}>
      <button
        className={styles.pageBtn}
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        aria-label="Previous page"
      >
        &lsaquo;
      </button>
      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`e${i}`} className={styles.pageEllipsis}>&hellip;</span>
        ) : (
          <button
            key={p}
            className={`${styles.pageBtn} ${p === currentPage ? styles.pageBtnActive : ''}`}
            onClick={() => onPageChange(p)}
          >
            {p}
          </button>
        ),
      )}
      <button
        className={styles.pageBtn}
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        aria-label="Next page"
      >
        &rsaquo;
      </button>
      <span className={styles.pageInfo}>{totalPages} pages</span>
    </div>
  );
}

const BOOKING_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled'];
const PAYMENT_STATUSES = ['pending', 'completed', 'refunded'];
const PAYMENT_TYPES = [
  { value: 'down_payment', label: 'Down payment' },
  { value: 'final', label: 'Final payment' },
  { value: 'other', label: 'Other' },
];
const PAYMENT_METHODS = [
  { value: 'BCA', label: 'Bank BCA' },
  { value: 'Mandiri', label: 'Bank Mandiri' },
  { value: 'BNI', label: 'Bank BNI' },
  { value: 'Credit Card', label: 'Credit Card' },
  { value: 'Cash', label: 'Cash' },
];

export function Studio() {
  const [tab, setTab] = useState('bookings');
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [artists, setArtists] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [studios, setStudios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showBookingForm, setShowBookingForm] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);
  const [bookingForm, setBookingForm] = useState({
    artistId: '',
    customerId: '',
    studioId: '',
    date: '',
    startTime: '09:00',
    endTime: '17:00',
    status: 'pending',
    totalAmount: '',
    notes: '',
  });

  const [showBookingDetail, setShowBookingDetail] = useState(null);
  const [downPaymentForm, setDownPaymentForm] = useState({
    amount: '',
    percent: '',
    method: 'BCA',
    transferDestination: '',
    currency: 'IDR',
    status: 'completed',
  });

  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    bookingId: '',
    amount: '',
    currency: 'IDR',
    method: 'BCA',
    type: 'down_payment',
    transferDestination: '',
    status: 'pending',
  });

  const [showCommissionForm, setShowCommissionForm] = useState(false);
  const [editingCommission, setEditingCommission] = useState(null);
  const [commissionForm, setCommissionForm] = useState({
    studioId: '',
    artistId: '',
    commissionPercent: '',
  });

  const [selectedSlot, setSelectedSlot] = useState(null);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const [newCustomer, setNewCustomer] = useState({ name: '', email: '', phone: '' });

  const [specialities, setSpecialities] = useState([]);
  const [specPage, setSpecPage] = useState(1);
  const [specNewName, setSpecNewName] = useState('');
  const [specEditId, setSpecEditId] = useState(null);
  const [specEditName, setSpecEditName] = useState('');

  const [bookingPage, setBookingPage] = useState(1);
  const [paymentPage, setPaymentPage] = useState(1);
  const [commissionPage, setCommissionPage] = useState(1);

  const [bookingFilters, setBookingFilters] = useState({
    status: '',
    artistId: '',
    studioId: '',
    customerId: '',
    from: '',
    to: '',
    sort: 'latest',
  });

  const bookingTotalPages = Math.max(1, Math.ceil(bookings.length / ROWS_PER_PAGE));
  const paymentTotalPages = Math.max(1, Math.ceil(payments.length / ROWS_PER_PAGE));
  const commissionTotalPages = Math.max(1, Math.ceil(commissions.length / ROWS_PER_PAGE));
  const specTotalPages = Math.max(1, Math.ceil(specialities.length / ROWS_PER_PAGE));

  const paginatedBookings = bookings.slice((bookingPage - 1) * ROWS_PER_PAGE, bookingPage * ROWS_PER_PAGE);
  const paginatedPayments = payments.slice((paymentPage - 1) * ROWS_PER_PAGE, paymentPage * ROWS_PER_PAGE);
  const paginatedCommissions = commissions.slice((commissionPage - 1) * ROWS_PER_PAGE, commissionPage * ROWS_PER_PAGE);
  const paginatedSpecialities = specialities.slice((specPage - 1) * ROWS_PER_PAGE, specPage * ROWS_PER_PAGE);

  const buildBookingParams = (f) => {
    const params = {};
    if (f.status) params.status = f.status;
    if (f.artistId) params.artistId = f.artistId;
    if (f.studioId) params.studioId = f.studioId;
    if (f.customerId) params.customerId = f.customerId;
    if (f.from) params.from = f.from;
    if (f.to) params.to = f.to;
    if (f.sort) params.sort = f.sort;
    return params;
  };

  const load = (bookingFiltersOverride) => {
    setLoading(true);
    setError(null);
    const f = bookingFiltersOverride !== undefined ? bookingFiltersOverride : bookingFilters;
    const bookingParams = buildBookingParams(f);
    Promise.all([
      getBookings(bookingParams),
      getPayments(),
      getCommissions(),
      getArtists(),
      getCustomers(),
      getStudios(),
      getSpecialities(),
    ])
      .then(([b, p, co, a, c, s, sp]) => {
        setBookings(b);
        setPayments(p);
        setCommissions(co);
        setArtists(a);
        setCustomers(c);
        setStudios(s);
        setSpecialities(sp);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  const applyBookingFilters = (next) => {
    setBookingFilters(next);
    setBookingPage(1);
    load(next);
  };

  const resetBookingFilters = () => {
    const def = { status: '', artistId: '', studioId: '', customerId: '', from: '', to: '', sort: 'latest' };
    setBookingFilters(def);
    setBookingPage(1);
    load(def);
  };

  useEffect(() => {
    load();
  }, []);

  const openNewBooking = () => {
    setEditingBooking(null);
    setBookingForm({
      artistId: '',
      customerId: '',
      studioId: studios[0]?.id || '',
      date: '',
      startTime: '',
      endTime: '',
      status: 'pending',
      totalAmount: '',
      notes: '',
    });
    setSelectedSlot(null);
    setNewCustomer({ name: '', email: '', phone: '' });
    setShowBookingForm(true);
  };

  const openEditBooking = (b) => {
    setEditingBooking(b);
    setBookingForm({
      artistId: b.artistId,
      customerId: b.customerId || '',
      studioId: b.studioId || '',
      date: b.date,
      startTime: b.startTime,
      endTime: b.endTime,
      status: b.status,
      totalAmount: b.totalAmount ?? '',
      notes: b.notes || '',
    });
    setSelectedSlot(null);
    setShowBookingForm(true);
  };

  const handleArtistChange = (artistId) => {
    setBookingForm((f) => ({ ...f, artistId, date: '', startTime: '', endTime: '' }));
    setSelectedSlot(null);
  };

  const handleCalendarDateSelect = (dateStr) => {
    setBookingForm((f) => ({ ...f, date: dateStr, startTime: '', endTime: '' }));
    setSelectedSlot(null);
  };

  const handleSlotSelect = (slot) => {
    setSelectedSlot(slot);
    setBookingForm((f) => ({ ...f, date: slot.date, startTime: slot.startTime, endTime: slot.endTime }));
  };

  const openBookingDetail = async (b) => {
    try {
      const full = await getBooking(b.id);
      setShowBookingDetail(full);
      setDownPaymentForm({
        amount: '',
        percent: '',
        method: 'BCA',
        transferDestination: '',
        currency: 'IDR',
        status: 'completed',
      });
    } catch (err) {
      setError(err.message);
    }
  };

  const addDownPayment = async (e) => {
    e.preventDefault();
    if (!showBookingDetail) return;
    const total = showBookingDetail.totalAmount ?? 0;
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
        bookingId: showBookingDetail.id,
        amount,
        currency: downPaymentForm.currency,
        method: downPaymentForm.method,
        type: 'down_payment',
        transferDestination: downPaymentForm.transferDestination || null,
        status: downPaymentForm.status,
      });
      const updated = await getBooking(showBookingDetail.id);
      setShowBookingDetail(updated);
      setDownPaymentForm((f) => ({ ...f, amount: '', percent: '' }));
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const submitReview = async (e) => {
    e.preventDefault();
    if (!showBookingDetail) return;
    setReviewSubmitting(true);
    setError(null);
    try {
      await createReview({
        bookingId: showBookingDetail.id,
        rating: Number(reviewForm.rating),
        comment: reviewForm.comment || null,
      });
      const updated = await getBooking(showBookingDetail.id);
      setShowBookingDetail(updated);
      setReviewForm({ rating: 5, comment: '' });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setReviewSubmitting(false);
    }
  };

  const getCommissionFor = (artistId, studioId) =>
    commissions.find((c) => c.artistId === artistId && c.studioId === studioId);

  const saveBooking = async (e) => {
    e.preventDefault();
    setError(null);
    let customerId = bookingForm.customerId;
    if (newCustomer.name.trim()) {
      try {
        const c = await createCustomer(newCustomer);
        customerId = c.id;
        setCustomers((prev) => [...prev, c]);
      } catch (err) {
        setError(err.message);
        return;
      }
    }
    const payload = {
      ...bookingForm,
      customerId: customerId || null,
      studioId: bookingForm.studioId || null,
      totalAmount: bookingForm.totalAmount === '' ? null : Number(bookingForm.totalAmount),
    };
    try {
      if (editingBooking) {
        await updateBooking(editingBooking.id, payload);
      } else {
        await createBooking(payload);
      }
      setShowBookingForm(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const removeBooking = async (id) => {
    if (!window.confirm('Delete this booking?')) return;
    try {
      await deleteBooking(id);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const openNewPayment = (bookingId = null) => {
    setEditingPayment(null);
    setPaymentForm({
      bookingId: bookingId || bookings[0]?.id || '',
      amount: '',
      currency: 'IDR',
      method: 'BCA',
      type: 'down_payment',
      transferDestination: '',
      status: 'pending',
    });
    setShowPaymentForm(true);
  };

  const openEditPayment = (p) => {
    setEditingPayment(p);
    setPaymentForm({
      bookingId: p.bookingId || '',
      amount: p.amount,
      currency: p.currency,
      method: p.method || 'BCA',
      type: p.type || 'down_payment',
      transferDestination: p.transferDestination || '',
      status: p.status,
    });
    setShowPaymentForm(true);
  };

  const savePayment = async (e) => {
    e.preventDefault();
    setError(null);
    const payload = {
      ...paymentForm,
      amount: Number(paymentForm.amount),
      bookingId: paymentForm.bookingId || null,
      type: paymentForm.type || null,
      transferDestination: paymentForm.transferDestination || null,
    };
    try {
      if (editingPayment) {
        await updatePayment(editingPayment.id, payload);
      } else {
        await createPayment(payload);
      }
      setShowPaymentForm(false);
      if (showBookingDetail && paymentForm.bookingId === showBookingDetail.id) {
        const list = await getBookings();
        const updated = list.find((x) => x.id === showBookingDetail.id);
        if (updated) setShowBookingDetail(updated);
      }
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const openNewCommission = () => {
    setEditingCommission(null);
    setCommissionForm({
      studioId: studios[0]?.id || '',
      artistId: artists[0]?.id || '',
      commissionPercent: '',
    });
    setShowCommissionForm(true);
  };

  const openEditCommission = (c) => {
    setEditingCommission(c);
    setCommissionForm({
      studioId: c.studioId,
      artistId: c.artistId,
      commissionPercent: String(c.commissionPercent),
    });
    setShowCommissionForm(true);
  };

  const saveCommission = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      if (editingCommission) {
        await updateCommission(editingCommission.id, { commissionPercent: Number(commissionForm.commissionPercent) });
      } else {
        await createCommission({
          studioId: commissionForm.studioId,
          artistId: commissionForm.artistId,
          commissionPercent: Number(commissionForm.commissionPercent),
        });
      }
      setShowCommissionForm(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const removeCommission = async (id) => {
    if (!window.confirm('Remove this commission agreement?')) return;
    try {
      await deleteCommission(id);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const addSpeciality = async (e) => {
    e.preventDefault();
    if (!specNewName.trim()) return;
    setError(null);
    try {
      await createSpeciality({ name: specNewName.trim() });
      setSpecNewName('');
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const saveSpecEdit = async (id) => {
    if (!specEditName.trim()) return;
    setError(null);
    try {
      await updateSpeciality(id, { name: specEditName.trim() });
      setSpecEditId(null);
      setSpecEditName('');
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const removeSpeciality = async (id) => {
    if (!window.confirm('Delete this speciality?')) return;
    setError(null);
    try {
      await deleteSpeciality(id);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className={styles.loading}>Loading studio…</div>;

  return (
    <div className={styles.wrap}>
      <h1>Studio Management</h1>
      <p className={styles.subtitle}>Manage artist bookings and payments</p>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.tabs}>
        <button
          type="button"
          className={tab === 'bookings' ? styles.tabActive : ''}
          onClick={() => setTab('bookings')}
        >
          Bookings
        </button>
        <button
          type="button"
          className={tab === 'payments' ? styles.tabActive : ''}
          onClick={() => setTab('payments')}
        >
          Payments
        </button>
        <button
          type="button"
          className={tab === 'commissions' ? styles.tabActive : ''}
          onClick={() => setTab('commissions')}
        >
          Commission
        </button>
        <button
          type="button"
          className={tab === 'specialities' ? styles.tabActive : ''}
          onClick={() => setTab('specialities')}
        >
          Specialities
        </button>
      </div>

      {tab === 'bookings' && (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <h2>Bookings</h2>
              {bookings.length > 0 && <span className={styles.countHint}>Showing {(bookingPage - 1) * ROWS_PER_PAGE + 1}–{Math.min(bookingPage * ROWS_PER_PAGE, bookings.length)} of {bookings.length}</span>}
            </div>
            <button type="button" onClick={openNewBooking} className={styles.addBtn}>
              + New booking
            </button>
          </div>
          <div className={styles.filterBar}>
            <select
              value={bookingFilters.status}
              onChange={(e) => applyBookingFilters({ ...bookingFilters, status: e.target.value })}
              className={styles.filterSelect}
              aria-label="Filter by status"
            >
              <option value="">All statuses</option>
              {BOOKING_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select
              value={bookingFilters.artistId}
              onChange={(e) => applyBookingFilters({ ...bookingFilters, artistId: e.target.value })}
              className={styles.filterSelect}
              aria-label="Filter by artist"
            >
              <option value="">All artists</option>
              {artists.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            <select
              value={bookingFilters.studioId}
              onChange={(e) => applyBookingFilters({ ...bookingFilters, studioId: e.target.value })}
              className={styles.filterSelect}
              aria-label="Filter by studio"
            >
              <option value="">All studios</option>
              {studios.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <select
              value={bookingFilters.customerId}
              onChange={(e) => applyBookingFilters({ ...bookingFilters, customerId: e.target.value })}
              className={styles.filterSelect}
              aria-label="Filter by customer"
            >
              <option value="">All customers</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <input
              type="date"
              value={bookingFilters.from}
              onChange={(e) => applyBookingFilters({ ...bookingFilters, from: e.target.value })}
              className={styles.filterDate}
              aria-label="From date"
            />
            <input
              type="date"
              value={bookingFilters.to}
              onChange={(e) => applyBookingFilters({ ...bookingFilters, to: e.target.value })}
              className={styles.filterDate}
              aria-label="To date"
            />
            <select
              value={bookingFilters.sort}
              onChange={(e) => applyBookingFilters({ ...bookingFilters, sort: e.target.value })}
              className={styles.filterSelect}
              aria-label="Sort order"
            >
              <option value="latest">Latest first</option>
              <option value="oldest">Oldest first</option>
            </select>
            <button type="button" onClick={resetBookingFilters} className={styles.filterReset}>
              Reset
            </button>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Artist</th>
                  <th>Customer</th>
                  <th>Total</th>
                  <th>Paid</th>
                  <th>Remaining</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {paginatedBookings.length === 0 ? (
                  <tr>
                    <td colSpan={9}>
                      {bookings.length === 0 && (bookingFilters.status || bookingFilters.artistId || bookingFilters.studioId || bookingFilters.customerId || bookingFilters.from || bookingFilters.to)
                        ? 'No bookings match your filters. Click Reset to clear filters.'
                        : 'No bookings yet. Create one above.'}
                    </td>
                  </tr>
                ) : (
                  paginatedBookings.map((b) => {
                    const commission = getCommissionFor(b.artistId, b.studioId);
                    return (
                      <tr key={b.id}>
                        <td>{b.date}</td>
                        <td>{b.startTime} – {b.endTime}</td>
                        <td>{b.artist?.name || '—'}</td>
                        <td>{b.customer?.name || '—'}</td>
                        <td>{formatRupiah(b.totalAmount)}</td>
                        <td>{formatRupiah(b.paidTotal)}</td>
                        <td className={b.remainingAmount != null && b.remainingAmount > 0 ? styles.remainingDue : ''}>
                          {formatRupiah(b.remainingAmount)}
                        </td>
                        <td>
                          <span className={styles[`status_${b.status}`]}>{b.status}</span>
                          {b.review && <span className={styles.reviewBadge} title={`Reviewed: ${b.review.rating}/5`}>★ {b.review.rating}</span>}
                        </td>
                        <td>
                          <button type="button" onClick={() => openBookingDetail(b)} className={styles.smBtn}>Detail</button>
                          <button type="button" onClick={() => openEditBooking(b)} className={styles.smBtn}>Edit</button>
                          <button type="button" onClick={() => removeBooking(b.id)} className={styles.smBtnDanger}>Delete</button>
                          {commission && <span className={styles.commissionBadge} title="Commission set">{commission.commissionPercent}%</span>}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <Pagination currentPage={bookingPage} totalPages={bookingTotalPages} onPageChange={setBookingPage} />
        </section>
      )}

      {tab === 'payments' && (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <h2>Payments</h2>
              {payments.length > 0 && <span className={styles.countHint}>Showing {(paymentPage - 1) * ROWS_PER_PAGE + 1}–{Math.min(paymentPage * ROWS_PER_PAGE, payments.length)} of {payments.length}</span>}
            </div>
            <button type="button" onClick={openNewPayment} className={styles.addBtn}>
              + New payment
            </button>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Type</th>
                  <th>Transfer to</th>
                  <th>Status</th>
                  <th>Booking</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {paginatedPayments.length === 0 ? (
                  <tr>
                    <td colSpan={7}>No payments yet. Create one above or add a down payment from a booking.</td>
                  </tr>
                ) : (
                  paginatedPayments.map((p) => (
                    <tr key={p.id}>
                      <td>{formatRupiah(p.amount)} <span className={styles.convHint}>{formatWithConversion(p.amount).usd}</span></td>
                      <td>{p.method || '—'}</td>
                      <td>{p.type || '—'}</td>
                      <td>{p.transferDestination || '—'}</td>
                      <td><span className={styles[`status_${p.status}`]}>{p.status}</span></td>
                      <td>
                        {p.booking
                          ? `${p.booking.date} – ${p.booking.artist?.name || ''}`
                          : '—'}
                      </td>
                      <td>
                        <button type="button" onClick={() => openEditPayment(p)} className={styles.smBtn}>Edit</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination currentPage={paymentPage} totalPages={paymentTotalPages} onPageChange={setPaymentPage} />
        </section>
      )}

      {tab === 'commissions' && (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <h2>Studio commission (artist agreement %)</h2>
              {commissions.length > 0 && <span className={styles.countHint}>Showing {(commissionPage - 1) * ROWS_PER_PAGE + 1}–{Math.min(commissionPage * ROWS_PER_PAGE, commissions.length)} of {commissions.length}</span>}
            </div>
            <button type="button" onClick={openNewCommission} className={styles.addBtn}>
              + Add commission
            </button>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Studio</th>
                  <th>Artist</th>
                  <th>Studio commission %</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {paginatedCommissions.length === 0 ? (
                  <tr>
                    <td colSpan={4}>No commission agreements. Add one to set the % the studio takes per artist.</td>
                  </tr>
                ) : (
                  paginatedCommissions.map((c) => (
                    <tr key={c.id}>
                      <td>{c.studio?.name || '—'}</td>
                      <td>{c.artist?.name || '—'}</td>
                      <td>{c.commissionPercent}%</td>
                      <td>
                        <button type="button" onClick={() => openEditCommission(c)} className={styles.smBtn}>Edit</button>
                        <button type="button" onClick={() => removeCommission(c.id)} className={styles.smBtnDanger}>Remove</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination currentPage={commissionPage} totalPages={commissionTotalPages} onPageChange={setCommissionPage} />
        </section>
      )}

      {tab === 'specialities' && (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <h2>Specialities</h2>
              {specialities.length > 0 && <span className={styles.countHint}>Showing {(specPage - 1) * ROWS_PER_PAGE + 1}–{Math.min(specPage * ROWS_PER_PAGE, specialities.length)} of {specialities.length}</span>}
            </div>
            <form onSubmit={addSpeciality} className={styles.inlineAdd}>
              <input
                placeholder="New speciality name…"
                value={specNewName}
                onChange={(e) => setSpecNewName(e.target.value)}
                className={styles.inlineAddInput}
              />
              <button type="submit" className={styles.addBtn} disabled={!specNewName.trim()}>+ Add</button>
            </form>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th style={{ width: 180 }}></th>
                </tr>
              </thead>
              <tbody>
                {paginatedSpecialities.length === 0 ? (
                  <tr>
                    <td colSpan={2}>No specialities yet. Add one above.</td>
                  </tr>
                ) : (
                  paginatedSpecialities.map((sp) => (
                    <tr key={sp.id}>
                      <td>
                        {specEditId === sp.id ? (
                          <input
                            className={styles.inlineEditInput}
                            value={specEditName}
                            onChange={(e) => setSpecEditName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveSpecEdit(sp.id); if (e.key === 'Escape') setSpecEditId(null); }}
                            autoFocus
                          />
                        ) : (
                          sp.name
                        )}
                      </td>
                      <td>
                        {specEditId === sp.id ? (
                          <>
                            <button type="button" onClick={() => saveSpecEdit(sp.id)} className={styles.smBtn}>Save</button>
                            <button type="button" onClick={() => setSpecEditId(null)} className={styles.smBtn}>Cancel</button>
                          </>
                        ) : (
                          <>
                            <button type="button" onClick={() => { setSpecEditId(sp.id); setSpecEditName(sp.name); }} className={styles.smBtn}>Edit</button>
                            <button type="button" onClick={() => removeSpeciality(sp.id)} className={styles.smBtnDanger}>Delete</button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination currentPage={specPage} totalPages={specTotalPages} onPageChange={setSpecPage} />
        </section>
      )}

      {showBookingForm && (
        <div className={styles.modal} role="dialog" aria-modal="true">
          <div className={styles.bookingModalContent}>
            <h3>{editingBooking ? 'Edit booking' : 'New booking'}</h3>
            <form onSubmit={saveBooking}>
              <div className={styles.bookingLayout}>
                <div className={styles.bookingLeft}>
                  <label>
                    Artist *
                    <select
                      value={bookingForm.artistId}
                      onChange={(e) => handleArtistChange(e.target.value)}
                      required
                    >
                      <option value="">Select artist</option>
                      {artists.map((a) => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </label>

                  <div className={styles.calendarSection}>
                    <span className={styles.calLabel}>Pick a date from artist availability</span>
                    <AvailabilityCalendar
                      artistId={bookingForm.artistId}
                      selectedDate={bookingForm.date}
                      onSelectDate={handleCalendarDateSelect}
                      onSelectSlot={handleSlotSelect}
                      selectedSlot={selectedSlot}
                    />
                  </div>

                  {bookingForm.date && bookingForm.startTime && (
                    <div className={styles.selectedInfo}>
                      <span>Selected: <strong>{bookingForm.date}</strong></span>
                      <span>Time: <strong>{bookingForm.startTime} – {bookingForm.endTime}</strong></span>
                    </div>
                  )}
                </div>

                <div className={styles.bookingRight}>
                  <label>
                    Customer (optional)
                    <select
                      value={bookingForm.customerId}
                      onChange={(e) => setBookingForm((f) => ({ ...f, customerId: e.target.value }))}
                    >
                      <option value="">—</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </label>
                  <fieldset className={styles.inlineFieldset}>
                    <legend>Or add new customer</legend>
                    <input
                      placeholder="Name"
                      value={newCustomer.name}
                      onChange={(e) => setNewCustomer((n) => ({ ...n, name: e.target.value }))}
                    />
                    <input
                      placeholder="Email"
                      type="email"
                      value={newCustomer.email}
                      onChange={(e) => setNewCustomer((n) => ({ ...n, email: e.target.value }))}
                    />
                    <input
                      placeholder="Phone"
                      value={newCustomer.phone}
                      onChange={(e) => setNewCustomer((n) => ({ ...n, phone: e.target.value }))}
                    />
                  </fieldset>
                  <label>
                    Studio (optional)
                    <select
                      value={bookingForm.studioId}
                      onChange={(e) => setBookingForm((f) => ({ ...f, studioId: e.target.value }))}
                    >
                      <option value="">—</option>
                      {studios.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Total amount / IDR (agreed price)
                    <input
                      type="number"
                      step="1000"
                      min="0"
                      placeholder="e.g. 5000000"
                      value={bookingForm.totalAmount}
                      onChange={(e) => setBookingForm((f) => ({ ...f, totalAmount: e.target.value }))}
                    />
                  </label>
                  <label>
                    Status
                    <select
                      value={bookingForm.status}
                      onChange={(e) => setBookingForm((f) => ({ ...f, status: e.target.value }))}
                    >
                      {BOOKING_STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Notes
                    <textarea
                      value={bookingForm.notes}
                      onChange={(e) => setBookingForm((f) => ({ ...f, notes: e.target.value }))}
                      rows={2}
                    />
                  </label>
                </div>
              </div>

              <div className={styles.formActions}>
                <button
                  type="submit"
                  disabled={!bookingForm.artistId || !bookingForm.date || !bookingForm.startTime}
                >
                  {editingBooking ? 'Save' : 'Create booking'}
                </button>
                <button type="button" onClick={() => setShowBookingForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPaymentForm && (
        <div className={styles.modal} role="dialog" aria-modal="true">
          <div className={styles.modalContent}>
            <h3>{editingPayment ? 'Edit payment' : 'New payment'}</h3>
            <form onSubmit={savePayment}>
              <label>
                Booking (optional)
                <select
                  value={paymentForm.bookingId}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, bookingId: e.target.value }))}
                >
                  <option value="">—</option>
                  {bookings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.date} {b.startTime} – {b.artist?.name} {b.customer ? `(${b.customer.name})` : ''}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Amount *
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, amount: e.target.value }))}
                  required
                />
              </label>
              <label>
                Currency
                <input value="IDR (Rupiah)" disabled />
              </label>
              <label>
                Type
                <select
                  value={paymentForm.type}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, type: e.target.value }))}
                >
                  {PAYMENT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </label>
              <label>
                Method (where payment is sent)
                <select
                  value={paymentForm.method}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, method: e.target.value }))}
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
                  value={paymentForm.transferDestination}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, transferDestination: e.target.value }))}
                />
              </label>
              <label>
                Status
                <select
                  value={paymentForm.status}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, status: e.target.value }))}
                >
                  {PAYMENT_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </label>
              <div className={styles.formActions}>
                <button type="submit">Save</button>
                <button type="button" onClick={() => setShowPaymentForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBookingDetail && (
        <div className={styles.modal} role="dialog" aria-modal="true">
          <div className={styles.modalContent}>
            <h3>Booking: {showBookingDetail.date} {showBookingDetail.startTime} – {showBookingDetail.artist?.name}</h3>
            <div className={styles.bookingSummary}>
              <p><strong>Total amount:</strong> {formatRupiah(showBookingDetail.totalAmount)} <span className={styles.convHint}>{formatWithConversion(showBookingDetail.totalAmount).usd}</span></p>
              <p><strong>Paid:</strong> {formatRupiah(showBookingDetail.paidTotal)}</p>
              <p className={styles.remainingLine}><strong>Remaining to pay:</strong> <span className={(showBookingDetail.remainingAmount ?? 0) > 0 ? styles.remainingDue : ''}>{formatRupiah(showBookingDetail.remainingAmount)}</span></p>
              {showBookingDetail.artistId && showBookingDetail.studioId && getCommissionFor(showBookingDetail.artistId, showBookingDetail.studioId) && (() => {
                const c = getCommissionFor(showBookingDetail.artistId, showBookingDetail.studioId);
                const total = showBookingDetail.totalAmount ?? 0;
                const studioCut = (total * c.commissionPercent) / 100;
                const artistCut = total - studioCut;
                return (
                  <div className={styles.commissionBreakdown}>
                    <strong>Commission (studio {c.commissionPercent}%):</strong> Studio {formatRupiah(studioCut)} | Artist {formatRupiah(artistCut)}
                  </div>
                );
              })()}
            </div>
            <h4>Payments (down payment / transfer)</h4>
            <ul className={styles.paymentList}>
              {(showBookingDetail.payments || []).map((p) => (
                <li key={p.id}>
                  {formatRupiah(p.amount)} – {p.method || '—'} {p.transferDestination ? `(${p.transferDestination})` : ''} – {p.type || 'payment'} – {p.status}
                </li>
              ))}
              {(showBookingDetail.payments || []).length === 0 && <li>No payments yet.</li>}
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
                <button type="button" onClick={() => setShowBookingDetail(null)}>Close</button>
              </div>
            </form>

            {showBookingDetail.status === 'completed' && !showBookingDetail.review && (
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

            {showBookingDetail.review && (
              <div className={styles.existingReview}>
                <h4>Review</h4>
                <div className={styles.reviewStars}>
                  {'★'.repeat(showBookingDetail.review.rating)}{'☆'.repeat(5 - showBookingDetail.review.rating)}
                  <span className={styles.ratingText}>{showBookingDetail.review.rating}/5</span>
                </div>
                {showBookingDetail.review.comment && (
                  <p className={styles.reviewComment}>"{showBookingDetail.review.comment}"</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {showCommissionForm && (
        <div className={styles.modal} role="dialog" aria-modal="true">
          <div className={styles.modalContent}>
            <h3>{editingCommission ? 'Edit commission' : 'Add studio commission'}</h3>
            <p className={styles.help}>Percentage of each booking total that the studio keeps (artist agrees).</p>
            <form onSubmit={saveCommission}>
              <label>
                Studio *
                <select
                  value={commissionForm.studioId}
                  onChange={(e) => setCommissionForm((f) => ({ ...f, studioId: e.target.value }))}
                  required
                  disabled={!!editingCommission}
                >
                  <option value="">Select studio</option>
                  {studios.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Artist *
                <select
                  value={commissionForm.artistId}
                  onChange={(e) => setCommissionForm((f) => ({ ...f, artistId: e.target.value }))}
                  required
                  disabled={!!editingCommission}
                >
                  <option value="">Select artist</option>
                  {artists.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Studio commission %
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  placeholder="e.g. 20"
                  value={commissionForm.commissionPercent}
                  onChange={(e) => setCommissionForm((f) => ({ ...f, commissionPercent: e.target.value }))}
                  required
                />
              </label>
              <div className={styles.formActions}>
                <button type="submit">Save</button>
                <button type="button" onClick={() => setShowCommissionForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
