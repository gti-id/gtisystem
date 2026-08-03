/*************************************************************
 * BRIDGE APPS SCRIPT — Aplikasi Penjualan/Pembelian/Stok
 * Spreadsheet sebagai database.
 *
 * Cara pakai:
 *  1. Buka spreadsheet "Test Program".
 *  2. Menu Extensions > Apps Script.
 *  3. Hapus isi Code.gs bawaan, tempel SELURUH file ini.
 *  4. Simpan (ikon disket).
 *  5. Deploy > New deployment > pilih tipe "Web app".
 *       - Description : Bridge Penjualan
 *       - Execute as  : Me (email Anda)
 *       - Who has access : Anyone
 *     Klik Deploy, otorisasi akun Anda.
 *  6. Salin "Web app URL" (diakhiri /exec).
 *  7. Buka aplikasi HTML > menu Pengaturan > tempel URL >
 *     "Simpan & Uji Koneksi".
 *
 * Data disimpan per-sheet (tab). Baris item transaksi
 * disimpan sebagai teks JSON di kolom "Items".
 *************************************************************/

var SPREADSHEET_ID = '1xyar-gvMNp4d-PTNsrNUlCRy4oC7H85ruEwtI7qF5oU';

// Skema kolom tiap sheet (urutan penting).
var SCHEMA = {
  Barang:     ['id','kode','nama','jenis','akunPendapatan','satuan','stok','stokMin','hargaBeli','hargaJual','Lokasi','foto'],
  Penjualan:  ['id','no','tanggal','pelanggan','mitraId','akun','gudang','caraBayar','termin','jatuhTempo','Bayar','Items','subtotal','diskon','total','catatan','sales','status'],
  Pembelian:  ['id','no','tanggal','pelanggan','mitraId','akun','gudang','mataUang','caraBayar','termin','jatuhTempo','Bayar','Items','subtotal','diskon','biayaLain','kursCNY','total','catatan','status'],
  Gudang:     ['id','kode','nama','alamat','pic','aktif','keterangan'],
  Transfer:   ['id','no','tanggal','dari','ke','Items','catatan','status'],
  Mitra:      ['id','kode','nama','jenis','telp','email','alamat','npwp','pic','termin','aktif','catatan'],
  Retur:      ['id','no','tanggal','jenis','refId','refNo','pihak','mitraId','gudang','Items','total','hpp','kredit','akun','alasan','status'],
  Opname:     ['id','no','tanggal','gudang','Items','selisihQty','nilaiSelisih','catatan','status'],
  Modal:      ['id','no','tanggal','jenis','akun','jumlah','keterangan'],
  KasBank:    ['id','tanggal','akun','arah','kategori','jumlah','keterangan','ref','auto'],
  Quotation:  ['id','no','tanggal','berlaku','pelanggan','Items','subtotal','diskon','total','catatan'],
  COA:        ['kode','nama','kelompok','sub','laporan','normal','status','saldoAwal'],
  Jurnal:     ['id','no','tanggal','keterangan','ref','auto','Lines'],
  Users:      ['username','password','nama','role','aktif','Menus'],
  Audit:      ['ts','user','module','action'],
  Counters:   ['key','value'],
  Pengaturan: ['kunci','nilai']
};

// Pemetaan nama koleksi di aplikasi -> nama sheet.
var COLL = {
  barang:'Barang', penjualan:'Penjualan', pembelian:'Pembelian',
  modal:'Modal', kasbank:'KasBank', quotation:'Quotation',
  coa:'COA', jurnal:'Jurnal',
  users:'Users', audit:'Audit',
  gudang:'Gudang', transfer:'Transfer',
  mitra:'Mitra', retur:'Retur', opname:'Opname'
};

function ss_(){ return SpreadsheetApp.openById(SPREADSHEET_ID); }

