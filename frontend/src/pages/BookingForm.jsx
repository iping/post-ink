import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
  getArtists,
  getCustomers,
  getStudios,
  getBooking,
  createBooking,
  updateBooking,
  createCustomer,
  createPayment,
  getPayments,
  getPaymentDestinations,
  uploadPreferenceImages,
  uploadPaymentEvidence,
  uploadUrl,
} from '../api';
import { AvailabilityCalendar } from '../components/AvailabilityCalendar';
import { formatRupiah, formatNumberWithDots, parseNumberInput } from '../currency';
import styles from './BookingForm.module.css';
import layoutStyles from './Studio.module.css';
import artistStyles from './ArtistForm.module.css';

const MAX_PREFERENCE_IMAGES = 3;
const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB
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

const PLACEMENT_OPTIONS = [
  { value: 'Arm', label: 'Arm - Upper limb' },
  { value: 'Forearm', label: 'Forearm - Lower arm' },
  { value: 'Upper arm', label: 'Upper arm - Bicep area' },
  { value: 'Full sleeve', label: 'Full sleeve - Arm sleeve' },
  { value: 'Back', label: 'Back - Upper or full back' },
  { value: 'Chest', label: 'Chest - Chest area' },
  { value: 'Ribs', label: 'Ribs - Side / rib cage' },
  { value: 'Leg', label: 'Leg - Leg area' },
  { value: 'Thigh', label: 'Thigh - Upper leg' },
  { value: 'Calf', label: 'Calf - Lower leg' },
  { value: 'Hand', label: 'Hand - Hand or fingers' },
  { value: 'Neck', label: 'Neck - Neck or throat' },
  { value: 'Other', label: 'Other - Specify below' },
];

