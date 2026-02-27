import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getArtist, createArtist, updateArtist, uploadUrl, getSpecialities } from '../api';
import styles from './ArtistForm.module.css';

function FloatingField({ id, label, icon, value, onChange, required, type = 'text', placeholder, hint, maxLength, step, min, prefix, autoFocus }) {
  const [focused, setFocused] = useState(false);
  const hasValue = value !== '' && value != null;
  const isActive = focused || hasValue;

  return (
    <div className={`${styles.floatField} ${focused ? styles.floatFocused : ''} ${hasValue ? styles.floatFilled : ''}`}>
      <div className={styles.floatIcon}>{icon}</div>
      <div className={styles.floatBody}>
        <label htmlFor={id} className={`${styles.floatLabel} ${isActive ? styles.floatLabelUp : ''}`}>
          {label}{required && <span className={styles.req}>*</span>}
        </label>
        {prefix && <span className={`${styles.floatPrefix} ${isActive ? styles.floatPrefixVisible : ''}`}>{prefix}</span>}
        <input
          id={id}
          name={id}
          type={type}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          required={required}
          placeholder={focused ? placeholder : ''}
          maxLength={maxLength}
          step={step}
          min={min}
          autoFocus={autoFocus}
          className={prefix ? styles.floatInputWithPrefix : ''}
        />
        <div className={styles.floatLine}>
          <div className={styles.floatLineFill} />
        </div>
      </div>
      {hasValue && !required && (
        <div className={styles.floatCheck}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
        </div>
      )}
      {hasValue && required && (
        <div className={styles.floatCheck}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
        </div>
      )}
      {hint && <span className={styles.floatHint}>{hint}</span>}
    </div>
  );
}