/* =====================================================================
   PRINSIP BARU: MEMBACA TIDAK PERNAH MENGUBAH SHEET.
   Sebelumnya header ditimpa / baris disusun ulang saat data dibaca, dan
   itu yang membuat data bergeser lalu hilang. Sekarang:
     - getSheet_  : hanya membuat sheet kalau memang belum ada.
     - readSheet_ : membaca memakai header yang ADA di baris 1, apa pun isinya.
     - writeSheet_: menulis header sesuai skema + seluruh data dari aplikasi.
   Artinya kolom baru otomatis rapi setelah sekali "Kirim Data ke Sheet",
   tanpa pernah ada langkah yang bisa menghapus baris.
   ===================================================================== */
function getSheet_(name){
  var head = SCHEMA[name];
  if(!head) throw new Error('Sheet tanpa skema: ' + name);
  var ss = ss_();
  var sh = ss.getSheetByName(name);
  if(!sh){
    sh = ss.insertSheet(name);
    sh.getRange(1,1,1,head.length).setValues([head]);
    sh.setFrozenRows(1);
  }
  return sh;
}

/* Laporan kondisi tiap sheet — murni membaca, tidak mengubah apa pun.
   Dipakai untuk memastikan header dan isinya masih sejajar. */
function diagnosa_(){
  var ss = ss_();
  var hasil = [];
  Object.keys(SCHEMA).forEach(function(name){
    var sh = ss.getSheetByName(name);
    if(!sh){ hasil.push({ sheet:name, ada:false }); return; }
    var lastRow = sh.getLastRow(), lastCol = sh.getLastColumn();
    var head = lastRow >= 1 && lastCol >= 1
      ? sh.getRange(1,1,1,lastCol).getValues()[0].map(function(v){ return String(v||''); })
      : [];
    var contoh = lastRow > 1
      ? sh.getRange(2,1,1,lastCol).getValues()[0].map(function(v){
          var s = String(v);
          return s.length > 40 ? s.substring(0,40) + '…' : s;
        })
      : [];
    var skema = SCHEMA[name];
    var cocok = head.length >= skema.length;
    if(cocok){ for(var i=0;i<skema.length;i++){ if(head[i] !== skema[i]){ cocok = false; break; } } }
    // Kolom JSON harus berisi teks yang diawali [ atau {
    var kolomJson = [];
    ['Items','Lines','Lokasi','Menus','Bayar'].forEach(function(k){
      var idx = head.indexOf(k);
      if(idx === -1) return;
      var v = contoh[idx];
      kolomJson.push({ kolom:k, posisi:idx+1, nilai:v || '(kosong)',
        wajar: (v===undefined || v==='' || v.charAt(0)==='[' || v.charAt(0)==='{') });
    });
    hasil.push({
      sheet:name, ada:true, barisData:Math.max(0,lastRow-1), jumlahKolom:lastCol,
      headerCocokSkema:cocok, header:head, contohBaris:contoh, kolomJson:kolomJson
    });
  });
  return hasil;
}

/* =====================================================================
   PERBAIKAN HEADER — jalankan MANUAL sekali dari editor Apps Script.
   Hanya menulis BARIS 1. Baris data tidak disentuh sama sekali.

   Dipakai saat baris header rusak/terduplikasi sementara datanya masih
   utuh. Nama kolom di bawah disusun mengikuti susunan data yang benar-
   benar ada di sheet, bukan skema terbaru — setelah header benar,
   aplikasi bisa membaca semuanya, lalu "Kirim Data ke Sheet" sekali
   akan merapikan sheet ke skema terbaru.
   ===================================================================== */
var HEADER_PERBAIKAN = {
  Barang: ['id','kode','nama','jenis','akunPendapatan','satuan','stok','stokMin','hargaBeli','hargaJual','Lokasi'],
  Penjualan: ['id','no','tanggal','pelanggan','akun','gudang','Items','subtotal','diskon','total','catatan','sales','status'],
  Pembelian: ['id','no','tanggal','pelanggan','akun','gudang','mataUang','Items','subtotal','diskon','biayaLain','kursCNY','total','catatan','status']
};

