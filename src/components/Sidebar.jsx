import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  BarChart3,
  History,
  LogOut,
  X,
  CheckCircle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useSidebar } from "../context/SidebarContext";
import { useState } from "react";

const Sidebar = ({ onMobileClose, mobileMenuOpen = false }) => {
  const { user, logout } = useAuth();
  const { isCollapsed, sidebarWidth } = useSidebar();
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleLogout = () => setShowLogoutModal(true);

  const handleConfirmLogout = () => {
    setShowLogoutModal(false);
    setShowSuccessModal(true);
    setTimeout(() => {
      logout();
      navigate("/login");
    }, 1500);
  };

  const handleNavClick = () => {
    if (onMobileClose) onMobileClose();
  };

  const navItems = [
    {
      path: "/dashboard",
      icon: LayoutDashboard,
      label: "Dashboard",
      roles: ["admin", "owner", "kasir"],
    },
    {
      path: "/products",
      icon: Package,
      label: "Products",
      roles: ["admin", "owner", "kasir"],
    },
    {
      path: "/categories",
      icon: FolderTree,
      label: "Categories",
      roles: ["admin"],
    },
    {
      path: "/reports",
      icon: BarChart3,
      label: "Reports",
      roles: ["admin", "owner"],
    },
    {
      path: "/transaction",
      icon: History,
      label: "Transaction",
      roles: ["kasir"],
    },
    {
      path: "/pending-transactions",
      icon: CheckCircle,
      label: "Verifikasi Pembayaran",
      roles: ["kasir"],
    },
    {
      path: "/transaction-history",
      icon: History,
      label: "Transaction History",
      roles: ["admin", "owner"],
    },
  ];

  const userRole = user?.role?.toLowerCase();
  const filteredNavItems = navItems.filter((item) =>
    item.roles.includes(userRole),
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className="hidden lg:block fixed top-0 left-0 h-full bg-gradient-to-b from-blue-600 to-blue-800 text-white shadow-2xl z-30 transition-all duration-300"
        style={{ width: `${sidebarWidth}px` }}
      >
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-blue-500/30">
            <div className="flex items-center">
              {!isCollapsed && (
                <div className="flex items-center space-x-2">
                  <div className="bg-white p-2 rounded-lg shadow-lg">
                    <span className="text-blue-600 font-bold text-sm">POS</span>
                  </div>
                  <div>
                    <h1 className="font-bold text-base">diJajanin</h1>
                  </div>
                </div>
              )}
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto py-4 px-3">
            <ul className="space-y-1">
              {filteredNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={`${item.path}-${item.label}`}>
                    <NavLink
                      to={item.path}
                      className={({ isActive }) =>
                        `flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                          isActive
                            ? "bg-white text-blue-600 shadow-md"
                            : "text-blue-100 hover:bg-blue-700/50 hover:text-white"
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <Icon
                            size={18}
                            className={`flex-shrink-0 ${
                              isActive ? "text-blue-600" : "text-blue-300"
                            }`}
                          />
                          {!isCollapsed && (
                            <span className="ml-2 font-medium text-sm">
                              {item.label}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="border-t border-blue-500/30 bg-blue-900/30">
            {!isCollapsed && (
              <div className="p-3 mx-2 my-2 bg-blue-700/30 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center font-bold text-xs text-white">
                    {user?.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate text-xs">
                      {user?.name}
                    </p>
                    <p className="text-xs text-blue-200 capitalize">
                      {user?.role}
                    </p>
                  </div>
                </div>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center px-3 py-3 bg-red-600 hover:bg-red-700 transition-all group"
              title="Logout"
            >
              <LogOut
                size={18}
                className="group-hover:scale-110 transition-transform"
              />
              {!isCollapsed && (
                <span className="ml-2 font-medium text-sm">Logout</span>
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <div
        className={`lg:hidden fixed inset-0 z-50 transition-opacity duration-300 ${
          mobileMenuOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onMobileClose}
        />

        {/* Sidebar Panel */}
        <aside
          className={`absolute top-0 left-0 h-full w-72 bg-gradient-to-b from-blue-600 to-blue-800 text-white shadow-2xl transform transition-transform duration-300 ${
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex flex-col h-full">
            {/* Mobile Header */}
            <div className="p-4 border-b border-blue-500/30 flex items-center justify-between bg-blue-700">
              <div className="flex items-center space-x-3">
                <div className="bg-white p-2 rounded-lg shadow">
                  <span className="text-blue-600 font-bold text-sm">POS</span>
                </div>
                <div>
                  <h1 className="font-bold text-base">diJajanin</h1>
                  <p className="text-xs text-blue-200">Point of Sale</p>
                </div>
              </div>
              <button
                onClick={onMobileClose}
                className="p-2 hover:bg-blue-600/50 rounded-lg transition-all active:scale-95"
                title="Close Menu"
              >
                <X size={22} />
              </button>
            </div>

            {/* Mobile Navigation */}
            <nav className="flex-1 overflow-y-auto py-4 px-3">
              <ul className="space-y-1">
                {filteredNavItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={`${item.path}-${item.label}`}>
                      <NavLink
                        to={item.path}
                        onClick={handleNavClick}
                        className={({ isActive }) =>
                          `flex items-center px-4 py-3 rounded-xl transition-all duration-200 ${
                            isActive
                              ? "bg-white text-blue-600 shadow-lg"
                              : "text-blue-100 hover:bg-blue-700/50 hover:text-white active:scale-95"
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <Icon
                              size={20}
                              className={
                                isActive ? "text-blue-600" : "text-blue-300"
                              }
                            />
                            <span className="ml-3 font-medium text-sm">
                              {item.label}
                            </span>
                          </>
                        )}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* Mobile User Info & Logout */}
            <div className="border-t border-blue-500/30 bg-blue-900/30 p-4">
              <div className="bg-blue-700/30 rounded-xl p-4 mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-11 h-11 bg-blue-500 rounded-full flex items-center justify-center font-bold text-white shadow-lg">
                    {user?.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate text-sm">
                      {user?.name}
                    </p>
                    <p className="text-xs text-blue-200 capitalize">
                      {user?.role}
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center px-4 py-3 bg-red-600 hover:bg-red-700 transition-all rounded-lg active:scale-95 shadow-lg"
              >
                <LogOut size={18} />
                <span className="ml-2 font-medium text-sm">Logout</span>
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <>
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60]" />
          <div className="fixed inset-0 flex items-center justify-center z-[70] p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 transform transition-all">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-100 rounded-full mb-3">
                  <span className="text-3xl">👋</span>
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  Konfirmasi Logout
                </h2>
                <p className="text-sm text-gray-600">
                  Apakah Anda yakin ingin keluar dari akun?
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowLogoutModal(false)}
                  className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg font-medium transition-all text-sm"
                >
                  Batal
                </button>
                <button
                  onClick={handleConfirmLogout}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all shadow-lg text-sm"
                >
                  Keluar
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 flex items-center justify-center z-[80] p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 transform transition-all">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-green-100 p-3 rounded-full">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>
            <p className="text-center text-lg font-bold text-gray-900 mb-1">
              Logout Berhasil
            </p>
            <p className="text-center text-sm text-gray-600">
              Sampai jumpa lagi!
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
