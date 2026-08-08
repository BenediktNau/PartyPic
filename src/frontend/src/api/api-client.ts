// api-client.js
import axios from 'axios';

// Add a request interceptor
axios.interceptors.request.use(function (config) {

    const token = localStorage.getItem('authToken')

    // Do something before request is sent
    config.baseURL = import.meta.env.VITE_API_URL
    if (!(config.data instanceof FormData)) {
        config.headers['Content-Type'] = 'application/json';
    }

    if (!!token) {
        config.headers['Authorization'] = `Bearer ${token}`;
    }

    return config;
}, function (error) {
    // Do something with request error
    return Promise.reject(error);
});

// Add a response interceptor
axios.interceptors.response.use(function (response) {
    // Do something with response data
    return response;
}, function (error) {
    // Do something with response error
    return Promise.reject(error);
});

export default axios;
