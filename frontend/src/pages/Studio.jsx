import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  getBookings,
  getPayments,
  getArtists,
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
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
  getPaymentDestinations,
  createPaymentDestination,
  updatePaymentDestination,
  deletePaymentDestination,
  getUsers,
  createUser,
  updateUser,
  deleteUser,
} from '../api';
import { formatRupiah, formatWithConversion, formatNumberWithDots, parseNumberInput } from '../currency';
import styles from './Studio.module.css';
import { ArtistList } from './ArtistList';
import { IdWithCopy } from '../components/IdWithCopy';

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

const BOOKING_STATUSES = ['Unpaid', 'Paid'];
const PAYMENT_STATUSES = ['pending', 'completed', 'refunded'];
const PAYMENT_TYPES = [
  { value: 'down_payment', label: 'Down payment' },
  { value: 'final', label: 'Final payment' },
  { value: 'other', label: 'Other' },
];
const LEAD_SOURCE_OPTIONS = [
  { value: 'website', label: 'Website' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'walkin', label: 'Walk-in' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'artist', label: 'Artist' },
];
const OWNER_TYPE_OPTIONS = [
  { value: 'studio', label: 'Studio' },
  { value: 'artist', label: 'Artist' },
];

function leadSourceLabel(value) {
  return LEAD_SOURCE_OPTIONS.find((option) => option.value === value)?.label || '—';
}

function ownerTypeLabel(value) {
  return OWNER_TYPE_OPTIONS.find((option) => option.value === value)?.label || '—';
}

function truncate(str, max = 25) {
  if (!str || typeof str !== 'string') return '—';
  const s = str.trim();
  return s.length <= max ? s : s.slice(0, max) + '…';
}

/** Preference can be JSON { text } or plain string */
function preferenceText(booking) {
  if (!booking?.preference) return '';
  try {
    const v = JSON.parse(booking.preference);
    return (v && typeof v.text === 'string') ? v.text : booking.preference;
  } catch {
    return booking.preference;
  }
}

