import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  getBookings,
  getPayments,
  getArtists,
  getCustomers,
  getStudios,
  deleteBooking,
  createPayment,
  updatePayment,
  getCommissions,
  createCommission,
  updateCommission,
  deleteCommission,
  getSpecialities,
  createSpeciality,
  updateSpeciality,
  deleteSpeciality,
} from '../api';
import { formatRupiah, formatWithConversion, formatNumberWithDots, parseNumberInput } from '../currency';
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

const BOOKING_STATUSES = ['draft', 'pending', 'confirmed', 'completed', 'cancelled'];
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
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') || 'bookings';
  const [tab, setTab] = useState(tabParam);

  useEffect(() => {
    const t = searchParams.get('tab') || 'bookings';
    if (['bookings', 'payments', 'commissions', 'customers', 'specialities'].includes(t)) setTab(t);
  }, [searchParams]);

  const switchTab = (t) => {
    setTab(t);
    setSearchParams(t === 'bookings' ? {} : { tab: t }, { replace: true });
  };
  const [payments, setPayments] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [artists, setArtists] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [studios, setStudios] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
  const [customerPage, setCustomerPage] = useState(1);
  const [customerHistoryModal, setCustomerHistoryModal] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
  const customerTotalPages = Math.max(1, Math.ceil(customers.length / ROWS_PER_PAGE));
  const specialitiesList = Array.isArray(specialities) ? specialities : [];
  const specTotalPages = Math.max(1, Math.ceil(specialitiesList.length / ROWS_PER_PAGE));

  const paginatedBookings = bookings.slice((bookingPage - 1) * ROWS_PER_PAGE, bookingPage * ROWS_PER_PAGE);
  const pendingBookingsCount = useMemo(
    () => bookings.filter((b) => b.status === 'pending').length,
    [bookings],
  );
  const paginatedPayments = payments.slice((paymentPage - 1) * ROWS_PER_PAGE, paymentPage * ROWS_PER_PAGE);
  const paginatedCommissions = commissions.slice((commissionPage - 1) * ROWS_PER_PAGE, commissionPage * ROWS_PER_PAGE);
  const paginatedCustomers = customers.slice((customerPage - 1) * ROWS_PER_PAGE, customerPage * ROWS_PER_PAGE);
  const paginatedSpecialities = specialitiesList.slice((specPage - 1) * ROWS_PER_PAGE, specPage * ROWS_PER_PAGE);

  const getCustomerBookings = (customerId) => bookings.filter((b) => b.customerId === customerId);
  const getLatestBooking = (customerId) => {
    const list = getCustomerBookings(customerId).sort((a, b) => {
      const da = a.date + (a.startTime || '');
      const db = b.date + (b.startTime || '');
      return db.localeCompare(da);
    });
    return list[0] || null;
  };
  const getCustomerDeposit = (customerId) => {
    return payments
      .filter((p) => p.booking?.customerId === customerId && p.status === 'completed')
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  };
  const getCustomerTransactions = (customerId) => {
    return payments
      .filter((p) => p.booking?.customerId === customerId)
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  };

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
        setSpecialities(Array.isArray(sp) ? sp : []);
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

  useEffect(() => {
    const t = searchParams.get('tab') || 'bookings';
    if (['bookings', 'payments', 'commissions', 'customers', 'specialities'].includes(t)) {
      setTab(t);
    }
  }, [searchParams]);

  const getCommissionFor = (artistId, studioId) =>
    commissions.find((c) => c.artistId === artistId && c.studioId === studioId);

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
    const name = (specNewName || '').trim();
    if (!name) return;
    setError(null);
    try {
      await createSpeciality({ name });
      setSpecNewName('');
      load();
    } catch (err) {
      setError(err.message || 'Failed to add speciality');
    }
  };

  const saveSpecEdit = async (id) => {
    const name = (specEditName || '').trim();
    if (!name) return;
    setError(null);
    try {
      await updateSpeciality(id, { name });
      setSpecEditId(null);
      setSpecEditName('');
      load();
    } catch (err) {
      setError(err.message || 'Failed to update speciality');
    }
  };

  const removeSpeciality = async (id) => {
    if (!window.confirm('Delete this speciality?')) return;
    setError(null);
    try {
      await deleteSpeciality(id);
      load();
    } catch (err) {
      setError(err.message || 'Failed to delete speciality');
    }
  };

  if (loading) return <div className={styles.loading}>Loading studio…</div>;

  return (
    <div className={styles.wrap}>
      <aside className={`${styles.sidebar} ${sidebarCollapsed ? styles.sidebarCollapsed : ''}`} aria-label="Studio menu">
        <div className={styles.sidebarHeader}>
          <button
            type="button"
            className={styles.burgerBtn}
            onClick={() => setSidebarCollapsed((v) => !v)}
            aria-expanded={!sidebarCollapsed}
            aria-label={sidebarCollapsed ? 'Open menu' : 'Minimize menu'}
          >
            <span className={styles.burgerLine} />
            <span className={styles.burgerLine} />
            <span className={styles.burgerLine} />
          </button>
          {!sidebarCollapsed && (
            <>
              <h1 className={styles.sidebarTitle}>Studio Management</h1>
              <p className={styles.sidebarSubtitle}>Manage your studio</p>
            </>
          )}
        </div>
        <nav className={styles.sideNav} aria-label="Admin sections">
          <button type="button" data-short="B" title="Bookings" className={tab === 'bookings' ? styles.sideNavActive : ''} onClick={() => switchTab('bookings')}>
            Bookings
            {pendingBookingsCount > 0 && <span className={styles.sideNavBadge} aria-label={`${pendingBookingsCount} pending`}>{pendingBookingsCount}</span>}
          </button>
          <button type="button" data-short="P" title="Payments" className={tab === 'payments' ? styles.sideNavActive : ''} onClick={() => switchTab('payments')}>Payments</button>
          <button type="button" data-short="C" title="Commission" className={tab === 'commissions' ? styles.sideNavActive : ''} onClick={() => switchTab('commissions')}>Commission</button>
          <button type="button" data-short="U" title="Customers" className={tab === 'customers' ? styles.sideNavActive : ''} onClick={() => switchTab('customers')}>Customers</button>
          <button type="button" data-short="S" title="Specialities" className={tab === 'specialities' ? styles.sideNavActive : ''} onClick={() => switchTab('specialities')}>Specialities</button>
        </nav>
      </aside>

      <main className={styles.main}>
        {error && <div className={styles.error} role="alert">{error}</div>}

        <div className={styles.adminCard}>
          <div className={styles.adminContent}>
      {tab === 'bookings' && (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <h2>Bookings</h2>
              {bookings.length > 0 && <span className={styles.countHint}>Showing {(bookingPage - 1) * ROWS_PER_PAGE + 1}–{Math.min(bookingPage * ROWS_PER_PAGE, bookings.length)} of {bookings.length}</span>}
            </div>
            <Link to="/manage/bookings/new" className={styles.addBtn}>
              + New booking
            </Link>
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
                  <th>No.</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Artist</th>
                  <th>Customer</th>
                  <th>Total</th>
                  <th>Paid</th>
                  <th>Remaining</th>
                  <th>Status</th>
                  <th>Created by</th>
                  <th>Created at</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {paginatedBookings.length === 0 ? (
                  <tr>
                    <td colSpan={12}>
                      {bookings.length === 0 && (bookingFilters.status || bookingFilters.artistId || bookingFilters.studioId || bookingFilters.customerId || bookingFilters.from || bookingFilters.to)
                        ? 'No bookings match your filters. Click Reset to clear filters.'
                        : 'No bookings yet. Create one above.'}
                    </td>
                  </tr>
                ) : (
                  paginatedBookings.map((b, i) => {
                    const commission = getCommissionFor(b.artistId, b.studioId);
                    const createdDate = b.createdAt ? new Date(b.createdAt) : null;
                    const createdStr = createdDate ? createdDate.toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' }) : '—';
                    const rowNum = (bookingPage - 1) * ROWS_PER_PAGE + i + 1;
                    return (
                      <tr key={b.id}>
                        <td>{rowNum}</td>
                        <td className={styles.cellDate}>{b.date}</td>
                        <td className={styles.cellTime}>{b.startTime} – {b.endTime}</td>
                        <td className={styles.cellEmphasis}>{b.artist?.name || '—'}</td>
                        <td className={styles.cellEmphasis}>{b.customer?.name || '—'}</td>
                        <td className={styles.cellAmount}>{formatRupiah(b.totalAmount)}</td>
                        <td className={styles.cellAmount}>{formatRupiah(b.paidTotal)}</td>
                        <td className={b.remainingAmount != null && b.remainingAmount > 0 ? `${styles.remainingDue} ${styles.cellAmount}` : styles.cellAmount}>
                          {formatRupiah(b.remainingAmount)}
                        </td>
                        <td>
                          <span className={styles[`status_${b.status}`]}>{b.status}</span>
                          {b.review && <span className={styles.reviewBadge} title={`Reviewed: ${b.review.rating}/5`}>★ {b.review.rating}</span>}
                        </td>
                        <td>{b.createdBy ?? '—'}</td>
                        <td>{createdStr}</td>
                        <td>
                          <Link to={`/manage/bookings/${b.id}`} className={styles.smBtn}>Detail</Link>
                          <Link to={`/manage/bookings/${b.id}/edit`} className={styles.smBtn}>Edit</Link>
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
                      <td className={styles.cellAmount}>{formatRupiah(p.amount)} <span className={styles.convHint}>{formatWithConversion(p.amount).usd}</span></td>
                      <td className={styles.cellEmphasis}>{p.method || '—'}</td>
                      <td>{p.type || '—'}</td>
                      <td>{p.transferDestination || '—'}</td>
                      <td><span className={styles[`status_${p.status}`]}>{p.status}</span></td>
                      <td className={styles.cellEmphasis}>
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
                      <td className={styles.cellEmphasis}>{c.studio?.name || '—'}</td>
                      <td className={styles.cellEmphasis}>{c.artist?.name || '—'}</td>
                      <td className={styles.cellAmount}>{c.commissionPercent}%</td>
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

      {tab === 'customers' && (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <h2>Customer profiles</h2>
              {customers.length > 0 && <span className={styles.countHint}>Showing {(customerPage - 1) * ROWS_PER_PAGE + 1}–{Math.min(customerPage * ROWS_PER_PAGE, customers.length)} of {customers.length}</span>}
            </div>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>No.</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Deposit (paid)</th>
                  <th>Total orders</th>
                  <th>Latest project / order</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {paginatedCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={9}>No customers yet. Customers are added when you create a booking (select or create customer).</td>
                  </tr>
                ) : (
                  paginatedCustomers.map((c, i) => {
                    const customerBookings = getCustomerBookings(c.id);
                    const latest = getLatestBooking(c.id);
                    const deposit = getCustomerDeposit(c.id);
                    const rowNum = (customerPage - 1) * ROWS_PER_PAGE + i + 1;
                    const createdDate = c.createdAt ? new Date(c.createdAt) : null;
                    const createdStr = createdDate ? createdDate.toLocaleDateString('en-GB', { dateStyle: 'short' }) : '—';
                    return (
                      <tr key={c.id}>
                        <td>{rowNum}</td>
                        <td className={styles.cellEmphasis}>{c.name || '—'}</td>
                        <td>{c.email || '—'}</td>
                        <td>{c.phone || '—'}</td>
                        <td className={styles.cellAmount}>{formatRupiah(deposit)}</td>
                        <td className={styles.cellAmount}>{customerBookings.length}</td>
                        <td>
                          {latest ? (
                            <Link to={`/manage/bookings/${latest.id}`} className={styles.cellLatest}>
                              {latest.date} {latest.startTime} – {latest.artist?.name || '—'}
                              {latest.shortCode && <span className={styles.cellShortCode}> #{latest.shortCode}</span>}
                            </Link>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td>{createdStr}</td>
                        <td>
                          <button type="button" className={styles.smBtn} onClick={() => setCustomerHistoryModal(c)}>History</button>
                          <button type="button" className={styles.smBtn} onClick={() => { applyBookingFilters({ ...bookingFilters, customerId: c.id }); switchTab('bookings'); }}>View bookings</button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <Pagination currentPage={customerPage} totalPages={customerTotalPages} onPageChange={setCustomerPage} />
        </section>
      )}

      {tab === 'specialities' && (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <h2>Specialities</h2>
              {specialitiesList.length > 0 && <span className={styles.countHint}>Showing {(specPage - 1) * ROWS_PER_PAGE + 1}–{Math.min(specPage * ROWS_PER_PAGE, specialitiesList.length)} of {specialitiesList.length}</span>}
            </div>
          </div>
          <div className={styles.specAddBar}>
            <form onSubmit={addSpeciality} className={styles.inlineAdd}>
              <label htmlFor="spec-new-name" className={styles.specAddLabel}>Add speciality</label>
              <input
                id="spec-new-name"
                placeholder="e.g. Black & Grey, Japanese"
                value={specNewName}
                onChange={(e) => setSpecNewName(e.target.value)}
                className={styles.inlineAddInput}
                aria-label="New speciality name"
              />
              <button type="submit" className={styles.addBtn} disabled={!specNewName.trim()}>+ Add</button>
            </form>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>No.</th>
                  <th>Name</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedSpecialities.length === 0 ? (
                  <tr>
                    <td colSpan={3}>No specialities yet. Add one above.</td>
                  </tr>
                ) : (
                  paginatedSpecialities.map((sp, i) => {
                    const rowNum = (specPage - 1) * ROWS_PER_PAGE + i + 1;
                    return (
                      <tr key={sp.id}>
                        <td>{rowNum}</td>
                        <td>
                          {specEditId === sp.id ? (
                            <input
                              className={styles.inlineEditInput}
                              value={specEditName}
                              onChange={(e) => setSpecEditName(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') saveSpecEdit(sp.id); if (e.key === 'Escape') setSpecEditId(null); }}
                              autoFocus
                              aria-label="Edit speciality name"
                            />
                          ) : (
                            <span className={styles.cellEmphasis}>{sp.name || '—'}</span>
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
                              <button type="button" onClick={() => { setSpecEditId(sp.id); setSpecEditName(sp.name || ''); }} className={styles.smBtn}>Edit</button>
                              <button type="button" onClick={() => removeSpeciality(sp.id)} className={styles.smBtnDanger}>Delete</button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <Pagination currentPage={specPage} totalPages={specTotalPages} onPageChange={setSpecPage} />
        </section>
      )}

      {customerHistoryModal && (
        <div className={styles.modal} role="dialog" aria-modal="true" aria-label="Customer transaction history">
          <div className={styles.modalContent} style={{ maxWidth: '560px' }}>
            <h3>Transaction history – {customerHistoryModal.name}</h3>
            <p className={styles.help}>All payments linked to this customer&apos;s bookings.</p>
            {(() => {
              const tx = getCustomerTransactions(customerHistoryModal.id);
              const totalPaid = getCustomerDeposit(customerHistoryModal.id);
              return (
                <>
                  <p className={styles.transactionSummary}><strong>Total paid (completed):</strong> {formatRupiah(totalPaid)}</p>
                  {tx.length === 0 ? (
                    <p className={styles.help}>No transactions yet.</p>
                  ) : (
                    <ul className={styles.transactionList}>
                      {tx.map((p) => (
                        <li key={p.id} className={styles.transactionItem}>
                          <span className={styles.transactionDate}>{p.createdAt ? new Date(p.createdAt).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' }) : '—'}</span>
                          <span className={styles.cellAmount}>{formatRupiah(p.amount)}</span>
                          <span>{p.type || '—'}</span>
                          <span>{p.method || '—'}</span>
                          <span className={styles[`status_${p.status}`]}>{p.status}</span>
                          {p.bookingId ? (
                            <Link to={`/manage/bookings/${p.booking?.id}`} className={styles.cellLatest}>
                              Booking {p.booking?.shortCode || p.booking?.date || p.bookingId.slice(0, 8)}
                            </Link>
                          ) : (
                            '—'
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              );
            })()}
            <div className={styles.formActions}>
              <button type="button" onClick={() => setCustomerHistoryModal(null)}>Close</button>
            </div>
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
                  type="text"
                  inputMode="numeric"
                  placeholder="e.g. 500.000"
                  value={formatNumberWithDots(paymentForm.amount)}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, amount: parseNumberInput(e.target.value) }))}
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
        </div>
      </main>
    </div>
  );
}
