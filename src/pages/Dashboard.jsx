import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DollarSign, ShoppingCart, FolderTree, Package } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { dashboardAPI } from "../services/api";
import Layout from "../components/Layout";

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timeInterval);
  }, []);

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(loadDashboard, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await dashboardAPI.getSummary();

      if (response.data?.data) {
        const result = response.data.data;
        const summaryData =
          result.summary_cards || result.summary || result || {};

        setData({
          summary: {
            today_revenue: parseFloat(summaryData.today_revenue) || 0,
            today_transactions: parseInt(summaryData.today_transactions) || 0,
            total_categories: parseInt(summaryData.total_categories) || 0,
            total_active_products:
              parseInt(summaryData.total_active_products) || 0,
          },
          transactions: Array.isArray(result.recent_transactions)
            ? result.recent_transactions
            : [],
          topProducts: Array.isArray(result.top_products)
            ? result.top_products
            : [],
        });
        setLastUpdated(new Date());
      } else {
        throw new Error("Invalid response structure");
      }
    } catch (err) {
      console.error("Dashboard Error:", err);
      setError(err.response?.data?.message || "Gagal memuat data dashboard");
      setData({
        summary: {
          today_revenue: 0,
          today_transactions: 0,
          total_categories: 0,
          total_active_products: 0,
        },
        transactions: [],
        topProducts: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = (cardType) => {
    const routes = {
      revenue: "/transaction-history",
      transactions: "/transaction-history",
      categories: "/categories",
      products: "/products",
    };

    if (cardType === "categories" && user?.role === "kasir") {
      alert("Anda tidak memiliki akses ke halaman kategori");
      return;
    }

    if (routes[cardType]) navigate(routes[cardType]);
  };

  const handleRefresh = () => {
    setLastUpdated(null);
    loadDashboard();
  };

  const formatDate = (date) => {
    if (!(date instanceof Date) || isNaN(date)) return "Invalid Date";
    return date.toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (date) => {
    if (!(date instanceof Date) || isNaN(date)) return "00:00:00";
    return date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  };

  if (loading && !data) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-4 text-gray-600 text-sm">Loading dashboard...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const summary = data?.summary || {
    today_revenue: 0,
    today_transactions: 0,
    total_categories: 0,
    total_active_products: 0,
  };

  const stats = [
    {
      title: "Today's Revenue",
      value: `Rp ${summary.today_revenue.toLocaleString("id-ID")}`,
      color: "from-green-400 to-green-600",
      icon: DollarSign,
      type: "revenue",
      visibleFor: ["admin", "owner", "kasir"],
    },
    {
      title: "Today's Transactions",
      value: summary.today_transactions,
      color: "from-blue-400 to-blue-600",
      icon: ShoppingCart,
      type: "transactions",
      visibleFor: ["admin", "owner", "kasir"],
    },
    {
      title: "Categories",
      value: summary.total_categories,
      color: "from-yellow-400 to-yellow-600",
      icon: FolderTree,
      type: "categories",
      visibleFor: ["admin", "owner"],
    },
    {
      title: "Active Products",
      value: summary.total_active_products,
      color: "from-purple-400 to-purple-600",
      icon: Package,
      type: "products",
      visibleFor: ["admin", "owner", "kasir"],
    },
  ].filter((stat) => stat.visibleFor.includes(user?.role));

  // Dynamic grid columns - 3 cards untuk kasir (centered), 4 cards untuk admin/owner
  const gridCols =
    stats.length === 3
      ? "grid-cols-1 sm:grid-cols-3"
      : "grid-cols-2 lg:grid-cols-4";

  return (
    <Layout>
      {/* Header Section */}
      <div className="bg-white shadow-sm border-b mb-6 rounded-lg overflow-hidden">
        <div className="px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                Welcome back, {user?.name}! 👋
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-gray-600 flex items-center">
                <svg
                  className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 text-blue-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="hidden sm:inline">
                  {formatDate(currentTime)} •{" "}
                </span>
                {formatTime(currentTime)}
              </p>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3">
              {lastUpdated && (
                <div className="text-xs text-gray-500 flex items-center bg-gray-100 px-2 py-1 rounded">
                  <svg
                    className="w-3 h-3 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  <span className="hidden sm:inline">Updated: </span>
                  {formatTime(lastUpdated).slice(0, 5)}
                </div>
              )}
              <button
                onClick={handleRefresh}
                className="flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-xs sm:text-sm shadow-md active:scale-95"
                title="Refresh data"
              >
                <svg
                  className={`w-3 h-3 sm:w-4 sm:h-4 mr-1 ${!lastUpdated ? "animate-spin" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8">
        {/* Stats Grid - Dynamic columns based on role */}
        <div className={`grid ${gridCols} gap-3 sm:gap-4 mb-6`}>
          {stats.map((stat, index) => (
            <StatCard
              key={index}
              stat={stat}
              onClick={() => handleCardClick(stat.type)}
            />
          ))}
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
          <div className="px-4 py-3 sm:px-6 border-b flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-gray-900">
              Recent Transactions
            </h2>
            <button
              onClick={() => navigate("/transaction-history")}
              className="text-blue-600 hover:text-blue-800 text-xs sm:text-sm font-medium flex items-center"
            >
              <span>View All</span>
              <svg
                className="w-3 h-3 sm:w-4 sm:h-4 ml-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
          <div className="p-3 sm:p-4">
            {data?.transactions?.length === 0 ? (
              <p className="text-center text-gray-500 py-8 text-sm">
                Belum ada transaksi hari ini
              </p>
            ) : (
              <>
                <div className="block lg:hidden space-y-3">
                  {data.transactions.map((tx) => (
                    <TransactionCard key={tx.id} transaction={tx} />
                  ))}
                </div>
                <div className="hidden lg:block overflow-x-auto">
                  <TransactionTable transactions={data.transactions} />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Top Products */}
        {user?.role === "admin" && data?.topProducts?.length > 0 && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-4 py-3 sm:px-6 border-b">
              <h2 className="text-base sm:text-lg font-bold text-gray-900">
                Top Selling Products Today
              </h2>
            </div>
            <div className="p-3 sm:p-4">
              <div className="space-y-3">
                {data.topProducts.map((product) => (
                  <TopProductCard key={product.id} product={product} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

const StatCard = ({ stat, onClick }) => {
  const Icon = stat.icon;
  return (
    <div
      onClick={onClick}
      className={`bg-gradient-to-br ${stat.color} rounded-lg shadow p-3 sm:p-5 text-white cursor-pointer transform transition-all duration-200 hover:scale-105 hover:shadow-xl active:scale-95 border border-white/20`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs opacity-90 mb-1 truncate">{stat.title}</p>
          <p className="text-base sm:text-xl lg:text-2xl font-bold truncate">
            {stat.value}
          </p>
        </div>
        <div className="bg-white/20 p-1.5 sm:p-2 rounded-lg ml-2 flex-shrink-0">
          <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
        </div>
      </div>
    </div>
  );
};

const TransactionCard = ({ transaction }) => {
  const kasirName =
    transaction.user?.name ||
    transaction.kasir?.name ||
    transaction.kasir ||
    "N/A";
  const transactionTime = transaction.transaction_date
    ? new Date(transaction.transaction_date).toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : "N/A";

  return (
    <div className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors active:bg-gray-100">
      <div className="flex justify-between items-start mb-1">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-gray-900 text-sm truncate">
            {transaction.transaction_code}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {transaction.customer_name || "Guest"} • {kasirName}
          </p>
        </div>
        <p className="font-bold text-gray-900 text-sm whitespace-nowrap ml-2">
          Rp {parseFloat(transaction.total_amount || 0).toLocaleString("id-ID")}
        </p>
      </div>
      <p className="text-xs text-gray-500 flex items-center">
        <svg
          className="w-3 h-3 mr-1 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        {transactionTime}
      </p>
    </div>
  );
};

const TransactionTable = ({ transactions }) => {
  return (
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
            Kode
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
            Customer
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
            Kasir
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
            Total
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
            Waktu
          </th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {transactions.map((tx) => {
          const kasirName =
            tx.user?.name || tx.kasir?.name || tx.kasir || "N/A";
          const transactionTime = tx.transaction_date
            ? new Date(tx.transaction_date).toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              })
            : "N/A";

          return (
            <tr key={tx.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                {tx.transaction_code}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                {tx.customer_name || "Guest"}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-700">
                {kasirName}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-900">
                Rp {parseFloat(tx.total_amount || 0).toLocaleString("id-ID")}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 flex items-center">
                <svg
                  className="w-3 h-3 mr-1 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {transactionTime}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

const TopProductCard = ({ product }) => (
  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors active:bg-gray-200">
    <div className="flex-1 min-w-0 mr-3">
      <p className="font-semibold text-gray-900 text-sm truncate">
        {product.name}
      </p>
      <p className="text-xs text-gray-600 mt-0.5 truncate">
        SKU: {product.sku} • Terjual: {product.total_sold}
      </p>
    </div>
    <p className="font-bold text-green-600 text-sm whitespace-nowrap">
      Rp {parseFloat(product.total_revenue || 0).toLocaleString("id-ID")}
    </p>
  </div>
);

export default Dashboard;