/** Consistent tag color per artist id (hue 0–360, fixed saturation/lightness) */
function artistTagColor(artistId) {
  if (!artistId) return '120, 40%, 45%';
  let h = 0;
  for (let i = 0; i < artistId.length; i++) h = (h * 31 + artistId.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  const saturation = 42 + (h % 20);
  const lightness = 42 + (h % 12);
  return `${hue}, ${saturation}%, ${lightness}%`;
}

export function Studio() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') || 'dashboard';
  const [tab, setTab] = useState(tabParam);
  const [createdToast, setCreatedToast] = useState(false);
  const [artistLeaderboardMetric, setArtistLeaderboardMetric] = useState('orders');

  useEffect(() => {
    const t = searchParams.get('tab') || 'dashboard';
    if (['dashboard', 'bookings', 'artists', 'payments', 'commissions', 'customers', 'leads', 'specialities', 'payment-destinations', 'users'].includes(t)) {
      setTab(t);
    }
  }, [searchParams]);

  useEffect(() => {
    if (searchParams.get('created') === '1') {
      setTab('bookings');
      setSearchParams({ tab: 'bookings' }, { replace: true });
      setCreatedToast(true);
      const t = setTimeout(() => setCreatedToast(false), 5000);
      return () => clearTimeout(t);
    }
  }, [searchParams, setSearchParams]);

  const switchTab = (t) => {
    setTab(t);
    setSearchParams(t === 'dashboard' ? {} : { tab: t }, { replace: true });
  };
  const [payments, setPayments] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [artists, setArtists] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [studios, setStudios] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({ email: '', name: '', password: '', role: 'staff' });

  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    bookingId: '',
    amount: '',
    currency: 'IDR',
    type: 'down_payment',
    paymentDestinationId: '',
    receiverType: 'studio',
    receiverStudioId: '',
    receiverArtistId: '',
    status: 'pending',
  });

  const [showCommissionForm, setShowCommissionForm] = useState(false);
  const [editingCommission, setEditingCommission] = useState(null);
  const [commissionForm, setCommissionForm] = useState({
    studioId: '',
    artistId: '',
    commissionPercent: '',
  });

  const [showLeadForm, setShowLeadForm] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [leadForm, setLeadForm] = useState({ name: '', email: '', phone: '', leadSource: 'website', referredArtistId: '' });

  const [specialities, setSpecialities] = useState([]);
  const [specPage, setSpecPage] = useState(1);
  const [specNewName, setSpecNewName] = useState('');
  const [specEditId, setSpecEditId] = useState(null);
  const [specEditName, setSpecEditName] = useState('');

  const [paymentDestinations, setPaymentDestinations] = useState([]);
  const [destPage, setDestPage] = useState(1);
  const [showDestForm, setShowDestForm] = useState(false);
  const [editingDest, setEditingDest] = useState(null);
  const [destForm, setDestForm] = useState({ name: '', account: '', type: 'Bank', ownerType: 'studio', studioId: '', artistId: '', isActive: true });

  const [bookingPage, setBookingPage] = useState(1);
  const [paymentPage, setPaymentPage] = useState(1);
  const [commissionPage, setCommissionPage] = useState(1);
  const [customerPage, setCustomerPage] = useState(1);
  const [leadPage, setLeadPage] = useState(1);
  const [customerHistoryModal, setCustomerHistoryModal] = useState(null);

  const [bookingSearch, setBookingSearch] = useState('');

  const filterBookingsBySearch = (list, query) => {
    const q = (query || '').trim().toLowerCase();
    if (!q) return [...list].sort((a, b) => (b.date + (b.startTime || '')).localeCompare(a.date + (a.startTime || '')));
    return list.filter((b) => {
      const customerName = (b.customer?.name || '').toLowerCase();
      const artistName = (b.artist?.name || '').toLowerCase();
      const studioName = (b.studio?.name || '').toLowerCase();
      const projectName = (b.projectName || '').toLowerCase();
      const id = (b.id || '').toLowerCase();
      const shortCode = (b.shortCode || '').toLowerCase();
      const date = (b.date || '').toLowerCase();
      const startTime = (b.startTime || '').toLowerCase();
      const endTime = (b.endTime || '').toLowerCase();
      const placement = (b.placement || '').toLowerCase();
      const notes = (b.notes || '').toLowerCase();
      const status = (b.status || '').toLowerCase();
      const prefText = preferenceText(b).toLowerCase();
      return (
        customerName.includes(q) || artistName.includes(q) || studioName.includes(q) ||
        projectName.includes(q) || id.includes(q) || shortCode.includes(q) ||
        date.includes(q) || startTime.includes(q) || endTime.includes(q) ||
        placement.includes(q) || notes.includes(q) || status.includes(q) || prefText.includes(q)
      );
    }).sort((a, b) => (b.date + (b.startTime || '')).localeCompare(a.date + (a.startTime || '')));
  };

  const filteredBookings = filterBookingsBySearch(bookings, bookingSearch);
  const leadProfiles = customers.filter((c) => c.type === 'lead');
  const bookedCustomers = customers.filter((c) => c.type !== 'lead');
  const bookingTotalPages = Math.max(1, Math.ceil(filteredBookings.length / ROWS_PER_PAGE));
  const paymentTotalPages = Math.max(1, Math.ceil(payments.length / ROWS_PER_PAGE));
  const commissionTotalPages = Math.max(1, Math.ceil(commissions.length / ROWS_PER_PAGE));
  const customerTotalPages = Math.max(1, Math.ceil(bookedCustomers.length / ROWS_PER_PAGE));
  const leadTotalPages = Math.max(1, Math.ceil(leadProfiles.length / ROWS_PER_PAGE));
  const specialitiesList = Array.isArray(specialities) ? specialities : [];
  const specTotalPages = Math.max(1, Math.ceil(specialitiesList.length / ROWS_PER_PAGE));

  const destList = Array.isArray(paymentDestinations) ? paymentDestinations : [];
  const destTotalPages = Math.max(1, Math.ceil(destList.length / ROWS_PER_PAGE));

  const paginatedBookings = filteredBookings.slice((bookingPage - 1) * ROWS_PER_PAGE, bookingPage * ROWS_PER_PAGE);
  const paginatedPayments = payments.slice((paymentPage - 1) * ROWS_PER_PAGE, paymentPage * ROWS_PER_PAGE);
  const paginatedCommissions = commissions.slice((commissionPage - 1) * ROWS_PER_PAGE, commissionPage * ROWS_PER_PAGE);
  const paginatedCustomers = bookedCustomers.slice((customerPage - 1) * ROWS_PER_PAGE, customerPage * ROWS_PER_PAGE);
  const paginatedLeads = leadProfiles.slice((leadPage - 1) * ROWS_PER_PAGE, leadPage * ROWS_PER_PAGE);
  const paginatedSpecialities = specialitiesList.slice((specPage - 1) * ROWS_PER_PAGE, specPage * ROWS_PER_PAGE);
  const paginatedDests = destList.slice((destPage - 1) * ROWS_PER_PAGE, destPage * ROWS_PER_PAGE);
  const selectedPaymentBooking = useMemo(
    () => bookings.find((booking) => booking.id === paymentForm.bookingId) || null,
    [bookings, paymentForm.bookingId],
  );
  const paymentDestinationsForForm = useMemo(() => {
    return paymentDestinations.filter((destination) => {
      if (!destination.isActive && destination.id !== paymentForm.paymentDestinationId) return false;
      if (paymentForm.receiverType === 'studio') {
        if (destination.ownerType !== 'studio') return false;
        if (selectedPaymentBooking?.studioId) return destination.studioId === selectedPaymentBooking.studioId;
        return true;
      }
      if (destination.ownerType !== 'artist') return false;
      if (selectedPaymentBooking?.artistId) return destination.artistId === selectedPaymentBooking.artistId;
      return true;
    });
  }, [paymentDestinations, paymentForm.receiverType, paymentForm.paymentDestinationId, selectedPaymentBooking]);

  // High-level metrics for dashboard
  const todayStr = new Date().toISOString().slice(0, 10);
  const totalBookings = bookings.length;
  const totalPaidBookings = bookings.filter((b) => b.status === 'Paid').length;
  const totalUnpaidBookings = bookings.filter((b) => b.status === 'Unpaid').length;
  const todayBookings = bookings.filter((b) => b.date === todayStr).length;
  const upcomingBookings = bookings.filter((b) => b.date > todayStr).length;
  const totalCustomers = bookedCustomers.length;
  const totalLeads = leadProfiles.length;
  const totalArtists = artists.length;
  const totalRevenue = payments
    .filter((p) => p.status === 'completed')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  // Artist performance (orders + revenue)
  const artistStats = useMemo(() => {
    if (!Array.isArray(artists) || artists.length === 0) return [];
    return artists.map((a) => {
      const orders = bookings.filter((b) => b.artistId === a.id).length;
      const revenue = payments
        .filter(
          (p) =>
            p.status === 'completed' &&
            p.booking &&
            (p.booking.artistId === a.id || p.booking.artist?.id === a.id),
        )
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      return {
        id: a.id,
        name: a.name || 'Unknown artist',
        orders,
        revenue,
      };
    });
  }, [artists, bookings, payments]);

  const maxArtistOrders = Math.max(1, ...artistStats.map((a) => a.orders || 0));
  const maxArtistRevenue = Math.max(1, ...artistStats.map((a) => a.revenue || 0));

  const artistLeaderboard = useMemo(() => {
    const sorted = [...artistStats];
    if (artistLeaderboardMetric === 'revenue') {
      sorted.sort((a, b) => (b.revenue - a.revenue) || (b.orders - a.orders));
    } else {
      sorted.sort((a, b) => (b.orders - a.orders) || (b.revenue - a.revenue));
    }
    return sorted;
  }, [artistStats, artistLeaderboardMetric]);

  // Bookings per day for the last 7 days (for simple chart)
  const bookingsByDay = (() => {
    const daysBack = 6;
    const result = [];
    const today = new Date();
    for (let i = daysBack; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-GB', { weekday: 'short' });
      const count = bookings.filter((b) => b.date === dateStr).length;
      result.push({ date: dateStr, label, count });
    }
    return result;
  })();
  const maxBookingsPerDay = Math.max(1, ...bookingsByDay.map((d) => d.count));

  const getCustomerBookings = (customerId) => bookings.filter((b) => b.customerId === customerId);
  const paymentOwnerName = (ownerType, studioId, artistId) => {
    if (ownerType === 'studio') return studios.find((studio) => studio.id === studioId)?.name || 'Studio';
    if (ownerType === 'artist') return artists.find((artist) => artist.id === artistId)?.name || 'Artist';
    return '—';
  };
  const paymentDestinationDisplay = (destination) => {
    if (!destination) return '—';
    return `${destination.name}${destination.account ? ` — ${destination.account}` : ''}`;
  };
  const getLatestBooking = (customerId) => {
    const list = getCustomerBookings(customerId).sort((a, b) => {
      const da = a.date + (a.startTime || '');
      const db = b.date + (b.startTime || '');
      return db.localeCompare(da);
    });
    return list[0] || null;
  };
  /** Total paid (all payment types, completed) for this customer's bookings */
  const getCustomerTotalPaid = (customerId) => {
    return payments
      .filter((p) => {
        const bid = p.booking?.customerId ?? p.booking?.customer?.id;
        return bid === customerId && p.status === 'completed';
      })
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  };
  /** Deposit total: completed down_payment only for this customer's bookings */
  const getCustomerDeposit = (customerId, ownerType = null) => {
    return payments
      .filter((p) => {
        const bid = p.booking?.customerId ?? p.booking?.customer?.id;
        if (bid !== customerId || p.status !== 'completed' || p.type !== 'down_payment') return false;
        if (ownerType && p.receiverType !== ownerType) return false;
        return true;
      })
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  };
  /** List of deposit payments (down_payment) for this customer, for display */
  const getCustomerDepositPayments = (customerId) => {
    return payments
      .filter((p) => (p.booking?.customerId ?? p.booking?.customer?.id) === customerId && p.type === 'down_payment')
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  };
  const getCustomerTransactions = (customerId) => {
    return payments
      .filter((p) => (p.booking?.customerId ?? p.booking?.customer?.id) === customerId)
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  };

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
      getSpecialities(),
      getPaymentDestinations(),
      getUsers(),
    ])
      .then(([b, p, co, a, c, s, sp, pd, u]) => {
        setBookings(b);
        setPayments(p);
        setCommissions(co);
        setArtists(a);
        setCustomers(c);
        setStudios(s);
        setSpecialities(Array.isArray(sp) ? sp : []);
        setPaymentDestinations(Array.isArray(pd) ? pd : []);
        setUsers(Array.isArray(u) ? u : []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    setPaymentForm((form) => {
      const next = { ...form };
      if (selectedPaymentBooking) {
        if (form.receiverType === 'studio') {
          next.receiverStudioId = selectedPaymentBooking.studioId || '';
        } else {
          next.receiverArtistId = selectedPaymentBooking.artistId || '';
        }
      }
      if (form.paymentDestinationId) {
        const stillValid = paymentDestinationsForForm.some((destination) => destination.id === form.paymentDestinationId);
        if (!stillValid) next.paymentDestinationId = '';
      }
      return next;
    });
  }, [selectedPaymentBooking, paymentDestinationsForForm, paymentForm.receiverType]);

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
    const booking = bookings.find((item) => item.id === (bookingId || bookings[0]?.id)) || null;
    setEditingPayment(null);
    setPaymentForm({
      bookingId: booking?.id || '',
      amount: '',
      currency: 'IDR',
      type: 'down_payment',
      paymentDestinationId: '',
      receiverType: booking?.studioId ? 'studio' : 'artist',
      receiverStudioId: booking?.studioId || '',
      receiverArtistId: booking?.artistId || '',
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
      type: p.type || 'down_payment',
      paymentDestinationId: p.paymentDestinationId || '',
      receiverType: p.receiverType || (p.receiverStudioId ? 'studio' : 'artist'),
      receiverStudioId: p.receiverStudioId || p.booking?.studioId || '',
      receiverArtistId: p.receiverArtistId || p.booking?.artistId || '',
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
      paymentDestinationId: paymentForm.paymentDestinationId || null,
      receiverStudioId: paymentForm.receiverType === 'studio' ? paymentForm.receiverStudioId || null : null,
      receiverArtistId: paymentForm.receiverType === 'artist' ? paymentForm.receiverArtistId || null : null,
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

  const openNewLead = () => {
    setEditingLead(null);
    setLeadForm({ name: '', email: '', phone: '', leadSource: 'website', referredArtistId: '' });
    setShowLeadForm(true);
  };

  const openEditLead = (lead) => {
    setEditingLead(lead);
    setLeadForm({
      name: lead.name || '',
      email: lead.email || '',
      phone: lead.phone || '',
      leadSource: lead.leadSource || 'website',
      referredArtistId: lead.referredArtistId || '',
    });
    setShowLeadForm(true);
  };

  const saveLead = async (e) => {
    e.preventDefault();
    setError(null);
    const payload = {
      name: (leadForm.name || '').trim(),
      email: (leadForm.email || '').trim() || null,
      phone: (leadForm.phone || '').trim() || null,
      type: 'lead',
      leadSource: leadForm.leadSource,
      referredArtistId: leadForm.leadSource === 'artist' ? (leadForm.referredArtistId || null) : null,
    };
    if (!payload.name) return setError('Lead name is required');
    if (!payload.email && !payload.phone) return setError('Fill at least one contact: email or phone');
    if (!payload.leadSource) return setError('Lead source is required');
    if (payload.leadSource === 'artist' && !payload.referredArtistId) return setError('Select an artist name');
    try {
      if (editingLead) {
        await updateCustomer(editingLead.id, payload);
      } else {
        await createCustomer(payload);
      }
      setShowLeadForm(false);
      setEditingLead(null);
      setLeadForm({ name: '', email: '', phone: '', leadSource: 'website', referredArtistId: '' });
      load();
    } catch (err) {
      setError(err.message || 'Failed to save lead');
    }
  };

  const removeLead = async (lead) => {
    if (!window.confirm(`Delete ${lead.name}?`)) return;
    setError(null);
    try {
      await deleteCustomer(lead.id);
      if (customerHistoryModal?.id === lead.id) setCustomerHistoryModal(null);
      load();
    } catch (err) {
      setError(err.message || 'Failed to delete lead');
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

  const DEST_TYPES = [{ value: 'Bank', label: 'Bank' }, { value: 'Credit Card', label: 'Credit Card' }, { value: 'Cash', label: 'Cash' }];
  const saveDest = async (e) => {
    e.preventDefault();
    setError(null);
    const name = (destForm.name || '').trim();
    if (!name) return setError('Bank name / display name is required');
    try {
      if (editingDest) {
        await updatePaymentDestination(editingDest.id, {
          name,
          account: (destForm.account || '').trim() || undefined,
          type: destForm.type,
          ownerType: destForm.ownerType,
          studioId: destForm.ownerType === 'studio' ? destForm.studioId : null,
          artistId: destForm.ownerType === 'artist' ? destForm.artistId : null,
          isActive: destForm.isActive,
        });
        setEditingDest(null);
      } else {
        await createPaymentDestination({
          name,
          account: (destForm.account || '').trim() || undefined,
          type: destForm.type,
          ownerType: destForm.ownerType,
          studioId: destForm.ownerType === 'studio' ? destForm.studioId : null,
          artistId: destForm.ownerType === 'artist' ? destForm.artistId : null,
          isActive: destForm.isActive,
        });
      }
      setDestForm({ name: '', account: '', type: 'Bank', ownerType: 'studio', studioId: studios[0]?.id || '', artistId: artists[0]?.id || '', isActive: true });
      setShowDestForm(false);
      load();
    } catch (err) {
      setError(err.message || 'Failed to save');
    }
  };
  const removeDest = async (id) => {
    if (!window.confirm('Delete this payment option?')) return;
    setError(null);
    try {
      await deletePaymentDestination(id);
      load();
    } catch (err) {
      setError(err.message || 'Failed to delete');
    }
  };

  const saveUser = async (e) => {
    e.preventDefault();
    setError(null);
    const email = (userForm.email || '').trim();
    if (!email) return setError('Email required');
    try {
      if (editingUser) {
        const data = { email, name: (userForm.name || '').trim() || null, role: userForm.role };
        if (userForm.password) data.password = userForm.password;
        await updateUser(editingUser.id, data);
      } else {
        if (!userForm.password || userForm.password.length < 6) return setError('Password required (min 6 characters)');
        await createUser({ email, name: (userForm.name || '').trim() || null, password: userForm.password, role: userForm.role });
      }
      setShowUserForm(false);
      setEditingUser(null);
      setUserForm({ email: '', name: '', password: '', role: 'staff' });
      load();
    } catch (err) {
      setError(err.message || 'Failed to save user');
    }
  };

  const removeUser = async (id) => {
    setError(null);
    try {
      await deleteUser(id);
      load();
    } catch (err) {
      setError(err.message || 'Failed to delete user');
    }
  };

  if (loading) return <div className={styles.loading}>Loading studio…</div>;

  return (
    <>
      {error && <div className={styles.error} role="alert">{error}</div>}
      {createdToast && (
        <div className={styles.toast} role="status" aria-live="polite">
          <span className={styles.toastIcon}>✓</span>
          <span>Booking record was successfully created.</span>
        </div>
      )}

      <div className={styles.adminCard}>
        <div className={styles.adminContent}>
      {tab === 'dashboard' && (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <h2>Dashboard</h2>
              <span className={styles.countHint}>Overview of bookings, revenue, customers, and leads</span>
            </div>
          </div>
          <div className={styles.dashboardRow}>
            <div className={styles.dashboardCard}>
              <span className={styles.dashboardLabel}>Total bookings</span>
              <span className={styles.dashboardValue}>{totalBookings}</span>
              <span className={styles.dashboardSub}>
                {todayBookings} today · {upcomingBookings} upcoming
              </span>
            </div>
            <button
              type="button"
              className={`${styles.dashboardCard} ${styles.dashboardCardClickable}`}
              onClick={() => { switchTab('bookings'); setBookingSearch('Paid'); setBookingPage(1); }}
            >
              <span className={styles.dashboardLabel}>Paid bookings</span>
              <span className={styles.dashboardValue}>{totalPaidBookings}</span>
              <span className={styles.dashboardSub}>Go to table filtered by Paid</span>
            </button>
            <button
              type="button"
              className={`${styles.dashboardCard} ${styles.dashboardCardClickable}`}
              onClick={() => { switchTab('bookings'); setBookingSearch('Unpaid'); setBookingPage(1); }}
            >
              <span className={styles.dashboardLabel}>Unpaid bookings</span>
              <span className={styles.dashboardValue}>{totalUnpaidBookings}</span>
              <span className={styles.dashboardSub}>Go to table filtered by Unpaid</span>
            </button>
            <div className={styles.dashboardCard}>
              <span className={styles.dashboardLabel}>Total revenue</span>
              <span className={styles.dashboardValue}>{formatRupiah(totalRevenue)}</span>
              <span className={styles.dashboardSub}>Completed payments</span>
            </div>
            <div className={styles.dashboardCard}>
              <span className={styles.dashboardLabel}>Customers</span>
              <span className={styles.dashboardValue}>{totalCustomers}</span>
              <span className={styles.dashboardSub}>Active profiles</span>
            </div>
            <div className={styles.dashboardCard}>
              <span className={styles.dashboardLabel}>Leads</span>
              <span className={styles.dashboardValue}>{totalLeads}</span>
              <span className={styles.dashboardSub}>Potential customers</span>
            </div>
            <div className={styles.dashboardCard}>
              <span className={styles.dashboardLabel}>Artists</span>
              <span className={styles.dashboardValue}>{totalArtists}</span>
              <span className={styles.dashboardSub}>Tattoo artists in studio</span>
            </div>
          </div>
          <div className={styles.chartRow}>
            <div className={styles.chartCard}>
              <div className={styles.chartHeader}>
                <span className={styles.chartTitle}>Bookings last 7 days</span>
                <span className={styles.chartSubtitle}>Daily count</span>
              </div>
              <div className={styles.chartBars}>
                {bookingsByDay.map((d) => (
                  <div key={d.date} className={styles.chartBar}>
                    <div className={styles.chartBarFillWrapper}>
                      <div
                        className={styles.chartBarFill}
                        style={{ height: `${(d.count / maxBookingsPerDay) * 100 || 0}%` }}
                        title={`${d.count} bookings on ${d.date}`}
                      />
                    </div>
                    <span className={styles.chartBarLabel}>{d.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {artistStats.length > 0 && (
            <div className={styles.chartRow}>
              <div className={styles.leaderboardCard}>
                <div className={styles.leaderboardHeader}>
                  <div>
                    <span className={styles.chartTitle}>Artist performance</span>
                    <span className={styles.chartSubtitle}>Top contributors by orders and revenue</span>
                  </div>
                  <div
                    className={styles.leaderboardToggle}
                    role="tablist"
                    aria-label="Artist leaderboard metric"
                  >
                    <button
                      type="button"
                      className={`${styles.leaderboardToggleBtn} ${artistLeaderboardMetric === 'orders' ? styles.leaderboardToggleBtnActive : ''}`}
                      onClick={() => setArtistLeaderboardMetric('orders')}
                      role="tab"
                      aria-selected={artistLeaderboardMetric === 'orders'}
                    >
                      By orders
                    </button>
                    <button
                      type="button"
                      className={`${styles.leaderboardToggleBtn} ${artistLeaderboardMetric === 'revenue' ? styles.leaderboardToggleBtnActive : ''}`}
                      onClick={() => setArtistLeaderboardMetric('revenue')}
                      role="tab"
                      aria-selected={artistLeaderboardMetric === 'revenue'}
                    >
                      By revenue
                    </button>
                  </div>
                </div>
                <ol className={styles.leaderboardList}>
                  {artistLeaderboard.slice(0, 6).map((a, index) => {
                    const value = artistLeaderboardMetric === 'revenue' ? a.revenue : a.orders;
                    const max = artistLeaderboardMetric === 'revenue' ? maxArtistRevenue : maxArtistOrders;
                    const width = max ? (value / max) * 100 : 0;
                    return (
                      <li key={a.id} className={styles.leaderboardItem}>
                        <div className={styles.leaderboardMeta}>
                          <span className={styles.leaderboardRank}>{index + 1}</span>
                          <div className={styles.leaderboardText}>
                            <span className={styles.leaderboardName}>{a.name}</span>
                            <span className={styles.leaderboardSmall}>
                              {a.orders} orders · {formatRupiah(a.revenue)}
                            </span>
                          </div>
                          <span className={styles.leaderboardValue}>
                            {artistLeaderboardMetric === 'revenue'
                              ? formatRupiah(a.revenue)
                              : `${a.orders} orders`}
                          </span>
                        </div>
                        <div className={styles.leaderboardBarTrack}>
                          <div
                            className={styles.leaderboardBarFill}
                            style={{ width: `${width || 0}%` }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </div>
          )}
        </section>
      )}

      {tab === 'bookings' && (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <h2>Bookings</h2>
              {filteredBookings.length > 0 && <span className={styles.countHint}>Showing {(bookingPage - 1) * ROWS_PER_PAGE + 1}–{Math.min(bookingPage * ROWS_PER_PAGE, filteredBookings.length)} of {filteredBookings.length}</span>}
            </div>
            <Link to="/manage/bookings/new" className={styles.addBtn}>
              + New booking
            </Link>
          </div>
          <div className={styles.filterBar}>
            <input
              type="search"
              value={bookingSearch}
              onChange={(e) => { setBookingSearch(e.target.value); setBookingPage(1); }}
              placeholder="Search bookings (customer, artist, studio, project, date, notes…)"
              className={styles.searchInput}
              aria-label="Search bookings"
            />
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>No.</th>
                  <th>ID</th>
                  <th>Project name</th>
                  <th>Customer</th>
                  <th>Artist</th>
                  <th>Studio</th>
                  <th>Project Schedule</th>
                  <th>Placement</th>
                  <th>Project Type</th>
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
                    <td colSpan={15}>
                      {bookings.length === 0
                        ? 'No bookings yet. Create one above.'
                        : 'No bookings match your search.'}
                    </td>
                  </tr>
                ) : (
                  paginatedBookings.map((b, i) => {
                    const commission = getCommissionFor(b.artistId, b.studioId);
                    const createdDate = b.createdAt ? new Date(b.createdAt) : null;
                    const createdStr = createdDate ? createdDate.toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' }) : '—';
                    const rowNum = (bookingPage - 1) * ROWS_PER_PAGE + i + 1;
                    const bookingDeposit = (b.payments || []).filter((p) => p.type === 'down_payment' && p.status === 'completed').reduce((s, p) => s + (Number(p.amount) || 0), 0);
                    return (
                      <tr key={b.id}>
                        <td>{rowNum}</td>
                        <td className={styles.cellId}><IdWithCopy id={b.id} /></td>
                        <td title={b.projectName || ''} className={styles.cellNotes}>{truncate(b.projectName, 22)}</td>
                        <td className={styles.cellEmphasis}>{b.customer?.name || '—'}</td>
                        <td>
                          {b.artist ? (
                            <span
                              className={styles.artistTag}
                              style={{ backgroundColor: `hsl(${artistTagColor(b.artistId)})`, color: '#fff' }}
                              title={b.artist.name}
                            >
                              {b.artist.name}
                            </span>
                          ) : '—'}
                        </td>
                        <td>{b.studio?.name || '—'}</td>
                        <td className={styles.cellSchedule}>
                          <span className={styles.cellDate}>{b.date}</span>
                          <span className={styles.cellTime}> {b.startTime} – {b.endTime}</span>
                        </td>
                        <td title={b.placement || ''}>{truncate(b.placement, 12)}</td>
                        <td>{b.pricingType === 'hourly' ? 'Hourly rate' : b.pricingType === 'fixed' ? 'Fixed rate' : '—'}</td>
                        <td className={styles.cellAmount}>{formatRupiah(b.totalAmount ?? (b.paidTotal != null && b.remainingAmount != null ? b.paidTotal + b.remainingAmount : null))}</td>
                        <td className={styles.cellAmount}>{formatRupiah(b.paidTotal)}</td>
                        <td className={b.remainingAmount != null && b.remainingAmount > 0 ? `${styles.remainingDue} ${styles.cellAmount}` : styles.cellAmount}>
                          {formatRupiah(b.remainingAmount)}
                        </td>
                        <td>
                          <span className={styles[`status_${b.status}`]}>{b.status}</span>
                        </td>
                        <td>
                          <span className={styles.tableActions}>
                            <Link to={`/manage/bookings/${b.id}`} className={styles.smBtn}>Detail</Link>
                            <Link to={`/manage/bookings/${b.id}/edit`} className={styles.smBtn}>Edit</Link>
                            <button type="button" onClick={() => removeBooking(b.id)} className={styles.smBtnDanger}>Delete</button>
                            {commission && <span className={styles.commissionBadge} title="Commission set">{commission.commissionPercent}%</span>}
                          </span>
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

      {tab === 'artists' && <ArtistList />}

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
                  <th>No.</th>
                  <th>ID</th>
                  <th>Amount</th>
                  <th>Receiver</th>
                  <th>Type</th>
                  <th>Account</th>
                  <th>Status</th>
                  <th>Booking</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {paginatedPayments.length === 0 ? (
                  <tr>
                    <td colSpan={9}>No payments yet. Create one above or add a down payment from a booking.</td>
                  </tr>
                ) : (
                  paginatedPayments.map((p, i) => {
                    const rowNum = (paymentPage - 1) * ROWS_PER_PAGE + i + 1;
                    return (
                    <tr key={p.id}>
                      <td>{rowNum}</td>
                      <td className={styles.cellId}><IdWithCopy id={p.id} /></td>
                      <td className={styles.cellAmount}>{formatRupiah(p.amount)} <span className={styles.convHint}>{formatWithConversion(p.amount).usd}</span></td>
                      <td className={styles.cellEmphasis}>
                        {ownerTypeLabel(p.receiverType)} · {paymentOwnerName(p.receiverType, p.receiverStudioId, p.receiverArtistId)}
                      </td>
                      <td>{p.type || '—'}</td>
                      <td>{p.paymentDestination ? paymentDestinationDisplay(p.paymentDestination) : (p.transferDestination || '—')}</td>
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
                  );
                  })
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
                  <th>No.</th>
                  <th>ID</th>
                  <th>Studio</th>
                  <th>Artist</th>
                  <th>Studio commission %</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {paginatedCommissions.length === 0 ? (
                  <tr>
                    <td colSpan={6}>No commission agreements. Add one to set the % the studio takes per artist.</td>
                  </tr>
                ) : (
                  paginatedCommissions.map((c, i) => {
                    const rowNum = (commissionPage - 1) * ROWS_PER_PAGE + i + 1;
                    return (
                    <tr key={c.id}>
                      <td>{rowNum}</td>
                      <td className={styles.cellId}><IdWithCopy id={c.id} /></td>
                      <td className={styles.cellEmphasis}>{c.studio?.name || '—'}</td>
                      <td className={styles.cellEmphasis}>{c.artist?.name || '—'}</td>
                      <td className={styles.cellAmount}>{c.commissionPercent}%</td>
                      <td>
                        <button type="button" onClick={() => openEditCommission(c)} className={styles.smBtn}>Edit</button>
                        <button type="button" onClick={() => removeCommission(c.id)} className={styles.smBtnDanger}>Remove</button>
                      </td>
                    </tr>
                  );
                  })
                )}
              </tbody>
            </table>
          </div>
          <Pagination currentPage={commissionPage} totalPages={commissionTotalPages} onPageChange={setCommissionPage} />
        </section>
      )}

      {tab === 'leads' && (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <h2>Leads</h2>
              {leadProfiles.length > 0 && <span className={styles.countHint}>Showing {(leadPage - 1) * ROWS_PER_PAGE + 1}–{Math.min(leadPage * ROWS_PER_PAGE, leadProfiles.length)} of {leadProfiles.length}</span>}
            </div>
            <button type="button" onClick={openNewLead} className={styles.addBtn}>
              + Add lead
            </button>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>No.</th>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Source</th>
                  <th>Artist</th>
                  <th>Bookings</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {paginatedLeads.length === 0 ? (
                  <tr>
                    <td colSpan={10}>No leads yet. Add one here, then they will become a customer automatically when they book.</td>
                  </tr>
                ) : (
                  paginatedLeads.map((lead, i) => {
                    const rowNum = (leadPage - 1) * ROWS_PER_PAGE + i + 1;
                    const bookingCount = getCustomerBookings(lead.id).length;
                    const createdStr = lead.createdAt ? new Date(lead.createdAt).toLocaleDateString('en-GB', { dateStyle: 'short' }) : '—';
                    return (
                      <tr key={lead.id}>
                        <td>{rowNum}</td>
                        <td className={styles.cellId}><IdWithCopy id={lead.id} /></td>
                        <td className={styles.cellEmphasis}>{lead.name || '—'}</td>
                        <td>{lead.email || '—'}</td>
                        <td>{lead.phone || '—'}</td>
                        <td><span className={styles.status_lead}>{leadSourceLabel(lead.leadSource)}</span></td>
                        <td>{lead.referredArtist?.name || '—'}</td>
                        <td className={styles.cellAmount}>{bookingCount}</td>
                        <td>{createdStr}</td>
                        <td>
                          <button type="button" className={styles.smBtn} onClick={() => openEditLead(lead)}>Edit</button>
                          <button
                            type="button"
                            className={styles.smBtn}
                            onClick={() => navigate(`/manage/bookings/new?customerId=${encodeURIComponent(lead.id)}`)}
                          >
                            Convert
                          </button>
                          <button type="button" className={styles.smBtnDanger} onClick={() => removeLead(lead)}>Delete</button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <Pagination currentPage={leadPage} totalPages={leadTotalPages} onPageChange={setLeadPage} />
        </section>
      )}

      {tab === 'customers' && (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <h2>Customer profiles</h2>
              {bookedCustomers.length > 0 && <span className={styles.countHint}>Showing {(customerPage - 1) * ROWS_PER_PAGE + 1}–{Math.min(customerPage * ROWS_PER_PAGE, bookedCustomers.length)} of {bookedCustomers.length}</span>}
            </div>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>No.</th>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Deposits</th>
                  <th>Total paid</th>
                  <th>Orders</th>
                  <th>Latest project</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {paginatedCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={11}>No booked customers yet. Leads will appear here automatically after they make a booking.</td>
                  </tr>
                ) : (
                  paginatedCustomers.map((c, i) => {
                    const customerBookings = getCustomerBookings(c.id);
                    const latest = getLatestBooking(c.id);
                    const studioDeposit = getCustomerDeposit(c.id, 'studio');
                    const artistDeposit = getCustomerDeposit(c.id, 'artist');
                    const totalPaid = getCustomerTotalPaid(c.id);
                    const rowNum = (customerPage - 1) * ROWS_PER_PAGE + i + 1;
                    const createdDate = c.createdAt ? new Date(c.createdAt) : null;
                    const createdStr = createdDate ? createdDate.toLocaleDateString('en-GB', { dateStyle: 'short' }) : '—';
                    return (
                      <tr key={c.id}>
                        <td>{rowNum}</td>
                        <td className={styles.cellId}><IdWithCopy id={c.id} /></td>
                        <td className={styles.cellEmphasis}>{c.name || '—'}</td>
                        <td>{c.email || '—'}</td>
                        <td>{c.phone || '—'}</td>
                        <td className={styles.cellAmount}>S {formatRupiah(studioDeposit)} · A {formatRupiah(artistDeposit)}</td>
                        <td className={styles.cellAmount}>{formatRupiah(totalPaid)}</td>
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
                          <button type="button" className={styles.smBtn} onClick={() => { setBookingSearch(c.name || ''); setBookingPage(1); switchTab('bookings'); }}>View bookings</button>
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
                  <th>ID</th>
                  <th>Name</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedSpecialities.length === 0 ? (
                  <tr>
                    <td colSpan={4}>No specialities yet. Add one above.</td>
                  </tr>
                ) : (
                  paginatedSpecialities.map((sp, i) => {
                    const rowNum = (specPage - 1) * ROWS_PER_PAGE + i + 1;
                    return (
                      <tr key={sp.id}>
                        <td>{rowNum}</td>
                        <td className={styles.cellId}><IdWithCopy id={sp.id} /></td>
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

      {tab === 'payment-destinations' && (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <h2>Payment options</h2>
              {destList.length > 0 && <span className={styles.countHint}>Showing {(destPage - 1) * ROWS_PER_PAGE + 1}–{Math.min(destPage * ROWS_PER_PAGE, destList.length)} of {destList.length}</span>}
            </div>
            <button type="button" className={styles.addBtn} onClick={() => { setEditingDest(null); setDestForm({ name: '', account: '', type: 'Bank', ownerType: 'studio', studioId: studios[0]?.id || '', artistId: artists[0]?.id || '', isActive: true }); setShowDestForm(true); }}>+ Add</button>
          </div>
          {showDestForm && (
            <form onSubmit={saveDest} className={styles.destForm}>
              <label className={styles.destFormLabel}>
                Bank name / display name *
                <input value={destForm.name} onChange={(e) => setDestForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. BCA, Mandiri" required />
              </label>
              <label className={styles.destFormLabel}>
                Bank account / reference
                <input value={destForm.account} onChange={(e) => setDestForm((f) => ({ ...f, account: e.target.value }))} placeholder="e.g. 1234567890" />
              </label>
              <label className={styles.destFormLabel}>
                Type
                <select value={destForm.type} onChange={(e) => setDestForm((f) => ({ ...f, type: e.target.value }))}>
                  {DEST_TYPES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </label>
              <label className={styles.destFormLabel}>
                Owner
                <select value={destForm.ownerType} onChange={(e) => setDestForm((f) => ({ ...f, ownerType: e.target.value }))}>
                  {OWNER_TYPE_OPTIONS.map((owner) => <option key={owner.value} value={owner.value}>{owner.label}</option>)}
                </select>
              </label>
              {destForm.ownerType === 'studio' && (
                <label className={styles.destFormLabel}>
                  Studio
                  <select value={destForm.studioId} onChange={(e) => setDestForm((f) => ({ ...f, studioId: e.target.value }))}>
                    <option value="">Select studio</option>
                    {studios.map((studio) => <option key={studio.id} value={studio.id}>{studio.name}</option>)}
                  </select>
                </label>
              )}
              {destForm.ownerType === 'artist' && (
                <label className={styles.destFormLabel}>
                  Artist
                  <select value={destForm.artistId} onChange={(e) => setDestForm((f) => ({ ...f, artistId: e.target.value }))}>
                    <option value="">Select artist</option>
                    {artists.map((artist) => <option key={artist.id} value={artist.id}>{artist.name}</option>)}
                  </select>
                </label>
              )}
              <label className={styles.destFormCheck}>
                <input type="checkbox" checked={destForm.isActive} onChange={(e) => setDestForm((f) => ({ ...f, isActive: e.target.checked }))} />
                Active (shown in booking form)
              </label>
              <div className={styles.destFormActions}>
                <button type="submit" className={styles.addBtn}>{editingDest ? 'Update' : 'Add'}</button>
                <button type="button" className={styles.smBtn} onClick={() => { setShowDestForm(false); setEditingDest(null); }}>Cancel</button>
              </div>
            </form>
          )}
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>No.</th>
                  <th>ID</th>
                  <th>Bank name</th>
                  <th>Bank account</th>
                  <th>Type</th>
                  <th>Owner</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedDests.length === 0 ? (
                  <tr>
                    <td colSpan={8}>No payment options yet. Add one to show in the booking form.</td>
                  </tr>
                ) : (
                  paginatedDests.map((d, i) => {
                    const rowNum = (destPage - 1) * ROWS_PER_PAGE + i + 1;
                    return (
                      <tr key={d.id}>
                        <td>{rowNum}</td>
                        <td className={styles.cellId}><IdWithCopy id={d.id} /></td>
                        <td className={styles.cellEmphasis}>{d.name || '—'}</td>
                        <td>{d.account || '—'}</td>
                        <td>{d.type || '—'}</td>
                        <td>{ownerTypeLabel(d.ownerType)} · {d.ownerType === 'studio' ? d.studio?.name || '—' : d.artist?.name || '—'}</td>
                        <td>{d.isActive ? 'Active' : 'Inactive'}</td>
                        <td>
                          <button type="button" onClick={() => { setEditingDest(d); setDestForm({ name: d.name || '', account: d.account || '', type: d.type || 'Bank', ownerType: d.ownerType || 'studio', studioId: d.studioId || '', artistId: d.artistId || '', isActive: d.isActive !== false }); setShowDestForm(true); }} className={styles.smBtn}>Edit</button>
                          <button type="button" onClick={() => removeDest(d.id)} className={styles.smBtnDanger}>Delete</button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <Pagination currentPage={destPage} totalPages={destTotalPages} onPageChange={setDestPage} />
        </section>
      )}

      {tab === 'users' && (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <h2>User management</h2>
              {users.length > 0 && <span className={styles.countHint}>{users.length} user{users.length !== 1 ? 's' : ''}</span>}
            </div>
            <button type="button" className={styles.addBtn} onClick={() => { setEditingUser(null); setUserForm({ email: '', name: '', password: '', role: 'staff' }); setShowUserForm(true); }}>+ Add user</button>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>No.</th>
                  <th>ID</th>
                  <th>Email</th>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={7}>No users yet. Add one to allow login to the platform.</td>
                  </tr>
                ) : (
                  users.map((u, i) => {
                    const createdStr = u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-GB', { dateStyle: 'short' }) : '—';
                    return (
                      <tr key={u.id}>
                        <td>{i + 1}</td>
                        <td className={styles.cellId}><IdWithCopy id={u.id} /></td>
                        <td className={styles.cellEmphasis}>{u.email}</td>
                        <td>{u.name || '—'}</td>
                        <td><span className={u.role === 'admin' ? styles.status_confirmed : ''}>{u.role}</span></td>
                        <td>{createdStr}</td>
                        <td>
                          <button type="button" className={styles.smBtn} onClick={() => { setEditingUser(u); setUserForm({ email: u.email, name: u.name || '', password: '', role: u.role }); setShowUserForm(true); }}>Edit</button>
                          <button type="button" className={styles.smBtnDanger} onClick={() => { if (window.confirm(`Remove user ${u.email}?`)) removeUser(u.id); }}>Delete</button>
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

      {showLeadForm && (
        <div className={styles.modal} role="dialog" aria-modal="true" aria-label={editingLead ? 'Edit lead' : 'Add lead'}>
          <div className={styles.modalContent}>
            <h3>{editingLead ? 'Edit lead' : 'Add lead'}</h3>
            <p className={styles.help}>Leads are potential customers. They become customers automatically when a booking is created for them. Fill at least one contact method: email or phone.</p>
            <form onSubmit={saveLead}>
              <label>
                Name *
                <input
                  value={leadForm.name}
                  onChange={(e) => setLeadForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Full name"
                  required
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={leadForm.email}
                  onChange={(e) => setLeadForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="email@example.com"
                />
              </label>
              <label>
                Phone
                <input
                  value={leadForm.phone}
                  onChange={(e) => setLeadForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+62 ..."
                />
              </label>
              <label>
                Source *
                <select
                  value={leadForm.leadSource}
                  onChange={(e) =>
                    setLeadForm((f) => ({
                      ...f,
                      leadSource: e.target.value,
                      referredArtistId: e.target.value === 'artist' ? f.referredArtistId : '',
                    }))
                  }
                >
                  {LEAD_SOURCE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              {leadForm.leadSource === 'artist' && (
                <label>
                  Artist name *
                  <select
                    value={leadForm.referredArtistId}
                    onChange={(e) => setLeadForm((f) => ({ ...f, referredArtistId: e.target.value }))}
                    required
                  >
                    <option value="">Select artist</option>
                    {artists.map((artist) => (
                      <option key={artist.id} value={artist.id}>{artist.name}</option>
                    ))}
                  </select>
                </label>
              )}
              <div className={styles.formActions}>
                <button type="submit">{editingLead ? 'Save' : 'Add lead'}</button>
                <button type="button" onClick={() => { setShowLeadForm(false); setEditingLead(null); }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {customerHistoryModal && (
        <div className={styles.modal} role="dialog" aria-modal="true" aria-label="Customer transaction history">
          <div className={styles.modalContent} style={{ maxWidth: '560px' }}>
            <h3>Transaction history – {customerHistoryModal.name}</h3>
            <p className={styles.help}>All payments linked to this customer&apos;s bookings.</p>
            {(() => {
              const tx = getCustomerTransactions(customerHistoryModal.id);
              const totalPaid = getCustomerTotalPaid(customerHistoryModal.id);
              const studioDepositTotal = getCustomerDeposit(customerHistoryModal.id, 'studio');
              const artistDepositTotal = getCustomerDeposit(customerHistoryModal.id, 'artist');
              const depositPayments = getCustomerDepositPayments(customerHistoryModal.id);
              return (
                <>
                  <h4>Deposit information</h4>
                  <p className={styles.transactionSummary}><strong>Studio deposits:</strong> {formatRupiah(studioDepositTotal)}</p>
                  <p className={styles.transactionSummary}><strong>Artist deposits:</strong> {formatRupiah(artistDepositTotal)}</p>
                  {depositPayments.length === 0 ? (
                    <p className={styles.help}>No deposit payments yet.</p>
                  ) : (
                    <ul className={styles.paymentList}>
                      {depositPayments.map((p) => (
                        <li key={p.id}>
                          {p.createdAt ? new Date(p.createdAt).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' }) : '—'} — {formatRupiah(p.amount)} ({ownerTypeLabel(p.receiverType)} · {paymentOwnerName(p.receiverType, p.receiverStudioId, p.receiverArtistId)} · {p.status})
                          {p.bookingId && (
                            <> · <Link to={`/manage/bookings/${p.booking?.id}`} className={styles.cellLatest}>Booking {p.booking?.shortCode || p.booking?.date || p.bookingId.slice(0, 8)}</Link></>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className={styles.transactionSummary}><strong>Total paid (all completed):</strong> {formatRupiah(totalPaid)}</p>
                  {tx.length === 0 ? (
                    <p className={styles.help}>No transactions yet.</p>
                  ) : (
                    <ul className={styles.transactionList}>
                      {tx.map((p) => (
                        <li key={p.id} className={styles.transactionItem}>
                          <span className={styles.transactionDate}>{p.createdAt ? new Date(p.createdAt).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' }) : '—'}</span>
                          <span className={styles.cellAmount}>{formatRupiah(p.amount)}</span>
                          <span>{p.type || '—'}</span>
                          <span>{ownerTypeLabel(p.receiverType)} · {paymentOwnerName(p.receiverType, p.receiverStudioId, p.receiverArtistId)}</span>
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
                  onChange={(e) => setPaymentForm((f) => ({ ...f, bookingId: e.target.value, paymentDestinationId: '' }))}
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
                Receiver
                <select
                  value={paymentForm.receiverType}
                  onChange={(e) => setPaymentForm((f) => ({
                    ...f,
                    receiverType: e.target.value,
                    paymentDestinationId: '',
                    receiverStudioId: e.target.value === 'studio' ? (selectedPaymentBooking?.studioId || f.receiverStudioId) : '',
                    receiverArtistId: e.target.value === 'artist' ? (selectedPaymentBooking?.artistId || f.receiverArtistId) : '',
                  }))}
                >
                  {OWNER_TYPE_OPTIONS.map((owner) => (
                    <option key={owner.value} value={owner.value}>{owner.label}</option>
                  ))}
                </select>
              </label>
              {!selectedPaymentBooking && paymentForm.receiverType === 'studio' && (
                <label>
                  Studio
                  <select
                    value={paymentForm.receiverStudioId}
                    onChange={(e) => setPaymentForm((f) => ({ ...f, receiverStudioId: e.target.value, paymentDestinationId: '' }))}
                  >
                    <option value="">Select studio</option>
                    {studios.map((studio) => (
                      <option key={studio.id} value={studio.id}>{studio.name}</option>
                    ))}
                  </select>
                </label>
              )}
              {!selectedPaymentBooking && paymentForm.receiverType === 'artist' && (
                <label>
                  Artist
                  <select
                    value={paymentForm.receiverArtistId}
                    onChange={(e) => setPaymentForm((f) => ({ ...f, receiverArtistId: e.target.value, paymentDestinationId: '' }))}
                  >
                    <option value="">Select artist</option>
                    {artists.map((artist) => (
                      <option key={artist.id} value={artist.id}>{artist.name}</option>
                    ))}
                  </select>
                </label>
              )}
              <label>
                Owned account
                <select
                  value={paymentForm.paymentDestinationId}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, paymentDestinationId: e.target.value }))}
                >
                  <option value="">Select account</option>
                  {paymentDestinationsForForm.map((destination) => (
                    <option key={destination.id} value={destination.id}>
                      {paymentDestinationDisplay(destination)} · {paymentOwnerName(destination.ownerType, destination.studioId, destination.artistId)}
                    </option>
                  ))}
                </select>
                {paymentDestinationsForForm.length === 0 && (
                  <p className={styles.help}>No active owned accounts match this payment yet.</p>
                )}
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

      {showUserForm && (
        <div className={styles.modal} role="dialog" aria-modal="true" aria-label={editingUser ? 'Edit user' : 'Add user'}>
          <div className={styles.modalContent}>
            <h3>{editingUser ? 'Edit user' : 'Add user'}</h3>
            <p className={styles.help}>Users can sign in to access Studio Management.</p>
            <form onSubmit={saveUser}>
              <label>
                Email *
                <input
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="user@example.com"
                  required
                  disabled={!!editingUser}
                />
              </label>
              <label>
                Name
                <input
                  value={userForm.name}
                  onChange={(e) => setUserForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Display name"
                />
              </label>
              <label>
                Password {editingUser ? '(leave blank to keep current)' : '*'}
                <input
                  type="password"
                  value={userForm.password}
                  onChange={(e) => setUserForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder={editingUser ? '••••••••' : 'Min 6 characters'}
                  minLength={editingUser ? undefined : 6}
                  required={!editingUser}
                />
              </label>
              <label>
                Role
                <select
                  value={userForm.role}
                  onChange={(e) => setUserForm((f) => ({ ...f, role: e.target.value }))}
                >
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
              <div className={styles.formActions}>
                <button type="submit">Save</button>
                <button type="button" onClick={() => { setShowUserForm(false); setEditingUser(null); }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
        </div>
      </div>
    </>
  );
}
