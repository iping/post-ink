import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getArtist, getAvailability, getStudios, createBooking, createCustomer, uploadUrl } from '../api';
import { formatRupiah, formatWithConversion } from '../currency';
import styles from './ArtistBooking.module.css';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function pad(n) { return String(n).padStart(2, '0'); }
function toDateStr(y, m, d) { return `${y}-${pad(m + 1)}-${pad(d)}`; }

function generateTimeSlots(startTime, endTime) {
  const slots = [];
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  let cur = sh * 60 + sm;
  const end = eh * 60 + em;
  while (cur < end) {
    const h = Math.floor(cur / 60);
    const m = cur % 60;
    slots.push(`${pad(h)}.${pad(m)}`);
    cur += 30;
  }
  return slots;
}

function formatDateLong(dateStr) {
  const d = new Date(dateStr + 'T00:00');
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

export function ArtistBooking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const today = new Date();

  const [artist, setArtist] = useState(null);
  const [studios, setStudios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [allSlots, setAllSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [duration, setDuration] = useState(1);
  const [showDetails, setShowDetails] = useState(true);

  const [step, setStep] = useState('select');
  const [customerForm, setCustomerForm] = useState({ name: '', email: '', phone: '' });
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    Promise.all([getArtist(id), getStudios()])
      .then(([a, s]) => { setArtist(a); setStudios(s); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    setLoadingSlots(true);
    const from = toDateStr(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0).getDate();
    const to = toDateStr(viewYear, viewMonth, lastDay);
    getAvailability(id, from, to)
      .then(setAllSlots)
      .catch(() => setAllSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [id, viewYear, viewMonth]);

  const availByDate = useMemo(() => {
    const map = {};
    for (const s of allSlots) {
      if (!s.isAvailable) continue;
      if (!map[s.date]) map[s.date] = [];
      map[s.date].push(s);
    }
    return map;
  }, [allSlots]);

  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());

  const cells = [];
  for (let i = 0; i < firstDayOfMonth; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  const daySlots = selectedDate ? (availByDate[selectedDate] || []) : [];
  const timeSlots = useMemo(() => {
    const all = [];
    for (const slot of daySlots) {
      const generated = generateTimeSlots(slot.startTime, slot.endTime);
      all.push(...generated);
    }
    return [...new Set(all)].sort();
  }, [daySlots]);

  const sessionRate = artist?.rate || 0;
  const totalPrice = sessionRate * duration;
  const conv = formatWithConversion(totalPrice);

  const selectedTimeFormatted = selectedTime ? selectedTime.replace('.', ':') : '';
  const endMinutes = selectedTime ? (() => {
    const [h, m] = selectedTime.split('.').map(Number);
    return (h * 60 + m) + duration * 60;
  })() : 0;
  const endTimeFormatted = selectedTime ? `${pad(Math.floor(endMinutes / 60))}.${pad(endMinutes % 60)}` : '';

  const handleSelectDate = (dateStr) => {
    setSelectedDate(dateStr);
    setSelectedTime('');
  };

  const handleSubmit = async () => {
    if (!customerForm.name.trim()) {
      setError('Please enter your name.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const customer = await createCustomer(customerForm);
      const [sh, sm] = selectedTime.split('.').map(Number);
      const startTime = `${pad(sh)}:${pad(sm)}`;
      const endMin = sh * 60 + sm + duration * 60;
      const endTime = `${pad(Math.floor(endMin / 60))}:${pad(endMin % 60)}`;

      await createBooking({
        artistId: id,
        customerId: customer.id,
        studioId: studios[0]?.id || null,
        date: selectedDate,
        startTime,
        endTime,
        status: 'pending',
        totalAmount: totalPrice,
        notes: notes || null,
      });
      setSuccess(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className={styles.loadingWrap}><span className={styles.spinner} /> Loading…</div>;
  if (!artist) return <div className={styles.loadingWrap}>Artist not found</div>;
  if (artist.isActive === false) {
    return (
      <div className={styles.loadingWrap}>
        <p className={styles.unavailableMsg}>This tattoo artist is not currently available for booking.</p>
        <Link to="/" className={styles.backLink}>Browse active artists</Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className={styles.successWrap}>
        <div className={styles.successCard}>
          <div className={styles.successIcon}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2"><path d="M20 6 9 17l-5-5"/></svg>
          </div>
          <h2>Booking Confirmed!</h2>
          <p>Your tattoo session with <strong>{artist.name}</strong> has been submitted.</p>
          <div className={styles.successDetails}>
            <span>{formatDateLong(selectedDate)}</span>
            <span>{selectedTimeFormatted} – {endTimeFormatted.replace('.', ':')}</span>
            <span>{formatRupiah(totalPrice)}</span>
          </div>
          <p className={styles.successHint}>The studio will contact you to confirm and arrange down payment.</p>
          <div className={styles.successActions}>
            <Link to={`/artists/${id}`} className={styles.backLink}>Back to {artist.name}</Link>
            <Link to="/" className={styles.homeLink}>Browse Artists</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.topBar}>
        <Link to={`/artists/${id}`} className={styles.backBtn}>← Back to {artist.name}</Link>
      </div>

      <h1 className={styles.title}>Select a Date and Time</h1>
      <p className={styles.timezone}>Western Indonesia Time (WIB)</p>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.layout}>
        {/* Left: Calendar */}
        <div className={styles.calendarCol}>
          <div className={styles.calHeader}>
            <button type="button" onClick={prevMonth} className={styles.navBtn}>&#8249;</button>
            <span className={styles.monthLabel}>{MONTHS[viewMonth]} {viewYear}</span>
            <button type="button" onClick={nextMonth} className={styles.navBtn}>&#8250;</button>
          </div>
          <div className={styles.calGrid}>
            {DAYS.map((d) => (
              <div key={d} className={styles.dayLabel}>{d}</div>
            ))}
            {cells.map((day, i) => {
              if (day === null) return <div key={`e${i}`} className={styles.emptyCell} />;
              const dateStr = toDateStr(viewYear, viewMonth, day);
              const isPast = dateStr < todayStr;
              const hasAvail = !!availByDate[dateStr];
              const isSelected = dateStr === selectedDate;

              let cls = styles.dayCell;
              if (isPast) cls += ` ${styles.past}`;
              else if (hasAvail) cls += ` ${styles.available}`;
              if (isSelected) cls += ` ${styles.selected}`;
              if (dateStr === todayStr) cls += ` ${styles.today}`;

              return (
                <button
                  key={dateStr}
                  type="button"
                  className={cls}
                  disabled={isPast || !hasAvail}
                  onClick={() => !isPast && hasAvail && handleSelectDate(dateStr)}
                >
                  <span className={styles.dayNum}>{day}</span>
                  {hasAvail && !isPast && <span className={styles.dot} />}
                </button>
              );
            })}
          </div>
          {loadingSlots && <p className={styles.hint}>Loading availability…</p>}
        </div>

        {/* Center: Time slots */}
        <div className={styles.timesCol}>
          {selectedDate ? (
            <>
              <h3 className={styles.timesTitle}>Availability for {formatDateLong(selectedDate)}</h3>
              {timeSlots.length === 0 ? (
                <p className={styles.hint}>No time slots available for this date.</p>
              ) : (
                <div className={styles.timesGrid}>
                  {timeSlots.map((t) => (
                    <button
                      key={t}
                      type="button"
                      className={`${styles.timeBtn} ${selectedTime === t ? styles.timeBtnActive : ''}`}
                      onClick={() => setSelectedTime(t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className={styles.timesEmpty}>
              <p>Select a date to see available time slots</p>
            </div>
          )}
        </div>

        {/* Right: Service Details */}
        <div className={styles.detailsCol}>
          <h3 className={styles.detailsTitle}>Service Details</h3>
          <div className={styles.detailsCard}>
            <p className={styles.serviceName}>Tattoo Session with {artist.name}</p>
            <p className={styles.servicePrice}>{formatRupiah(totalPrice)}</p>
            {conv && typeof conv === 'object' && <p className={styles.serviceConv}>≈ {conv.usd} USD</p>}

            {selectedDate && (
              <p className={styles.serviceDate}>
                {new Date(selectedDate + 'T00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                {selectedTime && ` at ${selectedTime}`}
              </p>
            )}

            {studios[0] && <p className={styles.serviceStudio}>{studios[0].name}</p>}
            <p className={styles.serviceArtist}>{artist.name}</p>

            <div className={styles.durationRow}>
              <span>Duration</span>
              <div className={styles.durationCtrl}>
                <button type="button" onClick={() => setDuration(Math.max(0.5, duration - 0.5))} className={styles.durationBtn}>−</button>
                <span className={styles.durationVal}>{duration} hr{duration !== 1 ? 's' : ''}</span>
                <button type="button" onClick={() => setDuration(Math.min(8, duration + 0.5))} className={styles.durationBtn}>+</button>
              </div>
            </div>

            {artist.rate != null && (
              <p className={styles.rateInfo}>Rate: {formatRupiah(artist.rate)} / hr</p>
            )}

            {showDetails && selectedDate && selectedTime && (
              <div className={styles.detailsExpanded}>
                <div className={styles.detailRow}><span>Date</span><span>{formatDateLong(selectedDate)}</span></div>
                <div className={styles.detailRow}><span>Time</span><span>{selectedTimeFormatted} – {endTimeFormatted.replace('.', ':')}</span></div>
                <div className={styles.detailRow}><span>Duration</span><span>{duration} hr{duration !== 1 ? 's' : ''}</span></div>
                <div className={styles.detailRow}><span>Rate</span><span>{formatRupiah(artist.rate)} / hr</span></div>
                <div className={`${styles.detailRow} ${styles.detailTotal}`}><span>Total</span><span>{formatRupiah(totalPrice)}</span></div>
              </div>
            )}

            <button
              type="button"
              className={styles.toggleDetails}
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? 'Less details' : 'More details'}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: showDetails ? 'rotate(180deg)' : 'none', transition: '0.2s' }}>
                <path d="m6 9 6 6 6-6"/>
              </svg>
            </button>
          </div>

          {step === 'select' && (
            <button
              type="button"
              className={styles.nextBtn}
              disabled={!selectedDate || !selectedTime}
              onClick={() => setStep('confirm')}
            >
              Next
            </button>
          )}

          {step === 'confirm' && (
            <div className={styles.confirmSection}>
              <h4>Your Information</h4>
              <input
                type="text"
                placeholder="Full Name *"
                value={customerForm.name}
                onChange={(e) => setCustomerForm((f) => ({ ...f, name: e.target.value }))}
                className={styles.input}
              />
              <input
                type="email"
                placeholder="Email"
                value={customerForm.email}
                onChange={(e) => setCustomerForm((f) => ({ ...f, email: e.target.value }))}
                className={styles.input}
              />
              <input
                type="tel"
                placeholder="Phone / WhatsApp"
                value={customerForm.phone}
                onChange={(e) => setCustomerForm((f) => ({ ...f, phone: e.target.value }))}
                className={styles.input}
              />
              <textarea
                placeholder="Notes (optional) — describe what you'd like"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={styles.textarea}
                rows={3}
              />
              <div className={styles.confirmActions}>
                <button
                  type="button"
                  className={styles.nextBtn}
                  disabled={submitting || !customerForm.name.trim()}
                  onClick={handleSubmit}
                >
                  {submitting ? 'Booking…' : 'Confirm Booking'}
                </button>
                <button type="button" className={styles.backStepBtn} onClick={() => setStep('select')}>Back</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
