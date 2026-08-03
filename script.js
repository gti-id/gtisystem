"use strict";
        var DB = { barang: [], penjualan: [], pembelian: [], modal: [], kasbank: [], quotation: [], coa: [], jurnal: [], counters: {}, users: [], audit: [], gudang: [], transfer: [], mitra: [], retur: [], opname: [] };
        var CFG = {
            company: "CV. Contoh Jaya", address: "Jl. Merdeka No. 123, Jakarta",
            phone: "021-5550123", email: "info@contohjaya.co.id", npwp: "", logo: "",
            apiUrl: "https://script.google.com/macros/s/AKfycbxxy5pSHbSH8HOVPtAs_ra5Wo8Ii22sCBKhOwWig6vkjLudSjkStqDB3mV6i8Fuv1T5/exec", taxDefault: 0, currency: "Rp",
            sessionJam: 12   // sesi login kedaluwarsa setelah sekian jam tanpa aktivitas
        };
        var SALES_INFO = {
            'MNA': { nama: 'Muhamad Nur Ardiansyah', tlp: '+62 822-1111-6847', p: 'Muhamad Nur Ardiansyah' },
            'LHY': { nama: 'Luis Liu', tlp: '+62 823-9189-4019', p: 'Luis Liu' },
            'RWD': { nama: 'Randy Wahyudi', tlp: '+62 812-7707-9779', p: 'Randy Wahyudi' },
            'MAU': { nama: 'Maulanal Azmi', tlp: '+62 812-5534-0572', p: 'Maulanal Azmi' },
            'ANT': { nama: 'Anto Setiadi Sastra', tlp: '+62 811-2284-343', p: 'Anto Setiadi Sastra' }
        };
        var CURRENT_PAGE = "dashboard";
        var cloudReady = false;

        function fmt4(n) {
            n = Number(n);
            if (!isFinite(n)) n = 0;
            return n.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
        }
        function fmt(n) {
            n = Number(n);
            if (!isFinite(n)) n = 0;
            return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
        function money(n) { return CFG.currency + " " + fmt(n); }
        function parseNum(v) {
            if (v === null || v === undefined) return 0;
            if (typeof v === 'number') return v;
            var s = String(v).replace(/,/g, '').replace(/[^0-9.\-]/g, '');
            var n = parseFloat(s);
            return isFinite(n) ? n : 0;
        }
        function round2(n) { return Math.round((Number(n) + Number.EPSILON) * 100) / 100; }
        function todayStr() {
            var d = new Date();
            return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        }
        function fmtDate(d) {
            if (!d) return '';
            var str = String(d);
            var x = new Date(d);
            if (isNaN(x)) return d;
            if (str.match(/^\d{4}-\d{2}-\d{2}/)) {
                x = new Date(parseInt(str.substring(0, 4), 10), parseInt(str.substring(5, 7), 10) - 1, parseInt(str.substring(8, 10), 10));
            }
            var b = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
            return x.getDate() + ' ' + b[x.getMonth()] + ' ' + x.getFullYear();
        }
        function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
        function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
        /* Selalu kembalikan array. Data dari Spreadsheet bisa datang sebagai teks
           JSON, angka, atau kosong — dan .forEach/.some pada nilai itu bikin crash. */
        function arr(v) {
            if (Array.isArray(v)) return v;
            if (typeof v === 'string' && v.trim()) {
                try { var p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch (e) { return []; }
            }
            return [];
        }

        function terbilang(n) {
            n = Math.floor(Math.abs(Number(n) || 0));
            var sat = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
            function t(x) {
                if (x < 12) return sat[x];
                if (x < 20) return t(x - 10) + ' belas';
                if (x < 100) return t(Math.floor(x / 10)) + ' puluh' + (x % 10 ? ' ' + t(x % 10) : '');
                if (x < 200) return 'seratus' + (x % 100 ? ' ' + t(x % 100) : '');
                if (x < 1000) return t(Math.floor(x / 100)) + ' ratus' + (x % 100 ? ' ' + t(x % 100) : '');
                if (x < 2000) return 'seribu' + (x % 1000 ? ' ' + t(x % 1000) : '');
                if (x < 1000000) return t(Math.floor(x / 1000)) + ' ribu' + (x % 1000 ? ' ' + t(x % 1000) : '');
                if (x < 1000000000) return t(Math.floor(x / 1000000)) + ' juta' + (x % 1000000 ? ' ' + t(x % 1000000) : '');
                if (x < 1000000000000) return t(Math.floor(x / 1000000000)) + ' miliar' + (x % 1000000000 ? ' ' + t(x % 1000000000) : '');
                return t(Math.floor(x / 1000000000000)) + ' triliun' + (x % 1000000000000 ? ' ' + t(x % 1000000000000) : '');
            }
            if (n === 0) return 'nol';
            return t(n).replace(/\s+/g, ' ').trim();
        }

        function nextNo(prefix) {
            var ym = new Date().toISOString().slice(0, 7).replace('-', '');
            var key = prefix + '-' + ym;
            DB.counters[key] = (DB.counters[key] || 0) + 1;
            return prefix + '-' + ym + '-' + String(DB.counters[key]).padStart(4, '0');
        }

        function saveLocal() {
            try {
                // localStorage.setItem('appPenjualan_DB', JSON.stringify(DB)); // Dihapus agar tidak menyimpan data di local storage
                localStorage.setItem('appPenjualan_CFG', JSON.stringify(CFG));
            } catch (e) { }
        }
        function loadLocal() {
            try {
                // var d = localStorage.getItem('appPenjualan_DB');
                var c = localStorage.getItem('appPenjualan_CFG');
                // if (d) DB = Object.assign(DB, JSON.parse(d)); // Dihapus agar selalu menggunakan data fresh (spreadsheet / default)
                if (c) CFG = Object.assign(CFG, JSON.parse(c));
            } catch (e) { }
        }

        /* true hanya setelah data berhasil ditarik utuh dari Spreadsheet.
           Selama false, aplikasi tidak boleh mengirim apa pun ke Sheet. */
        var DATA_SIAP = false;

        /* Pastikan bentuk data selalu benar sebelum dipakai render.
           Nilai dari Spreadsheet bisa datang sebagai teks JSON, angka, atau kosong. */
        function normalisasiDB() {
            ['barang', 'penjualan', 'pembelian', 'modal', 'kasbank', 'quotation',
                'coa', 'jurnal', 'users', 'audit', 'gudang', 'transfer', 'mitra', 'retur', 'opname'].forEach(function (k) {
                    if (!Array.isArray(DB[k])) DB[k] = arr(DB[k]);
                });
            var rusak = 0;
            ['penjualan', 'pembelian', 'quotation', 'transfer', 'retur', 'opname'].forEach(function (k) {
                DB[k].forEach(function (x) {
                    if (!Array.isArray(x.items)) { x.items = arr(x.items); rusak++; }
                });
            });
            DB.jurnal.forEach(function (j) {
                if (!Array.isArray(j.lines)) { j.lines = arr(j.lines); rusak++; }
            });
            DB.barang.forEach(function (b) {
                if (typeof b.lokasi === 'string') {
                    try { b.lokasi = JSON.parse(b.lokasi); } catch (e) { b.lokasi = null; }
                }
                if (!b.lokasi || typeof b.lokasi !== 'object' || Array.isArray(b.lokasi)) b.lokasi = null;
            });
            DB.users.forEach(function (u) {
                if (u.menus !== undefined && !Array.isArray(u.menus)) u.menus = arr(u.menus);
            });
            window.__dataRusak = rusak;
            if (rusak) console.warn('normalisasiDB: ' + rusak + ' baris rincian item tidak terbaca (kemungkinan kolom Spreadsheet bergeser).');
            return rusak;
        }

        /* Identitas perusahaan (nama, alamat, logo, dll) ikut disimpan di
           Spreadsheet supaya seragam di semua komputer dan saat di-hosting.
           URL Web App TIDAK ikut, karena itu memang milik masing-masing salinan. */
        var KUNCI_CFG = ['company', 'address', 'phone', 'email', 'npwp', 'logo', 'taxDefault', 'currency', 'sessionJam'];

        function terapkanCfgServer(cfg) {
            if (!cfg || typeof cfg !== 'object') return false;
            var ada = false;
            KUNCI_CFG.forEach(function (k) {
                if (cfg[k] === undefined || cfg[k] === '') return;
                CFG[k] = (k === 'taxDefault' || k === 'sessionJam') ? (Number(cfg[k]) || CFG[k]) : String(cfg[k]);
                ada = true;
            });
            if (ada) { saveLocal(); pasangIdentitas(); }
            return ada;
        }
        function cfgUntukServer() {
            var o = {};
            KUNCI_CFG.forEach(function (k) { o[k] = CFG[k] === undefined ? '' : CFG[k]; });
            return o;
        }

        function cloudPull() {
            if (!CFG.apiUrl) return Promise.resolve(false);
            return ambil(CFG.apiUrl + '?action=getAll&t=' + Date.now(), {}, 90)
                .then(parseBalasan)
                .then(function (j) {
                    if (j && j.ok) {
                        DB = Object.assign({ barang: [], penjualan: [], pembelian: [], modal: [], kasbank: [], quotation: [], coa: [], jurnal: [], counters: {}, users: [], audit: [], gudang: [], transfer: [], mitra: [], retur: [], opname: [] }, j.data);
                        // serverTime dipakai untuk deteksi konflik saat menyimpan.
                        // Jangan pernah di-reset ke 0 kalau server tidak mengirimnya,
                        // karena 0 membuat setiap penyimpanan dianggap konflik.
                        if (j.serverTime) CFG.lastSyncTime = j.serverTime;
                        terapkanCfgServer(j.cfg);
                        normalisasiDB();          // bentengi sebelum data dipakai render
                        DATA_SIAP = true;         // sejak titik ini aman menyimpan
                        cloudReady = true; saveLocal(); return true;
                    }
                    return false;
                }).catch(function () { return false; });
        }
        /* IZIN_KOSONGKAN hanya dinyalakan sesaat oleh tombol hapus data,
           supaya pengosongan yang memang disengaja tetap bisa dilakukan. */
        var IZIN_KOSONGKAN = false;

        function cloudPush(force) {
            if (!CFG.apiUrl) return Promise.resolve(false);
            var req;
            try {
                // fetch() bisa melempar langsung bila URL tidak valid / body gagal di-stringify
                req = ambil(CFG.apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({
                        action: 'saveAll', data: DB, cfg: cfgUntukServer(),
                        lastSyncTime: CFG.lastSyncTime || 0,
                        force: !!force, bolehKosong: IZIN_KOSONGKAN
                    })
                }, 180);
            } catch (e) {
                console.error('cloudPush gagal memulai request:', e);
                toast('URL Spreadsheet tidak valid: ' + e.message, 'err');
                return Promise.resolve(false);
            }
            return req.then(parseBalasan)
                .then(function (j) {
                    if (j && j.error === 'CONFLICT') {
                        // Perubahan di layar TIDAK langsung dibuang — pengguna yang memilih.
                        var pilihTimpa = confirm(
                            'Data di Spreadsheet lebih baru dari data di layar Anda.\n\n' +
                            'OK\t= Simpan perubahan Anda dan timpa data di Spreadsheet\n' +
                            'Batal\t= Buang perubahan Anda, ambil ulang data dari Spreadsheet'
                        );
                        if (pilihTimpa) return cloudPush(true);
                        return cloudPull().then(function () { go(CURRENT_PAGE); return false; });
                    }
                    if (j && j.serverTime) {
                        CFG.lastSyncTime = j.serverTime;
                        saveLocal();
                    }
                    if (j && !j.ok && j.error) {
                        toast('Spreadsheet menolak: ' + j.error, 'err');
                    }
                    // Sheet yang dilindungi karena kiriman menyusut drastis
                    if (j && j.ok && arr(j.dilewati).length) {
                        console.warn('Sheet dilindungi:', j.dilewati);
                        alert('⚠️ DATA DILINDUNGI\n\n' + j.dilewati.length + ' sheet TIDAK ditimpa karena ' +
                            'data di aplikasi jauh lebih sedikit daripada yang ada di Spreadsheet:\n\n' +
                            j.dilewati.map(function (s) { return '  • ' + s; }).join('\n') +
                            '\n\nData asli Anda AMAN dan tidak berubah.\n' +
                            'Tekan ⟳ untuk memuat ulang data dari Spreadsheet sebelum menyimpan lagi.');
                    }
                    if (j && j.cadangan) console.log('Cadangan harian dibuat:', j.cadangan);
                    return !!(j && j.ok);
                })
                .catch(function (e) {
                    console.error('cloudPush:', e);
                    var pesan = (e && e.name === 'AbortError')
                        ? 'waktu habis 3 menit — data terlalu besar atau koneksi lambat'
                        : (e && e.message ? e.message : e);
                    toast('Gagal menyimpan: ' + pesan, 'err');
                    return false;
                });
        }
        
        function auditLog(module, action) {
            var s = (typeof bacaSesi === 'function') ? bacaSesi() : null;
            var user = (s && s.u) || 'Unknown';
            if(!DB.audit) DB.audit = [];
            DB.audit.push({
                ts: new Date().getTime(),
                user: user,
                module: module,
                action: action
            });
            // Keep only last 1000 logs to save space
            if (DB.audit.length > 1000) {
                DB.audit = DB.audit.slice(-1000);
            }
        }

        function persist() {
            /* PENJAGA DATA — jangan pernah kirim ke Spreadsheet sebelum data
               berhasil ditarik utuh. Kalau pull gagal, DB di layar hanya berisi
               nilai default; mengirimkannya akan menimpa data asli di Sheet. */
            if (CFG.apiUrl && !DATA_SIAP) {
                console.warn('persist dibatalkan: data dari Spreadsheet belum termuat.');
                toast('Perubahan belum dikirim — data Spreadsheet belum termuat. Klik ⟳ dulu.', 'err');
                return;
            }

            // Tiap tahap dijaga terpisah supaya satu kegagalan tidak membatalkan
            // penyimpanan lain, dan pesan errornya jelas (bukan "Script error.").
            try { rebuildAutoJurnal(); }
            catch (e) { console.error('rebuildAutoJurnal:', e); toast('Jurnal otomatis gagal disusun: ' + e.message, 'err'); }

            try { saveLocal(); }
            catch (e) { console.error('saveLocal:', e); }

            if (!CFG.apiUrl) return;
            try {
                var st = document.getElementById('syncTxt');
                if (st) st.textContent = 'Menyimpan...';
                cloudPush().then(function (ok) {
                    try {
                        setSync(ok);
                        toast(ok ? 'Data tersimpan di Spreadsheet' : 'Gagal menyimpan ke Spreadsheet', ok ? 'ok' : 'err');
                    } catch (e) { console.error('setelah cloudPush:', e); }
                }).catch(function (e) {
                    console.error('cloudPush:', e);
                    toast('Gagal menyimpan ke Spreadsheet: ' + (e && e.message ? e.message : e), 'err');
                });
            } catch (e) {
                console.error('persist/cloud:', e);
                toast('Gagal sinkronisasi: ' + e.message, 'err');
            }
        }
        
        /* ===== KATALOG MENU (dipakai untuk checklist hak akses) ===== */
        var MENUS = [
            { key: 'dashboard',   label: 'Dashboard',        icon: '📊', grup: 'Operasional' },
            { key: 'mitra',       label: 'Pelanggan & Supplier', icon: '🤝', grup: 'Operasional' },
            { key: 'barang',      label: 'Barang & Jasa',    icon: '📦', grup: 'Operasional' },
            { key: 'gudang',      label: 'Gudang',           icon: '🏭', grup: 'Operasional' },
            { key: 'transfer',    label: 'Transfer Stok',    icon: '🔁', grup: 'Operasional' },
            { key: 'opname',      label: 'Stok Opname',      icon: '📋', grup: 'Operasional' },
            { key: 'retur',       label: 'Retur',            icon: '↩️', grup: 'Operasional' },
            { key: 'penjualan',   label: 'Penjualan',        icon: '🧾', grup: 'Operasional' },
            { key: 'pembelian',   label: 'Pembelian',        icon: '🛒', grup: 'Operasional' },
            { key: 'modal',       label: 'Modal',            icon: '💼', grup: 'Operasional' },
            { key: 'kasbank',     label: 'Kas & Bank',       icon: '🏦', grup: 'Operasional' },
            { key: 'quotation',   label: 'Quotation',        icon: '📝', grup: 'Operasional' },
            { key: 'piutang',     label: 'Piutang Usaha',    icon: '📥', grup: 'Keuangan' },
            { key: 'utang',       label: 'Utang Usaha',      icon: '📤', grup: 'Keuangan' },
            { key: 'coa',         label: 'Daftar Akun (COA)',icon: '📒', grup: 'Akuntansi' },
            { key: 'jurnal',      label: 'Jurnal Umum',      icon: '📓', grup: 'Akuntansi' },
            { key: 'bukubesar',   label: 'Buku Besar',       icon: '📚', grup: 'Akuntansi' },
            { key: 'neracasaldo', label: 'Neraca Saldo',     icon: '⚖️', grup: 'Akuntansi' },
            { key: 'rugilaba',    label: 'Laba Rugi',        icon: '📈', grup: 'Akuntansi' },
            { key: 'neraca',      label: 'Neraca',           icon: '🏛️', grup: 'Akuntansi' },
            { key: 'aruskas',     label: 'Arus Kas',         icon: '💧', grup: 'Laporan' },
            { key: 'analisis',    label: 'Analisis Penjualan', icon: '🔎', grup: 'Laporan' },
            { key: 'users',       label: 'Pengguna & Hak Akses', icon: '👥', grup: 'Sistem' },
            { key: 'pengaturan',  label: 'Pengaturan',       icon: '⚙️', grup: 'Sistem' }
        ];
        var ALL_MENU_KEYS = MENUS.map(function (m) { return m.key; });
        var DEFAULT_MENUS = ['dashboard', 'barang', 'penjualan', 'quotation'];

        /* ===== SESI LOGIN =====
           Sesi disimpan bersama waktu aktivitas terakhir. Kalau aplikasi tidak
           dipakai lebih lama dari batas ini, pengguna diminta login lagi. */
        var SESI_KEY = 'appPenjualan_Session';
        function batasSesiJam() {
            var j = Number(CFG.sessionJam);
            return (isFinite(j) && j > 0) ? j : 12;   // default 12 jam
        }
        function bacaSesi() {
            var raw = localStorage.getItem(SESI_KEY);
            if (!raw) return null;
            var s;
            try { s = JSON.parse(raw); } catch (e) { s = null; }
            // Format lama hanya berisi username polos — anggap kedaluwarsa,
            // supaya pengguna login ulang sekali lalu pakai format baru.
            if (!s || typeof s !== 'object' || !s.u) return null;
            return s;
        }
        function tulisSesi(username) {
            localStorage.setItem(SESI_KEY, JSON.stringify({ u: username, t: Date.now() }));
        }
        function hapusSesi() { localStorage.removeItem(SESI_KEY); }
        function sesiKedaluwarsa(s) {
            if (!s || !s.t) return true;
            var lewatJam = (Date.now() - Number(s.t)) / 3600000;
            return lewatJam >= batasSesiJam();
        }
        // Perpanjang sesi selama aplikasi dipakai (kedaluwarsa dihitung dari
        // aktivitas terakhir, bukan dari waktu login).
        function segarkanSesi() {
            var s = bacaSesi();
            if (s && !sesiKedaluwarsa(s)) tulisSesi(s.u);
        }
        function currentUser() {
            var s = bacaSesi();
            if (!s || !DB.users) return null;
            if (sesiKedaluwarsa(s)) { hapusSesi(); return null; }
            var u = DB.users.find(function (x) { return x.username === s.u; }) || null;
            if (u && u.aktif === false) return null;   // akun dinonaktifkan Admin
            return u;
        }
        // Daftar menu efektif milik seorang user. Admin = akses penuh.
        function menusOf(u) {
            if (!u) return [];
            if (u.role === 'Admin') return ALL_MENU_KEYS.slice();
            var m = u.menus;
            if (typeof m === 'string') { try { m = JSON.parse(m); } catch (e) { m = m.split(',').map(function (s) { return s.trim(); }).filter(Boolean); } }
            if (!Array.isArray(m)) m = DEFAULT_MENUS.slice();
            // 'users' & 'pengaturan' hanya untuk Admin
            m = m.filter(function (k) { return ALL_MENU_KEYS.indexOf(k) !== -1 && k !== 'users'; });
            if (m.indexOf('dashboard') === -1) m.unshift('dashboard');
            return m;
        }
        function canAccess(page) {
            var u = currentUser();
            if (!u) return false;
            return menusOf(u).indexOf(page) !== -1;
        }
        window.isAdmin = function () { var u = currentUser(); return !!u && u.role === 'Admin'; };

        /* =====================================================================
           NAVIGASI v3 — sidebar berkategori + tab halaman
           ===================================================================== */
        var GRUP_IKON = { 'Operasional': '🧭', 'Keuangan': '💰', 'Akuntansi': '📚', 'Laporan': '📈', 'Sistem': '⚙️' };
        var KEY_GRUP_BUKA = 'appPenjualan_GrupBuka';
        var KEY_TABS = 'appPenjualan_Tabs';

        function labelMenu(key) {
            var m = MENUS.find(function (x) { return x.key === key; });
            return m ? m.label : key;
        }
        function ikonMenu(key) {
            var m = MENUS.find(function (x) { return x.key === key; });
            return m ? m.icon : '•';
        }
        function grupMenu(key) {
            var m = MENUS.find(function (x) { return x.key === key; });
            return m ? m.grup : 'Lainnya';
        }

        function grupTerbuka() {
            try {
                var v = JSON.parse(localStorage.getItem(KEY_GRUP_BUKA));
                if (Array.isArray(v)) return v;
            } catch (e) { }
            return null;   // null = belum pernah diatur
        }
        function simpanGrupTerbuka(daftar) {
            try { localStorage.setItem(KEY_GRUP_BUKA, JSON.stringify(daftar)); } catch (e) { }
        }
        window.toggleGrupMenu = function (nama) {
            var el = document.querySelector('.nav-group[data-grup="' + nama + '"]');
            if (!el) return;
            el.classList.toggle('open');
            var buka = [];
            document.querySelectorAll('.nav-group.open').forEach(function (g) { buka.push(g.dataset.grup); });
            simpanGrupTerbuka(buka);
        };

        /* Bangun sidebar dari MENUS, hanya menu yang boleh diakses user */
        function bangunNav() {
            var nav = document.getElementById('nav');
            if (!nav) return;
            var u = currentUser();
            var boleh = menusOf(u);
            var aktifSekarang = CURRENT_PAGE || boleh[0];
            var grupAktif = grupMenu(aktifSekarang);
            var tersimpan = grupTerbuka();

            var urutan = [];
            MENUS.forEach(function (m) { if (urutan.indexOf(m.grup) === -1) urutan.push(m.grup); });

            var h = '';
            urutan.forEach(function (g) {
                var isi = MENUS.filter(function (m) { return m.grup === g && boleh.indexOf(m.key) !== -1; });
                if (!isi.length) return;
                // Default: buka grup yang memuat halaman aktif. Kalau user pernah
                // mengatur sendiri, ikuti pilihannya.
                var buka = tersimpan ? (tersimpan.indexOf(g) !== -1) : (g === grupAktif);
                if (g === grupAktif) buka = true;
                h += '<div class="nav-group' + (buka ? ' open' : '') + '" data-grup="' + esc(g) + '">' +
                    '<button class="nav-group-head" onclick="toggleGrupMenu(\'' + esc(g) + '\')" type="button" title="' + esc(g) + '">' +
                    '<span class="ic">' + (GRUP_IKON[g] || '📁') + '</span>' +
                    '<span class="lbl">' + esc(g) + '</span>' +
                    '<span class="cnt">' + isi.length + '</span>' +
                    '<span class="arw">▶</span>' +
                    '</button><div class="nav-group-body"><div>';
                isi.forEach(function (m) {
                    h += '<button class="nav-item' + (m.key === aktifSekarang ? ' active' : '') + '" type="button" ' +
                        'data-page="' + m.key + '" title="' + esc(m.label) + '">' +
                        '<span class="ic">' + m.icon + '</span><span class="tx">' + esc(m.label) + '</span></button>';
                });
                h += '</div></div></div>';
            });
            nav.innerHTML = h || '<div style="padding:16px;color:#a9bdf0;font-size:12px">Tidak ada menu yang bisa diakses.</div>';

            pasangIdentitasUser(u);
        }

        /* Tampilkan nama pengguna yang sedang masuk — di sidebar dan topbar */
        function pasangIdentitasUser(u) {
            u = u || currentUser();
            var nama = u ? String(u.nama || u.username) : '';
            var inisial = nama ? nama.charAt(0).toUpperCase() : '?';
            var peran = u ? String(u.role || 'Pengguna') : '';

            var su = document.getElementById('sideUser');
            if (su) {
                su.innerHTML = u
                    ? '<div class="ava">' + esc(inisial) + '</div>' +
                      '<div style="min-width:0"><div class="nm">' + esc(nama) + '</div>' +
                      '<div class="rl">' + esc(peran) + '</div></div>'
                    : '';
            }
            var chip = document.getElementById('userChip');
            if (chip) chip.style.display = u ? '' : 'none';
            var el;
            if ((el = document.getElementById('userAva'))) el.textContent = inisial;
            if ((el = document.getElementById('userNama'))) el.textContent = nama;
            if ((el = document.getElementById('userRole'))) el.textContent = peran;
        }

        /* ---------- Profil sendiri & ganti password ---------- */
        window.bukaProfil = function () {
            var u = currentUser();
            if (!u) { toast('Sesi tidak ditemukan, silakan masuk lagi', 'err'); return; }
            var mk = menusOf(u);
            openModal(
                '<div class="modal-head"><h3>Profil Saya</h3><button class="x" onclick="closeModal()">&times;</button></div>' +
                '<div class="modal-body">' +
                '<div class="profil-head">' +
                '<div class="ava-besar">' + esc(String(u.nama || u.username).charAt(0).toUpperCase()) + '</div>' +
                '<div><div class="profil-nama">' + esc(u.nama || u.username) + '</div>' +
                '<div class="text-muted">' + esc(u.username) + ' &middot; ' + esc(u.role || 'Pengguna') + '</div></div>' +
                '</div>' +

                '<div class="grid2">' +
                fld('Nama Lengkap', 'pfNama', u.nama || '') +
                '<div class="field"><label>Username</label><input value="' + esc(u.username) + '" disabled></div>' +
                '</div>' +
                '<div class="hint">Username dan hak akses hanya bisa diubah oleh Admin.</div>' +
                '<div style="margin-top:10px"><button class="btn btn-ghost btn-sm" onclick="simpanProfil()">💾 Simpan Nama</button></div>' +

                '<div class="divider"></div>' +
                '<div style="font-weight:700;font-size:14px;margin-bottom:8px">Ganti Password</div>' +
                '<div class="field"><label>Password Saat Ini *</label>' +
                '<div class="input-wrap"><input type="password" id="pwLama" autocomplete="current-password">' +
                '<button type="button" class="eye-btn" onclick="lihatPw(\'pwLama\',this)" title="Lihat">👁️</button></div></div>' +
                '<div class="grid2">' +
                '<div class="field"><label>Password Baru *</label>' +
                '<div class="input-wrap"><input type="password" id="pwBaru" autocomplete="new-password" oninput="cekKuatPw()">' +
                '<button type="button" class="eye-btn" onclick="lihatPw(\'pwBaru\',this)" title="Lihat">👁️</button></div>' +
                '<div class="hint" id="pwKuat" style="margin-top:4px">Minimal 6 karakter.</div></div>' +
                '<div class="field"><label>Ulangi Password Baru *</label>' +
                '<div class="input-wrap"><input type="password" id="pwUlang" autocomplete="new-password" oninput="cekKuatPw()">' +
                '<button type="button" class="eye-btn" onclick="lihatPw(\'pwUlang\',this)" title="Lihat">👁️</button></div>' +
                '<div class="hint" id="pwCocok" style="margin-top:4px"></div></div>' +
                '</div>' +

                '<div class="divider"></div>' +
                '<div class="field"><label>Menu Yang Bisa Anda Akses (' + mk.length + ')</label><div>' +
                mk.map(function (k) {
                    return '<span class="pill" style="margin:2px 3px 2px 0;display:inline-block">' + ikonMenu(k) + ' ' + esc(labelMenu(k)) + '</span>';
                }).join('') + '</div></div>' +
                '</div>' +
                '<div class="modal-foot"><button class="btn btn-ghost" onclick="closeModal()">Tutup</button>' +
                '<button class="btn btn-primary" onclick="gantiPassword()">🔑 Ganti Password</button></div>'
            );
        };

        window.lihatPw = function (id, btn) {
            var inp = document.getElementById(id);
            if (!inp) return;
            var lihat = inp.type === 'password';
            inp.type = lihat ? 'text' : 'password';
            if (btn) { btn.textContent = lihat ? '🙈' : '👁️'; btn.classList.toggle('on', lihat); }
        };

        window.cekKuatPw = function () {
            var b = val('pwBaru'), u = val('pwUlang');
            var kuat = document.getElementById('pwKuat'), cocok = document.getElementById('pwCocok');
            if (kuat) {
                if (!b) { kuat.textContent = 'Minimal 6 karakter.'; kuat.style.color = ''; }
                else if (b.length < 6) { kuat.textContent = 'Terlalu pendek (' + b.length + '/6)'; kuat.style.color = 'var(--danger)'; }
                else {
                    var poin = (b.length >= 10 ? 1 : 0) + (/[A-Z]/.test(b) ? 1 : 0) + (/[0-9]/.test(b) ? 1 : 0) + (/[^A-Za-z0-9]/.test(b) ? 1 : 0);
                    var label = poin >= 3 ? 'Kuat' : (poin >= 2 ? 'Cukup' : 'Lemah');
                    kuat.textContent = 'Panjang ' + b.length + ' karakter — ' + label;
                    kuat.style.color = poin >= 3 ? 'var(--ok)' : (poin >= 2 ? 'var(--warn)' : 'var(--danger)');
                }
            }
            if (cocok) {
                if (!u) { cocok.textContent = ''; }
                else if (u === b) { cocok.textContent = '✓ Cocok'; cocok.style.color = 'var(--ok)'; }
                else { cocok.textContent = '✗ Belum sama'; cocok.style.color = 'var(--danger)'; }
            }
        };

        window.simpanProfil = function () {
            var u = currentUser();
            if (!u) { toast('Sesi tidak ditemukan', 'err'); return; }
            var nama = val('pfNama').trim();
            var i = arr(DB.users).findIndex(function (x) { return x.username === u.username; });
            if (i < 0) { toast('Data pengguna tidak ditemukan', 'err'); return; }
            DB.users[i].nama = nama;
            auditLog('Profil', 'Ubah nama tampilan menjadi "' + nama + '"');
            pasangIdentitasUser(DB.users[i]);
            bangunNav();
            toast('Nama tersimpan', 'ok');
            persist();
        };

        window.gantiPassword = function () {
            var u = currentUser();
            if (!u) { toast('Sesi tidak ditemukan, silakan masuk lagi', 'err'); return; }
            var lama = val('pwLama'), baru = val('pwBaru'), ulang = val('pwUlang');

            if (!lama) { toast('Isi password saat ini', 'err'); return; }
            if (String(lama) !== String(u.password)) { toast('Password saat ini salah', 'err'); return; }
            if (!baru) { toast('Isi password baru', 'err'); return; }
            if (baru.length < 6) { toast('Password baru minimal 6 karakter', 'err'); return; }
            if (baru !== ulang) { toast('Ulangi password belum sama', 'err'); return; }
            if (baru === lama) { toast('Password baru tidak boleh sama dengan yang lama', 'err'); return; }

            var i = arr(DB.users).findIndex(function (x) { return x.username === u.username; });
            if (i < 0) { toast('Data pengguna tidak ditemukan', 'err'); return; }
            DB.users[i].password = baru;
            auditLog('Profil', 'Ganti password sendiri');
            closeModal();
            toast('Password berhasil diganti', 'ok');
            persist();
        };

        /* ---------- TAB HALAMAN ---------- */
        var TABS = [];
        function bacaTabs() {
            try {
                var v = JSON.parse(localStorage.getItem(KEY_TABS));
                if (Array.isArray(v)) return v.filter(function (k) { return ALL_MENU_KEYS.indexOf(k) !== -1; });
            } catch (e) { }
            return [];
        }
        function simpanTabs() {
            try { localStorage.setItem(KEY_TABS, JSON.stringify(TABS)); } catch (e) { }
        }
        function bukaTab(page) {
            if (TABS.indexOf(page) === -1) {
                TABS.push(page);
                if (TABS.length > 10) TABS.shift();   // batasi supaya tidak menumpuk
            }
            simpanTabs();
        }
        window.pilihTab = function (page) { go(page); };
        window.tutupTab = function (page, ev) {
            if (ev && ev.stopPropagation) ev.stopPropagation();
            var i = TABS.indexOf(page);
            if (i === -1) return;
            TABS.splice(i, 1);
            simpanTabs();
            if (CURRENT_PAGE === page) {
                var berikut = TABS[i] || TABS[i - 1] || TABS[0];
                if (berikut) { go(berikut); return; }
                var u = currentUser();
                go(menusOf(u)[0] || 'dashboard');
                return;
            }
            gambarTabs();
        };
        window.tutupSemuaTab = function () {
            TABS = CURRENT_PAGE ? [CURRENT_PAGE] : [];
            simpanTabs();
            gambarTabs();
        };
        function gambarTabs() {
            var bar = document.getElementById('tabbar');
            if (!bar) return;
            var boleh = menusOf(currentUser());
            TABS = TABS.filter(function (k) { return boleh.indexOf(k) !== -1; });
            if (!TABS.length) { bar.innerHTML = ''; return; }
            var h = TABS.map(function (k) {
                var aktif = k === CURRENT_PAGE;
                return '<div class="tab' + (aktif ? ' active' : '') + '" onclick="pilihTab(\'' + k + '\')" ' +
                    'title="' + esc(labelMenu(k)) + '" role="tab" tabindex="0">' +
                    '<span>' + ikonMenu(k) + '</span><span class="tt">' + esc(labelMenu(k)) + '</span>' +
                    (TABS.length > 1 ? '<button class="x" onclick="tutupTab(\'' + k + '\',event)" title="Tutup tab">&times;</button>' : '') +
                    '</div>';
            }).join('');
            if (TABS.length > 2) {
                h += '<div class="tab-tools"><button class="icon-btn" title="Tutup tab lain" ' +
                    'onclick="tutupSemuaTab()" style="font-size:13px">⤫</button></div>';
            }
            bar.innerHTML = h;
            var akt = bar.querySelector('.tab.active');
            if (akt && akt.scrollIntoView) akt.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        }

        /* ---------- Sidebar: laci di HP, ciut/lebar di desktop ---------- */
        var KEY_RAIL = 'appPenjualan_SidebarCiut';

        window.bukaSidebar = function () {
            var s = document.getElementById('sidebar'), o = document.getElementById('sidebarOverlay');
            if (s) s.classList.add('show');
            if (o) o.classList.add('show');
        };
        window.tutupSidebar = function () {
            var s = document.getElementById('sidebar'), o = document.getElementById('sidebarOverlay');
            if (s) s.classList.remove('show');
            if (o) o.classList.remove('show');
        };
        function mobile() { return window.matchMedia('(max-width: 860px)').matches; }

        // Di HP: buka/tutup laci. Di desktop: ciutkan jadi bilah ikon.
        window.toggleSidebar = function () {
            if (mobile()) {
                var s = document.getElementById('sidebar');
                if (s && s.classList.contains('show')) tutupSidebar(); else bukaSidebar();
                return;
            }
            var ciut = !document.body.classList.contains('rail');
            pasangRail(ciut);
            try { localStorage.setItem(KEY_RAIL, ciut ? '1' : '0'); } catch (e) { }
        };

        function pasangRail(ciut) {
            document.body.classList.toggle('rail', !!ciut);
            var b = document.getElementById('btnMenu');
            if (b) {
                b.textContent = ciut ? '»' : '☰';
                b.title = ciut ? 'Tampilkan menu' : 'Sembunyikan menu';
                b.setAttribute('aria-label', b.title);
            }
        }
        // Pulihkan pilihan terakhir saat aplikasi dibuka
        function muatPilihanSidebar() {
            var v = null;
            try { v = localStorage.getItem(KEY_RAIL); } catch (e) { }
            pasangRail(v === '1' && !mobile());
        }

        /* ---------- Lihat password ---------- */
        window.togglePassword = function () {
            var inp = document.getElementById('loginPassword');
            var btn = document.getElementById('eyeBtn');
            if (!inp) return;
            var lihat = inp.type === 'password';
            inp.type = lihat ? 'text' : 'password';
            if (btn) {
                btn.textContent = lihat ? '🙈' : '👁️';
                btn.classList.toggle('on', lihat);
                btn.title = lihat ? 'Sembunyikan password' : 'Lihat password';
                btn.setAttribute('aria-label', btn.title);
            }
            try { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); } catch (e) { }
        };

        /* LOGIN SYSTEM */
        function bukaAplikasi() {
            var el = document.getElementById('loginScreen');
            if (el) { el.classList.add('hidden'); el.classList.remove('show'); }
        }
        function kunciAplikasi() {
            var el = document.getElementById('loginScreen');
            if (el) { el.classList.remove('hidden'); el.classList.add('show'); }
            var main = document.getElementById('main');
            if (main) main.innerHTML = '';    // kosongkan isi halaman di belakang layar login
            ['tabbar', 'nav', 'sideUser'].forEach(function (id) {
                var n = document.getElementById(id); if (n) n.innerHTML = '';
            });
            pasangIdentitasUser(null);
            var c = document.getElementById('crumb'); if (c) c.textContent = '';
            tutupSidebar();
            var p = document.getElementById('loginPassword');
            if (p) { p.value = ''; p.type = 'password'; }
            var eb = document.getElementById('eyeBtn');
            if (eb) { eb.textContent = '👁️'; eb.classList.remove('on'); }
        }

        /* Masuk ke aplikasi: tarik seluruh data dulu, baru buka halaman.
           Halaman tidak pernah dirender dari data yang belum termuat. */
        function masukAplikasi(u) {
            var buka = function () {
                var user = currentUser() || u;
                var boleh = menusOf(user);
                TABS = bacaTabs().filter(function (k) { return boleh.indexOf(k) !== -1; });
                var awal = (TABS.indexOf(CURRENT_PAGE) !== -1 ? CURRENT_PAGE : TABS[TABS.length - 1]) || boleh[0] || 'dashboard';
                go(awal);
            };
            if (!CFG.apiUrl) { buka(); return; }
            tarikSemuaData(function (ok) {
                buka();
                if (ok) toast('Data Spreadsheet termuat', 'ok');
            });
        }

        function checkLogin() {
            // Seed default user hanya kalau daftar pengguna memang kosong
            if (!DB.users || DB.users.length === 0) {
                DB.users = [{ username: 'admin', password: 'admin123', role: 'Admin', menus: ALL_MENU_KEYS.slice() }];
                if (!CFG.apiUrl) persist();
            }

            var adaSesi = !!localStorage.getItem(SESI_KEY);
            var validUser = currentUser();

            if (validUser) {
                segarkanSesi();
                bukaAplikasi();
                masukAplikasi(validUser);
            } else {
                kunciAplikasi();
                if (adaSesi) {
                    hapusSesi();
                    var el = document.getElementById('loginError');
                    if (el) {
                        el.textContent = 'Sesi Anda sudah berakhir, silakan masuk kembali.';
                        el.style.color = 'var(--muted)';
                        el.style.display = 'block';
                    }
                }
                var uInp = document.getElementById('loginUsername');
                if (uInp) uInp.focus();
            }
        }

        window.doLogin = function() {
            var u = document.getElementById('loginUsername').value.trim();
            var p = document.getElementById('loginPassword').value.trim();

            var validUser = DB.users.find(function(user) {
                return user.username === u && user.password === p;
            });

            var el = document.getElementById('loginError');
            var pesan = function (teks, warna) {
                if (!el) return;
                el.textContent = teks;
                el.style.color = warna || 'var(--danger)';
                el.style.display = 'block';
            };

            if (validUser && validUser.aktif === false) {
                pesan('Akun ini dinonaktifkan. Hubungi Admin.');
                return;
            }

            if (validUser) {
                tulisSesi(validUser.username);
                bukaAplikasi();
                if (el) el.style.display = 'none';
                var pw = document.getElementById('loginPassword');
                pw.value = ''; pw.type = 'password';
                var eb = document.getElementById('eyeBtn');
                if (eb) { eb.textContent = '👁️'; eb.classList.remove('on'); }
                auditLog('Login', 'Masuk sebagai ' + validUser.username);
                masukAplikasi(validUser);
            } else {
                pesan('Username atau password salah!');
            }
        }

        window.doLogout = function () {
            var s = bacaSesi();
            if (s) auditLog('Login', 'Keluar — ' + s.u);
            hapusSesi();
            document.getElementById('loginUsername').value = '';
            document.getElementById('loginPassword').value = '';
            var el = document.getElementById('loginError');
            if (el) el.style.display = 'none';
            kunciAplikasi();
        }

        // Tekan Enter di kolom login = klik tombol Masuk
        document.addEventListener('keydown', function (e) {
            if (e.key !== 'Enter') return;
            var scr = document.getElementById('loginScreen');
            if (!scr || scr.classList.contains('hidden')) return;
            if (e.target && (e.target.id === 'loginUsername' || e.target.id === 'loginPassword')) doLogin();
        });

        function setSync(on) {
            cloudReady = on;
            var pasang = function (idDot, idTxt, panjang) {
                var dot = document.getElementById(idDot), t = document.getElementById(idTxt);
                if (!dot || !t) return;
                if (CFG.apiUrl) {
                    dot.classList.toggle('on', on);
                    t.textContent = on ? (panjang ? 'Tersambung ke Sheet' : 'Tersambung') : (panjang ? 'Sheet: gagal sync' : 'Gagal sync');
                } else {
                    dot.classList.remove('on');
                    t.textContent = panjang ? 'Mode Lokal' : 'Lokal';
                }
            };
            pasang('syncDot', 'syncTxt', true);     // di sidebar
            pasang('syncDot2', 'syncTxt2', false);  // di topbar

            // Tandai jelas kalau data belum termuat: perubahan tidak akan dikirim
            var chip = document.getElementById('syncChip');
            if (chip) {
                var bahaya = CFG.apiUrl && !DATA_SIAP;
                chip.classList.toggle('warn', !!bahaya);
                chip.title = bahaya
                    ? 'Data Spreadsheet belum termuat — perubahan tidak akan disimpan. Klik ⟳ untuk memuat.'
                    : 'Status sinkronisasi';
                var t2 = document.getElementById('syncTxt2');
                if (t2 && bahaya) t2.textContent = 'Belum termuat';
            }
        }

        var toastTimer = null;
        function toast(msg, type) {
            var el = document.getElementById('toast');
            if (!el) { console.log('[toast]', msg); return; }
            el.textContent = msg; el.className = 'toast show ' + (type || '');
            clearTimeout(toastTimer);
            toastTimer = setTimeout(function () { el.className = 'toast'; }, 2600);
        }

        /* Penangkap error global — supaya tombol yang gagal tidak pernah lagi
           "tidak terjadi apa-apa" tanpa penjelasan. */
        window.addEventListener('error', function (ev) {
            // Abaikan gagal-muat resource (gambar/script), bukan error logika
            if (ev.target && ev.target !== window && ev.target.tagName) return;
            var e = ev.error;
            console.error('Kesalahan aplikasi:', (e && e.stack) || ev.message, ev.filename || '', ev.lineno || '');
            if (window.__errors) window.__errors.push({ waktu: new Date().toLocaleString('id-ID'), aksi: 'global', pesan: (e && e.message) || ev.message, baris: ev.lineno, stack: e && e.stack });
            var pesan = (e && e.message) || ev.message || '';
            // Browser menyamarkan detail error jadi "Script error." bila file dibuka
            // langsung dari disk (file://) atau script beda origin.
            if (!pesan || /script error/i.test(pesan)) {
                pesan = 'detail disembunyikan browser — buka Console (F12) untuk melihat pesan aslinya';
            } else if (ev.lineno) {
                pesan += ' (baris ' + ev.lineno + ')';
            }
            try { toast('Terjadi kesalahan: ' + pesan, 'err'); } catch (x) { }
        });
        window.addEventListener('unhandledrejection', function (ev) {
            console.error('Promise gagal:', ev.reason);
            var r = ev.reason;
            try { toast('Gagal memproses: ' + ((r && r.message) ? r.message : r), 'err'); } catch (x) { }
        });

        /* Pembungkus aman: error di dalam handler tombol dilaporkan dengan pesan
           asli, tidak tertelan jadi "Script error." */
        window.__errors = [];   // riwayat error, ketik __errors di Console untuk melihat
        function catatError(label, e) {
            window.__errors.push({ waktu: new Date().toLocaleString('id-ID'), aksi: label, pesan: (e && e.message) || String(e), stack: e && e.stack });
            if (window.__errors.length > 50) window.__errors.shift();
            console.error('[' + label + ']', e);
        }
        function amanCall(label, fn) {
            return function () {
                try { return fn.apply(this, arguments); }
                catch (e) {
                    catatError(label, e);
                    toast('Gagal ' + label + ': ' + ((e && e.message) ? e.message : e), 'err');
                }
            };
        }

        function openModal(html) {
            document.getElementById('modal').innerHTML = html;
            document.getElementById('overlay').classList.add('show');
        }
        function closeModal() { document.getElementById('overlay').classList.remove('show'); }
        document.getElementById('overlay').addEventListener('mousedown', function (e) { if (e.target.id === 'overlay') closeModal(); });

        function saldoAkun(akun) {
            var s = 0;
            DB.kasbank.forEach(function (k) {
                if (k.akun === akun) s += (k.arah === 'Masuk' ? k.jumlah : -k.jumlah);
            });
            return round2(s);
        }
        function totalModal() {
            var s = 0; DB.modal.forEach(function (m) { s += (m.jenis === 'Setor' ? m.jumlah : -m.jumlah); });
            return round2(s);
        }
        function nilaiStok() {
            var s = 0;
            DB.barang.forEach(function (b) {
                if (isJasa(b)) return;                 // jasa tidak punya persediaan
                s += (Number(b.stok) || 0) * (Number(b.hargaBeli) || 0);
            });
            return round2(s);
        }
        function sumBulan(daftar, field) {   // jangan pakai nama 'arr' — bentrok dengan helper arr()
            var d = new Date();
            var currMonth = d.getMonth();
            var currYear = d.getFullYear();
            var s = 0;
            arr(daftar).forEach(function (x) {
                var t = String(x.tanggal || '');
                var y, m;
                if (t.match(/^\d{4}-\d{2}-\d{2}/)) {
                    y = parseInt(t.substring(0, 4), 10);
                    m = parseInt(t.substring(5, 7), 10) - 1;
                } else {
                    var pt = new Date(t);
                    if (!isNaN(pt)) {
                        y = pt.getFullYear();
                        m = pt.getMonth();
                    }
                }
                if (y === currYear && m === currMonth) {
                    s += Number(x[field]) || 0;
                }
            });
            return round2(s);
        }
        /* =====================================================================
           MITRA (PELANGGAN & SUPPLIER)
           ===================================================================== */
        function findMitra(id) {
            if (!id) return null;
            return (DB.mitra || []).find(function (m) { return String(m.id) === String(id); }) || null;
        }
        function namaMitra(x) {
            var m = findMitra(x && x.mitraId);
            return m ? m.nama : String((x && x.pelanggan) || '');
        }
        function mitraJenis(jenis) {
            return (DB.mitra || []).filter(function (m) {
                if (m.aktif === false) return false;
                var j = String(m.jenis || 'Keduanya');
                return j === 'Keduanya' || j === jenis;
            });
        }
        function opsiMitra(jenis, terpilih) {
            var h = '<option value="">— ketik manual / pilih —</option>';
            mitraJenis(jenis).forEach(function (m) {
                h += '<option value="' + esc(m.id) + '"' + (String(m.id) === String(terpilih) ? ' selected' : '') + '>' +
                    esc((m.kode ? m.kode + ' — ' : '') + m.nama) + '</option>';
            });
            return h;
        }

        /* =====================================================================
           PIUTANG & UTANG
           caraBayar 'Tunai' -> kas langsung tercatat (perilaku lama)
           caraBayar 'Kredit' -> jadi piutang/utang, dilunasi bertahap
           ===================================================================== */
        function caraBayarTrx(x) {
            var c = String((x && x.caraBayar) || '').toLowerCase();
            if (c === 'kredit') return 'Kredit';
            return 'Tunai';                       // data lama = lunas, sesuai perilaku lama
        }
        function totalBayar(x) {
            var s = 0;
            arr(x && x.bayar).forEach(function (p) { s += Number(p.jumlah) || 0; });
            return round2(s);
        }
        function sisaTagihan(x) {
            if (caraBayarTrx(x) === 'Tunai') return 0;
            return round2((Number(x.total) || 0) - totalBayar(x));
        }
        function statusBayar(x) {
            if (caraBayarTrx(x) === 'Tunai') return 'Lunas';
            var sisa = sisaTagihan(x);
            if (sisa <= 0.009) return 'Lunas';
            return totalBayar(x) > 0 ? 'Sebagian' : 'Belum Bayar';
        }
        function jatuhTempoTrx(x) {
            if (x.jatuhTempo) return x.jatuhTempo;
            var t = String(x.tanggal || '');
            var hari = Number(x.termin) || 0;
            if (!t || !hari) return t;
            var d = new Date(t);
            if (isNaN(d)) return t;
            d.setDate(d.getDate() + hari);
            return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        }
        function umurHari(tgl) {
            var d = new Date(tgl);
            if (isNaN(d)) return 0;
            return Math.floor((new Date(todayStr()) - d) / 86400000);
        }
        // Daftar tagihan yang belum lunas
        function daftarTagihan(mode) {          // mode: 'jual' | 'beli'
            var sumber = mode === 'jual' ? DB.penjualan : DB.pembelian;
            return arr(sumber).filter(function (x) {
                return x.status !== 'Draft' && caraBayarTrx(x) === 'Kredit' && sisaTagihan(x) > 0.009;
            }).sort(function (a, b) {
                return String(jatuhTempoTrx(a)).localeCompare(String(jatuhTempoTrx(b)));
            });
        }

        /* Tandai transaksi lama sebagai Tunai/Lunas supaya perilaku & saldo kas
           tidak berubah setelah fitur piutang ditambahkan. */
        function migrasiTransaksi() {
            ['penjualan', 'pembelian'].forEach(function (k) {
                arr(DB[k]).forEach(function (x) {
                    if (!x.caraBayar) x.caraBayar = 'Tunai';
                    if (!Array.isArray(x.bayar)) x.bayar = arr(x.bayar);
                });
            });
        }

        /* ================= BARANG vs JASA =================
           Item bertipe 'Jasa' tidak punya stok: tidak dipotong saat dijual,
           tidak masuk nilai persediaan, dan tidak dihitung stok menipis.
           Pendapatannya masuk ke akun COA yang dipilih per item. */
        function isJasa(b) { return !!b && String(b.jenis || 'Barang') === 'Jasa'; }
        function isJasaKode(kode) { return isJasa(findBarang(kode)); }
        var AKUN_JASA_DEFAULT = '4201';   // Pendapatan Jasa Service
        function akunPendapatan(b) {
            if (!isJasa(b)) return AKM.penjualan;                 // 4101 Penjualan Barang
            var k = String(b.akunPendapatan || '').trim();
            return (k && findAkun(k)) ? k : AKUN_JASA_DEFAULT;
        }
        // Hanya item fisik yang punya stok
        function barangFisik() { return DB.barang.filter(function (b) { return !isJasa(b); }); }

        // String(): kode dari Spreadsheet bisa terbaca sebagai angka (mis. "001" -> 1)
        function findBarang(kode) {
            if (kode === undefined || kode === null || kode === '') return undefined;
            return DB.barang.find(function (b) { return String(b.kode) === String(kode); });
        }

        /* ================= GUDANG / MULTI LOKASI STOK =================
           Stok tiap barang disimpan per gudang di b.lokasi = { idGudang: qty }.
           Field b.stok tetap dipertahankan sebagai TOTAL semua gudang agar
           laporan, penilaian persediaan, dan jurnal lama tetap berjalan.  */
        function gudangAktif() {
            return (DB.gudang || []).filter(function (g) { return g.aktif !== false; });
        }
        function findGudang(id) {
            if (id === undefined || id === null || id === '') return null;
            return (DB.gudang || []).find(function (g) { return String(g.id) === String(id); }) || null;
        }
        function namaGudang(id) {
            var g = findGudang(id);
            return g ? g.nama : (id ? '(gudang dihapus)' : '-');
        }
        function gudangDefault() {
            var akt = gudangAktif();
            return akt.length ? akt[0].id : ((DB.gudang || [])[0] || {}).id || '';
        }
        // Pastikan minimal ada 1 gudang dan tiap barang punya rincian lokasi.
        // PENTING: fungsi ini tidak boleh menghilangkan stok yang sudah ada.
        function migrasiGudang() {
            if (!DB.gudang) DB.gudang = [];
            if (!DB.transfer) DB.transfer = [];
            if (!DB.gudang.length) {
                // Hanya dibuat kalau data memang sudah termuat. Kalau pull gagal,
                // jangan bikin gudang baru — nanti menimpa daftar gudang asli.
                if (!DATA_SIAP && CFG.apiUrl) return;
                DB.gudang.push({ id: uid(), kode: 'GD01', nama: 'Gudang Utama', alamat: '', pic: '', aktif: true, keterangan: 'Dibuat otomatis' });
            }
            var def = gudangDefault();
            DB.barang.forEach(function (b) {
                if (!b.jenis) b.jenis = 'Barang';          // data lama = barang fisik
                if (isJasa(b)) {                            // jasa tidak punya stok sama sekali
                    b.lokasi = {}; b.stok = 0; b.hargaBeli = 0; b.stokMin = 0;
                    return;
                }
                // Teks JSON -> objek
                if (typeof b.lokasi === 'string' && b.lokasi.trim()) {
                    try { b.lokasi = JSON.parse(b.lokasi); } catch (e) { b.lokasi = null; }
                }
                if (!b.lokasi || typeof b.lokasi !== 'object' || Array.isArray(b.lokasi)) b.lokasi = null;

                var punyaRincian = b.lokasi && Object.keys(b.lokasi).length > 0;
                var stokTercatat = round2(Number(b.stok) || 0);

                if (!punyaRincian) {
                    // Belum punya rincian per gudang (data lama / kolom Lokasi kosong).
                    // Stok yang tercatat dipindahkan ke gudang default — JANGAN dinolkan.
                    b.lokasi = {};
                    if (def) b.lokasi[def] = stokTercatat;
                    b.stok = stokTercatat;
                    return;
                }
                sinkronStok(b);
            });
        }
        function stokGudang(b, gid) {
            if (!b) return 0;
            if (!b.lokasi) return 0;
            return round2(Number(b.lokasi[gid]) || 0);
        }
        function totalStok(b) {
            if (!b || !b.lokasi) return round2(Number(b && b.stok) || 0);
            var s = 0;
            Object.keys(b.lokasi).forEach(function (k) { s += Number(b.lokasi[k]) || 0; });
            return round2(s);
        }
        // Selaraskan b.stok (total) dengan rincian per gudang.
        function sinkronStok(b) {
            if (!b.lokasi) b.lokasi = {};
            b.stok = totalStok(b);
            return b.stok;
        }
        // Satu-satunya pintu perubahan stok: selalu lewat gudang tertentu.
        function mutasiStok(b, gid, delta) {
            if (!b) return;
            if (!b.lokasi) b.lokasi = {};
            if (!gid) gid = gudangDefault();
            b.lokasi[gid] = round2((Number(b.lokasi[gid]) || 0) + Number(delta));
            sinkronStok(b);
        }
        function opsiGudang(selId, includeSemua) {
            var h = includeSemua ? '<option value="">Semua Gudang</option>' : '';
            (DB.gudang || []).forEach(function (g) {
                if (g.aktif === false && g.id !== selId) return;
                h += '<option value="' + esc(g.id) + '"' + (g.id === selId ? ' selected' : '') + '>' +
                    esc(g.kode ? g.kode + ' — ' + g.nama : g.nama) + '</option>';
            });
            return h;
        }
        function selGudangField(label, id, selId, onchange) {
            return '<div class="field"><label>' + label + '</label><select id="' + id + '"' +
                (onchange ? ' onchange="' + onchange + '"' : '') + '>' + opsiGudang(selId) + '</select></div>';
        }

        document.getElementById('nav').addEventListener('click', function (e) {
            var b = e.target.closest('button.nav-item'); if (!b) return;
            go(b.dataset.page);
            if (mobile()) tutupSidebar();       // di HP, laci menu langsung tertutup
        });

        function go(page) {
            var validUser = currentUser();
            // Sesi habis di tengah pemakaian -> kunci lagi, jangan biarkan tembus
            if (!validUser && localStorage.getItem(SESI_KEY)) { checkLogin(); return; }
            segarkanSesi();
            var allowed = menusOf(validUser);

            // RBAC Check — berdasarkan checklist menu per user
            if (validUser && allowed.indexOf(page) === -1) {
                toast('Akses Ditolak: Anda tidak memiliki izin untuk menu ini', 'err');
                page = allowed[0] || 'dashboard';
            }

            CURRENT_PAGE = page;
            bukaTab(page);
            bangunNav();          // sidebar dibangun ulang (menandai item aktif & buka grupnya)
            gambarTabs();

            var crumb = document.getElementById('crumb');
            if (crumb) crumb.textContent = grupMenu(page) + ' › ' + labelMenu(page);
            document.title = labelMenu(page) + ' — ' + (CFG.company || 'Aplikasi Penjualan');

            var r = {
                dashboard: renderDashboard, barang: renderBarang, penjualan: renderPenjualan,
                pembelian: renderPembelian, modal: renderModal, kasbank: renderKasbank,
                quotation: renderQuotation, rugilaba: renderRugiLaba, pengaturan: renderPengaturan,
                coa: renderCOA, jurnal: renderJurnal, bukubesar: renderBukuBesar,
                neracasaldo: renderNeracaSaldo, neraca: renderNeraca, users: renderUsers,
                gudang: renderGudang, transfer: renderTransfer,
                mitra: renderMitra, piutang: renderPiutang, utang: renderUtang,
                retur: renderRetur, opname: renderOpname,
                aruskas: renderArusKas, analisis: renderAnalisis
            };
            (r[page] || renderDashboard)();
        }

        /* DASHBOARD */
        function renderDashboard() {
            var kas = saldoAkun('Kas'), bank = saldoAkun('Bank');
            var recent = [];
            DB.penjualan.forEach(function (x) { recent.push({ t: x.tanggal, d: 'Penjualan ' + x.no, v: x.total, dir: 'in' }); });
            DB.pembelian.forEach(function (x) { recent.push({ t: x.tanggal, d: 'Pembelian ' + x.no, v: x.total, dir: 'out' }); });
            DB.kasbank.filter(function (k) { return k.kategori === 'Operasional' || k.kategori === 'Lainnya'; })
                .forEach(function (x) { recent.push({ t: x.tanggal, d: x.keterangan || x.kategori, v: x.jumlah, dir: x.arah === 'Masuk' ? 'in' : 'out' }); });
            recent.sort(function (a, b) { return (b.t || '').localeCompare(a.t || ''); });
            recent = recent.slice(0, 8);

            var lowStock = DB.barang.filter(function (b) { return !isJasa(b) && Number(b.stok) <= (Number(b.stokMin) || 5); });

            var html = '<div class="page-head"><div><h2>Dashboard</h2>' +
                '<div class="sub">Ringkasan keuangan &amp; inventori &middot; ' + fmtDate(todayStr()) + '</div></div></div>';

            html += '<div class="cards">' +
                card('Saldo Kas', '🟡', money(kas), 'kas') +
                card('Saldo Bank', '🔵', money(bank), 'bank') +
                card('Total Modal', '💼', money(totalModal())) +
                card('Nilai Stok', '📦', money(nilaiStok())) +
                '</div>';

            html += '<div class="cards">' +
                brandCard('Penjualan Bulan Ini', '🧾', money(sumBulan(DB.penjualan, 'total'))) +
                card('Pembelian Bulan Ini', '🛒', money(sumBulan(DB.pembelian, 'total'))) +
                card('Jumlah Item Barang', '🏷️', String(DB.barang.length)) +
                card('Stok Menipis', '⚠️', String(lowStock.length)) +
                '</div>';

            html += '<div class="panel"><div class="panel-head"><h3>Transaksi Terakhir</h3></div><div class="panel-body">';
            if (recent.length === 0) { html += '<div class="empty">Belum ada transaksi. Mulai dari menu Penjualan atau Pembelian.</div>'; }
            else {
                html += '<table class="grid"><thead><tr><th>Tanggal</th><th>Keterangan</th><th class="num">Nilai</th><th class="ctr">Arah</th></tr></thead><tbody>';
                recent.forEach(function (r) {
                    html += '<tr><td>' + fmtDate(r.t) + '</td><td>' + esc(r.d) + '</td><td class="num">' + money(r.v) + '</td>' +
                        '<td class="ctr"><span class="tag ' + (r.dir === 'in' ? 'in' : 'out') + '">' + (r.dir === 'in' ? 'Masuk' : 'Keluar') + '</span></td></tr>';
                });
                html += '</tbody></table>';
            }
            html += '</div></div>';

            if (lowStock.length) {
                html += '<div class="panel"><div class="panel-head"><h3>⚠️ Stok Menipis</h3></div><div class="panel-body">' +
                    '<table class="grid"><thead><tr><th>Kode</th><th>Nama Barang</th><th class="num">Stok</th><th class="num">Min</th></tr></thead><tbody>';
                lowStock.forEach(function (b) {
                    html += '<tr><td>' + esc(b.kode) + '</td><td>' + esc(b.nama) + '</td><td class="num"><span class="tag low">' + fmt(b.stok) + '</span></td><td class="num">' + fmt(b.stokMin || 5) + '</td></tr>';
                });
                html += '</tbody></table></div></div>';
            }
            document.getElementById('main').innerHTML = html;
            
            var searchInp = document.getElementById('main').querySelector('.search');
            if (searchInp && f !== undefined) {
                searchInp.focus();
                var len = searchInp.value.length;
                searchInp.setSelectionRange(len, len);
            }
        }
        function card(lbl, ic, isi, cls) {
            return '<div class="card"><div class="lbl">' + ic + ' ' + lbl + '</div><div class="val' + (String(isi).length > 14 ? ' small' : '') + '">' + isi + '</div></div>';
        }
        function brandCard(lbl, ic, isi) {
            return '<div class="card brandcard"><div class="lbl">' + ic + ' ' + lbl + '</div><div class="val' + (String(isi).length > 14 ? ' small' : '') + '">' + isi + '</div></div>';
        }

        window.hideZeroStock = window.hideZeroStock || false;
        function toggleHideZero(chk) {
            window.hideZeroStock = chk.checked;
            renderBarang(document.querySelector('.search') ? document.querySelector('.search').value : '');
        }
        window.filterGudang = window.filterGudang || '';
        function setFilterGudang(v) {
            window.filterGudang = v || '';
            renderBarang(document.querySelector('.search') ? document.querySelector('.search').value : '');
        }
        window.filterJenis = window.filterJenis || '';
        function setFilterJenis(v) {
            window.filterJenis = v || '';
            if (v === 'Jasa') window.filterGudang = '';   // jasa tidak punya gudang
            renderBarang(document.querySelector('.search') ? document.querySelector('.search').value : '');
        }

        /* BARANG & STOK */
        function renderBarang(f) {
            migrasiGudang();
            var wasSearching = document.activeElement && document.activeElement.classList.contains('search');
            f = f || '';
            var gf = window.filterGudang || '';           // '' = semua gudang
            var qtyOf = function (b) { return gf ? stokGudang(b, gf) : Number(b.stok) || 0; };
            var jf = window.filterJenis || '';            // '' = semua, 'Barang', 'Jasa'
            var list = DB.barang.filter(function (b) {
                var matchF = !f || (b.nama + ' ' + b.kode).toLowerCase().indexOf(f.toLowerCase()) >= 0;
                var matchJ = !jf || (isJasa(b) ? 'Jasa' : 'Barang') === jf;
                // Item jasa tidak punya stok, jadi tidak ikut disaring "sembunyikan stok 0"
                var matchZ = (window.hideZeroStock && !isJasa(b)) ? qtyOf(b) > 0 : true;
                // Difilter per gudang, jasa tidak relevan
                if (gf && isJasa(b)) return false;
                return matchF && matchJ && matchZ;
            });
            var jmlJasa = DB.barang.filter(isJasa).length;
            var html = '<div class="page-head"><div><h2>Barang &amp; Jasa</h2><div class="sub">Master item, harga, dan stok tersedia' +
                (jmlJasa ? ' &middot; ' + jmlJasa + ' item jasa (tanpa stok)' : '') +
                (gf ? ' &middot; difilter gudang <b>' + esc(namaGudang(gf)) + '</b>' : '') + '</div></div>' +
                '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
                '<button class="btn btn-ghost" onclick="formImporBarang()">⬆️ Impor Data</button>' +
                '<button class="btn btn-ghost" onclick="formBarang(\'\',\'Jasa\')">＋ Tambah Jasa</button>' +
                '<button class="btn btn-primary" onclick="formBarang()">＋ Tambah Barang</button></div></div>';
            html += '<div class="panel"><div class="panel-head"><div class="toolbar" style="display:flex;align-items:center;gap:10px;">' +
                '<input class="search" placeholder="Cari kode / nama..." value="' + esc(f) + '" oninput="renderBarang(this.value)">' +
                '<select onchange="setFilterJenis(this.value)" style="padding:8px 12px;border:1px solid var(--line);border-radius:8px;font-size:13px">' +
                '<option value=""' + (jf === '' ? ' selected' : '') + '>Semua Jenis</option>' +
                '<option value="Barang"' + (jf === 'Barang' ? ' selected' : '') + '>Barang saja</option>' +
                '<option value="Jasa"' + (jf === 'Jasa' ? ' selected' : '') + '>Jasa saja</option></select>' +
                '<select onchange="setFilterGudang(this.value)" style="padding:8px 12px;border:1px solid var(--line);border-radius:8px;font-size:13px">' + opsiGudang(gf, true) + '</select>' +
                '<label style="display:flex;align-items:center;gap:5px;cursor:pointer;white-space:nowrap;"><input type="checkbox" ' + (window.hideZeroStock ? 'checked' : '') + ' onchange="toggleHideZero(this)"> Sembunyikan Stok 0</label>' +
                '</div><div style="display:flex;gap:5px;"><button class="btn btn-ghost btn-sm" onclick="exportBarangExcel()">📊 Export Excel</button>' +
                '<button class="btn btn-ghost btn-sm" onclick="printBarang()">🖨️ Cetak Daftar Stok</button></div></div><div class="panel-body">';
            if (list.length === 0) { html += '<div class="empty">Belum ada data.</div>'; }
            else {
                html += '<table class="grid"><thead><tr><th style="width:52px">Foto</th><th>Kode</th><th>Nama</th><th>Jenis</th><th>Satuan</th>' +
                    '<th class="num">' + (gf ? 'Stok di Gudang' : 'Stok Total') + '</th>' +
                    (gf ? '' : '<th>Rincian per Gudang</th>') +
                    '<th class="num">Harga Beli</th><th class="num">Harga Jual</th><th class="num">Nilai Stok</th><th></th></tr></thead><tbody>';
                list.forEach(function (b) {
                    var jasa = isJasa(b);
                    var q = jasa ? 0 : qtyOf(b);
                    var low = !jasa && q <= (Number(b.stokMin) || 5);
                    var rinci = '';
                    if (!gf) {
                        rinci = '<td>' + (jasa ? '<span class="text-muted">—</span>' : (DB.gudang || []).map(function (g) {
                            var gq = stokGudang(b, g.id);
                            if (!gq) return '';
                            return '<span class="pill" style="margin:2px 3px 2px 0">' + esc(g.kode) + ': ' + fmt(gq) + '</span>';
                        }).join('')) + '</td>';
                    }
                    var badge = jasa
                        ? '<span class="pill" style="background:#eef2ff;color:#4338ca">🛠️ Jasa</span>'
                        : '<span class="pill">📦 Barang</span>';
                    var sel = b.foto
                        ? '<img class="thumb" src="' + esc(b.foto) + '" alt="" onclick="lihatFoto(\'' + esc(b.kode) + '\')" title="Klik untuk perbesar">'
                        : '<span class="thumb kosong">' + (jasa ? '🛠️' : '📦') + '</span>';
                    html += '<tr><td>' + sel + '</td><td><b>' + esc(b.kode) + '</b></td><td>' + esc(b.nama) +
                        (jasa ? '<div class="text-muted" style="font-size:11px">' + esc(b.akunPendapatan || AKUN_JASA_DEFAULT) + ' — ' + esc(namaAkun(akunPendapatan(b))) + '</div>' : '') +
                        '</td><td>' + badge + '</td><td>' + esc(b.satuan) + '</td>' +
                        '<td class="num">' + (jasa ? '<span class="text-muted">—</span>' : (low ? '<span class="tag low">' + fmt(q) + '</span>' : fmt(q))) + '</td>' + rinci +
                        '<td class="num">' + (jasa ? '<span class="text-muted">—</span>' : fmt(b.hargaBeli)) + '</td>' +
                        '<td class="num">' + fmt(b.hargaJual) + '</td>' +
                        '<td class="num">' + (jasa ? '<span class="text-muted">—</span>' : fmt(q * (Number(b.hargaBeli) || 0))) + '</td>' +
                        '<td class="row-actions"><button class="btn btn-ghost btn-sm" onclick="formBarang(\'' + b.id + '\')">Edit</button>' +
                        '<button class="btn btn-danger btn-sm" onclick="delBarang(\'' + b.id + '\')">Hapus</button></td></tr>';
                });
                html += '</tbody></table>';
            }
            html += '</div></div>';
            document.getElementById('main').innerHTML = html;
            
            if (wasSearching) {
                var searchInp = document.getElementById('main').querySelector('.search');
                if (searchInp) {
                    searchInp.focus();
                    var len = searchInp.value.length;
                    searchInp.setSelectionRange(len, len);
                }
            }
        }
        function formBarang(id, jenisAwal) {
            migrasiGudang();
            var b = id ? DB.barang.find(function (x) { return String(x.id) === String(id); })
                : { id: '', kode: '', nama: '', satuan: 'Pcs', stok: 0, stokMin: 5, hargaBeli: 0, hargaJual: 0, lokasi: {}, jenis: (jenisAwal === 'Jasa' ? 'Jasa' : 'Barang') };
            if (id && !b) { toast('Data item tidak ditemukan', 'err'); return; }
            var jasa = isJasa(b);

            // ---- Bagian khusus BARANG: stok per gudang ----
            var stokHtml = '<div id="blokStok"><div class="field"><label>' + (id ? 'Stok per Gudang (penyesuaian manual)' : 'Stok Awal per Gudang') + '</label>' +
                '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:8px">';
            (DB.gudang || []).forEach(function (g) {
                if (g.aktif === false && stokGudang(b, g.id) === 0) return;
                stokHtml += '<div style="border:1px solid var(--line);border-radius:8px;padding:8px 10px">' +
                    '<div style="font-size:11px;color:var(--muted);font-weight:600;margin-bottom:4px">🏭 ' + esc(g.kode + ' — ' + g.nama) + '</div>' +
                    '<input class="num moneyIn" id="bStok_' + esc(g.id) + '" value="' + fmt(stokGudang(b, g.id)) + '"></div>';
            });
            stokHtml += '</div><div class="hint" style="margin-top:6px">Total stok dihitung otomatis dari seluruh gudang. Gunakan menu Transfer Stok untuk memindahkan barang antar gudang.</div></div>' +
                '<div class="grid3">' + fldNum('Stok Minimum', 'bStokMin', b.stokMin) + '<div></div><div></div></div>' +
                '<div class="grid2">' + fldNum('Harga Beli / Harga Pokok', 'bBeli', b.hargaBeli) + '<div></div></div>' +
                '</div>';

            // ---- Bagian khusus JASA: akun pendapatan ----
            var akunOpts = akunAktif(function (a) {
                return a.kelompok === 'Pendapatan' && a.normal === 'Kredit';
            }).map(function (a) {
                var terpilih = String(akunPendapatan(b)) === String(a.kode);
                return '<option value="' + esc(a.kode) + '"' + (terpilih ? ' selected' : '') + '>' + esc(a.kode + ' — ' + a.nama) + '</option>';
            }).join('');
            var jasaHtml = '<div id="blokJasa">' +
                '<div class="field"><label>Akun Pendapatan</label><select id="bAkunPend">' + akunOpts + '</select>' +
                '<div class="hint" style="margin-top:4px">Nilai penjualan jasa ini akan dikreditkan ke akun tersebut di Laba Rugi.</div></div>' +
                '<div class="hint">🛠️ Item jasa <b>tidak memiliki stok</b>: tidak dipotong saat dijual, tidak masuk nilai persediaan, dan tidak muncul di Transfer Stok.</div>' +
                '</div>';

            fotoDraft = String(b.foto || '');
            var fotoHtml = '<div class="foto-blok">' +
                '<div class="foto-kotak" id="bFotoKotak"></div>' +
                '<div class="foto-aksi">' +
                '<label class="label-atas">Foto Item</label>' +
                '<input type="file" id="bFotoFile" accept="image/*" style="display:none" onchange="pilihFotoBarang(this)">' +
                '<button class="btn btn-ghost btn-sm" onclick="document.getElementById(\'bFotoFile\').click()">📷 Pilih Foto</button> ' +
                '<button class="btn btn-danger btn-sm" id="bFotoHapus" onclick="hapusFotoBarang()" style="display:none">Hapus</button>' +
                '<div class="hint" id="bFotoInfo" style="margin-top:6px"></div>' +
                '<div class="hint">Otomatis dikecilkan ke maks ' + MAKS_FOTO_PX + 'px / ' + MAKS_FOTO_KB + ' KB ' +
                'agar muat di satu sel Spreadsheet. Foto ikut tersimpan di data, jadi tetap tampil saat aplikasi di-hosting online.</div>' +
                '</div></div>';

            openModal(
                '<div class="modal-head"><h3>' + (id ? 'Edit' : 'Tambah') + ' Item</h3><button class="x" onclick="closeModal()">&times;</button></div>' +
                '<div class="modal-body">' +
                fotoHtml +
                '<div class="grid3">' +
                '<div class="field"><label>Jenis Item</label><select id="bJenis" onchange="onJenisItemChange()">' +
                '<option value="Barang"' + (jasa ? '' : ' selected') + '>📦 Barang (punya stok)</option>' +
                '<option value="Jasa"' + (jasa ? ' selected' : '') + '>🛠️ Jasa (tanpa stok)</option>' +
                '</select></div>' +
                fld('Kode', 'bKode', b.kode) + fld('Satuan', 'bSatuan', b.satuan) +
                '</div>' +
                fld('Nama Item', 'bNama', b.nama) +
                stokHtml +
                jasaHtml +
                '<div class="grid2">' + fldNum('Harga Jual', 'bJual', b.hargaJual) + '<div></div></div>' +
                '</div>' +
                '<div class="modal-foot"><button class="btn btn-ghost" onclick="closeModal()">Batal</button>' +
                '<button class="btn btn-primary" onclick="saveBarang(\'' + (id || '') + '\')">Simpan</button></div>'
            );
            onJenisItemChange();
            tampilFotoDraft();
            attachNumInputs();
        }
        // Tampilkan blok stok atau blok jasa sesuai jenis yang dipilih
        function onJenisItemChange() {
            var jenis = val('bJenis') || 'Barang';
            var jasa = jenis === 'Jasa';
            var bs = document.getElementById('blokStok'), bj = document.getElementById('blokJasa');
            if (bs) bs.style.display = jasa ? 'none' : '';
            if (bj) bj.style.display = jasa ? '' : 'none';
            var sat = document.getElementById('bSatuan');
            if (sat && jasa && (sat.value === 'Pcs' || !sat.value)) sat.value = 'Unit';
        }
        function saveBarang(id) {
            var jenis = (val('bJenis') === 'Jasa') ? 'Jasa' : 'Barang';
            var kode = val('bKode').trim(), nama = val('bNama').trim();
            if (!kode || !nama) { toast('Kode dan Nama wajib diisi', 'err'); return; }
            var dup = DB.barang.find(function (x) { return String(x.kode) === kode && String(x.id) !== String(id); });
            if (dup) { toast('Kode "' + kode + '" sudah dipakai', 'err'); return; }

            var lama = id ? DB.barang.find(function (x) { return String(x.id) === String(id); }) : null;

            // Ganti Barang -> Jasa hanya boleh kalau stoknya sudah kosong
            if (jenis === 'Jasa' && lama && !isJasa(lama) && Number(lama.stok) !== 0) {
                toast('Stok "' + lama.nama + '" masih ' + fmt(lama.stok) + '. Nolkan dulu sebelum diubah jadi Jasa.', 'err');
                return;
            }

            var obj = {
                id: id || uid(), kode: kode, nama: nama, jenis: jenis,
                satuan: val('bSatuan').trim() || (jenis === 'Jasa' ? 'Unit' : 'Pcs'),
                hargaJual: parseNum(val('bJual')),
                foto: fotoDraft || ''
            };

            if (jenis === 'Jasa') {
                obj.stok = 0; obj.stokMin = 0; obj.hargaBeli = 0; obj.lokasi = {};
                obj.akunPendapatan = val('bAkunPend') || AKUN_JASA_DEFAULT;
            } else {
                var lokasi = {};
                (DB.gudang || []).forEach(function (g) {
                    var el = document.getElementById('bStok_' + g.id);
                    if (el) lokasi[g.id] = round2(parseNum(el.value));
                    else if (lama && lama.lokasi && lama.lokasi[g.id]) lokasi[g.id] = round2(Number(lama.lokasi[g.id]) || 0);
                });
                obj.stok = 0;
                obj.stokMin = parseNum(val('bStokMin'));
                obj.hargaBeli = parseNum(val('bBeli'));
                obj.lokasi = lokasi;
                sinkronStok(obj);
            }

            auditLog(jenis, (id ? 'Edit' : 'Tambah') + ' ' + jenis.toLowerCase() + ': ' + kode);
            var idx = id ? DB.barang.findIndex(function (x) { return String(x.id) === String(id); }) : -1;
            if (idx >= 0) DB.barang[idx] = obj; else DB.barang.push(obj);
            closeModal(); renderBarang();
            toast(jenis + ' "' + nama + '" tersimpan', 'ok');
            persist();
        }
        function delBarang(id) {
            var b = DB.barang.find(function (x) { return String(x.id) === String(id); });
            if (!b) return;
            if (!confirm('Hapus ' + (isJasa(b) ? 'jasa' : 'barang') + ' "' + b.nama + '"?')) return;
            auditLog(isJasa(b) ? 'Jasa' : 'Barang', 'Hapus: ' + b.kode);
            DB.barang = DB.barang.filter(function (x) { return String(x.id) !== String(id); });
            persist(); renderBarang(); toast('Item dihapus', 'ok');
        }

        /* =====================================================================
           HALAMAN: PELANGGAN & SUPPLIER
           ===================================================================== */
        window.filterMitra = window.filterMitra || '';
        function setFilterMitra(v) { window.filterMitra = v || ''; renderMitra(); }

        function renderMitra(f) {
            f = f || '';
            var jf = window.filterMitra || '';
            var list = arr(DB.mitra).filter(function (m) {
                var cocok = !f || ((m.nama || '') + ' ' + (m.kode || '') + ' ' + (m.telp || '')).toLowerCase().indexOf(f.toLowerCase()) >= 0;
                var jenisOk = !jf || String(m.jenis || 'Keduanya') === jf || String(m.jenis) === 'Keduanya';
                return cocok && jenisOk;
            });
            var html = '<div class="page-head"><div><h2>Pelanggan &amp; Supplier</h2>' +
                '<div class="sub">Master mitra usaha &middot; ' + arr(DB.mitra).length + ' data</div></div>' +
                '<button class="btn btn-primary" onclick="formMitra()">＋ Tambah Mitra</button></div>';
            html += '<div class="panel"><div class="panel-head"><div class="toolbar" style="display:flex;gap:10px;align-items:center">' +
                '<input class="search" placeholder="Cari nama / kode / telepon..." value="' + esc(f) + '" oninput="renderMitra(this.value)">' +
                '<select onchange="setFilterMitra(this.value)" style="padding:8px 12px;border:1px solid var(--line);border-radius:8px;font-size:13px">' +
                '<option value=""' + (jf === '' ? ' selected' : '') + '>Semua Jenis</option>' +
                '<option value="Pelanggan"' + (jf === 'Pelanggan' ? ' selected' : '') + '>Pelanggan</option>' +
                '<option value="Supplier"' + (jf === 'Supplier' ? ' selected' : '') + '>Supplier</option>' +
                '</select></div></div><div class="panel-body">';
            if (!list.length) html += '<div class="empty">Belum ada data mitra.</div>';
            else {
                html += '<table class="grid"><thead><tr><th>Kode</th><th>Nama</th><th>Jenis</th><th>Kontak</th>' +
                    '<th class="num">Termin</th><th class="num">Transaksi</th><th class="num">Nilai</th><th>Status</th><th></th></tr></thead><tbody>';
                list.forEach(function (m) {
                    var jual = arr(DB.penjualan).filter(function (x) { return String(x.mitraId) === String(m.id) && x.status !== 'Draft'; });
                    var beli = arr(DB.pembelian).filter(function (x) { return String(x.mitraId) === String(m.id) && x.status !== 'Draft'; });
                    var nilai = 0;
                    jual.concat(beli).forEach(function (x) { nilai += Number(x.total) || 0; });
                    var badge = m.jenis === 'Pelanggan' ? '<span class="pill" style="background:#e0f2fe;color:#075985">Pelanggan</span>'
                        : m.jenis === 'Supplier' ? '<span class="pill" style="background:#fef3c7;color:#92400e">Supplier</span>'
                            : '<span class="pill">Keduanya</span>';
                    html += '<tr><td><b>' + esc(m.kode || '-') + '</b></td>' +
                        '<td>' + esc(m.nama) + (m.pic ? '<div class="text-muted" style="font-size:11px">PIC: ' + esc(m.pic) + '</div>' : '') + '</td>' +
                        '<td>' + badge + '</td>' +
                        '<td>' + esc(m.telp || '-') + (m.email ? '<div class="text-muted" style="font-size:11px">' + esc(m.email) + '</div>' : '') + '</td>' +
                        '<td class="num">' + (Number(m.termin) || 0) + ' hr</td>' +
                        '<td class="num">' + (jual.length + beli.length) + '</td>' +
                        '<td class="num">' + fmt(nilai) + '</td>' +
                        '<td>' + (m.aktif === false ? '<span class="pill" style="background:#fee;color:#b00">Nonaktif</span>' : '<span class="pill" style="background:#e8f7ee;color:#0a7">Aktif</span>') + '</td>' +
                        '<td class="row-actions"><button class="btn btn-ghost btn-sm" onclick="formMitra(\'' + m.id + '\')">Edit</button>' +
                        '<button class="btn btn-danger btn-sm" onclick="delMitra(\'' + m.id + '\')">Hapus</button></td></tr>';
                });
                html += '</tbody></table>';
            }
            html += '</div></div>';
            document.getElementById('main').innerHTML = html;
        }

        function formMitra(id) {
            var kosong = { id: '', kode: '', nama: '', jenis: 'Pelanggan', telp: '', email: '', alamat: '', npwp: '', pic: '', termin: 0, aktif: true, catatan: '' };
            var m = id ? findMitra(id) : kosong;
            if (id && !m) { toast('Data mitra tidak ditemukan', 'err'); return; }
            m = Object.assign({}, kosong, m);
            openModal(
                '<div class="modal-head"><h3>' + (id ? 'Edit' : 'Tambah') + ' Mitra</h3><button class="x" onclick="closeModal()">&times;</button></div>' +
                '<div class="modal-body">' +
                '<div class="grid3">' + fld('Kode', 'mtKode', m.kode) + fld('Nama *', 'mtNama', m.nama) +
                '<div class="field"><label>Jenis</label><select id="mtJenis">' +
                ['Pelanggan', 'Supplier', 'Keduanya'].map(function (j) {
                    return '<option value="' + j + '"' + (m.jenis === j ? ' selected' : '') + '>' + j + '</option>';
                }).join('') + '</select></div></div>' +
                '<div class="grid3">' + fld('Telepon', 'mtTelp', m.telp) + fld('Email', 'mtEmail', m.email) + fld('PIC', 'mtPic', m.pic) + '</div>' +
                fldArea('Alamat', 'mtAlamat', m.alamat) +
                '<div class="grid3">' + fld('NPWP', 'mtNpwp', m.npwp) +
                '<div class="field"><label>Termin Default (hari)</label><input id="mtTermin" type="number" min="0" max="365" value="' + (Number(m.termin) || 0) + '">' +
                '<div class="hint" style="margin-top:4px">0 = biasanya tunai</div></div>' +
                '<div></div></div>' +
                fldArea('Catatan', 'mtCatatan', m.catatan) +
                '<label class="chk"><input type="checkbox" id="mtAktif" ' + (m.aktif === false ? '' : 'checked') + '> Mitra aktif</label>' +
                '</div>' +
                '<div class="modal-foot"><button class="btn btn-ghost" onclick="closeModal()">Batal</button>' +
                '<button class="btn btn-primary" onclick="saveMitra(\'' + (id || '') + '\')">Simpan</button></div>'
            );
        }
        function saveMitra(id) {
            var nama = val('mtNama').trim();
            if (!nama) { toast('Nama wajib diisi', 'err'); return; }
            var kode = val('mtKode').trim();
            if (kode && arr(DB.mitra).some(function (x) {
                return String(x.kode || '').toLowerCase() === kode.toLowerCase() && String(x.id) !== String(id);
            })) { toast('Kode "' + kode + '" sudah dipakai', 'err'); return; }

            var obj = {
                id: id || uid(), kode: kode, nama: nama, jenis: val('mtJenis'),
                telp: val('mtTelp').trim(), email: val('mtEmail').trim(), alamat: val('mtAlamat').trim(),
                npwp: val('mtNpwp').trim(), pic: val('mtPic').trim(),
                termin: parseInt(val('mtTermin'), 10) || 0,
                catatan: val('mtCatatan').trim(),
                aktif: document.getElementById('mtAktif').checked
            };
            var i = id ? arr(DB.mitra).findIndex(function (x) { return String(x.id) === String(id); }) : -1;
            if (i >= 0) DB.mitra[i] = obj; else DB.mitra.push(obj);
            auditLog('Mitra', (i >= 0 ? 'Edit' : 'Tambah') + ': ' + nama);
            closeModal(); renderMitra(); toast('Mitra "' + nama + '" tersimpan', 'ok'); persist();
        }
        function delMitra(id) {
            var m = findMitra(id); if (!m) return;
            var terpakai = arr(DB.penjualan).concat(arr(DB.pembelian))
                .filter(function (x) { return String(x.mitraId) === String(id); }).length;
            if (terpakai) { toast('Mitra ini dipakai di ' + terpakai + ' transaksi. Nonaktifkan saja.', 'err'); return; }
            if (!confirm('Hapus mitra "' + m.nama + '"?')) return;
            DB.mitra = arr(DB.mitra).filter(function (x) { return String(x.id) !== String(id); });
            auditLog('Mitra', 'Hapus: ' + m.nama);
            persist(); renderMitra(); toast('Mitra dihapus', 'ok');
        }

        /* =====================================================================
           HALAMAN: PIUTANG & UTANG
           ===================================================================== */
        function renderPiutang() { renderTagihan('jual'); }
        function renderUtang() { renderTagihan('beli'); }

        function renderTagihan(mode) {
            var isJual = mode === 'jual';
            var list = daftarTagihan(mode);
            var judul = isJual ? 'Piutang Usaha' : 'Utang Usaha';

            var total = 0, jatuh = 0, belum = 0;
            list.forEach(function (x) {
                var s = sisaTagihan(x); total += s;
                if (umurHari(jatuhTempoTrx(x)) > 0) { jatuh += s; } else { belum += s; }
            });

            var html = '<div class="page-head"><div><h2>' + judul + '</h2>' +
                '<div class="sub">' + (isJual ? 'Tagihan ke pelanggan yang belum diterima' : 'Kewajiban ke supplier yang belum dibayar') + '</div></div></div>';

            html += '<div class="cards">' +
                card('Total ' + (isJual ? 'Piutang' : 'Utang'), isJual ? '📥' : '📤', money(total)) +
                card('Sudah Jatuh Tempo', '⚠️', money(jatuh)) +
                card('Belum Jatuh Tempo', '🕒', money(belum)) +
                card('Jumlah Dokumen', '🧾', String(list.length)) +
                '</div>';

            html += '<div class="panel"><div class="panel-head"><h3>Daftar ' + judul + '</h3>' +
                '<button class="btn btn-ghost btn-sm" onclick="printTagihan(\'' + mode + '\')">🖨️ Cetak</button></div><div class="panel-body">';
            if (!list.length) html += '<div class="empty">Tidak ada ' + (isJual ? 'piutang' : 'utang') + ' yang belum lunas. 🎉</div>';
            else {
                html += '<table class="grid"><thead><tr><th>No</th><th>Tanggal</th><th>' + (isJual ? 'Pelanggan' : 'Supplier') + '</th>' +
                    '<th>Jatuh Tempo</th><th class="ctr">Umur</th><th class="num">Nilai</th><th class="num">Dibayar</th>' +
                    '<th class="num">Sisa</th><th class="ctr">Status</th><th></th></tr></thead><tbody>';
                list.forEach(function (x) {
                    var jt = jatuhTempoTrx(x), umur = umurHari(jt);
                    var telat = umur > 0;
                    var st = statusBayar(x);
                    html += '<tr' + (telat ? ' style="background:#fff7f7"' : '') + '>' +
                        '<td><b>' + esc(x.no) + '</b></td><td>' + fmtDate(x.tanggal) + '</td>' +
                        '<td>' + esc(namaMitra(x)) + '</td>' +
                        '<td>' + fmtDate(jt) + '</td>' +
                        '<td class="ctr">' + (telat
                            ? '<span class="tag low">telat ' + umur + ' hr</span>'
                            : '<span class="text-muted">' + Math.abs(umur) + ' hr lagi</span>') + '</td>' +
                        '<td class="num">' + fmt(x.total) + '</td>' +
                        '<td class="num">' + fmt(totalBayar(x)) + '</td>' +
                        '<td class="num"><b>' + fmt(sisaTagihan(x)) + '</b></td>' +
                        '<td class="ctr"><span class="tag ' + (st === 'Sebagian' ? 'kas' : 'out') + '">' + st + '</span></td>' +
                        '<td class="row-actions">' +
                        '<button class="btn btn-primary btn-sm" onclick="formBayar(\'' + mode + '\',\'' + x.id + '\')">💰 Bayar</button>' +
                        '<button class="btn btn-ghost btn-sm" onclick="riwayatBayar(\'' + mode + '\',\'' + x.id + '\')">Riwayat</button>' +
                        '</td></tr>';
                });
                html += '</tbody></table>';
            }
            html += '</div></div>';

            // Rekap per mitra
            var perMitra = {};
            list.forEach(function (x) {
                var n = namaMitra(x) || '(tanpa nama)';
                perMitra[n] = round2((perMitra[n] || 0) + sisaTagihan(x));
            });
            var kunci = Object.keys(perMitra).sort(function (a, b) { return perMitra[b] - perMitra[a]; });
            if (kunci.length) {
                html += '<div class="panel"><div class="panel-head"><h3>Rekap per ' + (isJual ? 'Pelanggan' : 'Supplier') + '</h3></div><div class="panel-body">' +
                    '<table class="grid"><thead><tr><th>Nama</th><th class="num">Sisa</th><th class="num">Porsi</th></tr></thead><tbody>';
                kunci.forEach(function (n) {
                    var p = total ? (perMitra[n] / total * 100) : 0;
                    html += '<tr><td>' + esc(n) + '</td><td class="num">' + fmt(perMitra[n]) + '</td>' +
                        '<td class="num">' + p.toFixed(1) + '%</td></tr>';
                });
                html += '</tbody></table></div></div>';
            }
            document.getElementById('main').innerHTML = html;
        }

        function formBayar(mode, id) {
            var arrTrx = mode === 'jual' ? DB.penjualan : DB.pembelian;
            var x = arr(arrTrx).find(function (r) { return String(r.id) === String(id); });
            if (!x) { toast('Transaksi tidak ditemukan', 'err'); return; }
            var sisa = sisaTagihan(x);
            openModal(
                '<div class="modal-head"><h3>' + (mode === 'jual' ? 'Terima Pembayaran' : 'Bayar Utang') + ' — ' + esc(x.no) + '</h3>' +
                '<button class="x" onclick="closeModal()">&times;</button></div>' +
                '<div class="modal-body">' +
                '<div class="grid3">' +
                '<div class="field"><label>' + (mode === 'jual' ? 'Pelanggan' : 'Supplier') + '</label><div><b>' + esc(namaMitra(x)) + '</b></div></div>' +
                '<div class="field"><label>Nilai Dokumen</label><div>' + money(x.total) + '</div></div>' +
                '<div class="field"><label>Sisa Tagihan</label><div><b style="color:var(--danger)">' + money(sisa) + '</b></div></div>' +
                '</div><div class="divider"></div>' +
                '<div class="grid3">' + fld('Tanggal Bayar', 'byTgl', todayStr(), 'date') +
                selField('Lewat', 'byAkun', ['Kas', 'Bank'], 'Bank') +
                fldNum('Jumlah', 'byJml', sisa) + '</div>' +
                fld('Catatan / No. Bukti', 'byKet', '') +
                '<div class="hint">Pembayaran otomatis mencatat mutasi kas/bank dan jurnal pelunasan.</div>' +
                '</div>' +
                '<div class="modal-foot"><button class="btn btn-ghost" onclick="closeModal()">Batal</button>' +
                '<button class="btn btn-primary" onclick="saveBayar(\'' + mode + '\',\'' + id + '\')">💰 Simpan Pembayaran</button></div>'
            );
            attachNumInputs();
        }

        function saveBayar(mode, id) {
            var isJual = mode === 'jual';
            var arrTrx = isJual ? DB.penjualan : DB.pembelian;
            var x = arr(arrTrx).find(function (r) { return String(r.id) === String(id); });
            if (!x) { toast('Transaksi tidak ditemukan', 'err'); return; }

            var jml = parseNum(val('byJml'));
            var sisa = sisaTagihan(x);
            if (jml <= 0) { toast('Jumlah pembayaran harus lebih dari 0', 'err'); return; }
            if (jml > sisa + 0.009) { toast('Jumlah melebihi sisa tagihan (' + money(sisa) + ')', 'err'); return; }

            var tgl = val('byTgl') || todayStr();
            var akun = val('byAkun');
            var ket = val('byKet').trim();

            if (!Array.isArray(x.bayar)) x.bayar = [];
            x.bayar.push({ id: uid(), tanggal: tgl, akun: akun, jumlah: round2(jml), catatan: ket });

            DB.kasbank.push({
                id: uid(), tanggal: tgl, akun: akun, arah: isJual ? 'Masuk' : 'Keluar',
                kategori: isJual ? 'Pelunasan Piutang' : 'Pembayaran Utang', jumlah: round2(jml),
                keterangan: (isJual ? 'Pelunasan ' : 'Pembayaran ') + x.no + ' - ' + namaMitra(x) + (ket ? ' (' + ket + ')' : ''),
                ref: x.no, auto: true
            });

            auditLog(isJual ? 'Piutang' : 'Utang', 'Bayar ' + x.no + ' sebesar ' + fmt(jml));
            closeModal();
            renderTagihan(mode);
            toast('Pembayaran ' + money(jml) + ' tercatat. Sisa: ' + money(sisaTagihan(x)), 'ok');
            persist();
        }

        function riwayatBayar(mode, id) {
            var arrTrx = mode === 'jual' ? DB.penjualan : DB.pembelian;
            var x = arr(arrTrx).find(function (r) { return String(r.id) === String(id); });
            if (!x) return;
            var h = '<div class="modal-head"><h3>Riwayat Pembayaran — ' + esc(x.no) + '</h3>' +
                '<button class="x" onclick="closeModal()">&times;</button></div><div class="modal-body">';
            var list = arr(x.bayar);
            if (!list.length) h += '<div class="empty">Belum ada pembayaran.</div>';
            else {
                h += '<table class="grid"><thead><tr><th>#</th><th>Tanggal</th><th>Lewat</th><th>Catatan</th><th class="num">Jumlah</th><th></th></tr></thead><tbody>';
                list.forEach(function (p, i) {
                    h += '<tr><td>' + (i + 1) + '</td><td>' + fmtDate(p.tanggal) + '</td>' +
                        '<td><span class="tag ' + (p.akun === 'Kas' ? 'kas' : 'bank') + '">' + esc(p.akun) + '</span></td>' +
                        '<td>' + esc(p.catatan || '-') + '</td><td class="num">' + fmt(p.jumlah) + '</td>' +
                        '<td><button class="btn btn-danger btn-sm" onclick="hapusBayar(\'' + mode + '\',\'' + x.id + '\',\'' + p.id + '\')">Batalkan</button></td></tr>';
                });
                h += '</tbody><tfoot><tr><th colspan="4" style="text-align:right">Total Dibayar</th>' +
                    '<th class="num">' + fmt(totalBayar(x)) + '</th><th></th></tr>' +
                    '<tr><th colspan="4" style="text-align:right">Sisa</th>' +
                    '<th class="num">' + fmt(sisaTagihan(x)) + '</th><th></th></tr></tfoot></table>';
            }
            h += '</div><div class="modal-foot"><button class="btn btn-ghost" onclick="closeModal()">Tutup</button></div>';
            openModal(h);
        }

        function hapusBayar(mode, idTrx, idBayar) {
            var arrTrx = mode === 'jual' ? DB.penjualan : DB.pembelian;
            var x = arr(arrTrx).find(function (r) { return String(r.id) === String(idTrx); });
            if (!x) return;
            var p = arr(x.bayar).find(function (b) { return String(b.id) === String(idBayar); });
            if (!p) return;
            if (!confirm('Batalkan pembayaran ' + money(p.jumlah) + ' tanggal ' + fmtDate(p.tanggal) + '?')) return;
            x.bayar = arr(x.bayar).filter(function (b) { return String(b.id) !== String(idBayar); });
            // Buang mutasi kas/bank yang menyertainya
            DB.kasbank = arr(DB.kasbank).filter(function (k) {
                return !(k.ref === x.no && k.tanggal === p.tanggal && round2(k.jumlah) === round2(p.jumlah) &&
                    String(k.kategori).indexOf(mode === 'jual' ? 'Pelunasan' : 'Pembayaran') === 0);
            });
            auditLog(mode === 'jual' ? 'Piutang' : 'Utang', 'Batalkan pembayaran ' + x.no);
            closeModal(); renderTagihan(mode); toast('Pembayaran dibatalkan', 'ok'); persist();
        }

        function printTagihan(mode) {
            var isJual = mode === 'jual';
            var list = daftarTagihan(mode);
            var tot = 0;
            var rows = list.map(function (x, i) {
                var s = sisaTagihan(x); tot += s;
                var jt = jatuhTempoTrx(x), umur = umurHari(jt);
                return '<tr><td>' + (i + 1) + '</td><td>' + esc(x.no) + '</td><td>' + fmtDate(x.tanggal) + '</td>' +
                    '<td>' + esc(namaMitra(x)) + '</td><td>' + fmtDate(jt) + '</td>' +
                    '<td class="num">' + (umur > 0 ? 'telat ' + umur : '-') + '</td>' +
                    '<td class="num">' + fmt(x.total) + '</td><td class="num">' + fmt(totalBayar(x)) + '</td>' +
                    '<td class="num">' + fmt(s) + '</td></tr>';
            }).join('');
            var html = docHeader(isJual ? 'DAFTAR PIUTANG USAHA' : 'DAFTAR UTANG USAHA', '', 'Per Tanggal', fmtDate(todayStr()), todayStr()) +
                '<table class="doc-tbl"><thead><tr><th>No</th><th>Dokumen</th><th>Tanggal</th><th>' + (isJual ? 'Pelanggan' : 'Supplier') + '</th>' +
                '<th>Jatuh Tempo</th><th class="num">Umur</th><th class="num">Nilai</th><th class="num">Dibayar</th><th class="num">Sisa</th></tr></thead><tbody>' +
                rows + '</tbody></table>' +
                '<div class="doc-tot"><div class="r g"><span>Total ' + (isJual ? 'Piutang' : 'Utang') + '</span><span>' + money(tot) + '</span></div></div>' +
                docFoot();
            doPrint(html);
        }

        /* =====================================================================
           GAMBAR — logo & foto barang
           Semua gambar disimpan sebagai data URL (base64) di dalam data itu
           sendiri, BUKAN sebagai path file. Jadi ketika aplikasi di-hosting
           (GitHub Pages dsb.) gambar tetap tampil tanpa folder tambahan.

           Batas penting: satu sel Google Sheets maksimal 50.000 karakter,
           jadi foto dikompres sampai aman di bawah batas itu.
           ===================================================================== */
        var MAKS_FOTO_KB = 38;          // ~52.000 karakter base64 -> disisakan margin
        var MAKS_FOTO_PX = 480;

        function kompresGambar(dataUrl, maksPx, maksKB, selesai, gagal) {
            var img = new Image();
            img.onload = function () {
                try {
                    var px = maksPx;
                    var out = '', w = 0, h = 0, q = 0;
                    for (var putaran = 0; putaran < 5; putaran++) {
                        var skala = Math.min(1, px / Math.max(img.width, img.height));
                        w = Math.max(1, Math.round(img.width * skala));
                        h = Math.max(1, Math.round(img.height * skala));
                        var c = document.createElement('canvas');
                        c.width = w; c.height = h;
                        var ctx = c.getContext('2d');
                        ctx.fillStyle = '#ffffff';          // JPEG tidak punya transparansi
                        ctx.fillRect(0, 0, w, h);
                        ctx.drawImage(img, 0, 0, w, h);
                        q = 0.82;
                        out = c.toDataURL('image/jpeg', q);
                        while (out.length > maksKB * 1024 && q > 0.35) {
                            q = round2(q - 0.12);
                            out = c.toDataURL('image/jpeg', q);
                        }
                        if (out.length <= maksKB * 1024) break;
                        px = Math.round(px * 0.75);          // masih besar -> kecilkan dimensi
                    }
                    selesai(out, {
                        wAsli: img.width, hAsli: img.height, w: w, h: h,
                        kb: Math.round(out.length / 1024), mutu: Math.round(q * 100)
                    });
                } catch (e) { console.error('kompresGambar:', e); if (gagal) gagal(e); }
            };
            img.onerror = function () { if (gagal) gagal(new Error('Gambar tidak bisa dibaca')); };
            img.src = dataUrl;
        }

        function bacaFileGambar(file, selesai, gagal) {
            if (!file) return;
            if (!/^image\//.test(file.type)) { toast('File harus berupa gambar', 'err'); return; }
            var r = new FileReader();
            r.onload = function () { selesai(String(r.result)); };
            r.onerror = function () { if (gagal) gagal(new Error('Gagal membaca file')); };
            r.readAsDataURL(file);
        }

        // Foto barang yang sedang disunting di form
        var fotoDraft = '';

        window.pilihFotoBarang = function (inp) {
            var f = inp.files && inp.files[0]; if (!f) return;
            var info = document.getElementById('bFotoInfo');
            if (info) info.textContent = 'Memproses…';
            bacaFileGambar(f, function (asli) {
                kompresGambar(asli, MAKS_FOTO_PX, MAKS_FOTO_KB, function (kecil, k) {
                    fotoDraft = kecil;
                    tampilFotoDraft();
                    if (info) info.textContent = k.wAsli + '×' + k.hAsli + ' → ' + k.w + '×' + k.h +
                        ' · ' + k.kb + ' KB · mutu ' + k.mutu + '%';
                    if (kecil.length > 48000) toast('Foto masih terlalu besar untuk 1 sel Spreadsheet', 'err');
                }, function () { toast('Gambar tidak bisa diproses', 'err'); if (info) info.textContent = ''; });
            });
        };

        window.hapusFotoBarang = function () {
            fotoDraft = '';
            tampilFotoDraft();
            var info = document.getElementById('bFotoInfo');
            if (info) info.textContent = '';
        };

        function tampilFotoDraft() {
            var kotak = document.getElementById('bFotoKotak');
            if (!kotak) return;
            kotak.innerHTML = fotoDraft
                ? '<img src="' + esc(fotoDraft) + '" alt="Foto barang">'
                : '<span class="kosong">📷<br>Belum ada foto</span>';
            var tHapus = document.getElementById('bFotoHapus');
            if (tHapus) tHapus.style.display = fotoDraft ? '' : 'none';
        }

        // Lihat foto ukuran penuh
        window.lihatFoto = function (kode) {
            var b = findBarang(kode);
            if (!b || !b.foto) return;
            openModal(
                '<div class="modal-head"><h3>' + esc(b.kode) + ' — ' + esc(b.nama) + '</h3>' +
                '<button class="x" onclick="closeModal()">&times;</button></div>' +
                '<div class="modal-body" style="text-align:center">' +
                '<img src="' + esc(b.foto) + '" style="max-width:100%;max-height:60vh;border-radius:10px;border:1px solid var(--line)">' +
                '</div><div class="modal-foot"><button class="btn btn-ghost" onclick="closeModal()">Tutup</button></div>'
            );
        };

        /* =====================================================================
           IMPOR MASSAL BARANG & JASA
           Sumber: tempel dari Excel/Sheets (dipisah TAB) atau file CSV.
           ===================================================================== */
        var KOLOM_IMPOR = [
            { kunci: 'kode', label: 'Kode', alias: ['kode', 'code', 'sku', 'kode barang', 'part number', 'partnumber'] },
            { kunci: 'nama', label: 'Nama', alias: ['nama', 'name', 'nama barang', 'deskripsi', 'description', 'item'] },
            { kunci: 'jenis', label: 'Jenis', alias: ['jenis', 'tipe', 'type', 'kategori'] },
            { kunci: 'satuan', label: 'Satuan', alias: ['satuan', 'unit', 'uom'] },
            { kunci: 'hargaBeli', label: 'Harga Beli', alias: ['hargabeli', 'harga beli', 'beli', 'cost', 'harga pokok', 'hpp'] },
            { kunci: 'hargaJual', label: 'Harga Jual', alias: ['hargajual', 'harga jual', 'jual', 'price', 'harga'] },
            { kunci: 'stok', label: 'Stok Awal', alias: ['stok', 'stock', 'qty', 'quantity', 'stok awal', 'jumlah'] },
            { kunci: 'stokMin', label: 'Stok Min', alias: ['stokmin', 'stok min', 'stok minimum', 'min', 'minimum'] },
            { kunci: 'akunPendapatan', label: 'Akun Pendapatan', alias: ['akun', 'akunpendapatan', 'akun pendapatan', 'coa'] }
        ];
        var hasilImpor = null;

        function formImporBarang() {
            migrasiGudang();
            openModal(
                '<div class="modal-head"><h3>Impor Barang &amp; Jasa</h3><button class="x" onclick="closeModal()">&times;</button></div>' +
                '<div class="modal-body">' +
                '<div class="hint" style="margin-bottom:12px">' +
                'Salin baris dari Excel / Google Sheets lalu tempel di kotak bawah, atau pilih file CSV. ' +
                'Kolom dikenali otomatis dari baris judul. Kolom wajib: <b>Kode</b> dan <b>Nama</b>.' +
                '</div>' +
                '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">' +
                '<button class="btn btn-ghost btn-sm" onclick="unduhTemplateBarang()">⬇️ Unduh Template CSV</button>' +
                '<button class="btn btn-ghost btn-sm" onclick="document.getElementById(\'fileImpor\').click()">📄 Pilih File CSV</button>' +
                '<input type="file" id="fileImpor" accept=".csv,.txt,.tsv" style="display:none" onchange="muatFileImpor(this)">' +
                '<button class="btn btn-ghost btn-sm" onclick="isiContohImpor()">✨ Isi Contoh</button>' +
                '</div>' +
                '<div class="field"><label>Data</label>' +
                '<textarea id="imTeks" rows="9" style="width:100%;font-family:monospace;font-size:12px;resize:vertical" ' +
                'placeholder="Kode&#9;Nama&#9;Jenis&#9;Satuan&#9;Harga Beli&#9;Harga Jual&#9;Stok" ' +
                'oninput="pratinjauImpor()"></textarea></div>' +
                '<div class="grid3">' +
                '<div class="field"><label>Pemisah Kolom</label><select id="imPisah" onchange="pratinjauImpor()">' +
                '<option value="auto">Deteksi otomatis</option><option value="\\t">Tab (dari Excel)</option>' +
                '<option value=";">Titik koma ( ; )</option><option value=",">Koma ( , )</option></select></div>' +
                '<div class="field"><label>Stok Awal Masuk Gudang</label><select id="imGudang">' + opsiGudang(gudangDefault()) + '</select></div>' +
                '<div class="field"><label>Kode Sudah Ada</label><select id="imMode" onchange="pratinjauImpor()">' +
                '<option value="update">Perbarui datanya</option>' +
                '<option value="lewati">Lewati, jangan diubah</option></select></div>' +
                '</div>' +
                '<label class="chk"><input type="checkbox" id="imHeader" checked onchange="pratinjauImpor()"> Baris pertama adalah judul kolom</label>' +
                '<div class="divider"></div>' +
                '<div id="imPratinjau"><div class="empty">Tempel data untuk melihat pratinjau.</div></div>' +
                '</div>' +
                '<div class="modal-foot"><button class="btn btn-ghost" onclick="closeModal()">Batal</button>' +
                '<button class="btn btn-primary" id="imTombol" onclick="jalankanImpor()" disabled>Impor</button></div>'
            );
        }

        window.unduhTemplateBarang = function () {
            var judul = KOLOM_IMPOR.map(function (k) { return k.label; }).join(';');
            var contoh = [
                'BRG001;Kertas A4 80gr;Barang;Rim;45000;52000;100;5;',
                'BRG002;Kabel NYM 3x2.5;Barang;Roll;850000;975000;12;2;',
                'JSA001;Instalasi Panel;Jasa;Unit;0;2500000;0;0;4202'
            ].join('\n');
            var blob = new Blob(['﻿' + judul + '\n' + contoh], { type: 'text/csv;charset=utf-8' });
            var a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'template-barang-jasa.csv';
            a.click();
            toast('Template diunduh', 'ok');
        };

        window.isiContohImpor = function () {
            var t = document.getElementById('imTeks');
            if (!t) return;
            t.value = 'Kode\tNama\tJenis\tSatuan\tHarga Beli\tHarga Jual\tStok\tStok Min\n' +
                'BRG900\tContoh Barang A\tBarang\tPcs\t10000\t15000\t25\t5\n' +
                'BRG901\tContoh Barang B\tBarang\tBox\t250000\t310000\t8\t2\n' +
                'JSA900\tContoh Jasa Service\tJasa\tUnit\t0\t750000\t0\t0';
            pratinjauImpor();
        };

        window.muatFileImpor = function (inp) {
            var f = inp.files && inp.files[0];
            if (!f) return;
            var r = new FileReader();
            r.onload = function () {
                var t = document.getElementById('imTeks');
                if (t) { t.value = String(r.result || '').replace(/^﻿/, ''); pratinjauImpor(); }
                toast('File "' + f.name + '" dimuat', 'ok');
            };
            r.onerror = function () { toast('Gagal membaca file', 'err'); };
            r.readAsText(f, 'UTF-8');
        };

        // Tentukan pemisah dari baris pertama
        function tebakPemisah(teks) {
            var baris = String(teks).split(/\r?\n/)[0] || '';
            var skor = { '\t': (baris.match(/\t/g) || []).length, ';': (baris.match(/;/g) || []).length, ',': (baris.match(/,/g) || []).length };
            var t = '\t';
            if (skor[';'] > skor[t]) t = ';';
            if (skor[','] > skor[t]) t = ',';
            return skor[t] ? t : '\t';
        }
        // Pecah satu baris CSV dengan menghormati tanda kutip
        function pecahBaris(baris, pemisah) {
            var hasil = [], kini = '', dalamKutip = false;
            for (var i = 0; i < baris.length; i++) {
                var c = baris.charAt(i);
                if (c === '"') {
                    if (dalamKutip && baris.charAt(i + 1) === '"') { kini += '"'; i++; }
                    else dalamKutip = !dalamKutip;
                } else if (c === pemisah && !dalamKutip) { hasil.push(kini); kini = ''; }
                else kini += c;
            }
            hasil.push(kini);
            return hasil.map(function (s) { return s.trim(); });
        }
        /* Angka gaya Indonesia (1.250.000,50) maupun internasional (1,250,000.50).
           Pemisah yang muncul lebih dari sekali, atau yang diikuti tepat 3 angka,
           dianggap pemisah ribuan — bukan desimal. */
        function angkaImpor(s) {
            s = String(s == null ? '' : s).replace(/[^\d.,-]/g, '').trim();
            if (!s) return 0;
            var minus = s.charAt(0) === '-';
            if (minus) s = s.substring(1);
            var jmlKoma = (s.match(/,/g) || []).length;
            var jmlTitik = (s.match(/\./g) || []).length;
            var akhirKoma = s.lastIndexOf(','), akhirTitik = s.lastIndexOf('.');

            var ribuan = function (tanda, jumlah, posisi) {
                if (!jumlah) return true;                     // tidak ada -> tidak relevan
                if (jumlah > 1) return true;                  // 1.250.000 -> ribuan
                return (s.length - posisi - 1) === 3;         // 1.500 -> ribuan
            };

            if (jmlKoma && jmlTitik) {
                // Yang muncul paling belakang adalah pemisah desimal
                if (akhirKoma > akhirTitik) s = s.replace(/\./g, '').replace(',', '.');
                else s = s.replace(/,/g, '');
            } else if (jmlKoma) {
                s = ribuan(',', jmlKoma, akhirKoma) ? s.replace(/,/g, '') : s.replace(',', '.');
            } else if (jmlTitik) {
                if (ribuan('.', jmlTitik, akhirTitik)) s = s.replace(/\./g, '');
            }
            var n = parseFloat(s);
            if (!isFinite(n)) return 0;
            return minus ? -n : n;
        }

        window.pratinjauImpor = function () {
            var teks = String(val('imTeks') || '').replace(/^﻿/, '').trim();
            var wadah = document.getElementById('imPratinjau');
            var tombol = document.getElementById('imTombol');
            hasilImpor = null;
            if (tombol) tombol.disabled = true;
            if (!wadah) return;
            if (!teks) { wadah.innerHTML = '<div class="empty">Tempel data untuk melihat pratinjau.</div>'; return; }

            var pilih = val('imPisah');
            var pemisah = (pilih === 'auto' || !pilih) ? tebakPemisah(teks) : (pilih === '\\t' ? '\t' : pilih);
            var adaHeader = document.getElementById('imHeader').checked;
            var mode = val('imMode') || 'update';

            var baris = teks.split(/\r?\n/).filter(function (b) { return b.trim() !== ''; });
            if (!baris.length) { wadah.innerHTML = '<div class="empty">Data kosong.</div>'; return; }

            // Petakan kolom
            var peta = {};
            if (adaHeader) {
                var judul = pecahBaris(baris[0], pemisah).map(function (s) { return s.toLowerCase().replace(/[_-]/g, ' ').trim(); });
                judul.forEach(function (j, i) {
                    KOLOM_IMPOR.forEach(function (k) {
                        if (peta[k.kunci] === undefined && k.alias.indexOf(j) !== -1) peta[k.kunci] = i;
                    });
                });
                baris = baris.slice(1);
            }
            // Belum ketemu / tanpa judul -> pakai urutan baku
            if (peta.kode === undefined || peta.nama === undefined) {
                peta = {};
                KOLOM_IMPOR.forEach(function (k, i) { peta[k.kunci] = i; });
            }

            var rows = [], kodeDipakai = {};
            baris.forEach(function (b, i) {
                var sel = pecahBaris(b, pemisah);
                var amb = function (k) { return peta[k] !== undefined ? (sel[peta[k]] || '') : ''; };
                var kode = String(amb('kode')).trim();
                var nama = String(amb('nama')).trim();
                var jenis = /jasa|service/i.test(String(amb('jenis'))) ? 'Jasa' : 'Barang';
                var r = {
                    baris: i + 1 + (adaHeader ? 1 : 0),
                    kode: kode, nama: nama, jenis: jenis,
                    satuan: String(amb('satuan')).trim() || (jenis === 'Jasa' ? 'Unit' : 'Pcs'),
                    hargaBeli: jenis === 'Jasa' ? 0 : angkaImpor(amb('hargaBeli')),
                    hargaJual: angkaImpor(amb('hargaJual')),
                    stok: jenis === 'Jasa' ? 0 : angkaImpor(amb('stok')),
                    stokMin: jenis === 'Jasa' ? 0 : angkaImpor(amb('stokMin')),
                    akunPendapatan: String(amb('akunPendapatan')).trim()
                };
                var lama = findBarang(kode);
                if (!kode) { r.status = 'error'; r.pesan = 'Kode kosong'; }
                else if (!nama) { r.status = 'error'; r.pesan = 'Nama kosong'; }
                else if (kodeDipakai[kode.toLowerCase()]) { r.status = 'error'; r.pesan = 'Kode ganda di dalam file'; }
                else if (lama) {
                    kodeDipakai[kode.toLowerCase()] = 1;
                    if (mode === 'lewati') { r.status = 'lewat'; r.pesan = 'Sudah ada, dilewati'; }
                    else if (isJasa(lama) !== (jenis === 'Jasa') && Number(lama.stok) !== 0) {
                        r.status = 'error'; r.pesan = 'Ganti jenis ditolak, stok masih ' + fmt(lama.stok);
                    } else { r.status = 'update'; r.pesan = 'Perbarui data lama'; r.idLama = lama.id; }
                } else { kodeDipakai[kode.toLowerCase()] = 1; r.status = 'baru'; r.pesan = 'Item baru'; }
                if (r.jenis === 'Jasa' && r.akunPendapatan && !findAkun(r.akunPendapatan)) {
                    r.akunPendapatan = ''; r.pesan += ' (akun tidak dikenal, pakai ' + AKUN_JASA_DEFAULT + ')';
                }
                rows.push(r);
            });

            var n = { baru: 0, update: 0, lewat: 0, error: 0 };
            rows.forEach(function (r) { n[r.status]++; });
            hasilImpor = rows;
            if (tombol) tombol.disabled = (n.baru + n.update) === 0;

            var warna = { baru: '#e8f7ee;color:#0a7', update: '#fef3c7;color:#92400e', lewat: '#eef2f7;color:#475569', error: '#fee;color:#b00' };
            var teksSt = { baru: 'Baru', update: 'Perbarui', lewat: 'Dilewati', error: 'Error' };

            var h = '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">' +
                '<span class="pill" style="background:#e8f7ee;color:#0a7">Baru: ' + n.baru + '</span>' +
                '<span class="pill" style="background:#fef3c7;color:#92400e">Diperbarui: ' + n.update + '</span>' +
                '<span class="pill">Dilewati: ' + n.lewat + '</span>' +
                '<span class="pill" style="background:' + (n.error ? '#fee;color:#b00' : '#eef2f7;color:#475569') + '">Error: ' + n.error + '</span>' +
                '<span class="pill">Pemisah: ' + (pemisah === '\t' ? 'Tab' : pemisah) + '</span></div>';
            h += '<div style="max-height:260px;overflow:auto"><table class="grid"><thead><tr>' +
                '<th>Brs</th><th>Kode</th><th>Nama</th><th>Jenis</th><th>Satuan</th>' +
                '<th class="num">H. Beli</th><th class="num">H. Jual</th><th class="num">Stok</th>' +
                '<th>Status</th></tr></thead><tbody>';
            rows.slice(0, 200).forEach(function (r) {
                h += '<tr' + (r.status === 'error' ? ' style="background:#fff7f7"' : '') + '>' +
                    '<td>' + r.baris + '</td><td>' + esc(r.kode || '—') + '</td><td>' + esc(r.nama || '—') + '</td>' +
                    '<td>' + (r.jenis === 'Jasa' ? '🛠️ Jasa' : '📦 Barang') + '</td><td>' + esc(r.satuan) + '</td>' +
                    '<td class="num">' + fmt(r.hargaBeli) + '</td><td class="num">' + fmt(r.hargaJual) + '</td>' +
                    '<td class="num">' + fmt(r.stok) + '</td>' +
                    '<td><span class="pill" style="background:' + warna[r.status] + '">' + teksSt[r.status] + '</span> ' +
                    '<span class="text-muted" style="font-size:11px">' + esc(r.pesan) + '</span></td></tr>';
            });
            h += '</tbody></table></div>';
            if (rows.length > 200) h += '<div class="hint">Menampilkan 200 baris pertama dari ' + rows.length + '.</div>';
            wadah.innerHTML = h;
        };

        function jalankanImpor() {
            if (!hasilImpor || !hasilImpor.length) { toast('Tidak ada data untuk diimpor', 'err'); return; }
            var pakai = hasilImpor.filter(function (r) { return r.status === 'baru' || r.status === 'update'; });
            if (!pakai.length) { toast('Tidak ada baris yang bisa diimpor', 'err'); return; }
            var gud = val('imGudang') || gudangDefault();
            var nBaru = pakai.filter(function (r) { return r.status === 'baru'; }).length;
            var nUp = pakai.length - nBaru;

            if (!confirm('Impor ' + pakai.length + ' baris?\n\n' +
                '  • ' + nBaru + ' item baru\n' +
                '  • ' + nUp + ' item diperbarui\n' +
                '  • Stok awal masuk gudang: ' + namaGudang(gud) + '\n\n' +
                'Baris bertanda Error dan Dilewati tidak diproses.')) return;

            var dibuat = 0, diubah = 0;
            pakai.forEach(function (r) {
                var lama = r.idLama ? DB.barang.find(function (x) { return String(x.id) === String(r.idLama); }) : null;
                if (lama) {
                    lama.nama = r.nama; lama.jenis = r.jenis; lama.satuan = r.satuan;
                    lama.hargaJual = r.hargaJual;
                    if (r.jenis === 'Jasa') {
                        lama.hargaBeli = 0; lama.stokMin = 0; lama.lokasi = {}; lama.stok = 0;
                        lama.akunPendapatan = r.akunPendapatan || AKUN_JASA_DEFAULT;
                    } else {
                        lama.hargaBeli = r.hargaBeli; lama.stokMin = r.stokMin;
                        // Stok hanya ditimpa kalau kolom stok memang diisi
                        if (r.stok !== 0) {
                            if (!lama.lokasi) lama.lokasi = {};
                            lama.lokasi[gud] = round2(r.stok);
                            sinkronStok(lama);
                        }
                        delete lama.akunPendapatan;
                    }
                    diubah++;
                } else {
                    var obj = {
                        id: uid(), kode: r.kode, nama: r.nama, jenis: r.jenis, satuan: r.satuan,
                        hargaJual: r.hargaJual, stok: 0, lokasi: {}
                    };
                    if (r.jenis === 'Jasa') {
                        obj.hargaBeli = 0; obj.stokMin = 0;
                        obj.akunPendapatan = r.akunPendapatan || AKUN_JASA_DEFAULT;
                    } else {
                        obj.hargaBeli = r.hargaBeli; obj.stokMin = r.stokMin;
                        obj.lokasi[gud] = round2(r.stok);
                        sinkronStok(obj);
                    }
                    DB.barang.push(obj);
                    dibuat++;
                }
            });

            auditLog('Barang', 'Impor massal: ' + dibuat + ' baru, ' + diubah + ' diperbarui');
            closeModal();
            renderBarang();
            toast('Impor selesai — ' + dibuat + ' baru, ' + diubah + ' diperbarui', 'ok');
            persist();
        }

        /* ================= MASTER GUDANG ================= */
        function renderGudang() {
            migrasiGudang();
            var html = '<div class="page-head"><div><h2>Gudang</h2>' +
                '<div class="sub">Master lokasi penyimpanan barang &middot; ' + (DB.gudang || []).length + ' gudang</div></div>' +
                '<button class="btn btn-primary" onclick="formGudang()">＋ Tambah Gudang</button></div>';
            html += '<div class="panel"><div class="panel-body">';
            if (!DB.gudang.length) { html += '<div class="empty">Belum ada gudang.</div>'; }
            else {
                html += '<table class="grid"><thead><tr><th>Kode</th><th>Nama Gudang</th><th>Alamat</th><th>PIC</th>' +
                    '<th class="num">Jenis Barang</th><th class="num">Total Qty</th><th class="num">Nilai Stok</th><th>Status</th><th></th></tr></thead><tbody>';
                DB.gudang.forEach(function (g) {
                    var jenis = 0, qty = 0, nilai = 0;
                    barangFisik().forEach(function (b) {
                        var q = stokGudang(b, g.id);
                        if (q !== 0) { jenis++; qty += q; nilai += q * (Number(b.hargaBeli) || 0); }
                    });
                    html += '<tr><td><b>' + esc(g.kode) + '</b></td><td>' + esc(g.nama) + '</td>' +
                        '<td>' + esc(g.alamat || '-') + '</td><td>' + esc(g.pic || '-') + '</td>' +
                        '<td class="num">' + jenis + '</td><td class="num">' + fmt(qty) + '</td>' +
                        '<td class="num">' + fmt(nilai) + '</td>' +
                        '<td>' + (g.aktif === false ? '<span class="pill" style="background:#fee;color:#b00">Nonaktif</span>' : '<span class="pill" style="background:#e8f7ee;color:#0a7">Aktif</span>') + '</td>' +
                        '<td class="row-actions">' +
                        '<button class="btn btn-ghost btn-sm" onclick="lihatIsiGudang(\'' + g.id + '\')">Isi</button>' +
                        '<button class="btn btn-ghost btn-sm" onclick="formGudang(\'' + g.id + '\')">Edit</button>' +
                        '<button class="btn btn-danger btn-sm" onclick="delGudang(\'' + g.id + '\')">Hapus</button></td></tr>';
                });
                html += '</tbody></table>';
            }
            html += '</div></div>';
            document.getElementById('main').innerHTML = html;
        }
        function formGudang(id) {
            var kosong = { id: '', kode: '', nama: '', alamat: '', pic: '', aktif: true, keterangan: '' };
            var g = id ? findGudang(id) : kosong;
            if (id && !g) { toast('Data gudang tidak ditemukan, muat ulang halaman', 'err'); renderGudang(); return; }
            g = Object.assign({}, kosong, g);
            g.kode = String(g.kode == null ? '' : g.kode);
            g.nama = String(g.nama == null ? '' : g.nama);
            openModal(
                '<div class="modal-head"><h3>' + (id ? 'Edit' : 'Tambah') + ' Gudang</h3><button class="x" onclick="closeModal()">&times;</button></div>' +
                '<div class="modal-body">' +
                '<div class="grid2">' + fld('Kode Gudang', 'gKode', g.kode) + fld('Nama Gudang', 'gNama', g.nama) + '</div>' +
                '<div class="grid2">' + fld('PIC / Penanggung Jawab', 'gPic', g.pic || '') + fld('Keterangan', 'gKet', g.keterangan || '') + '</div>' +
                fldArea('Alamat', 'gAlamat', g.alamat || '') +
                '<label class="chk"><input type="checkbox" id="gAktif" ' + (g.aktif === false ? '' : 'checked') + '> Gudang aktif (bisa dipakai transaksi)</label>' +
                '</div>' +
                '<div class="modal-foot"><button class="btn btn-ghost" onclick="closeModal()">Batal</button>' +
                '<button class="btn btn-primary" onclick="saveGudang(\'' + (id || '') + '\')">Simpan</button></div>'
            );
        }
        function saveGudang(id) {
            id = id ? String(id) : '';
            var kode = val('gKode').trim(), nama = val('gNama').trim();
            if (!kode || !nama) { toast('Kode dan Nama gudang wajib diisi', 'err'); return; }
            // String() penting: kode dari Spreadsheet bisa terbaca sebagai angka
            var dup = DB.gudang.find(function (x) {
                return String(x.kode || '').toLowerCase() === kode.toLowerCase() && String(x.id) !== id;
            });
            if (dup) { toast('Kode gudang "' + kode + '" sudah dipakai', 'err'); return; }
            var elAktif = document.getElementById('gAktif');
            var aktif = elAktif ? elAktif.checked : true;
            if (!aktif && gudangAktif().filter(function (x) { return String(x.id) !== id; }).length === 0) {
                toast('Minimal harus ada 1 gudang aktif', 'err'); return;
            }
            var obj = {
                id: id || uid(), kode: kode, nama: nama, alamat: val('gAlamat').trim(),
                pic: val('gPic').trim(), keterangan: val('gKet').trim(), aktif: aktif
            };
            var i = id ? DB.gudang.findIndex(function (x) { return String(x.id) === id; }) : -1;
            if (i >= 0) DB.gudang[i] = obj;      // ubah data lama
            else DB.gudang.push(obj);            // data baru / id tidak ditemukan
            auditLog('Gudang', (i >= 0 ? 'Edit' : 'Tambah') + ' gudang: ' + kode);
            closeModal(); renderGudang();
            toast('Gudang "' + nama + '" tersimpan', 'ok');
            persist();
        }
        function delGudang(id) {
            var g = findGudang(id); if (!g) return;
            if (DB.gudang.length <= 1) { toast('Harus ada minimal 1 gudang', 'err'); return; }
            var isi = DB.barang.filter(function (b) { return stokGudang(b, id) !== 0; });
            if (isi.length) { toast('Gudang masih berisi ' + isi.length + ' jenis barang. Kosongkan / transfer dulu.', 'err'); return; }
            if (!confirm('Hapus gudang "' + g.nama + '"?')) return;
            DB.gudang = DB.gudang.filter(function (x) { return x.id !== id; });
            DB.barang.forEach(function (b) { if (b.lokasi) delete b.lokasi[id]; sinkronStok(b); });
            auditLog('Gudang', 'Hapus gudang: ' + g.kode);
            persist(); renderGudang(); toast('Gudang dihapus', 'ok');
        }
        function lihatIsiGudang(id) {
            var g = findGudang(id); if (!g) return;
            var rows = barangFisik().filter(function (b) { return stokGudang(b, id) !== 0; });
            var h = '<div class="modal-head"><h3>Isi Gudang: ' + esc(g.nama) + '</h3><button class="x" onclick="closeModal()">&times;</button></div><div class="modal-body">';
            if (!rows.length) h += '<div class="empty">Gudang ini kosong.</div>';
            else {
                h += '<table class="grid"><thead><tr><th>Kode</th><th>Nama Barang</th><th>Satuan</th><th class="num">Qty</th><th class="num">Nilai</th></tr></thead><tbody>';
                var tot = 0;
                rows.forEach(function (b) {
                    var q = stokGudang(b, id), n = q * (Number(b.hargaBeli) || 0); tot += n;
                    h += '<tr><td>' + esc(b.kode) + '</td><td>' + esc(b.nama) + '</td><td>' + esc(b.satuan) + '</td>' +
                        '<td class="num">' + fmt(q) + '</td><td class="num">' + fmt(n) + '</td></tr>';
                });
                h += '</tbody><tfoot><tr><th colspan="4" style="text-align:right">Total Nilai</th><th class="num">' + fmt(tot) + '</th></tr></tfoot></table>';
            }
            h += '</div><div class="modal-foot"><button class="btn btn-ghost" onclick="closeModal()">Tutup</button></div>';
            openModal(h);
        }

        /* ================= TRANSFER STOK ANTAR GUDANG ================= */
        var draftTransfer = [];
        function renderTransfer(f) {
            migrasiGudang();
            var sedangCari = document.activeElement && document.activeElement.classList.contains('search');
            f = f || '';
            var list = (DB.transfer || []).filter(function (t) {
                if (!f) return true;
                var s = (t.no + ' ' + namaGudang(t.dari) + ' ' + namaGudang(t.ke) + ' ' + (t.catatan || '')).toLowerCase();
                return s.indexOf(f.toLowerCase()) >= 0;
            }).sort(function (a, b) { return (b.tanggal || '').localeCompare(a.tanggal || ''); });

            var html = '<div class="page-head"><div><h2>Transfer Stok</h2>' +
                '<div class="sub">Pindahkan stok dari satu gudang ke gudang lain &middot; tidak mengubah total stok &amp; nilai persediaan</div></div>' +
                '<button class="btn btn-primary" onclick="formTransfer()">＋ Transfer Baru</button></div>';

            if (gudangAktif().length < 2) {
                html += '<div class="panel"><div class="panel-body"><div class="hint">⚠️ Butuh minimal 2 gudang aktif untuk melakukan transfer. ' +
                    '<a href="javascript:void(0)" onclick="go(\'gudang\')">Tambah gudang</a> dulu.</div></div></div>';
            }

            html += '<div class="panel"><div class="panel-head"><div class="toolbar">' +
                '<input class="search" placeholder="Cari no / gudang..." value="' + esc(f) + '" oninput="renderTransfer(this.value)">' +
                '</div></div><div class="panel-body">';
            if (!list.length) { html += '<div class="empty">Belum ada transfer stok.</div>'; }
            else {
                html += '<table class="grid"><thead><tr><th>No</th><th>Tanggal</th><th>Dari Gudang</th><th>Ke Gudang</th>' +
                    '<th class="num">Item</th><th class="num">Total Qty</th><th>Catatan</th><th></th></tr></thead><tbody>';
                list.forEach(function (t) {
                    var isi = arr(t.items);
                    var q = 0; isi.forEach(function (it) { q += Number(it.qty) || 0; });
                    html += '<tr><td><b>' + esc(t.no) + '</b></td><td>' + fmtDate(t.tanggal) + '</td>' +
                        '<td><span class="tag out">' + esc(namaGudang(t.dari)) + '</span></td>' +
                        '<td><span class="tag in">' + esc(namaGudang(t.ke)) + '</span></td>' +
                        '<td class="num">' + isi.length + '</td><td class="num">' + fmt(q) + '</td>' +
                        '<td>' + esc(t.catatan || '') + '</td>' +
                        '<td class="row-actions">' +
                        '<button class="btn btn-ghost btn-sm" onclick="detailTransfer(\'' + t.id + '\')">Detail</button>' +
                        '<button class="btn btn-danger btn-sm" onclick="delTransfer(\'' + t.id + '\')">Batalkan</button></td></tr>';
                });
                html += '</tbody></table>';
            }
            html += '</div></div>';
            document.getElementById('main').innerHTML = html;
            // Kembalikan fokus ke kotak cari supaya ketikan tidak terputus
            if (sedangCari) {
                var cari = document.getElementById('main').querySelector('.search');
                if (cari) { cari.focus(); var n = cari.value.length; cari.setSelectionRange(n, n); }
            }
        }

        function formTransfer() {
            migrasiGudang();
            if (gudangAktif().length < 2) { toast('Butuh minimal 2 gudang aktif', 'err'); go('gudang'); return; }
            draftTransfer = [{ kode: '', nama: '', qty: 1 }];
            var akt = gudangAktif();
            openModal(
                '<div class="modal-head"><h3>Transfer Stok Antar Gudang</h3><button class="x" onclick="closeModal()">&times;</button></div>' +
                '<div class="modal-body">' +
                '<div class="grid3">' +
                fld('Tanggal', 'trTgl', todayStr(), 'date') +
                '<div class="field"><label>Dari Gudang (asal)</label><select id="trDari" onchange="renderTransferItems()">' + opsiGudang(akt[0].id) + '</select></div>' +
                '<div class="field"><label>Ke Gudang (tujuan)</label><select id="trKe" onchange="renderTransferItems()">' + opsiGudang(akt[1].id) + '</select></div>' +
                '</div>' +
                '<div id="trItemsWrap"></div>' +
                '<button class="btn btn-ghost btn-sm" style="margin-top:8px" onclick="addTransferItem()">＋ Tambah Baris</button>' +
                '<div style="margin-top:14px">' + fldArea('Catatan', 'trNote', '') + '</div>' +
                '</div>' +
                '<div class="modal-foot"><button class="btn btn-ghost" onclick="closeModal()">Batal</button>' +
                '<button class="btn btn-primary" onclick="saveTransfer()">🔁 Proses Transfer</button></div>'
            );
            renderTransferItems();
        }

        function renderTransferItems() {
            var dari = val('trDari');
            // Hanya barang fisik yang bisa ditransfer — jasa tidak punya stok
            var opts = '<option value="">— pilih barang —</option>' + barangFisik().map(function (b) {
                var q = stokGudang(b, dari);
                return '<option value="' + esc(b.kode) + '"' + (q <= 0 ? ' disabled' : '') + '>' +
                    esc(b.kode) + ' — ' + esc(b.nama) + ' (tersedia ' + fmt(q) + ')</option>';
            }).join('');
            var h = '<table class="items"><thead><tr><th style="width:45%">Barang</th><th style="width:18%">Stok di Gudang Asal</th>' +
                '<th style="width:18%">Qty Transfer</th><th style="width:14%">Sisa</th><th></th></tr></thead><tbody>';
            draftTransfer.forEach(function (it, i) {
                var b = findBarang(it.kode);
                var ada = b ? stokGudang(b, dari) : 0;
                var sisa = round2(ada - (Number(it.qty) || 0));
                var sel = opts.replace('value="' + esc(it.kode) + '"', 'value="' + esc(it.kode) + '" selected');
                h += '<tr>' +
                    '<td><select onchange="pickTransferItem(' + i + ',this.value)">' + sel + '</select></td>' +
                    '<td style="text-align:right;font-variant-numeric:tabular-nums">' + fmt(ada) + (b ? ' ' + esc(b.satuan || '') : '') + '</td>' +
                    '<td><input class="num moneyIn" id="trQty' + i + '" value="' + it.qty + '" oninput="updTransferItem(' + i + ',this.value)"></td>' +
                    '<td id="trSisa' + i + '" style="text-align:right;font-variant-numeric:tabular-nums;' + (sisa < 0 ? 'color:var(--danger);font-weight:700' : '') + '">' + fmt(sisa) + '</td>' +
                    '<td><button class="btn btn-danger btn-sm" onclick="rmTransferItem(' + i + ')">✕</button></td>' +
                    '</tr>';
            });
            h += '</tbody></table>';
            var w = document.getElementById('trItemsWrap');
            if (w) { w.innerHTML = h; attachNumInputs(); }
        }
        function pickTransferItem(i, kode) {
            var b = findBarang(kode);
            draftTransfer[i].kode = kode;
            draftTransfer[i].nama = b ? b.nama : '';
            renderTransferItems();
        }
        /* Jangan bangun ulang tabel saat mengetik — itu menghancurkan kolom input
           dan membuat kursor melompat. Cukup perbarui sel "Sisa" milik baris ini. */
        function updTransferItem(i, v) {
            if (!draftTransfer[i]) return;
            draftTransfer[i].qty = parseNum(v);
            var sel = document.getElementById('trSisa' + i);
            if (!sel) return;
            var b = findBarang(draftTransfer[i].kode);
            var ada = b ? stokGudang(b, val('trDari')) : 0;
            var sisa = round2(ada - (Number(draftTransfer[i].qty) || 0));
            sel.textContent = fmt(sisa);
            sel.style.color = sisa < 0 ? 'var(--danger)' : '';
            sel.style.fontWeight = sisa < 0 ? '700' : '';
        }
        function addTransferItem() { draftTransfer.push({ kode: '', nama: '', qty: 1 }); renderTransferItems(); }
        function rmTransferItem(i) {
            draftTransfer.splice(i, 1);
            if (!draftTransfer.length) draftTransfer.push({ kode: '', nama: '', qty: 1 });
            renderTransferItems();
        }

        function saveTransfer() {
            var dari = val('trDari'), ke = val('trKe'), tgl = val('trTgl') || todayStr();
            if (!dari || !ke) { toast('Pilih gudang asal dan tujuan', 'err'); return; }
            if (dari === ke) { toast('Gudang asal dan tujuan tidak boleh sama', 'err'); return; }

            var items = draftTransfer.filter(function (it) { return it.kode && Number(it.qty) > 0; })
                .map(function (it) { return { kode: it.kode, nama: it.nama, qty: round2(it.qty) }; });
            if (!items.length) { toast('Tambahkan minimal 1 barang', 'err'); return; }

            // gabungkan baris dengan kode sama
            var merged = {};
            items.forEach(function (it) {
                if (merged[it.kode]) merged[it.kode].qty = round2(merged[it.kode].qty + it.qty);
                else merged[it.kode] = { kode: it.kode, nama: it.nama, qty: it.qty };
            });
            items = Object.keys(merged).map(function (k) { return merged[k]; });

            // validasi ketersediaan di gudang asal
            for (var i = 0; i < items.length; i++) {
                var b = findBarang(items[i].kode);
                if (!b) { toast('Barang ' + items[i].kode + ' tidak ditemukan', 'err'); return; }
                if (isJasa(b)) { toast('"' + b.nama + '" adalah jasa, tidak punya stok untuk ditransfer', 'err'); return; }
                var ada = stokGudang(b, dari);
                if (ada < items[i].qty) {
                    toast('Stok "' + b.nama + '" di ' + namaGudang(dari) + ' hanya ' + fmt(ada), 'err'); return;
                }
            }

            var rec = {
                id: uid(), no: nextNo('TRF'), tanggal: tgl, dari: dari, ke: ke,
                items: items, catatan: val('trNote').trim(), status: 'Final'
            };
            items.forEach(function (it) {
                var b = findBarang(it.kode);
                mutasiStok(b, dari, -it.qty);
                mutasiStok(b, ke, it.qty);
            });
            DB.transfer.push(rec);
            auditLog('Transfer Stok', rec.no + ': ' + namaGudang(dari) + ' → ' + namaGudang(ke) + ' (' + items.length + ' item)');
            persist(); closeModal(); renderTransfer();
            toast('Transfer ' + rec.no + ' berhasil', 'ok');
        }

        function detailTransfer(id) {
            var t = (DB.transfer || []).find(function (x) { return x.id === id; }); if (!t) return;
            var h = '<div class="modal-head"><h3>Transfer ' + esc(t.no) + '</h3><button class="x" onclick="closeModal()">&times;</button></div><div class="modal-body">' +
                '<div class="grid3">' +
                '<div class="field"><label>Tanggal</label><div>' + fmtDate(t.tanggal) + '</div></div>' +
                '<div class="field"><label>Dari Gudang</label><div><b>' + esc(namaGudang(t.dari)) + '</b></div></div>' +
                '<div class="field"><label>Ke Gudang</label><div><b>' + esc(namaGudang(t.ke)) + '</b></div></div>' +
                '</div>' +
                '<table class="grid"><thead><tr><th>Kode</th><th>Nama Barang</th><th class="num">Qty</th></tr></thead><tbody>';
            (t.items || []).forEach(function (it) {
                h += '<tr><td>' + esc(it.kode) + '</td><td>' + esc(it.nama) + '</td><td class="num">' + fmt(it.qty) + '</td></tr>';
            });
            h += '</tbody></table>' + (t.catatan ? '<div class="hint" style="margin-top:10px">Catatan: ' + esc(t.catatan) + '</div>' : '') +
                '</div><div class="modal-foot"><button class="btn btn-ghost" onclick="closeModal()">Tutup</button>' +
                '<button class="btn btn-ghost" onclick="printTransfer(\'' + t.id + '\')">🖨️ Cetak</button></div>';
            openModal(h);
        }

        function delTransfer(id) {
            var t = (DB.transfer || []).find(function (x) { return x.id === id; }); if (!t) return;
            if (!confirm('Batalkan transfer ' + t.no + '? Stok akan dikembalikan ke ' + namaGudang(t.dari) + '.')) return;
            // cek stok di gudang tujuan masih cukup untuk dikembalikan
            for (var i = 0; i < t.items.length; i++) {
                var b = findBarang(t.items[i].kode);
                if (b && stokGudang(b, t.ke) < t.items[i].qty) {
                    toast('Stok "' + b.nama + '" di ' + namaGudang(t.ke) + ' sudah terpakai, tidak bisa dibatalkan', 'err'); return;
                }
            }
            t.items.forEach(function (it) {
                var b = findBarang(it.kode); if (!b) return;
                mutasiStok(b, t.ke, -it.qty);
                mutasiStok(b, t.dari, it.qty);
            });
            DB.transfer = DB.transfer.filter(function (x) { return x.id !== id; });
            auditLog('Transfer Stok', 'Batalkan ' + t.no);
            persist(); renderTransfer(); toast('Transfer ' + t.no + ' dibatalkan', 'ok');
        }

        /* =====================================================================
           HALAMAN: RETUR PENJUALAN & PEMBELIAN
           ===================================================================== */
        var draftRetur = [];

        function renderRetur(f) {
            f = f || '';
            var list = arr(DB.retur).filter(function (r) {
                return !f || ((r.no || '') + ' ' + (r.refNo || '') + ' ' + (r.pihak || '')).toLowerCase().indexOf(f.toLowerCase()) >= 0;
            }).sort(function (a, b) { return String(b.tanggal).localeCompare(String(a.tanggal)); });

            var totJual = 0, totBeli = 0;
            arr(DB.retur).forEach(function (r) {
                if (r.jenis === 'Jual') totJual += Number(r.total) || 0; else totBeli += Number(r.total) || 0;
            });

            var html = '<div class="page-head"><div><h2>Retur</h2>' +
                '<div class="sub">Pengembalian barang dari pelanggan atau ke supplier</div></div>' +
                '<div style="display:flex;gap:8px">' +
                '<button class="btn btn-ghost" onclick="formRetur(\'Beli\')">↩️ Retur Pembelian</button>' +
                '<button class="btn btn-primary" onclick="formRetur(\'Jual\')">↩️ Retur Penjualan</button></div></div>';

            html += '<div class="cards">' +
                card('Total Retur Penjualan', '📥', money(totJual)) +
                card('Total Retur Pembelian', '📤', money(totBeli)) +
                card('Jumlah Dokumen', '🧾', String(arr(DB.retur).length)) +
                '</div>';

            html += '<div class="panel"><div class="panel-head"><div class="toolbar">' +
                '<input class="search" placeholder="Cari no retur / dokumen asal..." value="' + esc(f) + '" oninput="renderRetur(this.value)">' +
                '</div></div><div class="panel-body">';
            if (!list.length) html += '<div class="empty">Belum ada retur.</div>';
            else {
                html += '<table class="grid"><thead><tr><th>No Retur</th><th>Tanggal</th><th>Jenis</th><th>Dokumen Asal</th>' +
                    '<th>Pihak</th><th>Gudang</th><th class="ctr">Item</th><th class="num">Nilai</th><th>Alasan</th><th></th></tr></thead><tbody>';
                list.forEach(function (r) {
                    html += '<tr><td><b>' + esc(r.no) + '</b></td><td>' + fmtDate(r.tanggal) + '</td>' +
                        '<td>' + (r.jenis === 'Jual'
                            ? '<span class="pill" style="background:#e0f2fe;color:#075985">Penjualan</span>'
                            : '<span class="pill" style="background:#fef3c7;color:#92400e">Pembelian</span>') + '</td>' +
                        '<td>' + esc(r.refNo || '-') + '</td><td>' + esc(r.pihak || '-') + '</td>' +
                        '<td>' + esc(namaGudang(r.gudang)) + '</td>' +
                        '<td class="ctr">' + arr(r.items).length + '</td>' +
                        '<td class="num">' + fmt(r.total) + '</td>' +
                        '<td>' + esc(r.alasan || '-') + '</td>' +
                        '<td class="row-actions">' +
                        '<button class="btn btn-ghost btn-sm" onclick="printRetur(\'' + r.id + '\')">🖨️</button>' +
                        '<button class="btn btn-danger btn-sm" onclick="delRetur(\'' + r.id + '\')">Batalkan</button></td></tr>';
                });
                html += '</tbody></table>';
            }
            html += '</div></div>';
            document.getElementById('main').innerHTML = html;
        }

        function formRetur(jenis) {
            migrasiGudang();
            var isJual = jenis === 'Jual';
            var sumber = arr(isJual ? DB.penjualan : DB.pembelian)
                .filter(function (x) { return x.status === 'Final'; })
                .sort(function (a, b) { return String(b.tanggal).localeCompare(String(a.tanggal)); });
            if (!sumber.length) { toast('Belum ada ' + (isJual ? 'penjualan' : 'pembelian') + ' final untuk diretur', 'err'); return; }
            draftRetur = [];
            var opts = '<option value="">— pilih dokumen —</option>' + sumber.map(function (x) {
                return '<option value="' + esc(x.id) + '">' + esc(x.no) + ' — ' + fmtDate(x.tanggal) + ' — ' +
                    esc(namaMitra(x)) + ' (' + fmt(x.total) + ')</option>';
            }).join('');

            openModal(
                '<div class="modal-head"><h3>Retur ' + (isJual ? 'Penjualan' : 'Pembelian') + '</h3>' +
                '<button class="x" onclick="closeModal()">&times;</button></div>' +
                '<div class="modal-body">' +
                '<div class="grid3">' +
                '<div class="field"><label>Dokumen Asal *</label><select id="rtRef" onchange="pilihDokRetur(\'' + jenis + '\')">' + opts + '</select></div>' +
                fld('Tanggal Retur', 'rtTgl', todayStr(), 'date') +
                '<div class="field"><label>Nilai Retur Dikembalikan Lewat</label><select id="rtKredit">' +
                '<option value="Kas">Kas / Bank</option>' +
                '<option value="' + (isJual ? 'Piutang' : 'Utang') + '">Potong ' + (isJual ? 'Piutang' : 'Utang') + '</option>' +
                '</select></div>' +
                '</div>' +
                '<div class="grid3">' + selField('Kas / Bank', 'rtAkun', ['Kas', 'Bank'], 'Bank') +
                '<div class="field"><label>Gudang</label><select id="rtGudang">' + opsiGudang(gudangDefault()) + '</select></div>' +
                fld('Alasan Retur', 'rtAlasan', '') + '</div>' +
                '<div id="rtItemsWrap"><div class="empty">Pilih dokumen asal dulu.</div></div>' +
                '<div class="totbox" style="margin-top:14px">' +
                '<div class="totrow grand"><span>TOTAL RETUR</span><span id="rtTotal">0.00</span></div></div>' +
                '</div>' +
                '<div class="modal-foot"><button class="btn btn-ghost" onclick="closeModal()">Batal</button>' +
                '<button class="btn btn-primary" onclick="saveRetur(\'' + jenis + '\')">Simpan Retur</button></div>'
            );
        }

        window.pilihDokRetur = function (jenis) {
            var isJual = jenis === 'Jual';
            var x = arr(isJual ? DB.penjualan : DB.pembelian).find(function (r) { return String(r.id) === String(val('rtRef')); });
            if (!x) { draftRetur = []; document.getElementById('rtItemsWrap').innerHTML = '<div class="empty">Pilih dokumen asal dulu.</div>'; return; }
            // Sisa qty yang masih bisa diretur = qty asli - yang sudah pernah diretur
            var sudah = {};
            arr(DB.retur).forEach(function (r) {
                if (String(r.refId) !== String(x.id)) return;
                arr(r.items).forEach(function (it) { sudah[it.kode] = (sudah[it.kode] || 0) + (Number(it.qty) || 0); });
            });
            draftRetur = arr(x.items).map(function (it) {
                var maks = round2((Number(it.qty) || 0) - (sudah[it.kode] || 0));
                return { kode: it.kode, nama: it.nama, harga: Number(it.harga) || 0, maks: maks, qty: 0 };
            }).filter(function (it) { return it.maks > 0; });
            var g = document.getElementById('rtGudang');
            if (g && x.gudang) g.value = x.gudang;
            renderReturItems();
        };

        function renderReturItems() {
            var w = document.getElementById('rtItemsWrap');
            if (!w) return;
            if (!draftRetur.length) { w.innerHTML = '<div class="empty">Semua item pada dokumen ini sudah diretur.</div>'; hitungRetur(); return; }
            var h = '<table class="items"><thead><tr><th style="width:42%">Barang / Jasa</th>' +
                '<th style="width:14%">Qty Dokumen</th><th style="width:16%">Qty Retur</th>' +
                '<th style="width:14%">Harga</th><th style="width:14%">Subtotal</th></tr></thead><tbody>';
            draftRetur.forEach(function (it, i) {
                h += '<tr><td>' + esc(it.kode) + ' — ' + esc(it.nama) + '</td>' +
                    '<td style="text-align:right;font-variant-numeric:tabular-nums">' + fmt(it.maks) + '</td>' +
                    '<td><input class="num moneyIn" id="rtQty' + i + '" value="' + it.qty + '" oninput="updReturItem(' + i + ',this.value)"></td>' +
                    '<td style="text-align:right;font-variant-numeric:tabular-nums">' + fmt(it.harga) + '</td>' +
                    '<td style="text-align:right;font-variant-numeric:tabular-nums" id="rtSub' + i + '">' + fmt(it.qty * it.harga) + '</td></tr>';
            });
            h += '</tbody></table><div class="hint" style="margin-top:6px">Qty retur tidak boleh melebihi qty pada dokumen asal (sudah dikurangi retur sebelumnya).</div>';
            w.innerHTML = h;
            attachNumInputs();
            hitungRetur();
        }
        window.updReturItem = function (i, v) {
            if (!draftRetur[i]) return;
            var q = parseNum(v);
            if (q > draftRetur[i].maks) { q = draftRetur[i].maks; var el = document.getElementById('rtQty' + i); if (el) el.value = q; toast('Maksimal ' + fmt(draftRetur[i].maks), 'err'); }
            if (q < 0) q = 0;
            draftRetur[i].qty = q;
            var sel = document.getElementById('rtSub' + i);
            if (sel) sel.textContent = fmt(round2(q * draftRetur[i].harga));
            hitungRetur();
        };
        function hitungRetur() {
            var t = 0;
            draftRetur.forEach(function (it) { t += round2((Number(it.qty) || 0) * (Number(it.harga) || 0)); });
            set('rtTotal', fmt(round2(t)));
            return round2(t);
        }

        function saveRetur(jenis) {
            var isJual = jenis === 'Jual';
            var refId = val('rtRef');
            var x = arr(isJual ? DB.penjualan : DB.pembelian).find(function (r) { return String(r.id) === String(refId); });
            if (!x) { toast('Pilih dokumen asal', 'err'); return; }

            var items = draftRetur.filter(function (it) { return Number(it.qty) > 0; })
                .map(function (it) {
                    return { kode: it.kode, nama: it.nama, qty: round2(it.qty), harga: round2(it.harga), subtotal: round2(it.qty * it.harga) };
                });
            if (!items.length) { toast('Isi qty retur minimal 1 item', 'err'); return; }

            var gud = val('rtGudang') || gudangDefault();

            // Retur pembelian: stok keluar — pastikan cukup
            if (!isJual) {
                for (var i = 0; i < items.length; i++) {
                    var b = findBarang(items[i].kode);
                    if (b && !isJasa(b) && stokGudang(b, gud) < items[i].qty) {
                        toast('Stok "' + b.nama + '" di ' + namaGudang(gud) + ' tidak cukup untuk diretur (tersedia ' + fmt(stokGudang(b, gud)) + ')', 'err');
                        return;
                    }
                }
            }

            var total = 0, hpp = 0;
            items.forEach(function (it) {
                total += it.subtotal;
                var b = findBarang(it.kode);
                if (b && !isJasa(b)) hpp += it.qty * (Number(b.hargaBeli) || 0);
            });

            var rec = {
                id: uid(), no: nextNo(isJual ? 'RTJ' : 'RTB'), tanggal: val('rtTgl') || todayStr(),
                jenis: jenis, refId: x.id, refNo: x.no, pihak: namaMitra(x), mitraId: x.mitraId || '',
                gudang: gud, items: items, total: round2(total), hpp: round2(hpp),
                kredit: val('rtKredit'), akun: val('rtAkun'), alasan: val('rtAlasan').trim(), status: 'Final'
            };

            // Stok: retur penjualan -> masuk gudang; retur pembelian -> keluar gudang
            items.forEach(function (it) {
                var b = findBarang(it.kode);
                if (!b || isJasa(b)) return;
                mutasiStok(b, gud, isJual ? it.qty : -it.qty);
            });

            // Mutasi kas hanya kalau uang benar-benar berpindah
            if (rec.kredit === 'Kas') {
                DB.kasbank.push({
                    id: uid(), tanggal: rec.tanggal, akun: rec.akun, arah: isJual ? 'Keluar' : 'Masuk',
                    kategori: isJual ? 'Retur Penjualan' : 'Retur Pembelian', jumlah: rec.total,
                    keterangan: 'Retur ' + rec.no + ' atas ' + x.no + ' - ' + rec.pihak, ref: rec.no, auto: true
                });
            } else {
                // Potong piutang/utang dokumen asal
                if (!Array.isArray(x.bayar)) x.bayar = [];
                x.bayar.push({ id: uid(), tanggal: rec.tanggal, akun: rec.akun, jumlah: rec.total, catatan: 'Potongan retur ' + rec.no });
            }

            DB.retur.push(rec);
            auditLog('Retur', rec.no + ' atas ' + x.no + ' senilai ' + fmt(rec.total));
            closeModal(); renderRetur();
            toast('Retur ' + rec.no + ' tersimpan', 'ok');
            persist();
        }

        function delRetur(id) {
            var r = arr(DB.retur).find(function (x) { return String(x.id) === String(id); });
            if (!r) return;
            var isJual = r.jenis === 'Jual';
            if (!confirm('Batalkan retur ' + r.no + '? Stok dan pencatatan keuangan akan dikembalikan.')) return;

            // Retur penjualan dibatalkan -> stok keluar lagi, pastikan cukup
            if (isJual) {
                for (var i = 0; i < arr(r.items).length; i++) {
                    var b = findBarang(r.items[i].kode);
                    if (b && !isJasa(b) && stokGudang(b, r.gudang) < r.items[i].qty) {
                        toast('Stok "' + b.nama + '" sudah terpakai, retur tidak bisa dibatalkan', 'err'); return;
                    }
                }
            }
            arr(r.items).forEach(function (it) {
                var b = findBarang(it.kode);
                if (!b || isJasa(b)) return;
                mutasiStok(b, r.gudang, isJual ? -it.qty : it.qty);
            });
            DB.kasbank = arr(DB.kasbank).filter(function (k) { return k.ref !== r.no; });
            // Buang potongan piutang/utang bila ada
            var asal = arr(isJual ? DB.penjualan : DB.pembelian).find(function (x) { return String(x.id) === String(r.refId); });
            if (asal && Array.isArray(asal.bayar)) {
                asal.bayar = asal.bayar.filter(function (p) { return String(p.catatan || '').indexOf(r.no) === -1; });
            }
            DB.retur = arr(DB.retur).filter(function (x) { return String(x.id) !== String(id); });
            auditLog('Retur', 'Batalkan ' + r.no);
            persist(); renderRetur(); toast('Retur ' + r.no + ' dibatalkan', 'ok');
        }

        function printRetur(id) {
            var r = arr(DB.retur).find(function (x) { return String(x.id) === String(id); });
            if (!r) return;
            var rows = arr(r.items).map(function (it, i) {
                return '<tr><td>' + (i + 1) + '</td><td>' + esc(it.kode) + '</td><td>' + esc(it.nama) + '</td>' +
                    '<td class="num">' + fmt(it.qty) + '</td><td class="num">' + fmt(it.harga) + '</td>' +
                    '<td class="num">' + fmt(it.subtotal) + '</td></tr>';
            }).join('');
            var html = docHeader('BUKTI RETUR ' + (r.jenis === 'Jual' ? 'PENJUALAN' : 'PEMBELIAN'), 'Atas dokumen ' + r.refNo, 'No. Retur', r.no, r.tanggal) +
                '<div class="doc-meta"><div class="box"><b>Pihak</b><br>' + esc(r.pihak) + '</div>' +
                '<div class="box"><b>Gudang</b><br>' + esc(namaGudang(r.gudang)) + '</div>' +
                '<div class="box"><b>Alasan</b><br>' + esc(r.alasan || '-') + '</div></div>' +
                '<table class="doc-tbl"><thead><tr><th>No</th><th>Kode</th><th>Nama</th><th class="num">Qty</th>' +
                '<th class="num">Harga</th><th class="num">Jumlah</th></tr></thead><tbody>' + rows + '</tbody></table>' +
                '<div class="doc-tot"><div class="r g"><span>TOTAL RETUR</span><span>' + money(r.total) + '</span></div></div>' +
                signBlock('Diserahkan,', 'Diterima,') + docFoot();
            doPrint(html);
        }

        /* =====================================================================
           HALAMAN: STOK OPNAME
           ===================================================================== */
        var draftOpname = [];

        function renderOpname(f) {
            migrasiGudang();
            f = f || '';
            var list = arr(DB.opname).filter(function (o) {
                return !f || ((o.no || '') + ' ' + namaGudang(o.gudang) + ' ' + (o.catatan || '')).toLowerCase().indexOf(f.toLowerCase()) >= 0;
            }).sort(function (a, b) { return String(b.tanggal).localeCompare(String(a.tanggal)); });

            var html = '<div class="page-head"><div><h2>Stok Opname</h2>' +
                '<div class="sub">Hitung fisik gudang &amp; catat selisihnya ke akun Selisih Persediaan</div></div>' +
                '<button class="btn btn-primary" onclick="formOpname()">＋ Opname Baru</button></div>';

            html += '<div class="panel"><div class="panel-head"><div class="toolbar">' +
                '<input class="search" placeholder="Cari no / gudang..." value="' + esc(f) + '" oninput="renderOpname(this.value)">' +
                '</div></div><div class="panel-body">';
            if (!list.length) html += '<div class="empty">Belum ada stok opname.</div>';
            else {
                html += '<table class="grid"><thead><tr><th>No</th><th>Tanggal</th><th>Gudang</th>' +
                    '<th class="ctr">Item Dihitung</th><th class="ctr">Item Selisih</th>' +
                    '<th class="num">Selisih Qty</th><th class="num">Nilai Selisih</th><th>Catatan</th><th></th></tr></thead><tbody>';
                list.forEach(function (o) {
                    var beda = arr(o.items).filter(function (it) { return Number(it.selisih) !== 0; });
                    var qty = 0; beda.forEach(function (it) { qty += Number(it.selisih) || 0; });
                    var n = Number(o.nilaiSelisih) || 0;
                    html += '<tr><td><b>' + esc(o.no) + '</b></td><td>' + fmtDate(o.tanggal) + '</td>' +
                        '<td>' + esc(namaGudang(o.gudang)) + '</td>' +
                        '<td class="ctr">' + arr(o.items).length + '</td>' +
                        '<td class="ctr">' + beda.length + '</td>' +
                        '<td class="num" style="' + (qty < 0 ? 'color:var(--danger)' : '') + '">' + fmt(qty) + '</td>' +
                        '<td class="num" style="' + (n < 0 ? 'color:var(--danger)' : '') + '">' + fmt(n) + '</td>' +
                        '<td>' + esc(o.catatan || '-') + '</td>' +
                        '<td class="row-actions"><button class="btn btn-ghost btn-sm" onclick="detailOpname(\'' + o.id + '\')">Detail</button>' +
                        '<button class="btn btn-ghost btn-sm" onclick="printOpname(\'' + o.id + '\')">🖨️</button></td></tr>';
                });
                html += '</tbody></table>';
            }
            html += '</div></div>';
            document.getElementById('main').innerHTML = html;
        }

        function formOpname() {
            migrasiGudang();
            draftOpname = [];
            openModal(
                '<div class="modal-head"><h3>Stok Opname Baru</h3><button class="x" onclick="closeModal()">&times;</button></div>' +
                '<div class="modal-body">' +
                '<div class="grid3">' + fld('Tanggal', 'opTgl', todayStr(), 'date') +
                '<div class="field"><label>Gudang *</label><select id="opGudang" onchange="muatItemOpname()">' + opsiGudang(gudangDefault()) + '</select></div>' +
                '<div class="field"><label>&nbsp;</label><label class="chk"><input type="checkbox" id="opSemua" onchange="muatItemOpname()"> Tampilkan barang berstok 0</label></div>' +
                '</div>' +
                '<div id="opItemsWrap"></div>' +
                fldArea('Catatan', 'opCatatan', '') +
                '<div class="totbox"><div class="totrow"><span>Selisih Qty</span><span id="opQty">0.00</span></div>' +
                '<div class="totrow grand"><span>NILAI SELISIH</span><span id="opNilai">0.00</span></div></div>' +
                '</div>' +
                '<div class="modal-foot"><button class="btn btn-ghost" onclick="closeModal()">Batal</button>' +
                '<button class="btn btn-primary" onclick="saveOpname()">💾 Simpan &amp; Sesuaikan Stok</button></div>'
            );
            muatItemOpname();
        }

        window.muatItemOpname = function () {
            var g = val('opGudang');
            var semua = document.getElementById('opSemua') && document.getElementById('opSemua').checked;
            draftOpname = barangFisik().filter(function (b) {
                return semua || stokGudang(b, g) !== 0;
            }).map(function (b) {
                var sistem = stokGudang(b, g);
                return { kode: b.kode, nama: b.nama, satuan: b.satuan, hargaBeli: Number(b.hargaBeli) || 0, sistem: sistem, fisik: sistem };
            });
            renderOpnameItems();
        };

        function renderOpnameItems() {
            var w = document.getElementById('opItemsWrap');
            if (!w) return;
            if (!draftOpname.length) { w.innerHTML = '<div class="empty">Tidak ada barang untuk dihitung di gudang ini.</div>'; hitungOpname(); return; }
            var h = '<table class="items"><thead><tr><th style="width:36%">Barang</th><th style="width:10%">Satuan</th>' +
                '<th style="width:15%">Stok Sistem</th><th style="width:15%">Hitungan Fisik</th>' +
                '<th style="width:12%">Selisih</th><th style="width:12%">Nilai</th></tr></thead><tbody>';
            draftOpname.forEach(function (it, i) {
                var sel = round2(it.fisik - it.sistem);
                h += '<tr><td>' + esc(it.kode) + ' — ' + esc(it.nama) + '</td>' +
                    '<td>' + esc(it.satuan || '') + '</td>' +
                    '<td style="text-align:right;font-variant-numeric:tabular-nums">' + fmt(it.sistem) + '</td>' +
                    '<td><input class="num moneyIn" value="' + it.fisik + '" oninput="updOpname(' + i + ',this.value)"></td>' +
                    '<td id="opSel' + i + '" style="text-align:right;font-variant-numeric:tabular-nums;' + (sel < 0 ? 'color:var(--danger);font-weight:700' : '') + '">' + fmt(sel) + '</td>' +
                    '<td id="opVal' + i + '" style="text-align:right;font-variant-numeric:tabular-nums">' + fmt(sel * it.hargaBeli) + '</td></tr>';
            });
            h += '</tbody></table>';
            w.innerHTML = h;
            attachNumInputs();
            hitungOpname();
        }
        window.updOpname = function (i, v) {
            if (!draftOpname[i]) return;
            draftOpname[i].fisik = parseNum(v);
            var it = draftOpname[i];
            var sel = round2(it.fisik - it.sistem);
            var elS = document.getElementById('opSel' + i), elV = document.getElementById('opVal' + i);
            if (elS) {
                elS.textContent = fmt(sel);
                elS.style.color = sel < 0 ? 'var(--danger)' : '';
                elS.style.fontWeight = sel < 0 ? '700' : '';
            }
            if (elV) elV.textContent = fmt(round2(sel * it.hargaBeli));
            hitungOpname();
        };
        function hitungOpname() {
            var q = 0, n = 0;
            draftOpname.forEach(function (it) {
                var sel = round2(it.fisik - it.sistem);
                q += sel; n += sel * it.hargaBeli;
            });
            set('opQty', fmt(round2(q)));
            set('opNilai', fmt(round2(n)));
            return { qty: round2(q), nilai: round2(n) };
        }

        function saveOpname() {
            var g = val('opGudang');
            if (!g) { toast('Pilih gudang', 'err'); return; }
            var items = draftOpname.map(function (it) {
                return {
                    kode: it.kode, nama: it.nama, satuan: it.satuan,
                    sistem: round2(it.sistem), fisik: round2(it.fisik),
                    selisih: round2(it.fisik - it.sistem),
                    hargaBeli: it.hargaBeli,
                    nilai: round2((it.fisik - it.sistem) * it.hargaBeli)
                };
            });
            if (!items.length) { toast('Tidak ada barang untuk disimpan', 'err'); return; }
            var beda = items.filter(function (it) { return it.selisih !== 0; });
            var tot = hitungOpname();
            if (!beda.length) {
                if (!confirm('Tidak ada selisih sama sekali. Tetap simpan sebagai bukti opname?')) return;
            } else {
                if (!confirm('Ada ' + beda.length + ' item berselisih senilai ' + money(tot.nilai) +
                    '.\n\nStok sistem akan disesuaikan mengikuti hitungan fisik. Lanjutkan?')) return;
            }

            var rec = {
                id: uid(), no: nextNo('OPN'), tanggal: val('opTgl') || todayStr(), gudang: g,
                items: items, selisihQty: tot.qty, nilaiSelisih: tot.nilai,
                catatan: val('opCatatan').trim(), status: 'Final'
            };

            // Sesuaikan stok mengikuti hitungan fisik
            items.forEach(function (it) {
                if (!it.selisih) return;
                var b = findBarang(it.kode);
                if (b) mutasiStok(b, g, it.selisih);
            });

            DB.opname.push(rec);
            auditLog('Stok Opname', rec.no + ' di ' + namaGudang(g) + ' — ' + beda.length + ' item selisih senilai ' + fmt(tot.nilai));
            closeModal(); renderOpname();
            toast('Opname ' + rec.no + ' tersimpan, stok disesuaikan', 'ok');
            persist();
        }

        function detailOpname(id) {
            var o = arr(DB.opname).find(function (x) { return String(x.id) === String(id); });
            if (!o) return;
            var h = '<div class="modal-head"><h3>Stok Opname ' + esc(o.no) + '</h3><button class="x" onclick="closeModal()">&times;</button></div>' +
                '<div class="modal-body"><div class="grid3">' +
                '<div class="field"><label>Tanggal</label><div>' + fmtDate(o.tanggal) + '</div></div>' +
                '<div class="field"><label>Gudang</label><div><b>' + esc(namaGudang(o.gudang)) + '</b></div></div>' +
                '<div class="field"><label>Nilai Selisih</label><div><b>' + money(o.nilaiSelisih) + '</b></div></div></div>' +
                '<table class="grid"><thead><tr><th>Kode</th><th>Nama</th><th class="num">Sistem</th>' +
                '<th class="num">Fisik</th><th class="num">Selisih</th><th class="num">Nilai</th></tr></thead><tbody>';
            arr(o.items).forEach(function (it) {
                if (!it.selisih) return;
                h += '<tr><td>' + esc(it.kode) + '</td><td>' + esc(it.nama) + '</td>' +
                    '<td class="num">' + fmt(it.sistem) + '</td><td class="num">' + fmt(it.fisik) + '</td>' +
                    '<td class="num" style="' + (it.selisih < 0 ? 'color:var(--danger)' : '') + '">' + fmt(it.selisih) + '</td>' +
                    '<td class="num">' + fmt(it.nilai) + '</td></tr>';
            });
            h += '</tbody></table>' + (o.catatan ? '<div class="hint" style="margin-top:8px">Catatan: ' + esc(o.catatan) + '</div>' : '') +
                '</div><div class="modal-foot"><button class="btn btn-ghost" onclick="closeModal()">Tutup</button></div>';
            openModal(h);
        }

        function printOpname(id) {
            var o = arr(DB.opname).find(function (x) { return String(x.id) === String(id); });
            if (!o) return;
            var rows = arr(o.items).map(function (it, i) {
                return '<tr><td>' + (i + 1) + '</td><td>' + esc(it.kode) + '</td><td>' + esc(it.nama) + '</td>' +
                    '<td>' + esc(it.satuan || '') + '</td><td class="num">' + fmt(it.sistem) + '</td>' +
                    '<td class="num">' + fmt(it.fisik) + '</td><td class="num">' + fmt(it.selisih) + '</td>' +
                    '<td class="num">' + fmt(it.nilai) + '</td></tr>';
            }).join('');
            var html = docHeader('BERITA ACARA STOK OPNAME', namaGudang(o.gudang), 'No. Opname', o.no, o.tanggal) +
                '<table class="doc-tbl"><thead><tr><th>No</th><th>Kode</th><th>Nama Barang</th><th>Satuan</th>' +
                '<th class="num">Sistem</th><th class="num">Fisik</th><th class="num">Selisih</th><th class="num">Nilai</th></tr></thead><tbody>' +
                rows + '</tbody></table>' +
                '<div class="doc-tot"><div class="r g"><span>Nilai Selisih</span><span>' + money(o.nilaiSelisih) + '</span></div></div>' +
                (o.catatan ? '<div class="doc-note"><b>Catatan:</b> ' + esc(o.catatan) + '</div>' : '') +
                signBlock('Petugas Hitung,', 'Mengetahui,') + docFoot();
            doPrint(html);
        }

        /* =====================================================================
           LAPORAN: ARUS KAS
           ===================================================================== */
        var KAT_ARUS = {
            'Penjualan': 'Operasi', 'Pembelian': 'Operasi', 'Operasional': 'Operasi',
            'Pelunasan Piutang': 'Operasi', 'Pembayaran Utang': 'Operasi',
            'Retur Penjualan': 'Operasi', 'Retur Pembelian': 'Operasi',
            'Modal': 'Pendanaan', 'Pinjaman': 'Pendanaan',
            'Aset Tetap': 'Investasi', 'Investasi': 'Investasi'
        };
        function golonganArus(k) { return KAT_ARUS[String(k)] || 'Operasi'; }

        function renderArusKas() {
            var d = new Date();
            var bln = window.arusBulan !== undefined ? window.arusBulan : (d.getMonth() + 1);
            var thn = window.arusTahun || d.getFullYear();

            var dalamPeriode = function (t) {
                var s = String(t || '');
                if (!s) return false;
                if (bln === 0) return s.substring(0, 4) === String(thn);
                return s.substring(0, 7) === thn + '-' + String(bln).padStart(2, '0');
            };

            var gol = { Operasi: { in: 0, out: 0, rinci: {} }, Investasi: { in: 0, out: 0, rinci: {} }, Pendanaan: { in: 0, out: 0, rinci: {} } };
            var saldoAwal = 0;
            arr(DB.kasbank).forEach(function (k) {
                var jml = Number(k.jumlah) || 0;
                var masuk = k.arah === 'Masuk';
                if (!dalamPeriode(k.tanggal)) {
                    var s = String(k.tanggal || '');
                    var batas = bln === 0 ? String(thn) + '-01' : thn + '-' + String(bln).padStart(2, '0');
                    if (s.substring(0, 7) < batas) saldoAwal += masuk ? jml : -jml;
                    return;
                }
                var g = golonganArus(k.kategori);
                if (masuk) gol[g].in += jml; else gol[g].out += jml;
                var nm = String(k.kategori || 'Lainnya');
                if (!gol[g].rinci[nm]) gol[g].rinci[nm] = { in: 0, out: 0 };
                if (masuk) gol[g].rinci[nm].in += jml; else gol[g].rinci[nm].out += jml;
            });

            var bersih = {}, totalBersih = 0;
            ['Operasi', 'Investasi', 'Pendanaan'].forEach(function (g) {
                bersih[g] = round2(gol[g].in - gol[g].out);
                totalBersih += bersih[g];
            });
            totalBersih = round2(totalBersih);
            saldoAwal = round2(saldoAwal);

            var namaBln = ['Sepanjang Tahun', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

            var html = '<div class="page-head"><div><h2>Laporan Arus Kas</h2>' +
                '<div class="sub">Metode langsung &middot; ' + namaBln[bln] + ' ' + thn + '</div></div>' +
                '<div style="display:flex;gap:8px">' +
                '<select onchange="setArusBulan(this.value)" style="padding:8px 12px;border:1px solid var(--line);border-radius:8px">' +
                namaBln.map(function (n, i) { return '<option value="' + i + '"' + (i === bln ? ' selected' : '') + '>' + n + '</option>'; }).join('') +
                '</select>' +
                '<select onchange="setArusTahun(this.value)" style="padding:8px 12px;border:1px solid var(--line);border-radius:8px">' +
                [thn - 2, thn - 1, thn, thn + 1].map(function (y) { return '<option value="' + y + '"' + (y === thn ? ' selected' : '') + '>' + y + '</option>'; }).join('') +
                '</select>' +
                '<button class="btn btn-ghost" onclick="printArusKas()">🖨️ Cetak</button></div></div>';

            html += '<div class="cards">' +
                card('Saldo Awal', '🏦', money(saldoAwal)) +
                card('Arus Kas Bersih', totalBersih >= 0 ? '📈' : '📉', money(totalBersih)) +
                card('Saldo Akhir', '💰', money(round2(saldoAwal + totalBersih))) +
                '</div>';

            html += '<div class="panel"><div class="panel-head"><h3>Rincian Arus Kas</h3></div><div class="panel-body">' +
                '<table class="grid"><thead><tr><th>Keterangan</th><th class="num">Masuk</th><th class="num">Keluar</th><th class="num">Bersih</th></tr></thead><tbody>';
            ['Operasi', 'Investasi', 'Pendanaan'].forEach(function (g) {
                html += '<tr style="background:#f8fafc"><td><b>Aktivitas ' + g + '</b></td>' +
                    '<td class="num"><b>' + fmt(gol[g].in) + '</b></td>' +
                    '<td class="num"><b>' + fmt(gol[g].out) + '</b></td>' +
                    '<td class="num"><b style="' + (bersih[g] < 0 ? 'color:var(--danger)' : '') + '">' + fmt(bersih[g]) + '</b></td></tr>';
                Object.keys(gol[g].rinci).sort().forEach(function (nm) {
                    var r = gol[g].rinci[nm];
                    html += '<tr><td style="padding-left:26px">' + esc(nm) + '</td>' +
                        '<td class="num">' + fmt(r.in) + '</td><td class="num">' + fmt(r.out) + '</td>' +
                        '<td class="num">' + fmt(round2(r.in - r.out)) + '</td></tr>';
                });
            });
            html += '</tbody><tfoot><tr><th>KENAIKAN / PENURUNAN KAS BERSIH</th><th></th><th></th>' +
                '<th class="num">' + fmt(totalBersih) + '</th></tr>' +
                '<tr><th>Saldo Kas Awal Periode</th><th></th><th></th><th class="num">' + fmt(saldoAwal) + '</th></tr>' +
                '<tr><th>SALDO KAS AKHIR PERIODE</th><th></th><th></th><th class="num">' + fmt(round2(saldoAwal + totalBersih)) + '</th></tr>' +
                '</tfoot></table></div></div>';

            document.getElementById('main').innerHTML = html;
        }
        window.setArusBulan = function (v) { window.arusBulan = parseInt(v, 10); renderArusKas(); };
        window.setArusTahun = function (v) { window.arusTahun = parseInt(v, 10); renderArusKas(); };
        function printArusKas() {
            var el = document.getElementById('main').querySelector('.panel .panel-body');
            if (!el) return;
            var html = docHeader('LAPORAN ARUS KAS', '', 'Per Tanggal', fmtDate(todayStr()), todayStr()) +
                el.innerHTML.replace(/class="grid"/g, 'class="doc-tbl"') + docFoot();
            doPrint(html);
        }

        /* =====================================================================
           LAPORAN: ANALISIS PENJUALAN
           ===================================================================== */
        function renderAnalisis() {
            var dim = window.analisisDim || 'pelanggan';
            var d = new Date();
            var thn = window.analisisTahun || d.getFullYear();
            var bln = window.analisisBulan !== undefined ? window.analisisBulan : 0;

            var dalam = function (t) {
                var s = String(t || '');
                if (bln === 0) return s.substring(0, 4) === String(thn);
                return s.substring(0, 7) === thn + '-' + String(bln).padStart(2, '0');
            };
            var trx = arr(DB.penjualan).filter(function (x) { return x.status === 'Final' && dalam(x.tanggal); });

            var agg = {};
            var tambah = function (kunci, nilai, qty) {
                if (!kunci) kunci = '(tidak diisi)';
                if (!agg[kunci]) agg[kunci] = { nilai: 0, qty: 0, dok: 0 };
                agg[kunci].nilai = round2(agg[kunci].nilai + nilai);
                agg[kunci].qty = round2(agg[kunci].qty + (qty || 0));
            };
            if (dim === 'barang') {
                trx.forEach(function (x) {
                    arr(x.items).forEach(function (it) { tambah(it.kode + ' — ' + it.nama, Number(it.subtotal) || 0, Number(it.qty) || 0); });
                });
            } else if (dim === 'sales') {
                trx.forEach(function (x) { tambah(String(x.sales || '').trim(), Number(x.total) || 0, 1); if (agg[String(x.sales || '').trim() || '(tidak diisi)']) agg[String(x.sales || '').trim() || '(tidak diisi)'].dok++; });
            } else if (dim === 'bulan') {
                trx.forEach(function (x) { tambah(String(x.tanggal || '').substring(0, 7), Number(x.total) || 0, 1); });
            } else {
                trx.forEach(function (x) { tambah(namaMitra(x), Number(x.total) || 0, 1); });
            }

            var kunci = Object.keys(agg).sort(function (a, b) {
                return dim === 'bulan' ? a.localeCompare(b) : agg[b].nilai - agg[a].nilai;
            });
            var total = 0; kunci.forEach(function (k) { total += agg[k].nilai; });
            total = round2(total);

            var namaBln = ['Sepanjang Tahun', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
            var judulDim = { pelanggan: 'Pelanggan', barang: 'Barang / Jasa', sales: 'Sales', bulan: 'Bulan' };

            var html = '<div class="page-head"><div><h2>Analisis Penjualan</h2>' +
                '<div class="sub">Per ' + judulDim[dim] + ' &middot; ' + namaBln[bln] + ' ' + thn + ' &middot; ' + trx.length + ' dokumen</div></div>' +
                '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
                '<select onchange="setAnalisisDim(this.value)" style="padding:8px 12px;border:1px solid var(--line);border-radius:8px">' +
                Object.keys(judulDim).map(function (k) {
                    return '<option value="' + k + '"' + (k === dim ? ' selected' : '') + '>Per ' + judulDim[k] + '</option>';
                }).join('') + '</select>' +
                '<select onchange="setAnalisisBulan(this.value)" style="padding:8px 12px;border:1px solid var(--line);border-radius:8px">' +
                namaBln.map(function (n, i) { return '<option value="' + i + '"' + (i === bln ? ' selected' : '') + '>' + n + '</option>'; }).join('') +
                '</select>' +
                '<select onchange="setAnalisisTahun(this.value)" style="padding:8px 12px;border:1px solid var(--line);border-radius:8px">' +
                [thn - 2, thn - 1, thn, thn + 1].map(function (y) { return '<option value="' + y + '"' + (y === thn ? ' selected' : '') + '>' + y + '</option>'; }).join('') +
                '</select></div></div>';

            var rata = trx.length ? round2(total / trx.length) : 0;
            html += '<div class="cards">' +
                brandCard('Total Penjualan', '💰', money(total)) +
                card('Jumlah Dokumen', '🧾', String(trx.length)) +
                card('Rata-rata per Dokumen', '📊', money(rata)) +
                card('Jumlah ' + judulDim[dim], '🏷️', String(kunci.length)) +
                '</div>';

            html += '<div class="panel"><div class="panel-head"><h3>Peringkat per ' + judulDim[dim] + '</h3>' +
                '<button class="btn btn-ghost btn-sm" onclick="printAnalisis()">🖨️ Cetak</button></div><div class="panel-body">';
            if (!kunci.length) html += '<div class="empty">Tidak ada penjualan pada periode ini.</div>';
            else {
                html += '<table class="grid"><thead><tr><th style="width:40px">#</th><th>' + judulDim[dim] + '</th>' +
                    (dim === 'barang' ? '<th class="num">Qty</th>' : '<th class="num">Dokumen</th>') +
                    '<th class="num">Nilai</th><th class="num">Porsi</th><th style="width:180px">Grafik</th></tr></thead><tbody>';
                var maks = agg[kunci[0]] ? agg[kunci[0]].nilai : 1;
                if (dim === 'bulan') { maks = 0; kunci.forEach(function (k) { if (agg[k].nilai > maks) maks = agg[k].nilai; }); }
                kunci.forEach(function (k, i) {
                    var a = agg[k];
                    var porsi = total ? (a.nilai / total * 100) : 0;
                    var lebar = maks ? Math.max(2, (a.nilai / maks * 100)) : 0;
                    html += '<tr><td>' + (i + 1) + '</td><td>' + esc(k) + '</td>' +
                        '<td class="num">' + fmt(a.qty) + '</td>' +
                        '<td class="num"><b>' + fmt(a.nilai) + '</b></td>' +
                        '<td class="num">' + porsi.toFixed(1) + '%</td>' +
                        '<td><div style="background:#eef2ff;border-radius:5px;height:14px;overflow:hidden">' +
                        '<div style="width:' + lebar + '%;height:100%;background:linear-gradient(90deg,#2563eb,#1e40af)"></div></div></td></tr>';
                });
                html += '</tbody><tfoot><tr><th colspan="3" style="text-align:right">TOTAL</th>' +
                    '<th class="num">' + fmt(total) + '</th><th class="num">100%</th><th></th></tr></tfoot></table>';
            }
            html += '</div></div>';
            document.getElementById('main').innerHTML = html;
        }
        window.setAnalisisDim = function (v) { window.analisisDim = v; renderAnalisis(); };
        window.setAnalisisBulan = function (v) { window.analisisBulan = parseInt(v, 10); renderAnalisis(); };
        window.setAnalisisTahun = function (v) { window.analisisTahun = parseInt(v, 10); renderAnalisis(); };
        function printAnalisis() {
            var el = document.getElementById('main').querySelector('.panel .panel-body');
            if (!el) return;
            var html = docHeader('ANALISIS PENJUALAN', '', 'Per Tanggal', fmtDate(todayStr()), todayStr()) +
                el.innerHTML.replace(/class="grid"/g, 'class="doc-tbl"') + docFoot();
            doPrint(html);
        }

        /* PENJUALAN */
        function renderPenjualan(f) {
            var wasSearching = document.activeElement && document.activeElement.classList.contains('search');
            f = f || '';
            var list = DB.penjualan.filter(function (x) { return !f || ((x.no + ' ' + x.pelanggan).toLowerCase().indexOf(f.toLowerCase()) >= 0); })
                .sort(function (a, b) { return (b.tanggal || '').localeCompare(a.tanggal || '') || b.no.localeCompare(a.no); });
            var html = '<div class="page-head"><div><h2>Penjualan</h2><div class="sub">Transaksi penjualan &middot; otomatis mengurangi stok &amp; menambah kas/bank</div></div>' +
                '<button class="btn btn-primary" onclick="formTrx(\'jual\')">＋ Penjualan Baru</button></div>';
            html += '<div class="panel"><div class="panel-head">' +
                '<input class="search" placeholder="Cari no / pelanggan..." value="' + esc(f) + '" oninput="renderPenjualan(this.value)"></div><div class="panel-body">';
            if (list.length === 0) { html += '<div class="empty">Belum ada penjualan.</div>'; }
            else {
                html += '<table class="grid"><thead><tr><th>No</th><th>Tanggal</th><th>Pelanggan</th><th>Gudang</th><th class="ctr">Item</th>' +
                    '<th class="num">Total</th><th class="ctr">Bayar</th><th class="ctr">Status</th><th></th></tr></thead><tbody>';
                list.forEach(function (x) {
                    var statBadge = (x.status === 'Draft') ? '<span class="tag kas">Draft</span>' : '<span class="tag in">Final</span>';
                    var actBtn = '';
                    if (x.status === 'Draft') {
                        actBtn += '<button class="btn btn-primary btn-sm" onclick="submitTrx(\'jual\',\'' + x.id + '\')">🚀 Submit</button>';
                        actBtn += '<button class="btn btn-ghost btn-sm" onclick="printProforma(\'' + x.id + '\')">🖨️ Proforma</button>';
                    } else {
                        actBtn += '<button class="btn btn-ghost btn-sm" onclick="printTrx(\'jual\',\'' + x.id + '\')">🖨️ Invoice</button>';
                    }
                    html += '<tr><td><b>' + esc(x.no) + '</b></td><td>' + fmtDate(x.tanggal) + '</td><td>' + esc(x.pelanggan) + '</td>' +
                        '<td><span class="pill">' + esc(namaGudang(x.gudang || gudangDefault())) + '</span></td>' +
                        '<td class="ctr">' + x.items.length + '</td><td class="num">' + money(x.total) + '</td>' +
                        '<td class="ctr"><span class="tag ' + (x.akun === 'Kas' ? 'kas' : 'bank') + '">' + esc(x.akun) + '</span></td>' +
                        '<td class="ctr">' + statBadge + '</td>' +
                        '<td class="row-actions">' + actBtn +
                        '<button class="btn btn-ghost btn-sm" onclick="formTrx(\'jual\',\'' + x.id + '\')">Edit</button>' +
                        '<button class="btn btn-danger btn-sm" onclick="delTrx(\'jual\',\'' + x.id + '\')">Hapus</button></td></tr>';
                });
                html += '</tbody></table>';
            }
            html += '</div></div>';
            document.getElementById('main').innerHTML = html;
            if (wasSearching) {
                var searchInp = document.getElementById('main').querySelector('.search');
                if (searchInp) { searchInp.focus(); var len = searchInp.value.length; searchInp.setSelectionRange(len, len); }
            }
        }

        /* PEMBELIAN */
        function renderPembelian(f) {
            var wasSearching = document.activeElement && document.activeElement.classList.contains('search');
            f = f || '';
            var list = DB.pembelian.filter(function (x) { return !f || ((x.no + ' ' + x.pelanggan).toLowerCase().indexOf(f.toLowerCase()) >= 0); })
                .sort(function (a, b) { return (b.tanggal || '').localeCompare(a.tanggal || '') || b.no.localeCompare(a.no); });
            var html = '<div class="page-head"><div><h2>Pembelian</h2><div class="sub">Transaksi pembelian &middot; otomatis menambah stok &amp; mengurangi kas/bank</div></div>' +
                '<button class="btn btn-primary" onclick="formTrx(\'beli\')">＋ Pembelian Baru</button></div>';
            html += '<div class="panel"><div class="panel-head">' +
                '<input class="search" placeholder="Cari no / supplier..." value="' + esc(f) + '" oninput="renderPembelian(this.value)"></div><div class="panel-body">';
            if (list.length === 0) { html += '<div class="empty">Belum ada pembelian.</div>'; }
            else {
                html += '<table class="grid"><thead><tr><th>No</th><th>Tanggal</th><th>Supplier</th><th>Gudang</th><th class="ctr">Mata Uang</th><th class="ctr">Item</th>' +
                    '<th class="num">Total</th><th class="ctr">Bayar</th><th class="ctr">Status</th><th></th></tr></thead><tbody>';
                list.forEach(function (x) {
                    var statBadge = (x.status === 'Draft') ? '<span class="tag kas">Draft</span>' : '<span class="tag in">Final</span>';
                    var actBtn = '';
                    if (x.status === 'Draft') {
                        actBtn += '<button class="btn btn-primary btn-sm" onclick="submitTrx(\'beli\',\'' + x.id + '\')">🚀 Submit</button>';
                    } else {
                        actBtn += '<button class="btn btn-ghost btn-sm" onclick="printTrx(\'beli\',\'' + x.id + '\')">🖨️ Cetak</button>';
                    }
                    html += '<tr><td><b>' + esc(x.no) + '</b></td><td>' + fmtDate(x.tanggal) + '</td><td>' + esc(x.pelanggan) + '</td>' +
                        '<td><span class="pill">' + esc(namaGudang(x.gudang || gudangDefault())) + '</span></td>' +
                        '<td class="ctr">' + (mataUangTrx(x) === 'CNY'
                            ? '<span class="pill" style="background:#fff7ed;color:#c2410c">CNY @ ' + fmt4(x.kursCNY || 1) + '</span>'
                            : '<span class="pill">IDR</span>') + '</td>' +
                        '<td class="ctr">' + x.items.length + '</td><td class="num">' + money(x.total) + '</td>' +
                        '<td class="ctr"><span class="tag ' + (x.akun === 'Kas' ? 'kas' : 'bank') + '">' + esc(x.akun) + '</span></td>' +
                        '<td class="ctr">' + statBadge + '</td>' +
                        '<td class="row-actions">' + actBtn +
                        '<button class="btn btn-ghost btn-sm" onclick="formTrx(\'beli\',\'' + x.id + '\')">Edit</button>' +
                        '<button class="btn btn-danger btn-sm" onclick="delTrx(\'beli\',\'' + x.id + '\')">Hapus</button></td></tr>';
                });
                html += '</tbody></table>';
            }
            html += '</div></div>';
            document.getElementById('main').innerHTML = html;
            if (wasSearching) {
                var searchInp = document.getElementById('main').querySelector('.search');
                if (searchInp) { searchInp.focus(); var len = searchInp.value.length; searchInp.setSelectionRange(len, len); }
            }
        }

        var draftItems = [];
        function updateKurs() {
            var kurs = parseNum(val('tKurs')) || 1;
            draftItems.forEach(function (it, i) {
                if (it.hargaCNY) {
                    it.harga = round2(it.hargaCNY * kurs);
                    var hargaInput = document.getElementById('harga' + i);
                    if (hargaInput) hargaInput.value = fmt(it.harga);
                    var cell = document.getElementById('sub' + i);
                    if (cell) cell.textContent = fmt(round2(it.qty * it.harga));
                }
            });
            calcTrx('beli');
        }
        function formTrx(mode, editId) {
            var isJual = mode === 'jual';
            var x = null;
            if (editId) {
                var daftarTrx = isJual ? DB.penjualan : DB.pembelian;
                x = daftarTrx.find(function (r) { return r.id === editId; });
            }

            if (x) {
                draftItems = JSON.parse(JSON.stringify(x.items));
                if (!draftItems.length) draftItems = [{ kode: '', nama: '', qty: 1, harga: 0, hargaCNY: 0 }];
            } else {
                draftItems = [{ kode: '', nama: '', qty: 1, harga: 0, hargaCNY: 0 }];
            }

            var tgl = x ? x.tanggal : todayStr();
            var pihak = x ? x.pelanggan : '';
            var akun = x ? x.akun : 'Kas';
            var cara = x ? caraBayarTrx(x) : 'Tunai';
            var kurs = x && !isJual ? (x.kursCNY || 1) : 1;
            var disc = x ? (x.diskon || 0) : 0;
            var biaya = x && !isJual ? (x.biayaLain || 0) : 0;
            var note = x ? (x.catatan || '') : '';

            migrasiGudang();
            var gudSel = x ? (x.gudang || gudangDefault()) : gudangDefault();
            var gudHtml = '<div class="grid3">' +
                selGudangField(isJual ? 'Ambil Stok Dari Gudang' : 'Simpan Stok Ke Gudang', 'tGudang', gudSel, 'renderItems(\'' + mode + '\')') +
                '<div></div><div></div></div>';
            // Mata uang pembelian: IDR (harga langsung Rupiah) atau CNY (harga Yuan x kurs)
            var mu = x ? mataUangTrx(x) : 'CNY';
            var kursHtml = isJual ? '' : '<div class="grid3">' +
                '<div class="field"><label>Mata Uang Pembelian</label>' +
                '<select id="tMataUang" onchange="onMataUangChange()">' +
                '<option value="IDR"' + (mu === 'IDR' ? ' selected' : '') + '>🇮🇩 Rupiah (tanpa kurs)</option>' +
                '<option value="CNY"' + (mu === 'CNY' ? ' selected' : '') + '>🇨🇳 CNY / Yuan (pakai kurs)</option>' +
                '</select></div>' +
                '<div id="blokKurs">' + fldNum4('Nilai Kurs CNY To Rupiah', 'tKurs', kurs) + '</div>' +
                '<div></div></div>';
            openModal(
                '<div class="modal-head"><h3>' + (isJual ? 'Penjualan' : 'Pembelian') + (editId ? ' (Edit)' : ' Baru') + '</h3><button class="x" onclick="closeModal()">&times;</button></div>' +
                '<div class="modal-body">' +
                '<input type="hidden" id="tEditId" value="' + (editId || '') + '">' +
                '<input type="hidden" id="tOldNo" value="' + (x ? x.no : '') + '">' +
                '<div class="grid3">' +
                '<div class="field"><label>' + (isJual ? 'Pelanggan' : 'Supplier') + '</label>' +
                '<select id="tMitra" onchange="pilihMitra(\'' + mode + '\')">' + opsiMitra(isJual ? 'Pelanggan' : 'Supplier', x ? x.mitraId : '') + '</select></div>' +
                (isJual ? fldArea('Nama / Alamat Tertera di Dokumen', 'tPihak', pihak) : fld('Nama Tertera di Dokumen', 'tPihak', pihak)) +
                fld('Tanggal', 'tTgl', tgl, 'date') + '</div>' +
                '<div class="grid3">' +
                '<div class="field"><label>Cara Bayar</label><select id="tCara" onchange="onCaraBayarChange()">' +
                '<option value="Tunai"' + (cara === 'Tunai' ? ' selected' : '') + '>💵 Tunai / Lunas</option>' +
                '<option value="Kredit"' + (cara === 'Kredit' ? ' selected' : '') + '>🧾 Kredit (' + (isJual ? 'piutang' : 'utang') + ')</option>' +
                '</select></div>' +
                '<div id="blokAkun">' + selField('Masuk / Keluar Lewat', 'tAkun', ['Kas', 'Bank'], akun) + '</div>' +
                '<div id="blokTermin"><div class="field"><label>Termin (hari)</label>' +
                '<input id="tTermin" type="number" min="0" max="365" value="' + (Number(x && x.termin) || 30) + '" oninput="hitungJatuhTempo()">' +
                '<div class="hint" id="infoJatuhTempo" style="margin-top:4px"></div></div></div>' +
                '</div>' +
                (isJual ? '<div class="grid3">' + fld('Nama Sales', 'tSales', x ? (x.sales || '') : '') + '<div></div><div></div></div>' : '') +
                gudHtml +
                kursHtml +
                '<div id="itemsWrap"></div>' +
                '<button class="btn btn-ghost btn-sm" style="margin-top:8px" onclick="addItem(\'' + mode + '\')">＋ Tambah Baris</button>' +
                '<div style="display:flex;gap:20px;flex-wrap:wrap;margin-top:14px">' +
                '<div style="flex:1;min-width:220px">' + fldArea('Catatan', 'tNote', note) + '</div>' +
                '<div class="totbox">' +
                '<div class="totrow"><span>Subtotal</span><span id="tSub">0.00</span></div>' +
                '<div class="totrow"><span>Diskon</span><input class="num moneyIn" id="tDisc" value="' + fmt(disc) + '" style="width:130px;padding:4px 8px;border:1px solid var(--line);border-radius:6px;text-align:right" oninput="calcTrx(\'' + mode + '\')"></div>' +
                (isJual ? '' : '<div class="totrow"><span>Biaya Lain-lain</span><input class="num moneyIn" id="tBiayaLain" value="' + fmt(biaya) + '" style="width:130px;padding:4px 8px;border:1px solid var(--line);border-radius:6px;text-align:right" oninput="calcTrx(\'' + mode + '\')"></div>') +
                '<div class="totrow grand"><span>TOTAL</span><span id="tGrand">0.00</span></div>' +
                '</div>' +
                '</div>' +
                '</div>' +
                '<div class="modal-foot"><button class="btn btn-ghost" onclick="closeModal()">Batal</button>' +
                '<button class="btn btn-ghost" style="border-color:var(--warn);color:var(--warn)" onclick="saveTrx(\'' + mode + '\', true)">Simpan Draft</button>' +
                '<button class="btn btn-primary" onclick="saveTrx(\'' + mode + '\', false)">Simpan Final</button></div>'
            );
            if (!isJual) {
                document.getElementById('tKurs').addEventListener('input', updateKurs);
                onMataUangChange();
            }
            onCaraBayarChange();
            renderItems(mode); calcTrx(mode);
            attachNumInputs();
        }

        /* Pilih mitra -> isi nama & termin otomatis */
        window.pilihMitra = function (mode) {
            var m = findMitra(val('tMitra'));
            if (!m) return;
            var inp = document.getElementById('tPihak');
            if (inp && !inp.value.trim()) {
                inp.value = m.alamat ? (m.nama + '\n' + m.alamat) : m.nama;
            } else if (inp) {
                inp.value = m.alamat ? (m.nama + '\n' + m.alamat) : m.nama;
            }
            var t = document.getElementById('tTermin');
            if (t && Number(m.termin) > 0) t.value = Number(m.termin);
            if (m.termin !== undefined && Number(m.termin) > 0) {
                var c = document.getElementById('tCara');
                if (c) { c.value = 'Kredit'; onCaraBayarChange(); }
            }
            hitungJatuhTempo();
        };

        window.onCaraBayarChange = function () {
            var el = document.getElementById('tCara');
            if (!el) return;
            var kredit = el.value === 'Kredit';
            var ba = document.getElementById('blokAkun'), bt = document.getElementById('blokTermin');
            if (ba) ba.style.display = kredit ? 'none' : '';
            if (bt) bt.style.display = kredit ? '' : 'none';
            hitungJatuhTempo();
        };

        window.hitungJatuhTempo = function () {
            var info = document.getElementById('infoJatuhTempo');
            if (!info) return;
            var jt = jatuhTempoTrx({ tanggal: val('tTgl'), termin: parseInt(val('tTermin'), 10) || 0 });
            info.textContent = jt ? 'Jatuh tempo: ' + fmtDate(jt) : '';
        };

        /* ===== MATA UANG PEMBELIAN =====
           'IDR' -> harga diketik langsung dalam Rupiah, kolom kurs & Harga CNY disembunyikan.
           'CNY' -> harga diketik dalam Yuan, Harga IDR dihitung otomatis dari kurs. */
        function mataUangTrx(x) {
            if (!x) return 'CNY';
            var m = String(x.mataUang || '').toUpperCase();
            if (m === 'IDR' || m === 'CNY') return m;
            // Data lama tanpa penanda: dianggap CNY hanya bila memang ada harga Yuan
            var adaCNY = arr(x.items).some(function (it) { return it && Number(it.hargaCNY) > 0; });
            return adaCNY ? 'CNY' : 'IDR';
        }
        function mataUangAktif() {
            var el = document.getElementById('tMataUang');
            return el ? el.value : 'CNY';
        }
        function onMataUangChange() {
            var idr = mataUangAktif() === 'IDR';
            var bk = document.getElementById('blokKurs');
            if (bk) bk.style.display = idr ? 'none' : '';
            if (idr) {
                var k = document.getElementById('tKurs');
                if (k) k.value = fmt4(1);            // kurs 1 supaya perhitungan tetap konsisten
                draftItems.forEach(function (it) { it.hargaCNY = 0; });
            }
            renderItems('beli'); calcTrx('beli');
        }
        function renderItems(mode) {
            var isJual = mode === 'jual';
            var gud = val('tGudang') || gudangDefault();
            var opts = '<option value="">— pilih barang / jasa —</option>' + DB.barang.map(function (b) {
                var label;
                if (isJasa(b)) label = ' 🛠️ jasa';
                else label = isJual
                    ? ' (stok di gudang ini ' + fmt(stokGudang(b, gud)) + ')'
                    : ' (stok total ' + fmt(b.stok) + ')';
                return '<option value="' + esc(b.kode) + '">' + esc(b.kode) + ' — ' + esc(b.nama) + label + '</option>';
            }).join('');
            // Pembelian Rupiah: kolom Harga CNY disembunyikan & Harga IDR bisa diketik
            var pakaiCNY = !isJual && mataUangAktif() === 'CNY';
            var h = '<table class="items"><thead><tr><th style="width:36%">Barang / Jasa</th><th style="width:10%">Qty</th>' +
                (pakaiCNY ? '<th style="width:17%">Harga CNY</th>' : '') +
                '<th style="width:17%">Harga ' + (isJual ? 'IDR' : (pakaiCNY ? 'IDR (otomatis)' : 'IDR')) + '</th>' +
                '<th style="width:15%">Subtotal</th><th></th></tr></thead><tbody>';
            draftItems.forEach(function (it, i) {
                var sel = opts.replace('value="' + esc(it.kode) + '"', 'value="' + esc(it.kode) + '" selected');
                // Tampilkan ke akun mana baris ini akan dijurnal
                var mb = findBarang(it.kode);
                var infoAkun = '';
                if (isJual && mb) {
                    var ak = akunPendapatan(mb);
                    infoAkun = '<div style="font-size:11px;margin-top:3px;color:' + (isJasa(mb) ? '#4338ca' : 'var(--muted)') + '">' +
                        (isJasa(mb) ? '🛠️ Jasa' : '📦 Barang') + ' → jurnal ke ' + esc(ak) + ' ' + esc(namaAkun(ak)) + '</div>';
                } else if (isJual && it.kode && !mb) {
                    infoAkun = '<div style="font-size:11px;margin-top:3px;color:var(--danger)">⚠️ Kode tidak ada di master — akan masuk 4101</div>';
                }
                h += '<tr>' +
                    '<td><select onchange="pickItem(' + i + ',this.value,\'' + mode + '\')">' + sel + '</select>' + infoAkun + '</td>' +
                    '<td><input class="num moneyIn" value="' + it.qty + '" oninput="updItem(' + i + ',\'qty\',this.value,\'' + mode + '\')"></td>' +
                    (pakaiCNY ? '<td><input class="num moneyIn4" value="' + fmt4(it.hargaCNY) + '" oninput="updItem(' + i + ',\'hargaCNY\',this.value,\'' + mode + '\')"></td>' : '') +
                    '<td><input class="num moneyIn" id="harga' + i + '" value="' + fmt(it.harga) + '" oninput="updItem(' + i + ',\'harga\',this.value,\'' + mode + '\')" ' + (pakaiCNY ? 'readonly' : '') + '></td>' +
                    '<td style="text-align:right;font-variant-numeric:tabular-nums" id="sub' + i + '">' + fmt(it.qty * it.harga) + '</td>' +
                    '<td><button class="btn btn-danger btn-sm" onclick="rmItem(' + i + ',\'' + mode + '\')">✕</button></td>' +
                    '</tr>';
            });
            h += '</tbody></table>';
            document.getElementById('itemsWrap').innerHTML = h;
            attachNumInputs();
        }
        function pickItem(i, kode, mode) {
            var b = findBarang(kode);
            draftItems[i].kode = kode;
            draftItems[i].nama = b ? b.nama : '';
            if (b) draftItems[i].harga = mode === 'jual' ? Number(b.hargaJual) || 0 : Number(b.hargaBeli) || 0;
            draftItems[i].hargaCNY = 0;
            renderItems(mode); calcTrx(mode);
        }
        function updItem(i, field, v, mode) {
            var it = draftItems[i];
            it[field] = parseNum(v);
            if (field === 'hargaCNY') {
                var kurs = parseNum(val('tKurs')) || 1;
                it.harga = round2(it.hargaCNY * kurs);
                var hargaInput = document.getElementById('harga' + i);
                if (hargaInput) hargaInput.value = fmt(it.harga);
            }
            var cell = document.getElementById('sub' + i);
            if (cell) cell.textContent = fmt(round2(it.qty * it.harga));
            calcTrx(mode);
        }
        function addItem(mode) { draftItems.push({ kode: '', nama: '', qty: 1, harga: 0, hargaCNY: 0 }); renderItems(mode); calcTrx(mode); }
        function rmItem(i, mode) { draftItems.splice(i, 1); if (!draftItems.length) draftItems.push({ kode: '', nama: '', qty: 1, harga: 0, hargaCNY: 0 }); renderItems(mode); calcTrx(mode); }
        function calcTrx(mode) {
            var isJual = mode === 'jual';
            var sub = 0; draftItems.forEach(function (it) { sub += round2((Number(it.qty) || 0) * (Number(it.harga) || 0)); });
            sub = round2(sub);
            var disc = parseNum(val('tDisc'));
            var biayaLain = isJual ? 0 : parseNum(val('tBiayaLain'));
            var dpp = round2(sub - disc); if (dpp < 0) dpp = 0;
            var grand = round2(dpp + biayaLain);
            set('tSub', fmt(sub)); set('tGrand', fmt(grand));
            return { sub: sub, disc: disc, biayaLain: biayaLain, grand: grand };
        }
        function saveTrx(mode, isDraft) {
            auditLog(mode, (isDraft ? "Draft " : "Simpan ") + "transaksi " + mode);
            var isJual = mode === 'jual';
            var pihak = val('tPihak').trim() || (isJual ? 'Umum' : 'Supplier');
            var tgl = val('tTgl') || todayStr();
            var akun = val('tAkun');
            var editId = val('tEditId');
            var oldNo = val('tOldNo');

            var items = draftItems.filter(function (it) { return it.kode && it.qty > 0; })
                .map(function (it) {
                    var ob = { kode: it.kode, nama: it.nama, qty: round2(it.qty), harga: round2(it.harga), subtotal: round2(it.qty * it.harga) };
                    // Rekam jenis & akun pendapatan SAAT transaksi dibuat, supaya jurnal
                    // tetap benar walau master barang diubah/ter-reset di kemudian hari.
                    var mb = findBarang(it.kode);
                    if (mb) {
                        ob.jenis = isJasa(mb) ? 'Jasa' : 'Barang';
                        ob.akunPendapatan = akunPendapatan(mb);
                    }
                    if (!isJual) ob.hargaCNY = Number(it.hargaCNY) || 0;
                    return ob;
                });
            if (items.length === 0) { toast('Tambahkan minimal 1 barang', 'err'); return; }

            var gud = val('tGudang') || gudangDefault();
            if (!gud) { toast('Pilih gudang terlebih dahulu', 'err'); return; }

            if (isJual && !isDraft) {
                for (var i = 0; i < items.length; i++) {
                    var b = findBarang(items[i].kode);
                    if (b && !isJasa(b)) {                 // jasa tidak dicek stok
                        var oldQty = 0;
                        if (editId) {
                            var oldTrx = DB.penjualan.find(function (r) { return r.id === editId; });
                            if (oldTrx && oldTrx.status !== 'Draft' && (oldTrx.gudang || gudangDefault()) === gud) {
                                var oldIt = oldTrx.items.find(function (it) { return it.kode === items[i].kode; });
                                if (oldIt) oldQty = oldIt.qty;
                            }
                        }
                        var available = stokGudang(b, gud) + oldQty;
                        if (available < items[i].qty) {
                            toast('Stok "' + b.nama + '" di ' + namaGudang(gud) + ' tidak cukup (tersedia ' + fmt(available) + ')', 'err'); return;
                        }
                    }
                }
            }

            if (editId) {
                var daftarTrx = isJual ? DB.penjualan : DB.pembelian;
                var oldTrx = daftarTrx.find(function (r) { return r.id === editId; });
                if (oldTrx) {
                    if (oldTrx.status !== 'Draft') {
                        var oldTotalSub = oldTrx.subtotal || 1;
                        var gudLama = oldTrx.gudang || gudangDefault();
                        oldTrx.items.forEach(function (it) {
                            var b = findBarang(it.kode);
                            if (b && !isJasa(b)) {         // jasa tidak punya stok untuk dikembalikan
                                if (!isJual) {
                                    var itemBiaya = (oldTrx.biayaLain || 0) * (it.subtotal / oldTotalSub);
                                    var oldItemCost = it.subtotal + itemBiaya;
                                    var currentQty = Math.max(Number(b.stok), 0);
                                    var currentVal = currentQty * Number(b.hargaBeli || 0);
                                    var newQty = currentQty - it.qty;
                                    if (newQty > 0) {
                                        b.hargaBeli = Math.max(0, round2((currentVal - oldItemCost) / newQty));
                                    }
                                }
                                mutasiStok(b, gudLama, (isJual ? it.qty : -it.qty));
                            }
                        });
                        DB.kasbank = DB.kasbank.filter(function (k) { return k.ref !== oldTrx.no; });
                    }
                    if (isJual) DB.penjualan = DB.penjualan.filter(function (r) { return r.id !== editId; });
                    else DB.pembelian = DB.pembelian.filter(function (r) { return r.id !== editId; });
                }
            }

            var t = calcTrx(mode);
            var rec = {
                id: editId || uid(), no: oldNo || nextNo(isJual ? 'INV' : 'PO'), tanggal: tgl, pelanggan: pihak, akun: akun,
                items: items, subtotal: t.sub, diskon: t.disc, biayaLain: t.biayaLain, total: t.grand, catatan: val('tNote').trim(),
                status: isDraft ? 'Draft' : 'Final', gudang: gud
            };
            // Cara bayar & piutang/utang
            var caraBayar = val('tCara') === 'Kredit' ? 'Kredit' : 'Tunai';
            rec.caraBayar = caraBayar;
            rec.mitraId = val('tMitra') || '';
            if (caraBayar === 'Kredit') {
                rec.termin = parseInt(val('tTermin'), 10) || 0;
                rec.jatuhTempo = jatuhTempoTrx({ tanggal: tgl, termin: rec.termin });
                // Pembayaran lama dipertahankan saat transaksi diedit
                var lamaTrx = editId ? (isJual ? DB.penjualan : DB.pembelian).find(function (r) { return r.id === editId; }) : null;
                rec.bayar = arr(lamaTrx && lamaTrx.bayar);
            } else {
                rec.termin = 0; rec.jatuhTempo = ''; rec.bayar = [];
            }
            if (isJual) rec.sales = val('tSales').trim();
            if (!isJual) {
                rec.mataUang = mataUangAktif();
                rec.kursCNY = (rec.mataUang === 'IDR') ? 1 : (parseNum(val('tKurs')) || 1);
                if (rec.mataUang === 'IDR') {
                    rec.items.forEach(function (it) { it.hargaCNY = 0; });
                }
            }
            
            if (!isDraft) {
                var totalSub = t.sub || 1;
                items.forEach(function (it) {
                    var b = findBarang(it.kode); if (!b || isJasa(b)) return;   // jasa: lewati stok & HPP
                    if (!isJual) {
                        var oldQty = Math.max(Number(b.stok), 0);
                        var oldVal = oldQty * Number(b.hargaBeli || 0);
                        var itemBiaya = t.biayaLain * (it.subtotal / totalSub);
                        var newVal = oldVal + it.subtotal + itemBiaya;
                        var newQty = oldQty + it.qty;
                        if (newQty > 0) {
                            b.hargaBeli = round2(newVal / newQty);
                        }
                    }
                    mutasiStok(b, gud, (isJual ? -it.qty : it.qty));
                });
                // Kas hanya bergerak untuk transaksi tunai. Kredit -> piutang/utang.
                if (caraBayar === 'Tunai') {
                    DB.kasbank.push({
                        id: uid(), tanggal: tgl, akun: akun, arah: isJual ? 'Masuk' : 'Keluar',
                        kategori: isJual ? 'Penjualan' : 'Pembelian', jumlah: t.grand,
                        keterangan: (isJual ? 'Penjualan ' : 'Pembelian ') + rec.no + ' - ' + pihak, ref: rec.no, auto: true
                    });
                }
            }
            
            if (isJual) DB.penjualan.push(rec); else DB.pembelian.push(rec);
            persist(); closeModal();
            isJual ? renderPenjualan() : renderPembelian();
            toast((isJual ? 'Penjualan' : 'Pembelian') + ' ' + rec.no + ' tersimpan', 'ok');
        }

        function submitTrx(mode, id) {
            var isJual = mode === 'jual';
            var daftarTrx = isJual ? DB.penjualan : DB.pembelian;
            var x = daftarTrx.find(function (r) { return r.id === id; }); if (!x || x.status !== 'Draft') return;
            
            var gudX = x.gudang || gudangDefault();
            if (isJual) {
                for (var i = 0; i < x.items.length; i++) {
                    var b = findBarang(x.items[i].kode);
                    if (b && !isJasa(b) && stokGudang(b, gudX) < x.items[i].qty) {
                        toast('Stok "' + b.nama + '" di ' + namaGudang(gudX) + ' tidak cukup untuk di-submit (tersedia ' + fmt(stokGudang(b, gudX)) + ')', 'err'); return;
                    }
                }
            }

            if (!confirm('Submit ' + x.no + ' menjadi Final? Stok akan dipotong/ditambah dan mutasi kas/bank akan tercatat.')) return;

            var totalSub = x.subtotal || 1;
            x.items.forEach(function (it) {
                var b = findBarang(it.kode); if (!b || isJasa(b)) return;   // jasa: lewati stok & HPP
                if (!isJual) {
                    var oldQty = Math.max(Number(b.stok), 0);
                    var oldVal = oldQty * Number(b.hargaBeli || 0);
                    var itemBiaya = (x.biayaLain || 0) * (it.subtotal / totalSub);
                    var newVal = oldVal + it.subtotal + itemBiaya;
                    var newQty = oldQty + it.qty;
                    if (newQty > 0) {
                        b.hargaBeli = round2(newVal / newQty);
                    }
                }
                mutasiStok(b, gudX, (isJual ? -it.qty : it.qty));
            });
            if (caraBayarTrx(x) === 'Tunai') {
                DB.kasbank.push({
                    id: uid(), tanggal: x.tanggal, akun: x.akun, arah: isJual ? 'Masuk' : 'Keluar',
                    kategori: isJual ? 'Penjualan' : 'Pembelian', jumlah: x.total,
                    keterangan: (isJual ? 'Penjualan ' : 'Pembelian ') + x.no + ' - ' + x.pelanggan, ref: x.no, auto: true
                });
            }
            x.status = 'Final';
            persist();
            isJual ? renderPenjualan() : renderPembelian();
            toast(x.no + ' berhasil di-submit (Final)', 'ok');
        }

        function delTrx(mode, id) {
            auditLog(mode, "Hapus transaksi ID " + id);
            var isJual = mode === 'jual';
            var daftarTrx = isJual ? DB.penjualan : DB.pembelian;
            var x = daftarTrx.find(function (r) { return r.id === id; }); if (!x) return;
            if (!confirm('Hapus ' + x.no + (x.status !== 'Draft' ? '? Stok & kas/bank akan dikembalikan.' : '?'))) return;
            if (x.status !== 'Draft') {
                var totalSub = x.subtotal || 1;
                var gudDel = x.gudang || gudangDefault();
                x.items.forEach(function (it) {
                    var b = findBarang(it.kode);
                    if (b && !isJasa(b)) {                 // jasa tidak mengembalikan stok
                        if (!isJual) {
                            var itemBiaya = (x.biayaLain || 0) * (it.subtotal / totalSub);
                            var oldItemCost = it.subtotal + itemBiaya;
                            var currentQty = Math.max(Number(b.stok), 0);
                            var currentVal = currentQty * Number(b.hargaBeli || 0);
                            var newQty = currentQty - it.qty;
                            if (newQty > 0) {
                                b.hargaBeli = Math.max(0, round2((currentVal - oldItemCost) / newQty));
                            }
                        }
                        mutasiStok(b, gudDel, (isJual ? it.qty : -it.qty));
                    }
                });
                DB.kasbank = DB.kasbank.filter(function (k) { return k.ref !== x.no; });
            }
            if (isJual) DB.penjualan = daftarTrx.filter(function (r) { return r.id !== id; });
            else DB.pembelian = daftarTrx.filter(function (r) { return r.id !== id; });
            persist(); isJual ? renderPenjualan() : renderPembelian(); toast(x.no + ' dihapus', 'ok');
        }

        /* MODAL */
        function renderModal() {
            var list = DB.modal.slice().sort(function (a, b) { return (b.tanggal || '').localeCompare(a.tanggal || ''); });
            var html = '<div class="page-head"><div><h2>Modal</h2><div class="sub">Setoran &amp; penarikan modal usaha &middot; total modal: <b>' + money(totalModal()) + '</b></div></div>' +
                '<button class="btn btn-primary" onclick="formModal()">＋ Catat Modal</button></div>';
            html += '<div class="panel"><div class="panel-head"><h3>Riwayat Modal</h3>' +
                '<button class="btn btn-ghost btn-sm" onclick="printLedger(\'modal\')">🖨️ Cetak</button></div><div class="panel-body">';
            if (list.length === 0) { html += '<div class="empty">Belum ada catatan modal.</div>'; }
            else {
                html += '<table class="grid"><thead><tr><th>No</th><th>Tanggal</th><th>Jenis</th><th>Ke Akun</th><th>Keterangan</th><th class="num">Jumlah</th><th></th></tr></thead><tbody>';
                list.forEach(function (m) {
                    html += '<tr><td><b>' + esc(m.no) + '</b></td><td>' + fmtDate(m.tanggal) + '</td>' +
                        '<td><span class="tag ' + (m.jenis === 'Setor' ? 'in' : 'out') + '">' + esc(m.jenis) + '</span></td>' +
                        '<td><span class="tag ' + (m.akun === 'Kas' ? 'kas' : 'bank') + '">' + esc(m.akun) + '</span></td>' +
                        '<td>' + esc(m.keterangan) + '</td><td class="num">' + money(m.jumlah) + '</td>' +
                        '<td class="row-actions"><button class="btn btn-ghost btn-sm" onclick="formModal(\'' + m.id + '\')">Edit</button>' +
                        '<button class="btn btn-ghost btn-sm" onclick="printModal(\'' + m.id + '\')">🖨️</button>' +
                        '<button class="btn btn-danger btn-sm" onclick="delModal(\'' + m.id + '\')">Hapus</button></td></tr>';
                });
                html += '</tbody></table>';
            }
            html += '</div></div>';
            document.getElementById('main').innerHTML = html;
        }
        function formModal(editId) {
            var x = null;
            if (editId) x = DB.modal.find(function (r) { return r.id === editId; });
            var jenis = x ? x.jenis : 'Setor';
            var akun = x ? x.akun : 'Bank';
            var tgl = x ? x.tanggal : todayStr();
            var jml = x ? x.jumlah : 0;
            var ket = x ? x.keterangan : 'Setoran modal awal';
            openModal(
                '<div class="modal-head"><h3>Catat Modal ' + (editId ? '(Edit)' : '') + '</h3><button class="x" onclick="closeModal()">&times;</button></div>' +
                '<div class="modal-body">' +
                '<input type="hidden" id="mEditId" value="' + (editId || '') + '">' +
                '<input type="hidden" id="mOldNo" value="' + (x ? x.no : '') + '">' +
                '<div class="grid2">' + selField('Jenis', 'mJenis', ['Setor', 'Tarik'], jenis) + selField('Ke / Dari Akun', 'mAkun', ['Kas', 'Bank'], akun) + '</div>' +
                '<div class="grid2">' + fld('Tanggal', 'mTgl', tgl, 'date') + fldNum('Jumlah', 'mJml', jml) + '</div>' +
                fld('Keterangan', 'mKet', ket) +
                '</div>' +
                '<div class="modal-foot"><button class="btn btn-ghost" onclick="closeModal()">Batal</button>' +
                '<button class="btn btn-primary" onclick="saveModal()">Simpan</button></div>'
            );
            attachNumInputs();
        }
        function saveModal() {
            auditLog("Modal", "Simpan modal");
            var jml = parseNum(val('mJml'));
            if (jml <= 0) { toast('Jumlah harus lebih dari 0', 'err'); return; }
            var jenis = val('mJenis'), akun = val('mAkun'), tgl = val('mTgl') || todayStr();
            var editId = val('mEditId'), oldNo = val('mOldNo');

            if (editId) {
                var oldM = DB.modal.find(function (r) { return r.id === editId; });
                if (oldM) DB.kasbank = DB.kasbank.filter(function (k) { return k.ref !== oldM.no; });
                DB.modal = DB.modal.filter(function (r) { return r.id !== editId; });
            }

            var rec = { id: editId || uid(), no: oldNo || nextNo('MDL'), tanggal: tgl, jenis: jenis, akun: akun, jumlah: jml, keterangan: val('mKet').trim() };
            DB.modal.push(rec);
            DB.kasbank.push({
                id: uid(), tanggal: tgl, akun: akun, arah: jenis === 'Setor' ? 'Masuk' : 'Keluar',
                kategori: 'Modal', jumlah: jml, keterangan: 'Modal ' + jenis + ' - ' + rec.no, ref: rec.no, auto: true
            });
            persist(); closeModal(); renderModal(); toast('Modal tercatat', 'ok');
        }
        function delModal(id) {
            auditLog("Modal", "Hapus modal ID " + id);
            var m = DB.modal.find(function (x) { return x.id === id; }); if (!m) return;
            if (!confirm('Hapus catatan modal ' + m.no + '?')) return;
            DB.modal = DB.modal.filter(function (x) { return x.id !== id; });
            DB.kasbank = DB.kasbank.filter(function (k) { return k.ref !== m.no; });
            persist(); renderModal(); toast('Dihapus', 'ok');
        }

        /* KAS & BANK */
        function renderKasbank(fAkun) {
            fAkun = fAkun || 'Semua';
            var list = DB.kasbank.filter(function (k) { return fAkun === 'Semua' || k.akun === fAkun; })
                .slice().sort(function (a, b) { return (b.tanggal || '').localeCompare(a.tanggal || ''); });
            var html = '<div class="page-head"><div><h2>Kas &amp; Bank</h2><div class="sub">Buku kas &amp; bank &middot; pemasukan dan pengeluaran</div></div>' +
                '<button class="btn btn-primary" onclick="formKB()">＋ Transaksi Kas/Bank</button></div>';
            html += '<div class="cards">' +
                card('Saldo Kas', '🟡', money(saldoAkun('Kas')), 'kas') +
                card('Saldo Bank', '🔵', money(saldoAkun('Bank'))) +
                card('Total Saldo', '💰', money(saldoAkun('Kas') + saldoAkun('Bank'))) +
                '</div>';
            html += '<div class="panel"><div class="panel-head"><div class="toolbar">' +
                selInline('kbFilter', ['Semua', 'Kas', 'Bank'], fAkun, 'renderKasbank(this.value)') +
                '</div><button class="btn btn-ghost btn-sm" onclick="printLedger(\'kasbank\')">🖨️ Cetak Buku Kas/Bank</button></div><div class="panel-body">';
            if (list.length === 0) { html += '<div class="empty">Belum ada transaksi kas/bank.</div>'; }
            else {
                html += '<table class="grid"><thead><tr><th>Tanggal</th><th>Akun</th><th>Kategori</th><th>Keterangan</th>' +
                    '<th class="num">Masuk</th><th class="num">Keluar</th><th></th></tr></thead><tbody>';
                list.forEach(function (k) {
                    html += '<tr><td>' + fmtDate(k.tanggal) + '</td>' +
                        '<td><span class="tag ' + (k.akun === 'Kas' ? 'kas' : 'bank') + '">' + esc(k.akun) + '</span></td>' +
                        '<td>' + esc(k.kategori) + '</td><td>' + esc(k.keterangan) + '</td>' +
                        '<td class="num">' + (k.arah === 'Masuk' ? '<span style="color:#15803d">' + fmt(k.jumlah) + '</span>' : '-') + '</td>' +
                        '<td class="num">' + (k.arah === 'Keluar' ? '<span style="color:#b91c1c">' + fmt(k.jumlah) + '</span>' : '-') + '</td>' +
                        '<td class="row-actions">' + (k.auto ? '<span class="hint">otomatis</span>' : '<button class="btn btn-ghost btn-sm" onclick="formKB(\'' + k.id + '\')">Edit</button><button class="btn btn-danger btn-sm" onclick="delKB(\'' + k.id + '\')">Hapus</button>') + '</td></tr>';
                });
                html += '</tbody></table>';
            }
            html += '</div></div>';
            document.getElementById('main').innerHTML = html;
        }
        function formKB(editId) {
            var x = null;
            if (editId) x = DB.kasbank.find(function (r) { return r.id === editId; });
            var akun = x ? x.akun : 'Kas';
            var arah = x ? x.arah : 'Masuk';
            var kat = x ? x.kategori : 'Operasional';
            var tgl = x ? x.tanggal : todayStr();
            var jml = x ? x.jumlah : 0;
            var ket = x ? x.keterangan : '';
            var lawanSel = x && x.lawan ? x.lawan : defaultLawan({ kategori: kat, arah: arah });

            openModal(
                '<div class="modal-head"><h3>Transaksi Kas / Bank ' + (editId ? '(Edit)' : '') + '</h3><button class="x" onclick="closeModal()">&times;</button></div>' +
                '<div class="modal-body">' +
                '<input type="hidden" id="kbEditId" value="' + (editId || '') + '">' +
                '<div class="grid3">' + selField('Akun', 'kAkun', ['Kas', 'Bank'], akun) +
                selField('Arah', 'kArah', ['Masuk', 'Keluar'], arah) +
                selField('Kategori', 'kKat', ['Operasional', 'Penjualan', 'Pembelian', 'Modal', 'Transfer', 'Lainnya'], kat) + '</div>' +
                '<div class="field"><label>Akun Lawan (untuk jurnal otomatis)</label><select id="kLawan"><option value="">— otomatis sesuai kategori —</option>' + akunOptions(lawanSel, function (a) { return a.kode !== AKM.kas && a.kode !== AKM.bank; }) + '</select><div class="hint">Menentukan akun beban/pendapatan pada jurnal. Kategori Transfer otomatis Kas ↔ Bank.</div></div>' +
                '<div class="grid2">' + fld('Tanggal', 'kTgl', tgl, 'date') + fldNum('Jumlah', 'kJml', jml) + '</div>' +
                fld('Keterangan', 'kKet', ket) +
                '</div>' +
                '<div class="modal-foot"><button class="btn btn-ghost" onclick="closeModal()">Batal</button>' +
                '<button class="btn btn-primary" onclick="saveKB()">Simpan</button></div>'
            );
            var kk = document.getElementById('kKat');
            if (kk) kk.addEventListener('change', function () {
                var el = document.getElementById('kLawan');
                if (el) el.value = defaultLawan({ kategori: this.value, arah: val('kArah') });
            });
            attachNumInputs();
        }
        function saveKB() {
            auditLog("KasBank", "Simpan transaksi kas");
            var jml = parseNum(val('kJml'));
            if (jml <= 0) { toast('Jumlah harus lebih dari 0', 'err'); return; }
            var editId = val('kbEditId');
            if (editId) {
                DB.kasbank = DB.kasbank.filter(function (k) { return k.id !== editId; });
            }
            DB.kasbank.push({
                id: editId || uid(), tanggal: val('kTgl') || todayStr(), akun: val('kAkun'), arah: val('kArah'),
                kategori: val('kKat'), lawan: val('kLawan'), jumlah: jml, keterangan: val('kKet').trim(), ref: '', auto: false
            });
            persist(); closeModal(); renderKasbank(); toast('Transaksi tersimpan', 'ok');
        }
        function delKB(id) {
            auditLog("KasBank", "Hapus transaksi kas ID " + id);
            if (!confirm('Hapus transaksi ini?')) return;
            DB.kasbank = DB.kasbank.filter(function (k) { return k.id !== id; });
            persist(); renderKasbank(); toast('Dihapus', 'ok');
        }

        /* QUOTATION (tidak membaca stok, hanya nama barang) */
        var qItems = [];
        function renderQuotation(f) {
            var wasSearching = document.activeElement && document.activeElement.classList.contains('search');
            f = f || '';
            var list = DB.quotation.filter(function (x) { return !f || ((x.no + ' ' + x.pelanggan).toLowerCase().indexOf(f.toLowerCase()) >= 0); })
                .sort(function (a, b) { return (b.tanggal || '').localeCompare(a.tanggal || ''); });
            var html = '<div class="page-head"><div><h2>Quotation / Penawaran</h2><div class="sub">Penawaran harga &middot; input bebas nama barang, <b>tidak</b> memengaruhi stok</div></div>' +
                '<button class="btn btn-primary" onclick="formQuote()">＋ Quotation Baru</button></div>';
            html += '<div class="panel"><div class="panel-head">' +
                '<input class="search" placeholder="Cari no / pelanggan..." value="' + esc(f) + '" oninput="renderQuotation(this.value)"></div><div class="panel-body">';
            if (list.length === 0) { html += '<div class="empty">Belum ada quotation.</div>'; }
            else {
                html += '<table class="grid"><thead><tr><th>No</th><th>Tanggal</th><th>Pelanggan</th><th class="ctr">Item</th>' +
                    '<th class="num">Total</th><th>Berlaku s/d</th><th></th></tr></thead><tbody>';
                list.forEach(function (x) {
                    html += '<tr><td><b>' + esc(x.no) + '</b></td><td>' + fmtDate(x.tanggal) + '</td><td>' + esc(x.pelanggan) + '</td>' +
                        '<td class="ctr">' + x.items.length + '</td><td class="num">' + money(x.total) + '</td><td>' + fmtDate(x.berlaku) + '</td>' +
                        '<td class="row-actions"><button class="btn btn-ghost btn-sm" onclick="formQuote(\'' + x.id + '\')">Edit</button>' +
                        '<button class="btn btn-ghost btn-sm" onclick="printQuote(\'' + x.id + '\')">🖨️ Cetak</button>' +
                        '<button class="btn btn-danger btn-sm" onclick="delQuote(\'' + x.id + '\')">Hapus</button></td></tr>';
                });
                html += '</tbody></table>';
            }
            html += '</div></div>';
            document.getElementById('main').innerHTML = html;
            if (wasSearching) {
                var searchInp = document.getElementById('main').querySelector('.search');
                if (searchInp) { searchInp.focus(); var len = searchInp.value.length; searchInp.setSelectionRange(len, len); }
            }
        }
        function formQuote(editId) {
            var x = null;
            if (editId) {
                x = DB.quotation.find(function (r) { return r.id === editId; });
            }
            if (x) {
                qItems = JSON.parse(JSON.stringify(x.items));
                if (!qItems.length) qItems = [{ nama: '', qty: 1, harga: 0 }];
            } else {
                qItems = [{ nama: '', qty: 1, harga: 0 }];
            }

            var tgl = x ? x.tanggal : todayStr();
            var pihak = x ? x.pelanggan : '';
            var berlaku = x ? x.berlaku : new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10);
            var disc = x ? (x.diskon || 0) : 0;
            var note = x ? (x.catatan || 'Harga belum termasuk ongkos kirim.') : 'Harga belum termasuk ongkos kirim.';
            var salesCode = x ? (x.sales || 'MNA') : 'MNA';

            openModal(
                '<div class="modal-head"><h3>Quotation ' + (editId ? '(Edit)' : 'Baru') + '</h3><button class="x" onclick="closeModal()">&times;</button></div>' +
                '<div class="modal-body">' +
                '<input type="hidden" id="qEditId" value="' + (editId || '') + '">' +
                '<input type="hidden" id="qOldNo" value="' + (x ? x.no : '') + '">' +
                '<div class="grid3">' + fld('Pelanggan', 'qPihak', pihak) + selField('Sales', 'qSales', ['MNA', 'LHY', 'RWD', 'MAU', 'ANT'], salesCode) + '</div>' +
                '<div class="grid2">' + fld('Tanggal', 'qTgl', tgl, 'date') + fld('Berlaku s/d', 'qBerlaku', berlaku, 'date') + '</div>' +
                '<div id="qItemsWrap"></div>' +
                '<button class="btn btn-ghost btn-sm" style="margin-top:8px" onclick="qAdd()">＋ Tambah Baris</button>' +
                '<div style="display:flex;gap:20px;flex-wrap:wrap;margin-top:14px">' +
                '<div style="flex:1;min-width:220px">' + fld('Syarat &amp; Catatan', 'qNote', note) + '</div>' +
                '<div class="totbox">' +
                '<div class="totrow"><span>Subtotal</span><span id="qSub">0.00</span></div>' +
                '<div class="totrow"><span>Diskon</span><input class="num moneyIn" id="qDisc" value="' + fmt(disc) + '" style="width:130px;padding:4px 8px;border:1px solid var(--line);border-radius:6px;text-align:right" oninput="qCalc()"></div>' +
                '<div class="totrow grand"><span>TOTAL</span><span id="qGrand">0.00</span></div>' +
                '</div>' +
                '</div>' +
                '</div>' +
                '<div class="modal-foot"><button class="btn btn-ghost" onclick="closeModal()">Batal</button>' +
                '<button class="btn btn-primary" onclick="saveQuote()">Simpan Quotation</button></div>'
            );
            qRender(); qCalc();
            attachNumInputs();
        }
        function qRender() {
            var dl = '<datalist id="qNames">' + DB.barang.map(function (b) { return '<option value="' + esc(b.nama) + '">'; }).join('') + '</datalist>';
            var h = dl + '<table class="items"><thead><tr><th style="width:36%">Nama Barang / Jasa</th><th style="width:10%">Qty</th><th style="width:14%">Satuan</th>' +
                '<th style="width:20%">Harga</th><th style="width:18%">Subtotal</th><th></th></tr></thead><tbody>';
            qItems.forEach(function (it, i) {
                h += '<tr>' +
                    '<td><input list="qNames" value="' + esc(it.nama) + '" placeholder="ketik nama barang..." oninput="qUpd(' + i + ',\'nama\',this.value)"></td>' +
                    '<td><input class="num" value="' + it.qty + '" oninput="qUpd(' + i + ',\'qty\',this.value)"></td>' +
                    '<td><input value="' + esc(it.satuan || 'Pcs') + '" oninput="qUpd(' + i + ',\'satuan\',this.value)"></td>' +
                    '<td><input class="num" value="' + fmt(it.harga) + '" oninput="qUpd(' + i + ',\'harga\',this.value)"></td>' +
                    '<td style="text-align:right;font-variant-numeric:tabular-nums" id="qsub' + i + '">' + fmt(it.qty * it.harga) + '</td>' +
                    '<td><button class="btn btn-danger btn-sm" onclick="qRm(' + i + ')">✕</button></td>' +
                    '</tr>';
            });
            h += '</tbody></table>';
            document.getElementById('qItemsWrap').innerHTML = h;
        }
        function qUpd(i, f, v) {
            qItems[i][f] = (f === 'nama' || f === 'satuan') ? v : parseNum(v);
            var it = qItems[i]; var c = document.getElementById('qsub' + i); if (c) c.textContent = fmt(round2(it.qty * it.harga));
            qCalc();
        }
        function qAdd() { qItems.push({ nama: '', satuan: 'Pcs', qty: 1, harga: 0 }); qRender(); qCalc(); }
        function qRm(i) { qItems.splice(i, 1); if (!qItems.length) qItems.push({ nama: '', satuan: 'Pcs', qty: 1, harga: 0 }); qRender(); qCalc(); }
        function qCalc() {
            var sub = 0; qItems.forEach(function (it) { sub += round2((Number(it.qty) || 0) * (Number(it.harga) || 0)); });
            sub = round2(sub);
            var disc = parseNum(val('qDisc'));
            var dpp = round2(sub - disc); if (dpp < 0) dpp = 0;
            var grand = round2(dpp);
            set('qSub', fmt(sub)); set('qGrand', fmt(grand));
            return { sub: sub, disc: disc, grand: grand };
        }
        function getNextQuoteNo(salesCode, dateStr) {
            var d = new Date(dateStr);
            var m = String(d.getMonth() + 1).padStart(2, '0');
            var y = d.getFullYear();
            var key = 'QUO-' + salesCode + '-' + y + m;
            DB.counters[key] = (DB.counters[key] || 0) + 1;
            var num = String(DB.counters[key]).padStart(3, '0');
            return num + '/GTI-QUO/' + salesCode + '/' + m + '/' + y;
        }
        function saveQuote() {
            auditLog("Quotation", "Simpan quotation");
            var editId = val('qEditId');
            var oldNo = val('qOldNo');
            var items = qItems.filter(function (it) { return it.nama.trim() && it.qty > 0; })
                .map(function (it) { return { nama: it.nama.trim(), satuan: (it.satuan || '').trim() || 'Pcs', qty: round2(it.qty), harga: round2(it.harga), subtotal: round2(it.qty * it.harga) }; });
            if (items.length === 0) { toast('Isi minimal 1 nama barang', 'err'); return; }

            if (editId) {
                DB.quotation = DB.quotation.filter(function (r) { return r.id !== editId; });
            }

            var t = qCalc();
            var tTgl = val('qTgl') || todayStr();
            var salesCode = val('qSales') || 'MNA';

            DB.quotation.push({
                id: editId || uid(), no: oldNo || getNextQuoteNo(salesCode, tTgl), tanggal: tTgl, berlaku: val('qBerlaku'),
                pelanggan: val('qPihak').trim() || 'Umum', sales: salesCode, items: items, subtotal: t.sub, diskon: t.disc,
                total: t.grand, catatan: val('qNote').trim()
            });
            persist(); closeModal(); renderQuotation(); toast('Quotation tersimpan', 'ok');
        }
        function delQuote(id) {
            auditLog("Quotation", "Hapus quotation ID " + id);
            var q = DB.quotation.find(function (x) { return x.id === id; }); if (!q) return;
            if (!confirm('Hapus quotation ' + q.no + '?')) return;
            DB.quotation = DB.quotation.filter(function (x) { return x.id !== id; });
            persist(); renderQuotation(); toast('Dihapus', 'ok');
        }

        /* ============================================================
           MODUL AKUNTANSI — COA, Jurnal, Buku Besar, Neraca Saldo,
           Laba Rugi & Neraca. Jurnal otomatis dibentuk ulang dari
           transaksi (penjualan/pembelian/modal/kas-bank) setiap kali
           data disimpan, sehingga selalu konsisten.
           ============================================================ */

        var COA_DEFAULT = [
            ['1000','ASET','Header','','Neraca','','Header'],
            ['1100','Aset Lancar','Aset','Aset Lancar','Neraca','Debit','Header'],
            ['1101','Kas','Aset','Kas & Bank','Neraca','Debit','Aktif'],
            ['1102','Bank BCA','Aset','Kas & Bank','Neraca','Debit','Aktif'],
            ['1110','Piutang Usaha','Aset','Piutang','Neraca','Debit','Aktif'],
            ['1111','Cadangan Kerugian Piutang','Aset','Piutang','Neraca','Kredit','Aktif'],
            ['1120','Uang Muka Supplier','Aset','Uang Muka','Neraca','Debit','Aktif'],
            ['1121','Uang Muka Impor','Aset','Uang Muka','Neraca','Debit','Aktif'],
            ['1122','Uang Muka Proyek','Aset','Uang Muka','Neraca','Debit','Aktif'],
            ['1130','Persediaan','Aset','Persediaan','Neraca','Debit','Header'],
            ['1131','Persediaan Barang Dagang','Aset','Persediaan','Neraca','Debit','Aktif'],
            ['1132','Barang Dalam Perjalanan','Aset','Persediaan','Neraca','Debit','Aktif'],
            ['1133','Material Service','Aset','Persediaan','Neraca','Debit','Aktif'],
            ['1140','PPN Masukan','Aset','Pajak Dibayar Dimuka','Neraca','Debit','Aktif'],
            ['1141','PPN Impor Dibayar Dimuka','Aset','Pajak Dibayar Dimuka','Neraca','Debit','Aktif'],
            ['1142','PPh Dibayar Dimuka','Aset','Pajak Dibayar Dimuka','Neraca','Debit','Aktif'],
            ['1150','Biaya Dibayar Dimuka','Aset','Aset Lancar Lainnya','Neraca','Debit','Aktif'],
            ['1200','Aset Tetap','Aset','Aset Tetap','Neraca','Debit','Header'],
            ['1201','Tanah','Aset','Aset Tetap','Neraca','Debit','Aktif'],
            ['1202','Bangunan','Aset','Aset Tetap','Neraca','Debit','Aktif'],
            ['1203','Kendaraan','Aset','Aset Tetap','Neraca','Debit','Aktif'],
            ['1204','Peralatan Kantor','Aset','Aset Tetap','Neraca','Debit','Aktif'],
            ['1205','Komputer & Laptop','Aset','Aset Tetap','Neraca','Debit','Aktif'],
            ['1206','Peralatan Kerja','Aset','Aset Tetap','Neraca','Debit','Aktif'],
            ['1207','Furniture','Aset','Aset Tetap','Neraca','Debit','Aktif'],
            ['1208','Renovasi Kantor','Aset','Aset Tetap','Neraca','Debit','Aktif'],
            ['1290','Akumulasi Penyusutan','Aset','Kontra Aset','Neraca','Kredit','Header'],
            ['1291','Akumulasi Penyusutan Bangunan','Aset','Kontra Aset','Neraca','Kredit','Aktif'],
            ['1292','Akumulasi Penyusutan Kendaraan','Aset','Kontra Aset','Neraca','Kredit','Aktif'],
            ['1293','Akumulasi Penyusutan Peralatan Kantor','Aset','Kontra Aset','Neraca','Kredit','Aktif'],
            ['1294','Akumulasi Penyusutan Komputer & Laptop','Aset','Kontra Aset','Neraca','Kredit','Aktif'],
            ['1295','Akumulasi Penyusutan Peralatan Kerja','Aset','Kontra Aset','Neraca','Kredit','Aktif'],
            ['1296','Akumulasi Penyusutan Furniture','Aset','Kontra Aset','Neraca','Kredit','Aktif'],
            ['1297','Akumulasi Penyusutan Renovasi Kantor','Aset','Kontra Aset','Neraca','Kredit','Aktif'],
            ['2000','LIABILITAS','Header','','Neraca','','Header'],
            ['2101','Utang Usaha','Liabilitas','Jangka Pendek','Neraca','Kredit','Aktif'],
            ['2102','Utang Supplier Luar Negeri','Liabilitas','Jangka Pendek','Neraca','Kredit','Aktif'],
            ['2103','Utang Bea Masuk','Liabilitas','Jangka Pendek','Neraca','Kredit','Aktif'],
            ['2104','Utang PPN','Liabilitas','Jangka Pendek','Neraca','Kredit','Aktif'],
            ['2105','Utang PPh','Liabilitas','Jangka Pendek','Neraca','Kredit','Aktif'],
            ['2106','Utang Gaji','Liabilitas','Jangka Pendek','Neraca','Kredit','Aktif'],
            ['2107','Biaya Masih Harus Dibayar','Liabilitas','Jangka Pendek','Neraca','Kredit','Aktif'],
            ['2108','Uang Muka Pelanggan','Liabilitas','Jangka Pendek','Neraca','Kredit','Aktif'],
            ['2201','Pinjaman Bank','Liabilitas','Jangka Panjang','Neraca','Kredit','Aktif'],
            ['2202','Pinjaman Pemegang Saham','Liabilitas','Jangka Panjang','Neraca','Kredit','Aktif'],
            ['3000','EKUITAS','Header','','Neraca','','Header'],
            ['3101','Modal Disetor','Ekuitas','Modal','Neraca','Kredit','Aktif'],
            ['3102','Tambahan Modal Disetor','Ekuitas','Modal','Neraca','Kredit','Aktif'],
            ['3201','Saldo Laba','Ekuitas','Laba Ditahan','Neraca','Kredit','Aktif'],
            ['3202','Laba Tahun Berjalan','Ekuitas','Laba Ditahan','Neraca','Kredit','Aktif'],
            ['4000','PENDAPATAN','Header','','Laba Rugi','','Header'],
            ['4101','Penjualan Barang','Pendapatan','Trading','Laba Rugi','Kredit','Aktif'],
            ['4102','Diskon Penjualan','Pendapatan','Trading','Laba Rugi','Debit','Aktif'],
            ['4201','Pendapatan Jasa Service','Pendapatan','Service','Laba Rugi','Kredit','Aktif'],
            ['4202','Pendapatan Jasa Instalasi','Pendapatan','Service','Laba Rugi','Kredit','Aktif'],
            ['4203','Pendapatan Jasa Maintenance','Pendapatan','Service','Laba Rugi','Kredit','Aktif'],
            ['4204','Pendapatan Jasa Commissioning','Pendapatan','Service','Laba Rugi','Kredit','Aktif'],
            ['4301','Pendapatan Bunga','Pendapatan','Lainnya','Laba Rugi','Kredit','Aktif'],
            ['4302','Keuntungan Selisih Kurs','Pendapatan','Lainnya','Laba Rugi','Kredit','Aktif'],
            ['4303','Pendapatan Lainnya','Pendapatan','Lainnya','Laba Rugi','Kredit','Aktif'],
            ['5000','HPP','Header','','Laba Rugi','','Header'],
            ['5101','HPP Penjualan Barang','HPP','Trading','Laba Rugi','Debit','Aktif'],
            ['5201','HPP Jasa - Material Service','HPP','Service','Laba Rugi','Debit','Aktif'],
            ['5202','HPP Jasa - Tenaga Kerja Langsung','HPP','Service','Laba Rugi','Debit','Aktif'],
            ['5203','HPP Jasa - Subkontraktor','HPP','Service','Laba Rugi','Debit','Aktif'],
            ['5204','HPP Jasa - Transportasi & Akomodasi','HPP','Service','Laba Rugi','Debit','Aktif'],
            ['5205','HPP Jasa - Consumable','HPP','Service','Laba Rugi','Debit','Aktif'],
            ['6000','BEBAN OPERASIONAL','Header','','Laba Rugi','','Header'],
            ['6101','Gaji & Tunjangan','Beban','Operasional','Laba Rugi','Debit','Aktif'],
            ['6102','Sewa Kantor','Beban','Operasional','Laba Rugi','Debit','Aktif'],
            ['6103','Listrik & Air','Beban','Operasional','Laba Rugi','Debit','Aktif'],
            ['6104','Internet & Telepon','Beban','Operasional','Laba Rugi','Debit','Aktif'],
            ['6105','ATK','Beban','Operasional','Laba Rugi','Debit','Aktif'],
            ['6106','Promosi & Pemasaran','Beban','Operasional','Laba Rugi','Debit','Aktif'],
            ['6107','BBM, Tol & Parkir','Beban','Operasional','Laba Rugi','Debit','Aktif'],
            ['6108','Perawatan Kendaraan','Beban','Operasional','Laba Rugi','Debit','Aktif'],
            ['6109','Software & Langganan','Beban','Operasional','Laba Rugi','Debit','Aktif'],
            ['6110','Beban Penyusutan','Beban','Operasional','Laba Rugi','Debit','Aktif'],
            ['7000','PENDAPATAN/BEBAN LAIN','Header','','Laba Rugi','','Header'],
            ['7101','Administrasi Bank','Beban','Lainnya','Laba Rugi','Debit','Aktif'],
            ['7102','Beban Bunga','Beban','Lainnya','Laba Rugi','Debit','Aktif'],
            ['7103','Kerugian Selisih Kurs','Beban','Lainnya','Laba Rugi','Debit','Aktif'],
            ['7104','Beban Pajak & Denda','Beban','Lainnya','Laba Rugi','Debit','Aktif'],
            ['7105','Kerugian Piutang','Beban','Lainnya','Laba Rugi','Debit','Aktif'],
            ['7106','Beban Lainnya','Beban','Lainnya','Laba Rugi','Debit','Aktif']
        ];

        var AKM = {
            kas: '1101', bank: '1102', penjualan: '4101', diskon: '4102', hpp: '5101',
            persediaan: '1131', modal: '3101', pendLain: '4303', bebanLain: '7106', labaBerjalan: '3202',
            piutang: '1110', utang: '2101',
            returJual: '4103', returBeli: '5102', selisihStok: '7107'
        };

        /* Akun yang dibutuhkan fitur baru. Ditambahkan otomatis kalau belum ada,
           sehingga COA yang sudah dipakai tidak perlu diatur ulang manual. */
        var AKUN_WAJIB = [
            ['4103', 'Retur Penjualan', 'Pendapatan', 'Trading', 'Laba Rugi', 'Debit', 'Aktif'],
            ['5102', 'Retur Pembelian', 'HPP', 'Trading', 'Laba Rugi', 'Kredit', 'Aktif'],
            ['7107', 'Selisih Persediaan (Opname)', 'Beban', 'Lainnya', 'Laba Rugi', 'Debit', 'Aktif']
        ];
        function pastikanAkunWajib() {
            if (!DB.coa) DB.coa = [];
            var tambah = 0;
            AKUN_WAJIB.forEach(function (r) {
                if (DB.coa.some(function (a) { return String(a.kode) === r[0]; })) return;
                DB.coa.push({
                    kode: r[0], nama: r[1], kelompok: r[2], sub: r[3],
                    laporan: r[4], normal: r[5], status: r[6], saldoAwal: 0
                });
                tambah++;
            });
            if (tambah) DB.coa.sort(function (a, b) { return String(a.kode).localeCompare(String(b.kode)); });
            return tambah;
        }

        function seedCOA() {
            if (DB.coa && DB.coa.length) return;
            DB.coa = COA_DEFAULT.map(function (r) {
                return { kode: r[0], nama: r[1], kelompok: r[2], sub: r[3], laporan: r[4], normal: r[5], status: r[6], saldoAwal: 0 };
            });
        }
        function findAkun(kode) { return (DB.coa || []).find(function (a) { return String(a.kode) === String(kode); }); }
        function akunAktif(filter) {
            return (DB.coa || []).filter(function (a) { return a.status === 'Aktif' && (!filter || filter(a)); });
        }
        function akunOptions(sel, filter) {
            return akunAktif(filter).map(function (a) {
                return '<option value="' + esc(a.kode) + '"' + (String(sel) === String(a.kode) ? ' selected' : '') + '>' + esc(a.kode + ' — ' + a.nama) + '</option>';
            }).join('');
        }
        function namaAkun(kode) { var a = findAkun(kode); return a ? a.nama : ('Akun ' + kode); }
        function kasAkunKode(akun) { return akun === 'Kas' ? AKM.kas : AKM.bank; }
        function defaultLawan(k) {
            var kat = k.kategori, arah = k.arah;
            if (kat === 'Modal') return AKM.modal;
            if (kat === 'Penjualan') return AKM.penjualan;
            if (kat === 'Pembelian') return AKM.persediaan;
            if (kat === 'Operasional') return '6105';
            return arah === 'Masuk' ? AKM.pendLain : AKM.bebanLain;
        }

        /* ---- Jurnal otomatis dari transaksi ---- */
        function rebuildAutoJurnal() {
            if (!DB.jurnal) DB.jurnal = [];
            DB.jurnal = DB.jurnal.filter(function (j) { return !j.auto; });
            function push(no, tanggal, ket, ref, lines) {
                var L = lines.map(function (l) { return { akun: String(l.akun), debit: round2(l.debit || 0), kredit: round2(l.kredit || 0) }; })
                    .filter(function (l) { return l.debit > 0 || l.kredit > 0; });
                if (!L.length) return;
                DB.jurnal.push({ id: 'aj-' + no, no: no, tanggal: tanggal, keterangan: ket, ref: ref, auto: true, lines: L });
            }
            (DB.penjualan || []).forEach(function (x) {
                if (x.status === 'Draft') return;
                // Pendapatan dipisah per akun: barang -> 4101, tiap jasa -> akunnya sendiri
                var perAkun = {};
                (x.items || []).forEach(function (it) {
                    // Prioritas 1: akun yang tersimpan di baris transaksi
                    // Prioritas 2: akun dari master barang saat ini
                    var kodeAkun = String(it.akunPendapatan || '').trim();
                    if (!kodeAkun || !findAkun(kodeAkun)) {
                        if (String(it.jenis || '') === 'Jasa') kodeAkun = AKUN_JASA_DEFAULT;
                        else kodeAkun = akunPendapatan(findBarang(it.kode));
                    }
                    perAkun[kodeAkun] = round2((perAkun[kodeAkun] || 0) + (Number(it.subtotal) || 0));
                });
                // Tunai -> kas/bank bertambah. Kredit -> Piutang Usaha bertambah.
                var akunDebit = caraBayarTrx(x) === 'Kredit' ? AKM.piutang : kasAkunKode(x.akun);
                var baris = [
                    { akun: akunDebit, debit: x.total },
                    { akun: AKM.diskon, debit: x.diskon || 0 }
                ];
                var adaAkun = Object.keys(perAkun);
                if (adaAkun.length) {
                    adaAkun.forEach(function (k) { baris.push({ akun: k, kredit: perAkun[k] }); });
                } else {
                    baris.push({ akun: AKM.penjualan, kredit: x.subtotal });
                }
                push('JU-' + x.no, x.tanggal, 'Penjualan ' + x.no + ' - ' + x.pelanggan, x.no, baris);

                // HPP hanya untuk item fisik — jasa tidak mengurangi persediaan
                var hpp = 0;
                (x.items || []).forEach(function (it) {
                    if (String(it.jenis || '') === 'Jasa') return;   // jenis terekam di transaksi
                    var b = findBarang(it.kode);
                    if (!b || isJasa(b)) return;
                    hpp += (Number(it.qty) || 0) * (Number(b.hargaBeli) || 0);
                });
                hpp = round2(hpp);
                if (hpp > 0) push('HPP-' + x.no, x.tanggal, 'HPP Penjualan ' + x.no, x.no, [
                    { akun: AKM.hpp, debit: hpp },
                    { akun: AKM.persediaan, kredit: hpp }
                ]);
            });
            (DB.pembelian || []).forEach(function (x) {
                if (x.status === 'Draft') return;
                // Tunai -> kas/bank berkurang. Kredit -> Utang Usaha bertambah.
                var akunKredit = caraBayarTrx(x) === 'Kredit' ? AKM.utang : kasAkunKode(x.akun);
                push('JU-' + x.no, x.tanggal, 'Pembelian ' + x.no + ' - ' + x.pelanggan, x.no, [
                    { akun: AKM.persediaan, debit: x.total },
                    { akun: akunKredit, kredit: x.total }
                ]);
            });

            /* ---- Pelunasan piutang & utang ---- */
            (DB.penjualan || []).forEach(function (x) {
                if (x.status === 'Draft' || caraBayarTrx(x) !== 'Kredit') return;
                arr(x.bayar).forEach(function (p, i) {
                    push('BYR-' + x.no + '-' + (i + 1), p.tanggal,
                        'Pelunasan piutang ' + x.no + ' - ' + x.pelanggan, x.no, [
                        { akun: kasAkunKode(p.akun), debit: p.jumlah },
                        { akun: AKM.piutang, kredit: p.jumlah }
                    ]);
                });
            });
            (DB.pembelian || []).forEach(function (x) {
                if (x.status === 'Draft' || caraBayarTrx(x) !== 'Kredit') return;
                arr(x.bayar).forEach(function (p, i) {
                    push('BYR-' + x.no + '-' + (i + 1), p.tanggal,
                        'Pembayaran utang ' + x.no + ' - ' + x.pelanggan, x.no, [
                        { akun: AKM.utang, debit: p.jumlah },
                        { akun: kasAkunKode(p.akun), kredit: p.jumlah }
                    ]);
                });
            });

            /* ---- Retur ---- */
            arr(DB.retur).forEach(function (r) {
                if (r.status === 'Draft') return;
                if (r.jenis === 'Jual') {
                    // Retur penjualan: pendapatan berkurang, kas/piutang berkurang
                    push('RTJ-' + r.no, r.tanggal, 'Retur penjualan ' + r.no + ' - ' + r.pihak, r.no, [
                        { akun: AKM.returJual, debit: r.total },
                        { akun: r.kredit === 'Piutang' ? AKM.piutang : kasAkunKode(r.akun), kredit: r.total }
                    ]);
                    if (r.hpp > 0) push('RTJH-' + r.no, r.tanggal, 'HPP retur penjualan ' + r.no, r.no, [
                        { akun: AKM.persediaan, debit: r.hpp },
                        { akun: AKM.hpp, kredit: r.hpp }
                    ]);
                } else {
                    // Retur pembelian: persediaan berkurang, kas/utang berkurang
                    push('RTB-' + r.no, r.tanggal, 'Retur pembelian ' + r.no + ' - ' + r.pihak, r.no, [
                        { akun: r.kredit === 'Utang' ? AKM.utang : kasAkunKode(r.akun), debit: r.total },
                        { akun: AKM.persediaan, kredit: r.total }
                    ]);
                }
            });

            /* ---- Selisih stok opname ---- */
            arr(DB.opname).forEach(function (o) {
                if (o.status !== 'Final') return;
                var nilai = round2(Number(o.nilaiSelisih) || 0);
                if (!nilai) return;
                if (nilai < 0) {   // stok fisik kurang -> beban
                    push('OPN-' + o.no, o.tanggal, 'Selisih stok opname ' + o.no + ' - ' + namaGudang(o.gudang), o.no, [
                        { akun: AKM.selisihStok, debit: Math.abs(nilai) },
                        { akun: AKM.persediaan, kredit: Math.abs(nilai) }
                    ]);
                } else {           // stok fisik lebih -> persediaan bertambah
                    push('OPN-' + o.no, o.tanggal, 'Selisih stok opname ' + o.no + ' - ' + namaGudang(o.gudang), o.no, [
                        { akun: AKM.persediaan, debit: nilai },
                        { akun: AKM.selisihStok, kredit: nilai }
                    ]);
                }
            });
            (DB.modal || []).forEach(function (m) {
                var kb = kasAkunKode(m.akun);
                push('JU-' + m.no, m.tanggal, 'Modal ' + m.jenis + (m.keterangan ? ' - ' + m.keterangan : ''), m.no,
                    m.jenis === 'Setor'
                        ? [{ akun: kb, debit: m.jumlah }, { akun: AKM.modal, kredit: m.jumlah }]
                        : [{ akun: AKM.modal, debit: m.jumlah }, { akun: kb, kredit: m.jumlah }]);
            });
            (DB.kasbank || []).forEach(function (k) {
                if (k.auto) return; /* transaksi otomatis sudah dijurnal lewat sumbernya */
                var kb = kasAkunKode(k.akun);
                if (k.kategori === 'Transfer') {
                    if (k.arah !== 'Keluar') return; /* hanya sisi keluar yang dijurnal agar tidak dobel */
                    var tujuan = k.akun === 'Kas' ? AKM.bank : AKM.kas;
                    push('JU-KB-' + k.id, k.tanggal, k.keterangan || 'Transfer antar akun', k.id, [
                        { akun: tujuan, debit: k.jumlah }, { akun: kb, kredit: k.jumlah }]);
                    return;
                }
                var lawan = k.lawan || defaultLawan(k);
                push('JU-KB-' + k.id, k.tanggal, k.keterangan || (k.kategori + ' ' + k.arah), k.id,
                    k.arah === 'Masuk'
                        ? [{ akun: kb, debit: k.jumlah }, { akun: lawan, kredit: k.jumlah }]
                        : [{ akun: lawan, debit: k.jumlah }, { akun: kb, kredit: k.jumlah }]);
            });
        }

        /* ---- Perhitungan buku besar ---- */
        function jurnalSorted() {
            return (DB.jurnal || []).slice().sort(function (a, b) {
                return String(a.tanggal || '').localeCompare(String(b.tanggal || '')) || String(a.no).localeCompare(String(b.no));
            });
        }
        function inRange(t, from, to) {
            t = String(t || '').substring(0, 10);
            if (from && t < from) return false;
            if (to && t > to) return false;
            return true;
        }
        function mutasiAkun(kode, from, to) {
            var d = 0, k = 0;
            (DB.jurnal || []).forEach(function (j) {
                if (!inRange(j.tanggal, from, to)) return;
                (j.lines || []).forEach(function (l) {
                    if (String(l.akun) === String(kode)) { d += Number(l.debit) || 0; k += Number(l.kredit) || 0; }
                });
            });
            return { debit: round2(d), kredit: round2(k) };
        }
        /* saldo akun per tanggal, bertanda searah saldo normal */
        function saldoAkunL(kode, asOf) {
            var a = findAkun(kode); if (!a) return 0;
            var m = mutasiAkun(kode, null, asOf);
            var mv = a.normal === 'Kredit' ? (m.kredit - m.debit) : (m.debit - m.kredit);
            return round2((Number(a.saldoAwal) || 0) + mv);
        }
        function nilaiLR(a, from, to) {
            var m = mutasiAkun(a.kode, from, to);
            return round2(a.normal === 'Kredit' ? (m.kredit - m.debit) : (m.debit - m.kredit));
        }
        function computeLabaRugi(from, to) {
            var d = { pendapatan: [], diskon: [], hpp: [], bebanOp: [], pendLain: [], bebanLain: [] };
            akunAktif(function (a) { return a.laporan === 'Laba Rugi'; }).forEach(function (a) {
                var v = nilaiLR(a, from, to);
                if (!v) return;
                var row = { kode: a.kode, nama: a.nama, nilai: v };
                if (a.kelompok === 'Pendapatan' && a.normal === 'Debit') d.diskon.push(row);
                else if (a.kelompok === 'Pendapatan' && a.sub === 'Lainnya') d.pendLain.push(row);
                else if (a.kelompok === 'Pendapatan') d.pendapatan.push(row);
                else if (a.kelompok === 'HPP') d.hpp.push(row);
                else if (a.kelompok === 'Beban' && a.sub === 'Operasional') d.bebanOp.push(row);
                else d.bebanLain.push(row);
            });
            function sum(baris) { var s = 0; baris.forEach(function (r) { s += r.nilai; }); return round2(s); }
            d.totPendapatan = sum(d.pendapatan); d.totDiskon = sum(d.diskon);
            d.pendapatanBersih = round2(d.totPendapatan - d.totDiskon);
            d.totHPP = sum(d.hpp);
            d.labaKotor = round2(d.pendapatanBersih - d.totHPP);
            d.totBebanOp = sum(d.bebanOp);
            d.labaUsaha = round2(d.labaKotor - d.totBebanOp);
            d.totPendLain = sum(d.pendLain); d.totBebanLain = sum(d.bebanLain);
            d.labaBersih = round2(d.labaUsaha + d.totPendLain - d.totBebanLain);
            return d;
        }
        function labaBerjalan(asOf) { return computeLabaRugi(null, asOf).labaBersih; }

        /* ============ HALAMAN: DAFTAR AKUN (COA) ============ */
        function renderCOA(f) {
            var wasSearching = document.activeElement && document.activeElement.classList.contains('search');
            f = (f || '').toLowerCase();
            var selisih = 0;
            (DB.coa || []).forEach(function (a) {
                if (a.laporan !== 'Neraca' || a.status === 'Header') return;
                var s = Number(a.saldoAwal) || 0;
                selisih += a.normal === 'Kredit' ? -s : s;
            });
            selisih = round2(selisih);
            var html = '<div class="page-head"><div><h2>Daftar Akun (COA)</h2><div class="sub">Chart of Accounts &middot; dasar seluruh jurnal &amp; laporan keuangan</div></div>' +
                '<button class="btn btn-primary" onclick="formAkun()">＋ Tambah Akun</button></div>';
            if (selisih !== 0) {
                html += '<div class="panel"><div class="panel-body" style="color:#b91c1c;font-weight:600">⚠️ Saldo awal belum seimbang. Selisih Debit − Kredit: ' + money(selisih) + '. Neraca tidak akan balance sebelum saldo awal seimbang.</div></div>';
            }
            html += '<div class="panel"><div class="panel-head"><input class="search" placeholder="Cari kode / nama akun..." value="' + esc(f) + '" oninput="renderCOA(this.value)">' +
                '<button class="btn btn-ghost btn-sm" onclick="printCOA()">🖨️ Cetak Daftar Akun</button></div><div class="panel-body">';
            html += '<table class="grid"><thead><tr><th>Kode</th><th>Nama Akun</th><th>Sub Kelompok</th><th>Laporan</th><th class="ctr">Normal</th><th class="num">Saldo Awal</th><th class="ctr">Status</th><th></th></tr></thead><tbody>';
            (DB.coa || []).forEach(function (a) {
                if (f && (a.kode + ' ' + a.nama).toLowerCase().indexOf(f) < 0) return;
                if (a.status === 'Header') {
                    html += '<tr style="background:#eef2ff;font-weight:700"><td>' + esc(a.kode) + '</td><td colspan="7">' + esc(a.nama) + '</td></tr>';
                    return;
                }
                var nonaktif = a.status !== 'Aktif';
                html += '<tr' + (nonaktif ? ' style="opacity:.5"' : '') + '><td><b>' + esc(a.kode) + '</b></td><td>' + esc(a.nama) + '</td><td>' + esc(a.sub) + '</td><td>' + esc(a.laporan) + '</td>' +
                    '<td class="ctr"><span class="tag ' + (a.normal === 'Kredit' ? 'out' : 'in') + '">' + esc(a.normal) + '</span></td>' +
                    '<td class="num">' + (a.laporan === 'Neraca' ? fmt(a.saldoAwal || 0) : '—') + '</td>' +
                    '<td class="ctr">' + (nonaktif ? '<span class="tag low">Nonaktif</span>' : '<span class="tag in">Aktif</span>') + '</td>' +
                    '<td class="row-actions"><button class="btn btn-ghost btn-sm" onclick="formAkun(\'' + esc(a.kode) + '\')">Edit</button>' +
                    '<button class="btn btn-danger btn-sm" onclick="delAkun(\'' + esc(a.kode) + '\')">Hapus</button></td></tr>';
            });
            html += '</tbody></table></div></div>';
            document.getElementById('main').innerHTML = html;
            if (wasSearching) {
                var si = document.getElementById('main').querySelector('.search');
                if (si) { si.focus(); si.setSelectionRange(si.value.length, si.value.length); }
            }
        }
        function formAkun(kode) {
            var a = kode ? findAkun(kode) : { kode: '', nama: '', kelompok: 'Aset', sub: '', laporan: 'Neraca', normal: 'Debit', status: 'Aktif', saldoAwal: 0 };
            if (!a) return;
            openModal(
                '<div class="modal-head"><h3>' + (kode ? 'Edit' : 'Tambah') + ' Akun</h3><button class="x" onclick="closeModal()">&times;</button></div>' +
                '<div class="modal-body">' +
                '<input type="hidden" id="aOld" value="' + esc(kode || '') + '">' +
                '<div class="grid2">' + fld('Kode Akun', 'aKode', a.kode) + fld('Nama Akun', 'aNama', a.nama) + '</div>' +
                '<div class="grid3">' + selField('Kelompok', 'aKel', ['Aset', 'Liabilitas', 'Ekuitas', 'Pendapatan', 'HPP', 'Beban', 'Header'], a.kelompok) +
                fld('Sub Kelompok', 'aSub', a.sub) +
                selField('Laporan', 'aLap', ['Neraca', 'Laba Rugi'], a.laporan) + '</div>' +
                '<div class="grid3">' + selField('Saldo Normal', 'aNor', ['Debit', 'Kredit'], a.normal || 'Debit') +
                selField('Status', 'aSta', ['Aktif', 'Nonaktif', 'Header'], a.status) +
                fldNum('Saldo Awal', 'aAwal', a.saldoAwal || 0) + '</div>' +
                '<div class="hint">Saldo awal hanya berlaku untuk akun Neraca, diisi searah saldo normal akun (boleh negatif). Pastikan total saldo awal Debit = Kredit agar Neraca balance.</div>' +
                '</div>' +
                '<div class="modal-foot"><button class="btn btn-ghost" onclick="closeModal()">Batal</button>' +
                '<button class="btn btn-primary" onclick="saveAkun()">Simpan</button></div>'
            );
            attachNumInputs();
        }
        function saveAkun() {
            auditLog("COA", "Simpan akun " + val("cKode"));
            var old = val('aOld'), kode = val('aKode').trim(), nama = val('aNama').trim();
            if (!kode || !nama) { toast('Kode dan Nama akun wajib diisi', 'err'); return; }
            var dup = (DB.coa || []).find(function (x) { return String(x.kode) === kode && String(x.kode) !== old; });
            if (dup) { toast('Kode akun sudah dipakai', 'err'); return; }
            var obj = {
                kode: kode, nama: nama, kelompok: val('aKel'), sub: val('aSub').trim(),
                laporan: val('aLap'), normal: val('aNor'), status: val('aSta'), saldoAwal: parseNum(val('aAwal'))
            };
            if (old) {
                var i = DB.coa.findIndex(function (x) { return String(x.kode) === old; });
                DB.coa[i] = obj;
            } else {
                DB.coa.push(obj);
                DB.coa.sort(function (a, b) { return String(a.kode).localeCompare(String(b.kode)); });
            }
            persist(); closeModal(); renderCOA(); toast('Akun tersimpan', 'ok');
        }
        function delAkun(kode) {
            auditLog("COA", "Hapus akun " + kode);
            var used = (DB.jurnal || []).some(function (j) { return (j.lines || []).some(function (l) { return String(l.akun) === String(kode); }); });
            if (used) { toast('Akun dipakai di jurnal — nonaktifkan saja lewat Edit', 'err'); return; }
            var core = Object.keys(AKM).some(function (k) { return AKM[k] === String(kode); });
            if (core) { toast('Akun inti sistem tidak boleh dihapus', 'err'); return; }
            var a = findAkun(kode);
            if (!confirm('Hapus akun ' + kode + ' — ' + (a ? a.nama : '') + '?')) return;
            DB.coa = DB.coa.filter(function (x) { return String(x.kode) !== String(kode); });
            persist(); renderCOA(); toast('Akun dihapus', 'ok');
        }
        function printCOA() {
            var rows = '';
            (DB.coa || []).forEach(function (a) {
                if (a.status === 'Header') {
                    rows += '<tr style="background:#eef2ff;font-weight:700"><td>' + esc(a.kode) + '</td><td colspan="5">' + esc(a.nama) + '</td></tr>';
                    return;
                }
                rows += '<tr><td>' + esc(a.kode) + '</td><td>' + esc(a.nama) + '</td><td>' + esc(a.sub) + '</td><td>' + esc(a.laporan) + '</td><td>' + esc(a.normal) + '</td><td class="num">' + (a.laporan === 'Neraca' ? fmt(a.saldoAwal || 0) : '—') + '</td></tr>';
            });
            var html = docHeader('DAFTAR AKUN (COA)', 'Chart of Accounts', 'Per Tanggal', fmtDate(todayStr()), todayStr()) +
                '<table class="doc-tbl"><thead><tr><th>Kode</th><th>Nama Akun</th><th>Sub Kelompok</th><th>Laporan</th><th>Normal</th><th class="num">Saldo Awal</th></tr></thead><tbody>' +
                rows + '</tbody></table>' + docFoot();
            doPrint(html);
        }

        /* ============ HALAMAN: JURNAL UMUM ============ */
        function renderJurnal(from, to) {
            if (!from) { var d = new Date(); from = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-01'; }
            if (!to) to = todayStr();
            var list = jurnalSorted().filter(function (j) { return inRange(j.tanggal, from, to); }).reverse();
            var totD = 0, totK = 0;
            list.forEach(function (j) { (j.lines || []).forEach(function (l) { totD += Number(l.debit) || 0; totK += Number(l.kredit) || 0; }); });
            var html = '<div class="page-head"><div><h2>Jurnal Umum</h2><div class="sub">Jurnal otomatis dari transaksi + jurnal manual (penyesuaian, penyusutan, dll.)</div></div>' +
                '<button class="btn btn-primary" onclick="formJurnal()">＋ Jurnal Manual</button></div>';
            html += '<div class="panel"><div class="panel-head"><div class="toolbar">' +
                '<div class="field" style="margin-bottom:0"><input type="date" id="jrFrom" value="' + from + '"></div>' +
                '<span style="margin:0 10px">s/d</span>' +
                '<div class="field" style="margin-bottom:0"><input type="date" id="jrTo" value="' + to + '"></div>' +
                '<button class="btn btn-primary btn-sm" onclick="renderJurnal(val(\'jrFrom\'), val(\'jrTo\'))">Tampilkan</button></div>' +
                '<button class="btn btn-ghost btn-sm" onclick="printJurnal(\'' + from + '\',\'' + to + '\')">🖨️ Cetak</button></div><div class="panel-body">';
            if (!list.length) { html += '<div class="empty">Tidak ada jurnal pada periode ini.</div>'; }
            else {
                html += '<table class="grid"><thead><tr><th>Tanggal</th><th>No. Jurnal</th><th>Akun / Keterangan</th><th class="num">Debit</th><th class="num">Kredit</th><th></th></tr></thead><tbody>';
                list.forEach(function (j) {
                    html += '<tr style="background:#f8fafc"><td><b>' + fmtDate(j.tanggal) + '</b></td><td><b>' + esc(j.no) + '</b></td>' +
                        '<td colspan="2">' + esc(j.keterangan || '') + '</td>' +
                        '<td class="ctr">' + (j.auto ? '<span class="tag kas">otomatis</span>' : '<span class="tag in">manual</span>') + '</td>' +
                        '<td class="row-actions">' + (j.auto ? '' :
                            '<button class="btn btn-ghost btn-sm" onclick="formJurnal(\'' + j.id + '\')">Edit</button>' +
                            '<button class="btn btn-danger btn-sm" onclick="delJurnal(\'' + j.id + '\')">Hapus</button>') + '</td></tr>';
                    (j.lines || []).forEach(function (l) {
                        var isD = (Number(l.debit) || 0) > 0;
                        html += '<tr><td></td><td></td><td style="padding-left:' + (isD ? 18 : 40) + 'px">' + esc(l.akun) + ' — ' + esc(namaAkun(l.akun)) + '</td>' +
                            '<td class="num">' + (isD ? fmt(l.debit) : '') + '</td><td class="num">' + (isD ? '' : fmt(l.kredit)) + '</td><td></td></tr>';
                    });
                });
                html += '<tr style="font-weight:700;border-top:2px solid var(--ink)"><td colspan="3">TOTAL</td><td class="num">' + fmt(totD) + '</td><td class="num">' + fmt(totK) + '</td><td></td></tr>';
                html += '</tbody></table>';
            }
            html += '</div></div>';
            document.getElementById('main').innerHTML = html;
        }
        var jLines = [];
        function formJurnal(editId) {
            var x = editId ? (DB.jurnal || []).find(function (j) { return j.id === editId && !j.auto; }) : null;
            jLines = x ? JSON.parse(JSON.stringify(x.lines)) : [{ akun: '', debit: 0, kredit: 0 }, { akun: '', debit: 0, kredit: 0 }];
            openModal(
                '<div class="modal-head"><h3>Jurnal Manual ' + (x ? '(Edit)' : '') + '</h3><button class="x" onclick="closeModal()">&times;</button></div>' +
                '<div class="modal-body">' +
                '<input type="hidden" id="jEditId" value="' + (editId || '') + '">' +
                '<input type="hidden" id="jOldNo" value="' + (x ? esc(x.no) : '') + '">' +
                '<div class="grid2">' + fld('Tanggal', 'jTgl', x ? x.tanggal : todayStr(), 'date') + fld('Keterangan', 'jKet', x ? x.keterangan : '') + '</div>' +
                '<div id="jLinesWrap"></div>' +
                '<button class="btn btn-ghost btn-sm" style="margin-top:8px" onclick="jAdd()">＋ Tambah Baris</button>' +
                '<div class="totbox" style="margin-top:14px">' +
                '<div class="totrow"><span>Total Debit</span><span id="jTotD">0.00</span></div>' +
                '<div class="totrow"><span>Total Kredit</span><span id="jTotK">0.00</span></div>' +
                '<div class="totrow grand"><span>Selisih</span><span id="jSelisih">0.00</span></div>' +
                '</div>' +
                '</div>' +
                '<div class="modal-foot"><button class="btn btn-ghost" onclick="closeModal()">Batal</button>' +
                '<button class="btn btn-primary" onclick="saveJurnal()">Simpan Jurnal</button></div>'
            );
            jRender(); jCalc();
        }
        function jRender() {
            var h = '<table class="items"><thead><tr><th style="width:46%">Akun</th><th style="width:22%">Debit</th><th style="width:22%">Kredit</th><th></th></tr></thead><tbody>';
            jLines.forEach(function (l, i) {
                h += '<tr><td><select onchange="jUpd(' + i + ',\'akun\',this.value)"><option value="">— pilih akun —</option>' + akunOptions(l.akun) + '</select></td>' +
                    '<td><input class="num moneyIn" value="' + fmt(l.debit) + '" oninput="jUpd(' + i + ',\'debit\',this.value)"></td>' +
                    '<td><input class="num moneyIn" value="' + fmt(l.kredit) + '" oninput="jUpd(' + i + ',\'kredit\',this.value)"></td>' +
                    '<td><button class="btn btn-danger btn-sm" onclick="jRm(' + i + ')">✕</button></td></tr>';
            });
            h += '</tbody></table>';
            document.getElementById('jLinesWrap').innerHTML = h;
            attachNumInputs();
        }
        function jUpd(i, f, v) { jLines[i][f] = f === 'akun' ? v : parseNum(v); jCalc(); }
        function jAdd() { jLines.push({ akun: '', debit: 0, kredit: 0 }); jRender(); jCalc(); }
        function jRm(i) { jLines.splice(i, 1); if (jLines.length < 2) jLines.push({ akun: '', debit: 0, kredit: 0 }); jRender(); jCalc(); }
        function jCalc() {
            var d = 0, k = 0;
            jLines.forEach(function (l) { d += Number(l.debit) || 0; k += Number(l.kredit) || 0; });
            set('jTotD', fmt(d)); set('jTotK', fmt(k)); set('jSelisih', fmt(round2(d - k)));
            return { d: round2(d), k: round2(k) };
        }
        function saveJurnal() {
            auditLog("Jurnal", "Simpan jurnal");
            var lines = jLines.filter(function (l) { return l.akun && ((Number(l.debit) || 0) > 0 || (Number(l.kredit) || 0) > 0); })
                .map(function (l) { return { akun: String(l.akun), debit: round2(l.debit || 0), kredit: round2(l.kredit || 0) }; });
            if (lines.length < 2) { toast('Minimal 2 baris akun terisi', 'err'); return; }
            var bad = lines.some(function (l) { return l.debit > 0 && l.kredit > 0; });
            if (bad) { toast('Satu baris hanya boleh Debit ATAU Kredit', 'err'); return; }
            var t = jCalc();
            if (t.d <= 0 || round2(t.d - t.k) !== 0) { toast('Jurnal belum seimbang: total Debit harus sama dengan total Kredit', 'err'); return; }
            var editId = val('jEditId');
            if (editId) DB.jurnal = DB.jurnal.filter(function (j) { return j.id !== editId; });
            DB.jurnal.push({
                id: editId || uid(), no: val('jOldNo') || nextNo('JRN'), tanggal: val('jTgl') || todayStr(),
                keterangan: val('jKet').trim(), ref: '', auto: false, lines: lines
            });
            persist(); closeModal(); renderJurnal(); toast('Jurnal tersimpan', 'ok');
        }
        function delJurnal(id) {
            auditLog("Jurnal", "Hapus jurnal ID " + id);
            var j = (DB.jurnal || []).find(function (x) { return x.id === id; });
            if (!j || j.auto) return;
            if (!confirm('Hapus jurnal ' + j.no + '?')) return;
            DB.jurnal = DB.jurnal.filter(function (x) { return x.id !== id; });
            persist(); renderJurnal(); toast('Jurnal dihapus', 'ok');
        }
        function printJurnal(from, to) {
            var list = jurnalSorted().filter(function (j) { return inRange(j.tanggal, from, to); });
            var rows = '', totD = 0, totK = 0;
            list.forEach(function (j) {
                rows += '<tr style="background:#f1f5f9"><td><b>' + fmtDate(j.tanggal) + '</b></td><td><b>' + esc(j.no) + '</b></td><td colspan="3">' + esc(j.keterangan || '') + '</td></tr>';
                (j.lines || []).forEach(function (l) {
                    var isD = (Number(l.debit) || 0) > 0;
                    totD += Number(l.debit) || 0; totK += Number(l.kredit) || 0;
                    rows += '<tr><td></td><td></td><td style="padding-left:' + (isD ? 14 : 34) + 'px">' + esc(l.akun) + ' — ' + esc(namaAkun(l.akun)) + '</td>' +
                        '<td class="num">' + (isD ? fmt(l.debit) : '') + '</td><td class="num">' + (isD ? '' : fmt(l.kredit)) + '</td></tr>';
                });
            });
            var html = docHeader('JURNAL UMUM', 'Periode: ' + fmtDate(from) + ' s/d ' + fmtDate(to), 'Tanggal Cetak', fmtDate(todayStr()), todayStr()) +
                '<table class="doc-tbl"><thead><tr><th>Tanggal</th><th>No. Jurnal</th><th>Akun / Keterangan</th><th class="num">Debit</th><th class="num">Kredit</th></tr></thead><tbody>' +
                rows +
                '<tr style="font-weight:700"><td colspan="3">TOTAL</td><td class="num">' + fmt(totD) + '</td><td class="num">' + fmt(totK) + '</td></tr>' +
                '</tbody></table>' + docFoot();
            doPrint(html);
        }

        /* ============ HALAMAN: BUKU BESAR ============ */
        function bukuBesarData(kode, from, to) {
            var a = findAkun(kode);
            var awal = a ? (Number(a.saldoAwal) || 0) : 0;
            if (a && from) {
                var mb = mutasiAkun(kode, null, dayBefore(from));
                awal = round2(awal + (a.normal === 'Kredit' ? (mb.kredit - mb.debit) : (mb.debit - mb.kredit)));
            }
            var rows = [], run = awal, totD = 0, totK = 0;
            jurnalSorted().forEach(function (j) {
                if (!inRange(j.tanggal, from, to)) return;
                (j.lines || []).forEach(function (l) {
                    if (String(l.akun) !== String(kode)) return;
                    var d = Number(l.debit) || 0, k = Number(l.kredit) || 0;
                    totD += d; totK += k;
                    run = round2(run + (a && a.normal === 'Kredit' ? (k - d) : (d - k)));
                    rows.push({ tanggal: j.tanggal, no: j.no, ket: j.keterangan, debit: d, kredit: k, saldo: run });
                });
            });
            return { akun: a, awal: round2(awal), rows: rows, totD: round2(totD), totK: round2(totK), akhir: run };
        }
        function dayBefore(ymd) {
            var d = new Date(ymd + 'T00:00:00'); d.setDate(d.getDate() - 1);
            return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        }
        function renderBukuBesar(kode, from, to) {
            if (!from) { var d = new Date(); from = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-01'; }
            if (!to) to = todayStr();
            kode = kode || AKM.kas;
            var bb = bukuBesarData(kode, from, to);
            var html = '<div class="page-head"><div><h2>Buku Besar</h2><div class="sub">Mutasi per akun dengan saldo berjalan</div></div></div>';
            html += '<div class="panel"><div class="panel-head"><div class="toolbar">' +
                '<select id="bbAkun" style="padding:8px 12px;border:1px solid var(--line);border-radius:8px;font-size:13px;max-width:300px" onchange="renderBukuBesar(this.value, val(\'bbFrom\'), val(\'bbTo\'))">' + akunOptions(kode) + '</select>' +
                '<div class="field" style="margin-bottom:0;margin-left:8px"><input type="date" id="bbFrom" value="' + from + '"></div>' +
                '<span style="margin:0 8px">s/d</span>' +
                '<div class="field" style="margin-bottom:0"><input type="date" id="bbTo" value="' + to + '"></div>' +
                '<button class="btn btn-primary btn-sm" style="margin-left:8px" onclick="renderBukuBesar(val(\'bbAkun\'), val(\'bbFrom\'), val(\'bbTo\'))">Tampilkan</button></div>' +
                '<button class="btn btn-ghost btn-sm" onclick="printBukuBesar(val(\'bbAkun\'),\'' + from + '\',\'' + to + '\')">🖨️ Cetak</button></div><div class="panel-body">';
            html += '<div class="hint" style="margin-bottom:10px">Akun: <b>' + esc(kode) + ' — ' + esc(namaAkun(kode)) + '</b> &middot; Saldo normal: ' + (bb.akun ? esc(bb.akun.normal) : '-') + '</div>';
            html += '<table class="grid"><thead><tr><th>Tanggal</th><th>No. Jurnal</th><th>Keterangan</th><th class="num">Debit</th><th class="num">Kredit</th><th class="num">Saldo</th></tr></thead><tbody>';
            html += '<tr style="background:#f8fafc;font-weight:600"><td colspan="5">Saldo Awal (' + fmtDate(from) + ')</td><td class="num">' + fmt(bb.awal) + '</td></tr>';
            bb.rows.forEach(function (r) {
                html += '<tr><td>' + fmtDate(r.tanggal) + '</td><td>' + esc(r.no) + '</td><td>' + esc(r.ket || '') + '</td>' +
                    '<td class="num">' + (r.debit ? fmt(r.debit) : '-') + '</td><td class="num">' + (r.kredit ? fmt(r.kredit) : '-') + '</td><td class="num">' + fmt(r.saldo) + '</td></tr>';
            });
            html += '<tr style="font-weight:700;border-top:2px solid var(--ink)"><td colspan="3">Mutasi &amp; Saldo Akhir</td><td class="num">' + fmt(bb.totD) + '</td><td class="num">' + fmt(bb.totK) + '</td><td class="num">' + fmt(bb.akhir) + '</td></tr>';
            html += '</tbody></table></div></div>';
            document.getElementById('main').innerHTML = html;
        }
        function printBukuBesar(kode, from, to) {
            var bb = bukuBesarData(kode, from, to);
            var rows = '<tr style="font-weight:600"><td colspan="5">Saldo Awal</td><td class="num">' + fmt(bb.awal) + '</td></tr>';
            bb.rows.forEach(function (r) {
                rows += '<tr><td>' + fmtDate(r.tanggal) + '</td><td>' + esc(r.no) + '</td><td>' + esc(r.ket || '') + '</td>' +
                    '<td class="num">' + (r.debit ? fmt(r.debit) : '-') + '</td><td class="num">' + (r.kredit ? fmt(r.kredit) : '-') + '</td><td class="num">' + fmt(r.saldo) + '</td></tr>';
            });
            var html = docHeader('BUKU BESAR', esc(kode) + ' — ' + esc(namaAkun(kode)) + ' · Periode ' + fmtDate(from) + ' s/d ' + fmtDate(to), 'Tanggal Cetak', fmtDate(todayStr()), todayStr()) +
                '<table class="doc-tbl"><thead><tr><th>Tanggal</th><th>No. Jurnal</th><th>Keterangan</th><th class="num">Debit</th><th class="num">Kredit</th><th class="num">Saldo</th></tr></thead><tbody>' +
                rows +
                '<tr style="font-weight:700"><td colspan="3">Mutasi &amp; Saldo Akhir</td><td class="num">' + fmt(bb.totD) + '</td><td class="num">' + fmt(bb.totK) + '</td><td class="num">' + fmt(bb.akhir) + '</td></tr>' +
                '</tbody></table>' + docFoot();
            doPrint(html);
        }

        /* ============ HALAMAN: NERACA SALDO ============ */
        function neracaSaldoData(asOf) {
            var rows = [], totD = 0, totK = 0;
            akunAktif().forEach(function (a) {
                var s = saldoAkunL(a.kode, asOf);
                var m = mutasiAkun(a.kode, null, asOf);
                if (!s && !m.debit && !m.kredit && !(Number(a.saldoAwal) || 0)) return;
                var deb = 0, kre = 0;
                if (a.normal === 'Kredit') { if (s >= 0) kre = s; else deb = -s; }
                else { if (s >= 0) deb = s; else kre = -s; }
                totD += deb; totK += kre;
                rows.push({ kode: a.kode, nama: a.nama, debit: round2(deb), kredit: round2(kre) });
            });
            return { rows: rows, totD: round2(totD), totK: round2(totK) };
        }
        function renderNeracaSaldo(asOf) {
            asOf = asOf || todayStr();
            var ns = neracaSaldoData(asOf);
            var balanced = ns.totD === ns.totK;
            var html = '<div class="page-head"><div><h2>Neraca Saldo</h2><div class="sub">Trial balance — saldo seluruh akun per tanggal</div></div></div>';
            html += '<div class="panel"><div class="panel-head"><div class="toolbar">' +
                '<span style="margin-right:8px">Per tanggal</span><div class="field" style="margin-bottom:0"><input type="date" id="nsTgl" value="' + asOf + '"></div>' +
                '<button class="btn btn-primary btn-sm" style="margin-left:8px" onclick="renderNeracaSaldo(val(\'nsTgl\'))">Tampilkan</button></div>' +
                '<button class="btn btn-ghost btn-sm" onclick="printNeracaSaldo(\'' + asOf + '\')">🖨️ Cetak</button></div><div class="panel-body">';
            if (!balanced) html += '<div style="color:#b91c1c;font-weight:600;margin-bottom:10px">⚠️ Tidak seimbang — periksa saldo awal di menu Daftar Akun (COA).</div>';
            html += '<table class="grid"><thead><tr><th>Kode</th><th>Nama Akun</th><th class="num">Debit</th><th class="num">Kredit</th></tr></thead><tbody>';
            ns.rows.forEach(function (r) {
                html += '<tr><td><b>' + esc(r.kode) + '</b></td><td>' + esc(r.nama) + '</td><td class="num">' + (r.debit ? fmt(r.debit) : '-') + '</td><td class="num">' + (r.kredit ? fmt(r.kredit) : '-') + '</td></tr>';
            });
            html += '<tr style="font-weight:700;border-top:2px solid var(--ink)"><td colspan="2">TOTAL</td><td class="num">' + fmt(ns.totD) + '</td><td class="num">' + fmt(ns.totK) + '</td></tr>';
            html += '</tbody></table></div></div>';
            document.getElementById('main').innerHTML = html;
        }
        function printNeracaSaldo(asOf) {
            var ns = neracaSaldoData(asOf);
            var rows = ns.rows.map(function (r) {
                return '<tr><td>' + esc(r.kode) + '</td><td>' + esc(r.nama) + '</td><td class="num">' + (r.debit ? fmt(r.debit) : '-') + '</td><td class="num">' + (r.kredit ? fmt(r.kredit) : '-') + '</td></tr>';
            }).join('');
            var html = docHeader('NERACA SALDO', 'Per Tanggal ' + fmtDate(asOf), 'Tanggal Cetak', fmtDate(todayStr()), todayStr()) +
                '<table class="doc-tbl"><thead><tr><th>Kode</th><th>Nama Akun</th><th class="num">Debit</th><th class="num">Kredit</th></tr></thead><tbody>' +
                rows +
                '<tr style="font-weight:700"><td colspan="2">TOTAL</td><td class="num">' + fmt(ns.totD) + '</td><td class="num">' + fmt(ns.totK) + '</td></tr>' +
                '</tbody></table>' + docFoot();
            doPrint(html);
        }

        /* ============ HALAMAN: LABA RUGI (berbasis buku besar) ============ */
        function lrRowsHtml(rows, minus) {
            return rows.map(function (r) {
                return '<tr><td style="padding-left:20px;">' + esc(r.kode) + ' — ' + esc(r.nama) + '</td><td class="num"' + (minus ? ' style="color:red;"' : '') + '>' + (minus ? '- ' : '') + money(r.nilai) + '</td></tr>';
            }).join('');
        }
        function labaRugiHtml(d) {
            var h = '<tr><td colspan="2"><b>PENDAPATAN USAHA</b></td></tr>' + lrRowsHtml(d.pendapatan, false);
            if (d.diskon.length) h += lrRowsHtml(d.diskon, true);
            h += '<tr style="border-top:1px solid #e5e7eb;font-weight:bold;"><td style="padding-left:20px;">Pendapatan Bersih</td><td class="num">' + money(d.pendapatanBersih) + '</td></tr>';
            h += '<tr><td colspan="2" style="padding-top:15px;"><b>HARGA POKOK PENJUALAN (HPP)</b></td></tr>' + lrRowsHtml(d.hpp, true);
            h += '<tr style="border-top:2px solid #1e40af;font-weight:bold;font-size:14px;"><td style="padding-top:10px;">LABA KOTOR</td><td class="num" style="padding-top:10px;color:#1e40af;">' + money(d.labaKotor) + '</td></tr>';
            h += '<tr><td colspan="2" style="padding-top:15px;"><b>BEBAN OPERASIONAL</b></td></tr>' + lrRowsHtml(d.bebanOp, true);
            h += '<tr style="border-top:1px solid #e5e7eb;font-weight:bold;"><td>LABA USAHA</td><td class="num">' + money(d.labaUsaha) + '</td></tr>';
            h += '<tr><td colspan="2" style="padding-top:15px;"><b>PENDAPATAN &amp; BEBAN LAIN-LAIN</b></td></tr>' +
                lrRowsHtml(d.pendLain, false) + lrRowsHtml(d.bebanLain, true);
            h += '<tr style="border-top:2px solid #1e40af;font-weight:bold;font-size:15px;"><td style="padding-top:10px;">LABA BERSIH</td><td class="num" style="padding-top:10px;color:#1e40af;">' + money(d.labaBersih) + '</td></tr>';
            return h;
        }
        function renderRugiLaba(tglMulai, tglSelesai) {
            if (!tglMulai) {
                var d = new Date();
                tglMulai = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-01';
            }
            if (!tglSelesai) tglSelesai = todayStr();
            var lr = computeLabaRugi(tglMulai, tglSelesai);
            var html = '<div class="page-head"><div><h2>Laporan Laba Rugi</h2><div class="sub">Dihitung dari buku besar (jurnal otomatis + manual)</div></div></div>';
            html += '<div class="panel"><div class="panel-head"><div class="toolbar">' +
                '<div class="field" style="margin-bottom:0"><input type="date" id="rlMulai" value="' + tglMulai + '"></div>' +
                '<span style="margin:0 10px">s/d</span>' +
                '<div class="field" style="margin-bottom:0"><input type="date" id="rlSelesai" value="' + tglSelesai + '"></div>' +
                '<button class="btn btn-primary btn-sm" onclick="renderRugiLaba(val(\'rlMulai\'), val(\'rlSelesai\'))">Tampilkan</button>' +
                '</div><button class="btn btn-ghost btn-sm" onclick="printRugiLaba(\'' + tglMulai + '\',\'' + tglSelesai + '\')">🖨️ Cetak</button></div><div class="panel-body">';
            html += '<table style="width:100%; max-width:640px; font-size:14px; line-height:1.8;">' + labaRugiHtml(lr) + '</table>';
            html += '</div></div>';
            document.getElementById('main').innerHTML = html;
        }
        function printRugiLaba(tglMulai, tglSelesai) {
            var lr = computeLabaRugi(tglMulai, tglSelesai);
            var html = docHeader('LAPORAN LABA RUGI', 'Periode: ' + fmtDate(tglMulai) + ' s/d ' + fmtDate(tglSelesai), 'Tanggal Cetak', fmtDate(todayStr()), todayStr()) +
                '<table class="doc-tbl" style="max-width:640px;margin:20px auto;"><tbody>' + labaRugiHtml(lr) + '</tbody></table>' +
                docFoot();
            doPrint(html);
        }

        /* ============ HALAMAN: NERACA ============ */
        function neracaData(asOf) {
            var out = { aset: [], liab: [], ekuitas: [], totAset: 0, totLiab: 0, totEkuitas: 0 };
            akunAktif(function (a) { return a.laporan === 'Neraca'; }).forEach(function (a) {
                var s = saldoAkunL(a.kode, asOf);
                if (!s) return;
                var row = { kode: a.kode, nama: a.nama, sub: a.sub, nilai: s };
                if (a.kelompok === 'Aset') { out.aset.push(row); out.totAset += (a.normal === 'Kredit' ? -s : s); }
                else if (a.kelompok === 'Liabilitas') { out.liab.push(row); out.totLiab += s; }
                else if (a.kelompok === 'Ekuitas') { out.ekuitas.push(row); out.totEkuitas += s; }
            });
            out.laba = labaBerjalan(asOf);
            out.totAset = round2(out.totAset); out.totLiab = round2(out.totLiab);
            out.totEkuitas = round2(out.totEkuitas + out.laba);
            out.totPasiva = round2(out.totLiab + out.totEkuitas);
            out.selisih = round2(out.totAset - out.totPasiva);
            return out;
        }
        function neracaHtml(n) {
            function rows(baris, kontra) {
                return baris.map(function (r) {
                    var a = findAkun(r.kode);
                    var v = (a && a.kelompok === 'Aset' && a.normal === 'Kredit') ? -r.nilai : r.nilai;
                    return '<tr><td style="padding-left:20px;">' + esc(r.kode) + ' — ' + esc(r.nama) + '</td><td class="num">' + money(v) + '</td></tr>';
                }).join('');
            }
            var h = '<tr><td colspan="2"><b>ASET</b></td></tr>' + rows(n.aset) +
                '<tr style="border-top:2px solid #1e40af;font-weight:bold;"><td>TOTAL ASET</td><td class="num" style="color:#1e40af;">' + money(n.totAset) + '</td></tr>';
            h += '<tr><td colspan="2" style="padding-top:18px;"><b>LIABILITAS</b></td></tr>' + (n.liab.length ? rows(n.liab) : '<tr><td style="padding-left:20px;">-</td><td class="num">' + money(0) + '</td></tr>') +
                '<tr style="border-top:1px solid #e5e7eb;font-weight:bold;"><td>Total Liabilitas</td><td class="num">' + money(n.totLiab) + '</td></tr>';
            h += '<tr><td colspan="2" style="padding-top:15px;"><b>EKUITAS</b></td></tr>' + rows(n.ekuitas) +
                '<tr><td style="padding-left:20px;">Laba (Rugi) Berjalan</td><td class="num">' + money(n.laba) + '</td></tr>' +
                '<tr style="border-top:1px solid #e5e7eb;font-weight:bold;"><td>Total Ekuitas</td><td class="num">' + money(n.totEkuitas) + '</td></tr>';
            h += '<tr style="border-top:2px solid #1e40af;font-weight:bold;font-size:15px;"><td style="padding-top:10px;">TOTAL LIABILITAS + EKUITAS</td><td class="num" style="padding-top:10px;color:#1e40af;">' + money(n.totPasiva) + '</td></tr>';
            return h;
        }
        function renderNeraca(asOf) {
            asOf = asOf || todayStr();
            var n = neracaData(asOf);
            var html = '<div class="page-head"><div><h2>Neraca</h2><div class="sub">Laporan posisi keuangan per tanggal</div></div></div>';
            html += '<div class="panel"><div class="panel-head"><div class="toolbar">' +
                '<span style="margin-right:8px">Per tanggal</span><div class="field" style="margin-bottom:0"><input type="date" id="nrTgl" value="' + asOf + '"></div>' +
                '<button class="btn btn-primary btn-sm" style="margin-left:8px" onclick="renderNeraca(val(\'nrTgl\'))">Tampilkan</button></div>' +
                '<button class="btn btn-ghost btn-sm" onclick="printNeraca(\'' + asOf + '\')">🖨️ Cetak</button></div><div class="panel-body">';
            if (n.selisih !== 0) html += '<div style="color:#b91c1c;font-weight:600;margin-bottom:10px">⚠️ Neraca tidak balance (selisih ' + money(n.selisih) + '). Periksa saldo awal di menu Daftar Akun (COA).</div>';
            html += '<table style="width:100%; max-width:640px; font-size:14px; line-height:1.8;">' + neracaHtml(n) + '</table>';
            html += '</div></div>';
            document.getElementById('main').innerHTML = html;
        }
        function printNeraca(asOf) {
            var n = neracaData(asOf);
            var html = docHeader('NERACA', 'Laporan Posisi Keuangan per ' + fmtDate(asOf), 'Tanggal Cetak', fmtDate(todayStr()), todayStr()) +
                '<table class="doc-tbl" style="max-width:640px;margin:20px auto;"><tbody>' + neracaHtml(n) + '</tbody></table>' +
                docFoot();
            doPrint(html);
        }

        /* PENGATURAN */
        function renderPengaturan() {
            var html = '<div class="page-head"><div><h2>Pengaturan</h2><div class="sub">Identitas perusahaan &amp; koneksi Google Spreadsheet</div></div></div>';
            html += '<div class="panel"><div class="panel-head"><h3>Identitas Perusahaan</h3></div><div class="panel-body">' +
                '<div class="grid2">' + fld('Nama Perusahaan', 'cNama', CFG.company) + fld('Telepon', 'cTelp', CFG.phone) + '</div>' +
                fldArea('Alamat', 'cAlamat', CFG.address) +
                '<div class="grid2">' + fld('Email', 'cEmail', CFG.email) + fld('NPWP', 'cNpwp', CFG.npwp) + '</div>' +
                '<div class="grid2">' + fldNum('Pajak Default (%)', 'cTax', CFG.taxDefault) + fld('Simbol Mata Uang', 'cCur', CFG.currency) + '</div>' +
                '<div class="grid2"><div class="field"><label>Sesi Login Berakhir Setelah (jam tanpa aktivitas)</label>' +
                '<input id="cSesi" type="number" min="1" max="720" value="' + (Number(CFG.sessionJam) || 12) + '">' +
                '<div class="hint" style="margin-top:4px">Lewat batas ini, pengguna diminta login ulang. Isi 1–720 jam.</div></div><div></div></div>' +
                '<div class="field"><label>Logo Perusahaan</label>' +
                '<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onchange="readLogo(this)">' +
                '<input type="hidden" id="cLogo" value="' + esc(CFG.logo) + '">' +
                '<div style="display:flex;align-items:center;gap:12px;margin-top:8px;flex-wrap:wrap">' +
                '<img id="logoPreview" src="' + esc(CFG.logo) + '" style="' + (CFG.logo ? '' : 'display:none') + '">' +
                '<button class="btn btn-ghost btn-sm" onclick="hapusLogo()">🗑️ Hapus Logo</button>' +
                '<span class="hint" id="logoInfo"></span></div>' +
                '<div class="hint" style="margin-top:6px">Tampil di sidebar, layar login, ikon tab, dan kop dokumen cetak. ' +
                'Gambar otomatis dikecilkan ke maksimal 256px. PNG berlatar transparan paling bagus.</div></div>' +
                '<button class="btn btn-primary" style="margin-top:14px;" onclick="saveCfg()">Simpan Pengaturan</button>' +
                '</div></div>';
            html += '<div class="panel"><div class="panel-head"><h3>Koneksi Google Spreadsheet</h3></div><div class="panel-body">' +
                '<div class="hint" style="margin-bottom:10px">Tempel URL Web App dari Apps Script (lihat panduan). Jika kosong, data tersimpan di browser ini saja.</div>' +
                fld('URL Web App (Apps Script)', 'cApi', CFG.apiUrl) +
                '<div style="display:flex;gap:10px;flex-wrap:wrap">' +
                '<button class="btn btn-primary" onclick="saveApi()">Simpan &amp; Uji Koneksi</button>' +
                '<button class="btn btn-ghost" onclick="doPull()">⬇️ Tarik Data dari Sheet</button>' +
                '<button class="btn btn-ghost" onclick="doPush()">⬆️ Kirim Data ke Sheet</button>' +
                '</div>' +
                '<div class="divider"></div>' +
                '<div class="hint">Spreadsheet target: <b>Test Program</b><br>ID: <code>1xyar-gvMNp4d-PTNsrNUlCRy4oC7H85ruEwtI7qF5oU</code></div>' +
                '</div></div>';
            html += '<div class="panel"><div class="panel-head"><h3>Data</h3></div><div class="panel-body">' +
                '<div style="display:flex;gap:10px;flex-wrap:wrap">' +
                '<button class="btn btn-ghost" onclick="exportJSON()">⬇️ Backup (JSON)</button>' +
                '<button class="btn btn-ghost" onclick="document.getElementById(\'impFile\').click()">⬆️ Restore</button>' +
                '<input type="file" id="impFile" style="display:none" accept=".json" onchange="importJSON(this)">' +
                '<button class="btn btn-ghost" onclick="diagnosaSheet()">🩺 Diagnosa Spreadsheet</button>' +
                '<button class="btn btn-ghost" onclick="periksaJurnalJasa()">🔍 Periksa Pemetaan Jurnal</button>' +
                '<button class="btn btn-ghost" style="border-color:var(--warn);color:var(--warn)" onclick="resetTransaksi()">🧹 Hapus Transaksi Saja</button>' +
                '<button class="btn btn-danger" onclick="resetAll()">🗑️ Hapus Semua Data</button>' +
                '</div>' +
                '<div class="hint" style="margin-top:10px">' +
                '<b>Hapus Transaksi Saja</b> — mengosongkan penjualan, pembelian, quotation, modal, kas/bank, jurnal, transfer stok, dan log; ' +
                'menolkan qty stok di semua gudang. Master <b>Gudang</b>, <b>COA</b>, <b>Barang</b>, dan <b>Pengguna</b> tetap utuh.<br>' +
                '<b>Hapus Semua Data</b> — mengosongkan semuanya termasuk master barang. Backup dulu sebelum memakai keduanya.' +
                '</div></div></div>';
            
            
            html += '<div class="panel"><div class="panel-head"><h3>Log Aktivitas (Audit Trail)</h3></div><div class="panel-body" style="max-height: 400px; overflow-y: auto;">' +
                '<table class="grid"><thead><tr><th>Waktu</th><th>User</th><th>Modul</th><th>Aksi</th></tr></thead><tbody>';
            var logs = (DB.audit || []).slice().reverse(); // Show latest first
            if(logs.length === 0) {
                html += '<tr><td colspan="4" class="text-center text-muted">Belum ada aktivitas</td></tr>';
            } else {
                logs.forEach(function(l) {
                    var d = new Date(l.ts);
                    var tsStr = d.toLocaleDateString('id-ID') + ' ' + d.toLocaleTimeString('id-ID');
                    html += '<tr>' +
                        '<td>' + tsStr + '</td>' +
                        '<td>' + esc(l.user) + '</td>' +
                        '<td>' + esc(l.module) + '</td>' +
                        '<td>' + esc(l.action) + '</td>' +
                        '</tr>';
                });
            }
            html += '</tbody></table></div></div>';

            html += '<div class="panel"><div class="panel-head"><h3>Manajemen Pengguna</h3></div><div class="panel-body">' +
                '<div class="hint" style="margin-bottom:10px">Pembuatan user login dan pengaturan hak akses menu kini berada di menu tersendiri.</div>' +
                '<button class="btn btn-primary btn-sm" onclick="go(\'users\')">👥 Buka Pengguna &amp; Hak Akses</button>' +
                '</div></div>';

            document.getElementById('main').innerHTML = html;
        }

        /* ================= HALAMAN PENGGUNA & HAK AKSES ================= */
        function renderUsers() {
            if (!isAdmin()) {
                document.getElementById('main').innerHTML =
                    '<div class="page-head"><div><h2>Pengguna &amp; Hak Akses</h2></div></div>' +
                    '<div class="panel"><div class="panel-body">Hanya Admin yang dapat membuka halaman ini.</div></div>';
                return;
            }
            var html = '<div class="page-head"><div><h2>Pengguna &amp; Hak Akses</h2>' +
                '<div class="sub">Buat akun login dan tentukan menu apa saja yang boleh diakses</div></div>' +
                '<div><button class="btn btn-primary" onclick="userForm(-1)">+ Tambah Pengguna</button></div></div>';
            html += '<div class="panel"><div class="panel-body" style="overflow-x:auto"><div id="userList"></div></div></div>';
            document.getElementById('main').innerHTML = html;
            renderUserList();
        }

        window.renderUserList = function () {
            var tb = '<table class="grid"><thead><tr>' +
                '<th style="width:40px">#</th><th>Username</th><th style="width:90px">Role</th>' +
                '<th style="width:90px">Status</th><th>Menu Yang Dapat Diakses</th>' +
                '<th style="width:150px;text-align:center">Aksi</th></tr></thead><tbody>';
            (DB.users || []).forEach(function (u, i) {
                var mk = menusOf(u);
                var badges;
                if (u.role === 'Admin') {
                    badges = '<span class="pill">Semua menu (Admin)</span>';
                } else {
                    badges = mk.map(function (k) {
                        var m = MENUS.find(function (x) { return x.key === k; });
                        return m ? '<span class="pill" style="margin:2px 3px 2px 0;display:inline-block">' + m.icon + ' ' + esc(m.label) + '</span>' : '';
                    }).join('') || '<span class="text-muted">— tidak ada —</span>';
                }
                var aktif = u.aktif === false ? '<span class="pill" style="background:#fee;color:#b00">Nonaktif</span>' : '<span class="pill" style="background:#e8f7ee;color:#0a7">Aktif</span>';
                tb += '<tr>' +
                    '<td>' + (i + 1) + '</td>' +
                    '<td><b>' + esc(u.username) + '</b><div class="text-muted" style="font-size:11px">' + esc(u.nama || '') + '</div></td>' +
                    '<td>' + esc(u.role || 'Sales') + '</td>' +
                    '<td>' + aktif + '</td>' +
                    '<td>' + badges + '</td>' +
                    '<td style="text-align:center;white-space:nowrap">' +
                    '<button class="btn btn-ghost btn-sm" onclick="userForm(' + i + ')">✏️ Ubah</button> ' +
                    '<button class="btn btn-danger btn-sm" onclick="delUser(' + i + ')" ' + ((DB.users.length === 1) ? 'disabled' : '') + '>🗑️</button>' +
                    '</td></tr>';
            });
            tb += '</tbody></table>';
            var container = document.getElementById('userList');
            if (container) container.innerHTML = tb;
        }

        /* Form tambah/ubah user + checklist menu */
        window.userForm = function (idx) {
            var u = idx >= 0 ? DB.users[idx] : { username: '', password: '', nama: '', role: 'Sales', aktif: true, menus: DEFAULT_MENUS.slice() };
            var sel = (idx >= 0 && u.role === 'Admin') ? ALL_MENU_KEYS.slice() : menusOf(u);
            var grup = [];
            MENUS.forEach(function (m) { if (grup.indexOf(m.grup) === -1) grup.push(m.grup); });

            var cbs = '';
            grup.forEach(function (g) {
                cbs += '<div style="margin-top:10px"><div style="font-size:11px;letter-spacing:.5px;color:var(--muted);font-weight:700;margin-bottom:6px">' + esc(g.toUpperCase()) +
                    ' <a href="javascript:void(0)" onclick="toggleGrup(\'' + esc(g) + '\',true)" style="font-weight:400">pilih semua</a> · ' +
                    '<a href="javascript:void(0)" onclick="toggleGrup(\'' + esc(g) + '\',false)" style="font-weight:400">kosongkan</a></div>' +
                    '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:6px">';
                MENUS.filter(function (m) { return m.grup === g; }).forEach(function (m) {
                    var dis = (m.key === 'users' || m.key === 'dashboard') ? 'disabled' : '';
                    var chk = (sel.indexOf(m.key) !== -1 || m.key === 'dashboard') ? 'checked' : '';
                    cbs += '<label class="chk menu-chk">' +
                        '<input type="checkbox" class="uMenu" data-grup="' + esc(g) + '" value="' + m.key + '" ' + chk + ' ' + dis + '>' +
                        '<span>' + m.icon + ' ' + esc(m.label) + '</span></label>';
                });
                cbs += '</div></div>';
            });

            var h = '<div class="modal-head"><h3>' + (idx >= 0 ? 'Ubah Pengguna' : 'Tambah Pengguna Baru') + '</h3>' +
                '<button class="x" onclick="closeModal()">&times;</button></div>' +
                '<div class="modal-body">' +
                '<div class="grid2">' +
                '<div class="field"><label>Username *</label><input id="uUser" type="text" value="' + esc(u.username) + '" placeholder="mis. budi"></div>' +
                '<div class="field"><label>Password *</label><input id="uPass" type="text" value="' + esc(u.password) + '" placeholder="mis. budi123"></div>' +
                '</div>' +
                '<div class="grid2">' +
                '<div class="field"><label>Nama Lengkap</label><input id="uNama" type="text" value="' + esc(u.nama || '') + '"></div>' +
                '<div class="field"><label>Role</label><select id="uRole" onchange="onRoleChange()">' +
                '<option value="Admin"' + (u.role === 'Admin' ? ' selected' : '') + '>Admin (akses penuh)</option>' +
                '<option value="Sales"' + (u.role === 'Sales' ? ' selected' : '') + '>Sales</option>' +
                '<option value="Staff"' + (u.role === 'Staff' ? ' selected' : '') + '>Staff</option>' +
                '<option value="Custom"' + (u.role === 'Custom' ? ' selected' : '') + '>Custom</option>' +
                '</select></div>' +
                '</div>' +
                '<label class="chk"><input type="checkbox" id="uAktif" ' + (u.aktif === false ? '' : 'checked') + '> Akun aktif (boleh login)</label>' +
                '<div class="divider"></div>' +
                '<div style="font-weight:700;font-size:14px">Hak Akses Menu</div>' +
                '<div class="hint" id="uMenuHint">Centang menu yang boleh diakses. Dashboard selalu aktif; menu Pengguna hanya untuk Admin.</div>' +
                '<div id="uMenuBox">' + cbs + '</div>' +
                '</div>' +
                '<div class="modal-foot"><button class="btn btn-ghost" onclick="closeModal()">Batal</button>' +
                '<button class="btn btn-primary" onclick="saveUser(' + idx + ')">💾 Simpan</button></div>';
            openModal(h);
            onRoleChange();
        }

        window.toggleGrup = function (g, on) {
            document.querySelectorAll('.uMenu[data-grup="' + g + '"]').forEach(function (c) {
                if (!c.disabled) c.checked = on;
            });
        }

        window.onRoleChange = function () {
            var isAdm = document.getElementById('uRole').value === 'Admin';
            document.querySelectorAll('.uMenu').forEach(function (c) {
                if (isAdm) { c.checked = true; c.disabled = true; }
                else { c.disabled = (c.value === 'users' || c.value === 'dashboard'); if (c.value === 'dashboard') c.checked = true; if (c.value === 'users') c.checked = false; }
            });
            document.getElementById('uMenuHint').textContent = isAdm
                ? 'Role Admin otomatis memiliki akses ke semua menu.'
                : 'Centang menu yang boleh diakses. Dashboard selalu aktif; menu Pengguna hanya untuk Admin.';
        }

        window.saveUser = function (idx) {
            var un = document.getElementById('uUser').value.trim();
            var pw = document.getElementById('uPass').value.trim();
            var nm = document.getElementById('uNama').value.trim();
            var rl = document.getElementById('uRole').value;
            var ak = document.getElementById('uAktif').checked;
            if (!un || !pw) { toast('Username dan password wajib diisi', 'err'); return; }
            var dup = DB.users.some(function (x, i) { return i !== idx && String(x.username).toLowerCase() === un.toLowerCase(); });
            if (dup) { toast('Username sudah dipakai', 'err'); return; }

            var menus = [];
            document.querySelectorAll('.uMenu').forEach(function (c) { if (c.checked) menus.push(c.value); });
            if (rl === 'Admin') menus = ALL_MENU_KEYS.slice();
            else menus = menus.filter(function (k) { return k !== 'users'; });

            var obj = { username: un, password: pw, nama: nm, role: rl, aktif: ak, menus: menus };
            if (idx >= 0) {
                var old = DB.users[idx];
                // Cegah admin terakhir dihapus haknya / dinonaktifkan
                if (old.role === 'Admin' && (rl !== 'Admin' || !ak) && DB.users.filter(function (x) { return x.role === 'Admin' && x.aktif !== false; }).length <= 1) {
                    toast('Minimal harus ada 1 Admin aktif', 'err'); return;
                }
                var sesi = bacaSesi();
                var wasMe = !!sesi && old.username === sesi.u;
                DB.users[idx] = obj;
                if (wasMe) tulisSesi(un);
                auditLog('Pengguna', 'Ubah user ' + un);
            } else {
                DB.users.push(obj);
                auditLog('Pengguna', 'Tambah user ' + un);
            }
            persist();
            closeModal();
            toast('Pengguna tersimpan', 'ok');
            go('users');
        }

        window.delUser = function (idx) {
            if (DB.users.length <= 1) { toast('Harus ada minimal 1 pengguna', 'err'); return; }
            var u = DB.users[idx];
            var sesiAktif = bacaSesi();
            if (sesiAktif && u.username === sesiAktif.u) { toast('Tidak bisa menghapus akun yang sedang dipakai', 'err'); return; }
            if (u.role === 'Admin' && DB.users.filter(function (x) { return x.role === 'Admin'; }).length <= 1) { toast('Minimal harus ada 1 Admin', 'err'); return; }
            if (confirm('Hapus pengguna "' + u.username + '"?')) {
                DB.users.splice(idx, 1);
                auditLog('Pengguna', 'Hapus user ' + u.username);
                persist();
                renderUserList();
            }
        }
        function saveCfg() {
            CFG.company = val('cNama'); CFG.phone = val('cTelp'); CFG.address = val('cAlamat');
            CFG.email = val('cEmail'); CFG.npwp = val('cNpwp'); CFG.taxDefault = parseNum(val('cTax'));
            CFG.currency = val('cCur').trim() || 'Rp';
            var jam = parseInt(val('cSesi'), 10);
            CFG.sessionJam = (isFinite(jam) && jam > 0) ? Math.min(jam, 720) : 12;
            CFG.logo = val('cLogo');
            pasangIdentitas();
            persist(); toast('Pengaturan tersimpan', 'ok');
        }
        function saveApi() {
            CFG.apiUrl = val('cApi').trim(); saveLocal();
            if (!CFG.apiUrl) { setSync(false); toast('URL dikosongkan — mode lokal', 'ok'); return; }
            toast('Menguji koneksi...');
            cloudPull().then(function (ok) { setSync(ok); toast(ok ? 'Terhubung! Data ditarik dari Sheet' : 'Gagal terhubung, cek URL/izin', ok ? 'ok' : 'err'); if (ok) go(CURRENT_PAGE); });
        }
        function doPull() {
            toast('Menarik data dari Spreadsheet...');
            tarikSemuaData(function (ok) {
                go(CURRENT_PAGE || 'dashboard');
                toast(ok ? 'Data terbaru dari Spreadsheet dimuat' : 'Gagal menarik data', ok ? 'ok' : 'err');
            });
        }
        /* Kirim manual ke Spreadsheet — dijaga ketat, karena aksi ini menimpa
           seluruh isi sheet dengan apa yang ada di aplikasi saat ini. */
        function doPush() {
            if (CFG.apiUrl && !DATA_SIAP) {
                toast('Data Spreadsheet belum termuat. Tekan ⟳ dulu — mengirim sekarang akan menimpa data asli.', 'err');
                return;
            }
            var hitung = [
                ['Barang', arr(DB.barang).length], ['Penjualan', arr(DB.penjualan).length],
                ['Pembelian', arr(DB.pembelian).length], ['Gudang', arr(DB.gudang).length],
                ['Mitra', arr(DB.mitra).length], ['Kas & Bank', arr(DB.kasbank).length],
                ['Quotation', arr(DB.quotation).length], ['COA', arr(DB.coa).length],
                ['Pengguna', arr(DB.users).length]
            ];
            var kosong = hitung.filter(function (r) { return r[1] === 0; });
            var pesan = 'Menimpa seluruh isi Spreadsheet dengan data di aplikasi:\n\n' +
                hitung.map(function (r) { return '  • ' + r[0] + ': ' + r[1] + ' baris'; }).join('\n') +
                (kosong.length
                    ? '\n\n⚠️ ' + kosong.length + ' koleksi KOSONG. Sheet-nya tidak akan ditimpa (dilindungi), ' +
                      'tapi pastikan ini memang benar.'
                    : '') +
                '\n\nLanjutkan?';
            if (!confirm(pesan)) return;

            toast('Mengirim data...');
            cloudPush().then(function (ok) {
                setSync(ok);
                toast(ok ? 'Data terkirim ke Sheet' : 'Gagal mengirim', ok ? 'ok' : 'err');
            });
        }

        /* Pengiriman yang memang dimaksudkan untuk mengosongkan sheet */
        function kirimBolehKosong() {
            IZIN_KOSONGKAN = true;
            try { persist(); } finally {
                setTimeout(function () { IZIN_KOSONGKAN = false; }, 5000);
            }
        }
        function exportJSON() {
            var blob = new Blob([JSON.stringify({ DB: DB, CFG: CFG }, null, 2)], { type: 'application/json' });
            var a = document.createElement('a'); a.href = URL.createObjectURL(blob);
            a.download = 'backup-penjualan-' + todayStr() + '.json'; a.click();
        }
        function importJSON(inp) {
            var f = inp.files[0]; if (!f) return;
            var r = new FileReader(); r.onload = function () {
                try {
                    var j = JSON.parse(r.result); if (j.DB) DB = j.DB; if (j.CFG) CFG = Object.assign(CFG, j.CFG);
                    persist(); go('dashboard'); toast('Data dipulihkan', 'ok');
                } catch (e) { toast('File tidak valid', 'err'); }
            }; r.readAsText(f);
        }
        function resetAll() {
            if (!confirm('Hapus SEMUA data termasuk master Barang, Gudang, dan COA?\n\nTindakan ini TIDAK bisa dibatalkan.\nDisarankan klik "Backup (JSON)" dulu.')) return;
            DB = { barang: [], penjualan: [], pembelian: [], modal: [], kasbank: [], quotation: [], coa: [], jurnal: [], counters: {}, users: DB.users, audit: [], gudang: DB.gudang || [], transfer: [], mitra: DB.mitra || [], retur: [], opname: [] };
            seedCOA();
            kirimBolehKosong(); go('dashboard'); toast('Semua data dihapus', 'ok');
        }

        /* Diagnosa Spreadsheet: tampilkan header & contoh baris apa adanya,
           supaya ketahuan kalau kolom dan isinya tidak sejajar. Hanya membaca. */
        function diagnosaSheet() {
            if (!CFG.apiUrl) { toast('Belum terhubung ke Spreadsheet', 'err'); return; }
            openModal('<div class="modal-head"><h3>Diagnosa Spreadsheet</h3>' +
                '<button class="x" onclick="closeModal()">&times;</button></div>' +
                '<div class="modal-body"><div class="loading-box">🩺 Membaca kondisi sheet…</div></div>');
            ambil(CFG.apiUrl + '?action=diag&t=' + Date.now(), {}, 45)
                .then(parseBalasan)
                .then(function (j) {
                    if (!j || !j.ok) throw new Error((j && j.error) || 'Respons tidak dikenali');
                    tampilDiagnosa(j.sheets || []);
                })
                .catch(function (e) {
                    openModal('<div class="modal-head"><h3>Diagnosa Spreadsheet</h3>' +
                        '<button class="x" onclick="closeModal()">&times;</button></div>' +
                        '<div class="modal-body"><div class="hint" style="border-left:3px solid var(--danger);padding-left:8px">' +
                        'Gagal membaca: ' + esc(e.message) + '<br><br>Kalau pesannya "unknown action", berarti Code.gs versi baru belum di-deploy.' +
                        '</div></div><div class="modal-foot"><button class="btn btn-ghost" onclick="closeModal()">Tutup</button></div>');
                });
        }

        function tampilDiagnosa(sheets) {
            var masalah = 0;
            var h = '<div class="modal-head"><h3>Diagnosa Spreadsheet</h3>' +
                '<button class="x" onclick="closeModal()">&times;</button></div><div class="modal-body">';
            h += '<table class="grid"><thead><tr><th>Sheet</th><th class="num">Baris Data</th>' +
                '<th class="num">Kolom</th><th>Header vs Skema</th><th>Kolom JSON</th></tr></thead><tbody>';
            sheets.forEach(function (s) {
                if (!s.ada) {
                    masalah++;
                    h += '<tr style="background:#fff7f7"><td><b>' + esc(s.sheet) + '</b></td>' +
                        '<td colspan="4"><span class="pill" style="background:#fee;color:#b00">Sheet belum ada</span></td></tr>';
                    return;
                }
                var jsonRusak = arr(s.kolomJson).filter(function (k) { return !k.wajar; });
                var buruk = !s.headerCocokSkema || jsonRusak.length;
                if (buruk) masalah++;
                h += '<tr' + (buruk ? ' style="background:#fff7f7"' : '') + '>' +
                    '<td><b>' + esc(s.sheet) + '</b></td>' +
                    '<td class="num">' + s.barisData + '</td>' +
                    '<td class="num">' + s.jumlahKolom + '</td>' +
                    '<td>' + (s.headerCocokSkema
                        ? '<span class="pill" style="background:#e8f7ee;color:#0a7">Sesuai</span>'
                        : '<span class="pill" style="background:#fef3c7;color:#92400e">Beda (belum disamakan)</span>') + '</td>' +
                    '<td>' + (!arr(s.kolomJson).length ? '<span class="text-muted">—</span>'
                        : arr(s.kolomJson).map(function (k) {
                            return '<span class="pill" style="' + (k.wajar ? '' : 'background:#fee;color:#b00') +
                                '">' + esc(k.kolom) + ' kol.' + k.posisi + (k.wajar ? ' ✓' : ' ✗ bergeser') + '</span>';
                        }).join(' ')) + '</td></tr>';
                if (buruk) {
                    h += '<tr><td colspan="5" style="font-size:11px;color:var(--muted);padding-left:20px">' +
                        'Header: ' + esc(arr(s.header).join(' | ')) + '<br>' +
                        'Baris pertama: ' + esc(arr(s.contohBaris).join(' | ')) + '</td></tr>';
                }
            });
            h += '</tbody></table>';
            h += masalah
                ? '<div class="hint" style="margin-top:10px;border-left:3px solid var(--warn);padding-left:8px">' +
                  '<b>' + masalah + ' sheet perlu perhatian.</b> Kolom JSON bertanda ✗ berarti isi baris tidak sejajar dengan header. ' +
                  'Kalau data di aplikasi sudah benar, tekan <b>⬆️ Kirim Data ke Sheet</b> — seluruh sheet akan ditulis ulang rapi sesuai skema. ' +
                  'Kalau data di aplikasi yang kosong, pulihkan Spreadsheet lewat File → Version history dulu, jangan kirim apa pun.</div>'
                : '<div class="hint" style="margin-top:10px;border-left:3px solid var(--ok);padding-left:8px">Semua sheet sejajar dan sesuai skema. ✓</div>';
            h += '</div><div class="modal-foot"><button class="btn btn-ghost" onclick="closeModal()">Tutup</button></div>';
            openModal(h);
        }

        /* Alat bantu: tunjukkan ke akun mana tiap item akan dijurnal, dan
           kenapa. Berguna saat pendapatan jasa terlanjur masuk 4101. */
        function periksaJurnalJasa() {
            var jasa = DB.barang.filter(isJasa);
            var h = '<div class="modal-head"><h3>Periksa Pemetaan Jurnal</h3><button class="x" onclick="closeModal()">&times;</button></div><div class="modal-body">';

            h += '<div style="font-weight:700;margin-bottom:6px">1. Master Item</div>';
            if (!DB.barang.length) h += '<div class="empty">Belum ada item.</div>';
            else {
                h += '<table class="grid"><thead><tr><th>Kode</th><th>Nama</th><th>Jenis</th><th>Akun Pendapatan</th></tr></thead><tbody>';
                DB.barang.forEach(function (b) {
                    var ak = akunPendapatan(b);
                    h += '<tr><td>' + esc(b.kode) + '</td><td>' + esc(b.nama) + '</td>' +
                        '<td>' + (isJasa(b) ? '<span class="pill" style="background:#eef2ff;color:#4338ca">Jasa</span>' : '<span class="pill">Barang</span>') + '</td>' +
                        '<td>' + esc(ak) + ' — ' + esc(namaAkun(ak)) + '</td></tr>';
                });
                h += '</tbody></table>';
            }
            if (!jasa.length) {
                h += '<div class="hint" style="margin-top:8px;border-left:3px solid var(--danger);padding-left:8px">' +
                    '⚠️ <b>Tidak ada satu pun item berjenis Jasa.</b> Semua penjualan otomatis masuk 4101. ' +
                    'Kalau Anda sudah membuat item jasa sebelumnya, berarti kolom <code>jenis</code> hilang saat sinkronisasi — ' +
                    'artinya Code.gs di Apps Script belum di-deploy ulang sebagai versi baru.</div>';
            }

            h += '<div class="divider"></div><div style="font-weight:700;margin-bottom:6px">2. Baris Penjualan Final</div>';
            var baris = [];
            (DB.penjualan || []).forEach(function (x) {
                if (x.status === 'Draft') return;
                (x.items || []).forEach(function (it) {
                    var tersimpan = String(it.akunPendapatan || '').trim();
                    var dipakai = (tersimpan && findAkun(tersimpan)) ? tersimpan
                        : (String(it.jenis || '') === 'Jasa' ? AKUN_JASA_DEFAULT : akunPendapatan(findBarang(it.kode)));
                    baris.push({ no: x.no, kode: it.kode, nama: it.nama, jenis: it.jenis || '(tidak tercatat)', tersimpan: tersimpan || '(kosong)', dipakai: dipakai, sub: it.subtotal });
                });
            });
            if (!baris.length) h += '<div class="empty">Belum ada penjualan final.</div>';
            else {
                h += '<table class="grid"><thead><tr><th>No</th><th>Item</th><th>Jenis di Transaksi</th><th>Akun Tersimpan</th><th>Akun Dipakai</th><th class="num">Nilai</th></tr></thead><tbody>';
                baris.forEach(function (r) {
                    var merah = r.dipakai === AKM.penjualan && r.jenis === 'Jasa';
                    h += '<tr' + (merah ? ' style="background:#fff5f5"' : '') + '>' +
                        '<td>' + esc(r.no) + '</td><td>' + esc(r.kode) + ' — ' + esc(r.nama) + '</td>' +
                        '<td>' + esc(r.jenis) + '</td><td>' + esc(r.tersimpan) + '</td>' +
                        '<td><b>' + esc(r.dipakai) + '</b> ' + esc(namaAkun(r.dipakai)) + '</td>' +
                        '<td class="num">' + fmt(r.sub) + '</td></tr>';
                });
                h += '</tbody></table>';
                h += '<div class="hint" style="margin-top:8px">Baris lama dibuat sebelum fitur jasa ada, jadi kolom "Jenis di Transaksi" dan "Akun Tersimpan" kosong — ' +
                    'akunnya diambil dari master saat ini. Setelah master benar, jurnal ikut benar tanpa perlu input ulang.</div>';
            }
            h += '</div><div class="modal-foot"><button class="btn btn-ghost" onclick="closeModal()">Tutup</button>' +
                '<button class="btn btn-primary" onclick="rebuildAutoJurnal();persist();closeModal();toast(\'Jurnal otomatis disusun ulang\',\'ok\')">🔄 Susun Ulang Jurnal</button></div>';
            openModal(h);
        }

        /* Bersihkan transaksi saja — master Gudang, COA, dan Barang dipertahankan.
           Dipakai untuk memulai periode pembukuan baru. */
        function resetTransaksi() {
            var ringkas =
                'Data yang akan DIHAPUS:\n' +
                '  • Penjualan (' + (DB.penjualan || []).length + ')\n' +
                '  • Pembelian (' + (DB.pembelian || []).length + ')\n' +
                '  • Quotation (' + (DB.quotation || []).length + ')\n' +
                '  • Modal (' + (DB.modal || []).length + ')\n' +
                '  • Kas & Bank (' + (DB.kasbank || []).length + ')\n' +
                '  • Jurnal (' + (DB.jurnal || []).length + ')\n' +
                '  • Transfer stok (' + (DB.transfer || []).length + ')\n' +
                '  • Log aktivitas (' + (DB.audit || []).length + ')\n' +
                '  • Nomor urut dokumen (mulai dari 0001 lagi)\n' +
                '  • Seluruh QTY stok barang di semua gudang → 0\n\n' +
                'Data yang DIPERTAHANKAN:\n' +
                '  • Gudang (' + (DB.gudang || []).length + ')\n' +
                '  • Daftar Akun / COA (' + (DB.coa || []).length + ')\n' +
                '  • Master Barang (' + (DB.barang || []).length + ') — kode, nama, satuan, harga\n' +
                '  • Pengguna & hak akses (' + (DB.users || []).length + ')\n' +
                '  • Pengaturan perusahaan\n\n' +
                'Tindakan ini TIDAK bisa dibatalkan. Lanjutkan?';
            if (!confirm(ringkas)) return;
            if (!confirm('Konfirmasi terakhir: hapus seluruh transaksi dan nolkan stok?')) return;

            var jml = (DB.barang || []).length;

            DB.penjualan = [];
            DB.pembelian = [];
            DB.quotation = [];
            DB.modal = [];
            DB.kasbank = [];
            DB.jurnal = [];
            DB.transfer = [];
            DB.audit = [];
            DB.counters = {};                      // nomor dokumen mulai dari awal

            // Master barang tetap, qty di semua gudang dinolkan
            (DB.barang || []).forEach(function (b) {
                b.lokasi = {};
                (DB.gudang || []).forEach(function (g) { b.lokasi[g.id] = 0; });
                sinkronStok(b);
            });

            // COA tetap, tapi saldo awal dinolkan agar laporan bersih
            (DB.coa || []).forEach(function (a) { a.saldoAwal = 0; });

            auditLog('Sistem', 'Reset transaksi — master gudang/COA/barang dipertahankan');
            kirimBolehKosong();
            go('dashboard');
            toast('Transaksi dihapus. ' + jml + ' master barang & stok 0 siap dipakai.', 'ok');
        }

        /* PRINT / TEMPLATES */
        function docHeader(titleBig, titleSmall, noLabel, noVal, tglVal) {
            var logoHtml = CFG.logo ? '<img src="' + esc(CFG.logo) + '" style="max-height:70px; margin-right:15px; vertical-align:middle;">' : '';
            return '<div class="doc-head"><div class="doc-co" style="display:flex; align-items:center;">' +
                (logoHtml) +
                '<div><h1>' + esc(CFG.company) + '</h1>' +
                '<p>' + esc(CFG.address) + '</p>' +
                '<p>Telp: ' + esc(CFG.phone) + (CFG.email ? ' &middot; ' + esc(CFG.email) : '') + '</p>' +
                (CFG.npwp ? '<p>NPWP: ' + esc(CFG.npwp) + '</p>' : '') +
                '</div></div><div class="doc-title"><h2>' + esc(titleBig) + '</h2>' +
                (titleSmall ? '<p>' + esc(titleSmall) + '</p>' : '') +
                '<p><b>' + esc(noLabel) + ':</b> ' + esc(noVal) + '</p>' +
                '<p>Tanggal: ' + fmtDate(tglVal) + '</p>' +
                '</div></div>';
        }
        // kolomCNY: hanya ditampilkan untuk pembelian yang memang memakai mata uang CNY
        function itemsTable(items, showKode, isBeli, kolomCNY) {
            if (kolomCNY === undefined) kolomCNY = isBeli;
            var h = '<table class="doc-tbl"><thead><tr><th style="width:36px">No</th>' +
                (showKode ? '<th>Kode</th>' : '') + '<th>Deskripsi</th><th class="num">Qty</th>' +
                (kolomCNY ? '<th class="num">Harga CNY</th>' : '') +
                '<th class="num">Harga IDR</th><th class="num">Jumlah IDR</th></tr></thead><tbody>';
            items.forEach(function (it, i) {
                h += '<tr><td>' + (i + 1) + '</td>' + (showKode ? '<td>' + esc(it.kode || '') + '</td>' : '') +
                    '<td>' + esc(it.nama) + '</td><td class="num">' + fmt(it.qty) + '</td>' +
                    (kolomCNY ? '<td class="num">' + fmt4(it.hargaCNY || 0) + '</td>' : '') +
                    '<td class="num">' + fmt(it.harga) + '</td><td class="num">' + fmt(it.subtotal) + '</td></tr>';
            });
            h += '</tbody></table>';
            return h;
        }
        function totalsBlock(o, isBeli) {
            var h = '<div class="doc-tot">' +
                '<div class="r"><span>Subtotal</span><span>' + money(o.subtotal) + '</span></div>';
            if (o.diskon) h += '<div class="r"><span>Diskon</span><span>- ' + money(o.diskon) + '</span></div>';
            if (isBeli && o.biayaLain) h += '<div class="r"><span>Biaya Lain-lain</span><span>' + money(o.biayaLain) + '</span></div>';
            h += '<div class="r g"><span>TOTAL</span><span>' + money(o.total) + '</span></div></div>';
            return h;
        }
        function signBlock(leftLabel, rightLabel) {
            return '<div class="doc-sign"><div class="s">' + esc(leftLabel) + '<div class="line">(&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;)</div></div>' +
                '<div class="s">' + esc(rightLabel) + '<div class="line">(&nbsp;' + esc(CFG.company) + '&nbsp;)</div></div></div>';
        }
        function docFoot() { return '<div class="doc-foot">Dokumen ini dicetak dari Sistem Penjualan ' + esc(CFG.company) + ' &middot; ' + fmtDate(todayStr()) + '</div>'; }

        function doPrint(html) {
            document.getElementById('printArea').innerHTML = '<div class="doc">' + html + '</div>';
            window.print();
        }
        function printTrx(mode, id) {
            var isJual = mode === 'jual';
            var x = (isJual ? DB.penjualan : DB.pembelian).find(function (r) { return r.id === id; }); if (!x) return;
            var titleBig = isJual ? 'INVOICE' : 'PURCHASE ORDER';
            var pihakLabel = isJual ? 'Kepada Yth' : 'Kepada (Supplier)';
            var bankInfo = isJual ? '<div class="doc-note" style="margin-top:15px; line-height: 1.6;"><b>Informasi Rekening Bank</b><br>Bank Transfer :<br>BCA : 5932590077<br>A/N : PT. GALA TEKNIK INDONESIA</div>' : '';
            var pakaiCNY = !isJual && mataUangTrx(x) === 'CNY';
            var html = docHeader(titleBig, '', isJual ? 'No. Invoice' : 'No. PO', x.no, x.tanggal) +
                (pakaiCNY ? '<div class="doc-note" style="text-align:right; margin-bottom:8px;"><b>Kurs CNY ke IDR:</b> ' + fmt(x.kursCNY || 1) + '</div>' : '') +
                '<div class="doc-meta"><div class="box"><b>' + pihakLabel + '</b><br>' + esc(x.pelanggan).replace(/\n/g, '<br>') + '</div></div>' +
                itemsTable(x.items, true, !isJual, pakaiCNY) + totalsBlock(x, !isJual) +
                '<div class="terbilang">Terbilang: ' + esc(cap(terbilang(x.total))) + ' rupiah</div>' +
                (x.catatan ? '<div class="doc-note"><b>Catatan:</b> ' + esc(x.catatan) + '</div>' : '') +
                bankInfo;

            if (isJual) {
                var salesName = x.sales || '__________________';
                html += '<div class="doc-sign" style="justify-content:flex-end;"><div class="s">Hormat kami,<div class="line" style="margin-top:80px;">( ' + esc(salesName) + ' )</div></div></div>';
            } else {
                html += signBlock('Hormat kami,', 'Disetujui,');
            }
            html += docFoot();
            doPrint(html);
        }
        function printProforma(id) {
            var x = DB.penjualan.find(function (r) { return r.id === id; }); if (!x) return;
            var titleBig = 'PROFORMA INVOICE';
            var pihakLabel = 'Kepada Yth';
            var bankInfo = '<div class="doc-note" style="margin-top:15px; line-height: 1.6;"><b>Informasi Rekening Bank</b><br>Bank Transfer :<br>BCA : 5932590077<br>A/N : PT. GALA TEKNIK INDONESIA</div>';
            var html = docHeader(titleBig, 'DRAFT TRANSAKSI', 'No. Proforma', x.no, x.tanggal) +
                '<div class="doc-meta"><div class="box"><b>' + pihakLabel + '</b><br>' + esc(x.pelanggan).replace(/\n/g, '<br>') + '</div></div>' +
                itemsTable(x.items, true, false) + totalsBlock(x, false) +
                '<div class="terbilang">Terbilang: ' + esc(cap(terbilang(x.total))) + ' rupiah</div>' +
                (x.catatan ? '<div class="doc-note"><b>Catatan:</b> ' + esc(x.catatan) + '</div>' : '') +
                bankInfo;

            var salesName = x.sales || '__________________';
            html += '<div class="doc-sign" style="justify-content:flex-end;"><div class="s">Hormat kami,<div class="line" style="margin-top:80px;">( ' + esc(salesName) + ' )</div></div></div>';
            html += docFoot();
            doPrint(html);
        }
        function printQuote(id) {
            var x = DB.quotation.find(function (r) { return r.id === id; }); if (!x) return;
            var s = SALES_INFO[x.sales] || SALES_INFO['MNA'];
            var logoHtml = CFG.logo ? '<img src="' + esc(CFG.logo) + '" style="max-height:80px;">' : '';

            var html = '<div style="font-family: Arial, sans-serif; padding: 20px 40px; color: #111; max-width:800px; margin:0 auto; min-height: 95vh; display: flex; flex-direction: column;">';
            html += '<div>';

            // Header
            html += '<div style="display:flex; align-items:center; margin-bottom: 30px;">';
            html += '<div style="flex:1;">' + logoHtml + '</div>';
            html += '<div style="flex:2; text-align:center;"><h2 style="margin:0; font-size: 18px; font-weight: bold; letter-spacing:1px; color:#333;">SURAT PENAWARAN / QUOTATION</h2></div>';
            html += '<div style="flex:1;"></div>';
            html += '</div>';

            // Meta
            html += '<div style="display:flex; justify-content:space-between; margin-bottom:30px; font-weight:bold; font-size:13px; line-height:1.6;">';
            html += '<div>Kepada Yth.<br>' + esc(x.pelanggan).replace(/\n/g, '<br>') + '</div>';
            html += '<div style="text-align:left;">Nomor : ' + esc(x.no) + '<br>Tanggal : ' + fmtDate(x.tanggal) + '</div>';
            html += '</div>';

            html += '<p style="font-size:13px; margin-bottom:15px;">Dengan hormat,</p>';
            html += '<p style="font-size:13px; margin-bottom:20px; line-height:1.6;">Terima kasih atas kepercayaan Anda kepada ' + esc(CFG.company) + '. Bersama ini kami sampaikan penawaran harga untuk kebutuhan sparepart dan/atau jasa reparasi sebagai berikut :</p>';

            // Table
            html += '<table style="width:100%; border-collapse:collapse; margin-bottom:15px; font-size:13px;">';
            html += '<thead><tr style="background:#333; color:#fff;">';
            html += '<th style="padding:10px; border:1px solid #333; width:5%; text-align:center;">No</th>';
            html += '<th style="padding:10px; border:1px solid #333; text-align:left;">Deskripsi Barang / Jasa</th>';
            html += '<th style="padding:10px; border:1px solid #333; width:8%; text-align:center;">Qty</th>';
            html += '<th style="padding:10px; border:1px solid #333; width:10%; text-align:center;">Satuan</th>';
            html += '<th style="padding:10px; border:1px solid #333; width:18%; text-align:right;">Harga (Rp)</th>';
            html += '<th style="padding:10px; border:1px solid #333; width:20%; text-align:right;">Jumlah (Rp)</th>';
            html += '</tr></thead><tbody>';

            x.items.forEach(function (it, i) {
                html += '<tr>';
                html += '<td style="padding:8px 10px; border:1px solid #999; text-align:center;">' + (i + 1) + '</td>';
                html += '<td style="padding:8px 10px; border:1px solid #999;">' + esc(it.nama) + '</td>';
                html += '<td style="padding:8px 10px; border:1px solid #999; text-align:center;">' + fmt(it.qty) + '</td>';
                html += '<td style="padding:8px 10px; border:1px solid #999; text-align:center;">' + esc(it.satuan || 'Pcs') + '</td>';
                html += '<td style="padding:8px 10px; border:1px solid #999; text-align:right;">' + fmt(it.harga) + '</td>';
                html += '<td style="padding:8px 10px; border:1px solid #999; text-align:right;">' + fmt(it.subtotal) + '</td>';
                html += '</tr>';
            });
            // Total row
            html += '<tr><td colspan="5" style="padding:10px; border:1px solid #999; text-align:right; font-weight:bold;">Total (Rp)</td>';
            html += '<td style="padding:10px; border:1px solid #999; text-align:right; font-weight:bold; background:#eee;">' + fmt(x.total) + '</td></tr>';
            html += '</tbody></table>';

            if (x.catatan) {
                html += '<p style="font-size:12px; margin-bottom:15px;"><b>Catatan:</b> ' + esc(x.catatan) + '</p>';
            }

            html += '<p style="font-size:13px; margin-bottom:50px; line-height:1.6;">Demikian penawaran ini kami sampaikan, untuk konfirmasi atau pertanyaan, silakan hubungi kami melalui WhatsApp yang tertera pada footer surat ini.</p>';

            // Signature
            html += '<div style="display:flex; justify-content:flex-end; margin-bottom:60px;">';
            html += '<div style="text-align:center; font-size:13px; font-weight:bold;">';
            html += 'Hormat kami,<br>' + esc(CFG.company) + '<br><br><br><br>';
            html += '( ' + esc(s.p) + ' )';
            html += '</div></div>';

            html += '</div>';

            // Footer
            html += '<div style="margin-top:auto; font-size:11px; color:#444; display:flex; justify-content:space-between; align-items:flex-end; padding-top:15px; border-top:1px solid #ccc;">';
            html += '<div style="flex:1;">' + esc(CFG.address).replace(/\n/g, '<br>') + '</div>';
            html += '<div style="flex:1; text-align:center; font-weight:bold; font-size:12px;">' + esc(s.tlp) + '</div>';
            html += '<div style="flex:1; text-align:right;">' + esc(CFG.email) + '</div>';
            html += '</div>';

            html += '</div>';
            doPrint(html);
        }
        function printModal(id) {
            var m = DB.modal.find(function (r) { return r.id === id; }); if (!m) return;
            var html = docHeader('BUKTI MODAL', m.jenis === 'Setor' ? 'Setoran Modal' : 'Penarikan Modal', 'No. Bukti', m.no, m.tanggal) +
                '<div class="doc-meta"><div class="box"><b>Jenis</b><br>' + esc(m.jenis) + ' Modal</div>' +
                '<div class="box"><b>Akun</b><br>' + esc(m.akun) + '</div>' +
                '<div class="box" style="text-align:right"><b>Jumlah</b><br>' + money(m.jumlah) + '</div></div>' +
                '<div class="doc-note"><b>Keterangan:</b> ' + esc(m.keterangan) + '</div>' +
                '<div class="terbilang">Terbilang: ' + esc(cap(terbilang(m.jumlah))) + ' rupiah</div>' +
                signBlock('Penyetor,', 'Penerima,') + docFoot();
            doPrint(html);
        }
        function printBarang() {
            // Daftar stok hanya memuat barang fisik
            var fisik = barangFisik();
            var listToPrint = window.hideZeroStock ? fisik.filter(function (b) { return Number(b.stok) > 0; }) : fisik;
            var totNilai = 0;
            var rows = listToPrint.map(function (b, i) {
                var nilai = (Number(b.stok) || 0) * (Number(b.hargaBeli) || 0);
                totNilai += nilai;
                return '<tr><td>' + (i + 1) + '</td><td>' + esc(b.kode) + '</td><td>' + esc(b.nama) + '</td>' +
                    '<td>' + esc(b.satuan) + '</td><td class="num">' + fmt(b.stok) + '</td>' +
                    '<td class="num">' + fmt(b.hargaBeli) + '</td><td class="num">' + fmt(b.hargaJual) + '</td>' +
                    '<td class="num">' + fmt(nilai) + '</td></tr>';
            }).join('');
            var html = docHeader('DAFTAR STOK', 'Laporan Persediaan Barang', 'Tanggal', fmtDate(todayStr()), todayStr()) +
                '<table class="doc-tbl"><thead><tr><th>No</th><th>Kode</th><th>Nama Barang</th><th>Satuan</th>' +
                '<th class="num">Stok</th><th class="num">Harga Beli</th><th class="num">Harga Jual</th><th class="num">Nilai Stok</th></tr></thead><tbody>' +
                rows + '</tbody></table>' +
                '<div class="doc-tot"><div class="r g"><span>Total Nilai Stok</span><span>' + money(totNilai) + '</span></div></div>' +
                docFoot();
            doPrint(html);
        }

        function printTransfer(id) {
            var t = (DB.transfer || []).find(function (x) { return x.id === id; }); if (!t) return;
            var rows = (t.items || []).map(function (it, i) {
                var b = findBarang(it.kode);
                return '<tr><td>' + (i + 1) + '</td><td>' + esc(it.kode) + '</td><td>' + esc(it.nama) + '</td>' +
                    '<td>' + esc(b ? b.satuan : '') + '</td><td class="num">' + fmt(it.qty) + '</td></tr>';
            }).join('');
            var html = docHeader('SURAT JALAN / TRANSFER STOK', 'No. ' + t.no, 'Tanggal', fmtDate(t.tanggal), t.tanggal) +
                '<table class="doc-tbl" style="margin-bottom:10px"><tbody>' +
                '<tr><td style="width:25%"><b>Dari Gudang</b></td><td>' + esc(namaGudang(t.dari)) + '</td></tr>' +
                '<tr><td><b>Ke Gudang</b></td><td>' + esc(namaGudang(t.ke)) + '</td></tr>' +
                (t.catatan ? '<tr><td><b>Catatan</b></td><td>' + esc(t.catatan) + '</td></tr>' : '') +
                '</tbody></table>' +
                '<table class="doc-tbl"><thead><tr><th>No</th><th>Kode</th><th>Nama Barang</th><th>Satuan</th><th class="num">Qty</th></tr></thead><tbody>' +
                rows + '</tbody></table>' + docFoot();
            doPrint(html);
        }

        function exportBarangExcel() {
            var fisikX = barangFisik();
            var listToExport = window.hideZeroStock ? fisikX.filter(function (b) { return Number(b.stok) > 0; }) : fisikX;
            var table = '<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body><table border="1"><tr><th>No</th><th>Kode</th><th>Nama Barang</th><th>Satuan</th><th>Stok</th><th>Harga Beli</th><th>Harga Jual</th><th>Nilai Stok</th></tr>';
            var totNilai = 0;
            listToExport.forEach(function(b, i) {
                var nilai = (Number(b.stok) || 0) * (Number(b.hargaBeli) || 0);
                totNilai += nilai;
                table += '<tr><td>' + (i + 1) + '</td><td>' + esc(b.kode) + '</td><td>' + esc(b.nama) + '</td>' +
                    '<td>' + esc(b.satuan) + '</td><td>' + (Number(b.stok) || 0) + '</td>' +
                    '<td>' + (Number(b.hargaBeli) || 0) + '</td><td>' + (Number(b.hargaJual) || 0) + '</td>' +
                    '<td>' + nilai + '</td></tr>';
            });
            table += '<tr><td colspan="7" align="right"><b>Total Nilai Stok</b></td><td><b>' + totNilai + '</b></td></tr>';
            table += '</table></body></html>';
            var blob = new Blob([table], { type: 'application/vnd.ms-excel' });
            var a = document.createElement('a'); a.href = URL.createObjectURL(blob);
            a.download = 'Daftar_Stok_' + todayStr() + '.xls'; 
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
        }
        function printLedger(which) {
            var isKB = which === 'kasbank';
            var data = (isKB ? DB.kasbank : DB.modal).slice().sort(function (a, b) { return (a.tanggal || '').localeCompare(b.tanggal || ''); });
            var rows = '', run = 0;
            if (isKB) {
                rows = data.map(function (k, i) {
                    run += k.arah === 'Masuk' ? k.jumlah : -k.jumlah;
                    return '<tr><td>' + (i + 1) + '</td><td>' + fmtDate(k.tanggal) + '</td><td>' + esc(k.akun) + '</td><td>' + esc(k.kategori) + '</td>' +
                        '<td>' + esc(k.keterangan) + '</td><td class="num">' + (k.arah === 'Masuk' ? fmt(k.jumlah) : '-') + '</td>' +
                        '<td class="num">' + (k.arah === 'Keluar' ? fmt(k.jumlah) : '-') + '</td><td class="num">' + fmt(run) + '</td></tr>';
                }).join('');
                var html = docHeader('BUKU KAS & BANK', 'Laporan Mutasi Kas dan Bank', 'Per Tanggal', fmtDate(todayStr()), todayStr()) +
                    '<table class="doc-tbl"><thead><tr><th>No</th><th>Tanggal</th><th>Akun</th><th>Kategori</th><th>Keterangan</th>' +
                    '<th class="num">Masuk</th><th class="num">Keluar</th><th class="num">Saldo</th></tr></thead><tbody>' + rows + '</tbody></table>' +
                    '<div class="doc-tot"><div class="r"><span>Saldo Kas</span><span>' + money(saldoAkun('Kas')) + '</span></div>' +
                    '<div class="r"><span>Saldo Bank</span><span>' + money(saldoAkun('Bank')) + '</span></div>' +
                    '<div class="r g"><span>Total Saldo</span><span>' + money(saldoAkun('Kas') + saldoAkun('Bank')) + '</span></div></div>' + docFoot();
                doPrint(html);
            } else {
                rows = data.map(function (m, i) {
                    return '<tr><td>' + (i + 1) + '</td><td>' + esc(m.no) + '</td><td>' + fmtDate(m.tanggal) + '</td><td>' + esc(m.jenis) + '</td>' +
                        '<td>' + esc(m.akun) + '</td><td>' + esc(m.keterangan) + '</td><td class="num">' + fmt(m.jumlah) + '</td></tr>';
                }).join('');
                var html2 = docHeader('LAPORAN MODAL', 'Riwayat Setoran &amp; Penarikan Modal', 'Per Tanggal', fmtDate(todayStr()), todayStr()) +
                    '<table class="doc-tbl"><thead><tr><th>No</th><th>No. Bukti</th><th>Tanggal</th><th>Jenis</th><th>Akun</th><th>Keterangan</th><th class="num">Jumlah</th></tr></thead><tbody>' + rows + '</tbody></table>' +
                    '<div class="doc-tot"><div class="r g"><span>Total Modal Bersih</span><span>' + money(totalModal()) + '</span></div></div>' + docFoot();
                doPrint(html2);
            }
        }
        function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

        /* Form helpers */
        function fld(label, id, v, type) { return '<div class="field"><label>' + label + '</label><input id="' + id + '" type="' + (type || 'text') + '" value="' + esc(v) + '"></div>'; }
        function fldArea(label, id, v) { return '<div class="field"><label>' + label + '</label><textarea id="' + id + '" rows="3" style="resize:vertical;">' + esc(v) + '</textarea></div>'; }
        /* Logo dikecilkan dulu sebelum disimpan. Gambar kamera bisa berukuran
           beberapa MB dan itu terlalu besar untuk disimpan di browser. */
        function readLogo(inp) {
            var f = inp.files && inp.files[0]; if (!f) return;
            if (!/^image\//.test(f.type)) { toast('File harus berupa gambar', 'err'); return; }
            var info = document.getElementById('logoInfo');
            if (info) info.textContent = 'Memproses…';

            var r = new FileReader();
            r.onload = function () {
                var asli = String(r.result);
                var pasang = function (data, ket) {
                    document.getElementById('cLogo').value = data;
                    var pv = document.getElementById('logoPreview');
                    if (pv) { pv.src = data; pv.style.display = 'block'; }
                    if (info) info.textContent = ket;
                    CFG.logo = data;
                    pasangIdentitas();       // langsung terlihat di sidebar & login
                    toast('Logo dimuat — tekan "Simpan Pengaturan" untuk menyimpan', 'ok');
                };
                // SVG tidak perlu (dan tidak bisa) dikecilkan lewat canvas
                if (/svg/.test(f.type)) { pasang(asli, 'SVG · ' + Math.round(asli.length / 1024) + ' KB'); return; }

                var img = new Image();
                img.onload = function () {
                    try {
                        var maks = 256;
                        var skala = Math.min(1, maks / Math.max(img.width, img.height));
                        var w = Math.max(1, Math.round(img.width * skala));
                        var h = Math.max(1, Math.round(img.height * skala));
                        var c = document.createElement('canvas');
                        c.width = w; c.height = h;
                        c.getContext('2d').drawImage(img, 0, 0, w, h);
                        var kecil = c.toDataURL('image/png');
                        var pakai = kecil.length < asli.length ? kecil : asli;
                        pasang(pakai, img.width + '×' + img.height + ' → ' + w + '×' + h +
                            ' · ' + Math.round(pakai.length / 1024) + ' KB');
                    } catch (e) {
                        console.error('readLogo:', e);
                        pasang(asli, Math.round(asli.length / 1024) + ' KB');
                    }
                };
                img.onerror = function () { toast('Gambar tidak bisa dibaca', 'err'); if (info) info.textContent = ''; };
                img.src = asli;
            };
            r.onerror = function () { toast('Gagal membaca file', 'err'); if (info) info.textContent = ''; };
            r.readAsDataURL(f);
        }

        window.hapusLogo = function () {
            var el = document.getElementById('cLogo');
            if (el) el.value = '';
            var pv = document.getElementById('logoPreview');
            if (pv) { pv.src = ''; pv.style.display = 'none'; }
            var info = document.getElementById('logoInfo');
            if (info) info.textContent = '';
            CFG.logo = '';
            pasangIdentitas();
            toast('Logo dihapus — tekan "Simpan Pengaturan" untuk menyimpan', 'ok');
        };
        function fldNum(label, id, v) { return '<div class="field"><label>' + label + '</label><input id="' + id + '" class="num moneyIn" value="' + fmt(v) + '"></div>'; }
        function fldNum4(label, id, v) { return '<div class="field"><label>' + label + '</label><input id="' + id + '" class="num moneyIn4" value="' + fmt4(v) + '"></div>'; }
        function selField(label, id, opts, sel) {
            return '<div class="field"><label>' + label + '</label><select id="' + id + '">' + opts.map(function (o) { return '<option' + (o === sel ? ' selected' : '') + '>' + o + '</option>'; }).join('') + '</select></div>';
        }
        function selInline(id, opts, sel, onchange) {
            return '<select onchange="' + onchange + '" style="padding:8px 12px;border:1px solid var(--line);border-radius:8px;font-size:13px">' +
                opts.map(function (o) { return '<option' + (o === sel ? ' selected' : '') + '>' + o + '</option>'; }).join('') + '</select>';
        }
        function val(id) { var e = document.getElementById(id); return e ? e.value : ''; }
        function set(id, v) { var e = document.getElementById(id); if (e) e.textContent = v; }
        function attachNumInputs() {
            document.querySelectorAll('.moneyIn4').forEach(function (inp) {
                inp.addEventListener('blur', function () { this.value = fmt4(parseNum(this.value)); });
                inp.addEventListener('focus', function () { var n = parseNum(this.value); this.value = n ? String(n) : ''; });
            });
            document.querySelectorAll('.moneyIn').forEach(function (inp) {
                inp.addEventListener('blur', function () { this.value = fmt(parseNum(this.value)); });
                inp.addEventListener('focus', function () { var n = parseNum(this.value); this.value = n ? String(n) : ''; });
            });
        }

        /* CONTOH DATA — hanya diisi bila aplikasi masih kosong & belum tersambung Sheet */
        function seedSample() {
            var empty = !DB.barang.length && !DB.penjualan.length && !DB.pembelian.length &&
                !DB.modal.length && !DB.kasbank.length && !DB.quotation.length;
            if (!empty || CFG.apiUrl) return;
            // Master barang
            [['BRG001', 'Kertas A4 80gr', 'Rim', 100, 45000, 52000],
            ['BRG002', 'Pulpen Hitam', 'Pcs', 200, 1500, 2500],
            ['BRG003', 'Tinta Printer', 'Botol', 30, 85000, 120000],
            ['BRG004', 'Map Plastik', 'Pcs', 8, 3000, 5000]
            ].forEach(function (r) {
                DB.barang.push({ id: uid(), kode: r[0], nama: r[1], satuan: r[2], stok: r[3], stokMin: 5, hargaBeli: r[4], hargaJual: r[5] });
            });
            // Modal awal -> Bank
            var mNo = nextNo('MDL');
            DB.modal.push({ id: uid(), no: mNo, tanggal: todayStr(), jenis: 'Setor', akun: 'Bank', jumlah: 50000000, keterangan: 'Setoran modal awal' });
            DB.kasbank.push({ id: uid(), tanggal: todayStr(), akun: 'Bank', arah: 'Masuk', kategori: 'Modal', jumlah: 50000000, keterangan: 'Modal Setor - ' + mNo, ref: mNo, auto: true });
            // Pembelian
            var pNo = nextNo('PO'), pItems = [{ kode: 'BRG001', nama: 'Kertas A4 80gr', qty: 50, harga: 45000, subtotal: 2250000, hargaCNY: 0 }, { kode: 'BRG003', nama: 'Tinta Printer', qty: 20, harga: 85000, subtotal: 1700000, hargaCNY: 0 }];
            var pSub = 3950000, pTot = round2(pSub);
            DB.pembelian.push({ id: uid(), no: pNo, tanggal: todayStr(), pelanggan: 'PT Sumber Kertas', akun: 'Bank', items: pItems, subtotal: pSub, diskon: 0, biayaLain: 0, kursCNY: 1, total: pTot, catatan: 'Pembelian stok bulanan' });
            findBarang('BRG001').stok += 50; findBarang('BRG003').stok += 20;
            DB.kasbank.push({ id: uid(), tanggal: todayStr(), akun: 'Bank', arah: 'Keluar', kategori: 'Pembelian', jumlah: pTot, keterangan: 'Pembelian ' + pNo + ' - PT Sumber Kertas', ref: pNo, auto: true });
            // Penjualan
            var sNo = nextNo('INV'), sItems = [{ kode: 'BRG001', nama: 'Kertas A4 80gr', qty: 10, harga: 52000, subtotal: 520000 }, { kode: 'BRG002', nama: 'Pulpen Hitam', qty: 30, harga: 2500, subtotal: 75000 }];
            var sSub = 595000, sDisc = 50000, sTot = round2(sSub - sDisc);
            DB.penjualan.push({ id: uid(), no: sNo, tanggal: todayStr(), pelanggan: 'Toko Maju Jaya', akun: 'Kas', items: sItems, subtotal: sSub, diskon: sDisc, total: sTot, catatan: 'Terima kasih atas pesanan Anda' });
            findBarang('BRG001').stok -= 10; findBarang('BRG002').stok -= 30;
            DB.kasbank.push({ id: uid(), tanggal: todayStr(), akun: 'Kas', arah: 'Masuk', kategori: 'Penjualan', jumlah: sTot, keterangan: 'Penjualan ' + sNo + ' - Toko Maju Jaya', ref: sNo, auto: true });
            // Biaya operasional
            DB.kasbank.push({ id: uid(), tanggal: todayStr(), akun: 'Kas', arah: 'Keluar', kategori: 'Operasional', jumlah: 75000, keterangan: 'Biaya ATK & materai', ref: '', auto: false });
            // Quotation (nama bebas, tidak menyentuh stok)
            var qNo = nextNo('QT'), qItems2 = [{ nama: 'Jasa Instalasi Jaringan', qty: 1, harga: 5000000, subtotal: 5000000 }, { nama: 'Kertas A4 80gr', qty: 5, harga: 52000, subtotal: 260000 }];
            var qSub = 5260000, qTot = round2(qSub);
            DB.quotation.push({ id: uid(), no: qNo, tanggal: todayStr(), berlaku: new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10), pelanggan: 'CV Harapan Baru', items: qItems2, subtotal: qSub, diskon: 0, total: qTot, catatan: 'Harga belum termasuk ongkos kirim. Berlaku 14 hari.' });
            saveLocal();
        }

        /* FIX DB DATA */
        function fixDB() {
            if (!DB.coa) DB.coa = [];
            if (!DB.jurnal) DB.jurnal = [];

            normalisasiDB();
            // Jangan sampai tarik-ulang data menghapus akun yang sedang dipakai
            if (!DB.users.length) {
                DB.users = [{ username: 'admin', password: 'admin123', role: 'Admin', menus: ALL_MENU_KEYS.slice() }];
            }
            migrasiGudang();
            DB.coa.forEach(function (a) { a.kode = String(a.kode); a.saldoAwal = Number(a.saldoAwal) || 0; });
            DB.jurnal.forEach(function (j) {
                j.auto = (j.auto === true || j.auto === 'true' || j.auto === 'TRUE' || j.auto === 1);
                (j.lines || []).forEach(function (l) { l.akun = String(l.akun); l.debit = Number(l.debit) || 0; l.kredit = Number(l.kredit) || 0; });
            });
            if (DB.penjualan) {
                DB.penjualan.forEach(function (x) {
                    var calc = round2((Number(x.subtotal) || 0) - (Number(x.diskon) || 0));
                    if (Number(x.total) !== calc) x.total = calc;
                });
            }
            if (DB.pembelian) {
                DB.pembelian.forEach(function (x) {
                    var calc = round2((Number(x.subtotal) || 0) - (Number(x.diskon) || 0) + (Number(x.biayaLain) || 0));
                    if (Number(x.total) !== calc) x.total = calc;
                });
            }
            if (DB.quotation) {
                DB.quotation.forEach(function (x) {
                    var calc = round2((Number(x.subtotal) || 0) - (Number(x.diskon) || 0));
                    if (Number(x.total) !== calc) x.total = calc;
                });
            }
        }

        /* BOOT */
        /* Status koneksi di layar login. Pesannya SELALU diperbarui — jangan
           sampai tulisan "Menghubungkan…" tertinggal padahal sudah selesai. */
        function pesanLogin(teks, warna) {
            var err = document.getElementById('loginError');
            if (!err) return;
            if (!teks) { err.style.display = 'none'; return; }
            err.textContent = teks;
            err.style.color = warna || 'var(--muted)';
            err.style.display = 'block';
        }

        // Kunci form login selama daftar pengguna belum termuat.
        function siapkanLogin(sedangMemuat) {
            var btn = document.getElementById('btnMasuk');
            if (btn) {
                btn.disabled = !!sedangMemuat;
                btn.textContent = sedangMemuat ? 'Menghubungkan…' : 'Masuk';
                btn.style.opacity = sedangMemuat ? '.6' : '';
                btn.style.cursor = sedangMemuat ? 'wait' : '';
            }
            var ulang = document.getElementById('btnUlangKoneksi');
            if (ulang) ulang.style.display = 'none';
            if (sedangMemuat) pesanLogin('Menghubungkan ke Spreadsheet…');
        }

        // Koneksi gagal: beri tahu jelas + sediakan tombol coba lagi
        function gagalKoneksi(alasan) {
            siapkanLogin(false);
            pesanLogin('Tidak terhubung ke Spreadsheet' + (alasan ? ' — ' + alasan : '') +
                '. Anda masih bisa masuk, tetapi data tidak akan tersimpan.', 'var(--danger)');
            var ulang = document.getElementById('btnUlangKoneksi');
            if (ulang) ulang.style.display = 'block';
        }

        window.ulangKoneksi = function () {
            siapkanLogin(true);
            tarikUsers().then(function (ok) {
                siapkanLogin(false);
                setSync(ok);
                if (ok) pesanLogin('Terhubung. Silakan masuk.', 'var(--ok)');
                else gagalKoneksi('percobaan ulang gagal');
            });
        };

        // Inisial perusahaan, dipakai kalau logo belum diunggah.
        // Bentuk badan usaha (PT, CV, UD, ...) tidak dihitung.
        var KATA_BADAN = ['pt', 'cv', 'ud', 'pd', 'tbk', 'persero', 'koperasi', 'toko', 'the'];
        function inisialPerusahaan() {
            var kata = String(CFG.company || 'App').replace(/[^A-Za-z0-9 ]/g, ' ').trim().split(/\s+/)
                .filter(function (w) { return w && KATA_BADAN.indexOf(w.toLowerCase()) === -1; });
            if (!kata.length) kata = String(CFG.company || 'App').replace(/[^A-Za-z0-9 ]/g, ' ').trim().split(/\s+/);
            var ini = kata.slice(0, 2).map(function (w) { return w.charAt(0).toUpperCase(); }).join('');
            return ini || String(CFG.company || 'A').charAt(0).toUpperCase();
        }

        /* Nama + logo perusahaan di sidebar, layar login, dan ikon tab browser.
           Kalau logo belum diunggah, dipakai inisial namanya. */
        function pasangIdentitas() {
            var nama = CFG.company || 'Aplikasi Penjualan';
            var el = document.getElementById('sideCo');
            if (el) el.textContent = nama;

            var punyaLogo = !!(CFG.logo && String(CFG.logo).length > 20);

            var mark = document.getElementById('brandMark');
            if (mark) {
                mark.innerHTML = punyaLogo
                    ? '<img src="' + esc(CFG.logo) + '" alt="Logo ' + esc(nama) + '">'
                    : esc(inisialPerusahaan());
                mark.classList.toggle('ada-logo', punyaLogo);
                mark.title = nama;
            }

            var lo = document.getElementById('loginLogo');
            if (lo) {
                lo.innerHTML = punyaLogo
                    ? '<img src="' + esc(CFG.logo) + '" alt="Logo ' + esc(nama) + '">'
                    : '🔐';
                lo.classList.toggle('ada-logo', punyaLogo);
            }
            var ln = document.getElementById('loginCo');
            if (ln) ln.textContent = nama;

            // Ikon tab browser ikut logo perusahaan
            if (punyaLogo) {
                var ikon = document.getElementById('favicon');
                if (!ikon) {
                    ikon = document.createElement('link');
                    ikon.id = 'favicon'; ikon.rel = 'icon';
                    (document.head || document.body).appendChild(ikon);
                }
                ikon.href = CFG.logo;
            }
            document.title = nama;
        }

        /* Ambil daftar pengguna saja — jauh lebih ringan daripada getAll,
           jadi layar login bisa dipakai dalam hitungan detik. */
        /* Balasan Apps Script HARUS JSON. Kalau yang datang halaman HTML
           (diawali '<'), berarti URL Web App salah, deployment versi lama,
           atau akses ditolak — beri pesan yang menyebut itu, bukan
           "Unexpected token '<'". */
        function parseBalasan(r) {
            return r.text().then(function (t) {
                var s = String(t || '').trim();
                if (s.charAt(0) === '<') {
                    throw new Error('Server membalas halaman HTML, bukan data. ' +
                        'Biasanya: URL Web App salah / deployment versi lama / akses bukan "Anyone". ' +
                        'Deploy ulang Code.gs sebagai versi baru lalu periksa URL di Pengaturan.');
                }
                try { return JSON.parse(s); }
                catch (e) { throw new Error('Balasan server tidak terbaca sebagai JSON'); }
            });
        }

        /* fetch dengan batas waktu — supaya tidak menggantung tanpa ujung
           kalau URL salah atau jaringan tidak menjawab. */
        var ALASAN_GAGAL = '';
        function ambil(url, opsi, detik) {
            opsi = opsi || {};
            var batas = (detik || 20) * 1000;
            if (typeof AbortController === 'function') {
                var ac = new AbortController();
                opsi.signal = ac.signal;
                var timer = setTimeout(function () { ac.abort(); }, batas);
                return fetch(url, opsi).then(function (r) { clearTimeout(timer); return r; },
                    function (e) { clearTimeout(timer); throw e; });
            }
            return Promise.race([
                fetch(url, opsi),
                new Promise(function (_, tolak) {
                    setTimeout(function () { tolak(new Error('waktu habis (' + (detik || 20) + ' detik)')); }, batas);
                })
            ]);
        }

        function tarikUsers() {
            ALASAN_GAGAL = '';
            if (!CFG.apiUrl) { ALASAN_GAGAL = 'URL Web App belum diisi'; return Promise.resolve(false); }
            return ambil(CFG.apiUrl + '?action=getUsers&t=' + Date.now(), {}, 30)
                .then(parseBalasan)
                .then(function (j) {
                    if (!j || !j.ok) { ALASAN_GAGAL = (j && j.error) ? String(j.error) : 'respons tidak dikenali'; return false; }
                    if (!Array.isArray(j.users)) { ALASAN_GAGAL = 'daftar pengguna tidak terbaca'; return false; }
                    // Header sheet Users rusak -> baris ada tapi tanpa kolom username
                    if (j.users.length && !j.users.some(function (u) { return u && u.username; })) {
                        ALASAN_GAGAL = 'header sheet Users tidak sesuai (kolom "username" tidak ditemukan)';
                        return false;
                    }
                    DB.users = j.users;
                    DB.users.forEach(function (u) {
                        if (u.menus !== undefined && !Array.isArray(u.menus)) u.menus = arr(u.menus);
                    });
                    if (j.serverTime) CFG.lastSyncTime = j.serverTime;
                    terapkanCfgServer(j.cfg);     // logo & nama sudah tampil di layar login
                    return true;
                })
                .catch(function (e) {
                    ALASAN_GAGAL = (e && e.name === 'AbortError') ? 'waktu habis 20 detik'
                        : (e && e.message ? e.message : 'jaringan tidak menjawab');
                    console.error('tarikUsers:', e);
                    return false;
                });
        }

        /* Tarik seluruh data. Dipanggil setelah login berhasil. */
        function tarikSemuaData(sesudah) {
            var main = document.getElementById('main');
            if (main) main.innerHTML = '<div class="loading-box">⏳ Memuat data dari Spreadsheet…</div>';
            return cloudPull().then(function (ok) {
                setSync(ok);
                fixDB();
                if (!ok && !CFG.apiUrl) seedSample();
                seedCOA();
                pastikanAkunWajib();
                migrasiTransaksi();
                rebuildAutoJurnal();
                migrasiGudang();
                if (!ok && CFG.apiUrl) {
                    toast('Gagal memuat data dari Spreadsheet. Perubahan tidak akan disimpan sampai berhasil.', 'err');
                }
                if (sesudah) sesudah(ok);
                return ok;
            }).catch(function (e) {
                console.error('tarikSemuaData:', e);
                setSync(false);
                toast('Gagal memuat data: ' + (e && e.message ? e.message : e), 'err');
                if (sesudah) sesudah(false);
                return false;
            });
        }

        function boot() {
            loadLocal();
            pasangIdentitas();
            muatPilihanSidebar();

            if (!CFG.apiUrl) {                     // mode lokal — tidak ada tunggu jaringan
                DATA_SIAP = true;
                fixDB(); seedSample(); seedCOA(); pastikanAkunWajib(); migrasiTransaksi(); rebuildAutoJurnal(); migrasiGudang();
                setSync(false); siapkanLogin(false); checkLogin();
                return;
            }

            // Layar login langsung bisa dipakai; hanya daftar pengguna yang ditunggu.
            siapkanLogin(true);
            tarikUsers().then(function (ok) {
                siapkanLogin(false);
                setSync(ok);
                checkLogin();
                if (ok) pesanLogin('');                      // bersihkan pesan sambungan
                else gagalKoneksi(ALASAN_GAGAL);
            });
        }
        /* Bungkus semua handler yang mengubah data agar errornya selalu terbaca */
        [['menyimpan gudang', 'saveGudang'], ['menghapus gudang', 'delGudang'],
        ['memproses transfer', 'saveTransfer'], ['membatalkan transfer', 'delTransfer'],
        ['menyimpan barang', 'saveBarang'], ['menghapus barang', 'delBarang'],
        ['menyimpan pengguna', 'saveUser'], ['menghapus pengguna', 'delUser'],
        ['menyimpan transaksi', 'saveTrx'], ['menghapus transaksi', 'delTrx'],
        ['submit transaksi', 'submitTrx'], ['membuka form', 'formGudang'],
        ['membuka form', 'formTransfer'], ['membuka form', 'formBarang'],
        ['membuka halaman', 'renderGudang'], ['membuka halaman', 'renderTransfer']
        ].forEach(function (p) {
            if (typeof window[p[1]] === 'function') window[p[1]] = amanCall(p[0], window[p[1]]);
        });

        boot();

// Mobile Navigation Toggle
document.addEventListener('DOMContentLoaded', function () {
    // Tutup laci menu dengan tombol X di sidebar
    var btnClose = document.getElementById('sideClose');
    if (btnClose) btnClose.addEventListener('click', tutupSidebar);

    // Esc menutup laci menu / modal
    document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        var s = document.getElementById('sidebar');
        if (s && s.classList.contains('show')) { tutupSidebar(); return; }
        var ov = document.getElementById('overlay');
        if (ov && ov.classList.contains('show')) closeModal();
    });

    // Ganti ukuran layar -> rapikan status sidebar
    window.addEventListener('resize', function () {
        if (!mobile()) { tutupSidebar(); muatPilihanSidebar(); }
        else pasangRail(false);          // di HP selalu laci penuh, bukan bilah ikon
    });

    // Bungkus tabel agar bisa digeser mendatar di layar sempit
    function wrapTables() {
        document.querySelectorAll('table.grid, table.items').forEach(function (table) {
            if (!table.parentElement.classList.contains('table-responsive')) {
                var wrapper = document.createElement('div');
                wrapper.className = 'table-responsive';
                table.parentNode.insertBefore(wrapper, table);
                wrapper.appendChild(table);
            }
        });
    }
    var observer = new MutationObserver(wrapTables);
    ['main', 'modal'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) observer.observe(el, { childList: true, subtree: true });
    });
    wrapTables();
});
