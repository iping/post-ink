import { useState, useEffect, useMemo } from 'react';
import { getAvailability } from '../api';
import styles from './AvailabilityCalendar.module.css';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function pad(n) {
  return String(n).padStart(2, '0');
}

function toDateStr(y, m, d) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

export function AvailabilityCalendar({ artistId, selectedDate, onSelectDate, onSelectSlot, selectedSlot }) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!artistId) {
      setSlots([]);
      return;
    }
    setLoading(true);
    const from = toDateStr(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0).getDate();
    const to = toDateStr(viewYear, viewMonth, lastDay);
    getAvailability(artistId, from, to)
      .then(setSlots)
      .catch(() => setSlots([]))
      .finally(() => setLoading(false));
  }, [artistId, viewYear, viewMonth]);

  const availByDate = useMemo(() => {
    const map = {};
    for (const s of slots) {
      if (!map[s.date]) map[s.date] = [];
      map[s.date].push(s);
    }
    return map;
  }, [slots]);

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

  const slotsForSelected = selectedDate ? (availByDate[selectedDate] || []) : [];
  const availableSlots = slotsForSelected.filter((s) => s.isAvailable);

  return (
    <div className={styles.calWrap}>
      <div className={styles.calHeader}>
        <button type="button" onClick={prevMonth} className={styles.navBtn}>&#8249;</button>
        <span className={styles.monthLabel}>{MONTHS[viewMonth]} {viewYear}</span>
        <button type="button" onClick={nextMonth} className={styles.navBtn}>&#8250;</button>
      </div>

      {!artistId && <p className={styles.hint}>Select an artist to see availability</p>}

      {artistId && loading && <p className={styles.hint}>Loading availability…</p>}

      {artistId && !loading && (
        <>
          <div className={styles.calGrid}>
            {DAYS.map((d) => (
              <div key={d} className={styles.dayLabel}>{d}</div>
            ))}
            {cells.map((day, i) => {
              if (day === null) return <div key={`e${i}`} className={styles.emptyCell} />;
              const dateStr = toDateStr(viewYear, viewMonth, day);
              const isPast = dateStr < todayStr;
              const daySlots = availByDate[dateStr] || [];
              const hasAvail = daySlots.some((s) => s.isAvailable);
              const hasUnavail = daySlots.length > 0 && !hasAvail;
              const isSelected = dateStr === selectedDate;
              let cls = styles.dayCell;
              if (isPast) cls += ` ${styles.past}`;
              else if (hasAvail) cls += ` ${styles.available}`;
              else if (hasUnavail) cls += ` ${styles.unavailable}`;
              if (isSelected) cls += ` ${styles.selected}`;
              if (dateStr === todayStr) cls += ` ${styles.today}`;

              return (
                <button
                  key={dateStr}
                  type="button"
                  className={cls}
                  disabled={isPast || !hasAvail}
                  onClick={() => {
                    if (!isPast && hasAvail) onSelectDate(dateStr);
                  }}
                  title={
                    isPast ? 'Past date'
                      : hasAvail ? `${daySlots.filter((s) => s.isAvailable).length} slot(s) available`
                        : hasUnavail ? 'Unavailable' : 'No slots'
                  }
                >
                  <span className={styles.dayNum}>{day}</span>
                  {hasAvail && <span className={styles.dot} />}
                </button>
              );
            })}
          </div>

          <div className={styles.legend}>
            <span><span className={`${styles.legendDot} ${styles.legendAvail}`} /> Available</span>
            <span><span className={`${styles.legendDot} ${styles.legendUnavail}`} /> Unavailable</span>
            <span><span className={`${styles.legendDot} ${styles.legendEmpty}`} /> No slots</span>
          </div>
        </>
      )}

      {selectedDate && artistId && !loading && (
        <div className={styles.slotSection}>
          <h4>Slots for {selectedDate}</h4>
          {availableSlots.length === 0 ? (
            <p className={styles.noSlots}>No available time slots on this date.</p>
          ) : (
            <div className={styles.slotGrid}>
              {availableSlots.map((slot) => (
                <button
                  key={slot.id}
                  type="button"
                  className={`${styles.slotBtn} ${selectedSlot?.id === slot.id ? styles.slotActive : ''}`}
                  onClick={() => onSelectSlot(slot)}
                >
                  {slot.startTime} – {slot.endTime}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
