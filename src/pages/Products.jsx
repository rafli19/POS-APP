import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { useAuth } from "../context/AuthContext";
import {
  productAPI,
  categoryAPI,
  getImageUrl,
  formatCurrency,
} from "../services/api";
import Layout from "../components/Layout";

const ProductCard = memo(
  ({ product, isAdmin, onViewDetail, onEdit, onDelete }) => (
    <div
      className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow flex flex-col h-full cursor-pointer"
      onClick={() => onViewDetail(product)}
    >
      <div className="relative">
        <img
          src={
            product.image ? getImageUrl(product.image) : "/images/no-image.png"
          }
          alt={product.name}
          className="w-full h-32 sm:h-48 object-cover rounded-t-lg"
          loading="lazy"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = "/images/no-image.png";
          }}
        />
        {product.stock <= product.min_stock && (
          <span className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded">
            Low Stock
          </span>
        )}
      </div>
      <div className="p-2 sm:p-4 flex-1 flex flex-col">
        <h3 className="font-semibold text-sm sm:text-base text-gray-900 truncate">
          {product.name}
        </h3>
        <p className="text-xs text-gray-600 mt-1 truncate">
          SKU: {product.sku}
        </p>
        <p className="text-xs text-gray-500 mt-0.5 truncate">
          {product.category?.name || "No Category"}
        </p>
        <p className="text-base sm:text-lg font-bold text-blue-600 mt-2">
          {formatCurrency(product.price)}
        </p>
        <p
          className={`text-xs sm:text-sm font-medium mt-1 ${
            product.stock <= product.min_stock
              ? "text-red-600"
              : "text-gray-600"
          }`}
        >
          Stock: {product.stock || 0}
        </p>
      </div>
      {isAdmin && (
        <div className="p-2 flex gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onEdit(product)}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-2 py-1.5 rounded text-xs transition-colors active:scale-95"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(product.id)}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white px-2 py-1.5 rounded text-xs transition-colors active:scale-95"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  ),
);

ProductCard.displayName = "ProductCard";

