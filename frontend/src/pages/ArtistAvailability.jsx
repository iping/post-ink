import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  getArtist,
  getAvailability,
  addAvailability,
  updateAvailabilitySlot,
  deleteAvailabilitySlot,
} from '../api';
import styles from './ArtistAvailability.module.css';

// 1 slot = 1 hour, from 9am to 9pm (12 slots per day)
const SLOT_HOURS_START = 9;
const SLOT_HOURS_END = 21;
const ONE_HOUR_SLOTS = [];
for (let h = SLOT_HOURS_START; h < SLOT_HOURS_END; h++) {
  const start = `${String(h).padStart(2, '0')}:00`;
  const end = `${String(h + 1).padStart(2, '0')}:00`;
  ONE_HOUR_SLOTS.push({ startTime: start, endTime: end });
}

export function ArtistAvailability() {
  const { id } = useParams();
  const [artist, setArtist] = useState(null);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ date: '', isAvailable: true });
  const [saving, setSaving] = useState(false);

  const load = () => {
    Promise.all([getArtist(id), getAvailability(id)])
      .then(([a, s]) => {
        setArtist(a);
        setSlots(s);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [id]);

  const handleAddDay = async (e) => {
    e.preventDefault();
    if (!form.date) return;
    const existingForDate = slots.filter((s) => s.date === form.date);
    const existingStarts = new Set(existingForDate.map((s) => s.startTime));
    const toCreate = ONE_HOUR_SLOTS.filter((slot) => !existingStarts.has(slot.startTime)).map((slot) => ({
      date: form.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      isAvailable: form.isAvailable,
    }));
    if (toCreate.length === 0) {
      setError('This date already has all slots (9am–9pm).');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await addAvailability(id, { slots: toCreate });
      setForm((prev) => ({ ...prev, date: '' }));
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleAvailable = async (slot) => {
    try {
      await updateAvailabilitySlot(id, slot.id, { isAvailable: !slot.isAvailable });
      setSlots((prev) =>
        prev.map((s) => (s.id === slot.id ? { ...s, isAvailable: !s.isAvailable } : s))
      );
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (slotId) => {
    if (!window.confirm('Remove this slot?')) return;
    try {
      await deleteAvailabilitySlot(id, slotId);
      setSlots((prev) => prev.filter((s) => s.id !== slotId));
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className={styles.loading}>Loading…</div>;
  if (error) return <div className={styles.error}>Error: {error}</div>;
  if (!artist) return null;

  const byDate = slots.reduce((acc, s) => {
    if (!acc[s.date]) acc[s.date] = [];
    acc[s.date].push(s);
    return acc;
  }, {});
  const dates = Object.keys(byDate).sort();

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <Link to={`/manage/artists/${id}`}>← {artist.name}</Link>
        <h1>Availability</h1>
      </div>

      <form onSubmit={handleAddDay} className={styles.form}>
        <label>
          Date
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
            required
          />
        </label>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={form.isAvailable}
            onChange={(e) => setForm((prev) => ({ ...prev, isAvailable: e.target.checked }))}
          />
          All slots available
        </label>
        <button type="submit" disabled={saving}>{saving ? 'Adding…' : 'Add day (9am–9pm, 1h slots)'}</button>
      </form>
      <p className={styles.hint}>Each day gets 12 one-hour slots: 09:00–10:00 … 20:00–21:00.</p>

      <section className={styles.slots}>
        <h2>Slots</h2>
        {dates.length === 0 ? (
          <p className={styles.empty}>No availability set. Add a date and time above.</p>
        ) : (
          <ul className={styles.list}>
            {dates.map((date) => (
              <li key={date} className={styles.dateGroup}>
                <strong>{date}</strong>
                <ul>
                  {byDate[date].map((slot) => (
                    <li key={slot.id} className={styles.slot}>
                      <span className={slot.isAvailable ? styles.avail : styles.unavail}>
                        {slot.startTime} – {slot.endTime}
                        {slot.isAvailable ? ' ✓' : ' (unavailable)'}
                      </span>
                      <div className={styles.slotActions}>
                        <button type="button" onClick={() => toggleAvailable(slot)} className={styles.toggleBtn}>
                          {slot.isAvailable ? 'Mark unavailable' : 'Mark available'}
                        </button>
                        <button type="button" onClick={() => handleDelete(slot.id)} className={styles.delBtn}>Remove</button>
                      </div>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
