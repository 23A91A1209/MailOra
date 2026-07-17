/**
 * Job Service — Client-side API calls for job search.
 *
 * Centralizes all job-related HTTP requests to the SerpAPI
 * microservice (proxied through the main backend).
 *
 * @module services/jobService
 */

import axiosClient from '../helpers/axiosClient';

/**
 * Search for jobs with optional filters.
 * @param {{ role?: string, jobType?: string, page?: number }} [params] - Search params
 * @returns {Promise<{ success: boolean, data: object }>}
 */
export const searchJobs = async (params = {}) => {
  try {
    const response = await axiosClient.get('/api/jobs/search', { params });
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: error.response?.data?.message || 'Failed to search jobs' };
  }
};

/**
 * Get available job roles.
 * @returns {Promise<{ success: boolean, data: string[] }>}
 */
export const getJobRoles = async () => {
  try {
    const response = await axiosClient.get('/api/jobs/roles');
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: error.response?.data?.message || 'Failed to fetch roles' };
  }
};

/**
 * Force refresh job listings from SerpAPI.
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export const refreshJobs = async () => {
  try {
    const response = await axiosClient.post('/api/jobs/refresh');
    return { success: true, message: response.data.message || 'Jobs refreshed' };
  } catch (error) {
    return { success: false, error: error.response?.data?.message || 'Failed to refresh jobs' };
  }
};
