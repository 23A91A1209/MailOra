/**
 * Auth Service — Client-side API calls for authentication flows.
 *
 * Centralizes all auth-related HTTP requests so page components
 * don't contain inline axios calls. Provides consistent error handling.
 *
 * @module services/authService
 */

import axiosClient from '../helpers/axiosClient';

/**
 * Send a signup OTP to the given email address.
 * @param {string} email - User's email
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export const sendSignupOtp = async (email) => {
  try {
    const response = await axiosClient.post('/api/auth/send-signup-otp', { email });
    return { success: true, message: response.data.message };
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to send OTP');
  }
};

/**
 * Register a new user account after OTP verification.
 * @param {{ name: string, email: string, password: string, otp: string }} data
 * @returns {Promise<{ success: boolean, user: object }>}
 */
export const signup = async (data) => {
  try {
    const response = await axiosClient.post('/api/auth/signup', data);
    return { success: true, user: response.data.user, message: response.data.message };
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Signup failed');
  }
};

/**
 * Log in with email and password.
 * @param {{ email: string, password: string }} credentials
 * @returns {Promise<{ success: boolean, user: object, token: string }>}
 */
export const login = async (credentials) => {
  try {
    const response = await axiosClient.post('/api/auth/login', credentials);
    return {
      success: true,
      user: response.data.user,
      token: response.data.token,
      message: response.data.message,
    };
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Login failed');
  }
};

/**
 * Log out — clears the server-side httpOnly JWT cookie.
 * @returns {Promise<{ success: boolean }>}
 */
export const logout = async () => {
  try {
    await axiosClient.post('/api/auth/logout');
    return { success: true };
  } catch (error) {
    // Even if server call fails, local state should still be cleared by the caller
    return { success: false, error: error.response?.data?.message || 'Logout failed' };
  }
};

/**
 * Request a password reset link to be sent to the given email.
 * @param {string} email
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export const forgotPassword = async (email) => {
  try {
    const response = await axiosClient.post('/api/auth/forgot-password', { email });
    return { success: true, message: response.data.message };
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to send reset link');
  }
};

/**
 * Reset password using OTP (user does NOT know old password).
 * @param {{ encryptedEmail: string, otp: string, newPassword: string }} data
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export const resetPassword = async (data) => {
  try {
    const response = await axiosClient.post('/api/auth/reset-password', data);
    return { success: true, message: response.data.message };
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Password reset failed');
  }
};

/**
 * Change password using OTP + old password (user KNOWS old password).
 * @param {{ encryptedEmail: string, otp: string, oldPassword: string, newPassword: string }} data
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export const changePassword = async (data) => {
  try {
    const response = await axiosClient.post('/api/auth/change-password', data);
    return { success: true, message: response.data.message };
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Password change failed');
  }
};
