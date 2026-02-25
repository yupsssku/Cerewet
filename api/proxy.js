/**
 * api/proxy.js
 * Proxy publik ke API Atlantich2h — API key TIDAK pernah bocor ke client
 */
const axios = require('axios');

const BASE  = process.env.API_BASE_URL  || 'https://atlantich2h.com';
const KEY   = process.env.API_SECRET_KEY;
const PROFIT = parseFloat(process.env.PROFIT_PERCENT || '1');
const OWNER_WA = process.env.OWNER_WHATSAPP || '';

/* Hitung harga final: harga dasar + profit + flat fee Rp400 */
function withProfit(price) {
  const p = Number(price) || 0;
  return p + Math.ceil((PROFIT / 100) * p) + 400;
}

/* POST ke atlantich2h dengan api_key otomatis disertakan */
async function atl(endpoint, params = {}) {
  const body = new URLSearchParams({ ...params, api_key: KEY });
  const { data } = await axios.post(`${BASE}${endpoint}`, body.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 25000,
  });
  return data;
}

module.exports = async (req, res) => {
  /* CORS */
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, msg: 'Method not allowed' });

  const action = req.query.action;
  const b = req.body || {};

  try {
    switch (action) {

      /* Info publik: nomor WA owner */
      case 'config':
        return res.json({ ok: true, wa: OWNER_WA });

      /* Daftar produk + harga sudah termasuk profit */
      case 'price_list': {
        const d = await atl('/layanan/price_list', { type: 'prabayar' });
        if (!d.data) return res.json({ ok: false, msg: d.message || 'Gagal mengambil data produk' });
        const items = d.data.map(item => ({
          code:           item.code,
          name:           item.name,
          provider:       item.provider,
          category:       item.category,
          status:         item.status,
          note:           item.note,
          original_price: Number(item.price),
          price:          withProfit(item.price),
        }));
        return res.json({ ok: true, data: items });
      }

      /* Buat deposit QRIS */
      case 'deposit_create': {
        const { reff_id, nominal, metode = 'QRISFAST' } = b;
        if (!reff_id || !nominal) return res.json({ ok: false, msg: 'Parameter tidak lengkap' });
        const d = await atl('/deposit/create', { reff_id, nominal, type: 'ewallet', metode });
        return res.json({ ok: !!d.data, data: d.data, msg: d.message });
      }

      /* Cek status deposit */
      case 'deposit_status': {
        const { id } = b;
        if (!id) return res.json({ ok: false, msg: 'ID deposit diperlukan' });
        const d = await atl('/deposit/status', { id });
        return res.json({ ok: !!d.data, data: d.data, msg: d.message });
      }

      /* Batalkan deposit */
      case 'deposit_cancel': {
        const { id } = b;
        if (!id) return res.json({ ok: false, msg: 'ID deposit diperlukan' });
        const d = await atl('/deposit/cancel', { id });
        return res.json({ ok: true, data: d.data, msg: d.message });
      }

      /* Buat transaksi topup ke provider */
      case 'txn_create': {
        const { reff_id, code, target } = b;
        if (!reff_id || !code || !target) return res.json({ ok: false, msg: 'Parameter tidak lengkap' });
        const d = await atl('/transaksi/create', { reff_id, code: code.toUpperCase(), target });
        return res.json({ ok: !!d.data, data: d.data, msg: d.message });
      }

      /* Cek status transaksi topup */
      case 'txn_status': {
        const { id } = b;
        if (!id) return res.json({ ok: false, msg: 'ID transaksi diperlukan' });
        const d = await atl('/transaksi/status', { id, type: 'prabayar' });
        return res.json({ ok: !!d.data, data: d.data, msg: d.message });
      }

      /* Cek nickname Free Fire */
      case 'check_ff': {
        const { id } = b;
        if (!id) return res.json({ ok: false, msg: 'ID diperlukan' });
        const r = await axios.get(`https://api.isan.eu.org/nickname/ff?id=${id}`, { timeout: 8000 });
        return res.json({ ok: true, data: r.data });
      }

      /* Cek nickname Mobile Legends */
      case 'check_ml': {
        const { id, server } = b;
        if (!id || !server) return res.json({ ok: false, msg: 'ID dan Server diperlukan' });
        const r = await axios.get(`https://api.isan.eu.org/nickname/ml?id=${id}&server=${server}`, { timeout: 8000 });
        return res.json({ ok: true, data: r.data });
      }

      default:
        return res.status(400).json({ ok: false, msg: 'Action tidak valid: ' + action });
    }
  } catch (err) {
    console.error('[proxy error]', action, err.message);
    return res.status(500).json({ ok: false, msg: 'Server error, coba beberapa saat lagi.' });
  }
};