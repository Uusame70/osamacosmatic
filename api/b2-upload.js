// api/b2-upload.js
import { v2 as cloudinary } from 'cloudinary';
import { createClient } from '@supabase/supabase-js';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const SUPABASE_URL = 'https://xmrdqepjtfycvtgcbkyy.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_MgJhvhCdIg9oC40t--FZxQ_04A8dWkU';

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: 'Invalid session' });

  try {
    const { base64 } = req.body;
    if (!base64) return res.status(400).json({ error: 'Missing image' });

    const uploadResponse = await cloudinary.uploader.upload(base64, {
      folder: 'mayar_products',
      resource_type: 'image',
      format: 'webp'
    });

    res.status(200).json({ key: uploadResponse.secure_url });
  } catch (err) {
    console.error('Cloudinary upload error:', err);
    res.status(500).json({ error: err.message });
  }
}