const Products = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [formData, setFormData] = useState({
    category_id: "",
    name: "",
    sku: "",
    description: "",
    price: "",
    stock: "",
    min_stock: "",
    is_active: true,
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;
  const [searchName, setSearchName] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [searchDebounce, setSearchDebounce] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounce(searchName), 800);
    return () => clearTimeout(timer);
  }, [searchName]);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchDebounce, filterCategory]);

  useEffect(() => {
    fetchProducts(currentPage);
  }, [currentPage, searchDebounce, filterCategory]);

  const fetchProducts = async (page = 1) => {
    try {
      setLoading(true);
      const params = { page, per_page: itemsPerPage };
      if (searchDebounce.trim()) params.search = searchDebounce.trim();
      if (filterCategory) params.category_id = filterCategory;

      const res = await productAPI.getAll(params);
      if (res?.data?.success) {
        const { data, last_page, total } = res.data.data;
        setProducts(data || []);
        setTotalPages(last_page || 1);
        setTotalItems(total || 0);
      }
    } catch (err) {
      console.error("Error loading products:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await categoryAPI.getAll();
      if (res?.data?.success) {
        setCategories(res.data.data.data || []);
      }
    } catch (err) {
      console.error("Error loading categories:", err);
      if (err.response?.status === 403) {
        setCategories([]);
      }
    }
  };

  const resetForm = useCallback(() => {
    setFormData({
      category_id: "",
      name: "",
      sku: "",
      description: "",
      price: "",
      stock: "",
      min_stock: "",
      is_active: true,
    });
    setImageFile(null);
    setImagePreview(null);
    setEditingId(null);
    setShowModal(false);
    setFormErrors({});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormErrors({});

    try {
      const fd = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (key === "is_active") {
          fd.append(key, value ? 1 : 0);
        } else if (value !== null && value !== undefined && value !== "") {
          fd.append(key, value);
        }
      });

      if (imageFile) fd.append("image", imageFile);

      if (editingId) {
        await productAPI.update(editingId, fd);
        setSuccessMessage("Produk berhasil diperbarui");
      } else {
        await productAPI.create(fd);
        setSuccessMessage("Produk berhasil ditambahkan");
      }

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        resetForm();
        fetchProducts(currentPage);
      }, 2000);
    } catch (err) {
      console.error("Error saving product:", err);
      if (err.response?.data?.errors) {
        setFormErrors(err.response.data.errors);
      }
      alert(err.response?.data?.message || "Gagal menyimpan produk");
    }
  };

  const handleEdit = useCallback((product) => {
    setFormData({
      category_id: product.category_id?.toString() || "",
      name: product.name || "",
      sku: product.sku || "",
      description: product.description || "",
      price: product.price?.toString() || "",
      stock: product.stock?.toString() || "",
      min_stock: product.min_stock?.toString() || "",
      is_active: product.is_active ?? true,
    });

    const imageUrl = product.image_url || product.image;
    setImagePreview(imageUrl ? getImageUrl(imageUrl) : null);
    setImageFile(null);
    setEditingId(product.id);
    setShowModal(true);
    setFormErrors({});
  }, []);

  const handleDelete = async (id) => {
    if (!confirm("Yakin ingin menghapus produk ini?")) return;

    try {
      await productAPI.delete(id);
      setSuccessMessage("Produk berhasil dihapus");
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        fetchProducts(currentPage);
      }, 2000);
    } catch (err) {
      console.error("Error deleting product:", err);
      alert(err.response?.data?.message || "Gagal menghapus produk");
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Ukuran file terlalu besar! Maksimal 2MB");
      e.target.value = "";
      return;
    }

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      alert("Format file tidak didukung! Gunakan JPG, PNG, atau WebP");
      e.target.value = "";
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSearch = useCallback((e) => setSearchName(e.target.value), []);
  const handleCategoryFilter = useCallback(
    (e) => setFilterCategory(e.target.value),
    [],
  );
  const handleClearFilters = useCallback(() => {
    setSearchName("");
    setFilterCategory("");
  }, []);
  const handleViewDetail = useCallback((product) => {
    setSelectedProduct(product);
    setShowDetailModal(true);
  }, []);
  const closeDetailModal = useCallback(() => {
    setShowDetailModal(false);
    setSelectedProduct(null);
  }, []);
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
    return `Showing ${from}-${to} of ${totalItems} products`;
  }, [currentPage, itemsPerPage, totalItems]);

  const getStockStatus = useCallback((product) => {
    if (product.stock === 0)
      return { text: "Out of Stock", color: "bg-red-100 text-red-800" };
    if (product.stock <= product.min_stock)
      return { text: "Low Stock", color: "bg-orange-100 text-orange-600" };
    return { text: "In Stock", color: "bg-green-100 text-green-800" };
  }, []);

  if (loading && currentPage === 1 && !products.length) {
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              Products
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              {showingText}
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors text-sm active:scale-95 shadow-md w-full sm:w-auto"
            >
              + Add Product
            </button>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="flex flex-col gap-3">
            <div className="flex-1">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                Search by Name
              </label>
              <input
                type="text"
                value={searchName}
                onChange={handleSearch}
                placeholder="Cari nama produk..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                  Category
                </label>
                <select
                  value={filterCategory}
                  onChange={handleCategoryFilter}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              {(searchName || filterCategory) && (
                <div className="flex items-end">
                  <button
                    onClick={handleClearFilters}
                    className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors text-sm whitespace-nowrap active:scale-95"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-4 text-gray-600 text-sm">Loading...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500 text-sm">
              {searchName || filterCategory
                ? "Tidak ada produk yang sesuai dengan filter"
                : "Belum ada produk"}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 mb-6">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  isAdmin={isAdmin}
                  onViewDetail={handleViewDetail}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="bg-white rounded-lg shadow p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 sm:px-4 sm:py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs sm:text-sm"
                  >
                    Prev
                  </button>
                  <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto">
                    {currentPage > 3 && (
                      <>
                        <button
                          onClick={() => handlePageChange(1)}
                          className="px-2 sm:px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50 text-xs sm:text-sm"
                        >
                          1
                        </button>
                        {currentPage > 4 && (
                          <span className="px-1 text-gray-500">...</span>
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
                          <span className="px-1 text-gray-500">...</span>
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
                    className="px-3 py-1.5 sm:px-4 sm:py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs sm:text-sm"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showSuccess && (
        <div className="fixed inset-0 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full">
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
            <p className="text-center text-base sm:text-lg font-semibold text-gray-900">
              {successMessage}
            </p>
          </div>
        </div>
      )}

      {showDetailModal && selectedProduct && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={closeDetailModal}
          />
          <div className="fixed inset-0 flex items-start justify-center z-50 p-4 overflow-y-auto">
            <div
              className="bg-white rounded-xl shadow-2xl w-full max-w-2xl my-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 sm:p-6 border-b sticky top-0 bg-white z-10 rounded-t-xl">
                <h2 className="text-lg sm:text-2xl font-bold text-gray-900">
                  Product Details
                </h2>
                <button
                  onClick={closeDetailModal}
                  className="text-gray-400 hover:text-gray-600 active:scale-95"
                >
                  <svg
                    className="w-6 h-6"
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
              <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                <div className="flex flex-col md:flex-row gap-4 sm:gap-6">
                  <div className="w-full md:w-1/2">
                    <img
                      src={
                        selectedProduct.image
                          ? getImageUrl(selectedProduct.image)
                          : "/images/no-image.png"
                      }
                      alt={selectedProduct.name}
                      className="w-full h-64 sm:h-80 object-cover rounded-lg shadow-md"
                      loading="lazy"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "/images/no-image.png";
                      }}
                    />
                  </div>
                  <div className="w-full md:w-1/2 space-y-3 sm:space-y-4">
                    <div>
                      <h3 className="text-2xl sm:text-3xl font-bold text-gray-900">
                        {selectedProduct.name}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600 mt-2">
                        SKU: {selectedProduct.sku}
                      </p>
                    </div>
                    <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
                      <p className="text-2xl sm:text-4xl font-bold text-blue-600">
                        {formatCurrency(selectedProduct.price)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                      <span
                        className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium ${
                          getStockStatus(selectedProduct).color
                        }`}
                      >
                        {getStockStatus(selectedProduct).text}
                      </span>
                      <p className="text-sm sm:text-base text-gray-700">
                        Stock:{" "}
                        <span className="font-semibold">
                          {selectedProduct.stock}
                        </span>
                      </p>
                      <p className="text-sm sm:text-base text-gray-700">
                        Min:{" "}
                        <span className="font-semibold">
                          {selectedProduct.min_stock}
                        </span>
                      </p>
                    </div>
                    {selectedProduct.category && (
                      <div>
                        <p className="text-xs sm:text-sm text-gray-600">
                          Category
                        </p>
                        <p className="text-base sm:text-lg font-semibold text-gray-900">
                          {selectedProduct.category.name}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">Status</p>
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${
                          selectedProduct.is_active
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {selectedProduct.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                </div>
                {selectedProduct.description && (
                  <div className="border-t pt-4">
                    <h4 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">
                      Description
                    </h4>
                    <p className="text-sm sm:text-base text-gray-700 whitespace-pre-line">
                      {selectedProduct.description}
                    </p>
                  </div>
                )}
              </div>
              <div className="p-4 sm:p-6 border-t flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 sticky bottom-0 bg-white rounded-b-xl">
                <button
                  onClick={closeDetailModal}
                  className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors text-sm active:scale-95"
                >
                  Close
                </button>
                {isAdmin && (
                  <button
                    onClick={() => {
                      closeDetailModal();
                      handleEdit(selectedProduct);
                    }}
                    className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm active:scale-95"
                  >
                    Edit Product
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {showModal && isAdmin && (
        <>
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" />
          <div className="fixed inset-0 flex items-start justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md my-8">
              <div className="flex items-center justify-between p-4 sm:p-5 border-b sticky top-0 bg-white z-10 rounded-t-xl">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                  {editingId ? "Edit Product" : "Add New Product"}
                </h2>
                <button
                  onClick={resetForm}
                  className="text-gray-400 hover:text-gray-600 active:scale-95"
                >
                  <svg
                    className="w-6 h-6"
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
              <form
                onSubmit={handleSubmit}
                className="p-4 sm:p-6 space-y-3 sm:space-y-4"
              >
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Product Image
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 sm:p-4 text-center">
                    {imagePreview ? (
                      <div className="mb-3">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="mx-auto max-h-40 sm:max-h-48 object-contain"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setImageFile(null);
                            setImagePreview(null);
                          }}
                          className="mt-2 text-xs sm:text-sm text-red-600 hover:text-red-700"
                        >
                          Remove Image
                        </button>
                      </div>
                    ) : (
                      <div className="mb-3">
                        <svg
                          className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                      id="image-upload"
                    />
                    <label
                      htmlFor="image-upload"
                      className="cursor-pointer inline-block bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors"
                    >
                      {imageFile ? "Change Image" : "Choose Image"}
                    </label>
                    <p className="mt-2 text-xs text-gray-500">
                      PNG, JPG up to 2MB
                    </p>
                  </div>
                  {formErrors.image && (
                    <p className="mt-1 text-xs sm:text-sm text-red-500">
                      {formErrors.image[0]}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    required
                    value={formData.category_id}
                    onChange={(e) =>
                      setFormData({ ...formData, category_id: e.target.value })
                    }
                    className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${formErrors.category_id ? "border-red-500" : ""}`}
                  >
                    <option value="">Pilih Kategori</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  {formErrors.category_id && (
                    <p className="mt-1 text-xs sm:text-sm text-red-500">
                      {formErrors.category_id[0]}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${formErrors.name ? "border-red-500" : ""}`}
                      placeholder="Nama produk"
                    />
                    {formErrors.name && (
                      <p className="mt-1 text-xs text-red-500">
                        {formErrors.name[0]}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      SKU *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.sku}
                      onChange={(e) =>
                        setFormData({ ...formData, sku: e.target.value })
                      }
                      className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${formErrors.sku ? "border-red-500" : ""}`}
                      placeholder="SKU"
                    />
                    {formErrors.sku && (
                      <p className="mt-1 text-xs text-red-500">
                        {formErrors.sku[0]}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    rows="3"
                    placeholder="Deskripsi produk"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      Price *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) =>
                        setFormData({ ...formData, price: e.target.value })
                      }
                      className={`w-full px-2 sm:px-4 py-2 sm:py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${formErrors.price ? "border-red-500" : ""}`}
                      placeholder="Harga"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      Stock *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={formData.stock}
                      onChange={(e) =>
                        setFormData({ ...formData, stock: e.target.value })
                      }
                      className={`w-full px-2 sm:px-4 py-2 sm:py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${formErrors.stock ? "border-red-500" : ""}`}
                      placeholder="Stok"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      Min *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={formData.min_stock}
                      onChange={(e) =>
                        setFormData({ ...formData, min_stock: e.target.value })
                      }
                      className={`w-full px-2 sm:px-4 py-2 sm:py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${formErrors.min_stock ? "border-red-500" : ""}`}
                      placeholder="Min"
                    />
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) =>
                      setFormData({ ...formData, is_active: e.target.checked })
                    }
                    className="h-4 w-4 sm:h-5 sm:w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label className="ml-2 sm:ml-3 text-xs sm:text-sm text-gray-700">
                    Active
                  </label>
                </div>

                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 pt-3">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 sm:py-2.5 px-4 rounded-lg font-medium transition-colors text-sm active:scale-95"
                  >
                    {editingId ? "Update" : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 sm:py-2.5 px-4 rounded-lg font-medium transition-colors text-sm active:scale-95"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </Layout>
  );
};

export default Products;
