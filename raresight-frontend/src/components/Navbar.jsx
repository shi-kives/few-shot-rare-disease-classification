import React, { useState, useRef } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import useOutsideClick from '../hooks/useOutsideClick.js';
import HealthIndicator from './HealthIndicator.jsx';
import styles from './Navbar.module.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const location = useLocation();

  useOutsideClick(dropdownRef, () => {
    if (dropdownOpen) setDropdownOpen(false);
  });

  const getNavLinkClass = ({ isActive }) =>
    isActive ? `${styles.navLink} ${styles.activeLink}` : styles.navLink;

  const getMenuItemClass = (path) =>
    location.pathname === path
      ? `${styles.menuItem} ${styles.menuItemActive}`
      : styles.menuItem;

  const handleItemClick = () => {
    setDropdownOpen(false);
  };

  return (
    <header className={styles.header}>
      <div className={styles.navContainer}>
        {/* Left: Brand */}
        <Link to="/analyse" className={styles.brand}>
          <span className={styles.logoIcon}>⚕</span>
          <span>RareSight</span>
        </Link>

        {/* Center: Primary Clinical Action Links */}
        <nav className={styles.navLinks} aria-label="Main Navigation">
          <NavLink to="/analyse" className={getNavLinkClass}>
            Analyse
          </NavLink>
          <NavLink to="/add-class" className={getNavLinkClass}>
            Add Class
          </NavLink>
        </nav>

        {/* Right: Health Indicator & User Profile Dropdown */}
        <div className={styles.rightSection} ref={dropdownRef}>
          <HealthIndicator full={false} />

          {user && (
            <>
              <button
                type="button"
                className={styles.avatarButton}
                onClick={() => setDropdownOpen((prev) => !prev)}
                aria-expanded={dropdownOpen}
                aria-label="User profile and menu"
                title={`${user.name || 'User'} (${user.role || 'Clinician'})`}
              >
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name || 'User'}
                    className={styles.avatarImage}
                  />
                ) : (
                  <span>{user.avatarInitial || 'U'}</span>
                )}
              </button>

              {dropdownOpen && (
                <div className={styles.dropdown} role="menu">
                  {/* User Profile Header */}
                  <div className={styles.dropdownHeader}>
                    <div className={styles.headerAvatar}>
                      {user.avatarInitial || 'U'}
                    </div>
                    <div className={styles.headerInfo}>
                      <div className={styles.userName}>
                        {user.name || 'Dr. Clinician'}
                      </div>
                      <div className={styles.userEmail}>{user.email}</div>
                      <span className={styles.rolePill}>
                        {user.role || 'Specialist Doctor'}
                      </span>
                    </div>
                  </div>

                  <hr className={styles.divider} />

                  {/* Navigation & Profile Items */}
                  <div className={styles.menuList}>
                    <NavLink
                      to="/history"
                      className={() => getMenuItemClass('/history')}
                      onClick={handleItemClick}
                      role="menuitem"
                    >
                      <span className={styles.menuIcon}>📋</span>
                      <span>Analysis History</span>
                    </NavLink>

                    <NavLink
                      to="/settings"
                      className={() => getMenuItemClass('/settings')}
                      onClick={handleItemClick}
                      role="menuitem"
                    >
                      <span className={styles.menuIcon}>⚙</span>
                      <span>Settings & Preferences</span>
                    </NavLink>
                  </div>

                  <hr className={styles.divider} />

                  {/* Sign Out */}
                  <div className={styles.menuList}>
                    <button
                      type="button"
                      className={`${styles.menuItem} ${styles.signOutItem}`}
                      onClick={() => {
                        setDropdownOpen(false);
                        logout();
                      }}
                      role="menuitem"
                    >
                      <span className={styles.menuIcon}>🚪</span>
                      <span>Sign out</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
