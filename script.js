(function() {
    const SUPABASE_URL = 'https://xmrdqepjtfycvtgcbkyy.supabase.co';
    const SUPABASE_ANON_KEY = 'sb_publishable_MgJhvhCdIg9oC40t--FZxQ_04A8dWkU';
    const B2_UPLOAD_URL = 'https://b2-upload.usameismail70.workers.dev'; // KENDİ LİNKİN
    
    let _supabase = null;
    let isAdmin = false;
    let sessionToken = null;
    let currentProducts = []; 
    let currentPerfumes = []; 
    let perfumeGroups = []; 
    let intensities = [];
    let bottles = [];
    let prices = [];
    let siteSettings = { 
        logo_url: '', slider_images: [], hero_title: 'متجر ميار للتسوق', 
        hero_subtitle: 'جمالك يبدأ من هنا', free_shipping_text: 'احصل على شحن مجاني عند طلبك بقيمة 800 وأكثر', 
        free_shipping_min: 800, whatsapp_number: '905388444275',
        custom_categories_order: [], pricing_lists: []
    };
    let currentSlide = 0;
    let sliderAutoplayTimer = null;
    let selectedCategory = 'ALL';
    let searchQuery = '';
    let cart = JSON.parse(localStorage.getItem('catalog_cart')) || [];
    let modalHistoryStack = [];
    let currentPerfumeSelection = { intensityId: null, bottleId: null, perfumeId: null };
    let currentProductImageUrl = ''; 
    let settingLogoFile = null; 
    let settingSliderFiles = []; 
    let currentPriceTagPerfumes = []; 
    let currentPriceTagBulkPrices = {};
    let deviceId = localStorage.getItem('mayar_device_id');
    
    if (!deviceId) {
        deviceId = 'dev_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('mayar_device_id', deviceId);
    }

    window.showToast = function(message) {
        let toast = document.getElementById('globalToast');
        if (!toast) {
            toast = document.createElement('div'); toast.id = 'globalToast'; toast.className = 'toast'; document.body.appendChild(toast);
        }
        toast.innerHTML = `<svg class="icon" viewBox="0 0 24 24" style="color:var(--gold); width:1.2em; height:1.2em;"><path d="M20 6 9 17l-5-5"/></svg> <span>${message}</span>`;
        void toast.offsetWidth; toast.classList.add('show');
        clearTimeout(toast._t); toast._t = setTimeout(() => toast.classList.remove('show'), 2200);
    };

    function normalizeArabic(str) {
        if (!str) return '';
        return String(str).toLowerCase().replace(/[\u064B-\u065F\u0670]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي').replace(/\s+/g, ' ').trim();
    }

    window.pasteImage = async function(inputId, previewFuncName) {
        try {
            if (!navigator.clipboard || !navigator.clipboard.read) return alert('متصفحك لا يدعم خاصية اللصق.');
            const items = await navigator.clipboard.read();
            for (const item of items) {
                const type = item.types.find(t => t.startsWith('image/'));
                if (type) {
                    const blob = await item.getType(type);
                    const file = new File([blob], "pasted_image.png", { type });
                    const dt = new DataTransfer(); dt.items.add(file);
                    const input = document.getElementById(inputId); input.files = dt.files;
                    if (window[previewFuncName]) window[previewFuncName](input);
                    return;
                }
            }
            alert('لم يتم العثور على صورة في الحافظة.');
        } catch (err) { alert('يرجى السماح بالوصول إلى الحافظة.'); }
    };

    document.addEventListener('paste', function(e) {
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (let index in items) {
            const item = items[index];
            if (item.kind === 'file' && item.type.includes('image')) {
                const blob = item.getAsFile();
                const file = new File([blob], "yapistirilan_resim.png", { type: blob.type });
                if (document.getElementById('perfumeFormModal')) {
                    const input = document.getElementById('perfume-form-image');
                    if(input) { const dt = new DataTransfer(); dt.items.add(file); input.files = dt.files; window.previewPerfumeImage(input); return; }
                }
                if (document.getElementById('productFormModal') && document.getElementById('productFormModal').classList.contains('open')) {
                    const input = document.getElementById('pf-image-file');
                    if(input) { const dt = new DataTransfer(); dt.items.add(file); input.files = dt.files; window.previewProductImage(input); return; }
                }
                if (document.getElementById('bottleFormModal')) {
                    const input = document.getElementById('bottle-form-image');
                    if(input) { const dt = new DataTransfer(); dt.items.add(file); input.files = dt.files; window.previewBottleImage(input); return; }
                }
                if (document.getElementById('adminModal') && document.getElementById('adminModal').classList.contains('open')) {
                    const settingsLogoInput = document.getElementById('setting-logo-file');
                    if(settingsLogoInput) { const dt = new DataTransfer(); dt.items.add(file); settingsLogoInput.files = dt.files; window.previewSettingLogo(settingsLogoInput); return; }
                }
            }
        }
    });

    function initSupabase() {
        if (typeof supabase !== 'undefined' && supabase.createClient) {
            _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        }
    }

    window.loadSiteSettings = async function() {
        if (!_supabase) return;
        try {
            const { data } = await _supabase.from('site_settings').select('*').eq('id', 1).maybeSingle();
            if (data) {
                siteSettings.logo_url = data.logo_url || ''; siteSettings.hero_title = data.hero_title || 'متجر ميار للتسوق'; siteSettings.hero_subtitle = data.hero_subtitle || 'جمالك يبدأ من هنا';
                siteSettings.free_shipping_text = data.free_shipping_text || 'احصل على شحن مجاني عند طلبك بقيمة 800 وأكثر'; siteSettings.free_shipping_min = parseFloat(data.free_shipping_min) || 800;
                siteSettings.whatsapp_number = data.whatsapp_number || '905388444275'; siteSettings.slider_images = Array.isArray(data.slider_images) ? data.slider_images : [];
                siteSettings.custom_categories_order = Array.isArray(data.custom_categories_order) ? data.custom_categories_order : []; siteSettings.pricing_lists = Array.isArray(data.pricing_lists) ? data.pricing_lists : [];
                localStorage.setItem('cached_settings', JSON.stringify(siteSettings));
            }
            window.applySiteSettingsToUI();
        } catch(e) { console.warn(e); }
    };

    window.loadAllData = async function() {
        if (_supabase) {
            try {
                const [pProducts, pGroups, pItems, pIntensities, pBottles, pPrices] = await Promise.all([
                    _supabase.from('whatsapp_products').select('*'), _supabase.from('categories').select('*').eq('type', 'gender').eq('active', true).order('sort_order'),
                    _supabase.from('perfumes').select('*'), _supabase.from('perfume_intensities').select('*').eq('active', true).order('sort_order'),
                    _supabase.from('perfume_bottles').select('*').eq('active', true).order('sort_order'), _supabase.from('perfume_prices').select('*')
                ]);
                currentProducts = pProducts.data || []; perfumeGroups = pGroups.data || []; currentPerfumes = pItems.data || [];
                intensities = pIntensities.data || []; bottles = pBottles.data || []; prices = pPrices.data || [];
                localStorage.setItem('cached_products', JSON.stringify(currentProducts));
            } catch(e) { console.warn(e); }
        }
    };

    window.uploadToB2 = async function(file) {
        const base64 = await new Promise((resolve) => {
            const reader = new FileReader(); reader.onload = e => resolve(e.target.result); reader.readAsDataURL(file);
        });
        const res = await fetch(B2_UPLOAD_URL, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ base64: base64, contentType: file.type })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Yükleme hatası (B2)');
        if (data.key) return data.key.startsWith('http') ? data.key : '/api/b2-image?key=' + encodeURIComponent(data.key);
        return '';
    };

    window.imageUrl = function(url) {
        if (!url) return 'data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22200%22><rect width=%22300%22 height=%22200%22 fill=%22%23f8fafc%22/><text x=%2250%25%22 y=%2250%25%22 fill=%22%23D4AF37%22 font-family=%22sans-serif%22 font-size=%2216%22 font-weight=%22bold%22 text-anchor=%22middle%22 dy=%22.3em%22>لا صورة</text></svg>';
        if (url.startsWith('/api/b2-image')) return url;
        if (url.startsWith('http')) return url; 
        return url;
    };

    window.applySiteSettingsToUI = function() {
        if (siteSettings.logo_url) {
            const logoEl = document.getElementById('heroLogo'); logoEl.src = window.imageUrl(siteSettings.logo_url); logoEl.style.display = 'block';
            logoEl.onerror = function() { this.style.display = 'none'; };
        }
        document.getElementById('heroTitle').innerText = siteSettings.hero_title;
        document.getElementById('heroSubtitle').innerText = siteSettings.hero_subtitle;
        document.getElementById('shipping-text').innerText = siteSettings.free_shipping_text;
        window.renderSlider();
    };

    function getUniqueCosmeticCats() {
        const cats = new Set();
        currentProducts.forEach(p => { if (p.category) p.category.split(/[,;\/|]+/).forEach(c => { const trimmed = c.trim(); if (trimmed) cats.add(trimmed); }); });
        return Array.from(cats);
    }

    function getAllCategoriesUnified() {
        let unified = [];
        perfumeGroups.forEach(g => unified.push({ id: 'group_' + g.id, label: g.label, type: 'perfume_group', originalId: g.id }));
        getUniqueCosmeticCats().forEach(cat => unified.push({ id: 'cat_' + cat, label: cat, type: 'cosmetic', originalId: cat }));
        return unified;
    }

    window.renderCategories = function() {
        const bar = document.getElementById('categoriesBar'); bar.innerHTML = '';
        let unifiedCats = getAllCategoriesUnified();
        const customOrder = siteSettings.custom_categories_order || [];
        unifiedCats.sort((a, b) => { let idxA = customOrder.indexOf(a.id); let idxB = customOrder.indexOf(b.id); if (idxA === -1) idxA = 99999; if (idxB === -1) idxB = 99999; return idxA - idxB; });
        unifiedCats.forEach(item => {
            const btn = document.createElement('button');
            const isSelected = (item.type === 'perfume_group' && selectedCategory === 'perfume_group_' + item.originalId) || (item.type === 'cosmetic' && selectedCategory === item.originalId);
            btn.className = 'cat-btn' + (isSelected ? ' active' : '');
            btn.innerHTML = item.type === 'perfume_group' ? `<svg class="icon" viewBox="0 0 24 24" style="color:#e91e63;"><path d="M12 2a3 3 0 0 0-3 3c0 1.3.8 2.4 2 2.8V10h2V7.8c1.2-.4 2-1.5 2-2.8a3 3 0 0 0-3-3z"/><path d="M12 22a3 3 0 0 0 3-3c0-1.3-.8-2.4-2-2.8V14h-2v2.2c-1.2.4-2 1.5-2 2.8a3 3 0 0 0 3 3z"/><path d="M5.5 5.5a3 3 0 0 0-3 3c0 1.3.8 2.4 2 2.8V13h2v-1.7c1.2-.4 2-1.5 2-2.8a3 3 0 0 0-3-3z"/><path d="M18.5 18.5a3 3 0 0 0 3-3c0-1.3-.8-2.4-2-2.8V11h-2v1.7c-1.2.4-2 1.5-2 2.8a3 3 0 0 0 3 3z"/><circle cx="12" cy="12" r="2.5"/></svg> ${item.label}` : item.label;
            btn.onclick = () => { selectedCategory = item.type === 'perfume_group' ? 'perfume_group_' + item.originalId : item.originalId; window.renderCategories(); window.applyLocalFilter(); };
            bar.appendChild(btn);
        });
        const allBtn = document.createElement('button'); allBtn.className = 'cat-btn' + (selectedCategory === 'ALL' ? ' active' : ''); allBtn.innerHTML = 'الكل';
        allBtn.onclick = () => { selectedCategory = 'ALL'; window.renderCategories(); window.applyLocalFilter(); };
        bar.appendChild(allBtn);
    };

    window.applyLocalFilter = function() {
        const grid = document.getElementById('productsGrid'); const list = document.getElementById('perfumesList');
        let filteredCosmetics = []; let filteredPerfumes = []; let showPerfumeHeader = false;
        const activeCosmetics = currentProducts.filter(p => p.active !== false); const activePerfumes = currentPerfumes.filter(p => p.active !== false);

        if (searchQuery) {
            const q = normalizeArabic(searchQuery);
            filteredCosmetics = activeCosmetics.filter(p => normalizeArabic(p.name_ar || p.name || '').includes(q));
            filteredPerfumes = activePerfumes.filter(p => normalizeArabic(p.name || '').includes(q));
            showPerfumeHeader = true;
            const bothEmpty = filteredCosmetics.length === 0 && filteredPerfumes.length === 0;
            grid.style.display = (filteredCosmetics.length > 0 || bothEmpty) ? 'grid' : 'none';
            list.style.display = filteredPerfumes.length > 0 ? 'flex' : 'none';
            list.style.flexDirection = 'column'; list.style.gap = '12px'; list.style.marginTop = filteredCosmetics.length > 0 ? '30px' : '0';
        } else {
            if (typeof selectedCategory === 'string' && selectedCategory.startsWith('perfume_group_')) {
                grid.style.display = 'none'; list.style.display = 'flex'; list.style.flexDirection = 'column'; list.style.gap = '12px'; list.style.marginTop = '0';
                const groupId = parseInt(selectedCategory.replace('perfume_group_', ''));
                filteredPerfumes = activePerfumes.filter(p => p.gender_id === groupId).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'));
                list.innerHTML = filteredPerfumes.map(p => `
                    <div class="perfume-row" style="display:flex; justify-content:space-between; align-items:center;">
                        <div class="info" onclick="window.openPerfumeDetail('${p.id}')" style="flex:1; cursor:pointer;"><div class="name">${p.name}</div></div>
                        <div style="display:flex; gap:6px; align-items:center;">
                            <button onclick="window.copyProductLink('${p.id}')" style="background:#f39c12; color:#fff; padding:8px; border-radius:8px; min-height:38px; min-width:38px;"><svg class="icon" viewBox="0 0 24 24" style="margin:0;"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></button>
                            <button onclick="window.sendProductMessage('${p.id}')" style="background:#25d366; color:#fff; padding:8px; border-radius:8px; min-height:38px; min-width:38px;"><svg class="icon" viewBox="0 0 24 24" style="margin:0;"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg></button>
                            <button onclick="window.openPerfumeDetail('${p.id}')" style="background:var(--navy); color:var(--gold); padding:8px 16px; border-radius:8px; font-weight:800; min-height:38px;">عرض</button>
                        </div>
                    </div>
                `).join(''); return;
            }
            grid.style.display = 'grid'; list.style.display = 'none';
            filteredCosmetics = activeCosmetics;
            if (selectedCategory !== 'ALL') filteredCosmetics = filteredCosmetics.filter(p => p.category && p.category.split(/[,;\/|]+/).map(c => c.trim()).includes(selectedCategory));
            if (selectedCategory === 'ALL') { filteredPerfumes = activePerfumes; if (filteredPerfumes.length > 0) { list.style.display = 'flex'; list.style.flexDirection = 'column'; list.style.gap = '12px'; list.style.marginTop = '30px'; showPerfumeHeader = true; } }
        }

        if (filteredCosmetics.length === 0 && filteredPerfumes.length === 0) {
            grid.style.display = 'grid';
            grid.innerHTML = `<div class="empty-state" style="grid-column: 1/-1;"><svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg><p style="font-size: 1.15rem; font-weight: 800; color: var(--navy); margin-bottom: 4px;">لا توجد نتائج</p><p style="font-size: 0.9rem;">جرب البحث بكلمة أخرى أو تصفح قسماً مختلفاً</p></div>`;
        } else {
            filteredCosmetics.sort((a, b) => (a.name_ar || a.name || '').localeCompare(b.name_ar || b.name || '', 'ar'));
            grid.innerHTML = filteredCosmetics.map(p => {
                const imgSrc = window.imageUrl(p.img); const productName = p.name_ar || p.name || 'بدون اسم';
                let actionsHtml = '';
                if (isAdmin) {
                    actionsHtml = `<div class="admin-actions" style="margin-top:10px; display:flex; gap:6px; flex-wrap:wrap;">
                        <button onclick="window.copyProductLink('${p.id}')" style="background:#f39c12; color:#fff; flex:1; padding:8px; border-radius:8px; min-height:38px;"><svg class="icon" viewBox="0 0 24 24" style="margin:0;"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></button>
                        <button onclick="window.sendProductMessage('${p.id}')" style="background:#25d366; color:#fff; flex:1; padding:8px; border-radius:8px; min-height:38px;"><svg class="icon" viewBox="0 0 24 24" style="margin:0;"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg></button>
                        <button onclick="window.toggleProductActive('${p.id}', event)" style="background:${p.active !== false ? '#f39c12' : '#27ae60'}; color:#fff; flex:1; padding:8px; border-radius:8px; min-height:38px;"><svg class="icon" viewBox="0 0 24 24"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg></button>
                        <button onclick="window.openProductForm('${p.id}')" style="background:#f1c40f; color:#fff; flex:1; padding:8px; border-radius:8px; min-height:38px;"><svg class="icon" viewBox="0 0 24 24"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg></button>
                        <button onclick="window.deleteProduct('${p.id}')" style="background:#e74c3c; color:#fff; flex:1; padding:8px; border-radius:8px; min-height:38px;"><svg class="icon" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
                        <button onclick="window.addToCart('${p.id}')" style="background:#25d366; color:#fff; flex:2; font-weight:800; display:flex; align-items:center; justify-content:center; gap:6px; border-radius:8px; min-height:38px; min-width:100%;"><svg class="icon" viewBox="0 0 24 24" style="margin:0;"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg> إضافة</button></div>`;
                } else {
                    actionsHtml = `<div class="admin-actions" style="margin-top:10px; display:flex; gap:6px;">
                        <button onclick="window.copyProductLink('${p.id}')" style="background:#f39c12; color:#fff; flex:0 0 42px; padding:8px; border-radius:8px; min-height:38px;"><svg class="icon" viewBox="0 0 24 24" style="margin:0;"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></button>
                        <button onclick="window.sendProductMessage('${p.id}')" style="background:#25d366; color:#fff; flex:0 0 42px; padding:8px; border-radius:8px; min-height:38px;"><svg class="icon" viewBox="0 0 24 24" style="margin:0;"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg></button>
                        <button onclick="window.addToCart('${p.id}')" style="background:#25d366; color:#fff; flex:1; font-weight:800; display:flex; align-items:center; justify-content:center; gap:6px; border-radius:8px; min-height:38px;"><svg class="icon" viewBox="0 0 24 24" style="margin:0;"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg> إضافة</button></div>`;
                }
                const hasDiscount = p.original_price && p.original_price > p.price;
                const discountPercent = hasDiscount ? Math.round(((p.original_price - p.price) / p.original_price) * 100) : 0;
                return `<div class="product-card">${hasDiscount ? `<div class="discount-badge">-%${discountPercent}</div>` : ''}<img src="${imgSrc}" onclick="window.openProductDetail('${p.id}')" loading="lazy" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22200%22><rect width=%22300%22 height=%22200%22 fill=%22%23f8fafc%22/><text x=%2250%25%22 y=%2250%25%22 fill=%22%23D4AF37%22 font-family=%22sans-serif%22 font-size=%2216%22 font-weight=%22bold%22 text-anchor=%22middle%22 dy=%22.3em%22>لا صورة</text></svg>'"><div class="product-info"><div><div class="product-title" onclick="window.openProductDetail('${p.id}')">${productName}</div><div class="product-price-row"><span class="product-price">${p.price} ₺</span>${hasDiscount ? `<span class="product-price-old">${p.original_price} ₺</span>` : ''}</div></div>${actionsHtml}</div></div>`}).join('');
        }

        if (filteredPerfumes.length > 0 && (searchQuery || !selectedCategory.startsWith('perfume_group_'))) {
            list.style.display = 'flex'; filteredPerfumes.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'));
            let headerHtml = showPerfumeHeader ? `<h3 style="text-align:center; color:var(--navy); margin-bottom: 10px; font-weight: 900; font-size: 1.5rem;">قسم العطور</h3>` : '';
            list.innerHTML = headerHtml + filteredPerfumes.map(p => {
                let adminActions = '';
                if (isAdmin) {
                    adminActions = `<button onclick="window.togglePerfumeActive('${p.id}')" style="background:${p.active !== false ? '#f39c12' : '#27ae60'}; color:#fff; padding:8px; border-radius:8px; min-height:38px; min-width:38px;"><svg class="icon" viewBox="0 0 24 24" style="margin:0;"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg></button>
                    <button onclick="window.openPerfumeForm('${p.id}')" style="background:#f1c40f; color:#fff; padding:8px; border-radius:8px; min-height:38px; min-width:38px;"><svg class="icon" viewBox="0 0 24 24" style="margin:0;"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg></button>
                    <button onclick="window.deletePerfume('${p.id}')" style="background:#e74c3c; color:#fff; padding:8px; border-radius:8px; min-height:38px; min-width:38px;"><svg class="icon" viewBox="0 0 24 24" style="margin:0;"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>`;
                }
                return `<div class="perfume-row" style="display:flex; justify-content:space-between; align-items:center;"><div class="info" onclick="window.openPerfumeDetail('${p.id}')" style="flex:1; cursor:pointer;"><div class="name">${p.name}</div></div><div style="display:flex; gap:6px; align-items:center;"><button onclick="window.copyProductLink('${p.id}')" style="background:#f39c12; color:#fff; padding:8px; border-radius:8px; min-height:38px; min-width:38px;"><svg class="icon" viewBox="0 0 24 24" style="margin:0;"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></button><button onclick="window.sendProductMessage('${p.id}')" style="background:#25d366; color:#fff; padding:8px; border-radius:8px; min-height:38px; min-width:38px;"><svg class="icon" viewBox="0 0 24 24" style="margin:0;"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg></button>${adminActions}<button onclick="window.openPerfumeDetail('${p.id}')" style="background:var(--navy); color:var(--gold); padding:8px 16px; border-radius:8px; font-weight:800; min-height:38px;">عرض</button></div></div>`}).join('');
        } else { if (searchQuery || !selectedCategory.startsWith('perfume_group_')) list.style.display = 'none'; }
    };

    window.copyProductLink = function(id) { let url = window.location.origin + '/?product=' + id; navigator.clipboard.writeText(url).then(() => { window.showToast('✓ تم نسخ رابط المنتج'); }).catch(err => { alert('فشل نسخ الرابط: ' + err); }); };
    window.sendProductMessage = function(id) { let item = currentProducts.find(x => String(x.id) === String(id)) || currentPerfumes.find(x => String(x.id) === String(id)); if (!item) return; let name = item.name_ar || item.name; let url = window.location.origin + '/?product=' + id; let msg = `مرحباً، أريد الاستفسار عن هذا المنتج:\n*${name}*\nالرابط: ${url}`; window.open('https://wa.me/' + siteSettings.whatsapp_number.replace(/[^0-9]/g, '') + '?text=' + encodeURIComponent(msg), '_blank'); };
    
    window.togglePerfumeActive = async function(id) { if (!confirm('تغيير حالة ظهور العطر؟')) return; const perfume = currentPerfumes.find(p => String(p.id) === String(id)); if (!perfume) return; const newState = perfume.active !== false ? false : true; try { const { error } = await _supabase.from('perfumes').update({ active: newState }).eq('id', id); if (error) throw error; perfume.active = newState; window.applyLocalFilter(); if (document.getElementById('adminModal').classList.contains('open')) window.switchAdminTab('perfumes'); window.showToast('تم تحديث حالة العطر'); } catch (err) { alert('Hata: ' + err.message); } };
    
    window.openPerfumeDetail = function(perfumeId) {
        const p = currentPerfumes.find(x => String(x.id) === String(perfumeId)); if (!p) return;
        currentPerfumeSelection = { intensityId: null, bottleId: null, perfumeId: p.id };
        document.getElementById('pd-name').innerText = p.name;
        if (p.image_url) { document.getElementById('pd-image-container').style.display = 'block'; document.getElementById('pd-image').src = window.imageUrl(p.image_url); } else document.getElementById('pd-image-container').style.display = 'none';
        document.getElementById('pd-intensity-options').innerHTML = intensities.map(i => `<div class="option-btn" onclick="window.selectIntensity(${i.id})" id="int-btn-${i.id}">${i.name}</div>`).join('');
        const activeBottles = bottles.filter(b => b.size_id === 2); 
        document.getElementById('pd-bottle-options').innerHTML = activeBottles.map(b => `<div class="option-btn" onclick="window.selectBottle(${b.id})" id="bot-btn-${b.id}">${b.image_url ? `<img src="${window.imageUrl(b.image_url)}" onerror="this.style.display='none'">` : ''}<div>${b.name}</div><div style="font-size:0.7rem; color:#666;">${b.price_diff > 0 ? '+' + b.price_diff + ' ₺' : 'مجاناً'}</div></div>`).join('');
        window.updatePerfumeTotal(); window.openModal('perfumeDetailModal');
    };
    
    window.selectIntensity = function(id) { currentPerfumeSelection.intensityId = id; document.querySelectorAll('#pd-intensity-options .option-btn').forEach(el => el.classList.remove('active')); document.getElementById(`int-btn-${id}`).classList.add('active'); window.updatePerfumeTotal(); };
    window.selectBottle = function(id) { currentPerfumeSelection.bottleId = id; document.querySelectorAll('#pd-bottle-options .option-btn').forEach(el => el.classList.remove('active')); document.getElementById(`bot-btn-${id}`).classList.add('active'); window.updatePerfumeTotal(); };
    window.updatePerfumeTotal = function() { const btn = document.getElementById('pd-btn-add'); const totalEl = document.getElementById('pd-total'); if (!currentPerfumeSelection.intensityId || !currentPerfumeSelection.bottleId) { totalEl.innerText = '0 ₺'; btn.disabled = true; return; } const basePriceRow = prices.find(p => p.perfume_id === currentPerfumeSelection.perfumeId && p.intensity_id === currentPerfumeSelection.intensityId && p.size_id === 2); const basePrice = basePriceRow ? basePriceRow.price : 0; const bottle = bottles.find(b => b.id === currentPerfumeSelection.bottleId); totalEl.innerText = (basePrice + (bottle ? bottle.price_diff : 0)) + ' ₺'; btn.disabled = false; };
    window.addPerfumeToCart = function() { const p = currentPerfumes.find(x => x.id === currentPerfumeSelection.perfumeId); const intLabel = intensities.find(i => i.id === currentPerfumeSelection.intensityId).name; const bottle = bottles.find(b => b.id === currentPerfumeSelection.bottleId); const group = perfumeGroups.find(g => g.id === p.gender_id); const totalTxt = document.getElementById('pd-total').innerText; cart.push({ type: 'perfume', id: p.id, name: p.name, details: `${intLabel} - ${bottle.name} - ${group ? group.label : ''}`, price: parseFloat(totalTxt.replace(' ₺', '')), qty: 1 }); window.saveCart(); window.updateCartUI(); window.showToast('تمت إضافة العطر للسلة'); window.triggerCartBadgePop(); window.closeModalAndPopHistory('perfumeDetailModal'); };
    window.openProductDetail = function(id) { const p = currentProducts.find(x => String(x.id) === String(id)); if (!p) return; document.getElementById('detail-img').src = window.imageUrl(p.img); document.getElementById('detail-img').onerror = function() { this.src='data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22200%22><rect width=%22300%22 height=%22200%22 fill=%22%23f8fafc%22/></svg>'; }; document.getElementById('detail-title').innerText = p.name_ar || p.name || 'بدون اسم'; const hasDiscount = p.original_price && p.original_price > p.price; const priceRow = document.getElementById('detail-price-row'); if (hasDiscount) priceRow.innerHTML = `<span style="color:var(--danger); font-size:1.4rem;">${p.price} ₺</span> <span style="font-size:1rem; color:#888; text-decoration:line-through; margin-inline-start:10px;">${p.original_price} ₺</span>`; else priceRow.innerHTML = `${p.price} ₺`; const descEl = document.getElementById('detail-desc'); if (p.description && p.description.trim() !== '') { descEl.innerText = p.description; descEl.style.display = 'block'; } else { descEl.style.display = 'none'; } document.getElementById('detail-add-btn').onclick = () => { window.addToCart(p.id); window.closeModalAndPopHistory('productDetailModal'); }; window.openModal('productDetailModal'); };
    window.addToCart = function(id) { const p = currentProducts.find(x => String(x.id) === String(id)); if (!p) return; const existing = cart.find(c => c.type === 'kozmetik' && c.id === p.id); if (existing) existing.qty++; else cart.push({ type: 'kozmetik', id: p.id, name: p.name_ar || p.name || 'منتج', price: p.price, qty: 1 }); window.saveCart(); window.updateCartUI(); window.showToast('تمت الإضافة للسلة'); window.triggerCartBadgePop(); };
    window.triggerCartBadgePop = function() { const btn = document.getElementById('cartBtn'); if (btn) { btn.classList.remove('badge-pop'); void btn.offsetWidth; btn.classList.add('badge-pop'); } };
    window.saveCart = function() { localStorage.setItem('catalog_cart', JSON.stringify(cart)); };
    window.updateCartUI = function() {
        let totalQty = 0; let totalPrice = 0; cart.forEach(c => { totalQty += c.qty; totalPrice += c.price * c.qty; });
        document.getElementById('cart-count').innerText = totalQty; document.getElementById('cart-total-price').innerText = totalPrice;
        const clearBtn = document.getElementById('clearCartBtn'); if (clearBtn) clearBtn.style.display = cart.length === 0 ? 'none' : 'inline-flex';
        const cartList = document.getElementById('cartList');
        if (cart.length === 0) { cartList.innerHTML = `<div class="empty-state" style="padding: 40px 20px;"><svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg><p style="font-size: 1.1rem; font-weight: 800; color: var(--navy); margin-bottom: 6px;">سلتك فارغة</p><p style="font-size: 0.9rem;">تصفح منتجاتنا وأضف ما يعجبك</p></div>`; }
        else { let itemsHtml = cart.map((c, idx) => { const itemTotal = c.price * c.qty; return `<div style="display:flex; justify-content:space-between; align-items:center; padding:12px 0; border-bottom:1px solid #eee;"><div style="flex-grow:1;"><strong style="color:var(--navy); font-size:0.95rem;">${c.name}</strong>${c.details ? `<br><small style="color:#888;">${c.details}</small>` : ''}<div style="margin-top:5px; font-size:0.9rem; font-weight:700; color:var(--gold-dark);">${c.qty} × ${c.price} = ${itemTotal} ₺</div></div><div style="display:flex; align-items:center; gap:8px; margin-inline-start:10px;"><button onclick="window.changeQty(${idx}, -1)" style="padding:4px 10px; background:#f0f0f0; color:#333; border-radius:6px; font-weight:bold; min-height: unset;">-</button><span style="font-weight:800; color:var(--navy); min-width:20px; text-align:center; font-size:1.1rem;">${c.qty}</span><button onclick="window.changeQty(${idx}, 1)" style="padding:4px 10px; background:#f0f0f0; color:#333; border-radius:6px; font-weight:bold; min-height: unset;">+</button></div></div>`; }).join(''); itemsHtml += `<div style="margin-top: 20px; padding-top: 15px; border-top: 2px dashed #ccc; display:flex; justify-content:space-between; align-items:center;"><span style="font-size:1.1rem; font-weight:800; color:var(--navy);">الإجمالي:</span><span style="font-size:1.4rem; font-weight:900; color:var(--gold-dark);">${totalPrice} ₺</span></div>`; cartList.innerHTML = itemsHtml; }
    };
    window.changeQty = function(idx, delta) { cart[idx].qty += delta; if (cart[idx].qty <= 0) cart.splice(idx, 1); window.saveCart(); window.updateCartUI(); };
    window.clearCart = function() { cart = []; window.saveCart(); window.updateCartUI(); };
    window.completeOrder = function() { if (cart.length === 0) { window.showToast('سلتك فارغة، أضف منتجات أولاً'); return; } let msg = 'طلب جديد:\n\n'; let total = 0; cart.forEach(c => { msg += `• ${c.name}${c.details ? ` (${c.details})` : ''}\n  ${c.price} ₺ × ${c.qty} = ${c.price * c.qty} ₺\n`; total += c.price * c.qty; }); msg += `\nالإجمالي: ${total} ₺`; window.open('https://wa.me/' + siteSettings.whatsapp_number.replace(/[^0-9]/g, '') + '?text=' + encodeURIComponent(msg), '_blank'); };

    // ... (Devamı için "devam" yaz)
     document.addEventListener('keydown', (e) => { if (e.ctrlKey && e.shiftKey && e.key === 'A') { e.preventDefault(); if (isAdmin) window.openAdmin(); else window.openModal('loginModal'); } });
    
    window.doLogin = async function() { 
        const email = document.getElementById('login-email').value.trim(); 
        const password = document.getElementById('login-password').value; 
        if (!email || !password) return alert('البريد وكلمة المرور مطلوبان'); 
        const btn = document.getElementById('login-btn'); 
        const oldText = btn.innerText; 
        btn.innerText = '... جاري الدخول'; 
        btn.disabled = true; 
        const { data, error } = await _supabase.auth.signInWithPassword({ email, password }); 
        if (error) { alert('خطأ: ' + error.message); btn.innerText = oldText; btn.disabled = false; return; } 
        sessionToken = data.session?.access_token || null; 
        isAdmin = true; 
        window.closeModalAndPopHistory('loginModal'); 
        document.getElementById('adminBar').style.display = 'flex'; 
        window.showToast('تم تسجيل الدخول بنجاح'); 
        window.openAdmin(); 
        btn.innerText = oldText; 
        btn.disabled = false; 
    };

    window.handleSupabaseLogout = async function() { await _supabase.auth.signOut(); isAdmin = false; sessionToken = null; document.getElementById('adminBar').style.display = 'none'; location.reload(); };
    
    window.openAdmin = function() { document.getElementById('adminBar').style.display = 'flex'; window.openModal('adminModal'); window.switchAdminTab('products'); };
    
    window.renderSlider = function() { 
        const container = document.getElementById('sliderContainer'); const track = document.getElementById('sliderTrack'); const dots = document.getElementById('sliderDots'); 
        const images = siteSettings.slider_images || []; 
        if (!images || images.length === 0) { container.style.display = 'none'; return; } 
        container.style.display = 'block'; track.innerHTML = ''; dots.innerHTML = ''; 
        images.forEach((url, i) => { 
            const slide = document.createElement('div'); slide.className = 'slider-slide'; 
            slide.innerHTML = '<img src="' + window.imageUrl(url) + '" alt="Banner ' + (i+1) + '" loading="lazy" onerror="this.parentElement.style.display=\'none\'; document.getElementById(\'sliderContainer\').style.display=\'none\';">'; 
            track.appendChild(slide); 
            const dot = document.createElement('div'); dot.className = 'slider-dot' + (i === 0 ? ' active' : ''); dot.onclick = () => window.goToSlide(i); dots.appendChild(dot); 
        }); 
        currentSlide = 0; window.updateSlider(); window.startSliderAutoplay(); 
    };

    window.updateSlider = function() { const track = document.getElementById('sliderTrack'); if (!track) return; track.style.transform = 'translateX(' + (currentSlide * 100) + '%)'; document.querySelectorAll('.slider-dot').forEach((d, i) => { d.classList.toggle('active', i === currentSlide); }); };
    window.goToSlide = function(idx) { const images = siteSettings.slider_images || []; if (images.length === 0) return; currentSlide = idx % images.length; if (currentSlide < 0) currentSlide = images.length - 1; window.updateSlider(); };
    window.sliderNext = function() { window.goToSlide(currentSlide + 1); window.startSliderAutoplay(); };
    window.sliderPrev = function() { window.goToSlide(currentSlide - 1); window.startSliderAutoplay(); };
    window.startSliderAutoplay = function() { if (sliderAutoplayTimer) clearInterval(sliderAutoplayTimer); const images = siteSettings.slider_images || []; if (images.length < 2) return; sliderAutoplayTimer = setInterval(() => { currentSlide = (currentSlide + 1) % images.length; window.updateSlider(); }, 5000); };
    
    window.setDefaultCategory = function() { if (selectedCategory !== 'ALL' || searchQuery) return; let unifiedCats = getAllCategoriesUnified(); const customOrder = siteSettings.custom_categories_order || []; unifiedCats.sort((a, b) => { let idxA = customOrder.indexOf(a.id); let idxB = customOrder.indexOf(b.id); if (idxA === -1) idxA = 99999; if (idxB === -1) idxB = 99999; return idxA - idxB; }); if (unifiedCats.length > 0) { const firstCat = unifiedCats[0]; selectedCategory = firstCat.type === 'perfume_group' ? 'perfume_group_' + firstCat.originalId : firstCat.originalId; } };
    window.showLoadingScreen = function() { document.getElementById('loadingScreen').style.display = 'flex'; };
    window.hideLoadingScreen = function() { document.getElementById('loadingScreen').style.opacity = '0'; setTimeout(() => document.getElementById('loadingScreen').style.display = 'none', 400); };
    window.handleSearch = function(val) { if (val.trim() === 'mayar.') { document.getElementById('search-input').value = ''; searchQuery = ''; window.applyLocalFilter(); window.openModal('loginModal'); return; } searchQuery = val.trim(); window.applyLocalFilter(); };
    window.openWhatsAppChat = function() { const num = siteSettings.whatsapp_number.replace(/[^0-9]/g, ''); window.open('https://wa.me/' + num, '_blank'); };
    
    window.openModal = function(id) { document.getElementById(id).style.display = 'flex'; document.getElementById(id).classList.add('open'); modalHistoryStack.push(id); history.pushState({ modal: id }, ''); };
    window.closeModalAndPopHistory = function(id) { document.getElementById(id).classList.remove('open'); document.getElementById(id).style.display = 'none'; const idx = modalHistoryStack.lastIndexOf(id); if (idx !== -1) modalHistoryStack.splice(idx, 1); if (history.state && history.state.modal === id) history.back(); };
    window.closeModalOnBackdrop = function(event, modalId) { if (event.target.id === modalId) window.closeModalAndPopHistory(modalId); };
    
    window.addEventListener('popstate', function() { if (modalHistoryStack.length > 0) { const modalId = modalHistoryStack.pop(); document.getElementById(modalId).classList.remove('open'); } else { history.pushState({ root: true }, ''); } });
    history.replaceState({ root: true }, '');

    // --- ADMIN İŞLEMLERİ ---
    window.switchAdminTab = function(tab, btn) {
        document.querySelectorAll('.admin-tab').forEach(b => b.classList.remove('active')); if (btn) btn.classList.add('active');
        const c = document.getElementById('adminContent');
        if (tab === 'products') {
            const sortedProducts = [...currentProducts].sort((a, b) => (a.name_ar || '').localeCompare(b.name_ar || '', 'ar'));
            c.innerHTML = `<button class="btn-gold" style="margin-bottom:15px; width:100%; padding:12px;" onclick="window.openProductForm()">+ إضافة منتج جديد (كوزمتيك)</button>${sortedProducts.map(p => `<div class="admin-item" style="${p.active === false ? 'opacity:0.6;' : ''}"><div style="display:flex; align-items:center; gap:10px; flex-grow:1;"><img src="${window.imageUrl(p.img)}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2250%22 height=%2250%22><rect width=%2250%22 height=%2250%22 fill=%22%23eee%22/></svg>'"><div><strong>${p.name_ar || p.name || 'بدون اسم'} ${p.active === false ? '(مخفي)' : ''}</strong><br><small style="color:var(--gold-dark); font-weight:bold;">${p.price} ₺</small></div></div><div style="display:flex; gap:5px;"><button onclick="window.toggleProductActive('${p.id}', event)" style="background:${p.active !== false ? '#f39c12' : '#27ae60'}; padding:6px 10px;" title="${p.active !== false ? 'إخفاء' : 'إظهار'}"><svg class="icon" viewBox="0 0 24 24"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg></button><button class="btn-gold" onclick="window.openProductForm('${p.id}')" style="padding:6px 10px;"><svg class="icon" viewBox="0 0 24 24"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg> تعديل</button><button class="btn-danger" onclick="window.deleteProduct('${p.id}')" style="padding:6px 10px;"><svg class="icon" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> حذف</button></div></div>`).join('')}`;
        } else if (tab === 'perfumes') {
            const sortedPerfumes = [...currentPerfumes].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'));
            c.innerHTML = `<button class="btn-gold" style="margin-bottom:15px; width:100%; padding:12px;" onclick="window.openPerfumeForm()">+ إضافة عطر جديد</button>${sortedPerfumes.map(p => `<div class="admin-item" style="${p.active === false ? 'opacity:0.6;' : ''}"><div style="display:flex; align-items:center; gap:10px;"><strong>${p.name} ${p.active === false ? '(مخفي)' : ''}</strong></div><div style="display:flex; gap:5px;"><button onclick="window.togglePerfumeActive('${p.id}')" style="background:${p.active !== false ? '#f39c12' : '#27ae60'}; padding:6px 10px;"><svg class="icon" viewBox="0 0 24 24"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg></button><button class="btn-gold" onclick="window.openPerfumeForm('${p.id}')" style="padding:6px 10px;"><svg class="icon" viewBox="0 0 24 24"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg> تعديل</button><button class="btn-danger" onclick="window.deletePerfume('${p.id}')" style="padding:6px 10px;"><svg class="icon" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> حذف</button></div></div>`).join('')}`;
        } else { c.innerHTML = '<p style="text-align:center; padding:20px; color:#888;">هذا القسم قيد التطوير حالياً.</p>'; }
    };

    window.toggleProductActive = async function(id, event) { if (event) event.stopPropagation(); if (!confirm('تغيير حالة ظهور المنتج؟')) return; const product = currentProducts.find(p => String(p.id) === String(id)); if (!product) return; const newState = product.active !== false ? false : true; try { const { error } = await _supabase.from('whatsapp_products').update({ active: newState }).eq('id', id); if (error) throw error; product.active = newState; window.applyLocalFilter(); if (document.getElementById('adminModal').classList.contains('open')) window.switchAdminTab('products'); window.showToast('تم تحديث حالة المنتج'); } catch (err) { alert('Hata: ' + err.message); } };
    window.deleteProduct = async function(id) { if (!confirm('تأكيد الحذف؟')) return; const { error } = await _supabase.from('whatsapp_products').delete().eq('id', id); if (error) return alert('Hata: ' + error.message); await window.loadAllData(); window.renderCategories(); window.applyLocalFilter(); window.switchAdminTab('products'); };
    window.deletePerfume = async function(id) { if (!confirm('تأكيد حذف العطر؟')) return; try { await _supabase.from('perfumes').delete().eq('id', id); await window.loadAllData(); window.applyLocalFilter(); window.switchAdminTab('perfumes'); } catch (err) { alert('Hata: ' + err.message); } };
    
    window.saveProduct = async function() {
        const id = document.getElementById('pf-id').value;
        const name = document.getElementById('pf-name').value.trim();
        const price = parseFloat(document.getElementById('pf-price').value) || 0;
        const oldPrice = parseFloat(document.getElementById('pf-old-price').value) || 0;
        const category = document.getElementById('pf-category').value.trim();
        const description = document.getElementById('pf-description').value.trim();
        const fileInput = document.getElementById('pf-image-file');
        if (!name) return alert('اسم المنتج مطلوب');
        const btn = document.getElementById('pf-save-btn'); const oldText = btn.innerText; btn.innerText = '... جاري الحفظ'; btn.disabled = true;
        try {
            let imgUrl = currentProductImageUrl;
            if (fileInput.files[0]) imgUrl = await window.uploadToB2(fileInput.files[0]);
            const payload = { id: id || 'admin_' + Date.now(), name: name, price: price, original_price: oldPrice, category: category, description: description, img: imgUrl, active: true, synced_at: new Date().toISOString() };
            if (id) { const { error } = await _supabase.from('whatsapp_products').update(payload).eq('id', id); if (error) throw error; }
            else { const { error } = await _supabase.from('whatsapp_products').insert([payload]); if (error) throw error; }
            window.closeModalAndPopHistory('productFormModal'); await window.loadAllData(); window.renderCategories(); window.applyLocalFilter(); window.showToast('تم حفظ المنتج'); window.switchAdminTab('products');
        } catch (err) { alert('Hata: ' + err.message); } finally { btn.innerText = oldText; btn.disabled = false; }
    };

    window.openProductForm = function(id = null) {
        document.getElementById('pf-title').innerText = id ? 'تعديل المنتج' : 'إضافة منتج جديد';
        document.getElementById('pf-id').value = id || '';
        const preview = document.getElementById('pf-image-preview'); preview.style.display = 'none'; preview.src = '';
        document.getElementById('pf-image-file').value = ''; currentProductImageUrl = '';
        if (id) {
            const p = currentProducts.find(x => String(x.id) === String(id));
            if (p) { document.getElementById('pf-name').value = p.name_ar || p.name || ''; document.getElementById('pf-price').value = p.price; document.getElementById('pf-old-price').value = p.original_price || ''; document.getElementById('pf-category').value = p.category; document.getElementById('pf-description').value = p.description || ''; currentProductImageUrl = p.img; if (p.img) { preview.src = window.imageUrl(p.img); preview.style.display = 'block'; } }
        } else { document.getElementById('pf-name').value = ''; document.getElementById('pf-price').value = ''; document.getElementById('pf-old-price').value = ''; document.getElementById('pf-category').value = ''; document.getElementById('pf-description').value = ''; }
        window.openModal('productFormModal');
    };
    window.previewProductImage = function(input) { const file = input.files[0]; const preview = document.getElementById('pf-image-preview'); if (file) { const reader = new FileReader(); reader.onload = e => { preview.src = e.target.result; preview.style.display = 'block'; }; reader.readAsDataURL(file); } };

    window.openPerfumeForm = function(id = null) {
        const p = id ? currentPerfumes.find(x => String(x.id) === String(id)) : null;
        let html = `<div class="modal open" id="perfumeFormModal" onclick="window.closeModalOnBackdrop(event, 'perfumeFormModal')" style="display:flex; z-index:1001;"><div class="modal-content" onclick="event.stopPropagation()"><h2 style="margin-bottom: 20px;">${id ? 'تعديل عطر' : 'إضافة عطر جديد'}</h2><input type="hidden" id="perfume-form-id" value="${id || ''}"><input type="hidden" id="perfume-form-existing-image" value="${p?.image_url || ''}"><div class="form-group"><label>صورة العطر</label><div style="display:flex; gap:10px; margin-bottom:10px;"><button type="button" class="btn-gold" onclick="document.getElementById('perfume-form-image').click()" style="flex:1;">اختيار صورة</button><button type="button" class="btn-success" onclick="window.pasteImage('perfume-form-image', 'previewPerfumeImage')" style="flex:1;">لصق صورة</button></div><input type="file" id="perfume-form-image" accept="image/*" onchange="window.previewPerfumeImage(this)" style="display:none;"><img id="perfume-form-preview" class="img-preview" src="${p?.image_url ? window.imageUrl(p.image_url) : ''}" style="display:${p?.image_url ? 'block' : 'none'};"></div><div class="form-group"><label>اسم العطر *</label><input type="text" id="perfume-form-name" value="${p?.name || ''}"></div><div class="form-group"><label>المجموعة / الجنس</label><select id="perfume-form-gender">${perfumeGroups.map(g => `<option value="${g.id}" ${p?.gender_id == g.id ? 'selected' : ''}>${g.label}</option>`).join('')}</select></div><div style="display: flex; gap: 10px; margin-top: 20px;"><button class="btn-success" id="perfume-save-btn" style="flex:1; padding:12px;" onclick="window.savePerfume()">حفظ</button><button class="btn-danger" style="flex:1; padding:12px;" onclick="document.getElementById('perfumeFormModal').remove()">إلغاء</button></div></div></div>`;
        document.body.insertAdjacentHTML('beforeend', html);
    };
    window.previewPerfumeImage = function(input) { const file = input.files[0]; const preview = document.getElementById('perfume-form-preview'); if (file) { const reader = new FileReader(); reader.onload = e => { preview.src = e.target.result; preview.style.display = 'block'; }; reader.readAsDataURL(file); } };
    window.savePerfume = async function() {
        const id = document.getElementById('perfume-form-id').value;
        const existingImage = document.getElementById('perfume-form-existing-image').value;
        const name = document.getElementById('perfume-form-name').value.trim();
        const gender_id = document.getElementById('perfume-form-gender').value || null;
        const fileInput = document.getElementById('perfume-form-image');
        if (!name) return alert('اسم العطر مطلوب!');
        const btn = document.getElementById('perfume-save-btn'); const oldText = btn.innerText; btn.innerText = '... جاري الحفظ'; btn.disabled = true;
        try {
            let imgUrl = existingImage; if (fileInput.files[0]) imgUrl = await window.uploadToB2(fileInput.files[0]);
            const payload = { id: id || 'perf_' + Date.now(), name: name, gender_id: gender_id, image_url: imgUrl, active: true };
            if (id) await _supabase.from('perfumes').update(payload).eq('id', id);
            else await _supabase.from('perfumes').insert([payload]);
            document.getElementById('perfumeFormModal').remove(); await window.loadAllData(); window.applyLocalFilter(); window.switchAdminTab('perfumes'); window.showToast('تم حفظ العطر بنجاح');
        } catch (err) { alert('Hata: ' + err.message); btn.innerText = oldText; btn.disabled = false; }
    };

    window.init = async function() {
        const cachedProducts = localStorage.getItem('cached_products'); const cachedSettings = localStorage.getItem('cached_settings');
        if (cachedProducts && cachedSettings) { try { currentProducts = JSON.parse(cachedProducts); siteSettings = JSON.parse(cachedSettings); window.applySiteSettingsToUI(); window.setDefaultCategory(); window.renderCategories(); window.applyLocalFilter(); window.hideLoadingScreen(); } catch(e) {} } else { window.showLoadingScreen(); }
        initSupabase();
        if (_supabase) { const { data: { session } } = await _supabase.auth.getSession(); isAdmin = !!session; sessionToken = session?.access_token || null; if (isAdmin) document.getElementById('adminBar').style.display = 'flex'; }
        await Promise.all([window.loadSiteSettings(), window.loadAllData()]);
        window.setDefaultCategory(); window.renderCategories(); window.applyLocalFilter(); window.updateCartUI(); window.hideLoadingScreen();
        const urlParams = new URLSearchParams(window.location.search); const productIdParam = urlParams.get('product');
        if (productIdParam) { const isCosmetic = currentProducts.find(p => String(p.id) === String(productIdParam)); const isPerfume = currentPerfumes.find(p => String(p.id) === String(productIdParam)); if (isCosmetic) window.openProductDetail(productIdParam); else if (isPerfume) window.openPerfumeDetail(productIdParam); }
    };
    window.onload = function() { if (typeof window.init === 'function') window.init(); };
})();
