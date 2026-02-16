import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { transactionAPI } from "../services/api";
import Layout from "../components/Layout";

const TransactionHistory = () => {
  const { isAdmin, isOwner, isAuthenticated } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;

  const [searchTerm, setSearchTerm] = useState("");
  const [searchDebounce, setSearchDebounce] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounce(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchDebounce, startDate, endDate, statusFilter]);

  useEffect(() => {
    if (isAuthenticated) {
      if (isAdmin || isOwner) {
        fetchTransactions(currentPage);
      } else {
        setError("Hanya admin dan owner yang dapat mengakses halaman ini");
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [
    isAuthenticated,
    isAdmin,
    isOwner,
    currentPage,
    searchDebounce,
    startDate,
    endDate,
    statusFilter,
  ]);

  const fetchTransactions = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page,
        per_page: itemsPerPage,
      };

      if (searchDebounce.trim()) params.search = searchDebounce.trim();
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (statusFilter) params.status = statusFilter;

      const response = await transactionAPI.getAll(params);

      if (response?.data?.data) {
        setTransactions(response.data.data.data || []);
        setTotalPages(response.data.data.last_page || 1);
        setTotalItems(response.data.data.total || 0);
      }
    } catch (err) {
      let errorMessage = "Gagal memuat data transaksi";
      if (err.response?.status === 401)
        errorMessage = "Sesi kedaluarsa. Silakan login kembali.";
      else if (err.response?.status === 403)
        errorMessage = "Akses ditolak. Hubungi admin.";
      else if (err.response?.data?.message)
        errorMessage = err.response.data.message;
      else if (err.message) errorMessage = err.message;
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleViewReceipt = (transaction) => {
    const receiptItems =
      transaction.details?.map((detail) => ({
        name: detail.product_name,
        price: detail.product_price,
        quantity: detail.quantity,
      })) || [];

    setReceiptData({
      transaction_code: transaction.transaction_code,
      kasir: transaction.user?.name || "N/A",
      customer_name: transaction.customer_name || "Guest",
      payment_method:
        transaction.payment_method?.name ||
        transaction.payment_method_name ||
        "Cash",
      payment_reference: transaction.payment_reference,
      status: transaction.status,
      items: receiptItems,
      total: parseFloat(transaction.total_amount),
      payment: parseFloat(transaction.payment_amount),
      change: parseFloat(transaction.change_amount),
    });
    setShowReceipt(true);
  };

  const handlePrintReceipt = () => {
    if (!receiptData) return;
    const printContent = document.getElementById("receipt-content");
    const originalTitle = document.title;
    document.title = `Receipt-${receiptData.transaction_code}`;
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${document.title}</title>
        <style>
          body { font-family: 'Courier New', monospace; margin: 20px; }
          .receipt { max-width: 400px; margin: 0 auto; }
          .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 15px; }
          .items { margin: 15px 0; }
          .item { display: flex; justify-content: space-between; margin-bottom: 5px; }
          .total { border-top: 2px solid #000; padding-top: 10px; margin-top: 10px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="receipt" id="printable">
          ${printContent.innerHTML}
        </div>
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() { window.close(); };
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
    document.title = originalTitle;
  };

  const handleClearFilters = useCallback(() => {
    setSearchTerm("");
    setStartDate("");
    setEndDate("");
    setStatusFilter("");
  }, []);

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: {
        bg: "bg-yellow-100",
        text: "text-yellow-800",
        label: "Pending",
      },
      completed: {
        bg: "bg-green-100",
        text: "text-green-800",
        label: "Completed",
      },
      cancelled: { bg: "bg-red-100", text: "text-red-800", label: "Cancelled" },
    };

    const config = statusConfig[status] || statusConfig.pending;

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}
      >
        {config.label}
      </span>
    );
  };

  const handlePageChange = useCallback(
    (page) => {
      if (page >= 1 && page <= totalPages) {
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    },
    [totalPages],
  );

  const pageNumbers = useMemo(() => {
    const pages = [];
    const maxVisible = 5;
    const halfVisible = Math.floor(maxVisible / 2);
    let startPage = Math.max(1, currentPage - halfVisible);
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }
    for (let i = startPage; i <= endPage; i++) pages.push(i);
    return pages;
  }, [currentPage, totalPages]);

  const showingText = useMemo(() => {
    const from = (currentPage - 1) * itemsPerPage + 1;
    const to = Math.min(currentPage * itemsPerPage, totalItems);
    return `Showing ${from}-${to} of ${totalItems} transactions`;
  }, [currentPage, itemsPerPage, totalItems]);

  if (!isAuthenticated || (!isAdmin && !isOwner)) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="max-w-md w-full mx-4 text-center p-6 bg-white rounded-lg shadow-lg">
            <div className="text-red-500 text-4xl mb-4">⚠️</div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
              Akses Ditolak
            </h2>
            <p className="text-sm sm:text-base text-gray-600 mb-4">
              {!isAuthenticated
                ? "Anda harus login terlebih dahulu"
                : "Hanya admin dan owner yang dapat mengakses halaman ini"}
            </p>
            <button
              onClick={() =>
                !isAuthenticated
                  ? (window.location.href = "/login")
                  : window.history.back()
              }
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors text-sm active:scale-95"
            >
              {!isAuthenticated ? "Login" : "Kembali"}
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  if (loading && currentPage === 1 && !transactions.length) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 text-sm">
              Loading transactions...
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="max-w-md w-full mx-4 text-center p-6 bg-white rounded-lg shadow-lg">
            <div className="text-red-500 text-4xl mb-4">⚠️</div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
              Error
            </h2>
            <p className="text-sm sm:text-base text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => fetchTransactions(currentPage)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors text-sm active:scale-95"
            >
              Coba Lagi
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Transaction History
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">{showingText}</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="space-y-3">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                Search
              </label>
              <input
                type="text"
                placeholder="Cari kode, customer, kasir, metode..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>

            {(searchTerm || statusFilter || startDate || endDate) && (
              <button
                onClick={handleClearFilters}
                className="w-full sm:w-auto px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors text-sm active:scale-95"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Transactions */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-4 text-gray-600 text-sm">Loading...</p>
          </div>
        ) : (
          <>
            {/* Mobile: Cards */}
            <div className="block lg:hidden space-y-3 mb-6">
              {transactions.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-8 text-center">
                  <p className="text-gray-500 text-sm">
                    {searchTerm || statusFilter || startDate || endDate
                      ? "Tidak ada transaksi yang sesuai dengan filter"
                      : "Tidak ada transaksi yang ditemukan"}
                  </p>
                </div>
              ) : (
                transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="bg-white rounded-lg shadow p-4 active:bg-gray-50"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 min-w-0 mr-3">
                        <p className="font-medium text-gray-900 text-sm truncate">
                          {tx.transaction_code}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {tx.transaction_date
                            ? new Date(tx.transaction_date).toLocaleString(
                                "id-ID",
                              )
                            : "N/A"}
                        </p>
                      </div>
                      <div>{getStatusBadge(tx.status)}</div>
                    </div>

                    <div className="space-y-1 mb-3">
                      <p className="text-xs text-gray-600">
                        <span className="font-medium">Kasir:</span>{" "}
                        {tx.user?.name || "N/A"}
                      </p>
                      <p className="text-xs text-gray-600">
                        <span className="font-medium">Customer:</span>{" "}
                        {tx.customer_name || "Guest"}
                      </p>
                      <p className="text-xs text-gray-600">
                        <span className="font-medium">Metode:</span>{" "}
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            tx.payment_method?.type === "cash"
                              ? "bg-green-100 text-green-800"
                              : tx.payment_method?.type === "digital"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-purple-100 text-purple-800"
                          }`}
                        >
                          {tx.payment_method?.name ||
                            tx.payment_method_name ||
                            "Cash"}
                        </span>
                      </p>
                    </div>

                    <div className="flex justify-between items-center pt-3 border-t">
                      <p className="text-sm font-bold text-gray-900">
                        Rp {parseFloat(tx.total_amount).toLocaleString()}
                      </p>
                      <button
                        onClick={() => handleViewReceipt(tx)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs transition-colors active:scale-95"
                      >
                        Lihat Struk
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop: Table */}
            <div className="hidden lg:block bg-white rounded-lg shadow overflow-hidden mb-6">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Kode
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Tanggal
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Kasir
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Customer
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Metode
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Total
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {transactions.length === 0 ? (
                      <tr>
                        <td
                          colSpan="8"
                          className="px-4 py-8 text-center text-gray-500"
                        >
                          {searchTerm || statusFilter || startDate || endDate
                            ? "Tidak ada transaksi yang sesuai dengan filter"
                            : "Tidak ada transaksi yang ditemukan"}
                        </td>
                      </tr>
                    ) : (
                      transactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            {tx.transaction_code}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {tx.transaction_date
                              ? new Date(tx.transaction_date).toLocaleString(
                                  "id-ID",
                                )
                              : "N/A"}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {tx.user?.name || "N/A"}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {tx.customer_name || "Guest"}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {getStatusBadge(tx.status)}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                tx.payment_method?.type === "cash"
                                  ? "bg-green-100 text-green-800"
                                  : tx.payment_method?.type === "digital"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-purple-100 text-purple-800"
                              }`}
                            >
                              {tx.payment_method?.name ||
                                tx.payment_method_name ||
                                "Cash"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 font-bold">
                            Rp {parseFloat(tx.total_amount).toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleViewReceipt(tx)}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors active:scale-95"
                            >
                              Lihat Struk
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-white rounded-lg shadow p-3 sm:p-4">
                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 sm:px-4 sm:py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs sm:text-sm active:scale-95"
                  >
                    Prev
                  </button>
                  <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto max-w-[60%] sm:max-w-none">
                    {currentPage > 3 && (
                      <>
                        <button
                          onClick={() => handlePageChange(1)}
                          className="px-2 sm:px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50 text-xs sm:text-sm"
                        >
                          1
                        </button>
                        {currentPage > 4 && (
                          <span className="px-1 text-gray-500 text-xs sm:text-sm">
                            ...
                          </span>
                        )}
                      </>
                    )}
                    {pageNumbers.map((page) => (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`px-2 sm:px-3 py-1 rounded transition-colors text-xs sm:text-sm ${
                          currentPage === page
                            ? "bg-blue-600 text-white"
                            : "bg-white border border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    {currentPage < totalPages - 2 && (
                      <>
                        {currentPage < totalPages - 3 && (
                          <span className="px-1 text-gray-500 text-xs sm:text-sm">
                            ...
                          </span>
                        )}
                        <button
                          onClick={() => handlePageChange(totalPages)}
                          className="px-2 sm:px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50 text-xs sm:text-sm"
                        >
                          {totalPages}
                        </button>
                      </>
                    )}
                  </div>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 sm:px-4 sm:py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs sm:text-sm active:scale-95"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Receipt Modal */}
      {showReceipt && receiptData && (
        <>
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" />
          <div className="fixed inset-0 flex items-start sm:items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md my-4 sm:my-8">
              <div id="receipt-content" className="p-4 sm:p-6">
                <div className="text-center mb-4">
                  <h2 className="text-lg sm:text-xl font-bold">
                    STRUK PEMBELIAN
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">
                    {new Date().toLocaleString("id-ID")}
                  </p>
                </div>

                <div className="space-y-2 mb-4 text-xs sm:text-sm">
                  <div className="flex justify-between">
                    <span>Kode Transaksi:</span>
                    <span className="font-medium">
                      {receiptData.transaction_code}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Kasir:</span>
                    <span className="font-medium">{receiptData.kasir}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Customer:</span>
                    <span className="font-medium">
                      {receiptData.customer_name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className="font-medium">
                      {getStatusBadge(receiptData.status)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Metode Bayar:</span>
                    <span className="font-medium">
                      {receiptData.payment_method}
                    </span>
                  </div>
                  {receiptData.payment_reference && (
                    <div className="flex justify-between">
                      <span>Ref:</span>
                      <span className="font-medium font-mono text-xs">
                        {receiptData.payment_reference}
                      </span>
                    </div>
                  )}
                </div>

                <div className="border-t border-b py-2 mb-4">
                  {receiptData.items.map((item, i) => (
                    <div
                      key={i}
                      className="flex justify-between text-xs sm:text-sm mb-1"
                    >
                      <span>
                        {item.quantity}x {item.name}
                      </span>
                      <span>
                        Rp {(item.price * item.quantity).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="space-y-2 mb-4 sm:mb-6">
                  <div className="flex justify-between text-base sm:text-lg font-bold">
                    <span>Total:</span>
                    <span>Rp {receiptData.total.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span>Bayar:</span>
                    <span>Rp {receiptData.payment.toLocaleString()}</span>
                  </div>
                  {receiptData.change > 0 && (
                    <div className="flex justify-between text-xs sm:text-sm font-bold text-green-600">
                      <span>Kembalian:</span>
                      <span>Rp {receiptData.change.toLocaleString()}</span>
                    </div>
                  )}
                </div>

                <div className="text-center text-xs sm:text-sm text-gray-600 mb-4">
                  <p>Terima kasih telah berbelanja!</p>
                  <p>Semoga harimu menyenangkan 😊</p>
                </div>
              </div>

              <div className="p-4 sm:p-6 border-t flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                <button
                  onClick={handlePrintReceipt}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg font-medium transition-colors text-sm active:scale-95"
                >
                  Print
                </button>
                <button
                  onClick={() => setShowReceipt(false)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors text-sm active:scale-95"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </Layout>
  );
};

export default TransactionHistory;