function safeParseJson(str) {
  if (!str) return [];
  try {
    const v = JSON.parse(str);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function filterCustomersBySearch(list, query) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return list;
  return list.filter((customer) => {
    const text = [
      customer.name,
      customer.email,
      customer.phone,
      customer.referredArtist?.name,
      customer.leadSource,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return text.includes(q);
  });
}

function customerSearchScore(customer, query) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return 0;

  const name = (customer.name || '').toLowerCase();
  const email = (customer.email || '').toLowerCase();
  const phone = (customer.phone || '').toLowerCase();
  const source = (customer.leadSource || '').toLowerCase();
  const artist = (customer.referredArtist?.name || '').toLowerCase();
  const haystack = [name, email, phone, source, artist].filter(Boolean).join(' ');
  const tokens = q.split(/\s+/).filter(Boolean);

  let score = 0;
  if (name === q) score += 140;
  if (email === q || phone === q) score += 130;
  if (name.startsWith(q)) score += 90;
  if (email.startsWith(q) || phone.startsWith(q)) score += 80;
  if (name.includes(q)) score += 50;
  if (email.includes(q) || phone.includes(q)) score += 45;
  if (artist.includes(q)) score += 35;
  if (source.includes(q)) score += 25;
  for (const token of tokens) {
    if (name.includes(token)) score += 18;
    if (email.includes(token) || phone.includes(token)) score += 15;
    if (artist.includes(token)) score += 10;
    if (source.includes(token)) score += 7;
  }
  if (haystack.includes(q)) score += 10;
  return score;
}

export function BookingForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isEdit = Boolean(id);
  const preselectedCustomerId = searchParams.get('customerId') || '';

  const [artists, setArtists] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [studios, setStudios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [bookingForm, setBookingForm] = useState({
    studioId: '',
    artistId: '',
    customerId: '',
    date: '',
    startTime: '09:00',
    endTime: '17:00',
    status: 'Unpaid',
    pricingType: 'fixed', // 'fixed' = final transaction refers to totalAmount; 'hourly' = total from projects (accumulative)
    totalAmount: '',
    placement: '',
    placementOther: '',
    preference: '',
    preferenceImages: [],
    projectName: '',
    notes: '',
  });
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    email: '',
    phone: '',
    leadSource: 'website',
    referredArtistId: '',
  });
  const [customerMode, setCustomerMode] = useState('existing');
  const [customerSearch, setCustomerSearch] = useState('');
  const [uploadingPreference, setUploadingPreference] = useState(false);
  const [useCustomTime, setUseCustomTime] = useState(false);
  const [depositDestinationId, setDepositDestinationId] = useState(''); // selected PaymentDestination id
  const [depositReceiverType, setDepositReceiverType] = useState('studio');
  const [deductFromDeposit, setDeductFromDeposit] = useState(false);
  const [depositEvidenceUrl, setDepositEvidenceUrl] = useState('');
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [paymentDestinations, setPaymentDestinations] = useState([]);
  const [payments, setPayments] = useState([]);
  const [estimationMode, setEstimationMode] = useState('rate'); // 'rate' = Fixed rate, 'unlimited' = Hourly rate
  const [estimationAmount, setEstimationAmount] = useState('');
  const [firstDepositAmount, setFirstDepositAmount] = useState(''); // editable first deposit; must be >= artist 1h rate
  const leadCustomers = useMemo(() => customers.filter((customer) => customer.type === 'lead'), [customers]);
  const existingCustomers = useMemo(() => customers.filter((customer) => customer.type !== 'lead'), [customers]);
  const selectedArtist = useMemo(
    () => artists.find((artist) => artist.id === bookingForm.artistId) || null,
    [artists, bookingForm.artistId],
  );
  const filteredLeadCustomers = useMemo(() => filterCustomersBySearch(leadCustomers, customerSearch), [leadCustomers, customerSearch]);
  const filteredExistingCustomers = useMemo(
    () => filterCustomersBySearch(existingCustomers, customerSearch),
    [existingCustomers, customerSearch],
  );
  const customerSuggestions = useMemo(() => {
    const q = (customerSearch || '').trim();
    if (!q) return [];
    return [...customers]
      .map((customer) => ({
        customer,
        score: customerSearchScore(customer, q),
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return (a.customer.name || '').localeCompare(b.customer.name || '');
      })
      .slice(0, 6);
  }, [customers, customerSearch]);
  const studioOwnedDestinations = useMemo(
    () => paymentDestinations.filter((destination) => destination.ownerType === 'studio' && destination.studioId === bookingForm.studioId),
    [paymentDestinations, bookingForm.studioId],
  );
  const artistOwnedDestinations = useMemo(
    () => paymentDestinations.filter((destination) => destination.ownerType === 'artist' && destination.artistId === bookingForm.artistId),
    [paymentDestinations, bookingForm.artistId],
  );
  const availableDepositDestinations = useMemo(
    () => (depositReceiverType === 'studio' ? studioOwnedDestinations : artistOwnedDestinations),
    [depositReceiverType, studioOwnedDestinations, artistOwnedDestinations],
  );

  useEffect(() => {
    Promise.all([getArtists({ activeOnly: true }), getCustomers(), getStudios(), getPaymentDestinations({ activeOnly: 'true' }), getPayments()])
      .then(([a, c, s, pd, pm]) => {
        setArtists(a);
        setCustomers(c);
        setStudios(s);
        setPaymentDestinations(Array.isArray(pd) ? pd : []);
        setPayments(Array.isArray(pm) ? pm : []);
        if (s.length > 0 && !bookingForm.studioId) {
          setBookingForm((f) => ({ ...f, studioId: s[0].id }));
          setDepositReceiverType('studio');
        }
        if (!isEdit && preselectedCustomerId) {
          const selectedCustomer = c.find((customer) => customer.id === preselectedCustomerId);
          if (selectedCustomer) {
            setCustomerMode(selectedCustomer.type === 'lead' ? 'leads' : 'existing');
            setBookingForm((f) => ({ ...f, customerId: preselectedCustomerId }));
          }
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [isEdit, preselectedCustomerId]);

  useEffect(() => {
    if (!bookingForm.customerId) return;
    const selectedCustomer = customers.find((customer) => customer.id === bookingForm.customerId);
    if (!selectedCustomer) return;
    setCustomerMode(selectedCustomer.type === 'lead' ? 'leads' : 'existing');
  }, [bookingForm.customerId, customers]);

  useEffect(() => {
    if (isEdit && id) {
      getBooking(id)
        .then((b) => {
          const placementInList = b.placement && PLACEMENT_OPTIONS.some((p) => p.value === b.placement);
          let preferenceText = '';
          let preferenceImages = [];
          if (b.preference) {
            try {
              const parsed = JSON.parse(b.preference);
              if (parsed && typeof parsed === 'object') {
                preferenceText = parsed.text || '';
                preferenceImages = Array.isArray(parsed.images) ? parsed.images : [];
              } else {
                preferenceText = b.preference;
              }
            } catch {
              preferenceText = b.preference;
            }
          }
          setBookingForm({
            studioId: b.studioId || '',
            artistId: b.artistId,
            customerId: b.customerId || '',
            date: b.date,
            startTime: b.startTime,
            endTime: b.endTime,
            status: (b.status === 'Paid' || b.status === 'Unpaid') ? b.status : 'Unpaid',
            pricingType: b.pricingType === 'hourly' ? 'hourly' : 'fixed',
            totalAmount: b.totalAmount ?? '',
            placement: placementInList ? b.placement : (b.placement ? 'Other' : ''),
            placementOther: placementInList ? '' : (b.placement || ''),
            preference: preferenceText,
            preferenceImages,
            projectName: b.projectName ?? '',
            notes: b.notes || '',
          });
          setEstimationMode(b.pricingType === 'hourly' ? 'unlimited' : 'rate');
        })
        .catch((e) => setError(e.message));
    }
  }, [isEdit, id]);

  useEffect(() => {
    if (depositReceiverType === 'studio' && !bookingForm.studioId && bookingForm.artistId) {
      setDepositReceiverType('artist');
    }
    if (depositReceiverType === 'artist' && !bookingForm.artistId && bookingForm.studioId) {
      setDepositReceiverType('studio');
    }
  }, [bookingForm.artistId, bookingForm.studioId, depositReceiverType]);

  // When artist changes, pre-fill first deposit with artist's 1h rate
  useEffect(() => {
    if (isEdit) return;
    const artist = artists.find((a) => a.id === bookingForm.artistId);
    const rate = artist?.rate != null ? Number(artist.rate) : null;
    setFirstDepositAmount(rate != null ? String(rate) : '');
  }, [bookingForm.artistId, isEdit, artists]);

  // Default project name: Artist – Customer – index (1 for new, id prefix for edit)
  const defaultProjectName = (() => {
    const artist = artists.find((a) => a.id === bookingForm.artistId);
    const customer = customers.find((c) => c.id === bookingForm.customerId);
    const artistName = artist?.name?.trim() || 'Artist';
    const customerName = customer?.name?.trim() || 'Customer';
    const index = isEdit && id ? id.slice(0, 8) : '1';
    return `${artistName} – ${customerName} – ${index}`;
  })();
  const handleStudioChange = (studioId) => {
    setBookingForm((f) => ({
      ...f,
      studioId,
      artistId: '',
      date: '',
      startTime: '',
      endTime: '',
    }));
    setSelectedSlot(null);
    setDepositDestinationId('');
    setDeductFromDeposit(false);
  };

  const handleArtistChange = (artistId) => {
    setBookingForm((f) => ({
      ...f,
      artistId,
      date: '',
      startTime: '',
      endTime: '',
    }));
    setSelectedSlot(null);
    setDepositDestinationId('');
    setDeductFromDeposit(false);
  };

  const handleCalendarDateSelect = (dateStr) => {
    setBookingForm((f) => ({ ...f, date: dateStr, startTime: '', endTime: '' }));
    setSelectedSlot(null);
  };

  const handleSlotSelect = (slot) => {
    setSelectedSlot(slot);
    setUseCustomTime(false);
    setBookingForm((f) => ({ ...f, date: slot.date, startTime: slot.startTime, endTime: slot.endTime }));
  };

  const chooseCustomerFromSuggestion = (customer) => {
    setCustomerMode(customer.type === 'lead' ? 'leads' : 'existing');
    setBookingForm((f) => ({ ...f, customerId: customer.id }));
    setDeductFromDeposit(false);
  };

  const paymentDestinationLabel = (destination) => {
    if (!destination) return '—';
    const ownerName = destination.ownerType === 'studio'
      ? destination.studio?.name || 'Studio'
      : destination.artist?.name || 'Artist';
    return `${destination.name}${destination.account ? ` — ${destination.account}` : ''} (${ownerName})`;
  };

  const buildPayload = (statusOverride) => {
    const placementValue =
      bookingForm.placement === 'Other'
        ? (bookingForm.placementOther || 'Other')
        : bookingForm.placement || null;
    const isDraft = statusOverride === 'draft';
    const date = bookingForm.date || (isDraft ? '1970-01-01' : '');
    const startTime = bookingForm.startTime || '09:00';
    const endTime = bookingForm.endTime || '10:00';
    return {
      studioId: bookingForm.studioId || null,
      artistId: bookingForm.artistId || (artists[0]?.id ?? ''),
      customerId: bookingForm.customerId || null,
      date,
      startTime,
      endTime,
      status: statusOverride ?? bookingForm.status,
      pricingType: bookingForm.pricingType === 'hourly' ? 'hourly' : 'fixed',
      totalAmount: bookingForm.pricingType === 'hourly' ? null : (bookingForm.totalAmount === '' ? null : Number(bookingForm.totalAmount)),
      placement: placementValue,
      preference:
        (bookingForm.preference?.trim() || bookingForm.preferenceImages?.length)
          ? JSON.stringify({
              text: (bookingForm.preference || '').trim() || null,
              images: bookingForm.preferenceImages || [],
            })
          : null,
      notes: bookingForm.notes?.trim() || null,
      projectName: defaultProjectName || null,
    };
  };

  const saveBooking = async (e, asDraft = false) => {
    e.preventDefault();
    setError(null);
    let customerId = bookingForm.customerId;
    if (customerMode === 'new' && !newCustomer.name.trim()) {
      setError('New customer name is required.');
      return;
    }
    if (customerMode === 'new' && newCustomer.name.trim()) {
      if (!newCustomer.email.trim() && !newCustomer.phone.trim()) {
        setError('New customer must have at least email or phone.');
        return;
      }
      if (!newCustomer.leadSource) {
        setError('Please select customer source.');
        return;
      }
      if (newCustomer.leadSource === 'artist' && !newCustomer.referredArtistId) {
        setError('Please select artist name for artist source.');
        return;
      }
      try {
        const c = await createCustomer({
          ...newCustomer,
          type: 'customer',
          referredArtistId: newCustomer.leadSource === 'artist' ? newCustomer.referredArtistId : null,
        });
        customerId = c.id;
        setCustomers((prev) => [...prev, c]);
      } catch (err) {
        setError(err.message);
        return;
      }
    }
    // Create booking = valid transaction (pending); Save as draft = draft
    const status = asDraft ? 'draft' : (isEdit ? bookingForm.status : 'pending');
    const payload = {
      ...buildPayload(status),
      customerId: customerId || null,
    };
    if (asDraft && !payload.artistId && artists.length > 0) {
      payload.artistId = artists[0].id;
    }
    // New booking, fixed price: use estimation (rate or unlimited)
    if (!isEdit && payload.pricingType === 'fixed') {
      if (estimationMode === 'unlimited') {
        payload.totalAmount = null;
      } else {
        const artist = artists.find((a) => a.id === payload.artistId);
        const amt = estimationAmount !== '' ? Number(estimationAmount) : (artist?.rate != null ? Number(artist.rate) : null);
        payload.totalAmount = amt != null && amt > 0 ? amt : null;
      }
    }
    if (!payload.artistId) {
      setError(asDraft ? 'Add at least one artist in Manage → Artists to save a draft.' : 'Select studio and artist, then date and time.');
      return;
    }
    if (!asDraft && firstDepositInvalid) {
      setError(`First deposit must be at least the artist's 1h rate (${formatRupiah(minDeposit)}).`);
      return;
    }
    if (!asDraft && payload.customerId && chosenDeposit > 0) {
      const customerBalance = getCustomerDeposit(payload.customerId, depositReceiverType);
      if (customerBalance >= chosenDeposit && !deductFromDeposit) {
        setError(`Please use the customer's ${depositReceiverType} deposit first. Check "Deduct first payment from customer's deposit" to continue the booking.`);
        return;
      }
      if (deductFromDeposit && customerBalance < chosenDeposit) {
        setError(`Customer deposit (${formatRupiah(customerBalance)}) is less than the first payment (${formatRupiah(chosenDeposit)}). Uncheck "Deduct from deposit" or choose another customer.`);
        return;
      }
    }
    if (!asDraft && chosenDeposit > 0 && !deductFromDeposit && depositDestinationId) {
      const selectedDestination = availableDepositDestinations.find((destination) => destination.id === depositDestinationId);
      if (!selectedDestination) {
        setError('Selected payment account does not match the current receiver or booking.');
        return;
      }
    }
    try {
      if (isEdit) {
        await updateBooking(id, payload);
        navigate('/manage?tab=bookings');
      } else {
        const created = await createBooking(payload);
        if (created?.id) {
          const depositAmt = chosenDeposit;
          if (depositAmt > 0) {
            if (deductFromDeposit) {
              try {
                await createPayment({
                  bookingId: created.id,
                  amount: depositAmt,
                  currency: 'IDR',
                  type: 'down_payment',
                  method: 'Deposit balance',
                  transferDestination: 'Existing customer deposit',
                  receiverType: depositReceiverType,
                  receiverStudioId: depositReceiverType === 'studio' ? payload.studioId : null,
                  receiverArtistId: depositReceiverType === 'artist' ? payload.artistId : null,
                  evidenceUrl: null,
                  status: 'completed',
                });
              } catch (payErr) {
                setError(payErr.message);
                return;
              }
            } else {
              const dest = depositDestinationId ? availableDepositDestinations.find((d) => d.id === depositDestinationId) : null;
              if (dest) {
                try {
                  await createPayment({
                    bookingId: created.id,
                    amount: depositAmt,
                    currency: 'IDR',
                    type: 'down_payment',
                    paymentDestinationId: dest.id,
                    receiverType: depositReceiverType,
                    receiverStudioId: depositReceiverType === 'studio' ? payload.studioId : null,
                    receiverArtistId: depositReceiverType === 'artist' ? payload.artistId : null,
                    evidenceUrl: depositEvidenceUrl || null,
                    status: 'completed',
                  });
                } catch (payErr) {
                  setError(payErr.message);
                  return;
                }
              }
            }
          }
          navigate('/manage?tab=bookings&created=1');
        } else {
          navigate('/manage?tab=bookings&created=1');
        }
      }
    } catch (err) {
      setError(err.message);
    }
  };

  // New booking: Save booking (create, no deposit). Edit: Save booking or Save as draft.
  const handleSubmit = (e) => saveBooking(e, false);
  const handleSaveDraft = (e) => saveBooking(e, true);

  const handlePreferenceImagesChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const current = bookingForm.preferenceImages || [];
    if (current.length + files.length > MAX_PREFERENCE_IMAGES) {
      setError(`Maximum ${MAX_PREFERENCE_IMAGES} images. You have ${current.length} and tried to add ${files.length}.`);
      e.target.value = '';
      return;
    }
    for (const f of files) {
      if (f.size > MAX_IMAGE_SIZE) {
        setError(`"${f.name}" is over 2MB. Max size per image is 2MB.`);
        e.target.value = '';
        return;
      }
    }
    setError(null);
    setUploadingPreference(true);
    try {
      const { urls } = await uploadPreferenceImages(files);
      setBookingForm((f) => ({ ...f, preferenceImages: [...(f.preferenceImages || []), ...urls] }));
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadingPreference(false);
      e.target.value = '';
    }
  };

  const removePreferenceImage = (index) => {
    setBookingForm((f) => ({
      ...f,
      preferenceImages: (f.preferenceImages || []).filter((_, i) => i !== index),
    }));
  };

  const minDeposit = selectedArtist?.rate != null ? Number(selectedArtist.rate) : 0;
  // Effective first deposit: editable, but must be >= artist's 1h rate
  const chosenDepositNum = firstDepositAmount !== '' ? Number(firstDepositAmount) : minDeposit;
  const chosenDeposit = chosenDepositNum >= minDeposit ? chosenDepositNum : minDeposit;
  const firstDepositInvalid = firstDepositAmount !== '' && chosenDepositNum < minDeposit;
  const paymentPreview = useMemo(() => {
    const totalAmount = bookingForm.pricingType === 'fixed'
      ? (estimationAmount !== '' ? Number(estimationAmount) : (selectedArtist?.rate != null ? Number(selectedArtist.rate) : 0))
      : 0;
    const firstPaymentAmount = chosenDeposit > 0 ? chosenDeposit : 0;
    const remainingAmount = Math.max(0, totalAmount - firstPaymentAmount);
    return {
      totalAmount,
      firstPaymentAmount,
      remainingAmount,
    };
  }, [
    bookingForm.pricingType,
    estimationAmount,
    selectedArtist,
    chosenDeposit,
  ]);

  /** Deposit total (completed down_payment) for a customer, for dropdown display */
  const getCustomerDeposit = (customerId, ownerType = null) => {
    return (payments || [])
      .filter((payment) => {
        const paymentCustomerId = payment.booking?.customerId ?? payment.booking?.customer?.id;
        if (paymentCustomerId !== customerId || payment.status !== 'completed' || payment.type !== 'down_payment') return false;
        if (ownerType && payment.receiverType !== ownerType) return false;
        return true;
      })
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  };

  const handleEvidenceChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_IMAGE_SIZE) {
      setError('Payment evidence must be 2MB or less.');
      e.target.value = '';
      return;
    }
    setError(null);
    setUploadingEvidence(true);
    try {
      const { url } = await uploadPaymentEvidence(file);
      setDepositEvidenceUrl(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadingEvidence(false);
      e.target.value = '';
    }
  };

  if (loading) return <div className={styles.loading}>Loading…</div>;

  return (
    <div className={artistStyles.page}>
      <div className={artistStyles.topBar}>
        <Link to={isEdit ? `/manage/bookings/${id}` : '/manage?tab=bookings'} className={artistStyles.backBtn}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
          {isEdit ? 'Back to Booking' : 'All Bookings'}
        </Link>
        <div className={artistStyles.topBarRight}>
          <span className={artistStyles.badge}>{isEdit ? 'Editing' : 'New Booking'}</span>
        </div>
      </div>

      <div className={artistStyles.hero}>
        <h1>{isEdit ? 'Edit Booking' : 'Add New Booking'}</h1>
        <p className={artistStyles.heroSub}>
          {isEdit
            ? 'Update booking details, schedule, and payment.'
            : 'Select artist, schedule, and customer to create a new booking.'}
        </p>
      </div>

      {error && (
        <div className={artistStyles.error} role="alert">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className={artistStyles.form}>
        <div className={artistStyles.grid}>
          <div className={artistStyles.col}>
            {/* Step 1: Customer */}
            <div className={artistStyles.card}>
              <div className={artistStyles.cardHead}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                <h2>Customer</h2>
              </div>
              <div className={styles.radioRow}>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="customerMode"
                    checked={customerMode === 'leads'}
                    onChange={() => {
                      setCustomerMode('leads');
                      setBookingForm((f) => ({ ...f, customerId: '' }));
                      setDeductFromDeposit(false);
                      setError(null);
                    }}
                  />
                  <span>Leads</span>
                </label>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="customerMode"
                    checked={customerMode === 'existing'}
                    onChange={() => {
                      setCustomerMode('existing');
                      setBookingForm((f) => ({ ...f, customerId: '' }));
                      setDeductFromDeposit(false);
                      setError(null);
                    }}
                  />
                  <span>Existing customer</span>
                </label>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="customerMode"
                    checked={customerMode === 'new'}
                    onChange={() => {
                      setCustomerMode('new');
                      setBookingForm((f) => ({ ...f, customerId: '' }));
                      setDeductFromDeposit(false);
                      setError(null);
                    }}
                  />
                  <span>New customer</span>
                </label>
              </div>
              <label className={styles.label}>
                <span className={styles.labelText}>Global search</span>
                <input
                  className={styles.input}
                  placeholder="Search leads and customers by name, email, phone, source, artist"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                />
              </label>
              {customerSuggestions.length > 0 && (
                <div className={styles.searchSuggestionList} role="listbox" aria-label="Customer suggestions">
                  {customerSuggestions.map(({ customer }) => (
                    <button
                      key={customer.id}
                      type="button"
                      className={styles.searchSuggestionItem}
                      onClick={() => chooseCustomerFromSuggestion(customer)}
                    >
                      <span className={styles.searchSuggestionTitle}>
                        {customer.name}
                        <span className={styles.searchSuggestionBadge}>
                          {customer.type === 'lead' ? 'Lead' : 'Customer'}
                        </span>
                      </span>
                      <span className={styles.searchSuggestionMeta}>
                        {[customer.email, customer.phone, customer.leadSource, customer.referredArtist?.name].filter(Boolean).join(' · ')}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {customerMode === 'leads' && (
                <label className={styles.label}>
                  <span className={styles.labelText}>Lead</span>
                  <select
                    className={styles.input}
                    value={bookingForm.customerId}
                    onChange={(e) => {
                      setBookingForm((f) => ({ ...f, customerId: e.target.value }));
                      setDeductFromDeposit(false);
                    }}
                  >
                    <option value="">— Select lead —</option>
                    {filteredLeadCustomers.map((c) => {
                      const artistReferral = c.referredArtist?.name ? ` · Artist: ${c.referredArtist.name}` : '';
                      return (
                        <option key={c.id} value={c.id}>
                          {c.name} — {c.leadSource || 'Lead'}{artistReferral}
                        </option>
                      );
                    })}
                  </select>
                  {filteredLeadCustomers.length === 0 && (
                    <p className={styles.helper}>No leads match your search.</p>
                  )}
                </label>
              )}
              {customerMode === 'existing' && (
                <label className={styles.label}>
                  <span className={styles.labelText}>Existing customer</span>
                  <select
                    className={styles.input}
                    value={bookingForm.customerId}
                    onChange={(e) => {
                      setBookingForm((f) => ({ ...f, customerId: e.target.value }));
                      setDeductFromDeposit(false);
                    }}
                  >
                    <option value="">— Select customer —</option>
                    {filteredExistingCustomers.map((c) => {
                      const studioDeposit = getCustomerDeposit(c.id, 'studio');
                      const artistDeposit = getCustomerDeposit(c.id, 'artist');
                      return (
                        <option key={c.id} value={c.id}>
                          {c.name} — Studio {formatRupiah(studioDeposit)} · Artist {formatRupiah(artistDeposit)}
                        </option>
                      );
                    })}
                  </select>
                  {filteredExistingCustomers.length === 0 && (
                    <p className={styles.helper}>No customers match your search.</p>
                  )}
                </label>
              )}
              {customerMode === 'new' && (
                <fieldset className={styles.fieldset}>
                  <legend className={styles.legend}>New customer</legend>
                  <p className={styles.helper}>Fill the full customer profile. At least one contact method is required: email or phone.</p>
                  <label className={styles.label}>
                    <span className={styles.labelText}>Name</span>
                    <input
                      className={styles.input}
                      placeholder="Full name"
                      value={newCustomer.name}
                      onChange={(e) => setNewCustomer((n) => ({ ...n, name: e.target.value }))}
                    />
                  </label>
                  <label className={styles.label}>
                    <span className={styles.labelText}>Email</span>
                    <input
                      className={styles.input}
                      type="email"
                      placeholder="email@example.com"
                      value={newCustomer.email}
                      onChange={(e) => setNewCustomer((n) => ({ ...n, email: e.target.value }))}
                    />
                  </label>
                  <label className={styles.label}>
                    <span className={styles.labelText}>Phone</span>
                    <input
                      className={styles.input}
                      placeholder="+62 ..."
                      value={newCustomer.phone}
                      onChange={(e) => setNewCustomer((n) => ({ ...n, phone: e.target.value }))}
                    />
                  </label>
                  <label className={styles.label}>
                    <span className={styles.labelText}>Source</span>
                    <select
                      className={styles.input}
                      value={newCustomer.leadSource}
                      onChange={(e) =>
                        setNewCustomer((n) => ({
                          ...n,
                          leadSource: e.target.value,
                          referredArtistId: e.target.value === 'artist' ? n.referredArtistId : '',
                        }))
                      }
                    >
                      {LEAD_SOURCE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                  {newCustomer.leadSource === 'artist' && (
                    <label className={styles.label}>
                      <span className={styles.labelText}>Artist name</span>
                      <select
                        className={styles.input}
                        value={newCustomer.referredArtistId}
                        onChange={(e) => setNewCustomer((n) => ({ ...n, referredArtistId: e.target.value }))}
                      >
                        <option value="">Select artist</option>
                        {artists.map((artist) => (
                          <option key={artist.id} value={artist.id}>{artist.name}</option>
                        ))}
                      </select>
                    </label>
                  )}
                </fieldset>
              )}
            </div>

            {/* Step 2: Studio & artist */}
            <div className={artistStyles.card}>
              <div className={artistStyles.cardHead}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                <h2>Studio &amp; artist</h2>
              </div>
              <label className={styles.label}>
                <span className={styles.labelText}>Studio</span>
                <select
                  className={styles.input}
                  value={bookingForm.studioId}
                  onChange={(e) => handleStudioChange(e.target.value)}
                  aria-label="Select studio"
                >
                  <option value="">Select studio</option>
                  {studios.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </label>
              <label className={styles.label}>
                <span className={styles.labelText}>Tattoo artist</span>
                {bookingForm.artistId && !artists.some((a) => a.id === bookingForm.artistId) && (
                  <p className={styles.helper} role="status">Selected artist is no longer available. Please choose an active artist.</p>
                )}
                <select
                  className={styles.input}
                  value={artists.some((a) => a.id === bookingForm.artistId) ? bookingForm.artistId : ''}
                  onChange={(e) => handleArtistChange(e.target.value)}
                  aria-label="Select artist"
                >
                  <option value="">Select artist</option>
                  {artists.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </label>
              {bookingForm.artistId && (() => {
                const a = artists.find((x) => x.id === bookingForm.artistId);
                if (!a) return null;
                const photos = safeParseJson(a.photos);
                const skillTags = (a.speciality || '').split(',').map((s) => s.trim()).filter(Boolean);
                return (
                  <div className={styles.artistCard} aria-label="Selected artist">
                    <div className={styles.artistCardMedia}>
                      {photos[0] ? (
                        <img src={uploadUrl(photos[0])} alt={a.name} className={styles.artistCardPhoto} />
                      ) : (
                        <div className={styles.artistCardPlaceholder}>No photo</div>
                      )}
                      {photos.length > 1 && (
                        <div className={styles.artistCardThumbs}>
                          {photos.slice(1, 4).map((url, i) => (
                            <img key={i} src={uploadUrl(url)} alt="" className={styles.artistCardThumb} aria-hidden />
                          ))}
                        </div>
                      )}
                    </div>
                    <div className={styles.artistCardInfo}>
                      <p className={styles.artistCardName}>{a.name}</p>
                      {a.shortDescription && (
                        <p className={styles.artistCardDesc}>{a.shortDescription}</p>
                      )}
                      {skillTags.length > 0 && (
                        <div className={styles.artistCardTags}>
                          {skillTags.map((tag) => (
                            <span key={tag} className={styles.artistCardTag}>{tag}</span>
                          ))}
                        </div>
                      )}
                      <div className={styles.artistCardMeta}>
                        {a.experiences && <span>{a.experiences}</span>}
                        {a.rate != null && (
                          <span>Rate: {formatRupiah(a.rate)}/hour</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Step 3: Date & time */}
            <div className={artistStyles.card}>
              <div className={artistStyles.cardHead}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                <h2>Date &amp; time</h2>
              </div>
              <p className={artistStyles.cardHint}>Pick a date, then choose a slot from availability or enter a custom time.</p>
              <div className={styles.calendarSection}>
                <AvailabilityCalendar
                  artistId={bookingForm.artistId}
                  selectedDate={bookingForm.date}
                  onSelectDate={handleCalendarDateSelect}
                  onSelectSlot={handleSlotSelect}
                  selectedSlot={useCustomTime ? null : selectedSlot}
                />
              </div>
              <div className={styles.timeSourceRow}>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="timeSource"
                    checked={!useCustomTime}
                    onChange={() => { setUseCustomTime(false); setSelectedSlot(null); }}
                  />
                  <span>From availability slots</span>
                </label>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="timeSource"
                    checked={useCustomTime}
                    onChange={() => { setUseCustomTime(true); setSelectedSlot(null); }}
                  />
                  <span>Custom time</span>
                </label>
              </div>
              {useCustomTime && bookingForm.date && (
                <div className={styles.customTimeRow}>
                  <label className={styles.label}>
                    <span className={styles.labelText}>Start time</span>
                    <input
                      type="time"
                      className={styles.input}
                      value={bookingForm.startTime || '09:00'}
                      onChange={(e) => setBookingForm((f) => ({ ...f, startTime: e.target.value }))}
                    />
                  </label>
                  <label className={styles.label}>
                    <span className={styles.labelText}>End time</span>
                    <input
                      type="time"
                      className={styles.input}
                      value={bookingForm.endTime || '17:00'}
                      onChange={(e) => setBookingForm((f) => ({ ...f, endTime: e.target.value }))}
                    />
                  </label>
                </div>
              )}
              {bookingForm.date && bookingForm.startTime && (
                <div className={styles.selectedInfo}>
                  <span>Selected: <strong>{bookingForm.date}</strong></span>
                  <span>Time: <strong>{bookingForm.startTime} – {bookingForm.endTime}</strong>{useCustomTime && ' (custom)'}</span>
                </div>
              )}
            </div>
          </div>

          <div className={artistStyles.col}>
            <div className={artistStyles.card}>
              <div className={artistStyles.cardHead}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
                <h2>Project details</h2>
              </div>
              <label className={styles.label}>
              <span className={styles.labelText}>Where should the tattoo be placed?</span>
              <select
                className={styles.input}
                value={bookingForm.placement}
                onChange={(e) => setBookingForm((f) => ({ ...f, placement: e.target.value }))}
              >
                <option value="">— Select placement —</option>
                {PLACEMENT_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </label>
            {bookingForm.placement === 'Other' && (
              <label className={styles.label}>
                <span className={styles.labelText}>Other placement</span>
                <input
                  className={styles.input}
                  placeholder="e.g. Behind ear, Ankle"
                  value={bookingForm.placementOther}
                  onChange={(e) => setBookingForm((f) => ({ ...f, placementOther: e.target.value }))}
                />
              </label>
            )}
            <div className={styles.label}>
              <span className={styles.labelText}>Preference / Referensi</span>
              <textarea
                className={styles.input}
                placeholder="Style, size, colour or B&W, or paste a link"
                value={bookingForm.preference}
                onChange={(e) => setBookingForm((f) => ({ ...f, preference: e.target.value }))}
                rows={2}
              />
              <p className={styles.uploadHint}>Upload up to 3 images, max 2MB each (JPEG, PNG, GIF, WebP)</p>
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                multiple
                className={styles.fileInput}
                onChange={handlePreferenceImagesChange}
                disabled={uploadingPreference || (bookingForm.preferenceImages?.length || 0) >= MAX_PREFERENCE_IMAGES}
              />
              {uploadingPreference && <span className={styles.uploading}>Uploading…</span>}
              {(bookingForm.preferenceImages?.length > 0) && (
                <div className={styles.preferenceThumbs}>
                  <span className={styles.preferenceThumbsTitle}>Reference images (click × to remove)</span>
                  {bookingForm.preferenceImages.map((url, i) => (
                    <div key={url} className={styles.thumbWrap}>
                      <img src={url} alt={`Reference ${i + 1}`} className={styles.thumbImg} />
                      <span className={styles.thumbLabel}>Ref {i + 1}</span>
                      <button type="button" onClick={() => removePreferenceImage(i)} className={styles.thumbRemove} aria-label="Remove image">
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {isEdit && (
              <div className={styles.readOnlyField}>
                <span className={styles.labelText}>Status</span>
                <p className={styles.readOnlyValue}>{bookingForm.status}</p>
                <p className={styles.helper}>Status updates automatically when total completed payments reach the booking total.</p>
              </div>
            )}
            <label className={styles.label}>
              <span className={styles.labelText}>Notes</span>
              <textarea
                className={styles.input}
                value={bookingForm.notes}
                onChange={(e) => setBookingForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Additional notes"
                rows={2}
              />
            </label>
            </div>

            {!isEdit && (
            <div className={styles.estimationCard} aria-label="Agreed price and first deposit">
              <header className={styles.estimationCardHeader}>
                <div className={styles.estimationCardIcon}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                </div>
                <div>
                  <h2 className={styles.estimationCardTitle}>Project estimation &amp; deposit</h2>
                  <p className={styles.estimationCardDesc}>Set pricing type, total amount, and first payment.</p>
                </div>
              </header>

              <div className={styles.estimationSegmentWrap}>
                <span className={styles.estimationSegmentLabel}>Project type</span>
                <div className={styles.estimationSegment} role="radiogroup" aria-label="Estimation mode">
                  <label className={`${styles.estimationSegmentOption} ${estimationMode === 'unlimited' ? styles.estimationSegmentOptionActive : ''}`}>
                    <input
                      type="radio"
                      name="estimationMode"
                      value="unlimited"
                      checked={estimationMode === 'unlimited'}
                      onChange={() => {
                        setEstimationMode('unlimited');
                        setBookingForm((f) => ({ ...f, pricingType: 'hourly' }));
                      }}
                      className={styles.estimationRadio}
                    />
                    <span>Hourly rate</span>
                  </label>
                  <label className={`${styles.estimationSegmentOption} ${estimationMode === 'rate' ? styles.estimationSegmentOptionActive : ''}`}>
                    <input
                      type="radio"
                      name="estimationMode"
                      value="rate"
                      checked={estimationMode === 'rate'}
                      onChange={() => {
                        setEstimationMode('rate');
                        setBookingForm((f) => ({ ...f, pricingType: 'fixed' }));
                      }}
                      className={styles.estimationRadio}
                    />
                    <span>Fixed rate</span>
                  </label>
                </div>
              </div>

              <div className={styles.estimationFields}>
                {estimationMode === 'rate' && (
                  <div className={styles.estimationField}>
                    <label className={styles.estimationFieldLabel} htmlFor="booking-estimation-amount">Project amount (IDR)</label>
                    <div className={styles.estimationInputWrap}>
                      <span className={styles.estimationInputPrefix}>Rp</span>
                      <input
                        id="booking-estimation-amount"
                        type="text"
                        inputMode="numeric"
                        className={styles.estimationInput}
                        placeholder={minDeposit > 0 ? formatNumberWithDots(minDeposit) : 'e.g. 500.000'}
                        value={formatNumberWithDots(estimationAmount)}
                        onChange={(e) => setEstimationAmount(parseNumberInput(e.target.value))}
                      />
                    </div>
                  </div>
                )}
                <div className={styles.estimationField}>
                  <label className={styles.estimationFieldLabel} htmlFor="booking-first-deposit">First deposit</label>
                  <div className={styles.estimationInputWrap}>
                    <span className={styles.estimationInputPrefix}>Rp</span>
                    <input
                      id="booking-first-deposit"
                      type="text"
                      inputMode="numeric"
                      className={`${styles.estimationInput} ${firstDepositInvalid ? styles.estimationInputInvalid : ''}`}
                      placeholder={minDeposit > 0 ? `Min. ${formatNumberWithDots(minDeposit)}` : 'e.g. 500.000'}
                      value={formatNumberWithDots(firstDepositAmount)}
                      onChange={(e) => setFirstDepositAmount(parseNumberInput(e.target.value))}
                      aria-invalid={firstDepositInvalid}
                      aria-describedby={firstDepositInvalid ? 'first-deposit-err' : minDeposit > 0 ? 'first-deposit-min' : undefined}
                    />
                  </div>
                  {minDeposit > 0 && !firstDepositInvalid && (
                    <span id="first-deposit-min" className={styles.estimationFieldHint}>
                      Minimum: 1h artist rate — {formatRupiah(minDeposit)}
                    </span>
                  )}
                  {firstDepositInvalid && (
                    <p id="first-deposit-err" className={styles.estimationFieldError} role="alert">
                      Deposit must be at least {formatRupiah(minDeposit)} (artist 1h rate).
                    </p>
                  )}
                </div>
              </div>
              {bookingForm.artistId && chosenDeposit > 0 && (
                <div className={styles.estimationCardExtra}>
                  <div className={styles.ownerSplitGrid}>
                    <label className={styles.label}>
                      <span className={styles.labelText}>First payment receiver</span>
                      <select
                        className={styles.input}
                        value={depositReceiverType}
                        onChange={(e) => {
                          setDepositReceiverType(e.target.value);
                          setDepositDestinationId('');
                          setDeductFromDeposit(false);
                        }}
                      >
                        {OWNER_TYPE_OPTIONS.filter((option) => option.value === 'studio' ? !!bookingForm.studioId : !!bookingForm.artistId).map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  {bookingForm.pricingType === 'fixed' && paymentPreview.totalAmount > 0 && (
                    <div className={styles.splitPreviewCard}>
                      <div className={styles.splitPreviewRow}>
                        <span>Total agreed amount</span>
                        <strong>{formatRupiah(paymentPreview.totalAmount)}</strong>
                      </div>
                      <div className={styles.splitPreviewRow}>
                        <span>First payment</span>
                        <strong>{formatRupiah(paymentPreview.firstPaymentAmount)}</strong>
                      </div>
                      <div className={styles.splitPreviewRow}>
                        <span>Remaining after first payment</span>
                        <strong>{formatRupiah(paymentPreview.remainingAmount)}</strong>
                      </div>
                    </div>
                  )}
                  {customerMode !== 'new' && bookingForm.customerId && (() => {
                    const customerBalance = getCustomerDeposit(bookingForm.customerId, depositReceiverType);
                    const canDeduct = customerBalance >= chosenDeposit;
                    const amountLeftToPay = customerBalance > 0 && customerBalance < chosenDeposit ? chosenDeposit - customerBalance : 0;
                    return (
                      <>
                        {customerBalance > 0 && customerBalance < chosenDeposit && (
                          <div className={styles.readOnlyField}>
                            <span className={styles.labelText}>Amount left for customer to pay</span>
                            <p className={styles.amountLeftValue}>{formatRupiah(amountLeftToPay)}</p>
                            <p className={styles.depositBalanceHint} style={{ margin: 0 }}>(first payment {formatRupiah(chosenDeposit)} − {depositReceiverType} deposit {formatRupiah(customerBalance)})</p>
                          </div>
                        )}
                        {canDeduct ? (
                          <label className={styles.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <input
                              type="checkbox"
                              checked={deductFromDeposit}
                              onChange={(e) => {
                                setDeductFromDeposit(e.target.checked);
                                if (e.target.checked) setDepositDestinationId('');
                              }}
                              aria-label="Deduct first payment from customer deposit"
                            />
                            <span>
                              Deduct first payment from customer&apos;s deposit
                              <span className={styles.depositBalanceHint}> ({depositReceiverType} balance: {formatRupiah(customerBalance)})</span>
                            </span>
                          </label>
                        ) : null}
                        {customerBalance >= chosenDeposit && (
                          <>
                            {deductFromDeposit ? (
                              <p className={styles.deductHint} role="status">
                                Tell the customer: your booking is fully covered by your deposit.
                              </p>
                            ) : (
                              <>
                                <p className={styles.deductHint} role="status">
                                  Tell the customer: we can deduct from your latest deposit.
                                </p>
                                <p className={styles.deductRequiredHint} role="alert">
                                  Use customer&apos;s deposit first: check the option above to continue the booking.
                                </p>
                              </>
                            )}
                          </>
                        )}
                      </>
                    );
                  })()}
                  {!deductFromDeposit && (
                    <>
                      <label className={styles.label}>
                        <span className={styles.labelText}>Payment account</span>
                        <select
                          className={styles.input}
                          value={depositDestinationId}
                          onChange={(e) => setDepositDestinationId(e.target.value)}
                          aria-label="Which owned account receives the first payment"
                        >
                          <option value="">No payment recorded yet</option>
                          {availableDepositDestinations.map((d) => (
                            <option key={d.id} value={d.id}>
                              {paymentDestinationLabel(d)}
                            </option>
                          ))}
                        </select>
                        {availableDepositDestinations.length === 0 && (
                          <p className={styles.helper}>
                            No active {depositReceiverType}-owned accounts match this booking yet.
                          </p>
                        )}
                      </label>
                      <label className={styles.label}>
                        <span className={styles.labelText}>Receipt (optional)</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/gif,image/webp"
                          className={styles.fileInput}
                          onChange={handleEvidenceChange}
                          disabled={uploadingEvidence}
                        />
                        {uploadingEvidence && <span className={styles.uploading}>Uploading…</span>}
                        {depositEvidenceUrl && (
                          <div className={styles.evidenceThumb}>
                            <img src={depositEvidenceUrl} alt="Receipt" className={styles.evidenceThumbImg} />
                            <button type="button" onClick={() => setDepositEvidenceUrl('')} className={styles.thumbRemove}>×</button>
                          </div>
                        )}
                      </label>
                    </>
                  )}
                </div>
              )}
            </div>
            )}

          </div>
        </div>

        <div className={artistStyles.actionBar}>
          <div className={artistStyles.actionLeft}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
            <span>Booking is saved when you click {isEdit ? 'Save' : 'Create'}.</span>
          </div>
          <div className={artistStyles.actionBtns}>
            {isEdit && (
              <button type="button" onClick={handleSaveDraft} className={artistStyles.cancelBtn}>Save as draft</button>
            )}
            <button type="button" onClick={() => navigate('/manage?tab=bookings')} className={artistStyles.cancelBtn}>Cancel</button>
            <button
              type="submit"
              disabled={
                !bookingForm.artistId ||
                !bookingForm.date ||
                !bookingForm.startTime ||
                firstDepositInvalid ||
                (bookingForm.pricingType === 'fixed' && !isEdit && estimationMode === 'rate' && !(Number(estimationAmount) > 0 || (selectedArtist?.rate != null && Number(selectedArtist.rate) > 0)))
              }
              className={artistStyles.submitBtn}
            >
              {isEdit ? 'Save booking' : 'Create booking'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
