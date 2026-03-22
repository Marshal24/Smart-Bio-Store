"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ShoppingBag, Search, X, Plus, Minus, Trash2, MapPin, Percent, Check, MessageCircle, Filter, BadgeCheck } from 'lucide-react';

export default function StoreFront() {
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState({
    whatsapp_number: "9647700000000",
    bundle_amount: 5000,
    bundle_threshold: 2,
    categories: ["فساتين", "بدلات", "قمصان", "اكسسوارات"]
  });
  const [loading, setLoading] = useState(true);

  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("الكل");

  // Selection Modal State
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState(null); // stores color object or string
  const [activeModalImage, setActiveModalImage] = useState("");

  // Cart & Checkout State
  const [cart, setCart] = useState([]);
  const [governorate, setGovernorate] = useState("Kirkuk");
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [promoError, setPromoError] = useState("");
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const GOVERNORATES = [
    "Kirkuk", "Baghdad", "Basra", "Erbil", "Najaf", "Karbala",
    "Sulaymaniyah", "Duhok", "Nineveh", "Anbar", "Babil", "Dhi Qar",
    "Diyala", "Maysan", "Muthanna", "Al Qadisiyyah", "Saladin", "Wasit", "Halabja"
  ];

  const SIZES = ["S", "M", "L", "XL", "XXL"];
  const SIZE_TEMPLATES = {
    ALPHA: ["S", "M", "L", "XL", "XXL", "XXXL"],
    PANTS: ["28", "29", "30", "31", "32", "33", "34", "36", "38", "40"],
    SHOES: ["37", "38", "39", "40", "41", "42", "43", "44", "45"],
    KIDS: ["1", "2", "3", "4", "5", "6"]
  };

  useEffect(() => {
    fetchBaseData();

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 200);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (settings.store_name) {
      document.title = `${settings.store_name} | Smart Store`;
    }
  }, [settings.store_name]);

  const fetchBaseData = async () => {
    try {
      const [productsRes, settingsRes] = await Promise.all([
        supabase.from("products").select("*").order("created_at", { ascending: false }),
        supabase.from("store_settings").select("*").eq("id", 1).single()
      ]);

      if (productsRes.error) throw productsRes.error;
      setProducts(productsRes.data || []);

      if (settingsRes.data) {
        setSettings({
          ...settingsRes.data,
          categories: settingsRes.data.categories || ["فساتين", "بدلات", "قمصان", "اكسسوارات"]
        });
      }
    } catch (error) {
      console.error("Error fetching data:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchQuery = p.name.includes(searchQuery);
    const matchCat = activeCategory === "الكل" || p.category === activeCategory;
    return matchQuery && matchCat;
  });

  const verifyPromoCode = async () => {
    if (!promoCode.trim()) return;
    setPromoError("");
    setAppliedPromo(null);

    try {
      const { data, error } = await supabase
        .from("promo_codes")
        .select("*")
        .eq("code", promoCode.trim().toUpperCase())
        .single();

      if (error || !data || !data.is_active) {
        setPromoError("رمز الخصم غير صحيح أو متوقف");
        return;
      }

      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setPromoError("عذراً، هذا العرض قد انتهت صلاحيته");
        return;
      }

      setAppliedPromo(data);
    } catch (error) {
      setPromoError("حدث خطأ أثناء التحقق من الرمز");
    }
  };

  const openProductModal = (product) => {
    setSelectedProduct(product);
    setSelectedSize("");
    setSelectedColor(null);
    setActiveModalImage(product.image_url);
  };

  const handleColorSelection = (colorObj) => {
    setSelectedColor(colorObj);
    const isLegacy = typeof colorObj === "string";
    const imageUrl = isLegacy ? null : colorObj.image_url;
    if (imageUrl) {
      setActiveModalImage(imageUrl);
    } else {
      setActiveModalImage(selectedProduct.image_url);
    }

    // NEW: If the current selected size is not available for this new color, clear it.
    if (selectedSize) {
      const colorSizes = (colorObj && typeof colorObj !== "string" && colorObj.sizes)
        ? colorObj.sizes
        : (selectedProduct.variants?.sizes || selectedProduct.variants || {});

      if (colorSizes[selectedSize] === false) {
        setSelectedSize("");
      }
    }
  };

  const addToCart = () => {
    if (!selectedSize) return;

    const productColors = selectedProduct.variants?.colors || [];
    if (productColors.length > 0 && !selectedColor) return;

    const colorName = selectedColor ? (typeof selectedColor === "string" ? selectedColor : selectedColor.name) : "";
    const colorImage = selectedColor && typeof selectedColor !== "string" ? selectedColor.image_url : null;
    const itemImage = colorImage || selectedProduct.image_url;

    const existingIndex = cart.findIndex(
      (i) => i.id === selectedProduct.id && i.selectedSize === selectedSize && i.selectedColor === colorName
    );

    if (existingIndex >= 0) {
      const newCart = [...cart];
      newCart[existingIndex].quantity += 1;
      setCart(newCart);
    } else {
      setCart([...cart, {
        ...selectedProduct,
        selectedSize,
        selectedColor: colorName,
        displayImage: itemImage,
        quantity: 1
      }]);
    }

    setSelectedProduct(null);
    setSelectedSize("");
    setSelectedColor(null);
  };

  const updateQuantity = (index, delta) => {
    const newCart = [...cart];
    newCart[index].quantity += delta;
    if (newCart[index].quantity <= 0) {
      newCart.splice(index, 1);
    }
    setCart(newCart);
  };

  const removeFromCart = (index) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  // Calculations
  const cartItemsQty = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const deliveryFee = governorate === "Kirkuk" ? 3000 : 5000;

  // Dynamic Bundle Discount
  let bundleDiscount = 0;
  if (cartItemsQty >= settings.bundle_threshold) {
    bundleDiscount = Number(settings.bundle_amount);
  }

  const promoDiscount = appliedPromo ? appliedPromo.discount_value : 0;
  const grandTotal = subtotal + deliveryFee - bundleDiscount - promoDiscount;

  const handleWhatsAppCheckout = () => {
    const storeName = settings.store_name || "Boutique";

    let itemsText = cart.map(item => {
      const colorText = item.selectedColor ? ` | اللون: ${item.selectedColor}` : "";
      return `- ${item.name} | المقاس: ${item.selectedSize}${colorText} | الكمية: ${item.quantity}`;
    }).join("%0A");

    const message = `مرحباً، أود الطلب من متجركم (${storeName})%0A%0Aالطلبات:%0A${itemsText}%0A%0Aالمدينة: ${governorate}%0Aسعر التوصيل: ${deliveryFee.toLocaleString()} د.ع%0A${bundleDiscount > 0 ? `خصم العرض: -${bundleDiscount.toLocaleString()} د.ع%0A` : ""}${promoDiscount > 0 ? `خصم البرومو كود: -${promoDiscount.toLocaleString()} د.ع%0A` : ""}المجموع الكلي: ${Math.max(0, grandTotal).toLocaleString()} د.ع%0A%0Aالرجاء الرد لتأكيد الطلب واستلام عنواني الكامل.`;

    window.open(`https://wa.me/${settings.whatsapp_number}?text=${message}`, "_blank");

    // إفراغ السلة وإغلاق النافذة بعد ثانية واحدة لضمان انتقال الزبون للواتساب أولاً
    setTimeout(() => {
      setCart([]);
      setCheckoutModalOpen(false);
    }, 1000);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24 min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="w-full pb-32 min-h-screen bg-[#F9FAFB] selection:bg-black selection:text-white">
      {/* Sticky Brand Header (Ultra-Luxury Floating Pill) */}
      <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${isScrolled ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-12 opacity-0 scale-90 pointer-events-none'}`}>
        <div className="bg-white/40 backdrop-blur-3xl border border-white/40 px-5 py-2.5 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.1)] flex items-center gap-4 group hover:bg-white/60 transition-all cursor-pointer ring-1 ring-black/5" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full border-2 border-white shadow-md overflow-hidden bg-white shrink-0 group-hover:scale-105 transition-transform duration-500">
            <img src={settings.store_logo} className="w-full h-full object-cover" alt="" />
          </div>
          <div className="flex flex-col">
            <h2 className="font-black text-sm sm:text-base tracking-tighter flex items-center gap-1.5 leading-none" style={{ color: settings.primary_color || '#000' }}>
              {settings.store_name}
              <span className="flex items-center justify-center w-3 h-3 sm:w-4 sm:h-4 rounded-full shrink-0 -translate-y-0.5" style={{ backgroundColor: settings.primary_color || '#000' }}>
                <Check className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-white" strokeWidth={6} />
              </span>
            </h2>
            <span className="text-[9px] uppercase font-black tracking-widest text-gray-500 mt-0.5 opacity-60">تصفح الآن</span>
          </div>

          <div className="w-[1px] h-6 bg-black/10 mx-1"></div>

          <button
            onClick={(e) => { e.stopPropagation(); setCheckoutModalOpen(true); }}
            className="p-2.5 bg-white rounded-full hover:scale-110 transition relative shadow-sm border border-black/5"
            style={{ color: settings.primary_color || '#000' }}
          >
            <ShoppingBag className="w-5 h-5" />
            {cartItemsQty > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-black w-4 h-4 flex items-center justify-center rounded-full border-2 border-white animate-in zoom-in">
                {cartItemsQty}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Ultra-Premium Hero Cover Section */}
      <div className="relative w-full h-48 sm:h-64 bg-gray-200 overflow-hidden">
        {settings.store_cover ? (
          <>
            <img src={settings.store_cover} alt="Cover" className="w-full h-full object-cover select-none" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#F9FAFB] via-transparent to-black/20"></div>
          </>
        ) : (
          <div className="w-full h-full relative" style={{ background: `linear-gradient(135deg, ${settings.primary_color || '#000'}CC, ${settings.primary_color || '#000'}FF)` }}>
            <div className="absolute inset-0 bg-gradient-to-t from-[#F9FAFB] to-transparent"></div>
          </div>
        )}

        {/* Luxury Floating Cart Button */}
        <button
          onClick={() => setCheckoutModalOpen(true)}
          className="absolute top-5 left-5 z-20 bg-white/70 backdrop-blur-xl border border-white/50 p-3.5 rounded-2xl hover:scale-105 transition-all duration-300 shadow-xl flex items-center justify-center group"
          style={{ color: settings.primary_color || '#000000' }}
        >
          <ShoppingBag className="w-6 h-6 group-hover:block transition-transform" />
          {cartItemsQty > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[11px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-white animate-in zoom-in shadow-sm">
              {cartItemsQty}
            </span>
          )}
        </button>
      </div>

      {/* Elite Brand Profile Section */}
      <div className="max-w-7xl mx-auto px-4 relative -mt-16 sm:-mt-20 mb-8 flex flex-col items-center text-center">
        {/* Avatar with Halo effect */}
        <div className="relative mb-4 group">
          <div className="absolute inset-0 rounded-full blur-md opacity-20 group-hover:opacity-40 transition-opacity duration-500" style={{ backgroundColor: settings.primary_color || '#000' }}></div>
          <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-full border-4 border-[#F9FAFB] bg-white shadow-2xl overflow-hidden flex items-center justify-center z-10 transition-transform duration-500 hover:scale-105">
            {settings.store_logo ? (
              <img src={settings.store_logo} alt={settings.store_name} className="w-full h-full object-cover select-none" />
            ) : (
              <span className="text-4xl font-black bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(to bottom right, ${settings.primary_color || '#000'}, #666)` }}>
                {(settings.store_name || "Boutique").charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        </div>

        {/* Verified Brand Name */}
        <div className="flex justify-center mb-2">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tighter leading-tight flex items-center gap-2" style={{ color: settings.primary_color || '#000000' }}>
            {settings.store_name || "Boutique"}
            <span className="flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5 shrink-0 -translate-y-0.5 sm:-translate-y-1">
              <span className="relative w-full h-full rounded-full flex items-center justify-center shadow-sm" style={{ backgroundColor: settings.primary_color || '#000' }}>
                <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" strokeWidth={5} />
              </span>
            </span>
          </h1>
        </div>

        {/* Elegant Bio */}
        {settings.store_bio && (
          <p className="text-sm sm:text-base font-semibold text-gray-500 max-w-md leading-relaxed px-4">{settings.store_bio}</p>
        )}
      </div>

      <div className="w-full max-w-7xl mx-auto px-4">
        {/* Search & Categories Navbar */}
        <div className="mb-8 space-y-6">
          <div className="relative max-w-2xl mx-auto">
            <input
              type="text"
              placeholder="البحث عن منتج..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-white/80 backdrop-blur-md border border-gray-200/60 p-4 pl-12 rounded-full shadow-sm outline-none focus:border-gray-400 focus:bg-white font-medium transition-all text-sm"
            />
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>

          <div className="flex gap-2.5 overflow-x-auto pb-4 custom-scrollbar justify-start sm:justify-center">
            <button
              onClick={() => setActiveCategory("الكل")}
              className={`px-6 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all active:scale-95 
              ${activeCategory === "الكل" ? "text-white shadow-md" : "text-gray-500 hover:text-black hover:bg-white bg-transparent"}`}
              style={activeCategory === "الكل" ? { backgroundColor: settings.primary_color || '#000000' } : {}}
            >
              الكل
            </button>
            {settings.categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-6 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all active:scale-95 
                ${activeCategory === cat ? "text-white shadow-md" : "text-gray-500 hover:text-black hover:bg-white bg-transparent"}`}
                style={activeCategory === cat ? { backgroundColor: settings.primary_color || '#000000' } : {}}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Editorial Product Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-10 sm:gap-x-8 sm:gap-y-16">
          {filteredProducts.map((product) => {
            const colorsArr = product.variants?.colors || [];
            return (
              <div
                key={product.id}
                className="group cursor-pointer flex flex-col relative"
                onClick={() => openProductModal(product)}
              >
                <div className="bg-gray-100 aspect-[3/4] rounded-[24px] overflow-hidden relative shadow-sm border border-black/5">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs font-medium">بدون صورة</div>
                  )}

                  {/* Luxury Hover Overlay */}
                  <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center backdrop-blur-[2px]">
                    <div className="bg-white/90 backdrop-blur-md text-black w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                      <ShoppingBag className="w-6 h-6" />
                    </div>
                  </div>
                </div>

                <div className="mt-4 px-1 text-center">
                  <h3 className="font-bold text-gray-900 tracking-tight text-sm sm:text-base leading-snug">{product.name}</h3>
                  <div className="flex flex-col items-center mt-2.5 gap-2">
                    <p className="font-bold text-[13px] sm:text-sm tracking-wide" style={{ color: settings.primary_color || '#666' }}>
                      {Number(product.price).toLocaleString()} د.ع
                    </p>
                    {colorsArr.length > 0 && (
                      <div className="flex -space-x-1.5 space-x-reverse">
                        {colorsArr.slice(0, 3).map((color, i) => {
                          const hasImg = typeof color !== "string" && color.image_url;
                          return (
                            <div key={i} className={`w-4 h-4 rounded-full border border-gray-300 ring-2 ring-white shadow-sm overflow-hidden ${hasImg ? 'bg-transparent' : 'bg-gray-200'}`}>
                              {hasImg && <img src={color.image_url} className="w-full h-full object-cover" />}
                            </div>
                          );
                        })}
                        {colorsArr.length > 3 && <span className="text-[10px] text-gray-400 font-bold mr-2">+{colorsArr.length - 3}</span>}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {filteredProducts.length === 0 && (
            <div className="col-span-full py-24 text-center text-gray-500 bg-white/50 backdrop-blur-sm shadow-sm rounded-[24px] border border-gray-100">
              <Filter className="w-12 h-12 mx-auto mb-4 text-gray-300 opacity-50" />
              <p className="text-xl font-bold text-gray-900 mb-1 tracking-tight">لا توجد نتائج</p>
              <p className="font-medium text-sm">لم نعثر على أي منتجات تتوافق مع بحثك في هذا القسم.</p>
            </div>
          )}
        </div>

        {/* Selection Modal */}
        {selectedProduct && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-md transition-opacity">
            <div className="bg-white w-full max-w-xl max-h-[92vh] sm:max-h-[85vh] flex flex-col rounded-[32px] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-6 duration-500">
              <div className="overflow-y-auto custom-scrollbar flex-1 pb-2">
                <div className="relative aspect-[4/5] sm:aspect-square shrink-0 bg-gray-50">
                  {activeModalImage && (
                    <img
                      src={activeModalImage}
                      alt={selectedProduct.name}
                      className="w-full h-full object-cover animate-in fade-in duration-500"
                    />
                  )}
                  <button
                    onClick={() => setSelectedProduct(null)}
                    className="absolute top-5 right-5 z-10 p-3 bg-white/80 backdrop-blur-md shadow-sm rounded-full hover:bg-white hover:scale-105 transition-all"
                  >
                    <X className="w-5 h-5 text-gray-900" />
                  </button>
                </div>

                <div className="p-6 sm:p-8">
                  <div className="flex justify-between items-start mb-8 border-b border-gray-100 pb-6">
                    <div>
                      <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight text-gray-900">{selectedProduct.name}</h2>
                      <p className="text-xs sm:text-sm text-gray-500 mt-2 font-bold inline-block bg-gray-50 px-3 py-1 rounded-lg border border-gray-100">{selectedProduct.category}</p>
                    </div>
                    <p className="text-xl sm:text-2xl font-black tracking-tight" style={{ color: settings.primary_color || '#000000' }}>
                      {Number(selectedProduct.price).toLocaleString()} د.ع
                    </p>
                  </div>

                  {/* Step 1: Color Selection (if applicable) */}
                  {(selectedProduct.variants?.colors || []).length > 0 && (
                    <div className="mb-8 bg-gray-50/50 rounded-3xl border border-gray-100 p-5">
                      <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2 tracking-wide">الخطوة 1: تحديد اللون <span className="text-[10px] bg-white px-2 py-1 rounded-md text-gray-500 font-bold border border-gray-200 shadow-sm ml-auto">الصورة تتغير حسب اختيارك</span></h3>
                      <div className="flex flex-wrap gap-2.5">
                        {selectedProduct.variants.colors.map((colorObj, idx) => {
                          const isLegacy = typeof colorObj === "string";
                          const cName = isLegacy ? colorObj : colorObj.name;
                          const cImage = isLegacy ? null : colorObj.image_url;
                          const isSelected = selectedColor === colorObj || selectedColor === cName || selectedColor?.name === cName;

                          return (
                            <button
                              key={idx}
                              onClick={() => handleColorSelection(colorObj)}
                              className={`flex items-center gap-2 p-1.5 pr-4 min-h-[48px] border-2 rounded-2xl font-bold transition-all active:scale-95
                              ${isSelected
                                  ? "text-white shadow-lg scale-105"
                                  : "border-gray-200 bg-white hover:border-black text-black"
                                }
                            `}
                              style={isSelected ? { ...((settings.primary_color && settings.primary_color !== '#000000') ? { backgroundColor: settings.primary_color, borderColor: settings.primary_color } : { backgroundColor: '#000', borderColor: '#000' }) } : {}}
                            >
                              {cImage && <img src={cImage} className="w-8 h-8 rounded-xl object-cover border border-white/20 shadow-sm" />}
                              <span className={cImage ? "text-sm" : "text-sm ml-2"}>{cName}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Step 2: Size Selection (Dynamic) */}
                  <div className="mb-8">
                    <h3 className="text-sm font-bold text-gray-900 mb-4 inline-block tracking-wide">الخطوة 2: تحديد المقاس</h3>
                    <div className="flex flex-wrap gap-2.5">
                      {(SIZE_TEMPLATES[selectedProduct.variants?.size_type] || SIZE_TEMPLATES.ALPHA).map(size => {
                        const currentSource = (selectedColor && typeof selectedColor !== "string" && selectedColor.sizes)
                          ? selectedColor.sizes
                          : (selectedProduct.variants?.sizes || selectedProduct.variants || {});

                        const isAvailable = currentSource[size] !== false;

                        return (
                          <button
                            key={size}
                            disabled={!isAvailable}
                            onClick={() => setSelectedSize(size)}
                            className={`w-14 h-14 flex items-center justify-center border-2 rounded-2xl transition-all font-black text-base active:scale-95
                          ${!isAvailable
                                ? "bg-gray-50 border-transparent text-gray-300 cursor-not-allowed line-through relative overflow-hidden"
                                : selectedSize === size
                                  ? "text-white shadow-lg scale-105"
                                  : "border-gray-100 hover:border-black text-black bg-white"
                              }
                        `}
                            style={selectedSize === size ? { ...((settings.primary_color && settings.primary_color !== '#000000') ? { backgroundColor: settings.primary_color, borderColor: settings.primary_color } : { backgroundColor: '#000', borderColor: '#000' }) } : {}}
                          >
                            {size}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    disabled={!selectedSize || ((selectedProduct.variants?.colors || []).length > 0 && !selectedColor)}
                    onClick={addToCart}
                    className="w-full text-white py-4 mt-4 flex items-center justify-center gap-2 rounded-2xl font-bold tracking-wide text-lg disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-all shadow-xl active:scale-95 hover:opacity-90"
                    style={(!selectedSize || ((selectedProduct.variants?.colors || []).length > 0 && !selectedColor)) ? {} : { backgroundColor: settings.primary_color || '#000', boxShadow: `0 10px 25px -5px ${settings.primary_color || '#000'}40` }}
                  >
                    {!selectedSize ? "يرجى تحديد المقاس أولاً" :
                      ((selectedProduct.variants?.colors || []).length > 0 && !selectedColor) ? "يرجى تحديد اللون" :
                        <><ShoppingBag className="w-5 h-5" /> إضافة إلى الحقيبة</>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Checkout Modal */}
        {checkoutModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-md transition-opacity">
            <div className="bg-[#F9FAFB] w-full max-w-xl max-h-[90vh] overflow-y-auto custom-scrollbar rounded-[32px] shadow-2xl p-6 sm:p-8 animate-in slide-in-from-bottom-6 duration-500 border border-white">
              <div className="flex justify-between items-center mb-8 border-b border-gray-200 pb-5">
                <h2 className="text-2xl font-black tracking-tight flex items-center gap-2.5 text-gray-900"><ShoppingBag className="w-6 h-6" /> حقيبة التسوق</h2>
                <button onClick={() => setCheckoutModalOpen(false)} className="p-3 hover:bg-white bg-white/50 rounded-full transition focus:scale-95 text-gray-900 shadow-sm border border-gray-100">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {cart.length === 0 ? (
                <div className="py-20 text-center text-gray-500">
                  <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-gray-100">
                    <ShoppingBag className="w-10 h-10 text-gray-300" />
                  </div>
                  <p className="font-bold text-xl text-gray-900 tracking-tight">حقيبة التسوق فارغة</p>
                  <p className="text-sm mt-2 font-medium">أضف منتجات رائعة لتسوقها الآن.</p>
                </div>
              ) : (
                <>
                  <div className="space-y-4 mb-8">
                    {cart.map((item, idx) => (
                      <div key={idx} className="flex gap-4 p-4 border border-transparent hover:border-gray-200 bg-white rounded-[24px] shadow-sm transition-all group">
                        {item.displayImage ? (
                          <img src={item.displayImage} alt="" className="w-24 h-28 object-cover rounded-2xl border border-gray-50 shrink-0" />
                        ) : (
                          <div className="w-24 h-28 bg-gray-50 rounded-2xl flex items-center justify-center text-xs text-gray-400 border border-gray-50 shrink-0 font-medium">بدون صورة</div>
                        )}

                        <div className="flex flex-col flex-1 justify-between py-1.5">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-bold text-gray-900 leading-snug tracking-tight text-base">{item.name}</h4>
                              <div className="flex flex-wrap items-center gap-2 mt-2">
                                <span className="text-[11px] bg-gray-50 text-gray-600 px-2.5 py-1 rounded-md font-bold border border-gray-100">مقاس {item.selectedSize}</span>
                                {item.selectedColor && <span className="text-[11px] bg-gray-50 text-gray-600 px-2.5 py-1 rounded-md font-bold border border-gray-100">{item.selectedColor}</span>}
                              </div>
                            </div>
                            <button onClick={() => removeFromCart(idx)} className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2.5 rounded-xl transition"><Trash2 className="w-4 h-4" /></button>
                          </div>

                          <div className="flex justify-between items-center mt-3">
                            <span className="font-black text-sm tracking-wide" style={{ color: settings.primary_color || '#000000' }}>{(item.price * item.quantity).toLocaleString()} د.ع</span>

                            {/* Quantity Controls */}
                            <div className="flex items-center gap-3 border border-gray-100 rounded-xl p-1 px-2">
                              <button onClick={() => updateQuantity(idx, -1)} className="w-7 h-7 flex items-center justify-center bg-gray-50 rounded-lg hover:bg-gray-200 transition active:scale-95 text-gray-600"><Minus className="w-3.5 h-3.5 font-bold" /></button>
                              <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                              <button onClick={() => updateQuantity(idx, 1)} className="w-7 h-7 flex items-center justify-center bg-gray-50 rounded-lg hover:bg-gray-200 transition active:scale-95 text-gray-900"><Plus className="w-3.5 h-3.5 font-bold" /></button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-6 bg-white p-6 sm:p-8 rounded-[32px] border border-gray-100 shadow-sm">
                    {/* Governorate Logic */}
                    <div>
                      <label className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-3 tracking-wide"><MapPin className="w-4 h-4" /> مدينة التوصيل</label>
                      <div className="relative">
                        <select
                          value={governorate}
                          onChange={(e) => setGovernorate(e.target.value)}
                          className="w-full p-4.5 py-4 rounded-2xl border border-gray-200 outline-none focus:border-gray-900 appearance-none bg-gray-50/50 hover:bg-gray-50 focus:bg-white font-semibold transition-colors shadow-sm"
                        >
                          {GOVERNORATES.map(gov => <option key={gov} value={gov}>{gov} ({gov === "Kirkuk" ? "3,000" : "5,000"} د.ع)</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Promo Code Logic */}
                    <div>
                      <label className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-3 tracking-wide"><Percent className="w-4 h-4" /> رمز ترويجي</label>
                      <div className="flex gap-2.5">
                        <input
                          type="text"
                          value={promoCode}
                          onChange={(e) => setPromoCode(e.target.value)}
                          placeholder="أدخل الرمز هنا"
                          className="flex-1 p-4 rounded-2xl border border-gray-200 outline-none focus:border-gray-900 bg-gray-50/50 hover:bg-gray-50 focus:bg-white uppercase text-center font-mono font-bold transition-colors shadow-sm"
                        />
                        <button
                          onClick={verifyPromoCode}
                          className="bg-gray-900 text-white px-7 rounded-2xl font-bold hover:bg-black transition-colors shadow-lg active:scale-95 tracking-wide"
                        >
                          تأكيد
                        </button>
                      </div>
                      {promoError && <p className="text-red-500 text-xs mt-3 font-bold flex items-center gap-1.5"><X className="w-3.5 h-3.5" /> {promoError}</p>}
                      {appliedPromo && <p className="text-green-600 text-xs mt-3 flex items-center gap-1.5 font-bold"><Check className="w-3.5 h-3.5" /> تم التفعيل ({appliedPromo.discount_value.toLocaleString()} د.ع)</p>}
                    </div>

                    {/* Pricing Matrix */}
                    <div className="bg-gray-50/80 p-6 rounded-3xl border border-gray-100 space-y-3.5 text-sm font-medium">
                      <div className="flex justify-between"><span className="text-gray-500 font-bold">المشتريات ({cartItemsQty}):</span> <span className="font-bold text-gray-900">{subtotal.toLocaleString()} د.ع</span></div>
                      <div className="flex justify-between"><span className="text-gray-500 font-bold">التوصيل ({governorate}):</span> <span className="font-bold text-gray-900">{deliveryFee.toLocaleString()} د.ع</span></div>

                      {bundleDiscount > 0 && (
                        <div className="flex justify-between text-green-700 bg-green-50/50 p-3 rounded-2xl border border-green-100">
                          <span className="flex items-center gap-1.5 font-bold"><Check className="w-4 h-4" /> خصم العرض الشامل</span>
                          <span className="font-bold">-{bundleDiscount.toLocaleString()} د.ع</span>
                        </div>
                      )}

                      {promoDiscount > 0 && (
                        <div className="flex justify-between text-amber-700 bg-amber-50/50 p-3 rounded-2xl border border-amber-100">
                          <span className="flex items-center gap-1.5 font-bold"><Check className="w-4 h-4" /> قسيمة الخصم</span>
                          <span className="font-bold">-{promoDiscount.toLocaleString()} د.ع</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 flex justify-between items-center">
                      <span className="text-sm font-bold text-gray-500 uppercase tracking-wide">الإجمالي:</span>
                      <span className="text-3xl font-black text-gray-900 tracking-tight">{Math.max(0, grandTotal).toLocaleString()} د.ع</span>
                    </div>
                  </div>

                  {/* WhatsApp Checkout */}
                  <button
                    onClick={handleWhatsAppCheckout}
                    className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white py-5 rounded-[24px] font-bold tracking-wide text-lg transition-all flex items-center justify-center gap-3 mt-6 active:scale-95 shadow-xl shadow-green-500/20"
                  >
                    <MessageCircle className="w-6 h-6" /> إرسال الطلب عبر واتساب
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
