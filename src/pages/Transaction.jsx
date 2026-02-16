import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { productAPI, transactionAPI } from "../services/api";
import Layout from "../components/Layout";

const Transaction = () => {
  const { isKasir, isAuthenticated } = useAuth();
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [customerName, setCustomerName] = useState("Guest");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  useEffect(() => {
    if (isAuthenticated && isKasir) {
      loadProducts();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, isKasir]);

  const loadPaymentMethods = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Sesi tidak valid. Silakan login kembali.");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/payment-methods`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setError("Sesi kedaluarsa. Silakan login kembali.");
        return;
      }

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const { success, data } = await response.json();
      if (success && Array.isArray(data)) {
        setPaymentMethods(data);
        const cash = data.find((pm) => pm.code === "cash");
        if (cash) setPaymentMethod("cash");
      } else {
        throw new Error("Invalid API response structure");
      }
    } catch (err) {
      console.error("Payment methods error:", err);
      setError("Gagal memuat metode pembayaran. Coba refresh halaman.");
    }
  };

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await productAPI.getAll({ per_page: 100 });
      if (res?.data?.data?.data) {
        setProducts(res.data.data.data);
      } else {
        throw new Error("Invalid response structure");
      }
    } catch (err) {
      const status = err.response?.status;
      let message = "Gagal memuat produk";
      if (status === 401) message = "Sesi kedaluarsa. Silakan login kembali.";
      else if (status === 403) message = "Akses ditolak. Hubungi admin.";
      else if (err.response?.data?.message) message = err.response.data.message;
      setError(message);
      console.error("Products error:", err);
    } finally {
      setLoading(false);
    }
  };

  const showError = (message) => {
    setError(message);
    setTimeout(() => setError(null), 3000);
  };

  const addToCart = (product) => {
    if (product.stock <= 0) return showError("Stok produk habis!");

    const existing = cart.find((item) => item.id === product.id);
    if (existing) {
      if (existing.quantity >= product.stock) {
        return showError(`Stok tidak mencukupi! Tersisa: ${product.stock}`);
      }
      setCart(
        cart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        ),
      );
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const removeFromCart = (id) => setCart(cart.filter((item) => item.id !== id));

  const updateQuantity = (id, qty) => {
    const product = products.find((p) => p.id === id);
    if (!product || qty <= 0) return removeFromCart(id);
    if (qty > product.stock)
      return showError(`Stok tidak mencukupi! Tersisa: ${product.stock}`);
    setCart(
      cart.map((item) => (item.id === id ? { ...item, quantity: qty } : item)),
    );
  };

  const getTotal = () =>
    cart.reduce(
      (sum, item) =>
        sum + (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 0),
      0,
    );

  const getChange = () => {
    const method = paymentMethods.find((pm) => pm.code === paymentMethod);
    if (method?.type !== "cash") return 0;
    return (parseFloat(paymentAmount) || 0) - getTotal();
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (cart.length === 0) return showError("Keranjang masih kosong!");

    const total = getTotal();
    const payment = parseFloat(paymentAmount) || 0;
    const method = paymentMethods.find((pm) => pm.code === paymentMethod);

    if (method?.type === "cash" && (!paymentAmount || payment <= 0)) {
      return showError("Masukkan jumlah bayar!");
    }
    if (method?.type === "cash" && payment < total) {
      return showError(
        `Pembayaran kurang! Total: Rp ${total.toLocaleString()}`,
      );
    }

    try {
      const payload = {
        customer_name: customerName,
        payment_method_code: paymentMethod,
        payment_amount:
          method?.type === "cash" ? parseFloat(payment.toFixed(2)) : total,
        items: cart.map((item) => ({
          product_id: item.id,
          quantity: parseInt(item.quantity),
        })),
      };

      const res = await transactionAPI.create(payload);
      const tx = res.data.data;

      setReceiptData({
        transaction_code: tx.transaction_code,
        kasir: tx.user?.name || "N/A",
        customer_name: tx.customer_name || "Guest",
        payment_method: tx.payment_method?.name || tx.payment_method || "Cash",
        payment_reference: tx.payment_reference,
        items: tx.details.map((detail) => ({
          name: detail.product_name,
          price: detail.product_price,
          quantity: detail.quantity,
        })),
        total: parseFloat(tx.total_amount),
        payment: parseFloat(tx.payment_amount),
        change: parseFloat(tx.change_amount),
        qr_code: tx.qr_code || null,
      });

      setShowReceipt(true);
      resetForm();
    } catch (err) {
      let msg = "Gagal membuat transaksi";
      if (err.response?.data?.errors) {
        const errors = err.response.data.errors;
        msg = Object.values(errors)[0]?.[0] || msg;
      } else if (err.response?.data?.message) {
        msg = err.response.data.message;
      }
      showError(msg);
      console.error("Transaction error:", err);
    }
  };

  const resetForm = () => {
    setCart([]);
    setCustomerName("Guest");
    setPaymentAmount("");
    setPaymentMethod("cash");
    setSearchTerm("");
  };

  const filteredProducts = products.filter((p) => {
    const term = searchTerm.toLowerCase();
    return (
      p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term)
    );
  });

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center p-4">
            <div className="text-red-500 text-4xl mb-4">⚠️</div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
              Akses Ditolak
            </h2>
            <p className="text-sm sm:text-base text-gray-600 mb-6">
              Anda harus login terlebih dahulu
            </p>
            <button
              onClick={() => (window.location.href = "/login")}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors text-sm active:scale-95"
            >
              Login
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  if (!isKasir) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="max-w-md w-full mx-4 text-center p-6 bg-white rounded-lg shadow-lg">
            <div className="text-red-500 text-4xl mb-4">⚠️</div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
              Akses Ditolak
            </h2>
            <p className="text-sm sm:text-base text-gray-600 mb-4">
              Hanya kasir yang dapat mengakses halaman transaksi
            </p>
            <button
              onClick={() => window.history.back()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors text-sm active:scale-95"
            >
              Kembali
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-4 text-gray-600 text-sm">Loading products...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {error && (
          <div className="mb-4 bg-red-50 text-red-800 p-3 rounded-lg text-sm shadow-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <ProductList
            products={filteredProducts}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onAddToCart={addToCart}
          />

          <div className="space-y-4 sm:space-y-6 order-1 lg:order-2">
            <Cart
              items={cart}
              total={getTotal()}
              onUpdateQuantity={updateQuantity}
              onRemoveItem={removeFromCart}
            />

            <CheckoutForm
              customerName={customerName}
              paymentAmount={paymentAmount}
              paymentMethod={paymentMethod}
              paymentMethods={paymentMethods}
              total={getTotal()}
              change={getChange()}
              cartEmpty={cart.length === 0}
              onCustomerNameChange={setCustomerName}
              onPaymentChange={setPaymentAmount}
              onPaymentMethodChange={setPaymentMethod}
              onSubmit={handleCheckout}
            />
          </div>
        </div>

        {showReceipt && receiptData && (
          <ReceiptModal
            receiptData={receiptData}
            onClose={() => setShowReceipt(false)}
          />
        )}
      </div>
    </Layout>
  );
};

