import { useState, useEffect } from "react";
import { transactionAPI } from "../services/api";
import Layout from "../components/Layout";

const PendingTransactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal states
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [selectedTransactionId, setSelectedTransactionId] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    loadPendingTransactions();
  }, []);

  const loadPendingTransactions = async () => {
    try {
      setLoading(true);
      const res = await transactionAPI.getAll({
        status: "pending",
        per_page: 100,
      });
      setTransactions(res.data.data.data || []);
      setError(null);
    } catch (err) {
      setError("Gagal memuat transaksi pending");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Open confirm modal
  const handleConfirmClick = (id) => {
    setSelectedTransactionId(id);
    setShowConfirmModal(true);
  };

  // Open cancel modal
  const handleCancelClick = (id) => {
    setSelectedTransactionId(id);
    setShowCancelModal(true);
  };

  // Confirm payment
  const confirmPayment = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/transactions/${selectedTransactionId}/confirm`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!response.ok) throw new Error("Gagal konfirmasi pembayaran");

      setShowConfirmModal(false);
      setSuccessMessage("Pembayaran berhasil dikonfirmasi!");
      setShowSuccessModal(true);

      setTimeout(() => {
        setShowSuccessModal(false);
        loadPendingTransactions();
      }, 2000);
    } catch (err) {
      alert("❌ Gagal konfirmasi: " + err.message);
      setShowConfirmModal(false);
    }
  };

  // Cancel payment
  const cancelPayment = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/transactions/${selectedTransactionId}/cancel`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!response.ok) throw new Error("Gagal batalkan transaksi");

      setShowCancelModal(false);
      setSuccessMessage("Transaksi berhasil dibatalkan!");
      setShowSuccessModal(true);

      setTimeout(() => {
        setShowSuccessModal(false);
        loadPendingTransactions();
      }, 2000);
    } catch (err) {
      alert("❌ Gagal batalkan: " + err.message);
      setShowCancelModal(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-4 text-gray-600">Memuat data...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Verifikasi Pembayaran
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {transactions.length} transaksi menunggu verifikasi
          </p>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg">
            <p className="font-medium">⚠️ {error}</p>
          </div>
        )}

        {transactions.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <p className="text-gray-500 text-lg">Tidak ada transaksi pending</p>
            <p className="text-gray-400 text-sm mt-1">
              Semua pembayaran sudah diverifikasi
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kode
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Metode
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reference
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Waktu
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactions.map((tx) => (
                    <tr
                      key={tx.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {tx.transaction_code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {tx.customer_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                          {tx.payment_method?.name || tx.payment_method}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">
                        {tx.payment_reference}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        Rp {parseFloat(tx.total_amount).toLocaleString("id-ID")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(tx.transaction_date).toLocaleString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                        <button
                          onClick={() => handleConfirmClick(tx.id)}
                          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                        >
                          ✓ Konfirmasi
                        </button>
                        <button
                          onClick={() => handleCancelClick(tx.id)}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                        >
                          ✗ Batalkan
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Confirm Payment Modal */}
      {showConfirmModal && (
        <>
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 sm:p-8 transform transition-all">
              <div className="text-center mb-6 sm:mb-8">
                <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-green-100 rounded-full mb-3 sm:mb-4">
                  <svg
                    className="w-6 h-6 sm:w-8 sm:h-8 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                  Konfirmasi Pembayaran
                </h2>
                <p className="text-sm text-gray-600">
                  Apakah Anda yakin pembayaran untuk transaksi ini sudah
                  diterima?
                </p>
              </div>

              <div className="flex gap-2 sm:gap-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg sm:rounded-xl font-medium transition-all text-sm"
                >
                  Batal
                </button>
                <button
                  onClick={confirmPayment}
                  className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg sm:rounded-xl font-medium transition-all shadow-lg text-sm"
                >
                  Ya, Konfirmasi
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Cancel Payment Modal */}
      {showCancelModal && (
        <>
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 sm:p-8 transform transition-all">
              <div className="text-center mb-6 sm:mb-8">
                <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-red-100 rounded-full mb-3 sm:mb-4">
                  <svg
                    className="w-6 h-6 sm:w-8 sm:h-8 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                  Batalkan Transaksi
                </h2>
                <p className="text-sm text-gray-600">
                  Apakah Anda yakin ingin membatalkan transaksi ini? Tindakan
                  ini tidak dapat dibatalkan.
                </p>
              </div>

              <div className="flex gap-2 sm:gap-3">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg sm:rounded-xl font-medium transition-all text-sm"
                >
                  Tidak
                </button>
                <button
                  onClick={cancelPayment}
                  className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg sm:rounded-xl font-medium transition-all shadow-lg text-sm"
                >
                  Ya, Batalkan
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 flex items-center justify-center z-[60]">
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
              Berhasil!
            </p>
            <p className="text-center text-sm text-gray-600">
              {successMessage}
            </p>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default PendingTransactions;