function perbaikiHeader(){
  var ss = ss_();
  var laporan = [];
  Object.keys(HEADER_PERBAIKAN).forEach(function(name){
    var sh = ss.getSheetByName(name);
    if(!sh){ laporan.push(name + ': sheet tidak ada, dilewati'); return; }
    var kolom = HEADER_PERBAIKAN[name];
    var lastCol = sh.getLastColumn();
    var lastRow = sh.getLastRow();

    // Pengaman: jumlah kolom data harus sama dengan jumlah nama kolom.
    if(lastCol !== kolom.length){
      laporan.push(name + ': DILEWATI — sheet punya ' + lastCol +
        ' kolom, sedangkan daftar perbaikan ' + kolom.length + ' kolom. Periksa manual.');
      return;
    }
    var sebelum = sh.getRange(1,1,1,lastCol).getValues()[0].join(' | ');
    sh.getRange(1,1,1,lastCol).setValues([kolom]);   // HANYA baris 1
    sh.setFrozenRows(1);
    laporan.push(name + ': header diperbaiki (' + Math.max(0,lastRow-1) + ' baris data tidak disentuh)\\n' +
      '   sebelum: ' + sebelum + '\\n   sesudah: ' + kolom.join(' | '));
  });
  var teks = laporan.join('\\n');
  Logger.log(teks);
  return teks;
}

/* Identitas perusahaan (nama, alamat, logo, dll) disimpan di sheet
   Pengaturan supaya seragam di semua komputer / saat aplikasi di-hosting.
   Nilai panjang seperti logo dipecah ke beberapa baris karena satu sel
   Google Sheets maksimal 50.000 karakter. */
var POTONG_SEL = 45000;

function bacaPengaturan_(){
  var sh = getSheet_('Pengaturan');
  var vals = sh.getDataRange().getValues();
  var kumpul = {};
  for(var i=1;i<vals.length;i++){
    var k = String(vals[i][0]||''); if(!k) continue;
    var dasar = k.replace(/~\d+$/, '');
    kumpul[dasar] = (kumpul[dasar]||'') + String(vals[i][1]==null?'':vals[i][1]);
  }
  return kumpul;
}

function tulisPengaturan_(cfg){
  if(!cfg || typeof cfg !== 'object') return false;
  var sh = getSheet_('Pengaturan');
  var baris = [];
  Object.keys(cfg).forEach(function(k){
    var v = cfg[k];
    if(v === undefined || v === null) v = '';
    v = String(v);
    if(v.length <= POTONG_SEL){ baris.push([k, v]); return; }
    var n = 0;
    for(var i=0;i<v.length;i+=POTONG_SEL){ baris.push([k + '~' + n, v.substr(i, POTONG_SEL)]); n++; }
  });
  if(sh.getLastRow() > 1) sh.getRange(2,1,sh.getLastRow()-1,2).clearContent();
  sh.getRange(1,1,1,2).setValues([['kunci','nilai']]);
  if(baris.length) sh.getRange(2,1,baris.length,2).setValues(baris);
  return true;
}

/* =====================================================================
   CADANGAN OTOMATIS
   Sebelum penyimpanan pertama setiap hari, seluruh Spreadsheet disalin
   ke folder yang sama. Kalau suatu saat data rusak, salinan hari-hari
   sebelumnya masih ada — tidak bergantung pada Version history saja.
   Salinan lebih tua dari JUMLAH_CADANGAN otomatis dibuang.
   ===================================================================== */
var CADANGAN_AKTIF = true;
var JUMLAH_CADANGAN = 7;          // simpan 7 salinan terakhir
var AWALAN_CADANGAN = 'CADANGAN ';

