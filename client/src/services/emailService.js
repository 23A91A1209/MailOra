/**
 * Email Service — Client-side API calls for classified emails.
 *
 * Centralizes all email-related HTTP requests. Supports pagination
 * and stage-based filtering.
 *
 * @module services/emailService
 */

import axiosClient from '../helpers/axiosClient';

/**
 * Fetch all classified emails for the current user (paginated).
 * @param {{ page?: number, limit?: number }} [params] - Pagination params
 * @returns {Promise<{ success: boolean, data: { emails: Array, pagination: object } }>}
 */
export const getAllEmails = async (params = {}) => {
  try {
    const response = await axiosClient.get('/api/emails', { params });
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: error.response?.data?.message || 'Failed to fetch emails' };
  }
};

/**
 * Fetch emails for a specific stage.
 * @param {"registration"|"registered"|"inprogress"|"confirmed"} stage
 * @param {{ page?: number, limit?: number }} [params] - Pagination params
 * @returns {Promise<{ success: boolean, data: { emails: Array, pagination: object } }>}
 */
export const getEmailsByStage = async (stage, params = {}) => {
  try {
    const response = await axiosClient.get(`/api/emails/${stage}`, { params });
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: error.response?.data?.message || `Failed to fetch ${stage} emails` };
  }
};

/**
 * Delete a classified email and its associated pending reminders.
 * @param {"registration"|"registered"|"inprogress"|"confirmed"} type - Email stage type
 * @param {string} id - Email document ID
 * @returns {Promise<{ success: boolean, message?: string }>}
 */
export const deleteEmail = async (type, id) => {
  try {
    const response = await axiosClient.delete(`/api/emails/${type}/${id}`);
    return { success: true, message: response.data.message };
  } catch (error) {
    return { success: false, error: error.response?.data?.message || 'Failed to delete email' };
  }
};
