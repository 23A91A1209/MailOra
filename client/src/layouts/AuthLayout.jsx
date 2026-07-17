/**
 * AuthLayout.jsx — Minimal wrapper for auth pages.
 * The actual background and centering is handled by each auth page's
 * .auth-page-container class, so this layout is intentionally minimal.
 */
import { Outlet } from 'react-router-dom';

const AuthLayout = () => {
  return <Outlet />;
};

export default AuthLayout;
