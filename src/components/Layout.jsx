import { useState } from "react";
import { Menu } from "lucide-react";
import { useSidebar } from "../context/SidebarContext";
import Sidebar from "./Sidebar";

const Layout = ({ children }) => {
  const { sidebarWidth } = useSidebar();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Mobile Header - Fixed at top */}
      <header className="lg:hidden fixed top-0 left-0 right-0 bg-gradient-to-r from-blue-600 to-blue-700 z-40 px-4 py-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center space-x-2">
          <div className="bg-white p-1.5 rounded-lg shadow">
            <span className="text-blue-600 font-bold text-sm">POS</span>
          </div>
          <span className="text-white font-bold text-base">diJajanin</span>
        </div>
        <button
          onClick={toggleMobileMenu}
          className="text-white p-2 hover:bg-blue-800 rounded-lg transition-colors active:scale-95"
          aria-label="Toggle menu"
        >
          <Menu size={24} />
        </button>
      </header>

      {/* Sidebar */}
      <Sidebar
        onMobileClose={toggleMobileMenu}
        mobileMenuOpen={mobileMenuOpen}
      />

      {/* Main Content - Full height tanpa footer */}
      <main
        className="flex-1 bg-gray-50 pt-14 lg:pt-0 transition-all duration-300"
        style={{
          paddingLeft: window.innerWidth >= 1024 ? `${sidebarWidth}px` : "0",
        }}
      >
        {children}
      </main>
    </div>
  );
};

export default Layout;
