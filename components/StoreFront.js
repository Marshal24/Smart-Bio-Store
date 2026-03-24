"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ShoppingBag, Search, X, Plus, Minus, Trash2, MapPin, Percent, Check, MessageCircle, Filter, BadgeCheck } from 'lucide-react';

// Sentinel object for the main product image (no specific color)
const MAIN_IMAGE_OPTION = { name: '', _isMain: true };

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
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerDistrict, setCustomerDistrict] = useState("");
  const [governorate, setGovernorate] = useState("Kirkuk");
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [promoError, setPromoError] = useState("");
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const GOVERNORATES = [
    "Kirkuk", "Baghdad", "Basra", "Erbil", "Najaf", "Karbala",
    "Sulaymaniyah", "Duhok", "Nineveh", "Anbar", "Babil", "Dhi Qar",
    "Diyala", "Maysan", "Muthanna", "Al Qadisiyyah", "Saladin", "Wasit", "Halabja"
  ];

  const SIZE_TEMPLATES = {
    ALPHA: { name: "ملابس (S, M, L...)", values: ["S", "M", "L", "XL", "XXL", "XXXL"] },
    PANTS: { name: "سراويل (28, 30, 32...)", values: ["28", "29", "30", "31", "32", "33", "34", "36", "38", "40"] },
    SHOES: { name: "أحذية (37, 38, 39...)", values: ["37", "38", "39", "40", "41", "42", "43", "44", "45"] },
    KIDS: { name: "أطفال (1, 2, 3...)", values: ["1", "2", "3", "4", "5", "6"] }
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
    
    // Auto-select first available SIZE
    const sizeType = product.variants?.size_type || 'ALPHA';
    const template = (SIZE_TEMPLATES[sizeType] || SIZE_TEMPLATES.ALPHA).values;
    const productSizes = product.variants?.sizes || product.variants || {};
    
    const firstAvailableSize = template.find(size => productSizes[size] !== false);
    setSelectedSize(firstAvailableSize || "");
    
    const colors = product.variants?.colors || [];
    if (colors.length > 0) {
      // DEFAULT: select the main image option (no specific color) so the first image is always purchasable
      setSelectedColor(MAIN_IMAGE_OPTION);
      setActiveModalImage(product.image_url);
    } else {
      setSelectedColor(null);
      setActiveModalImage(product.image_url);
    }
  };

  const handleColorSelection = (colorObj) => {
    setSelectedColor(colorObj);
    
    // If main image option selected, show main product image
    if (colorObj === MAIN_IMAGE_OPTION || colorObj?._isMain) {
      setActiveModalImage(selectedProduct.image_url);
      // Reset size to first valid from global sizes
      const sizeType = selectedProduct.variants?.size_type || 'ALPHA';
      const template = (SIZE_TEMPLATES[sizeType] || SIZE_TEMPLATES.ALPHA).values;
      const globalSizes = selectedProduct.variants?.sizes || selectedProduct.variants || {};
      const currentValid = selectedSize && globalSizes[selectedSize] !== false;
      if (!currentValid) {
        const firstValid = template.find(s => globalSizes[s] !== false);
        setSelectedSize(firstValid || "");
      }
      return;
    }

    const isLegacy = typeof colorObj === "string";
    const imageUrl = isLegacy ? null : colorObj.image_url;
    if (imageUrl) {
      setActiveModalImage(imageUrl);
    } else {
      setActiveModalImage(selectedProduct.image_url);
    }

    // If the current selected size is not available for this new color, auto-select first valid one.
    const sizeType = selectedProduct.variants?.size_type || 'ALPHA';
    const template = (SIZE_TEMPLATES[sizeType] || SIZE_TEMPLATES.ALPHA).values;
    const colorSizes = (colorObj && typeof colorObj !== "string" && colorObj.sizes)
      ? colorObj.sizes
      : (selectedProduct.variants?.sizes || selectedProduct.variants || {});

    const currentSizeStillValid = selectedSize && colorSizes[selectedSize] !== false;
    if (!currentSizeStillValid) {
      const firstValid = template.find(s => colorSizes[s] !== false);
      setSelectedSize(firstValid || "");
    }
  };

  const addToCart = () => {
    if (!selectedSize) return;

    const productColors = selectedProduct.variants?.colors || [];
    // Allow: no colors needed OR a specific color is chosen OR MAIN_IMAGE_OPTION is chosen
    const isMainOption = selectedColor?._isMain;
    if (productColors.length > 0 && !selectedColor) return;

    const colorName = (isMainOption || !selectedColor)
      ? ""
      : (typeof selectedColor === "string" ? selectedColor : selectedColor.name);
    const colorImage = (!isMainOption && selectedColor && typeof selectedColor !== "string")
      ? selectedColor.image_url
      : null;
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

  const handleWhatsAppCheckout = async () => {
    if (!customerName.trim()) { alert("يرجى إدخال اسمك الكامل"); return; }
    if (!customerPhone.trim()) { alert("يرجى إدخال رقم الواتساب"); return; }
    setCheckoutLoading(true);

    const storeName = settings.store_name || "Boutique";
    const safeTotal = Math.max(0, grandTotal);

    // 1. Build order payload for Supabase
    const orderPayload = {
      customer_name:   customerName.trim(),
      customer_phone:  customerPhone.trim(),
      governorate,
      district:        customerDistrict.trim() || null,
      items: cart.map(item => ({
        name:         item.name,
        price:        item.price,
        size:         item.selectedSize,
        color:        item.selectedColor || "",
        quantity:     item.quantity,
        displayImage: item.displayImage || item.image_url || ""
      })),
      subtotal,
      delivery_fee:    deliveryFee,
      bundle_discount: bundleDiscount,
      promo_discount:  promoDiscount,
      total:           safeTotal,
      status:          "pending"
    };

    // 2. Save to Supabase (non-blocking — if fails, still open WhatsApp)
    let orderRef = "----";
    try {
      const { data: saved, error } = await supabase
        .from("orders")
        .insert(orderPayload)
        .select("id")
        .single();
      if (!error && saved?.id) {
        orderRef = saved.id.slice(-6).toUpperCase();
      }
    } catch (e) {
      console.error("Order save error:", e);
    }

    // 3. Short WhatsApp notification to store owner
    const locationLine = customerDistrict.trim()
      ? `${governorate} - ${customerDistrict.trim()}`
      : governorate;

    const message =
      `%F0%9F%9B%92 %D8%B7%D9%84%D8%A8 %D8%AC%D8%AF%D9%8A%D8%AF %D9%85%D9%86 ${storeName}%0A` +
      `%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%0A` +
      `%F0%9F%93%8B %D8%B1%D9%82%D9%85 %D8%A7%D9%84%D8%B7%D9%84%D8%A8: %23${orderRef}%0A` +
      `%F0%9F%91%A4 ${customerName.trim()}%0A` +
      `%F0%9F%93%9E ${customerPhone.trim()}%0A` +
      `%F0%9F%93%8D ${locationLine}%0A` +
      `%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%0A` +
      `%F0%9F%92%B0 %D8%A7%D9%84%D9%85%D8%AC%D9%85%D9%88%D8%B9: ${safeTotal.toLocaleString()} %D8%AF.%D8%B9%0A%0A` +
      `%E2%9C%85 %D8%AA%D9%85 %D8%AD%D9%81%D8%B8 %D8%A7%D9%84%D8%B7%D9%84%D8%A8. %D8%B1%D8%A7%D8%AC%D8%B9 %D9%84%D9%88%D8%AD%D8%A9 %D8%A7%D9%84%D8%B7%D9%84%D8%A8%D8%A7%D8%AA %D9%84%D9%84%D8%AA%D9%81%D8%A7%D8%B5%D9%8A%D9%84 %D8%A7%D9%84%D9%83%D8%A7%D9%85%D9%84%D8%A9.`;

    window.open(`https://wa.me/${settings.whatsapp_number}?text=${message}`, "_blank");

    setTimeout(() => {
      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
      setCustomerDistrict("");
      setCheckoutModalOpen(false);
      setCheckoutLoading(false);
    }, 800);
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
        <div className="bg-white/80 backdrop-blur-3xl border border-white/40 px-3 sm:px-5 py-2 sm:py-2.5 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.15)] flex items-center gap-2 sm:gap-4 group hover:bg-white transition-all cursor-pointer ring-1 ring-black/5" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-full border border-white shadow-sm overflow-hidden bg-white shrink-0 group-hover:scale-105 transition-transform duration-500">
            <img src={settings.store_logo} className="w-full h-full object-cover" alt="" />
          </div>
          <div className="flex flex-col min-w-[60px]">
            <h2 className="font-black text-[11px] sm:text-base tracking-tighter flex items-center gap-1 leading-none" style={{ color: settings.primary_color || '#000' }}>
              <span className="truncate max-w-[80px] sm:max-w-none">{settings.store_name}</span>
              <span className="flex items-center justify-center w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: settings.primary_color || '#000' }}>
                <Check className="w-2 h-2 text-white" strokeWidth={6} />
              </span>
            </h2>
            <span className="text-[7px] sm:text-[9px] uppercase font-black tracking-widest text-gray-400 mt-0.5 opacity-60">تصفح الآن</span>
          </div>

          <div className="w-[1px] h-4 sm:h-6 bg-black/10 mx-0.5 sm:mx-1"></div>

          <button
            onClick={(e) => { e.stopPropagation(); setCheckoutModalOpen(true); }}
            className="p-1.5 sm:p-2.5 bg-gray-50 rounded-full hover:scale-110 transition relative shadow-sm border border-black/5"
            style={{ color: settings.primary_color || '#000' }}
          >
            <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
            {cartItemsQty > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-black w-4 h-4 flex items-center justify-center rounded-full border border-white animate-in zoom-in">
                {cartItemsQty}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Ultra-Premium Hero Cover Section */}
      <div className="relative w-full h-40 sm:h-64 bg-gray-200 overflow-hidden">
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
          className="absolute top-4 left-4 z-20 bg-white/40 backdrop-blur-3xl border border-white/50 p-3 rounded-2xl hover:bg-white hover:scale-105 transition-all duration-300 shadow-xl flex items-center justify-center group"
          style={{ color: settings.primary_color || '#000000' }}
        >
          <ShoppingBag className="w-6 h-6 transition-transform" />
          {cartItemsQty > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-white animate-in zoom-in shadow-sm">
              {cartItemsQty}
            </span>
          )}
        </button>
      </div>

      {/* Elite Brand Profile Section */}
      <div className="max-w-7xl mx-auto px-4 relative -mt-12 sm:-mt-20 mb-8 flex flex-col items-center text-center">
        {/* Avatar with Halo effect */}
        <div className="relative mb-3 sm:mb-4 group">
          <div className="absolute inset-0 rounded-full blur-md opacity-20 group-hover:opacity-40 transition-opacity duration-500" style={{ backgroundColor: settings.primary_color || '#000' }}></div>
          <div className="relative w-24 h-24 sm:w-36 sm:h-36 rounded-full border-4 border-white bg-white shadow-2xl overflow-hidden flex items-center justify-center z-10 transition-transform duration-500 hover:scale-105">
            {settings.store_logo ? (
              <img src={settings.store_logo} alt={settings.store_name} className="w-full h-full object-cover select-none" />
            ) : (
              <span className="text-3xl sm:text-4xl font-black bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(to bottom right, ${settings.primary_color || '#000'}, #666)` }}>
                {(settings.store_name || "Boutique").charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        </div>

        {/* Verified Brand Name */}
        <div className="flex justify-center mb-1">
          <h1 className="text-2xl sm:text-4xl font-black tracking-tighter leading-tight flex items-center gap-2" style={{ color: settings.primary_color || '#000000' }}>
            {settings.store_name || "Boutique"}
            <span className="flex items-center justify-center w-3.5 h-3.5 sm:w-5 sm:h-5 shrink-0 -translate-y-0.5 sm:-translate-y-1">
              <span className="relative w-full h-full rounded-full flex items-center justify-center shadow-sm" style={{ backgroundColor: settings.primary_color || '#000' }}>
                <Check className="w-2 sm:w-3 text-white" strokeWidth={6} />
              </span>
            </span>
          </h1>
        </div>

        {/* Elegant Bio */}
        {settings.store_bio && (
          <p className="text-xs sm:text-base font-bold text-gray-400 max-w-[280px] sm:max-w-md leading-relaxed px-4">{settings.store_bio}</p>
        )}
      </div>

      <div className="w-full max-w-7xl mx-auto px-4">
        {/* Search & Categories Navbar */}
        <div className="mb-10 space-y-6">
          <div className="relative max-w-2xl mx-auto">
            <input
              type="text"
              placeholder="ابحث عن قطعتك المفضلة..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-gray-100 p-4 pl-12 rounded-2xl shadow-sm outline-none focus:border-black font-bold transition-all text-xs sm:text-sm placeholder:text-gray-300"
            />
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar justify-start sm:justify-center px-2">
            <button
              onClick={() => setActiveCategory("الكل")}
              className={`px-6 py-2.5 rounded-xl text-xs sm:text-sm font-black whitespace-nowrap transition-all active:scale-95 border
              ${activeCategory === "الكل" ? "text-white shadow-lg border-transparent" : "text-gray-400 border-transparent hover:text-black bg-white shadow-sm"}`}
              style={activeCategory === "الكل" ? { backgroundColor: settings.primary_color || '#000000' } : {}}
            >
              الكل
            </button>
            {settings.categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-6 py-2.5 rounded-xl text-xs sm:text-sm font-black whitespace-nowrap transition-all active:scale-95 border
                ${activeCategory === cat ? "text-white shadow-lg border-transparent" : "text-gray-400 border-transparent hover:text-black bg-white shadow-sm"}`}
                style={activeCategory === cat ? { backgroundColor: settings.primary_color || '#000000' } : {}}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Editorial Product Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-3 gap-y-8 sm:gap-x-8 sm:gap-y-16">
          {filteredProducts.map((product) => {
            const colorsArr = product.variants?.colors || [];
            return (
              <div
                key={product.id}
                className="group cursor-pointer flex flex-col relative"
                onClick={() => openProductModal(product)}
              >
                <div className="bg-white aspect-[3/4.2] rounded-[24px] overflow-hidden relative shadow-sm border border-gray-100 flex items-center justify-center">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 ease-out"
                    />
                  ) : (
                    <ShoppingBag className="w-10 h-10 text-gray-100" />
                  )}

                  {/* Price Tag Overlay */}
                  <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-lg border border-white/20">
                    <p className="font-black text-[11px] sm:text-xs text-black whitespace-nowrap">
                      {Number(product.price).toLocaleString()} <span className="text-[9px] opacity-70">د.ع</span>
                    </p>
                  </div>
                </div>

                <div className="mt-3 px-1">
                  <h3 className="font-black text-gray-900 tracking-tight text-[13px] sm:text-base leading-tight truncate">{product.name}</h3>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-gray-400 font-bold bg-gray-100 px-2 py-0.5 rounded-md">{product.category}</span>
                    {colorsArr.length > 0 && (
                      <div className="flex -space-x-1 space-x-reverse">
                        {colorsArr.slice(0, 3).map((color, i) => {
                          const hasImg = typeof color !== "string" && color.image_url;
                          return (
                            <div key={i} className={`w-3.5 h-3.5 rounded-full border border-white ring-1 ring-gray-100 shadow-sm overflow-hidden ${hasImg ? 'bg-transparent' : 'bg-gray-200'}`}>
                              {hasImg && <img src={color.image_url} className="w-full h-full object-cover" />}
                            </div>
                          );
                        })}
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

                  {/* Step 1: اختيار اللون */}
                  {(selectedProduct.variants?.colors || []).length > 0 && (
                    <div className="mb-8 bg-gray-50/50 rounded-3xl border border-gray-100 p-5">
                      <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2 tracking-wide">الخطوة 1: تحديد اللون <span className="text-[10px] bg-white px-2 py-1 rounded-md text-gray-500 font-bold border border-gray-200 shadow-sm ml-auto">الصورة تتغير حسب اختيارك</span></h3>
                      <div className="flex flex-wrap gap-2.5">

                        {/* MAIN IMAGE option — always first */}
                        {selectedProduct.image_url && (() => {
                          const isMainSelected = selectedColor?._isMain;
                          return (
                            <button
                              onClick={() => handleColorSelection(MAIN_IMAGE_OPTION)}
                              className={`flex items-center gap-2 p-1.5 pr-4 min-h-[48px] border-2 rounded-2xl font-bold transition-all active:scale-95
                                ${isMainSelected ? "text-white shadow-lg scale-105" : "border-gray-200 bg-white hover:border-black text-black"}`}
                              style={isMainSelected ? { ...((settings.primary_color && settings.primary_color !== '#000000') ? { backgroundColor: settings.primary_color, borderColor: settings.primary_color } : { backgroundColor: '#000', borderColor: '#000' }) } : {}}
                            >
                              <img src={selectedProduct.image_url} className="w-8 h-8 rounded-xl object-cover border border-white/20 shadow-sm" alt="" />
                              <span className="text-sm">الأصل</span>
                            </button>
                          );
                        })()}

                        {/* Color variant options */}
                        {selectedProduct.variants.colors.map((colorObj, idx) => {
                          const isLegacy = typeof colorObj === "string";
                          const cName = isLegacy ? colorObj : colorObj.name;
                          const cImage = isLegacy ? null : colorObj.image_url;
                          const selectedColorName = selectedColor?._isMain ? '__main__' : (selectedColor ? (typeof selectedColor === "string" ? selectedColor : selectedColor.name) : null);
                          const isSelected = selectedColorName === cName;

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
                      {(SIZE_TEMPLATES[selectedProduct.variants?.size_type] || SIZE_TEMPLATES.ALPHA).values.map(size => {
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
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/60 backdrop-blur-sm transition-opacity">
            <div className="bg-[#F9FAFB] w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden rounded-t-[32px] sm:rounded-[32px] shadow-2xl animate-in slide-in-from-bottom-10 duration-500 border-t sm:border border-white">
              
              {/* Header */}
              <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-10">
                <h2 className="text-xl font-black tracking-tight flex items-center gap-2.5 text-gray-900"><ShoppingBag className="w-6 h-6" /> حقيبة التسوق ({cartItemsQty})</h2>
                <button onClick={() => setCheckoutModalOpen(false)} className="p-2.5 hover:bg-gray-100 bg-gray-50 rounded-xl transition focus:scale-95 text-gray-500">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="overflow-y-auto custom-scrollbar flex-1 p-5 sm:p-8 space-y-8">
                {cart.length === 0 ? (
                  <div className="py-20 text-center text-gray-500">
                    <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-gray-100">
                      <ShoppingBag className="w-10 h-10 text-gray-200" />
                    </div>
                    <p className="font-black text-lg text-gray-900 tracking-tight">الحقيبة فارغة حالياً</p>
                    <p className="text-xs mt-2 font-bold text-gray-400">تصفح منتجاتنا وأضف ما يعجبك!</p>
                  </div>
                ) : (
                  <>
                    {/* Cart Items */}
                    <div className="space-y-3">
                      {cart.map((item, idx) => (
                        <div key={idx} className="flex gap-4 p-3 bg-white rounded-2xl border border-gray-50 shadow-sm transition-all">
                          <div className="w-20 h-24 bg-gray-50 rounded-xl overflow-hidden shrink-0 border border-gray-50">
                            {item.displayImage ? (
                                <img src={item.displayImage} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400 font-bold uppercase tracking-widest text-center px-1">Img</div>
                            )}
                          </div>

                          <div className="flex flex-col flex-1 py-0.5 overflow-hidden">
                            <div className="flex justify-between items-start gap-2">
                              <h4 className="font-black text-gray-900 leading-tight text-sm truncate">{item.name}</h4>
                              <button onClick={() => removeFromCart(idx)} className="text-gray-300 hover:text-red-500 p-1 transition"><Trash2 className="w-4 h-4" /></button>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-1.5 mt-2">
                              <span className="text-[10px] bg-gray-50 text-gray-600 px-2 py-0.5 rounded border border-gray-100 font-bold">مقاس {item.selectedSize}</span>
                              {item.selectedColor && <span className="text-[10px] bg-gray-50 text-gray-600 px-2 py-0.5 rounded border border-gray-100 font-bold">{item.selectedColor}</span>}
                            </div>

                            <div className="flex justify-between items-center mt-auto">
                              <span className="font-black text-sm text-gray-900">{(item.price * item.quantity).toLocaleString()} د.ع</span>
                              
                              <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-1">
                                <button onClick={() => updateQuantity(idx, -1)} className="w-6 h-6 flex items-center justify-center bg-white rounded-md shadow-sm text-gray-400 hover:text-black transition"><Minus className="w-3 h-3" /></button>
                                <span className="text-xs font-black w-4 text-center">{item.quantity}</span>
                                <button onClick={() => updateQuantity(idx, 1)} className="w-6 h-6 flex items-center justify-center bg-white rounded-md shadow-sm text-gray-900 hover:bg-gray-100 transition"><Plus className="w-3 h-3" /></button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-6">
                      {/* Form Details */}
                      <div className="grid grid-cols-1 gap-5">
                        {/* Name */}
                        <input
                          type="text"
                          value={customerName}
                          onChange={e => setCustomerName(e.target.value)}
                          placeholder="الاسم الكامل"
                          className="w-full p-4 rounded-2xl border border-gray-100 bg-white outline-none focus:border-black transition-all font-bold placeholder:text-gray-300 shadow-sm"
                        />

                        {/* Phone */}
                        <input
                          type="tel"
                          dir="ltr"
                          value={customerPhone}
                          onChange={e => setCustomerPhone(e.target.value)}
                          placeholder="رقم الواتساب"
                          className="w-full p-4 rounded-2xl border border-gray-100 bg-white outline-none focus:border-black transition-all font-bold placeholder:text-gray-300 shadow-sm text-left"
                        />

                        {/* Governorate */}
                        <div className="relative">
                          <select
                            value={governorate}
                            onChange={(e) => setGovernorate(e.target.value)}
                            className="w-full p-4 bg-white rounded-2xl border border-gray-100 outline-none focus:border-black appearance-none font-bold transition-all shadow-sm pr-10"
                          >
                            {GOVERNORATES.map(gov => <option key={gov} value={gov}>{gov} ({gov === "Kirkuk" ? "3,000" : "5,000"} د.ع)</option>)}
                          </select>
                          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>

                        {/* District */}
                        <input
                          type="text"
                          value={customerDistrict}
                          onChange={e => setCustomerDistrict(e.target.value)}
                          placeholder="الحي أو المنطقة (اختياري)"
                          className="w-full p-4 rounded-2xl border border-gray-100 bg-white outline-none focus:border-black transition-all font-bold placeholder:text-gray-300 shadow-sm"
                        />

                        {/* Promo */}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={promoCode}
                            onChange={(e) => setPromoCode(e.target.value)}
                            placeholder="كود الخصم"
                            className="flex-1 p-4 rounded-2xl border border-gray-100 bg-white outline-none focus:border-black uppercase text-center font-mono font-black transition-all placeholder:text-gray-300 shadow-sm"
                          />
                          <button onClick={verifyPromoCode} className="px-6 bg-black text-white rounded-2xl font-black text-xs hover:bg-gray-800 transition active:scale-95 shadow-lg shadow-black/10">تطبيق</button>
                        </div>
                        {promoError && <p className="text-[10px] text-red-500 font-bold mr-2">{promoError}</p>}
                        {appliedPromo && <p className="text-[10px] text-green-600 font-bold mr-2">تم تفعيل الخصم بنجاح! 🎉</p>}
                      </div>


                      {/* Summary Card */}
                      <div className="bg-gray-900 rounded-[32px] p-6 text-white shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
                        
                        <div className="space-y-4 relative z-10">
                          <div className="flex justify-between items-center text-xs text-gray-400 font-bold opacity-80 uppercase tracking-widest">
                            <span>ملخص الحساب</span>
                            <span>{cartItemsQty} قطع</span>
                          </div>
                          
                          <div className="space-y-2 text-sm border-t border-white/10 pt-4">
                            <div className="flex justify-between"><span>المشتريات</span> <span>{subtotal.toLocaleString()} د.ع</span></div>
                            <div className="flex justify-between"><span>التوصيل</span> <span>{deliveryFee.toLocaleString()} د.ع</span></div>
                            
                            {bundleDiscount > 0 && (
                              <div className="flex justify-between text-green-400 font-bold">
                                <span>خصم العرض الشامل</span>
                                <span>-{bundleDiscount.toLocaleString()} د.ع</span>
                              </div>
                            )}

                            {promoDiscount > 0 && (
                              <div className="flex justify-between text-yellow-400 font-bold">
                                <span>خصم القسيمة</span>
                                <span>-{promoDiscount.toLocaleString()} د.ع</span>
                              </div>
                            )}
                          </div>

                          <div className="flex justify-between items-center pt-4 border-t border-white/20 mt-4">
                            <span className="text-sm font-black text-gray-300">المبلغ النهائي:</span>
                            <span className="text-2xl font-black text-white">{Math.max(0, grandTotal).toLocaleString()} د.ع</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleWhatsAppCheckout}
                      disabled={checkoutLoading}
                      className="w-full bg-[#25D366] hover:bg-[#20bd5a] disabled:opacity-60 text-white py-5 rounded-[24px] font-black text-lg transition-all flex items-center justify-center gap-3 shadow-xl shadow-green-500/20 active:scale-[0.98]"
                    >
                      {checkoutLoading
                        ? <span>⏳ جاري إرسال الطلب...</span>
                        : <><MessageCircle className="w-6 h-6" /> تأكيد الطلب عبر واتساب</>}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
