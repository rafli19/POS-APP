import { useState, useEffect } from "react";
import { categoryAPI } from "../services/api";
import Layout from "../components/Layout";

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await categoryAPI.getAll();
      setCategories(response.data.data.data || []);
    } catch (err) {
      console.error("Error loading categories:", err);
      showError(err.response?.data?.message || "Gagal memuat kategori");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      fd.append("name", formData.name);
      if (formData.description) fd.append("description", formData.description);
      if (imageFile) fd.append("image", imageFile);

      if (editingId) {
        await categoryAPI.update(editingId, fd);
        showSuccess("Kategori berhasil diupdate!");
      } else {
        await categoryAPI.create(fd);
        showSuccess("Kategori berhasil ditambahkan!");
      }

      resetForm();
      setTimeout(fetchCategories, 1000);
    } catch (err) {
      console.error("Error saving category:", err);
      showError(err.response?.data?.message || "Gagal menyimpan kategori");
    }
  };

  const handleEdit = (category) => {
    setFormData({
      name: category.name,
      description: category.description || "",
    });
    const imageUrl = category.image_url || category.image;
    setImagePreview(imageUrl ? getImageUrl(imageUrl) : null);
    setEditingId(category.id);
    setShowModal(true);
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showError("Ukuran file terlalu besar! Maksimal 2MB");
      e.target.value = "";
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleDeleteClick = (id) => {
    setCategoryToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await categoryAPI.delete(categoryToDelete);
      showSuccess("Kategori berhasil dihapus!");
      setShowDeleteModal(false);
      setCategoryToDelete(null);
      setTimeout(fetchCategories, 1000);
    } catch (err) {
      console.error("Error deleting category:", err);
      showError(err.response?.data?.message || "Gagal menghapus kategori");
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setCategoryToDelete(null);
  };

  const resetForm = () => {
    setFormData({ name: "", description: "" });
    setImageFile(null);
    setImagePreview(null);
    setEditingId(null);
    setShowModal(false);
  };

  const showSuccess = (message) => {
    setSuccessMessage(message);
    setShowSuccessModal(true);
    setTimeout(() => setShowSuccessModal(false), 2000);
  };

  const showError = (message) => {
    setErrorMessage(message);
    setShowErrorModal(true);
  };

  const getImageUrl = (path) => {
    if (!path) return "/images/no-image.png";
    if (path.startsWith("http")) return path;
    const basePath = path.startsWith("/storage/") ? path : `/storage/${path}`;
    return `${import.meta.env.VITE_PUBLIC_URL}${basePath}`;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 text-sm">Loading categories...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              Categories
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              Showing {categories.length} categories
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors text-sm active:scale-95 shadow-md w-full sm:w-auto"
          >
            + Add Category
          </button>
        </div>

        {categories.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500 text-sm">Belum ada kategori</p>
          </div>
        ) : (
          <>
            {/* Mobile: Cards */}
            <div className="block lg:hidden space-y-3 mb-6">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="bg-white rounded-lg shadow p-4 active:bg-gray-50"
                >
                  <div className="flex gap-3 mb-3">
                    <img
                      src={getImageUrl(category.image_url || category.image)}
                      alt={category.name}
                      className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "/images/no-image.png";
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-sm truncate">
                        {category.name}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {category.description || "-"}
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(category.created_at).toLocaleDateString(
                          "id-ID",
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-3 border-t">
                    <button
                      onClick={() => handleEdit(category)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors active:scale-95"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteClick(category.id)}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors active:scale-95"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: Table */}
            <div className="hidden lg:block bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Image
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Created At
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {categories.map((category) => (
                      <tr key={category.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <img
                            src={getImageUrl(
                              category.image_url || category.image,
                            )}
                            alt={category.name}
                            className="w-16 h-16 object-cover rounded-lg"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = "/images/no-image.png";
                            }}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {category.name}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {category.description || "-"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {new Date(category.created_at).toLocaleDateString(
                            "id-ID",
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(category)}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteClick(category.id)}
                              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modals - Form, Delete, Success, Error */}
      {showModal && (
        <>
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" />
          <div className="fixed inset-0 flex items-start justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-md my-4">
              <div className="p-4 sm:p-6 border-b sticky top-0 bg-white z-10 rounded-t-lg">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                  {editingId ? "Edit Category" : "Add New Category"}
                </h2>
              </div>
              <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category Image
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                    {imagePreview ? (
                      <div className="mb-3">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="mx-auto max-h-48 object-contain rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setImageFile(null);
                            setImagePreview(null);
                          }}
                          className="mt-2 text-sm text-red-600 hover:text-red-700 active:scale-95"
                        >
                          Remove Image
                        </button>
                      </div>
                    ) : (
                      <div className="mb-3">
                        <svg
                          className="mx-auto h-12 w-12 text-gray-400"
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
                      className="cursor-pointer inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors active:scale-95"
                    >
                      {imageFile ? "Change Image" : "Choose Image"}
                    </label>
                    <p className="mt-2 text-xs text-gray-500">
                      PNG, JPG up to 2MB
                    </p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Makanan, Minuman, dll"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="3"
                    placeholder="Deskripsi (opsional)"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md font-medium transition-colors active:scale-95"
                  >
                    {editingId ? "Update" : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 px-4 rounded-md font-medium transition-colors active:scale-95"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {showDeleteModal && (
        <>
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                  <svg
                    className="w-8 h-8 text-red-600"
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
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  Konfirmasi Hapus
                </h2>
                <p className="text-sm text-gray-600">
                  Apakah Anda yakin ingin menghapus kategori ini? Tindakan ini
                  tidak dapat dibatalkan.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={cancelDelete}
                  className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg font-medium transition-all active:scale-95"
                >
                  Batal
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all active:scale-95"
                >
                  Hapus
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {showSuccessModal && (
        <div className="fixed inset-0 flex items-center justify-center z-[60]">
          <div className="bg-black/20 backdrop-blur-sm absolute inset-0" />
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full animate-fade-in-up">
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
            <p className="text-center text-lg font-semibold text-gray-900 mb-1">
              Berhasil!
            </p>
            <p className="text-center text-sm text-gray-600">
              {successMessage}
            </p>
          </div>
        </div>
      )}

      {showErrorModal && (
        <div className="fixed inset-0 flex items-center justify-center z-[60]">
          <div className="bg-black/20 backdrop-blur-sm absolute inset-0" />
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full animate-fade-in-up">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-red-100 p-3 rounded-full">
                <svg
                  className="w-8 h-8 text-red-600"
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
              </div>
            </div>
            <p className="text-center text-lg font-semibold text-gray-900 mb-2">
              Gagal!
            </p>
            <p className="text-center text-sm text-gray-600 mb-6">
              {errorMessage}
            </p>
            <button
              onClick={() => setShowErrorModal(false)}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-2.5 px-4 rounded-lg font-medium transition-colors active:scale-95"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Categories;