function cadanganHarian_(){
  if(!CADANGAN_AKTIF) return '';
  try{
    var props = PropertiesService.getScriptProperties();
    var zona = Session.getScriptTimeZone() || 'Asia/Jakarta';
    var hariIni = Utilities.formatDate(new Date(), zona, 'yyyy-MM-dd');
    if(props.getProperty('cadanganTgl') === hariIni) return '';   // hari ini sudah

    var file = DriveApp.getFileById(SPREADSHEET_ID);
    var induk = file.getParents();
    var folder = induk.hasNext() ? induk.next() : DriveApp.getRootFolder();
    var namaSalinan = AWALAN_CADANGAN + hariIni + ' - ' + file.getName();
    file.makeCopy(namaSalinan, folder);
    props.setProperty('cadanganTgl', hariIni);
    bersihkanCadanganLama_(folder, file.getName());
    return namaSalinan;
  }catch(e){
    // Gagal mencadangkan tidak boleh menggagalkan penyimpanan data
    Logger.log('cadanganHarian_ gagal: ' + e);
    return '';
  }
}

function bersihkanCadanganLama_(folder, namaAsli){
  try{
    var it = folder.getFilesByName ? null : null;
    var semua = [];
    var daftar = folder.getFiles();
    while(daftar.hasNext()){
      var f = daftar.next();
      var n = f.getName();
      if(n.indexOf(AWALAN_CADANGAN) === 0 && n.indexOf(namaAsli) !== -1){
        semua.push({ file: f, nama: n });
      }
    }
    semua.sort(function(a,b){ return b.nama.localeCompare(a.nama); });   // terbaru dulu
    for(var i = JUMLAH_CADANGAN; i < semua.length; i++){
      semua[i].file.setTrashed(true);
    }
  }catch(e){ Logger.log('bersihkanCadanganLama_ gagal: ' + e); }
}

// Jalankan manual dari editor kalau ingin mencadangkan sekarang juga.
function cadangkanSekarang(){
  PropertiesService.getScriptProperties().deleteProperty('cadanganTgl');
  var n = cadanganHarian_();
  var pesan = n ? 'Cadangan dibuat: ' + n : 'Gagal membuat cadangan — lihat log.';
  Logger.log(pesan);
  return pesan;
}

function ensureSheets_(){
  Object.keys(SCHEMA).forEach(function(n){ getSheet_(n); });
}

// ---- READ semua data -> objek untuk aplikasi ----
function readAll_(){
  ensureSheets_();
  var out = { barang:[], penjualan:[], pembelian:[], modal:[], kasbank:[], quotation:[], coa:[], jurnal:[], users:[], audit:[], mitra:[], retur:[], opname:[], counters:{} };
  Object.keys(COLL).forEach(function(coll){
    var name = COLL[coll];
    out[coll] = readSheet_(name);
  });
  // counters
  var csh = getSheet_('Counters');
  var cvals = csh.getDataRange().getValues();
  for(var i=1;i<cvals.length;i++){
    if(cvals[i][0]) out.counters[cvals[i][0]] = Number(cvals[i][1])||0;
  }
  return out;
}

function readSheet_(name){
  var sh = getSheet_(name);
  var vals = sh.getDataRange().getValues();
  if(vals.length<2) return [];
  // Pakai header yang benar-benar ada di baris 1. Kalau baris 1 kosong,
  // baru pakai skema sebagai perkiraan. Baris data tidak pernah digeser.
  var head = vals[0];
  if(String(head.join('')).trim() === '') head = SCHEMA[name] || head;
  var rows = [];
  for(var r=1;r<vals.length;r++){
    var row = vals[r];
    if(row.join('')==='') continue;
    var obj = {};
    for(var c=0;c<head.length;c++){
      var key = head[c];
      var v = row[c];
      if(key==='Items'){
        obj.items = parseJSON_(v, []);
      } else if(key==='Lines'){
        obj.lines = parseJSON_(v, []);
      } else if(key==='Menus'){
        obj.menus = parseJSON_(v, []);
      } else if(key==='Bayar'){
        obj.bayar = parseJSON_(v, []);
      } else if(key==='Lokasi'){
        obj.lokasi = parseJSON_(v, {});
      } else if(key==='auto'){
        obj.auto = (v===true || v==='true' || v==='TRUE' || v===1);
      } else if(key==='aktif'){
        obj.aktif = !(v===false || v==='false' || v==='FALSE' || v===0 || v==='0');
      } else {
        obj[key]= v;
      }
    }
    rows.push(obj);
  }
  return rows;
}