// Components remain the same...
const ProductList = ({ products, searchTerm, onSearchChange, onAddToCart }) => (
  <div className="lg:col-span-2 order-2 lg:order-1">
    <div className="bg-white rounded-lg shadow p-3 sm:p-4 mb-4">
      <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-3">
        Daftar Produk
      </h2>
      <input
        type="text"
        placeholder="Cari produk..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
      />
    </div>

    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="block lg:hidden">
        <MobileProductList products={products} onAddToCart={onAddToCart} />
      </div>
      <div className="hidden lg:block overflow-x-auto">
        <DesktopProductTable products={products} onAddToCart={onAddToCart} />
      </div>
    </div>
  </div>
);

const MobileProductList = ({ products, onAddToCart }) => (
  <div className="divide-y divide-gray-200">
    {products.length === 0 ? (
      <div className="p-8 text-center text-gray-500 text-sm">
        Produk tidak ditemukan
      </div>
    ) : (
      products.map((product) => (
        <div key={product.id} className="p-3 sm:p-4 active:bg-gray-50">
          <div className="flex justify-between items-start mb-2">
            <div className="flex-1 min-w-0 mr-3">
              <h3 className="font-medium text-gray-900 text-sm truncate">
                {product.name}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">SKU: {product.sku}</p>
            </div>
            <button
              onClick={() => onAddToCart(product)}
              disabled={product.stock <= 0}
              className={`px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap active:scale-95 ${
                product.stock <= 0
                  ? "bg-gray-300 cursor-not-allowed text-gray-600"
                  : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
              }`}
            >
              {product.stock <= 0 ? "Habis" : "Tambah"}
            </button>
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="text-sm font-semibold text-gray-900">
              Rp {parseFloat(product.price || 0).toLocaleString()}
            </span>
            <span className="text-xs text-gray-600">
              Stok: {product.stock}
              {product.stock <= 5 && product.stock > 0 && (
                <span className="ml-1 text-red-600">(Rendah)</span>
              )}
              {product.stock <= 0 && (
                <span className="ml-1 text-red-600 font-medium">(Habis)</span>
              )}
            </span>
          </div>
        </div>
      ))
    )}
  </div>
);

