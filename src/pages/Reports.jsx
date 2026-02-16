import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { reportAPI } from "../services/api";
import Layout from "../components/Layout";

const Reports = () => {
  const { isAdmin, isOwner, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reportType, setReportType] = useState("daily");
  const [reportData, setReportData] = useState(null);
  const reportRef = useRef(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7),
  );

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    if (isAdmin || isOwner) {
      fetchReport();
    } else {
      setError("Anda tidak memiliki akses ke halaman laporan");
      setLoading(false);
    }
  }, [isAuthenticated, isAdmin, isOwner, reportType]);

  useEffect(() => {
    setCurrentPage(1);
  }, [reportType, reportData]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError(null);

      let params = { period: reportType };

      if (reportType === "daily" && selectedDate) {
        params.period = "custom";
        params.start_date = selectedDate;
        params.end_date = selectedDate;
      } else if (reportType === "monthly" && selectedMonth) {
        params.period = "custom";
        const [year, month] = selectedMonth.split("-");
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);
        params.start_date = startDate.toISOString().split("T")[0];
        params.end_date = endDate.toISOString().split("T")[0];
      }

      const response = await reportAPI.getSalesReport(params);
      setReportData(response.data.data);
    } catch (err) {
      setError(err.response?.data?.message || "Gagal memuat laporan");
    } finally {
      setLoading(false);
    }
  };

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchReport();
  };

  const handlePrint = () => {
    const printContent = reportRef.current;
    if (!printContent) return;

    const originalTitle = document.title;
    document.title = `Laporan-${reportType}-${new Date().toLocaleDateString("id-ID")}`;

    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${document.title}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 20px; color: #1f2937; }
          .report-header { text-align: center; border-bottom: 3px solid #2563eb; padding-bottom: 15px; margin-bottom: 25px; }
          .report-header h1 { font-size: 24px; color: #1f2937; margin-bottom: 8px; }
          .report-header p { color: #6b7280; font-size: 14px; }
          .summary-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 30px; }
          .summary-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; background: #f9fafb; }
          .summary-card h3 { font-size: 12px; color: #6b7280; margin-bottom: 8px; text-transform: uppercase; }
          .summary-card p { font-size: 20px; font-weight: bold; }
          .summary-card p.revenue { color: #10b981; }
          .summary-card p.transactions { color: #3b82f6; }
          .summary-card p.average { color: #8b5cf6; }
          .summary-card p.growth { color: #f59e0b; }
          .section { margin-bottom: 30px; page-break-inside: avoid; }
          .section h2 { font-size: 18px; color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 15px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background: #f3f4f6; padding: 10px; text-align: left; font-size: 11px; text-transform: uppercase; color: #6b7280; border-bottom: 2px solid #e5e7eb; }
          td { padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
          tr:hover { background: #f9fafb; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          @media print { body { padding: 0; } .no-print { display: none; } }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
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

  const handleExportPDF = () => {
    handlePrint();
  };

  const getReportTitle = () => {
    switch (reportType) {
      case "daily":
        return "Laporan Harian";
      case "weekly":
        return "Laporan Mingguan";
      case "monthly":
        return "Laporan Bulanan";
      default:
        return "Laporan";
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const paginatedDailySales = useMemo(() => {
    if (!reportData?.daily_sales) return [];
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return reportData.daily_sales.slice(startIndex, endIndex);
  }, [reportData, currentPage, itemsPerPage]);

  const totalPages = useMemo(() => {
    if (!reportData?.daily_sales) return 1;
    return Math.ceil(reportData.daily_sales.length / itemsPerPage);
  }, [reportData, itemsPerPage]);

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

  const renderFilter = () => {
    if (reportType === "daily") {
      return (
        <form
          onSubmit={handleFilterSubmit}
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3"
        >
          <div className="flex-1">
            <label className="block text-xs text-gray-600 mb-1">
              Pilih Tanggal
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
          <button
            type="submit"
            className="sm:mt-5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors active:scale-95"
          >
            Tampilkan
          </button>
        </form>
      );
    } else if (reportType === "monthly") {
      return (
        <form
          onSubmit={handleFilterSubmit}
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3"
        >
          <div className="flex-1">
            <label className="block text-xs text-gray-600 mb-1">
              Pilih Bulan
            </label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              max={new Date().toISOString().slice(0, 7)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
          <button
            type="submit"
            className="sm:mt-5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors active:scale-95"
          >
            Tampilkan
          </button>
        </form>
      );
    }
    return null;
  };

  const renderReportContent = () => {
    if (loading) {
      return (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 text-sm">Memuat laporan...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-12">
          <div className="text-red-500 text-4xl sm:text-5xl mb-4">⚠️</div>
          <p className="text-gray-600 text-sm sm:text-base">{error}</p>
          <button
            onClick={fetchReport}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm active:scale-95"
          >
            Coba Lagi
          </button>
        </div>
      );
    }

    if (!reportData) return null;

    return (
      <div ref={reportRef}>
        <div className="report-header text-center border-b-2 border-blue-600 pb-4 mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
            {getReportTitle()}
          </h1>
          <p className="text-xs sm:text-sm text-gray-600">
            Periode: {formatDate(reportData.period?.start_date)} -{" "}
            {formatDate(reportData.period?.end_date)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Dicetak pada: {new Date().toLocaleString("id-ID")}
          </p>
        </div>

        <div className="summary-grid grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className="summary-card bg-white rounded-lg shadow p-3 sm:p-4">
            <h3 className="text-xs text-gray-600 uppercase mb-2">
              Total Revenue
            </h3>
            <p className="revenue text-lg sm:text-2xl font-bold text-green-600">
              Rp {reportData.summary?.total_revenue?.toLocaleString() || 0}
            </p>
          </div>
          <div className="summary-card bg-white rounded-lg shadow p-3 sm:p-4">
            <h3 className="text-xs text-gray-600 uppercase mb-2">
              Total Transaksi
            </h3>
            <p className="transactions text-lg sm:text-2xl font-bold text-blue-600">
              {reportData.summary?.total_transactions || 0}
            </p>
          </div>
          <div className="summary-card bg-white rounded-lg shadow p-3 sm:p-4">
            <h3 className="text-xs text-gray-600 uppercase mb-2">
              Rata-rata Transaksi
            </h3>
            <p className="average text-lg sm:text-2xl font-bold text-purple-600">
              Rp{" "}
              {reportData.summary?.average_transaction_value?.toLocaleString() ||
                0}
            </p>
          </div>
          <div className="summary-card bg-white rounded-lg shadow p-3 sm:p-4">
            <h3 className="text-xs text-gray-600 uppercase mb-2">
              Pertumbuhan
            </h3>
            <p
              className={`growth text-lg sm:text-2xl font-bold ${(reportData.summary?.transaction_growth || 0) >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              {reportData.summary?.transaction_growth >= 0 ? "+" : ""}
              {reportData.summary?.transaction_growth || 0}%
            </p>
          </div>
        </div>

        {reportData.daily_sales && reportData.daily_sales.length > 0 && (
          <div className="section bg-white rounded-lg shadow p-3 sm:p-5 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
              <h2 className="text-base sm:text-lg font-bold text-gray-900">
                Penjualan Harian
              </h2>
              {reportData.daily_sales.length > itemsPerPage && (
                <p className="text-xs sm:text-sm text-gray-600">
                  Showing {(currentPage - 1) * itemsPerPage + 1}-
                  {Math.min(
                    currentPage * itemsPerPage,
                    reportData.daily_sales.length,
                  )}{" "}
                  of {reportData.daily_sales.length} days
                </p>
              )}
            </div>
            <div className="overflow-x-auto -mx-3 sm:mx-0">
              <div className="inline-block min-w-full align-middle">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Tanggal
                      </th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Jumlah Transaksi
                      </th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Revenue
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedDailySales.map((day, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900 whitespace-nowrap">
                          {formatDate(day.date)}
                        </td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600">
                          {day.transaction_count}
                        </td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900 font-bold text-right whitespace-nowrap">
                          Rp {parseFloat(day.revenue).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between border-t pt-4 gap-2">
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
            )}
          </div>
        )}

        {reportData.top_products && reportData.top_products.length > 0 && (
          <div className="section bg-white rounded-lg shadow p-3 sm:p-5 mb-6">
            <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-4">
              Produk Terlaris
            </h2>
            <div className="overflow-x-auto -mx-3 sm:mx-0">
              <div className="inline-block min-w-full align-middle">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Rank
                      </th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Produk
                      </th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">
                        SKU
                      </th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Terjual
                      </th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Revenue
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.top_products.map((product, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-bold text-gray-900">
                          #{index + 1}
                        </td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">
                          {product.name}
                        </td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600 hidden sm:table-cell">
                          {product.sku}
                        </td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900 text-right">
                          {product.total_sold}
                        </td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900 font-bold text-right whitespace-nowrap">
                          Rp{" "}
                          {parseFloat(product.total_revenue).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {reportData.payment_methods &&
          reportData.payment_methods.length > 0 && (
            <div className="section bg-white rounded-lg shadow p-3 sm:p-5 mb-6">
              <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-4">
                Metode Pembayaran
              </h2>
              <div className="overflow-x-auto -mx-3 sm:mx-0">
                <div className="inline-block min-w-full align-middle">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Metode
                        </th>
                        <th className="px-3 sm:px-4 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          Jumlah Transaksi
                        </th>
                        <th className="px-3 sm:px-4 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {reportData.payment_methods.map((method, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">
                            {method.payment_method || "Cash"}
                          </td>
                          <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600 text-right">
                            {method.count}
                          </td>
                          <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900 font-bold text-right whitespace-nowrap">
                            Rp {parseFloat(method.total).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
      </div>
    );
  };

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
                : "Hanya admin dan owner yang dapat mengakses halaman laporan"}
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

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="bg-white rounded-lg shadow p-4 sm:p-5 mb-4 sm:mb-6">
          <div className="flex flex-col gap-4 mb-4 sm:mb-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                Laporan Penjualan
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                Analisis kinerja penjualan berdasarkan periode
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
              <button
                onClick={handleExportPDF}
                className="flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors active:scale-95"
              >
                <svg
                  className="w-4 h-4 sm:w-5 sm:h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
                <span>Export PDF</span>
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors active:scale-95"
              >
                <svg
                  className="w-4 h-4 sm:w-5 sm:h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                  />
                </svg>
                <span>Print</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setReportType("daily")}
                className={`flex-1 sm:flex-none px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all active:scale-95 ${
                  reportType === "daily"
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                📅 Harian
              </button>
              <button
                onClick={() => setReportType("weekly")}
                className={`flex-1 sm:flex-none px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all active:scale-95 ${
                  reportType === "weekly"
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                📊 Mingguan
              </button>
              <button
                onClick={() => setReportType("monthly")}
                className={`flex-1 sm:flex-none px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all active:scale-95 ${
                  reportType === "monthly"
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                📈 Bulanan
              </button>
            </div>

            {renderFilter()}
          </div>
        </div>

        <div className="bg-gray-50">{renderReportContent()}</div>
      </div>
    </Layout>
  );
};

export default Reports;
