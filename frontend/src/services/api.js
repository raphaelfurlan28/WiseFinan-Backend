import axios from 'axios';

// Get Base URL from environment or default to relative (for dev proxy)
const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// Helper function for raw fetch calls
export const getApiUrl = (path) => {
    // In production, prepend BASE_URL; in dev, use relative path for proxy
    if (BASE_URL) {
        return `${BASE_URL}${path}`;
    }
    return path;
};

const api = axios.create({
    baseURL: BASE_URL || '/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request Interceptor (Optional: Add Auth Token if needed later)
api.interceptors.request.use((config) => {
    // const user = JSON.parse(localStorage.getItem('wisefinan_user'));
    // if (user?.token) {
    //     config.headers.Authorization = `Bearer ${user.token}`;
    // }
    return config;
}, (error) => Promise.reject(error));

// Response Interceptor (Optional: Handle Global Errors)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        console.error("API Error:", error.response?.status, error.message);
        return Promise.reject(error);
    }
);

export default api;
