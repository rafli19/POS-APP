import axios from "axios";

// Configuration
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1/api/v1";
const PUBLIC_URL = import.meta.env.VITE_PUBLIC_URL || "http://127.0.0.1";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  timeout: 30000,
});

// Interceptors
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

// Helper Functions
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

const getFormDataConfig = () => ({
  headers: { "Content-Type": "multipart/form-data" },
});

const buildParams = (params = {}) => {
  const cleanParams = {};
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "") {
      cleanParams[key] = value;
    }
  });
  return cleanParams;
};

// Auth API
export const authAPI = {
  register: (data) => api.post("/register", data),
  login: (data) => api.post("/login", data),
  logout: () => api.post("/logout"),
  me: () => api.get("/me"),
};

// Category API
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

// Product API
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

// Transaction API
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

// Report API
export const reportAPI = {
  getSalesReport: (params = {}) =>
    api.get("/reports/sales", { params: buildParams(params) }),
  getStockReport: () => api.get("/reports/stock"),
  getTransactionReport: (params = {}) =>
    api.get("/reports/transactions", { params: buildParams(params) }),
  getKasirReport: (params = {}) =>
    api.get("/reports/kasir", { params: buildParams(params) }),
};

// Dashboard API
export const dashboardAPI = {
  getSummary: (params = {}) =>
    api.get("/dashboard/summary", { params: buildParams(params) }),
  getChartData: (params = {}) =>
    api.get("/dashboard/chart-data", { params: buildParams(params) }),
  getNotifications: () => api.get("/dashboard/notifications"),
  getQuickStats: () => api.get("/dashboard/quick-stats"),
};

// Payment Methods API
export const paymentMethodAPI = {
  getAll: () => api.get("/payment-methods"),
};

// Utility Functions
export const getImageUrl = (path) => {
  if (!path) return "/images/no-image.png";
  if (path.startsWith("http")) return path;
  return `${PUBLIC_URL}/storage/${path}`;
};

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount || 0);
};

export const formatDate = (date) => {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
};

export const formatDateTime = (date) => {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
};

export default api;
