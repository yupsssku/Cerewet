````
# GamesNow — Top Up Game & Digital

Platform top up otomatis berbasis web menggunakan API Atlantich2h.

## Cara Deploy ke Vercel

### 1. Clone / Upload ke GitHub

Pastikan semua file ada di repository GitHub kamu.

### 2. Buat Environment Variables di Vercel

Masuk ke **Vercel → Project → Settings → Environment Variables**, lalu tambahkan:

| Variable | Nilai |
|---|---|
| `API_BASE_URL` | `https://atlantich2h.com` |
| `API_SECRET_KEY` | API Key kamu dari Atlantich2h |
| `ADMIN_PASSWORD` | Password login halaman admin |
| `ADMIN_TOKEN` | String acak min 32 karakter (contoh: `G4mE5N0wTok3nS3cR3t2025xxXXyyZZ`) |
| `PROFIT_PERCENT` | Angka profit dalam persen, contoh: `1` |
| `OWNER_WHATSAPP` | Nomor WA tanpa `+`, contoh: `6283122028438` |

### 3. Deploy

Hubungkan repo ke Vercel dan klik Deploy.

## Struktur Halaman

| URL | Fungsi |
|---|---|
| `/` | Beranda — semua kategori produk |
| `/topup.html?game=ml` | Halaman top up Mobile Legends |
| `/topup.html?game=ff` | Halaman top up Free Fire |
| `/topup.html?game=dana` | Halaman top up DANA |
| `/admin.html` | Dashboard admin |

## Menambah Game Baru

Edit `topup.html`, cari `const GAME_CFG = {` dan tambahkan entri baru:

```javascript
namagame: {
  name: 'Nama Game',
  sub: 'Publisher',
  ico: '🎮',
  provider: 'Nama Provider (harus sama persis dengan data API)',
  category: 'Games',
  fields: [
    { id: 'userid', lbl: 'User ID', ph: 'Masukkan User ID' }
  ],
  target: f => f.userid,
},
```

Lalu tambahkan link di `index.html`.

## Keamanan

- ✅ API Key **tidak pernah** terekspos ke client
- ✅ Dashboard admin dilindungi password + session token
- ✅ Semua request sensitif melalui backend proxy
- ✅ CORS dikonfigurasi
```


## Cara Deploy

1. Upload semua file ke GitHub repository baru
2. Buka [vercel.com](https://vercel.com), import repository tersebut
3. Di Settings → Environment Variables, isi semua variabel dari `.env.example`
4. Klik **Deploy**

Selesai — website langsung live di domain Vercel, bisa disambungkan ke domain custom kamu.

````