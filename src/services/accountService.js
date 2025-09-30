import axios from "axios";

// const API_BASE_URL = 'https://localhost:7218/api';
const API_BASE_URL = 'https://api-craftique.innosphere.io.vn/api';

// Tạo axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Biến để track việc refresh token đang diễn ra
let isRefreshing = false;
let failedQueue = [];

// Hàm xử lý queue khi refresh token thành công/thất bại
const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

// Interceptor để thêm token vào headers
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor để xử lý refresh token tự động
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Kiểm tra nếu lỗi 401 và chưa retry
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Nếu đang refresh, đưa request vào queue
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem("refreshToken");
      
      if (refreshToken) {
        try {
          const response = await accountService.refreshToken();
          const { accessToken } = response;
          
          processQueue(null, accessToken);
          
          // Retry original request với token mới
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return apiClient(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError, null);
          accountService.logout();
          window.location.href = '/login';
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      } else {
        // Không có refresh token, logout
        accountService.logout();
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

const accountService = {
  // Đăng nhập
  login: async (email, password) => {
    try {
      const response = await apiClient.post("/Account/Login", {
        email,
        password,
      });

      const { accessToken, refreshToken, userID, userName, name, address } = response.data;

      const userData = {
        userID,
        userName,
        name,
        address: address || null,
      };

      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
      localStorage.setItem('userData', JSON.stringify(userData));

      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Đăng nhập thất bại" };
    }
  },

  // Refresh token
  refreshToken: async () => {
    try {
      const accessToken = localStorage.getItem("accessToken");
      const refreshToken = localStorage.getItem("refreshToken");

      if (!accessToken || !refreshToken) {
        throw new Error("Không tìm thấy token");
      }

      const response = await axios.post(`${API_BASE_URL}/Account/refresh-token`, {
        accessToken,
        refreshToken
      }, {
        headers: {
          "Content-Type": "application/json",
        }
      });

      const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;

      // Cập nhật token mới
      localStorage.setItem("accessToken", newAccessToken);
      localStorage.setItem("refreshToken", newRefreshToken);

      return response.data;
    } catch (error) {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("userData");
      throw error.response?.data || { message: "Refresh token thất bại" };
    }
  },

  logout: () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("userData");
  },

  isAuthenticated: () => {
    const token = localStorage.getItem("accessToken");
    const userData = localStorage.getItem("userData");
    return !!(token && userData);
  },

  getCurrentUser: () => {
    const userData = localStorage.getItem("userData");
    return userData ? JSON.parse(userData) : null;
  },
};

export default accountService;