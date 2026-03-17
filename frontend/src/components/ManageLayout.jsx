import { useState, useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getBookings, getStudios, getApiStudioId } from '../api';
import styles from '../pages/Studio.module.css';

/**
 * Single shared layout for all management pages: one sidebar (with pending bookings count) + main content.
 * Super admin: can switch studio to view any tenant. Studio user: sees only their studio.
 */
export function ManageLayout() {
  const { user } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [pendingBookingsCount, setPendingBookingsCount] = useState(0);
  const [studios, setStudios] = useState([]);
  const currentStudioId = getApiStudioId();
  const location = useLocation();
  const isSuperAdmin = user?.role === 'super_admin';

  useEffect(() => {
    if (isSuperAdmin) {
      getStudios()
        .then((list) => setStudios(Array.isArray(list) ? list : []))
        .catch(() => setStudios([]));
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    getBookings()
      .then((list) => setPendingBookingsCount((list || []).filter((b) => b.status === 'pending').length))
      .catch(() => setPendingBookingsCount(0));
  }, [location.pathname, currentStudioId]);

  const search = new URLSearchParams(location.search);
  const currentTab = search.get('tab') || 'bookings';

  const onBookingsSection =
    currentTab === 'bookings' || location.pathname.startsWith('/manage/bookings/');
  const onNewBookingPage = location.pathname === '/manage/bookings/new';

  const currentStudioName =
    isSuperAdmin
      ? (studios.find((s) => s.id === currentStudioId)?.name ?? 'Select studio')
      : (user?.studio?.name || 'My Studio');

  const [bookingOpen, setBookingOpen] = useState(false);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [myStudioOpen, setMyStudioOpen] = useState(false);

  useEffect(() => {
    if (currentTab === 'bookings' || location.pathname.startsWith('/manage/bookings/')) setBookingOpen(true);
  }, [currentTab, location.pathname]);
  useEffect(() => {
    if (currentTab === 'customers' || currentTab === 'leads') setCustomerOpen(true);
  }, [currentTab]);
  useEffect(() => {
    if (['profile', 'artists', 'payment-destinations', 'commissions', 'users', 'specialities'].includes(currentTab)) setMyStudioOpen(true);
  }, [currentTab]);

  return (
    <div className={`${styles.wrap} ${!sidebarCollapsed ? styles.sidebarOpen : ''}`}>
      {!sidebarCollapsed && (
        <div
          className={styles.sidebarBackdrop}
          onClick={() => setSidebarCollapsed(true)}
          onKeyDown={(e) => e.key === 'Escape' && setSidebarCollapsed(true)}
          aria-hidden="true"
          role="presentation"
        />
      )}
      <aside className={`${styles.sidebar} ${sidebarCollapsed ? styles.sidebarCollapsed : ''}`} aria-label="Studio menu">
        <div className={styles.sidebarHeader}>
          <button
            type="button"
            className={styles.burgerBtn}
            onClick={() => setSidebarCollapsed((v) => !v)}
            aria-expanded={!sidebarCollapsed}
            aria-label={sidebarCollapsed ? 'Open menu' : 'Minimize menu'}
          >
            <span className={styles.burgerLine} />
            <span className={styles.burgerLine} />
            <span className={styles.burgerLine} />
          </button>
          {!sidebarCollapsed && (
            <>
              <h1 className={styles.sidebarTitle}>{isSuperAdmin ? 'Super Admin' : 'Studio Management'}</h1>
              <p className={styles.sidebarSubtitle}>
                {isSuperAdmin
                  ? (studios.find((s) => s.id === currentStudioId)?.name ?? 'Select studio')
                  : (user?.studio?.name || 'Manage your studio')}
              </p>
            </>
          )}
        </div>
        <div className={styles.sideNavBlock}>
          <nav className={styles.sideNav} aria-label="Studio management sections">
          <div className={styles.sideNavGroup}>
            <button
              type="button"
              className={styles.sideNavGroupLabelBtn}
              data-short="B"
              onClick={() => {
                if (sidebarCollapsed) setSidebarCollapsed(false);
                setBookingOpen((v) => !v);
              }}
              aria-expanded={bookingOpen}
              aria-controls="side-nav-booking"
            >
              <span className={styles.sideNavGroupLabelText}>Booking</span>
              {pendingBookingsCount > 0 && (
                <span className={styles.sideNavBadge} aria-label={`${pendingBookingsCount} pending`}>
                  {pendingBookingsCount}
                </span>
              )}
              <span className={`${styles.sideNavGroupChevron} ${bookingOpen ? styles.sideNavGroupChevronOpen : ''}`} aria-hidden>▼</span>
            </button>
            {bookingOpen && (
              <div id="side-nav-booking" className={styles.sideNavGroupContent} role="region">
                <Link to="/manage/bookings/new" className={`${styles.sideNavLink} ${onNewBookingPage ? styles.sideNavActive : ''}`} data-short="+" title="New Booking">
                  <span className={styles.sideNavLinkText}>New Booking</span>
                </Link>
                <Link to="/manage?tab=bookings" className={`${styles.sideNavLink} ${currentTab === 'bookings' ? styles.sideNavActive : ''}`} data-short="O" title="Booking Orders">
                  <span className={styles.sideNavLinkText}>Booking Orders</span>
                  {pendingBookingsCount > 0 && (
                    <span className={styles.sideNavBadge} aria-label={`${pendingBookingsCount} pending`}>
                      {pendingBookingsCount}
                    </span>
                  )}
                </Link>
              </div>
            )}
          </div>

          <div className={styles.sideNavGroup}>
            <button
              type="button"
              className={styles.sideNavGroupLabelBtn}
              data-short="Cu"
              onClick={() => {
                if (sidebarCollapsed) setSidebarCollapsed(false);
                setCustomerOpen((v) => !v);
              }}
              aria-expanded={customerOpen}
              aria-controls="side-nav-customer"
            >
              <span className={styles.sideNavGroupLabelText}>Customer</span>
              <span className={`${styles.sideNavGroupChevron} ${customerOpen ? styles.sideNavGroupChevronOpen : ''}`} aria-hidden>▼</span>
            </button>
            {customerOpen && (
              <div id="side-nav-customer" className={styles.sideNavGroupContent} role="region">
                <Link to="/manage?tab=customers" className={`${styles.sideNavLink} ${currentTab === 'customers' ? styles.sideNavActive : ''}`} data-short="Cu" title="Customer">
                  <span className={styles.sideNavLinkText}>Customer</span>
                </Link>
                <Link to="/manage?tab=leads" className={`${styles.sideNavLink} ${currentTab === 'leads' ? styles.sideNavActive : ''}`} data-short="L" title="Leads">
                  <span className={styles.sideNavLinkText}>Leads</span>
                </Link>
              </div>
            )}
          </div>

          <div className={styles.sideNavGroup}>
            <button
              type="button"
              className={styles.sideNavGroupLabelBtn}
              data-short="My"
              onClick={() => {
                if (sidebarCollapsed) setSidebarCollapsed(false);
                setMyStudioOpen((v) => !v);
              }}
              aria-expanded={myStudioOpen}
              aria-controls="side-nav-mystudio"
            >
              <span className={styles.sideNavGroupLabelText}>
                My Studio{!sidebarCollapsed ? ` — ${currentStudioName}` : ''}
              </span>
              <span className={`${styles.sideNavGroupChevron} ${myStudioOpen ? styles.sideNavGroupChevronOpen : ''}`} aria-hidden>▼</span>
            </button>
            {myStudioOpen && (
              <div id="side-nav-mystudio" className={styles.sideNavGroupContent} role="region">
                <Link to="/manage?tab=profile" className={`${styles.sideNavLink} ${currentTab === 'profile' ? styles.sideNavActive : ''}`} data-short="Pr" title="Studio profile">
                  <span className={styles.sideNavLinkText}>Studio Profile</span>
                </Link>
                <Link to="/manage?tab=artists" className={`${styles.sideNavLink} ${currentTab === 'artists' ? styles.sideNavActive : ''}`} data-short="A" title="Tattoo artists">
                  <span className={styles.sideNavLinkText}>Tattoo Artist</span>
                </Link>
                <Link to="/manage?tab=payment-destinations" className={`${styles.sideNavLink} ${currentTab === 'payment-destinations' ? styles.sideNavActive : ''}`} data-short="Ac" title="Payment accounts">
                  <span className={styles.sideNavLinkText}>Payment Account</span>
                </Link>
                <Link to="/manage?tab=commissions" className={`${styles.sideNavLink} ${currentTab === 'commissions' ? styles.sideNavActive : ''}`} data-short="Co" title="Commission">
                  <span className={styles.sideNavLinkText}>Commission</span>
                </Link>
                <Link to="/manage?tab=users" className={`${styles.sideNavLink} ${currentTab === 'users' ? styles.sideNavActive : ''}`} data-short="U" title="Users">
                  <span className={styles.sideNavLinkText}>Users</span>
                </Link>
                <Link to="/manage?tab=specialities" className={`${styles.sideNavLink} ${currentTab === 'specialities' ? styles.sideNavActive : ''}`} data-short="S" title="Specialities">
                  <span className={styles.sideNavLinkText}>Specialities</span>
                </Link>
              </div>
            )}
          </div>
          </nav>
        </div>
      </aside>
      <main className={styles.main}>
        <header className={styles.mainHeader}>
          <span className={styles.mainHeaderStudioName}>
            {isSuperAdmin
              ? (studios.find((s) => s.id === currentStudioId)?.name ?? 'Select studio')
              : (user?.studio?.name ?? 'Studio')}
          </span>
        </header>
        <Outlet />
      </main>
    </div>
  );
}