// ---- WRITE semua data (replace) ----
/* Batas kewajaran penyusutan data. Kalau kiriman jauh lebih sedikit dari
   yang sudah tersimpan, hampir pasti aplikasi gagal memuat data — bukan
   penghapusan yang disengaja. */
var AMBANG_SUSUT = 0.5;      // menyusut lebih dari 50% dianggap mencurigakan
var MIN_BARIS_JAGA = 3;      // sheet dengan < 3 baris tidak perlu dijaga ketat

/* bolehKosong = true hanya dikirim saat pengguna sengaja menghapus data
   lewat tombol "Hapus Semua Data" / "Hapus Transaksi Saja". */
function writeAll_(data, bolehKosong){
  ensureSheets_();
  var dilewati = [];
  Object.keys(COLL).forEach(function(coll){
    var name = COLL[coll];
    var isi = data[coll] || [];

    /* PENGAMAN UTAMA — berlaku untuk SEMUA sheet:
       kiriman kosong atau menyusut drastis tidak boleh menimpa data yang ada. */
    if(!bolehKosong){
      var sh = getSheet_(name);
      var lamaJml = Math.max(0, sh.getLastRow() - 1);
      if(lamaJml >= MIN_BARIS_JAGA && isi.length < lamaJml * AMBANG_SUSUT){
        dilewati.push(name + ' (' + lamaJml + ' → ' + isi.length + ' baris)');
        return;
      }
      if(!isi.length && lamaJml > 0){
        dilewati.push(name + ' (' + lamaJml + ' → 0 baris)');
        return;
      }
    }
    writeSheet_(name, isi);
  });
  // counters
  var csh = getSheet_('Counters');
  csh.clearContents();
  csh.getRange(1,1,1,2).setValues([['key','value']]);
  var counters = data.counters||{};
  var keys = Object.keys(counters);
  if(keys.length){
    var rows = keys.map(function(k){ return [k, counters[k]]; });
    csh.getRange(2,1,rows.length,2).setValues(rows);
  }
  SpreadsheetApp.flush();
  return dilewati;
}

function writeSheet_(name, arr){
  var sh = getSheet_(name);
  var head = SCHEMA[name];
  // clear existing data rows
  if(sh.getLastRow()>1){
    sh.getRange(2,1,sh.getLastRow()-1,head.length).clearContent();
  }
  if(!arr || !arr.length) return;
  var out = arr.map(function(o){
    return head.map(function(key){
      if(key==='Items') return JSON.stringify(o.items||[]);
      if(key==='Lines') return JSON.stringify(o.lines||[]);
      if(key==='Menus') return JSON.stringify(o.menus||[]);
      if(key==='Bayar')  return JSON.stringify(o.bayar||[]);
      if(key==='Lokasi') return JSON.stringify(o.lokasi||{});
      if(key==='auto')  return o.auto?true:false;
      if(key==='aktif') return (o.aktif===false)?false:true;
      var v = o[key];
      return (v===undefined||v===null)?'':v;
    });
  });
  sh.getRange(2,1,out.length,head.length).setValues(out);
}

function parseJSON_(v, dflt){
  if(v===undefined||v===null||v==='') return dflt;
  if(typeof v==='object') return v;
  if(typeof v!=='string') return dflt;              // angka/tanggal bukan JSON
  var hasil;
  try{ hasil = JSON.parse(v); }catch(e){ return dflt; }
  // Pastikan bentuknya sesuai harapan (array tetap array, objek tetap objek)
  if(Array.isArray(dflt)) return Array.isArray(hasil) ? hasil : dflt;
  if(dflt && typeof dflt==='object') return (hasil && typeof hasil==='object' && !Array.isArray(hasil)) ? hasil : dflt;
  return hasil;
}

