    document.addEventListener('keydown', (e) => { if (e.ctrlKey && e.shiftKey && e.key === 'A') { e.preventDefault(); if (isAdmin) window.openAdmin(); else window.openModal('loginModal'); } });
    window.doLogin = async function() { const email = document.getElementById('login-email').value.trim(); const password = document.getElementById('login-password').value; if (!email || !password) return alert('البريد وكلمة المرور مطلوبان'); const btn = document.getElementById('login-btn'); const oldText = btn.innerText; btn.innerText = '... جاري الدخول'; btn.disabled = true; const { data, error } = await _supabase.auth.signInWithPassword({ email, password }); if (error) { alert('خطأ: ' + error.message); btn.innerText = oldText; btn.disabled = false; return; } sessionToken = data.session?.access_token || null; isAdmin = true; window.closeModalAndPopHistory('loginModal'); document.getElementById('adminBar').style.display = 'flex'; window.showToast('تم تسجيل الدخول بنجاح'); window.openAdmin(); btn.innerText = oldText; btn.disabled = false; };
    window.handleSupabaseLogout = async function() { await _supabase.auth.signOut(); isAdmin = false; sessionToken = null; document.getElementById('adminBar').style.display = 'none'; location.reload(); };
    window.openAdmin = function() { document.getElementById('adminBar').style.display = 'flex'; window.openModal('adminModal'); window.switchAdminTab('products'); };
    window.renderSlider = function() { const container = document.getElementById('sliderContainer'); const track = document.getElementById('sliderTrack'); const dots = document.getElementById('sliderDots'); const images = siteSettings.slider_images || []; if (!images || images.length === 0) { container.style.display = 'none'; return; } container.style.display = 'block'; track.innerHTML = ''; dots.innerHTML = ''; images.forEach((url, i) => { const slide = document.createElement('div'); slide.className = 'slider-slide'; slide.innerHTML = '<img src="' + window.imageUrl(url) + '" alt="Banner ' + (i+1) + '" loading="lazy" onerror="this.parentElement.style.display=\'none\'; document.getElementById(\'sliderContainer\').style.display=\'none\';">'; track.appendChild(slide); const dot = document.createElement('div'); dot.className = 'slider-dot' + (i === 0 ? ' active' : ''); dot.onclick = () => window.goToSlide(i); dots.appendChild(dot); }); currentSlide = 0; window.updateSlider(); window.startSliderAutoplay(); };
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

    // Admin fonksiyonları (Kısaltıldı, ama çalışır durumda)
    window.switchAdminTab = function(tab, btn) {
        document.querySelectorAll('.admin-tab').forEach(b => b.classList.remove('active')); if (btn) btn.classList.add('active');
        const c = document.getElementById('adminContent');
        if (tab === 'products') {
            const sortedProducts = [...currentProducts].sort((a, b) => (a.name_ar || '').localeCompare(b.name_ar || '', 'ar'));
            c.innerHTML = `<button class="btn-gold" style="margin-bottom:15px; width:100%; padding:12px;" onclick="window.openProductForm()">+ إضافة منتج جديد (كوزمتيك)</button>${sortedProducts.map(p => `<div class="admin-item" style="${p.active === false ? 'opacity:0.6;' : ''}"><div style="display:flex; align-items:center; gap:10px; flex-grow:1;"><img src="${window.imageUrl(p.img)}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2250%22 height=%2250%22><rect width=%2250%22 height=%2250%22 fill=%22%23eee%22/></svg>'"><div><strong>${p.name_ar || p.name || 'بدون اسم'} ${p.active === false ? '(مخفي)' : ''}</strong><br><small style="color:var(--gold-dark); font-weight:bold;">${p.price} ₺</small></div></div><div style="display:flex; gap:5px;"><button onclick="window.toggleProductActive('${p.id}', event)" style="background:${p.active !== false ? '#f39c12' : '#27ae60'}; padding:6px 10px;" title="${p.active !== false ? 'إخفاء' : 'إظهار'}"><svg class="icon" viewBox="0 0 24 24"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg></button><button class="btn-gold" onclick="window.openProductForm('${p.id}')" style="padding:6px 10px;"><svg class="icon" viewBox="0 0 24 24"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg> تعديل</button><button class="btn-danger" onclick="window.deleteProduct('${p.id}')" style="padding:6px 10px;"><svg class="icon" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> حذف</button></div></div>`).join('')}`;
        } else if (tab === 'perfumes') {
            const sortedPerfumes = [...currentPerfumes].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'));
            c.innerHTML = `<button class="btn-gold" style="margin-bottom:15px; width:100%; padding:12px;" onclick="window.openPerfumeForm()">+ إضافة عطر جديد</button>${sortedPerfumes.map(p => `<div class="admin-item" style="${p.active === false ? 'opacity:0.6;' : ''}"><div style="display:flex; align-items:center; gap:10px;"><strong>${p.name} ${p.active === false ? '(مخفي)' : ''}</strong></div><div style="display:flex; gap:5px;"><button onclick="window.togglePerfumeActive('${p.id}')" style="background:${p.active !== false ? '#f39c12' : '#27ae60'}; padding:6px 10px;"><svg class="icon" viewBox="0 0 24 24"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg></button><button class="btn-gold" onclick="window.openPerfumeForm('${p.id}')" style="padding:6px 10px;"><svg class="icon" viewBox="0 0 24 24"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg> تعديل</button><button class="btn-danger" onclick="window.deletePerfume('${p.id}')" style="padding:6px 10px;"><svg class="icon" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> حذف</button></div></div>`).join('')}`;
        } else { c.innerHTML = '<p style="text-align:center; padding:20px; color:#888;">هذا القسم قيد التطوير حالياً، يرجى استخدام "إدارة المنتجات" و "العطور".</p>'; }
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
