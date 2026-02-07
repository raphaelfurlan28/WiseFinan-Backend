import axios from 'axios';

// Get Base URL from environment or default to relative (for dev proxy)
const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
    baseURL: BASE_URL,
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
