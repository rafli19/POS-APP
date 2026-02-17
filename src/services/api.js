import axios from "axios";

// ========================================
// 🌐 API CONFIGURATION
// ========================================
// Production API URL - deployed Laravel API
const API_BASE_URL = "https://pos-api.rafvoid.my.id/api/v1";
const PUBLIC_URL = "https://pos-api.rafvoid.my.id";

// For development, you can switch between production and local
// Uncomment lines below for local development:
// const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api/v1";
// const PUBLIC_URL = import.meta.env.VITE_PUBLIC_URL || "http://127.0.0.1:8000";

// ========================================
// 🔧 AXIOS INSTANCE
// ========================================
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  timeout: 30000, // 30 seconds timeout
});

// ========================================
// 🔐 REQUEST INTERCEPTOR (Add Token)
// ========================================
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ========================================
// 🚨 RESPONSE INTERCEPTOR (Handle Errors)
// ========================================
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized - Auto logout
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

// ========================================
// 🛠️ HELPER FUNCTIONS
// ========================================

/**
 * Prepare FormData for file uploads
 * @param {Object|FormData} data - Data to be converted
 * @returns {FormData}
 */
const prepareFormData = (data) => {
  if (data instanceof FormData) return data;

  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "") {
      formData.append(key, value);
    }
  });
  return formData;
};

/**
 * Get config for FormData requests
 * @returns {Object}
 */
const getFormDataConfig = () => ({
  headers: { "Content-Type": "multipart/form-data" },
});

/**
 * Build clean query parameters (remove null/undefined/empty values)
 * @param {Object} params - Query parameters
 * @returns {Object}
 */
const buildParams = (params = {}) => {
  const cleanParams = {};
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "") {
      cleanParams[key] = value;
    }
  });
  return cleanParams;
};

// ========================================
// 🔑 AUTH API
// ========================================
export const authAPI = {
  login: (data) => api.post("/login", data),
  logout: () => api.post("/logout"),
  me: () => api.get("/me"),
};

// ========================================
// 📦 CATEGORY API
// ========================================
export const categoryAPI = {
  getAll: (params = {}) =>
    api.get("/categories", { params: buildParams(params) }),
  getById: (id) => api.get(`/categories/${id}`),
  create: (data) => {
    const formData = prepareFormData(data);
    return api.post("/categories", formData, getFormDataConfig());
  },
  update: (id, data) => {
    const formData = prepareFormData(data);
    formData.append("_method", "PUT");
    return api.post(`/categories/${id}`, formData, getFormDataConfig());
  },
  delete: (id) => api.delete(`/categories/${id}`),
};

// ========================================
// 📦 PRODUCT API
// ========================================
export const productAPI = {
  getAll: (params = {}) =>
    api.get("/products", { params: buildParams(params) }),
  getById: (id) => api.get(`/products/${id}`),
  create: (data) => {
    const formData = prepareFormData(data);
    return api.post("/products", formData, getFormDataConfig());
  },
  update: (id, data) => {
    const formData = prepareFormData(data);
    formData.append("_method", "PUT");
    return api.post(`/products/${id}`, formData, getFormDataConfig());
  },
  delete: (id) => api.delete(`/products/${id}`),
  getLowStock: (params = {}) =>
    api.get("/products/low-stock", { params: buildParams(params) }),
  getStatistics: () => api.get("/products/statistics"),
};

// ========================================
// 💳 TRANSACTION API
// ========================================
export const transactionAPI = {
  getAll: (params = {}) =>
    api.get("/transactions", { params: buildParams(params) }),
  getById: (id) => api.get(`/transactions/${id}`),
  create: (data) => api.post("/transactions", data),
  update: (id, data) => api.put(`/transactions/${id}`, data),
  delete: (id) => api.delete(`/transactions/${id}`),
  confirmPayment: (id) => api.post(`/transactions/${id}/confirm`),
  cancelPayment: (id) => api.post(`/transactions/${id}/cancel`),
  getStatistics: (params = {}) =>
    api.get("/transactions/statistics", { params: buildParams(params) }),
  getDailyReport: (params = {}) =>
    api.get("/transactions/daily-report", { params: buildParams(params) }),
};

// ========================================
// 📊 REPORT API
// ========================================
export const reportAPI = {
  getSalesReport: (params = {}) =>
    api.get("/reports/sales", { params: buildParams(params) }),
  getStockReport: () => api.get("/reports/stock"),
  getTransactionReport: (params = {}) =>
    api.get("/reports/transactions", { params: buildParams(params) }),
  getKasirReport: (params = {}) =>
    api.get("/reports/kasir", { params: buildParams(params) }),
};

// ========================================
// 📈 DASHBOARD API
// ========================================
export const dashboardAPI = {
  getSummary: (params = {}) =>
    api.get("/dashboard/summary", { params: buildParams(params) }),
  getChartData: (params = {}) =>
    api.get("/dashboard/chart-data", { params: buildParams(params) }),
  getNotifications: () => api.get("/dashboard/notifications"),
  getQuickStats: () => api.get("/dashboard/quick-stats"),
};

// ========================================
// 💰 PAYMENT METHODS API
// ========================================
export const paymentMethodAPI = {
  getAll: () => api.get("/payment-methods"),
};

// ========================================
// 🔧 UTILITY FUNCTIONS
// ========================================

/**
 * Get full image URL from path
 * @param {string} path - Image path from database
 * @returns {string} Full image URL
 */
export const getImageUrl = (path) => {
  if (!path) return "/images/no-image.png";
  if (path.startsWith("http")) return path;
  return `${PUBLIC_URL}/storage/${path}`;
};

/**
 * Format number to Indonesian Rupiah currency
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency
 */
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount || 0);
};

/**
 * Format date to Indonesian format (DD Month YYYY)
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date
 */
export const formatDate = (date) => {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
};

/**
 * Format date and time to Indonesian format
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date and time
 */
export const formatDateTime = (date) => {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
};

// ========================================
// 📤 DEFAULT EXPORT
// ========================================
export default api;
