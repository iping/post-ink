import { useState, useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { getBookings } from '../api';
import styles from '../pages/Studio.module.css';

/**
 * Single shared layout for all management pages: one sidebar (with pending bookings count) + main content.
 */
export function ManageLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [pendingBookingsCount, setPendingBookingsCount] = useState(0);
  const location = useLocation();

  useEffect(() => {
    getBookings()
      .then((list) => setPendingBookingsCount((list || []).filter((b) => b.status === 'pending').length))
      .catch(() => setPendingBookingsCount(0));
  }, [location.pathname]);

  const search = new URLSearchParams(location.search);
  const currentTab = search.get('tab') || 'dashboard';

  const onDashboardSection =
    location.pathname === '/manage' && currentTab === 'dashboard';

  const onBookingsSection =
    currentTab === 'bookings' || location.pathname.startsWith('/manage/bookings/');

  return (
    <div className={styles.wrap}>
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
              <h1 className={styles.sidebarTitle}>Studio Management</h1>
              <p className={styles.sidebarSubtitle}>Manage your studio</p>
            </>
          )}
        </div>
        <nav className={styles.sideNav} aria-label="Admin sections">
          <NavLink
            to="/manage"
            end
            className={() => `${styles.sideNavLink} ${onDashboardSection ? styles.sideNavActive : ''}`}
            data-short="D"
            title="Dashboard"
          >
            Dashboard
            {pendingBookingsCount > 0 && (
              <span className={styles.sideNavBadge} aria-label={`${pendingBookingsCount} pending`}>
                {pendingBookingsCount}
              </span>
            )}
          </NavLink>
          <Link to="/manage?tab=bookings" className={styles.sideNavLink} data-short="B" title="Bookings">
            Bookings
          </Link>
          {!sidebarCollapsed && (
            <div className={styles.sideNavSub} aria-label="Booking actions">
              <Link to="/manage/bookings/new" className={styles.sideNavSubLink} title="New booking">
                <span>+ New booking</span>
              </Link>
            </div>
          )}
          <Link to="/manage?tab=artists" className={styles.sideNavLink} data-short="A" title="Tattoo Artist">Tattoo Artist</Link>
          <Link to="/manage?tab=payments" className={styles.sideNavLink} data-short="P" title="Payments">Payments</Link>
          <Link to="/manage?tab=commissions" className={styles.sideNavLink} data-short="C" title="Commission">Commission</Link>
          <Link to="/manage?tab=customers" className={styles.sideNavLink} data-short="U" title="Customers">Customers</Link>
          <Link to="/manage?tab=specialities" className={styles.sideNavLink} data-short="S" title="Specialities">Specialities</Link>
          <Link to="/manage?tab=payment-destinations" className={styles.sideNavLink} data-short="Pay" title="Payment options">Payment options</Link>
          <Link to="/manage?tab=users" className={styles.sideNavLink} data-short="Us" title="Users">Users</Link>
        </nav>
      </aside>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
