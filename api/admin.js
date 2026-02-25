/**
 * api/admin.js
 * Endpoint khusus admin — semua aksi sensitif dilindungi token
 */
const axios = require('axios');

const BASE      = process.env.API_BASE_URL   || 'https://atlantich2h.com';
const KEY       = process.env.API_SECRET_KEY;
const ADMIN_PASS  = process.env.ADMIN_PASSWORD;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const OWNER_WA    = process.env.OWNER_WHATSAPP || '';

function genId(prefix = 'ADM') {
  return `${prefix}${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
}

function isAuthed(req) {
  const t = req.headers['x-admin-token'] || (req.body && req.body.token);
  return !!(ADMIN_TOKEN && t === ADMIN_TOKEN);
}

async function atl(endpoint, params = {}) {
  const body = new URLSearchParams({ ...params, api_key: KEY });
  const { data } = await axios.post(`${BASE}${endpoint}`, body.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 25000,
  });
  return data;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Token');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, msg: 'Method not allowed' });

  const action = req.query.action;
  const b = req.body || {};

  /* Login — satu-satunya endpoint tanpa auth */
  if (action === 'login') {
    if (!ADMIN_PASS || !ADMIN_TOKEN)
      return res.json({ ok: false, msg: 'Admin belum dikonfigurasi di environment.' });
    if (b.password !== ADMIN_PASS)
      return res.json({ ok: false, msg: 'Password salah.' });
    return res.json({ ok: true, token: ADMIN_TOKEN });
  }

  /* Semua action lain wajib token valid */
  if (!isAuthed(req))
    return res.status(401).json({ ok: false, msg: 'Unauthorized. Token tidak valid.' });

  try {
    switch (action) {

      /* Cek saldo akun API */
      case 'balance': {
        const d = await atl('/get_profile');
        return res.json({ ok: !!d.data, data: d.data });
      }

      /* Daftar produk (harga asli, tanpa profit) */
      case 'price_list': {
        const d = await atl('/layanan/price_list', { type: 'prabayar' });
        return res.json({ ok: !!d.data, data: d.data });
      }

      /* Beli langsung pakai saldo admin */
      case 'direct_buy': {
        const { code, target } = b;
        if (!code || !target)
          return res.json({ ok: false, msg: 'code dan target wajib diisi.' });
        const reff = genId('BUY');
        const d = await atl('/transaksi/create', { reff_id: reff, code: code.toUpperCase(), target });
        return res.json({ ok: !!d.data, data: d.data, msg: d.message });
      }

      /* Cek status transaksi */
      case 'txn_status': {
        const { id } = b;
        if (!id) return res.json({ ok: false, msg: 'ID transaksi diperlukan.' });
        const d = await atl('/transaksi/status', { id, type: 'prabayar' });
        return res.json({ ok: !!d.data, data: d.data });
      }

      /* Withdraw saldo ke rekening */
      case 'withdraw': {
        const { nominal, bank_code, nomor_akun, nama } = b;
        if (!nominal || !bank_code || !nomor_akun)
          return res.json({ ok: false, msg: 'Nominal, bank_code, dan nomor_akun wajib diisi.' });
        if (parseInt(nominal) < 3000)
          return res.json({ ok: false, msg: 'Minimal penarikan Rp 3.000.' });
        const reff = genId('WD');
        const d = await atl('/transfer/create', {
          ref_id:       reff,
          kode_bank:    bank_code,
          nomor_akun:   nomor_akun,
          nama_pemilik: nama || 'Admin GamesNow',
          nominal:      nominal,
          email:        'admin@gamesnow.id',
          phone:        OWNER_WA || nomor_akun,
          note:         `WD GamesNow ${reff}`,
        });
        return res.json({ ok: !!d.data, data: d.data, msg: d.message });
      }

      /* Cek status withdraw */
      case 'withdraw_status': {
        const { id } = b;
        if (!id) return res.json({ ok: false, msg: 'ID transfer diperlukan.' });
        const d = await atl('/transfer/status', { id });
        return res.json({ ok: !!d.data, data: d.data });
      }

      default:
        return res.status(400).json({ ok: false, msg: 'Action tidak valid.' });
    }
  } catch (err) {
    console.error('[admin error]', action, err.message);
    return res.status(500).json({ ok: false, msg: 'Server error.' });
  }
};
