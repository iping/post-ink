import { useState, useEffect, useRef } from 'react';
import { Routes, Route, Link, NavLink, useNavigate, Navigate, Outlet } from 'react-router-dom';
import './App.css';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ManageLayout } from './components/ManageLayout';
import { useAuth } from './context/AuthContext';
import { ArtistForm } from './pages/ArtistForm';
import { ArtistDetail } from './pages/ArtistDetail';
import { ArtistAvailability } from './pages/ArtistAvailability';
import { Studio } from './pages/Studio';
import { Discover } from './pages/Discover';
import { ArtistBooking } from './pages/ArtistBooking';
import { BookingForm } from './pages/BookingForm';
import { BookingDetail } from './pages/BookingDetail';
import { Login } from './pages/Login';

function App() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
    setUserMenuOpen(false);
  }

  return (
    <div className="app">
      <header className="header">
        <Link to="/" className="logo">
          <span className="logo-mark">I.</span>
          <span className="logo-text">InkedHub</span>
        </Link>
        <nav>
          <NavLink to="/" end>Discover</NavLink>
          {token ? (
            <>
              <NavLink to="/manage" className={({ isActive }) => isActive ? 'active nav-manage' : 'nav-manage'}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                Management
              </NavLink>
              <div className="header-user-menu" ref={userMenuRef}>
                <button
                  type="button"
                  className="header-user-trigger"
                  onClick={() => setUserMenuOpen((v) => !v)}
                  aria-expanded={userMenuOpen}
                  aria-haspopup="true"
                  aria-label="User menu"
                >
                  <span className="header-user">{user?.email || user?.name || 'User'}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={userMenuOpen ? 'header-user-chevron open' : 'header-user-chevron'}><path d="M6 9l6 6 6-6"/></svg>
                </button>
                {userMenuOpen && (
                  <div className="header-user-dropdown" role="menu">
                    <Link to="/manage" className="header-user-item" role="menuitem" onClick={() => setUserMenuOpen(false)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>
                      Dashboard
                    </Link>
                    <button type="button" className="header-user-item" role="menuitem" onClick={handleLogout}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                      Log out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <NavLink to="/login" className="nav-manage">Sign in</NavLink>
          )}
        </nav>
      </header>
      <main className="main">
        <Routes>
          {/* Public / customer-facing */}
          <Route path="/" element={<Discover />} />
          <Route path="/discover" element={<Discover />} />
          <Route path="/artists/:id" element={<ArtistDetail />} />
          <Route path="/artists/:id/book" element={<ArtistBooking />} />

          {/* Login (public) */}
          <Route path="/login" element={<Login />} />

          {/* Management: single sidebar with pending bookings count */}
          <Route element={<ProtectedRoute><ManageLayout /></ProtectedRoute>}>
            <Route path="/manage" element={<Studio />} />
            <Route path="/manage/studio" element={<Studio />} />
            <Route path="/manage/bookings/new" element={<BookingForm />} />
            <Route path="/manage/bookings/:id" element={<BookingDetail />} />
            <Route path="/manage/bookings/:id/edit" element={<BookingForm />} />
            <Route path="/manage/artists" element={<Navigate to="/manage?tab=artists" replace />} />
            <Route path="/manage/artists/new" element={<ArtistForm />} />
            <Route path="/manage/artists/:id" element={<ArtistDetail />} />
            <Route path="/manage/artists/:id/edit" element={<ArtistForm />} />
            <Route path="/manage/artists/:id/availability" element={<ArtistAvailability />} />
          </Route>
        </Routes>
      </main>
      <footer className="footer">
        <div className="footer-bottom">
          <span>&copy; {new Date().getFullYear()} InkedHub. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
