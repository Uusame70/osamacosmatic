// api/sync-whatsapp.js
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xmrdqepjtfycvtgcbkyy.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_MgJhvhCdIg9oC40t--FZxQ_04A8dWkU';

// 2Chat varsayılanları (admin override edebilir)
const DEFAULT_API_KEY = 'UAK6f703c42-c939-4575-89cc-35922b2faca9';
const DEFAULT_PHONE = '905388444275';

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Admin auth kontrolü (Authorization header'da Supabase token)
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });

  // Kullanıcı doğrulama
  if (!token) {
    return res.status(401).json({ error: 'Yetkisiz: token gerekli' });
  }
  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
  if (authErr || !user) {
    return res.status(401).json({ error: 'Geçersiz oturum' });
  }

  const API_KEY = req.query.api_key || DEFAULT_API_KEY;
  const PHONE = req.query.phone || DEFAULT_PHONE;

  try {
    // ── 1. 2Chat'ten ürünleri çek ──
    const apiUrl = `https://api.p.2chat.io/open/whatsapp/catalog/products?from_number=${PHONE}`;
    const apiRes = await fetch(apiUrl, {
      headers: { 'X-User-API-Key': API_KEY }
    });

    if (apiRes.status !== 200) {
      const errData = await apiRes.json().catch(() => ({}));
      await supabaseAdmin.from('whatsapp_sync_log').insert([{
        success: false,
        message: `2Chat ${apiRes.status}: ${errData.detail || 'hata'}`
      }]);
      return res.status(500).json({
        error: '2Chat hatası',
        status: apiRes.status,
        detail: errData.detail
      });
    }

    const data = await apiRes.json();
    const rawProducts = data.products || data.data || data.items || [];

    // ── 2. Formatla ──
    const products = rawProducts.map((p) => {
      const name = p.name || p.name_ar || p.name_tr || '';
      const description = p.description || p.desc_ar || p.desc_tr || '';
      let price = 0;
      const rawPrice = p.price ?? 0;
      if (typeof rawPrice === 'string') {
        price = parseFloat(rawPrice.replace(/[^0-9.]/g, '')) || 0;
      } else {
        price = parseFloat(rawPrice) || 0;
      }
      let img = '';
      if (Array.isArray(p.images) && p.images.length > 0) {
        const f = p.images[0];
        img = typeof f === 'string' ? f : (f.url || '');
      } else if (p.image_url) {
        img = p.image_url;
      } else if (p.img) {
        img = p.img;
      }

      return {
        id: String(p.retailer_id || p.id || ''),
        name,
        price,
        description,
        img,
        synced_at: new Date().toISOString()
      };
    }).filter(p => p.id);

    // ── 3. Supabase'e upsert (aynı id varsa güncelle) ──
    if (products.length > 0) {
      const { error: upsertErr } = await supabaseAdmin
        .from('whatsapp_products')
        .upsert(products, { onConflict: 'id' });

      if (upsertErr) throw upsertErr;
    }

    // ── 4. Silinen ürünleri temizle (WhatsApp'tan kaldırılanlar) ──
    const currentIds = products.map(p => p.id);
    if (currentIds.length > 0) {
      await supabaseAdmin
        .from('whatsapp_products')
        .delete()
        .not('id', 'in', `(${currentIds.map(id => `"${id}"`).join(',')})`);
    } else {
      // Hiç ürün yoksa tümünü sil
      await supabaseAdmin.from('whatsapp_products').delete().neq('id', '___none___');
    }

    // ── 5. Log kaydı ──
    await supabaseAdmin.from('whatsapp_sync_log').insert([{
      success: true,
      total_count: products.length,
      message: `Başarıyla ${products.length} ürün senkronize edildi`
    }]);

    res.status(200).json({
      success: true,
      count: products.length,
      syncedAt: new Date().toISOString()
    });
  } catch (err) {
    try {
      await supabaseAdmin.from('whatsapp_sync_log').insert([{
        success: false,
        message: err.message
      }]);
    } catch (e) { /* ignore */ }

    res.status(500).json({ error: err.message });
  }
}
