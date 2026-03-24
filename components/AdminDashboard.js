"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Lock, LogOut, Plus, Trash2, Image as ImageIcon, Save, CheckCircle2, AlertCircle, Percent, Edit3, Settings, X, UploadCloud, Zap, Check, Phone } from "lucide-react";

const ACCESS_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "admin123";
// SIZE_TEMPLATES is the single source of truth for all size systems
const SIZE_TEMPLATES = {
  ALPHA: { name: "ملابس (S, M, L...)", values: ["S", "M", "L", "XL", "XXL", "XXXL"] },
  PANTS: { name: "سراويل (28, 30, 32...)", values: ["28", "29", "30", "31", "32", "33", "34", "36", "38", "40"] },
  SHOES: { name: "أحذية (37, 38, 39...)", values: ["37", "38", "39", "40", "41", "42", "43", "44", "45"] },
  KIDS: { name: "أطفال (1, 2, 3...)", values: ["1", "2", "3", "4", "5", "6"] }
};

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [activeTab, setActiveTab] = useState("products"); // products, promos, settings

  // Toast Notification System
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3000);
  };

  // Sub-systems State
  const [products, setProducts] = useState([]);
  const [promoCodes, setPromoCodes] = useState([]);
  const [settings, setSettings] = useState({
    whatsapp_number: "",
    bundle_amount: "",
    bundle_threshold: "",
    categories: ["فساتين", "بدلات", "قمصان", "اكسسوارات"],
    store_name: "Boutique",
    store_bio: "",
    store_cover: "",
    primary_color: "#000000",
    store_logo: ""
  });

  const [logoFile, setLogoFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);

  const [loading, setLoading] = useState(false);

  // New Category Input
  const [newCatInput, setNewCatInput] = useState("");

  // Product Modal State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [productForm, setProductForm] = useState({
    name: "",
    price: "",
    category: "",
    sizes: { S: true, M: true, L: true, XL: true, XXL: true },
    existingMainImage: ""
  });
  const [mainImageFile, setMainImageFile] = useState(null);

  // Color Variants: [{ name: '', file: null, existingUrl: '' }]
  const [colorVariants, setColorVariants] = useState([]);

  // Promos State
  const [newPromo, setNewPromo] = useState({ code: "", discount_value: "", is_active: true, expires_at: "" });

  useEffect(() => {
    if (isAuthenticated) {
      fetchProducts();
      fetchPromoCodes();
      fetchSettings();
    }
  }, [isAuthenticated]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === ACCESS_PASSWORD) {
      setIsAuthenticated(true);
      showToast("تم تسجيل الدخول بنجاح");
    } else {
      showToast("كلمة المرور غير صحيحة", "error");
    }
  };

  // --- Fetchers ---
  const fetchSettings = async () => {
    const { data } = await supabase.from("store_settings").select("*").eq("id", 1).single();
    if (data) {
      setSettings({
        ...data,
        categories: data.categories || ["فساتين", "بدلات", "قمصان", "اكسسوارات"],
        store_name: data.store_name || "Boutique",
        store_bio: data.store_bio || "",
        store_cover: data.store_cover || "",
        primary_color: data.primary_color || "#000000",
        store_logo: data.store_logo || ""
      });
    }
  };

  const fetchProducts = async () => {
    const { data } = await supabase.from("products").select("*").order("created_at", { ascending: false });
    if (data) setProducts(data);
  };

  const fetchPromoCodes = async () => {
    const { data, error } = await supabase.from("promo_codes").select("*").order("created_at", { ascending: false });
    if (error) {
      console.error("Fetch promos error:", error);
      showToast(`خطأ جلب الخصومات: ${error.message}`, "error");
    }
    if (data) setPromoCodes(data);
  };

  // --- Settings Logic ---
  const saveSettings = async () => {
    setLoading(true);
    let finalLogo = settings.store_logo;
    let finalCover = settings.store_cover;

    try {
      // 1. Storage Uploads
      if (logoFile) {
        try {
          finalLogo = await uploadFileToSupabase(logoFile);
        } catch (uploadErr) {
          console.error("Logo upload error:", uploadErr);
          throw new Error(`خطأ في رفع الشعار: ${uploadErr.message || "حدثت مشكلة أثناء الرفع"}`);
        }
      }
      
      if (coverFile) {
        try {
          finalCover = await uploadFileToSupabase(coverFile);
        } catch (uploadErr) {
          console.error("Cover upload error:", uploadErr);
          throw new Error(`خطأ في رفع الغلاف: ${uploadErr.message || "حدثت مشكلة أثناء الرفع"}`);
        }
      }

      // 2. Data Preparation & Sanitization
      const bAmount = Number(settings.bundle_amount);
      const bThreshold = Number(settings.bundle_threshold);

      const upsertData = {
        id: 1,
        whatsapp_number: settings.whatsapp_number,
        bundle_amount: isNaN(bAmount) ? 0 : bAmount,
        bundle_threshold: isNaN(bThreshold) ? 0 : bThreshold,
        categories: settings.categories || [],
        store_name: settings.store_name || "Boutique",
        store_bio: settings.store_bio || "",
        store_cover: finalCover || "",
        primary_color: settings.primary_color || "#000000",
        store_logo: finalLogo || ""
      };

      // 3. Database Upsert
      const { error } = await supabase.from("store_settings").upsert(upsertData);

      if (error) {
        console.error("Database upsert error:", error);
        throw new Error(`خطأ قاعدة البيانات: ${error.message || "فشل في حفظ الإعدادات"}`);
      }

      showToast("تم حفظ الإعدادات بنجاح ✨");
      setSettings(prev => ({ ...prev, store_logo: finalLogo, store_cover: finalCover }));
      setLogoFile(null);
      setCoverFile(null);
    } catch (err) {
      console.error("Save settings caught error:", err);
      showToast(err.message || "حدث خطأ غير متوقع", "error");
    } finally {
      setLoading(false);
    }
  };

  const addCategory = () => {
    if (!newCatInput.trim()) return;
    if (settings.categories.includes(newCatInput.trim())) return;
    setSettings(prev => ({ ...prev, categories: [...prev.categories, newCatInput.trim()] }));
    setNewCatInput("");
  };

  const removeCategory = (cat) => {
    setSettings(prev => ({ ...prev, categories: prev.categories.filter(c => c !== cat) }));
  };

  // --- Product Modals & UI ---
  const openAddProduct = () => {
    setEditingId(null);
    setProductForm({
      name: "", price: "", category: settings.categories[0] || "",
      size_type: "ALPHA", // New: default to alpha sizes
      sizes: { S: true, M: true, L: true, XL: true, XXL: true },
      existingMainImage: ""
    });
    setMainImageFile(null);
    setColorVariants([]); // Will be initialized with rows containing sizes
    setIsProductModalOpen(true);
  };

  const openEditProduct = (product) => {
    setEditingId(product.id);
    const sizesObj = product.variants?.sizes || product.variants || { S: true, M: true, L: true, XL: true, XXL: true };
    const colorsArr = product.variants?.colors || [];

    setProductForm({
      name: product.name,
      price: product.price,
      category: product.category,
      size_type: product.variants?.size_type || "ALPHA", // Fetch existing type
      sizes: sizesObj,
      existingMainImage: product.image_url
    });
    setMainImageFile(null);

    // Map existing colors with their specific sizes
    setColorVariants(colorsArr.map(c => ({
      name: c.name || (typeof c === 'string' ? c : ""),
      file: null,
      existingUrl: c.image_url || "",
      sizes: c.sizes || { ...sizesObj } // Fallback to global sizes if per-color missing
    })));

    setIsProductModalOpen(true);
  };

  const addColorRow = () => {
    setColorVariants([...colorVariants, {
      name: "",
      file: null,
      existingUrl: "",
      sizes: { ...productForm.sizes } // Default to currently selected global sizes
    }]);
  };

  const removeColorRow = (index) => {
    const newArr = [...colorVariants];
    newArr.splice(index, 1);
    setColorVariants(newArr);
  };

  const handleColorImageUpload = (index, file) => {
    const newArr = [...colorVariants];
    newArr[index].file = file;
    setColorVariants(newArr);
  };

  const compressImage = (file, maxWidth = 1200, maxHeight = 1200, quality = 0.75) => {
    return new Promise((resolve) => {
      // Skip compression for non-images or files already small enough
      if (!file.type.startsWith('image/') || file.size < 500 * 1024) {
        return resolve(file);
      }

      const reader = new FileReader();
      reader.readAsDataURL(file);

      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;

        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            let { width, height } = img;

            // Scale down proportionally
            const ratio = Math.min(1, maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
              console.warn('Canvas context unavailable, uploading original');
              return resolve(file);
            }
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(
              (blob) => {
                if (blob && blob.size > 0) {
                  const baseName = file.name.replace(/\.[^/.]+$/, '');
                  const compressed = new File([blob], `${baseName}.jpg`, {
                    type: 'image/jpeg',
                    lastModified: Date.now(),
                  });
                  console.log(`Compressed: ${(file.size / 1024).toFixed(0)}KB → ${(compressed.size / 1024).toFixed(0)}KB`);
                  resolve(compressed);
                } else {
                  console.warn('canvas.toBlob returned null, uploading original');
                  resolve(file);
                }
              },
              'image/jpeg',
              quality
            );
          } catch (err) {
            console.warn('Compression failed, uploading original:', err.message);
            resolve(file);
          }
        };

        img.onerror = () => {
          console.warn('Image load error during compression, uploading original');
          resolve(file);
        };
      };

      reader.onerror = () => {
        console.warn('FileReader error during compression, uploading original');
        resolve(file);
      };
    });
  };

  const uploadFileToSupabase = async (file) => {
    // ── 1. Size guard (20 MB hard limit) ───────────────────────────────────
    const MAX_BYTES = 20 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      throw new Error('حجم الملف كبير جداً (الحد الأقصى 20 ميجابايت). يرجى اختيار صورة أصغر.');
    }

    // ── 2. Compress ─────────────────────────────────────────────────────────
    const processed = await compressImage(file);
    const mimeType = processed.type || 'image/jpeg';
    const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    console.log(`Uploading → bucket:products / ${fileName} (${(processed.size / 1024).toFixed(0)} KB, ${mimeType})`);

    // ── 3. Upload with explicit content-type ────────────────────────────────
    const { error } = await supabase.storage
      .from('products')
      .upload(fileName, processed, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Supabase storage error:', JSON.stringify(error));
      // Translate common Supabase errors to Arabic
      if (error.message?.includes('Payload too large')) {
        throw new Error('الصورة كبيرة جداً. يرجى تقليص حجمها وإعادة المحاولة.');
      }
      if (error.message?.includes('duplicate')) {
        throw new Error('اسم الملف مكرر. يرجى المحاولة مجدداً.');
      }
      throw new Error(error.message || 'فشل رفع الصورة إلى التخزين.');
    }

    const { data } = supabase.storage.from('products').getPublicUrl(fileName);
    return data.publicUrl;
  };


  const saveProduct = async (e) => {
    e.preventDefault();
    if (Number(productForm.price) < 0) {
      showToast("السعر لا يمكن أن يكون سالباً", "error");
      return;
    }
    if (!productForm.category) {
      showToast("الرجاء تحديد تصنيف", "error");
      return;
    }

    setLoading(true);
    try {
      let finalMainImage = productForm.existingMainImage;
      if (mainImageFile) {
        finalMainImage = await uploadFileToSupabase(mainImageFile);
      }

      // Process Color Images & Sizes
      const finalColors = [];
      for (const cv of colorVariants) {
        if (!cv.name.trim()) continue; // Skip empty names
        let colorUrl = cv.existingUrl;
        if (cv.file) {
          colorUrl = await uploadFileToSupabase(cv.file);
        }
        finalColors.push({
          name: cv.name.trim(),
          image_url: colorUrl,
          sizes: cv.sizes // Save per-color size mapping
        });
      }

      const variantsPayload = {
        size_type: productForm.size_type, // Persist the size system used
        sizes: productForm.sizes, // Keep global manifest for backward compatibility
        colors: finalColors
      };

      const payload = {
        name: productForm.name,
        price: Number(productForm.price),
        category: productForm.category,
        image_url: finalMainImage,
        variants: variantsPayload
      };

      if (editingId) {
        const { error } = await supabase.from("products").update(payload).eq("id", editingId);
        if (error) throw error;
        showToast("تم تحديث المنتج بنجاح");
      } else {
        const { error } = await supabase.from("products").insert([payload]);
        if (error) throw error;
        showToast("تم إضافة المنتج بنجاح");
      }

      setIsProductModalOpen(false);
      fetchProducts();
    } catch (err) {
      console.error(err);
      showToast("حدث خطأ أثناء حفظ المنتج", "error");
    } finally {
      setLoading(false);
    }
  };

  const deleteProduct = async (product) => {
    if (!confirm("هل أنت متأكد من الحذف النهائي؟ لا يمكن التراجع!")) return;

    try {
      const filesToDelete = [];
      if (product.image_url) {
        filesToDelete.push(product.image_url.split('/').pop());
      }
      const existingColors = product.variants?.colors || [];
      existingColors.forEach(c => {
        if (c.image_url) filesToDelete.push(c.image_url.split('/').pop());
      });

      if (filesToDelete.length > 0) {
        const cleanFiles = filesToDelete.filter(Boolean);
        await supabase.storage.from("products").remove(cleanFiles);
      }

      const { error } = await supabase.from("products").delete().eq("id", product.id);
      if (error) throw error;

      fetchProducts();
      showToast("تم حذف المنتج مع صوره بنجاح");
    } catch (error) {
      console.error(error);
      showToast("حدث خطأ أثناء الحذف", "error");
    }
  };

  const toggleVariantFast = async (product, size) => {
    const currentSizes = product.variants?.sizes || product.variants || {};
    const updatedSizes = { ...currentSizes, [size]: !currentSizes[size] };
    const updatedVariants = { ...product.variants, sizes: updatedSizes };

    const { error } = await supabase.from("products").update({ variants: updatedVariants }).eq("id", product.id);
    if (!error) {
      setProducts(products.map(p => p.id === product.id ? { ...p, variants: updatedVariants } : p));
      showToast(`تم تحديث توفر المقاس ${size} للمنتج`, "success");
    }
  };

  const addPromoCode = async (e) => {
    e.preventDefault();
    if (Number(newPromo.discount_value) < 0) {
      showToast("قيمة الخصم لا يمكن أن تكون بالسالب", "error");
      return;
    }
    const promoData = {
      code: newPromo.code.trim().toUpperCase(),
      discount_value: Number(newPromo.discount_value),
      is_active: newPromo.is_active,
      expires_at: newPromo.expires_at ? new Date(newPromo.expires_at).toISOString() : null
    };

    const { error } = await supabase.from("promo_codes").insert([promoData]);

    if (!error) {
      setNewPromo({ code: "", discount_value: "", is_active: true, expires_at: "" });
      fetchPromoCodes();
      showToast("تم إنشاء كود الخصم بنجاح");
    } else {
      console.error("Promo code error: ", error);
      showToast(`خطأ قاعدة البيانات: ${error.message || "Unknown"}`, "error");
    }
  };

  const togglePromoStatus = async (promo) => {
    const { error } = await supabase.from("promo_codes").update({ is_active: !promo.is_active }).eq("id", promo.id);
    if (!error) fetchPromoCodes();
  };

  const deletePromoCode = async (id) => {
    if (!confirm("هل تريد حذف هذا الكود؟")) return;
    const { error } = await supabase.from("promo_codes").delete().eq("id", id);
    if (!error) {
      fetchPromoCodes();
      showToast("تم حذف الكود بنجاح");
    }
  };

  // --- Render Functions ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 relative">
        {toast.show && (
          <div className={`absolute top-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-lg flex items-center gap-2 text-white font-medium animate-in slide-in-from-top-4 fade-in z-50 ${toast.type === "error" ? "bg-red-500" : "bg-black"}`}>
            {toast.type === "error" ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
            {toast.message}
          </div>
        )}
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-sm border border-gray-100">
          <div className="flex justify-center mb-6">
            <div className="bg-black text-white p-4 rounded-2xl shadow-lg">
              <Lock className="w-8 h-8" />
            </div>
          </div>
          <h1 className="text-2xl font-black text-center mb-8 tracking-tight">إدارة المتجر الذكي</h1>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="كلمة مرور الإدارة السريّة"
            className="w-full p-4 rounded-xl border border-gray-200 focus:border-black outline-none mb-6 text-center font-medium bg-gray-50 focus:bg-white transition"
          />
          <button type="submit" className="w-full bg-black text-white py-4 rounded-xl font-bold hover:bg-gray-900 transition active:scale-95">
            تسجيل الدخول
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32 relative">
      {/* Toast Notification Layer */}
      {toast.show && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 text-white font-bold animate-in slide-in-from-bottom-8 fade-in z-[100] ${toast.type === "error" ? "bg-red-500" : "bg-black"}`}>
          {toast.type === "error" ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
          {toast.message}
        </div>
      )}

      {/* Product Form Modal */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto pt-10">
          <div className="bg-white w-full max-w-2xl rounded-t-[32px] sm:rounded-3xl shadow-2xl animate-in slide-in-from-bottom-10 max-h-[92vh] sm:max-h-[95vh] flex flex-col my-auto border-t sm:border border-white/20">
            <div className="flex justify-between items-center p-5 sm:p-6 border-b shrink-0 bg-white/50 backdrop-blur-md sticky top-0 z-10">
              <h2 className="text-lg sm:text-xl font-black flex items-center gap-2">
                {editingId ? <><Edit3 className="w-5 h-5" /> تعديل المنتج</> : <><Plus className="w-5 h-5" /> أضف منتج جديد</>}
              </h2>
              <button disabled={loading} onClick={() => setIsProductModalOpen(false)} className="p-2.5 hover:bg-gray-100 bg-gray-50 rounded-xl transition active:scale-90"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-5 sm:p-8 overflow-y-auto flex-1 custom-scrollbar">
              <form id="productForm" onSubmit={saveProduct} className="space-y-6">

                {/* Basic Details */}
                <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 flex gap-6 flex-col sm:flex-row shadow-sm">
                  {/* Main Image */}
                  <div className="shrink-0 w-full sm:w-32">
                    <label className="block text-sm font-bold text-gray-700 mb-2">الصورة الرئيسية</label>
                    <label className="relative flex flex-col items-center justify-center w-full aspect-square bg-white border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-black transition overflow-hidden">
                      {mainImageFile ? (
                        <img src={URL.createObjectURL(mainImageFile)} className="w-full h-full object-cover" alt="Preview" />
                      ) : productForm.existingMainImage ? (
                        <img src={productForm.existingMainImage} className="w-full h-full object-cover" alt="Preview" />
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          <UploadCloud className="w-7 h-7 text-gray-300" />
                          <span className="text-[10px] text-gray-400 font-bold">اختر صورة</span>
                        </div>
                      )}
                      {/* Overlay tap hint when image exists */}
                      {(mainImageFile || productForm.existingMainImage) && (
                        <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-all flex items-center justify-center opacity-0 hover:opacity-100">
                          <UploadCloud className="w-6 h-6 text-white" />
                        </div>
                      )}
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => setMainImageFile(e.target.files[0])} />
                    </label>
                  </div>

                  {/* Inputs */}
                  <div className="flex-1 space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">اسم المنتج</label>
                      <input required type="text" value={productForm.name} onChange={e => setProductForm({ ...productForm, name: e.target.value })} className="w-full p-3 rounded-xl border border-gray-200 focus:border-black outline-none bg-white font-medium shadow-sm transition-colors" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">السعر (د.ع)</label>
                        <input required type="number" min="0" value={productForm.price} onChange={e => setProductForm({ ...productForm, price: e.target.value })} className="w-full p-3 rounded-xl border border-gray-200 focus:border-black outline-none bg-white font-medium shadow-sm transition-colors" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">القسم</label>
                        <select required value={productForm.category} onChange={e => setProductForm({ ...productForm, category: e.target.value })} className="w-full p-3 rounded-xl border border-gray-200 focus:border-black outline-none bg-white font-medium appearance-none shadow-sm transition-colors">
                          <option value="">اختر القسم...</option>
                          {settings.categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">نظام المقاسات</label>
                        <select required value={productForm.size_type} onChange={e => {
                          const newType = e.target.value;
                          // Sync sizes to the new template — reset all to true
                          const newSizes = {};
                          SIZE_TEMPLATES[newType].values.forEach(s => { newSizes[s] = true; });
                          setProductForm({ ...productForm, size_type: newType, sizes: newSizes });
                        }} className="w-full p-3 rounded-xl border border-gray-200 focus:border-black outline-none bg-white font-medium appearance-none shadow-sm transition-colors text-amber-900 border-amber-50">
                          {Object.entries(SIZE_TEMPLATES).map(([key, obj]) => <option key={key} value={key}>{obj.name}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Colors with specific images */}
                <div className="border border-gray-200 rounded-2xl p-5 shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="font-bold text-gray-900 border-b-2 border-black inline-block pb-1">الألوان وصورها (اختياري)</h3>
                      <p className="text-xs text-gray-500 mt-1">ارفع صورة مخصصة لكل لون ليراها الزبون فوراً.</p>
                    </div>
                    <button type="button" onClick={addColorRow} className="bg-gray-100 text-black hover:bg-gray-200 px-3 py-1.5 rounded-lg text-sm font-bold transition flex items-center gap-1 active:scale-95 shadow-sm">
                      <Plus className="w-4 h-4" /> إضافة لون
                    </button>
                  </div>

                  {colorVariants.length === 0 ? (
                    <div className="text-center py-6 text-sm text-gray-400 border border-dashed rounded-xl bg-gray-50">لا يوجد ألوان مخصصة. سيتم الاعتماد على الصورة الرئيسية فقط.</div>
                  ) : (
                    <div className="space-y-3">
                      {colorVariants.map((cv, index) => (
                        <div key={index} className="flex items-center gap-2 sm:gap-3 bg-white p-2 sm:p-3 border border-gray-200 rounded-xl relative group shadow-sm">

                          {/* Color Image Upload — shows actual preview */}
                          <label className="shrink-0 w-14 h-14 rounded-xl bg-gray-50 border-2 border-gray-200 flex items-center justify-center cursor-pointer overflow-hidden hover:border-black transition relative group">
                            {cv.file ? (
                              <img src={URL.createObjectURL(cv.file)} className="w-full h-full object-cover" alt="" />
                            ) : cv.existingUrl ? (
                              <img src={cv.existingUrl} className="w-full h-full object-cover" alt="color variant" />
                            ) : (
                              <div className="flex flex-col items-center gap-0.5">
                                <ImageIcon className="w-5 h-5 text-gray-300" />
                                <span className="text-[8px] text-gray-300 font-bold">صورة</span>
                              </div>
                            )}
                            {/* Overlay for re-upload */}
                            {(cv.file || cv.existingUrl) && (
                              <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-all flex items-center justify-center opacity-0 hover:opacity-100">
                                <UploadCloud className="w-4 h-4 text-white" />
                              </div>
                            )}
                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleColorImageUpload(index, e.target.files[0])} />
                          </label>

                          <div className="flex-1 space-y-1.5 min-w-0">
                            <input type="text" placeholder="اسم اللون" value={cv.name} onChange={e => {
                              const newArr = [...colorVariants]; newArr[index].name = e.target.value; setColorVariants(newArr);
                            }} className="w-full p-2 text-xs sm:text-sm rounded-lg bg-gray-50 border-none focus:ring-1 focus:ring-black outline-none font-bold truncate" />

                            {/* Per-color Size Toggles — flex-wrap for any template size */}
                            <div className="flex flex-wrap gap-1 mt-1">
                              {SIZE_TEMPLATES[productForm.size_type].values.map(size => {
                                const isActive = cv.sizes ? cv.sizes[size] !== false : productForm.sizes[size] !== false;
                                return (
                                  <button key={size} type="button"
                                    onClick={() => {
                                      const newArr = [...colorVariants];
                                      const currentSizes = newArr[index].sizes || { ...productForm.sizes };
                                      newArr[index].sizes = { ...currentSizes, [size]: !isActive };
                                      setColorVariants(newArr);
                                    }}
                                    className={`px-2 py-1 rounded-lg text-[9px] font-black border transition-all active:scale-90 ${
                                      isActive ? 'bg-black text-white border-black shadow-sm' : 'bg-white text-gray-300 border-gray-100 hover:border-gray-300'
                                    }`}
                                  >
                                    {size}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <button type="button" onClick={() => removeColorRow(index)} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Global Sizes Toggle - flex-wrap so PANTS / SHOES sizes never overflow */}
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                  <span className="text-sm font-bold text-gray-700 block mb-3">تفعيل/تعطيل المقاسات مبدئياً:</span>
                  <div className="flex flex-wrap gap-2">
                    {SIZE_TEMPLATES[productForm.size_type].values.map(size => {
                      const isActive = productForm.sizes[size] !== false;
                      return (
                        <button key={size} type="button"
                          onClick={() => setProductForm({ ...productForm, sizes: { ...productForm.sizes, [size]: !isActive } })}
                          className={`min-w-[40px] h-10 px-3 rounded-xl font-black text-sm transition-all active:scale-95 ${
                            isActive ? 'bg-black text-white shadow-md' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                          }`}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>
                </div>

              </form>
            </div>

            <div className="p-6 border-t shrink-0 bg-gray-50 rounded-b-3xl flex gap-3">
              <button disabled={loading} type="button" onClick={() => setIsProductModalOpen(false)} className="px-6 py-4 rounded-xl font-bold bg-gray-200 text-gray-700 hover:bg-gray-300 transition shadow-sm active:scale-95">إلغاء</button>
              <button disabled={loading} type="submit" form="productForm" className="flex-1 bg-black text-white py-4 rounded-xl font-bold hover:bg-gray-900 transition flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-black/20">
                {loading ? "جاري المعالجة..." : editingId ? <><Save className="w-5 h-5" /> حفظ التعديلات</> : <><Plus className="w-5 h-5" /> نشر المنتج</>}
              </button>
            </div>
          </div>
        </div>
      )}

       {/* Navbar Minimalist */}
      <nav className="bg-white border-b sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 md:h-20 flex items-center justify-between">
          <div className="flex items-center gap-2.5 md:gap-3">
            <div className="w-9 h-9 md:w-10 md:h-10 bg-black text-white flex items-center justify-center rounded-xl shadow-lg shadow-black/20">
              <Settings className="w-4 h-4 md:w-5 md:h-5" />
            </div>
            <div>
              <h1 className="font-black text-base md:text-xl tracking-tight leading-tight">مركز التحكم</h1>
              <p className="text-[8px] md:text-[10px] text-gray-400 font-bold uppercase tracking-widest">Admin Panel v2.0</p>
            </div>
          </div>
          <button
            onClick={() => setIsAuthenticated(false)}
            className="bg-gray-50 hover:bg-red-50 px-3 py-2 md:px-4 md:py-2.5 rounded-xl text-black hover:text-red-600 transition flex items-center gap-2 text-xs md:text-sm font-bold active:scale-95"
          >
            <span className="hidden xs:inline">الخروج</span> <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6 md:py-10">
        {/* Modern Pills Tabs */}
        <div className="flex flex-nowrap gap-2 mb-10 bg-white p-2 w-full sm:w-fit rounded-2xl shadow-sm border border-gray-100 overflow-x-auto no-scrollbar scroll-smooth">
          <button onClick={() => setActiveTab("products")} className={`whitespace-nowrap flex-1 px-5 sm:px-8 py-3 rounded-xl font-bold transition-all text-xs sm:text-sm ${activeTab === 'products' ? 'bg-black text-white shadow-md' : 'text-gray-500 hover:bg-gray-50 hover:text-black'}`}>
            إدارة المنتجات
          </button>
          <button onClick={() => setActiveTab("promos")} className={`whitespace-nowrap flex-1 px-5 sm:px-8 py-3 rounded-xl font-bold transition-all text-xs sm:text-sm ${activeTab === 'promos' ? 'bg-black text-white shadow-md' : 'text-gray-500 hover:bg-gray-50 hover:text-black'}`}>
            العروض والخصومات
          </button>
          <button onClick={() => setActiveTab("settings")} className={`whitespace-nowrap flex-1 px-5 sm:px-8 py-3 rounded-xl font-bold transition-all text-xs sm:text-sm ${activeTab === 'settings' ? 'bg-black text-white shadow-md' : 'text-gray-500 hover:bg-gray-50 hover:text-black'}`}>
            إعدادات المتجر
          </button>
        </div>

        {/* --- TAB: PRODUCTS --- */}
        {activeTab === "products" && (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <h2 className="text-2xl font-black flex items-center gap-3">
                المخزون <span className="text-sm bg-gray-100 text-black px-3 py-1 rounded-full font-bold">{products.length} منتج</span>
              </h2>
              <button onClick={openAddProduct} className="w-full sm:w-auto bg-black text-white px-6 py-3.5 rounded-xl font-bold hover:bg-gray-800 transition shadow-lg shadow-black/20 flex items-center justify-center gap-2 active:scale-95">
                <Plus className="w-5 h-5" /> أضف منتج جديد
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {products.map(product => {
                const sizesObj = product.variants?.sizes || product.variants || {};
                const colorsArr = product.variants?.colors || [];

                return (
                  <div key={product.id} className="bg-white p-5 rounded-3xl shadow-sm hover:shadow-xl border border-gray-100 transition-all duration-300 group flex flex-col">
                    <div className="flex gap-4 mb-4">
                      <div className="w-24 h-32 bg-gray-50 rounded-2xl overflow-hidden shrink-0 border border-gray-100 relative">
                        {product.image_url ? (
                          <img src={product.image_url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition duration-700" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-gray-400 font-medium">بدون صور</div>
                        )}
                        <div className="absolute top-2 right-2 bg-white/90 backdrop-blur text-[10px] font-black px-2 py-1 rounded-md shadow-sm">
                          {product.category}
                        </div>
                      </div>
                      <div className="flex-1 py-1 overflow-hidden">
                        <h3 className="font-black text-lg leading-tight mb-2 text-gray-900 group-hover:text-amber-700 transition-colors truncate">{product.name}</h3>
                        <p className="text-black font-black bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 inline-block text-sm shadow-sm">{Number(product.price).toLocaleString()} د.ع</p>

                        {colorsArr.length > 0 && (
                          <div className="mt-3 flex gap-1 flex-wrap overflow-hidden h-7">
                            {colorsArr.map((color, i) => (
                              <span key={i} className="text-[10px] bg-white border border-gray-200 shadow-sm text-gray-700 px-2 py-1 rounded-md font-bold flex items-center gap-1 whitespace-nowrap">
                                {color.image_url && <span className="w-2 h-2 rounded-full bg-green-400/20"><ImageIcon className="w-2 h-2 text-green-600" /></span>}
                                {color.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-auto border-t border-gray-100 pt-4 pb-2">
                      <p className="text-[11px] uppercase tracking-wider text-gray-400 font-bold mb-2">إمداد المقاسات السريع:</p>
                      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-2 no-scrollbar">
                        {(SIZE_TEMPLATES[product.variants?.size_type || 'ALPHA']?.values || SIZE_TEMPLATES.ALPHA.values).map(size => {
                          const isAvailable = sizesObj[size] !== false;
                          return (
                            <button
                              key={size}
                              onClick={() => toggleVariantFast(product, size)}
                              className={`w-9 h-9 shrink-0 rounded-lg font-bold text-[10px] transition-all ${isAvailable ? 'bg-black text-white shadow-md hover:bg-gray-800' : 'bg-gray-50 text-gray-300 border border-gray-200 hover:bg-gray-100'}`}
                            >
                              {size}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex gap-2 border-t border-gray-100 pt-4">
                      <button onClick={() => openEditProduct(product)} className="flex-1 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-black py-3 rounded-xl text-sm font-bold transition flex justify-center items-center gap-2 active:scale-95 shadow-sm">
                        <Edit3 className="w-4 h-4" /> تعديل
                      </button>
                      <button onClick={() => deleteProduct(product)} className="w-12 shrink-0 bg-white hover:bg-red-500 hover:border-red-500 hover:text-white text-red-500 border border-red-100 transition shadow-sm rounded-xl flex items-center justify-center active:scale-95">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {products.length === 0 && (
              <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-gray-300 shadow-sm mt-8">
                <div className="inline-block p-5 bg-gray-50 rounded-full mb-6">
                  <ImageIcon className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="font-black text-2xl text-gray-900 mb-2">المخزون فارغ تماماً</h3>
                <p className="text-gray-500 font-medium">ابدأ الآن ببناء إمبراطوريتك وأضف أول مجموعة أزياء.</p>
              </div>
            )}
          </div>
        )}

        {/* --- TAB: PROMOS --- */}
        {activeTab === "promos" && (
          <div className="grid lg:grid-cols-12 gap-8 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4">
            <div className="lg:col-span-12 xl:col-span-5">
              <form onSubmit={addPromoCode} className="bg-white p-6 md:p-8 rounded-3xl shadow-xl shadow-black/5 border border-gray-100 md:sticky md:top-28">
                <div className="w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center mb-6 shadow-md"><Percent className="w-6 h-6" /></div>
                <h2 className="text-xl font-black mb-6">إصدار كود جديد</h2>
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-2">كود الخصم</label>
                      <input required type="text" value={newPromo.code} onChange={e => setNewPromo({ ...newPromo, code: e.target.value })} className="w-full p-4 rounded-xl border border-gray-200 focus:border-black outline-none uppercase font-mono bg-gray-50 focus:bg-white transition shadow-inner" placeholder="الكود" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-2">قيمة الخصم (د.ع)</label>
                      <input required min="0" type="number" value={newPromo.discount_value} onChange={e => setNewPromo({ ...newPromo, discount_value: e.target.value })} className="w-full p-4 rounded-xl border border-gray-200 focus:border-black outline-none bg-gray-50 focus:bg-white transition shadow-inner" placeholder="المبلغ" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2 flex justify-between">
                      تاريخ انتهاء الصلاحية <span className="text-gray-400 text-[10px]">(اختياري)</span>
                    </label>
                    <input type="datetime-local" value={newPromo.expires_at} onChange={e => setNewPromo({ ...newPromo, expires_at: e.target.value })} className="w-full p-4 rounded-xl border border-gray-200 focus:border-black outline-none bg-gray-50 focus:bg-white transition shadow-inner" />
                  </div>
                  <button type="submit" className="w-full bg-black text-white py-4 rounded-xl font-bold hover:bg-gray-800 transition mt-2 shadow-lg shadow-black/20 active:scale-95">إطلاق الكود للجمهور</button>
                </div>
              </form>
            </div>

            <div className="lg:col-span-12 xl:col-span-7 space-y-4">
              <h2 className="text-xl font-black mb-6 flex items-center gap-2">الأكواد الفعّالة <span className="text-sm bg-black text-white px-2 py-0.5 rounded-md">{promoCodes.length}</span></h2>
              {promoCodes.map(promo => {
                const isExpired = promo.expires_at && new Date(promo.expires_at) < new Date();
                const statusBadge = isExpired ?
                  <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-[10px] font-bold border border-red-200">منتهي العرض</span> :
                  (!promo.is_active ?
                    <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-[10px] font-bold border border-gray-200">متوقف</span> :
                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-bold border border-green-200">فعّال</span>
                  );

                return (
                  <div key={promo.id} className={`p-5 md:p-6 rounded-3xl border flex flex-col md:flex-row gap-4 items-start md:items-center justify-between transition-all hover:shadow-lg ${promo.is_active && !isExpired ? 'bg-white border-gray-200 shadow-sm' : 'bg-gray-50 border-gray-100 opacity-80'}`}>
                    <div className="flex gap-4 items-center w-full">
                      <div className="w-12 h-12 bg-gray-100 rounded-xl flex border border-dashed border-gray-300 items-center justify-center text-gray-400 shrink-0">
                        <Percent className="w-5 h-5" />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-black font-mono text-xl tracking-wider text-black">{promo.code}</h4>
                          {statusBadge}
                        </div>
                        <p className="text-gray-500 text-xs mt-1 font-medium flex flex-wrap items-center gap-2">
                          <span>خصم: <span className="text-green-600 bg-green-50 px-1 rounded font-bold">{promo.discount_value.toLocaleString()} د.ع</span></span>
                        </p>
                      </div>
                    </div>
                    <div className="flex w-full md:w-auto mt-2 md:mt-0 items-center gap-2">
                      <button
                        onClick={() => togglePromoStatus(promo)}
                        className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 ${promo.is_active ? 'bg-black text-white hover:bg-gray-800' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                      >
                        {promo.is_active ? 'إيقاف' : 'تنشيط'}
                      </button>
                      <button onClick={() => deletePromoCode(promo.id)} className="p-2.5 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-xl transition border border-transparent hover:border-red-100">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {promoCodes.length === 0 && (
                <div className="text-center py-20 text-gray-400 bg-white rounded-3xl border border-dashed border-gray-200 shadow-sm">
                  لا توجد أكواد حالياً.
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- TAB: SETTINGS --- */}
        {activeTab === "settings" && (
          <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 space-y-8">
            <div className="grid md:grid-cols-2 gap-6 md:gap-8 overflow-hidden pointer-events-auto">
              {/* Card: WhatsApp */}
              <div className="bg-white p-6 md:p-10 rounded-[32px] border border-gray-100 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />

                <div className="relative">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-green-500 rounded-2xl flex items-center justify-center shadow-lg shadow-green-200">
                      <Phone className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-gray-900">الواتساب</h2>
                      <p className="text-[11px] text-gray-400 font-bold">الرقم الرئيسي لاستقبال الطلبات.</p>
                    </div>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      value={settings.whatsapp_number || ""}
                      onChange={(e) => setSettings({...settings, whatsapp_number: e.target.value})}
                      placeholder="رقم الواتساب هنا"
                      dir="ltr"
                      className="w-full p-4 md:p-5 bg-gray-50 border-2 border-transparent focus:border-black focus:bg-white rounded-2xl text-lg md:text-2xl font-black text-center tracking-wider transition-all outline-none"
                    />
                    <div className="absolute -bottom-6 left-0 right-0 text-center">
                      <span className="text-[9px] text-gray-400 font-bold bg-white px-3 py-1 rounded-full border border-gray-100">أدخل الرقم بدون علامة +</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card: Global Bundle Rule */}
              <div className="bg-gray-900 p-6 md:p-10 rounded-[32px] shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />

                <div className="relative">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md">
                        <Zap className="w-6 h-6 text-yellow-400" />
                      </div>
                      <div>
                        <h2 className="text-xl font-black text-white">نظام الخصم</h2>
                        <p className="text-[11px] text-gray-400 font-bold">يطبق عند تجاوز عدد القطع.</p>
                      </div>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${settings.bundle_amount > 0 ? "bg-green-500 border-green-500" : "border-white/20"}`}>
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">قيمة الخصم</label>
                      <input
                        type="number"
                        value={settings.bundle_amount}
                        onChange={(e) => setSettings({...settings, bundle_amount: e.target.value})}
                        className="w-full p-4 bg-white/5 border border-white/10 focus:border-white/30 rounded-2xl text-lg font-black text-white text-center outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">عند شراء</label>
                      <input
                        type="number"
                        value={settings.bundle_threshold}
                        onChange={(e) => setSettings({...settings, bundle_threshold: e.target.value})}
                        className="w-full p-4 bg-white/5 border border-white/10 focus:border-white/30 rounded-2xl text-lg font-black text-white text-center outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 md:p-10 rounded-[32px] border border-gray-100 shadow-sm relative overflow-hidden">
               <div className="relative z-10">
                <h2 className="text-2xl font-black mb-8 flex items-center gap-3"><Settings className="w-7 h-7" /> هوية المتجر (العلامة البيضاء)</h2>

                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">اسم المتجر</label>
                      <input type="text" value={settings.store_name} onChange={e => setSettings({ ...settings, store_name: e.target.value })} className="w-full p-4 rounded-xl border border-gray-200 focus:border-black outline-none bg-gray-50 focus:bg-white transition" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">وصف قصير (Bio)</label>
                      <input type="text" placeholder="اكتب وصفاً مختصراً لمتجرك" value={settings.store_bio} onChange={e => setSettings({ ...settings, store_bio: e.target.value })} className="w-full p-4 rounded-xl border border-gray-200 focus:border-black outline-none bg-gray-50 focus:bg-white transition" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                     <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">اللون الأساسي</label>
                      <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-xl border border-gray-200">
                        <input type="color" value={settings.primary_color} onChange={e => setSettings({ ...settings, primary_color: e.target.value })} className="h-10 w-10 rounded-lg cursor-pointer border-0 p-0" />
                        <span className="text-[10px] font-mono font-bold text-gray-400 truncate">{settings.primary_color}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-50">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-3">صورة الشعار (Logo)</label>
                      <div className="flex items-center gap-4">
                        <label className="flex-1 flex flex-col items-center justify-center p-6 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:border-black transition">
                          <UploadCloud className="w-6 h-6 text-gray-400 mb-2" />
                          <span className="text-[10px] text-gray-400 font-bold">رفع شعار جديد</span>
                          <input type="file" className="hidden" accept="image/*" onChange={e => setLogoFile(e.target.files[0])} />
                        </label>
                        {(logoFile || settings.store_logo) && (
                          <div className="w-24 h-24 rounded-2xl border border-gray-100 p-2 bg-white flex items-center justify-center overflow-hidden">
                            <img src={logoFile ? URL.createObjectURL(logoFile) : settings.store_logo} className="w-full h-full object-contain" />
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-3">صورة الغلاف (Cover)</label>
                      <div className="flex flex-col gap-4">
                        <label className="flex flex-col items-center justify-center p-6 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:border-black transition">
                          <UploadCloud className="w-6 h-6 text-gray-400 mb-2" />
                          <span className="text-[10px] text-gray-400 font-bold">رفع غلاف جديد</span>
                          <input type="file" className="hidden" accept="image/*" onChange={e => setCoverFile(e.target.files[0])} />
                        </label>
                        {(coverFile || settings.store_cover) && (
                          <img src={coverFile ? URL.createObjectURL(coverFile) : settings.store_cover} className="w-full h-24 object-cover rounded-2xl border border-gray-100" />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-8 border-t border-gray-50">
                    <h3 className="text-lg font-bold text-black mb-4">إدارة الأقسام (التصنيفات)</h3>
                    <div className="flex flex-wrap gap-2 mb-6 min-h-[50px]">
                      {settings.categories.map(cat => (
                        <span key={cat} className="bg-gray-50 border border-gray-200 text-black px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 group cursor-default">
                          {cat}
                          <button onClick={() => removeCategory(cat)} className="w-5 h-5 bg-white text-gray-300 hover:text-red-500 rounded-full flex items-center justify-center transition shadow-sm border border-gray-100">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        className="flex-1 border border-gray-300 p-3.5 rounded-xl bg-gray-50 focus:bg-white outline-none focus:border-black font-medium transition-colors"
                        placeholder="اسم القسم"
                        value={newCatInput}
                        onChange={e => setNewCatInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addCategory()}
                      />
                      <button onClick={addCategory} className="bg-black text-white px-6 rounded-xl font-bold hover:bg-gray-800 transition shadow-md active:scale-95">إضافة</button>
                    </div>
                  </div>
                </div>

                <div className="mt-10 border-t pt-8 flex">
                  <button onClick={saveSettings} disabled={loading} className="w-full bg-[#20bd5a] hover:bg-[#1da24d] text-white py-5 rounded-2xl font-black text-lg transition flex items-center justify-center gap-2 shadow-xl shadow-green-500/30 active:scale-[0.98]">
                    {loading ? "جاري الحفظ..." : <><Save className="w-6 h-6" /> تأكيد وتحديث نظام المتجر بالكامل</>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
