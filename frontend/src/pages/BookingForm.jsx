import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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

const BOOKING_STATUSES = ['draft', 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled'];

const MAX_PREFERENCE_IMAGES = 3;
const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB

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

export function BookingForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

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
    status: 'draft',
    pricingType: 'fixed', // 'fixed' = final transaction refers to totalAmount; 'hourly' = total from projects (accumulative)
    totalAmount: '',
    placement: '',
    placementOther: '',
    preference: '',
    preferenceImages: [],
    notes: '',
  });
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [newCustomer, setNewCustomer] = useState({ name: '', email: '', phone: '' });
  const [useNewCustomer, setUseNewCustomer] = useState(false);
  const [uploadingPreference, setUploadingPreference] = useState(false);
  const [useCustomTime, setUseCustomTime] = useState(false);
  const [depositDestinationId, setDepositDestinationId] = useState(''); // selected PaymentDestination id
  const [deductFromDeposit, setDeductFromDeposit] = useState(false);
  const [depositEvidenceUrl, setDepositEvidenceUrl] = useState('');
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [paymentDestinations, setPaymentDestinations] = useState([]);
  const [payments, setPayments] = useState([]);
  const [estimationMode, setEstimationMode] = useState('unlimited'); // 'unlimited' | 'rate'
  const [estimationAmount, setEstimationAmount] = useState('');
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
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

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
            status: b.status,
            pricingType: b.pricingType === 'hourly' ? 'hourly' : 'fixed',
            totalAmount: b.totalAmount ?? '',
            placement: placementInList ? b.placement : (b.placement ? 'Other' : ''),
            placementOther: placementInList ? '' : (b.placement || ''),
            preference: preferenceText,
            preferenceImages,
            notes: b.notes || '',
          });
        })
        .catch((e) => setError(e.message));
    }
  }, [isEdit, id]);

  const handleStudioChange = (studioId) => {
    setBookingForm((f) => ({ ...f, studioId, artistId: '', date: '', startTime: '', endTime: '' }));
    setSelectedSlot(null);
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
    setUseCustomTime(false);
    setBookingForm((f) => ({ ...f, date: slot.date, startTime: slot.startTime, endTime: slot.endTime }));
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
    };
  };

  const saveBooking = async (e, asDraft = false) => {
    e.preventDefault();
    setError(null);
    let customerId = bookingForm.customerId;
    if (useNewCustomer && newCustomer.name.trim()) {
      try {
        const c = await createCustomer(newCustomer);
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
    if (!asDraft && payload.customerId && minDeposit > 0) {
      const customerBalance = getCustomerDeposit(payload.customerId);
      if (customerBalance >= minDeposit && !deductFromDeposit) {
        setError('Please use the customer\'s deposit first. Check "Deduct booking fee from customer\'s deposit" to continue the booking.');
        return;
      }
      if (deductFromDeposit && customerBalance < minDeposit) {
        setError(`Customer deposit (${formatRupiah(customerBalance)}) is less than booking fee (${formatRupiah(minDeposit)}). Uncheck "Deduct from deposit" or choose another customer.`);
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
          const depositAmt = minDeposit;
          if (depositAmt > 0) {
            if (deductFromDeposit) {
              try {
                await createPayment({
                  bookingId: created.id,
                  amount: depositAmt,
                  currency: 'IDR',
                  method: 'From deposit',
                  type: 'down_payment',
                  transferDestination: null,
                  evidenceUrl: null,
                  status: 'completed',
                });
              } catch (payErr) {
                setError(payErr.message);
                return;
              }
            } else {
              const dest = depositDestinationId ? paymentDestinations.find((d) => d.id === depositDestinationId) : null;
              if (dest) {
                try {
                  await createPayment({
                    bookingId: created.id,
                    amount: depositAmt,
                    currency: 'IDR',
                    method: dest.type,
                    type: 'down_payment',
                    transferDestination: dest.account || null,
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
          navigate(`/manage/bookings/${created.id}`);
        } else {
          navigate('/manage?tab=bookings');
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

  const selectedArtist = artists.find((a) => a.id === bookingForm.artistId);
  const minDeposit = selectedArtist?.rate != null ? Number(selectedArtist.rate) : 0;

  /** Deposit total (completed down_payment) for a customer, for dropdown display */
  const getCustomerDeposit = (customerId) => {
    return (payments || [])
      .filter((p) => (p.booking?.customerId ?? p.booking?.customer?.id) === customerId && p.status === 'completed' && p.type === 'down_payment')
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
    <div className={layoutStyles.adminCard}>
      <div className={layoutStyles.adminContent}>
        <header className={styles.header}>
          <Link to="/manage?tab=bookings" className={styles.backLink}>
            ← Back to Bookings
          </Link>
          <h1 className={styles.pageTitle}>{isEdit ? 'Edit booking' : 'New booking'}</h1>
        </header>

        {error && <div className={styles.error} role="alert">{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.onePage}>

          <section className={styles.block}>
            <h2 className={styles.blockTitle}>Studio & artist</h2>
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
          </section>

          <section className={styles.block}>
            <h2 className={styles.blockTitle}>Date & time</h2>
            <p className={styles.blockDesc}>Pick a date, then choose a slot from availability or enter a custom time.</p>
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
          </section>

          <section className={styles.block}>
            <h2 className={styles.blockTitle}>Customer</h2>
            <div className={styles.radioRow}>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="customerSource"
                  checked={!useNewCustomer}
                  onChange={() => { setUseNewCustomer(false); setError(null); }}
                />
                <span>Select from list</span>
              </label>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="customerSource"
                  checked={useNewCustomer}
                  onChange={() => { setUseNewCustomer(true); setError(null); }}
                />
                <span>New customer</span>
              </label>
            </div>
            {!useNewCustomer && (
              <label className={styles.label}>
                <span className={styles.labelText}>Customer</span>
                <select
                  className={styles.input}
                  value={bookingForm.customerId}
                  onChange={(e) => {
                    setBookingForm((f) => ({ ...f, customerId: e.target.value }));
                    setDeductFromDeposit(false);
                  }}
                >
                  <option value="">— No customer —</option>
                  {customers.map((c) => {
                    const deposit = getCustomerDeposit(c.id);
                    return (
                      <option key={c.id} value={c.id}>
                        {c.name} — Deposit: {formatRupiah(deposit)}
                      </option>
                    );
                  })}
                </select>
              </label>
            )}
            {useNewCustomer && (
              <fieldset className={styles.fieldset}>
                <legend className={styles.legend}>New customer</legend>
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
              </fieldset>
            )}
          </section>

          <section className={styles.block}>
            <h2 className={styles.blockTitle}>Project Details</h2>
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
              <label className={styles.label}>
                <span className={styles.labelText}>Status</span>
                <select
                  className={styles.input}
                  value={bookingForm.status}
                  onChange={(e) => setBookingForm((f) => ({ ...f, status: e.target.value }))}
                >
                  {BOOKING_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </label>
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
          </section>

          {!isEdit && (
            <section className={styles.block} aria-label="Agreed price and first deposit">
              <h2 className={styles.blockTitle}>Project Estimation Price and Deposit</h2>
              <div className={styles.label}>
                <span className={styles.labelText}>Project estimation (amount)</span>
                <div className={styles.estimationOptions} role="radiogroup" aria-label="Estimation mode">
                  <label className={`${styles.estimationOption} ${estimationMode === 'unlimited' ? styles.estimationOptionActive : ''}`}>
                    <input
                      type="radio"
                      name="estimationMode"
                      value="unlimited"
                      checked={estimationMode === 'unlimited'}
                      onChange={() => setEstimationMode('unlimited')}
                      className={styles.estimationRadio}
                    />
                    <span>Hourly Rate</span>
                  </label>
                  <label className={`${styles.estimationOption} ${estimationMode === 'rate' ? styles.estimationOptionActive : ''}`}>
                    <input
                      type="radio"
                      name="estimationMode"
                      value="rate"
                      checked={estimationMode === 'rate'}
                      onChange={() => setEstimationMode('rate')}
                      className={styles.estimationRadio}
                    />
                    <span>Fix Rate</span>
                  </label>
                </div>
              </div>
              {estimationMode === 'rate' && (
                <label className={styles.label}>
                  <span className={styles.labelText}>Amount (IDR)</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    className={styles.input}
                    placeholder={minDeposit > 0 ? `e.g. ${formatNumberWithDots(minDeposit)}` : 'e.g. 500.000'}
                    value={formatNumberWithDots(estimationAmount)}
                    onChange={(e) => setEstimationAmount(parseNumberInput(e.target.value))}
                  />
                </label>
              )}
              <div className={styles.readOnlyField}>
                <span className={styles.labelText}>First deposit (1h rate, fixed)</span>
                <p className={styles.readOnlyValue}>
                  {bookingForm.artistId && minDeposit > 0 ? formatRupiah(minDeposit) : '—'}
                </p>
              </div>
              {bookingForm.artistId && minDeposit > 0 && (
                <>
                  {!useNewCustomer && bookingForm.customerId && (() => {
                    const customerBalance = getCustomerDeposit(bookingForm.customerId);
                    const canDeduct = customerBalance >= minDeposit;
                    const amountLeftToPay = customerBalance > 0 && customerBalance < minDeposit ? minDeposit - customerBalance : 0;
                    return (
                      <>
                        {customerBalance > 0 && customerBalance < minDeposit && (
                          <div className={styles.readOnlyField}>
                            <span className={styles.labelText}>Amount left for customer to pay</span>
                            <p className={styles.amountLeftValue}>{formatRupiah(amountLeftToPay)}</p>
                            <p className={styles.depositBalanceHint} style={{ margin: 0 }}>(booking fee {formatRupiah(minDeposit)} − deposit {formatRupiah(customerBalance)})</p>
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
                              aria-label="Deduct booking fee from customer deposit"
                            />
                            <span>
                              Deduct booking fee from customer&apos;s deposit
                              <span className={styles.depositBalanceHint}> (balance: {formatRupiah(customerBalance)})</span>
                            </span>
                          </label>
                        ) : null}
                        {customerBalance >= minDeposit && (
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
                        <span className={styles.labelText}>Paid?</span>
                        <select
                          className={styles.input}
                          value={depositDestinationId}
                          onChange={(e) => setDepositDestinationId(e.target.value)}
                          aria-label="Where booking fee was paid"
                        >
                          <option value="">No</option>
                          {paymentDestinations.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name}{d.account ? ` — ${d.account}` : ''}
                            </option>
                          ))}
                        </select>
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
                </>
              )}
            </section>
          )}

        </div>

        <div className={styles.actions}>
          {isEdit && (
            <>
              <button type="button" onClick={handleSaveDraft} className={styles.secondaryBtn}>Save as draft</button>
              <Link to="/manage?tab=bookings" className={styles.tertiaryBtn}>Cancel</Link>
            </>
          )}
          <button
            type="submit"
            disabled={
              !bookingForm.artistId ||
              !bookingForm.date ||
              !bookingForm.startTime ||
              (bookingForm.pricingType === 'fixed' && !isEdit && estimationMode === 'rate' && !(Number(estimationAmount) > 0 || (selectedArtist?.rate != null && Number(selectedArtist.rate) > 0)))
            }
            className={styles.primaryBtn}
          >
            Save booking
          </button>
        </div>
      </form>
      </div>
    </div>
  );
}
