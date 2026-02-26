import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getArtist, createArtist, updateArtist } from '../api';
import styles from './ArtistForm.module.css';

export function ArtistForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    name: '',
    shortDescription: '',
    experiences: '',
    speciality: '',
    photos: [],
    portfolio: [],
  });
  const [photoFiles, setPhotoFiles] = useState([]);
  const [portfolioFiles, setPortfolioFiles] = useState([]);

  useEffect(() => {
    if (!id) return;
    getArtist(id)
      .then((a) => {
        setForm({
          name: a.name || '',
          shortDescription: a.shortDescription || '',
          experiences: a.experiences || '',
          speciality: a.speciality || '',
          photos: safeParse(a.photos),
          portfolio: safeParse(a.portfolio),
        });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const fd = new FormData();
    fd.append('name', form.name);
    fd.append('shortDescription', form.shortDescription);
    fd.append('experiences', form.experiences);
    fd.append('speciality', form.speciality);
    fd.append('photos', JSON.stringify(form.photos));
    fd.append('portfolio', JSON.stringify(form.portfolio));
    photoFiles.forEach((f) => fd.append('photos', f));
    portfolioFiles.forEach((f) => fd.append('portfolio', f));
    try {
      if (isEdit) {
        await updateArtist(id, fd);
        navigate(`/artists/${id}`);
      } else {
        const artist = await createArtist(fd);
        navigate(`/artists/${artist.id}`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const removePhoto = (idx) => {
    setForm((prev) => ({ ...prev, photos: prev.photos.filter((_, i) => i !== idx) }));
  };
  const removePortfolio = (idx) => {
    setForm((prev) => ({ ...prev, portfolio: prev.portfolio.filter((_, i) => i !== idx) }));
  };

  if (loading) return <div className={styles.loading}>Loading…</div>;

  return (
    <div className={styles.wrap}>
      <h1>{isEdit ? 'Edit Artist' : 'Add Tattoo Artist'}</h1>
      {error && <div className={styles.error}>{error}</div>}
      <form onSubmit={handleSubmit} className={styles.form}>
        <label>
          Name *
          <input name="name" value={form.name} onChange={handleChange} required />
        </label>
        <label>
          Short description
          <textarea name="shortDescription" value={form.shortDescription} onChange={handleChange} rows={3} />
        </label>
        <label>
          Experience (e.g. years or description)
          <input name="experiences" value={form.experiences} onChange={handleChange} />
        </label>
        <label>
          Speciality (e.g. Black & Grey, Japanese, Realism)
          <input name="speciality" value={form.speciality} onChange={handleChange} />
        </label>

        <fieldset className={styles.images}>
          <legend>Profile photos</legend>
          {form.photos.length > 0 && (
            <div className={styles.previewRow}>
              {form.photos.map((url, i) => (
                <div key={i} className={styles.preview}>
                  <img src={url.startsWith('/') ? url : `/${url}`} alt="" />
                  <button type="button" onClick={() => removePhoto(i)} className={styles.removeBtn}>×</button>
                </div>
              ))}
            </div>
          )}
          <input type="file" accept="image/*" multiple onChange={(e) => setPhotoFiles(Array.from(e.target.files || []))} />
        </fieldset>

        <fieldset className={styles.images}>
          <legend>Portfolio</legend>
          {form.portfolio.length > 0 && (
            <div className={styles.previewRow}>
              {form.portfolio.map((url, i) => (
                <div key={i} className={styles.preview}>
                  <img src={url.startsWith('/') ? url : `/${url}`} alt="" />
                  <button type="button" onClick={() => removePortfolio(i)} className={styles.removeBtn}>×</button>
                </div>
              ))}
            </div>
          )}
          <input type="file" accept="image/*" multiple onChange={(e) => setPortfolioFiles(Array.from(e.target.files || []))} />
        </fieldset>

        <div className={styles.actions}>
          <button type="submit" disabled={saving}>{saving ? 'Saving…' : (isEdit ? 'Save' : 'Create')}</button>
          <button type="button" onClick={() => navigate(-1)}>Cancel</button>
        </div>
      </form>
    </div>
  );
}

function safeParse(str) {
  if (!str) return [];
  try {
    const v = JSON.parse(str);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