function FloatingTextarea({ id, label, icon, value, onChange, placeholder, hint, maxLength, rows = 4 }) {
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef(null);
  const hasValue = value !== '';
  const isActive = focused || hasValue;
  const charPct = maxLength ? Math.min(100, (value.length / maxLength) * 100) : 0;

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.max(el.scrollHeight, rows * 24) + 'px';
  }, [rows]);

  useEffect(() => { autoResize(); }, [value, autoResize]);

  return (
    <div className={`${styles.floatField} ${styles.floatTextarea} ${focused ? styles.floatFocused : ''} ${hasValue ? styles.floatFilled : ''}`}>
      <div className={styles.floatIcon}>{icon}</div>
      <div className={styles.floatBody}>
        <label htmlFor={id} className={`${styles.floatLabel} ${isActive ? styles.floatLabelUp : ''}`}>
          {label}
        </label>
        <textarea
          ref={textareaRef}
          id={id}
          name={id}
          value={value}
          onChange={(e) => { onChange(e); autoResize(); }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={focused ? placeholder : ''}
          maxLength={maxLength}
          rows={rows}
        />
        <div className={styles.floatLine}>
          <div className={styles.floatLineFill} />
        </div>
      </div>
      {maxLength && (
        <div className={styles.textareaFooter}>
          <div className={styles.charBar}>
            <div
              className={styles.charBarFill}
              style={{ width: `${charPct}%`, background: charPct > 90 ? 'var(--danger)' : charPct > 70 ? 'var(--accent)' : 'var(--accent)' }}
            />
          </div>
          <span className={`${styles.charCount} ${charPct > 90 ? styles.charCountWarn : ''}`}>{value.length}/{maxLength}</span>
        </div>
      )}
      {hint && <span className={styles.floatHint}>{hint}</span>}
    </div>
  );
}

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
    rate: '',
    photos: [],
    portfolio: [],
  });
  const [photoFiles, setPhotoFiles] = useState([]);
  const [portfolioFiles, setPortfolioFiles] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [portfolioPreviews, setPortfolioPreviews] = useState([]);
  const [customSpec, setCustomSpec] = useState('');
  const [specOptions, setSpecOptions] = useState([]);
  const photoInputRef = useRef(null);
  const portfolioInputRef = useRef(null);

  useEffect(() => {
    getSpecialities()
      .then((list) => setSpecOptions(list.map((s) => s.name)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!id) return;
    getArtist(id)
      .then((a) => {
        setForm({
          name: a.name || '',
          shortDescription: a.shortDescription || '',
          experiences: a.experiences || '',
          speciality: a.speciality || '',
          rate: a.rate != null ? String(a.rate) : '',
          photos: safeParse(a.photos),
          portfolio: safeParse(a.portfolio),
        });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    const urls = photoFiles.map((f) => URL.createObjectURL(f));
    setPhotoPreviews(urls);
    return () => urls.forEach(URL.revokeObjectURL);
  }, [photoFiles]);

  useEffect(() => {
    const urls = portfolioFiles.map((f) => URL.createObjectURL(f));
    setPortfolioPreviews(urls);
    return () => urls.forEach(URL.revokeObjectURL);
  }, [portfolioFiles]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const selectedSpecs = form.speciality ? form.speciality.split(', ').filter(Boolean) : [];
  const toggleSpec = (spec) => {
    const next = selectedSpecs.includes(spec)
      ? selectedSpecs.filter((s) => s !== spec)
      : [...selectedSpecs, spec];
    setForm((prev) => ({ ...prev, speciality: next.join(', ') }));
  };
  const addCustomSpec = () => {
    const trimmed = customSpec.trim();
    if (trimmed && !selectedSpecs.includes(trimmed)) {
      setForm((prev) => ({ ...prev, speciality: [...selectedSpecs, trimmed].join(', ') }));
    }
    setCustomSpec('');
  };

  const handlePhotoDrop = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove(styles.dropActive);
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
    if (files.length) setPhotoFiles((prev) => [...prev, ...files]);
  };

  const handlePortfolioDrop = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove(styles.dropActive);
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
    if (files.length) setPortfolioFiles((prev) => [...prev, ...files]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.classList.add(styles.dropActive);
  };
  const handleDragLeave = (e) => {
    e.currentTarget.classList.remove(styles.dropActive);
  };

  const removeExistingPhoto = (idx) => {
    setForm((prev) => ({ ...prev, photos: prev.photos.filter((_, i) => i !== idx) }));
  };
  const removeNewPhoto = (idx) => {
    setPhotoFiles((prev) => prev.filter((_, i) => i !== idx));
  };
  const removeExistingPortfolio = (idx) => {
    setForm((prev) => ({ ...prev, portfolio: prev.portfolio.filter((_, i) => i !== idx) }));
  };
  const removeNewPortfolio = (idx) => {
    setPortfolioFiles((prev) => prev.filter((_, i) => i !== idx));
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
    fd.append('rate', form.rate);
    fd.append('photos', JSON.stringify(form.photos));
    fd.append('portfolio', JSON.stringify(form.portfolio));
    photoFiles.forEach((f) => fd.append('photos', f));
    portfolioFiles.forEach((f) => fd.append('portfolio', f));
    try {
      if (isEdit) {
        await updateArtist(id, fd);
        navigate(`/manage/artists/${id}`);
      } else {
        const artist = await createArtist(fd);
        navigate(`/manage/artists/${artist.id}`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const descLen = form.shortDescription.length;

  if (loading) {
    return (
      <div className={styles.loadingWrap}>
        <div className={styles.spinner} />
        <span>Loading artist data...</span>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <Link to={isEdit ? `/manage/artists/${id}` : '/manage/artists'} className={styles.backBtn}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
          {isEdit ? 'Back to Profile' : 'All Artists'}
        </Link>
        <div className={styles.topBarRight}>
          <span className={styles.badge}>{isEdit ? 'Editing' : 'New Artist'}</span>
        </div>
      </div>

      <div className={styles.hero}>
        <h1>{isEdit ? 'Edit Artist Profile' : 'Add New Artist'}</h1>
        <p className={styles.heroSub}>
          {isEdit
            ? 'Update artist information, specialities, and portfolio images.'
            : 'Fill in the artist details below to create a new profile on the platform.'}
        </p>
      </div>

      {error && (
        <div className={styles.error}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.grid}>
          {/* Left column: Basic info */}
          <div className={styles.col}>
            <div className={styles.card}>
              <div className={styles.cardHead}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                <h2>Basic Information</h2>
              </div>

              <FloatingField
                id="name"
                label="Full Name"
                icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>}
                value={form.name}
                onChange={handleChange}
                required
                placeholder="e.g. Maya Chen"
                autoFocus={!isEdit}
              />

              <FloatingTextarea
                id="shortDescription"
                label="Bio / Short Description"
                icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>}
                value={form.shortDescription}
                onChange={handleChange}
                placeholder="Describe the artist's style, philosophy, and unique qualities..."
                hint="A compelling bio helps customers connect with the artist"
                maxLength={300}
                rows={4}
              />

              <div className={styles.fieldRow}>
                <FloatingField
                  id="experiences"
                  label="Experience"
                  icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>}
                  value={form.experiences}
                  onChange={handleChange}
                  placeholder="e.g. 8 years"
                  hint="Years of professional experience"
                />
                <FloatingField
                  id="rate"
                  label="Hourly Rate (IDR)"
                  icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>}
                  value={form.rate}
                  onChange={handleChange}
                  type="number"
                  step="50000"
                  min="0"
                  placeholder="750000"
                  prefix="Rp"
                  hint="Rate charged per hour"
                />
              </div>
            </div>

            {/* Specialities card */}
            <div className={styles.card}>
              <div className={styles.cardHead}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                <h2>Specialities</h2>
              </div>
              <p className={styles.cardHint}>Select the styles this artist specializes in, or add custom tags.</p>
              <div className={styles.specGrid}>
                {specOptions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`${styles.specTag} ${selectedSpecs.includes(s) ? styles.specActive : ''}`}
                    onClick={() => toggleSpec(s)}
                  >
                    {selectedSpecs.includes(s) && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>}
                    {s}
                  </button>
                ))}
              </div>
              <div className={styles.customSpecRow}>
                <input
                  placeholder="Add custom speciality..."
                  value={customSpec}
                  onChange={(e) => setCustomSpec(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomSpec())}
                />
                <button type="button" onClick={addCustomSpec} className={styles.addSpecBtn} disabled={!customSpec.trim()}>
                  + Add
                </button>
              </div>
              {selectedSpecs.length > 0 && (
                <div className={styles.selectedSpecs}>
                  <span className={styles.selectedLabel}>Selected:</span>
                  {selectedSpecs.map((s) => (
                    <span key={s} className={styles.selectedChip}>
                      {s}
                      <button type="button" onClick={() => toggleSpec(s)}>&times;</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right column: Images */}
          <div className={styles.col}>
            {/* Profile photos */}
            <div className={styles.card}>
              <div className={styles.cardHead}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
                <h2>Profile Photos</h2>
              </div>
              <p className={styles.cardHint}>Upload headshots or studio photos of the artist.</p>

              {(form.photos.length > 0 || photoPreviews.length > 0) && (
                <div className={styles.imageGrid}>
                  {form.photos.map((url, i) => (
                    <div key={`existing-${i}`} className={styles.imageThumb}>
                      <img src={uploadUrl(url)} alt="" />
                      <button type="button" onClick={() => removeExistingPhoto(i)} className={styles.imgRemove}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                      </button>
                    </div>
                  ))}
                  {photoPreviews.map((url, i) => (
                    <div key={`new-${i}`} className={`${styles.imageThumb} ${styles.imageNew}`}>
                      <img src={url} alt="" />
                      <span className={styles.newBadge}>NEW</span>
                      <button type="button" onClick={() => removeNewPhoto(i)} className={styles.imgRemove}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div
                className={styles.dropZone}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handlePhotoDrop}
                onClick={() => photoInputRef.current?.click()}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                <span className={styles.dropLabel}>Drag & drop images here</span>
                <span className={styles.dropHint}>or click to browse</span>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className={styles.hiddenInput}
                  onChange={(e) => setPhotoFiles((prev) => [...prev, ...Array.from(e.target.files || [])])}
                />
              </div>
            </div>

            {/* Portfolio */}
            <div className={styles.card}>
              <div className={styles.cardHead}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8" /><path d="M12 17v4" /></svg>
                <h2>Portfolio Work</h2>
              </div>
              <p className={styles.cardHint}>Showcase the artist's best tattoo work. High-quality images recommended.</p>

              {(form.portfolio.length > 0 || portfolioPreviews.length > 0) && (
                <div className={styles.imageGrid}>
                  {form.portfolio.map((url, i) => (
                    <div key={`existing-${i}`} className={styles.imageThumb}>
                      <img src={uploadUrl(url)} alt="" />
                      <button type="button" onClick={() => removeExistingPortfolio(i)} className={styles.imgRemove}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                      </button>
                    </div>
                  ))}
                  {portfolioPreviews.map((url, i) => (
                    <div key={`new-${i}`} className={`${styles.imageThumb} ${styles.imageNew}`}>
                      <img src={url} alt="" />
                      <span className={styles.newBadge}>NEW</span>
                      <button type="button" onClick={() => removeNewPortfolio(i)} className={styles.imgRemove}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div
                className={styles.dropZone}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handlePortfolioDrop}
                onClick={() => portfolioInputRef.current?.click()}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                <span className={styles.dropLabel}>Drag & drop portfolio images</span>
                <span className={styles.dropHint}>or click to browse</span>
                <input
                  ref={portfolioInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className={styles.hiddenInput}
                  onChange={(e) => setPortfolioFiles((prev) => [...prev, ...Array.from(e.target.files || [])])}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom action bar */}
        <div className={styles.actionBar}>
          <div className={styles.actionLeft}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
            <span>All changes are saved when you click {isEdit ? 'Save' : 'Create'}.</span>
          </div>
          <div className={styles.actionBtns}>
            <button type="button" onClick={() => navigate(-1)} className={styles.cancelBtn}>Cancel</button>
            <button type="submit" disabled={saving || !form.name.trim()} className={styles.submitBtn}>
              {saving ? (
                <>
                  <span className={styles.btnSpinner} />
                  Saving...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                  {isEdit ? 'Save Changes' : 'Create Artist'}
                </>
              )}
            </button>
          </div>
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
