import { Routes, Route, Link, NavLink } from 'react-router-dom';
import './App.css';
import { ArtistList } from './pages/ArtistList';
import { ArtistForm } from './pages/ArtistForm';
import { ArtistDetail } from './pages/ArtistDetail';
import { ArtistAvailability } from './pages/ArtistAvailability';
import { Studio } from './pages/Studio';
import { Discover } from './pages/Discover';
import { ArtistBooking } from './pages/ArtistBooking';

function App() {
  return (
    <div className="app">
      <header className="header">
        <Link to="/" className="logo">
          <span className="logo-mark">P.</span>
          <span className="logo-text">Post.Ink</span>
        </Link>
        <nav>
          <NavLink to="/" end>Discover</NavLink>
          <NavLink to="/manage" className={({ isActive }) => isActive ? 'active nav-manage' : 'nav-manage'}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
            Management
          </NavLink>
        </nav>
      </header>
      <main className="main">
        <Routes>
          {/* Public / customer-facing */}
          <Route path="/" element={<Discover />} />
          <Route path="/discover" element={<Discover />} />
          <Route path="/artists/:id" element={<ArtistDetail />} />
          <Route path="/artists/:id/book" element={<ArtistBooking />} />

          {/* Management / admin */}
          <Route path="/manage" element={<Studio />} />
          <Route path="/manage/studio" element={<Studio />} />
          <Route path="/manage/artists" element={<ArtistList />} />
          <Route path="/manage/artists/new" element={<ArtistForm />} />
          <Route path="/manage/artists/:id" element={<ArtistDetail />} />
          <Route path="/manage/artists/:id/edit" element={<ArtistForm />} />
          <Route path="/manage/artists/:id/availability" element={<ArtistAvailability />} />
        </Routes>
      </main>
      <footer className="footer">
        <div className="footer-grid">
          <div className="footer-col footer-brand">
            <Link to="/" className="footer-logo">
              <span className="footer-logo-mark">P.</span>Post.Ink
            </Link>
            <p className="footer-tagline">Professional tattoo studio management</p>
            <div className="footer-social">
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none"/></svg>
              </a>
              <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" aria-label="TikTok">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/></svg>
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="X / Twitter">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 4l11.7 16h4.3M4 20L20 4"/><path d="M20 20l-7.5-10"/><path d="M4 4l7.5 10"/></svg>
              </a>
              <a href="https://wa.me/6281234567890" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21"/><path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1"/></svg>
              </a>
            </div>
          </div>

          <div className="footer-col">
            <h4>Studio</h4>
            <a href="https://maps.google.com/?q=Jl.+Kemang+Raya+No.+45,+Jakarta+Selatan" target="_blank" rel="noopener noreferrer" className="footer-address">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              Jl. Kemang Raya No. 45<br />Jakarta Selatan, 12730
            </a>
            <a href="https://maps.google.com/?q=Jl.+Kemang+Raya+No.+45,+Jakarta+Selatan" target="_blank" rel="noopener noreferrer" className="footer-map-link">View on Google Maps</a>
          </div>

          <div className="footer-col">
            <h4>Information</h4>
            <Link to="/refund-policy">Refund Policy</Link>
            <Link to="/terms">Terms & Conditions</Link>
            <Link to="/contact">Contact Us</Link>
            <Link to="/faq">FAQ</Link>
          </div>

          <div className="footer-col">
            <h4>Quick Links</h4>
            <Link to="/">Discover Artists</Link>
            <Link to="/manage/artists">Manage Artists</Link>
            <Link to="/manage/studio">Studio Management</Link>
          </div>
        </div>

        <div className="footer-bottom">
          <span>&copy; {new Date().getFullYear()} Post.Ink. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