// Waktu tulis terakhir di server. Dipakai untuk deteksi konflik.
// PENTING: nilai ini WAJIB ikut dikirim di doGet, kalau tidak klien
// selalu mengirim lastSyncTime = 0 dan setiap penyimpanan dianggap konflik.
function serverTime_(){
  var props = PropertiesService.getScriptProperties();
  var t = parseInt(props.getProperty('serverSyncTime') || '0', 10);
  if(!t){
    t = new Date().getTime();
    props.setProperty('serverSyncTime', String(t));
  }
  return t;
}

// ---- HTTP handlers ----
function doGet(e){
  try{
    var action = (e && e.parameter && e.parameter.action) || 'getAll';
    if(action==='getAll'){
      return json_({ ok:true, data: readAll_(), cfg: bacaPengaturan_(), serverTime: serverTime_() });
    }
    // Endpoint ringan khusus layar login: hanya baca sheet Users.
    // Jauh lebih cepat daripada getAll yang membaca seluruh sheet.
    if(action==='getUsers'){
      return json_({ ok:true, users: readSheet_('Users'), cfg: bacaPengaturan_(), serverTime: serverTime_() });
    }
    // Diagnosa: tampilkan header & contoh baris apa adanya, tanpa mengubah apa pun.
    if(action==='diag'){
      return json_({ ok:true, sheets: diagnosa_() });
    }
    if(action==='init'){
      ensureSheets_();
      return json_({ ok:true, message:'Sheets siap.' });
    }
    return json_({ ok:false, error:'unknown action' });
  }catch(err){
    return json_({ ok:false, error:String(err) });
  }
}

function doPost(e){
  var lock = LockService.getScriptLock();
  try{
    // Wait for up to 10 seconds for other processes to finish.
    lock.waitLock(10000);
    
    var body = {};
    if(e && e.postData && e.postData.contents){
      body = JSON.parse(e.postData.contents);
    }
    var action = body.action || 'saveAll';
    if(action==='saveAll'){
      var data = body.data || {};
      
      // Cek konflik: data klien lebih tua dari tulisan terakhir di server.
      var props = PropertiesService.getScriptProperties();
      var currentServerTime = parseInt(props.getProperty('serverSyncTime') || '0', 10);
      var clientSyncTime = parseInt(body.lastSyncTime || 0, 10);
      var force = (body.force === true || body.force === 'true');

      if (!force && currentServerTime > 0 && clientSyncTime > 0 && clientSyncTime < currentServerTime) {
         return json_({
           ok:false, error:'CONFLICT',
           message:'Data di Spreadsheet lebih baru dari data di layar Anda.',
           serverTime: currentServerTime
         });
      }

      // Cadangkan dulu (sekali sehari), baru tulis data
      var namaCadangan = cadanganHarian_();
      var dilewati = writeAll_(data, body.bolehKosong === true);
      if(body.cfg) tulisPengaturan_(body.cfg);
      
      // Update server time AFTER successful write
      var newTime = new Date().getTime();
      props.setProperty('serverSyncTime', newTime.toString());
      
      return json_({
        ok:true,
        message: dilewati.length
          ? 'Tersimpan, tapi ' + dilewati.length + ' sheet dilewati karena kiriman kosong: ' + dilewati.join(', ')
          : 'Tersimpan.',
        dilewati: dilewati,
        cadangan: namaCadangan,
        serverTime: newTime
      });
    }
    return json_({ ok:false, error:'unknown action' });
  }catch(err){
    return json_({ ok:false, error:String(err) });
  }finally{
    lock.releaseLock();
  }
}

function json_(obj){
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ---- Utilitas manual (opsional, jalankan dari editor) ----
function setup(){ ensureSheets_(); }              // buat semua tab + header
function testRead(){ Logger.log(JSON.stringify(readAll_())); }
