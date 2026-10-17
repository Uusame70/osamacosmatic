// api/image-proxy.js
export default async function handler(req, res) {
  const url = req.query.url;
  if (!url) return res.status(400).send('Missing url');

  if (!url.includes('2chat-user-data.s3') && !url.includes('2chat.io')) {
    return res.status(403).send('Forbidden');
  }

  try {
    const imgRes = await fetch(url);
    if (!imgRes.ok) return res.status(imgRes.status).send('Fetch failed');

    const buffer = Buffer.from(await imgRes.arrayBuffer());
    res.setHeader('Content-Type', imgRes.headers.get('content-type') || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, immutable');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).send(buffer);
  } catch (err) {
    res.status(500).send('Proxy error: ' + err.message);
  }
}