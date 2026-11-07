(function() {
    const SUPABASE_URL = 'https://xmrdqepjtfycvtgcbkyy.supabase.co';
    const SUPABASE_ANON_KEY = 'sb_publishable_MgJhvhCdIg9oC40t--FZxQ_04A8dWkU';
    
    // !!! DİKKAT: BURAYA CLOUDFLARE WORKER LİNKİNİ YAZ !!!
    const B2_UPLOAD_URL = 'https://b2-upload.senin-hesabin.workers.dev'; 
    
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

    // --- YARDIMCI FONKSİYONLAR ---
    window.showToast = function(message) {
        let toast = document.getElementById('globalToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'globalToast';
            toast.className = 'toast';
            document.body.appendChild(toast);
        }
        toast.innerHTML = `<svg class="icon" viewBox="0 0 24 24" style="color:var(--gold); width:1.2em; height:1.2em;"><path d="M20 6 9 17l-5-5"/></svg> <span>${message}</span>`;
        void toast.offsetWidth;
        toast.classList.add('show');
        clearTimeout(toast._t);
        toast._t = setTimeout(() => toast.classList.remove('show'), 2200);
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

    // --- VERİ YÜKLEME ---
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
        } catch(e) {}
    };

    window.loadAllData = async function() {
        if (_supabase) {
            const [pProducts, pGroups, pItems, pIntensities, pBottles, pPrices] = await Promise.all([
                _supabase.from('whatsapp_products').select('*'), _supabase.from('categories').select('*').eq('type', 'gender').eq('active', true).order('sort_order'),
                _supabase.from('perfumes').select('*'), _supabase.from('perfume_intensities').select('*').eq('active', true).order('sort_order'),
                _supabase.from('perfume_bottles').select('*').eq('active', true).order('sort_order'), _supabase.from('perfume_prices').select('*')
            ]);
            currentProducts = pProducts.data || []; perfumeGroups = pGroups.data || []; currentPerfumes = pItems.data || [];
            intensities = pIntensities.data || []; bottles = pBottles.data || []; prices = pPrices.data || [];
            localStorage.setItem('cached_products', JSON.stringify(currentProducts));
        }
    };

    // --- B2 RESİM YÜKLEME (CLOUDFLARE WORKER) ---
    window.uploadToB2 = async function(file) {
        const base64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.readAsDataURL(file);
        });
        
        const res = await fetch(B2_UPLOAD_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ base64: base64, contentType: file.type })
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Yükleme hatası (B2)');
        if (data.key) return data.key.startsWith('http') ? data.key : '/api/b2-image?key=' + encodeURIComponent(data.key);
        return '';
    };

    // --- ÜRÜN KAYDETME (B2 Entegrasyonlu) ---
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
            window.closeModalAndPopHistory('productFormModal'); await window.loadAllData(); window.renderCategories(); window.applyLocalFilter(); showToast('تم حفظ المنتج'); window.switchAdminTab('products');
        } catch (err) { alert('Hata: ' + err.message); } finally { btn.innerText = oldText; btn.disabled = false; }
    };

    // --- DİĞER FONKSİYONLAR (Önceki tam koddaki tüm fonksiyonlar buraya eklenecek) ---
    // Aşağıdaki kısma önceki tam koddaki renderCategories, applyLocalFilter, openPerfumeDetail, addToCart, 
    // admin paneli fonksiyonları, sepet işlemleri vb. hepsini window.xxx = function() {} formatında ekle.

    // ... (Senin önceki tam koddaki tüm JS fonksiyonların buraya yapıştırılacak, sadece başlarına window. eklenecek) ...

    window.onload = init;
})();
