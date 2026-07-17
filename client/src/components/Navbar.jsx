/**
 * Navbar.jsx
 * Features:
 *   - Logo + nav links (Home, Dashboard, Job Offers)
 *   - When logged in: profile avatar icon → dropdown with Profile, Theme Toggle, Logout
 *   - When logged out: Login + Signup buttons
 *   - Hamburger menu on mobile
 */
import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { FaUser, FaSignOutAlt, FaSun, FaMoon } from 'react-icons/fa';
import './Navbar.css';

const Navbar = () => {
  const { theme, toggleTheme } = useTheme();
  const { isLoggedIn, user, logout } = useAuth();
  const navigate = useNavigate();

  // Mobile hamburger state
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  // Profile dropdown state
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    closeMenu();
    setDropdownOpen(false);
    logout();
    navigate('/login');
  };

  // Get user initials for avatar
  const getInitials = () => {
    const name = user?.name || user?.username || '';
    if (!name) return '';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name[0].toUpperCase();
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">

        {/* Logo */}
        <Link to="/" className="navbar-logo" onClick={closeMenu}>
          MailOra
        </Link>

        {/* Hamburger — mobile only */}
        <button
          className={`hamburger-btn${menuOpen ? ' open' : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle navigation menu"
          aria-expanded={menuOpen}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        {/* Nav menu */}
        <ul className={`nav-menu${menuOpen ? ' nav-menu--open' : ''}`}>
          {isLoggedIn ? (
            <>
              <li className="nav-item">
                <Link to="/" className="nav-links" onClick={closeMenu}>Home</Link>
              </li>
              <li className="nav-item">
                <Link to="/dashboard" className="nav-links" onClick={closeMenu}>Dashboard</Link>
              </li>
              <li className="nav-item">
                <Link to="/jobs" className="nav-links" onClick={closeMenu}>Job Offers</Link>
              </li>

              {/* Profile Icon + Dropdown */}
              <li className="nav-item nav-profile-item" ref={dropdownRef}>
                <button
                  className="nav-profile-btn"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  aria-label="Profile menu"
                  id="nav-profile-btn"
                >
                  <div className="nav-avatar">
                    {user?.photo ? (
                      <img src={user.photo} alt="Profile" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                    ) : (
                      getInitials() || <FaUser size={14} />
                    )}
                  </div>
                </button>

                {/* Dropdown */}
                {dropdownOpen && (
                  <div className="nav-dropdown">
                    {/* User info header */}
                    <div className="nav-dropdown-header">
                      <div className="nav-dropdown-avatar">
                        {user?.photo ? (
                          <img src={user.photo} alt="Profile" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                        ) : (
                          getInitials() || <FaUser size={16} />
                        )}
                      </div>
                      <div className="nav-dropdown-user-info">
                        <span className="nav-dropdown-name">
                          {user?.name || user?.username || 'User'}
                        </span>
                        <span className="nav-dropdown-email">
                          {user?.email || ''}
                        </span>
                      </div>
                    </div>

                    <div className="nav-dropdown-divider" />

                    {/* Profile link */}
                    <Link
                      to="/profile"
                      className="nav-dropdown-item"
                      onClick={() => { setDropdownOpen(false); closeMenu(); }}
                      id="nav-dropdown-profile"
                    >
                      <FaUser size={13} />
                      <span>Profile</span>
                    </Link>

                    {/* Theme toggle */}
                    <button
                      className="nav-dropdown-item"
                      onClick={() => { toggleTheme(); }}
                      id="nav-dropdown-theme"
                    >
                      {theme === 'light' ? <FaMoon size={13} /> : <FaSun size={13} />}
                      <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
                    </button>

                    <div className="nav-dropdown-divider" />

                    {/* Logout */}
                    <button
                      className="nav-dropdown-item nav-dropdown-item--danger"
                      onClick={handleLogout}
                      id="nav-dropdown-logout"
                    >
                      <FaSignOutAlt size={13} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </li>
            </>
          ) : (
            <li className="nav-item">
              <Link to="/login" className="nav-links nav-links-btn" onClick={closeMenu}>
                Login
              </Link>
            </li>
          )}
        </ul>

        {/* Mobile overlay */}
        {menuOpen && (
          <div className="nav-overlay" onClick={closeMenu} aria-hidden="true" />
        )}
      </div>
    </nav>
  );
};

export default Navbar;
