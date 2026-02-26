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

export function ArtistAvailability() {
  const { id } = useParams();
  const [artist, setArtist] = useState(null);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ date: '', startTime: '09:00', endTime: '17:00', isAvailable: true });
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

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.date) return;
    setSaving(true);
    setError(null);
    try {
      await addAvailability(id, {
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        isAvailable: form.isAvailable,
      });
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
        <Link to={`/artists/${id}`}>← {artist.name}</Link>
        <h1>Availability</h1>
      </div>

      <form onSubmit={handleAdd} className={styles.form}>
        <label>
          Date
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
            required
          />
        </label>
        <label>
          Start
          <input
            type="time"
            value={form.startTime}
            onChange={(e) => setForm((prev) => ({ ...prev, startTime: e.target.value }))}
          />
        </label>
        <label>
          End
          <input
            type="time"
            value={form.endTime}
            onChange={(e) => setForm((prev) => ({ ...prev, endTime: e.target.value }))}
          />
        </label>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={form.isAvailable}
            onChange={(e) => setForm((prev) => ({ ...prev, isAvailable: e.target.checked }))}
          />
          Available
        </label>
        <button type="submit" disabled={saving}>{saving ? 'Adding…' : 'Add slot'}</button>
      </form>

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