const DesktopProductTable = ({ products, onAddToCart }) => (
  <table className="min-w-full divide-y divide-gray-200">
    <thead className="bg-gray-50">
      <tr>
        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
          SKU
        </th>
        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
          Nama Produk
        </th>
        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
          Harga
        </th>
        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
          Stok
        </th>
        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
          Aksi
        </th>
      </tr>
    </thead>
    <tbody className="bg-white divide-y divide-gray-200">
      {products.length === 0 ? (
        <tr>
          <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
            Produk tidak ditemukan
          </td>
        </tr>
      ) : (
        products.map((product) => (
          <tr key={product.id} className="hover:bg-gray-50">
            <td className="px-4 py-3 text-sm text-gray-600">{product.sku}</td>
            <td className="px-4 py-3 text-sm font-medium text-gray-900">
              {product.name}
            </td>
            <td className="px-4 py-3 text-sm text-gray-900">
              Rp {parseFloat(product.price || 0).toLocaleString()}
            </td>
            <td className="px-4 py-3 text-sm text-gray-600">
              {product.stock}
              {product.stock <= 5 && product.stock > 0 && (
                <span className="ml-1 text-xs text-red-600">(Stok Rendah)</span>
              )}
            </td>
            <td className="px-4 py-3">
              <button
                onClick={() => onAddToCart(product)}
                disabled={product.stock <= 0}
                className={`px-3 py-1 rounded text-sm ${product.stock <= 0 ? "bg-gray-300 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 text-white"}`}
              >
                Tambah
              </button>
            </td>
          </tr>
        ))
      )}
    </tbody>
  </table>
);

const Cart = ({ items, total, onUpdateQuantity, onRemoveItem }) => (
  <div className="bg-white rounded-lg shadow p-3 sm:p-4">
    <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">
      Keranjang Belanja
    </h2>

    {items.length === 0 ? (
      <p className="text-center text-gray-500 py-6 sm:py-8 text-sm">
        Keranjang masih kosong
      </p>
    ) : (
      <div className="space-y-2 sm:space-y-3 max-h-48 sm:max-h-64 overflow-y-auto pr-2">
        {items.map((item) => (
          <CartItem
            key={item.id}
            item={item}
            onUpdateQuantity={onUpdateQuantity}
            onRemove={onRemoveItem}
          />
        ))}
      </div>
    )}

    <div className="border-t pt-3 sm:pt-4 mt-3 sm:mt-4">
      <div className="flex justify-between text-base sm:text-lg font-bold">
        <span>Total:</span>
        <span>Rp {total.toLocaleString()}</span>
      </div>
    </div>
  </div>
);

