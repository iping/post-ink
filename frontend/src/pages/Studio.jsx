import { useState, useEffect } from 'react';
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
} from '../api';
import styles from './Studio.module.css';

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
    currency: 'USD',
    status: 'completed',
  });

  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    bookingId: '',
    amount: '',
    currency: 'USD',
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

  const [newCustomer, setNewCustomer] = useState({ name: '', email: '', phone: '' });

  const load = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      getBookings(),
      getPayments(),
      getCommissions(),
      getArtists(),
      getCustomers(),
      getStudios(),
    ])
      .then(([b, p, co, a, c, s]) => {
        setBookings(b);
        setPayments(p);
        setCommissions(co);
        setArtists(a);
        setCustomers(c);
        setStudios(s);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const openNewBooking = () => {
    setEditingBooking(null);
    setBookingForm({
      artistId: artists[0]?.id || '',
      customerId: customers[0]?.id || '',
      studioId: studios[0]?.id || '',
      date: new Date().toISOString().slice(0, 10),
      startTime: '09:00',
      endTime: '17:00',
      status: 'pending',
      totalAmount: '',
      notes: '',
    });
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
    setShowBookingForm(true);
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
        currency: 'USD',
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
      currency: 'USD',
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
      </div>

      {tab === 'bookings' && (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2>Bookings</h2>
            <button type="button" onClick={openNewBooking} className={styles.addBtn}>
              + New booking
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
                {bookings.length === 0 ? (
                  <tr>
                    <td colSpan={9}>No bookings yet. Create one above.</td>
                  </tr>
                ) : (
                  bookings.map((b) => {
                    const commission = getCommissionFor(b.artistId, b.studioId);
                    return (
                      <tr key={b.id}>
                        <td>{b.date}</td>
                        <td>{b.startTime} – {b.endTime}</td>
                        <td>{b.artist?.name || '—'}</td>
                        <td>{b.customer?.name || '—'}</td>
                        <td>{b.totalAmount != null ? `${b.totalAmount}` : '—'}</td>
                        <td>{b.paidTotal != null ? `${b.paidTotal}` : '—'}</td>
                        <td className={b.remainingAmount != null && b.remainingAmount > 0 ? styles.remainingDue : ''}>
                          {b.remainingAmount != null ? `${b.remainingAmount}` : '—'}
                        </td>
                        <td><span className={styles[`status_${b.status}`]}>{b.status}</span></td>
                        <td>
                          <button type="button" onClick={() => openBookingDetail(b)} className={styles.smBtn}>Down payment</button>
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
        </section>
      )}

      {tab === 'payments' && (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2>Payments</h2>
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
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={7}>No payments yet. Create one above or add a down payment from a booking.</td>
                  </tr>
                ) : (
                  payments.map((p) => (
                    <tr key={p.id}>
                      <td>{p.currency} {p.amount}</td>
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
        </section>
      )}

      {tab === 'commissions' && (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2>Studio commission (artist agreement %)</h2>
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
                {commissions.length === 0 ? (
                  <tr>
                    <td colSpan={4}>No commission agreements. Add one to set the % the studio takes per artist.</td>
                  </tr>
                ) : (
                  commissions.map((c) => (
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
        </section>
      )}

      {showBookingForm && (
        <div className={styles.modal} role="dialog" aria-modal="true">
          <div className={styles.modalContent}>
            <h3>{editingBooking ? 'Edit booking' : 'New booking'}</h3>
            <form onSubmit={saveBooking}>
              <label>
                Artist *
                <select
                  value={bookingForm.artistId}
                  onChange={(e) => setBookingForm((f) => ({ ...f, artistId: e.target.value }))}
                  required
                >
                  <option value="">Select artist</option>
                  {artists.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </label>
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
                Date *
                <input
                  type="date"
                  value={bookingForm.date}
                  onChange={(e) => setBookingForm((f) => ({ ...f, date: e.target.value }))}
                  required
                />
              </label>
              <label>
                Start time
                <input
                  type="time"
                  value={bookingForm.startTime}
                  onChange={(e) => setBookingForm((f) => ({ ...f, startTime: e.target.value }))}
                />
              </label>
              <label>
                End time
                <input
                  type="time"
                  value={bookingForm.endTime}
                  onChange={(e) => setBookingForm((f) => ({ ...f, endTime: e.target.value }))}
                />
              </label>
              <label>
                Total amount (agreed price)
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 500"
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
              <div className={styles.formActions}>
                <button type="submit">Save</button>
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
                <input
                  value={paymentForm.currency}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, currency: e.target.value }))}
                />
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
              <p><strong>Total amount:</strong> {showBookingDetail.totalAmount != null ? `${showBookingDetail.totalAmount}` : '—'}</p>
              <p><strong>Paid:</strong> {showBookingDetail.paidTotal != null ? `${showBookingDetail.paidTotal}` : '0'}</p>
              <p className={styles.remainingLine}><strong>Remaining to pay:</strong> <span className={(showBookingDetail.remainingAmount ?? 0) > 0 ? styles.remainingDue : ''}>{showBookingDetail.remainingAmount != null ? `${showBookingDetail.remainingAmount}` : '—'}</span></p>
              {showBookingDetail.artistId && showBookingDetail.studioId && getCommissionFor(showBookingDetail.artistId, showBookingDetail.studioId) && (() => {
                const c = getCommissionFor(showBookingDetail.artistId, showBookingDetail.studioId);
                const total = showBookingDetail.totalAmount ?? 0;
                const studioCut = (total * c.commissionPercent) / 100;
                const artistCut = total - studioCut;
                return (
                  <div className={styles.commissionBreakdown}>
                    <strong>Commission (studio {c.commissionPercent}%):</strong> Studio {studioCut.toFixed(2)} | Artist {artistCut.toFixed(2)}
                  </div>
                );
              })()}
            </div>
            <h4>Payments (down payment / transfer)</h4>
            <ul className={styles.paymentList}>
              {(showBookingDetail.payments || []).map((p) => (
                <li key={p.id}>
                  {p.amount} {p.currency} – {p.method || '—'} {p.transferDestination ? `(${p.transferDestination})` : ''} – {p.type || 'payment'} – {p.status}
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
