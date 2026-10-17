// api/migrate-images.js
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';

const B2_KEY_ID = process.env.B2_KEY_ID;
const B2_APP_KEY = process.env.B2_APP_KEY;
const B2_BUCKET = process.env.B2_BUCKET;
const B2_ENDPOINT = process.env.B2_ENDPOINT;
const B2_REGION = process.env.B2_REGION || 'us-west-004';

const SUPABASE_URL = 'https://xmrdqepjtfycvtgcbkyy.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_MgJhvhCdIg9oC40t--FZxQ_04A8dWkU';
const SUPABASE_STORAGE_BASE = `${SUPABASE_URL}/storage/v1/object/public/product-images`;

const s3 = new S3Client({
  endpoint: B2_ENDPOINT,
  region: B2_REGION,
  credentials: { accessKeyId: B2_KEY_ID, secretAccessKey: B2_APP_KEY }
});

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  // Auth
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: 'Invalid session' });

  // Get all products
  const { data: products, error } = await supabase
    .from('whatsapp_products')
    .select('id, img, name')
    .not('img', 'is', null);

  if (error) return res.status(500).json({ error: error.message });

  const results = { total: 0, migrated: 0, skipped: 0, failed: 0, errors: [] };

  for (const p of products || []) {
    results.total++;
    const url = p.img;

    if (!url) { results.skipped++; continue; }

    // Zaten B2'de veya geçerli bir dış URL ise atla
    if (!url.startsWith(SUPABASE_STORAGE_BASE)) {
      results.skipped++;
      continue;
    }

    try {
      // 1. Supabase'den indir
      const imgRes = await fetch(url);
      if (!imgRes.ok) {
        results.failed++;
        results.errors.push({ id: p.id, error: `Download failed: ${imgRes.status}` });
        continue;
      }
      const buffer = Buffer.from(await imgRes.arrayBuffer());
      const contentType = imgRes.headers.get('content-type') || 'image/jpeg';

      // 2. B2'ye yükle
      const fileName = url.split('/').pop() || `product_${Date.now()}.jpg`;
      const key = `whatsapp/${fileName}`;

      await s3.send(new PutObjectCommand({
        Bucket: B2_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: contentType
      }));

      // 3. DB'yi güncelle
      const newUrl = `/api/b2-image?key=${encodeURIComponent(key)}`;
      const { error: updErr } = await supabase
        .from('whatsapp_products')
        .update({ img: newUrl })
        .eq('id', p.id);

      if (updErr) throw updErr;

      results.migrated++;
    } catch (err) {
      results.failed++;
      results.errors.push({ id: p.id, error: err.message });
    }
  }

  res.status(200).json(results);
}