const CartItem = ({ item, onUpdateQuantity, onRemove }) => (
  <div className="flex items-center justify-between border-b pb-2">
    <div className="flex-1 min-w-0 mr-2">
      <p className="font-medium text-sm truncate">{item.name}</p>
      <p className="text-xs text-gray-600">
        {item.quantity} x Rp {parseFloat(item.price || 0).toLocaleString()}
      </p>
    </div>
    <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
      <button
        onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
        className="w-7 h-7 bg-gray-200 rounded flex items-center justify-center text-sm hover:bg-gray-300 active:scale-95"
      >
        -
      </button>
      <span className="w-7 text-center text-sm font-medium">
        {item.quantity}
      </span>
      <button
        onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
        disabled={item.quantity >= item.stock}
        className={`w-7 h-7 rounded flex items-center justify-center text-sm active:scale-95 ${
          item.quantity >= item.stock
            ? "bg-gray-200 cursor-not-allowed"
            : "bg-blue-600 text-white hover:bg-blue-700"
        }`}
      >
        +
      </button>
      <button
        onClick={() => onRemove(item.id)}
        className="text-red-600 hover:text-red-700 ml-1 active:scale-95"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  </div>
);

const CheckoutForm = ({
  customerName,
  paymentAmount,
  paymentMethod,
  paymentMethods,
  total,
  change,
  cartEmpty,
  onCustomerNameChange,
  onPaymentChange,
  onPaymentMethodChange,
  onSubmit,
}) => {
  const selectedMethod = paymentMethods.find((pm) => pm.code === paymentMethod);
  const isCash = selectedMethod?.type === "cash";

  return (
    <div className="bg-white rounded-lg shadow p-3 sm:p-4">
      <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">
        Checkout
      </h2>

      <form onSubmit={onSubmit} className="space-y-3 sm:space-y-4">
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
            Nama Customer
          </label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => onCustomerNameChange(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            placeholder="Guest"
          />
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
            Metode Pembayaran
          </label>
          <select
            value={paymentMethod}
            onChange={(e) => onPaymentMethodChange(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            {paymentMethods.map((method) => (
              <option key={method.code} value={method.code}>
                {method.name}
              </option>
            ))}
          </select>
        </div>

        {isCash && (
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              Jumlah Bayar
            </label>
            <input
              type="number"
              value={paymentAmount}
              onChange={(e) => onPaymentChange(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="0"
            />
          </div>
        )}

        {(paymentAmount || !isCash) && (
          <div className="space-y-2 bg-gray-50 p-3 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total Belanja:</span>
              <span className="font-medium">Rp {total.toLocaleString()}</span>
            </div>
            {isCash && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Bayar:</span>
                  <span className="font-medium">
                    Rp {parseFloat(paymentAmount).toLocaleString()}
                  </span>
                </div>
                {change > 0 && (
                  <div className="flex justify-between text-sm font-bold text-green-600">
                    <span>Kembalian:</span>
                    <span>Rp {change.toLocaleString()}</span>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={cartEmpty}
          className={`w-full py-2.5 sm:py-3 px-4 rounded-lg font-medium text-white transition-colors text-sm active:scale-95 ${
            cartEmpty
              ? "bg-gray-300 cursor-not-allowed"
              : "bg-green-600 hover:bg-green-700 shadow-md"
          }`}
        >
          Proses Transaksi
        </button>
      </form>
    </div>
  );
};

const ReceiptModal = ({ receiptData, onClose }) => {
  const handlePrint = () => {
    window.print();
    onClose();
  };

  const isQRIS = receiptData.payment_method.toLowerCase().includes("qris");
  const hasQRCode =
    receiptData.qr_code !== null && receiptData.qr_code !== undefined;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      <div className="fixed inset-0 flex items-start sm:items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-md my-4 sm:my-8 max-h-[90vh] overflow-y-auto">
          <div className="p-4 sm:p-6">
            <div className="text-center mb-4">
              <h2 className="text-lg sm:text-xl font-bold">STRUK PEMBELIAN</h2>
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
                <span className="font-medium">{receiptData.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span>Metode Bayar:</span>
                <span className="font-medium">
                  {receiptData.payment_method}
                </span>
              </div>
            </div>

            {isQRIS && hasQRCode && (
              <div className="border-2 border-blue-500 rounded-lg p-3 sm:p-4 bg-gradient-to-br from-blue-50 to-white mb-4">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <svg
                      className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                      />
                    </svg>
                    <span className="text-base sm:text-lg font-bold text-blue-800">
                      SCAN QRIS
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mb-2 sm:mb-3">
                    Scan QR code untuk melakukan pembayaran
                  </p>

                  <div className="bg-white p-2 sm:p-3 rounded-lg inline-block mx-auto border-2 border-gray-200">
                    {receiptData.qr_code.startsWith("image/svg") ? (
                      <div
                        dangerouslySetInnerHTML={{
                          __html: atob(receiptData.qr_code.split(",")[1]),
                        }}
                        className="w-48 h-48 sm:w-56 sm:h-56"
                      />
                    ) : (
                      <img
                        src={receiptData.qr_code}
                        alt="QRIS Payment"
                        className="w-48 h-48 sm:w-56 sm:h-56 object-contain mx-auto"
                      />
                    )}
                  </div>

                  <div className="mt-2 sm:mt-3 bg-white/50 rounded p-2">
                    <p className="text-xs text-gray-600">Reference Number</p>
                    <p className="text-xs sm:text-sm font-mono font-bold text-gray-800">
                      {receiptData.payment_reference}
                    </p>
                  </div>

                  <div className="mt-2 text-xs text-gray-500">
                    <p>💰 Total: Rp {receiptData.total.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            )}

            {!isQRIS &&
              receiptData.payment_reference &&
              !receiptData.payment_method.toLowerCase().includes("cash") && (
                <div className="border-2 border-blue-500 rounded-lg p-3 sm:p-4 bg-blue-50 mb-4">
                  <div className="text-center">
                    <p className="text-xs font-medium text-blue-800 mb-1">
                      {receiptData.payment_method.toUpperCase()}
                    </p>
                    <p className="text-xs text-gray-600 mb-2">
                      Bayar ke nomor virtual account:
                    </p>
                    <p className="text-lg sm:text-xl font-bold text-blue-900 tracking-wider font-mono">
                      {receiptData.payment_reference}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      Total: Rp {receiptData.total.toLocaleString()}
                    </p>
                  </div>
                </div>
              )}

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
                    Rp{" "}
                    {(parseFloat(item.price) * item.quantity).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-2 mb-4 sm:mb-6">
              <div className="flex justify-between text-base sm:text-lg font-bold">
                <span>Total:</span>
                <span>Rp {receiptData.total.toLocaleString()}</span>
              </div>
              {receiptData.payment_method.toLowerCase().includes("cash") && (
                <>
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
                </>
              )}
            </div>

            <div className="text-center text-xs sm:text-sm text-gray-600 mb-4">
              <p>Terima kasih telah berbelanja!</p>
              <p>Semoga harimu menyenangkan 😊</p>
            </div>

            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
              <button
                onClick={handlePrint}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg font-medium transition-colors text-sm active:scale-95"
              >
                Print
              </button>
              <button
                onClick={onClose}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors text-sm active:scale-95"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Transaction;
