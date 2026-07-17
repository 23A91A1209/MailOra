/**
 * Profile Service — Client-side API calls for user profile management.
 *
 * Handles profile CRUD, file uploads (photo/resume), mobile verification,
 * and password changes. All functions return a consistent response shape:
 *   { success: boolean, data?: any, error?: string }
 *
 * @module services/profileService
 */

import axiosClient from '../helpers/axiosClient';

/**
 * Fetch the current user's full profile from the backend.
 * @returns {Promise<{ success: boolean, data?: object, error?: string }>}
 */
const getProfile = async () => {
  try {
    const response = await axiosClient.get('/api/user/me');
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || 'Failed to fetch profile',
    };
  }
};

/**
 * Update basic info fields (name, email, role, etc.).
 * @param {object} basicInfo - Fields to update
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
const updateBasicInfo = async (basicInfo) => {
  try {
    await axiosClient.put('/api/user/basic', basicInfo);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || 'Failed to update basic info',
    };
  }
};

/**
 * Update all profile data sections at once.
 * @param {object} profileData - Full profile data object
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
const updateProfileData = async (profileData) => {
  try {
    await axiosClient.put('/api/user/profile', profileData);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || 'Failed to update profile data',
    };
  }
};

/**
 * Update a single profile section (e.g., "skills", "education").
 * @param {string} section - Section name
 * @param {*} data - Section data
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
const updateSection = async (section, data) => {
  try {
    await axiosClient.put(`/api/user/section/${section}`, { data });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || `Failed to update ${section}`,
    };
  }
};

/**
 * Change the user's password (requires current password).
 * @param {object} passwords - { current, new, confirm }
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
const changePassword = async (passwords) => {
  try {
    await axiosClient.put('/api/user/change-password', passwords);
    return { success: true };
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Password change failed');
  }
};

/**
 * Request a password reset link via email.
 * @param {string} email - User's email address
 * @returns {Promise<{ success: boolean, message: string }>}
 */
const sendPasswordResetLink = async (email) => {
  try {
    const response = await axiosClient.post('/api/auth/forgot-password', { email });
    return { success: true, message: response.data.message };
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to send reset link');
  }
};

/**
 * Upload a profile photo to S3.
 * @param {File} file - Image file
 * @returns {Promise<{ success: boolean, photoUrl?: string, error?: string }>}
 */
const uploadPhoto = async (file) => {
  try {
    const formData = new FormData();
    formData.append('photo', file);

    const response = await axiosClient.post('/api/user/upload-photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return { success: true, photoUrl: response.data.photoUrl };
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Photo upload failed');
  }
};

/**
 * Upload a resume (PDF/DOCX) to S3 with AI-powered data extraction.
 * @param {File} file - Resume file
 * @returns {Promise<{ success: boolean, data?: object, error?: string }>}
 */
const uploadResume = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axiosClient.post('/api/user/upload-resume', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    // Backend responds with { status, message, data: { resumeUrl, profileData, basicInfo } }.
    // Unwrap the envelope so callers get the payload directly.
    return { success: true, data: response.data?.data || {} };
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Resume upload failed');
  }
};

/**
 * Send a mobile verification OTP via WhatsApp.
 * @param {string} countryCode - e.g., "+91"
 * @param {string} mobileNumber - Phone number digits
 * @returns {Promise<{ success: boolean, message?: string }>}
 */
const sendMobileOtp = async (countryCode, mobileNumber) => {
  try {
    const response = await axiosClient.post('/api/user/send-mobile-otp', { countryCode, mobileNumber });
    return { success: true, message: response.data.message };
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to send OTP');
  }
};

/**
 * Verify a mobile OTP to confirm WhatsApp number.
 * @param {string} otp - 6-digit OTP
 * @returns {Promise<{ success: boolean, data?: object }>}
 */
const verifyMobileOtp = async (otp) => {
  try {
    const response = await axiosClient.post('/api/user/verify-mobile-otp', { otp });
    return { success: true, data: response.data };
  } catch (error) {
    throw new Error(error.response?.data?.message || 'OTP verification failed');
  }
};

export const profileService = {
  getProfile,
  updateBasicInfo,
  updateProfileData,
  updateSection,
  changePassword,
  sendPasswordResetLink,
  uploadPhoto,
  uploadResume,
  sendMobileOtp,
  verifyMobileOtp,
};
