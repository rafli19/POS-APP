import { createContext, useState, useEffect, useContext, useMemo } from "react";
import { authAPI } from "../services/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");

    if (token && user) {
      setToken(token);
      setUser(JSON.parse(user));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await authAPI.login({ email, password });
      const { user: userData, token: authToken } = response.data.data;

      localStorage.setItem("token", authToken);
      localStorage.setItem("user", JSON.stringify(userData));

      setToken(authToken);
      setUser(userData);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Login gagal",
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await authAPI.register(userData);
      const { user: newUser, token: authToken } = response.data.data;

      localStorage.setItem("token", authToken);
      localStorage.setItem("user", JSON.stringify(newUser));

      setToken(authToken);
      setUser(newUser);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Registrasi gagal",
        errors: error.response?.data?.errors,
      };
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setToken(null);
      setUser(null);
    }
  };

  //useMemo untuk membuat nilai reaktif
  const isAdmin = useMemo(() => user?.role?.toLowerCase() === "admin", [user]);
  const isOwner = useMemo(() => user?.role?.toLowerCase() === "owner", [user]);
  const isKasir = useMemo(() => user?.role?.toLowerCase() === "kasir", [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!token,
        isAdmin,
        isOwner,
        isKasir,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
