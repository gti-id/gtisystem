/* Test harness: loads the REAL app script from AplikasiPenjualan.html
   into a stub-DOM VM and drives every module with sample data.
   Jalankan: node test.js */
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync(__dirname + '/AplikasiPenjualan.html', 'utf8');
const m = html.match(/<script>([\s\S]*)<\/script>/);
if (!m) { console.error('script not found'); process.exit(1); }
let code = m[1];

/* ---------------- Stub DOM ---------------- */
const ELEMENTS = {};
function makeEl(id){
  const el = {
    id, _value:'', textContent:'', style:{},
    classList:{ add(){}, remove(){}, toggle(){}, contains(){return false;} },
    addEventListener(){}, querySelectorAll(){return [];}, querySelector(){return null;},
    closest(){return null;}, click(){}, files:[],
    get value(){return this._value;},
    set value(v){this._value=v;}
  };
  Object.defineProperty(el,'innerHTML',{
    get(){return this._html||'';},
    set(v){ this._html=v; parseForIds(v); }
  });
  ELEMENTS[id]=el; return el;
}
function getEl(id){ return ELEMENTS[id] || makeEl(id); }

/* Parse an HTML string for id'd inputs/selects so val(id) works */
function parseForIds(str){
  if(typeof str!=='string') return;
  const inRe = /<input\b[^>]*\bid="([^"]+)"[^>]*>/g; let mm;
  while((mm=inRe.exec(str))){
    const tag=mm[0], id=mm[1];
    const vm2=tag.match(/\bvalue="([^"]*)"/);
    const el=getEl(id); el._value = vm2?decodeHtml(vm2[1]):'';
  }
  const selRe = /<select\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/select>/g;
  while((mm=selRe.exec(str))){
    const id=mm[1], body=mm[2];
    let val='';
    const selOpt = body.match(/<option\b[^>]*\bselected[^>]*\bvalue="([^"]*)"[^>]*>/) ||
                   body.match(/<option\b[^>]*\bvalue="([^"]*)"[^>]*\bselected[^>]*>/);
    if(selOpt) val=selOpt[1];
    else {
      const selTxt = body.match(/<option\b[^>]*\bselected[^>]*>([^<]*)<\/option>/);
      if(selTxt) val=selTxt[1];
      else { const first=body.match(/<option\b[^>]*>([^<]*)<\/option>/); if(first) val=first[1]; }
    }
    getEl(id)._value = decodeHtml(val.trim());
  }
}
function decodeHtml(s){ return String(s).replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'"); }

const documentStub = {
  getElementById:getEl,
  querySelectorAll(){return [];},
  createElement(){return {click(){}, set href(v){}, set download(v){}, style:{}};},
  body:{appendChild(){}, removeChild(){}}
};
const localStorageStub = (()=>{const s={};return{getItem:k=>k in s?s[k]:null,setItem:(k,v)=>{s[k]=v;},removeItem:k=>{delete s[k];}};})();

const sandbox = {
  console, Date, Math, JSON, Number, String, Array, Object, isFinite, parseFloat, parseInt,
  setTimeout:()=>0, clearTimeout:()=>{}, Promise,
  document:documentStub, localStorage:localStorageStub,
  confirm:()=>true, alert:()=>{}, fetch:()=>Promise.reject('no-net'),
  window:{}, Blob:function(){}, URL:{createObjectURL:()=>''}, FileReader:function(){}
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
sandbox.print = function(){};

vm.createContext(sandbox);
vm.runInContext(code, sandbox);
const C = sandbox;

/* reset seeded sample data for deterministic tests */
C.CFG.apiUrl = '';
C.DB = {barang:[],penjualan:[],pembelian:[],modal:[],kasbank:[],quotation:[],coa:[],jurnal:[],counters:{}};
C.seedCOA();

/* ---------------- Test utils ---------------- */
let pass=0, fail=0;
function eq(name, got, want){
  const ok = String(got)===String(want);
  console.log((ok?'  ✓':'  ✗')+' '+name+'  => '+got+(ok?'':'   (expected '+want+')'));
  ok?pass++:fail++;
}
function ok(name, cond){ console.log((cond?'  ✓':'  ✗')+' '+name); cond?pass++:fail++; }
function setv(id,v){ getEl(id)._value=String(v); }
const T = C.todayStr();

console.log('\n=== 1. FORMAT ANGKA & TERBILANG ===');
eq('fmt(1234567.891)', C.fmt(1234567.891), '1,234,567.89');
eq('fmt(0)', C.fmt(0), '0.00');
eq('parseNum("1,234,567.89")', C.parseNum('1,234,567.89'), 1234567.89);
eq('parseNum("-500")', C.parseNum('-500'), -500);
eq('terbilang(1250000)', C.cap(C.terbilang(1250000)), 'Satu juta dua ratus lima puluh ribu');

console.log('\n=== 2. COA (Chart of Accounts) ===');
ok('COA ter-seed dari Master COA (>= 85 akun)', C.DB.coa.length >= 85);
eq('akun kas', C.findAkun('1101').nama, 'Kas');
eq('akun bank', C.findAkun('1102').nama, 'Bank BCA');
eq('akun penjualan', C.findAkun('4101').nama, 'Penjualan Barang');
eq('akun HPP', C.findAkun('5101').nama, 'HPP Penjualan Barang');
eq('akun persediaan normal Debit', C.findAkun('1131').normal, 'Debit');
eq('akun utang usaha normal Kredit', C.findAkun('2101').normal, 'Kredit');

console.log('\n=== 3. MASTER BARANG ===');
function addBarang(kode,nama,satuan,stok,beli,jual){
  C.formBarang();
  setv('bKode',kode); setv('bNama',nama); setv('bSatuan',satuan);
  setv('bStok',stok); setv('bStokMin','5'); setv('bBeli',beli); setv('bJual',jual);
  C.saveBarang('');
}
addBarang('BRG001','Kertas A4 80gr','Rim','100','45000','52000');
addBarang('BRG002','Pulpen Hitam','Pcs','200','1500','2500');
addBarang('BRG003','Tinta Printer','Botol','30','85000','120000');
eq('jumlah barang', C.DB.barang.length, 3);
addBarang('BRG001','Duplikat','Pcs','5','1','2');
eq('kode duplikat ditolak (tetap 3)', C.DB.barang.length, 3);

console.log('\n=== 4. MODAL (setor 50jt ke Bank) + JURNAL OTOMATIS ===');
C.formModal();
setv('mJenis','Setor'); setv('mAkun','Bank'); setv('mJml','50000000'); setv('mKet','Setoran modal awal');
C.saveModal();
eq('total modal', C.fmt(C.totalModal()), '50,000,000.00');
eq('saldo Bank (buku kas/bank)', C.fmt(C.saldoAkun('Bank')), '50,000,000.00');
let jm = C.DB.jurnal.find(j=>j.ref===C.DB.modal[0].no);
ok('jurnal modal terbentuk otomatis', !!jm);
eq('jurnal modal: Dr 1102', jm.lines.find(l=>l.akun==='1102').debit, 50000000);
eq('jurnal modal: Cr 3101', jm.lines.find(l=>l.akun==='3101').kredit, 50000000);
eq('saldo akun Bank di buku besar', C.fmt(C.saldoAkunL('1102', T)), '50,000,000.00');

console.log('\n=== 5. PEMBELIAN FINAL (stok naik, bank turun, jurnal persediaan) ===');
C.formTrx('beli');
setv('tPihak','PT Sumber Kertas'); setv('tAkun','Bank');
C.pickItem(0,'BRG001','beli'); C.updItem(0,'qty','50','beli');
C.addItem('beli');
C.pickItem(1,'BRG003','beli'); C.updItem(1,'qty','20','beli');
setv('tDisc','0'); setv('tBiayaLain','0');
C.saveTrx('beli', false);
const beli = C.DB.pembelian[0];
eq('subtotal pembelian', C.fmt(beli.subtotal), C.fmt(50*45000+20*85000));       // 3,950,000
eq('status Final', beli.status, 'Final');
eq('stok BRG001 naik 100->150', C.findBarang('BRG001').stok, 150);
eq('stok BRG003 naik 30->50', C.findBarang('BRG003').stok, 50);
eq('saldo Bank turun', C.fmt(C.saldoAkun('Bank')), C.fmt(50000000-3950000));
let jb = C.DB.jurnal.find(j=>j.ref===beli.no);
ok('jurnal pembelian terbentuk', !!jb);
eq('jurnal beli: Dr 1131 (persediaan)', jb.lines.find(l=>l.akun==='1131').debit, 3950000);
eq('jurnal beli: Cr 1102 (bank)', jb.lines.find(l=>l.akun==='1102').kredit, 3950000);

console.log('\n=== 6. PENJUALAN FINAL (diskon, HPP, jurnal) ===');
C.formTrx('jual');
setv('tPihak','Toko Maju'); setv('tAkun','Kas'); setv('tDisc','50000');
C.pickItem(0,'BRG001','jual'); C.updItem(0,'qty','10','jual');
C.addItem('jual');
C.pickItem(1,'BRG002','jual'); C.updItem(1,'qty','30','jual');
C.saveTrx('jual', false);
const jual = C.DB.penjualan[0];
const subJual = 10*52000 + 30*2500;      // 595,000
eq('subtotal penjualan', C.fmt(jual.subtotal), C.fmt(subJual));
eq('total (sub - diskon)', C.fmt(jual.total), C.fmt(subJual-50000)); // 545,000
eq('stok BRG001 turun 150->140', C.findBarang('BRG001').stok, 140);
eq('stok BRG002 turun 200->170', C.findBarang('BRG002').stok, 170);
eq('saldo Kas naik', C.fmt(C.saldoAkun('Kas')), C.fmt(545000));
let jj = C.DB.jurnal.find(j=>j.no==='JU-'+jual.no);
ok('jurnal penjualan terbentuk', !!jj);
eq('jurnal jual: Dr 1101 (kas)', jj.lines.find(l=>l.akun==='1101').debit, 545000);
eq('jurnal jual: Dr 4102 (diskon)', jj.lines.find(l=>l.akun==='4102').debit, 50000);
eq('jurnal jual: Cr 4101 (penjualan)', jj.lines.find(l=>l.akun==='4101').kredit, 595000);
const hpp = 10*45000 + 30*1500;          // 495,000
let jh = C.DB.jurnal.find(j=>j.no==='HPP-'+jual.no);
ok('jurnal HPP terbentuk', !!jh);
eq('jurnal HPP: Dr 5101', jh.lines.find(l=>l.akun==='5101').debit, hpp);
eq('jurnal HPP: Cr 1131', jh.lines.find(l=>l.akun==='1131').kredit, hpp);

console.log('\n=== 7. STOK TIDAK BOLEH MINUS ===');
C.formTrx('jual');
setv('tPihak','Tes Minus'); setv('tAkun','Kas'); setv('tDisc','0');
C.pickItem(0,'BRG003','jual'); C.updItem(0,'qty','9999','jual');
C.saveTrx('jual', false);
eq('penjualan ditolak (tetap 1)', C.DB.penjualan.length, 1);

console.log('\n=== 8. KAS/BANK MANUAL + AKUN LAWAN ===');
C.formKB();
setv('kAkun','Kas'); setv('kArah','Keluar'); setv('kKat','Operasional');
setv('kLawan','6105'); setv('kJml','75000'); setv('kKet','Biaya ATK & materai');
C.saveKB();
eq('saldo Kas setelah biaya', C.fmt(C.saldoAkun('Kas')), C.fmt(545000-75000));
let kb = C.DB.kasbank.find(k=>!k.auto && k.kategori==='Operasional');
let jkb = C.DB.jurnal.find(j=>j.ref===kb.id);
ok('jurnal kas/bank manual terbentuk', !!jkb);
eq('jurnal biaya: Dr 6105 (ATK)', jkb.lines.find(l=>l.akun==='6105').debit, 75000);
eq('jurnal biaya: Cr 1101 (kas)', jkb.lines.find(l=>l.akun==='1101').kredit, 75000);

console.log('\n=== 9. SEMUA JURNAL SEIMBANG (Dr = Cr) ===');
let allBalanced = true;
C.DB.jurnal.forEach(j=>{
  let d=0,k=0; j.lines.forEach(l=>{d+=l.debit;k+=l.kredit;});
  if(C.round2(d-k)!==0) allBalanced=false;
});
ok('setiap entri jurnal balance', allBalanced);

console.log('\n=== 10. LAPORAN LABA RUGI (berbasis buku besar) ===');
const first = T.substring(0,8)+'01';
let lr = C.computeLabaRugi(first, T);
eq('pendapatan kotor', C.fmt(lr.totPendapatan), C.fmt(595000));
eq('diskon penjualan', C.fmt(lr.totDiskon), C.fmt(50000));
eq('pendapatan bersih', C.fmt(lr.pendapatanBersih), C.fmt(545000));
eq('HPP', C.fmt(lr.totHPP), C.fmt(495000));
eq('laba kotor', C.fmt(lr.labaKotor), C.fmt(50000));
eq('beban operasional', C.fmt(lr.totBebanOp), C.fmt(75000));
eq('laba bersih', C.fmt(lr.labaBersih), C.fmt(50000-75000)); // -25,000

console.log('\n=== 11. NERACA SALDO & NERACA (balance) ===');
let ns = C.neracaSaldoData(T);
eq('neraca saldo: total Debit = Kredit', C.fmt(ns.totD), C.fmt(ns.totK));
let nr = C.neracaData(T);
eq('kas di neraca', C.fmt(C.saldoAkunL('1101',T)), C.fmt(470000));
eq('bank di neraca', C.fmt(C.saldoAkunL('1102',T)), C.fmt(46050000));
eq('persediaan di neraca (3.95jt - HPP 495rb)', C.fmt(C.saldoAkunL('1131',T)), C.fmt(3455000));
eq('total aset', C.fmt(nr.totAset), C.fmt(470000+46050000+3455000)); // 49,975,000
eq('laba berjalan di ekuitas', C.fmt(nr.laba), C.fmt(-25000));
eq('NERACA BALANCE (aset = liabilitas + ekuitas)', C.fmt(nr.totAset), C.fmt(nr.totPasiva));
eq('selisih neraca = 0', nr.selisih, 0);

console.log('\n=== 12. JURNAL MANUAL (validasi & efek laporan) ===');
C.formJurnal();
C.jUpd(0,'akun','6101'); C.jUpd(0,'debit','200000');
C.jUpd(1,'akun','2106'); C.jUpd(1,'kredit','150000');
setv('jKet','Accrual gaji');
let jCount = C.DB.jurnal.length;
C.saveJurnal();
eq('jurnal tidak seimbang ditolak', C.DB.jurnal.length, jCount);
C.jUpd(1,'kredit','200000');
C.saveJurnal();
eq('jurnal seimbang tersimpan', C.DB.jurnal.length, jCount+1);
let jman = C.DB.jurnal.find(j=>!j.auto);
ok('nomor jurnal JRN-*', /^JRN-\d{6}-\d{4}$/.test(jman.no));
lr = C.computeLabaRugi(first, T);
eq('laba bersih setelah accrual gaji', C.fmt(lr.labaBersih), C.fmt(-225000));
nr = C.neracaData(T);
eq('utang gaji muncul di neraca', C.fmt(C.saldoAkunL('2106',T)), C.fmt(200000));
eq('neraca tetap balance', C.fmt(nr.totAset), C.fmt(nr.totPasiva));

console.log('\n=== 13. TRANSFER KAS <-> BANK (jurnal tidak dobel) ===');
C.formKB();
setv('kAkun','Bank'); setv('kArah','Keluar'); setv('kKat','Transfer'); setv('kLawan','');
setv('kJml','1000000'); setv('kKet','Setor tunai ke kas');
C.saveKB();
C.formKB();
setv('kAkun','Kas'); setv('kArah','Masuk'); setv('kKat','Transfer'); setv('kLawan','');
setv('kJml','1000000'); setv('kKet','Setor tunai ke kas');
C.saveKB();
eq('kas ledger naik 1jt', C.fmt(C.saldoAkunL('1101',T)), C.fmt(470000+1000000));
eq('bank ledger turun 1jt', C.fmt(C.saldoAkunL('1102',T)), C.fmt(46050000-1000000));
nr = C.neracaData(T);
eq('neraca tetap balance setelah transfer', C.fmt(nr.totAset), C.fmt(nr.totPasiva));

console.log('\n=== 14. SALDO AWAL AKUN ===');
C.findAkun('1110').saldoAwal = 2500000;  // Piutang Usaha
C.findAkun('3201').saldoAwal = 2500000;  // Saldo Laba
nr = C.neracaData(T);
eq('piutang masuk neraca', C.fmt(C.saldoAkunL('1110',T)), C.fmt(2500000));
eq('neraca balance dengan saldo awal', C.fmt(nr.totAset), C.fmt(nr.totPasiva));
ns = C.neracaSaldoData(T);
eq('neraca saldo tetap balance', C.fmt(ns.totD), C.fmt(ns.totK));
C.findAkun('1110').saldoAwal = 0; C.findAkun('3201').saldoAwal = 0;

console.log('\n=== 15. BUKU BESAR ===');
let bb = C.bukuBesarData('1101', first, T);
eq('buku besar kas: saldo akhir = ledger', C.fmt(bb.akhir), C.fmt(C.saldoAkunL('1101',T)));
ok('buku besar kas ada mutasi', bb.rows.length >= 3);
let bbBank = C.bukuBesarData('1102', first, T);
eq('buku besar bank: saldo akhir', C.fmt(bbBank.akhir), C.fmt(C.saldoAkunL('1102',T)));

console.log('\n=== 16. DRAFT TIDAK BER-JURNAL & PEMBATALAN ===');
C.formTrx('jual');
setv('tPihak','Draft Corp'); setv('tAkun','Kas'); setv('tDisc','0');
C.pickItem(0,'BRG002','jual'); C.updItem(0,'qty','5','jual');
C.saveTrx('jual', true);
const draft = C.DB.penjualan.find(x=>x.status==='Draft');
ok('draft tersimpan', !!draft);
eq('stok BRG002 tidak berubah (draft)', C.findBarang('BRG002').stok, 170);
ok('draft tidak punya jurnal', !C.DB.jurnal.some(j=>j.ref===draft.no));
C.delTrx('jual', draft.id);
eq('draft terhapus', C.DB.penjualan.filter(x=>x.status==='Draft').length, 0);
const invNo = jual.no;
C.delTrx('jual', jual.id);
eq('stok BRG001 kembali 150', C.findBarang('BRG001').stok, 150);
ok('jurnal penjualan & HPP ikut terhapus', !C.DB.jurnal.some(j=>j.ref===invNo));
nr = C.neracaData(T);
eq('neraca tetap balance setelah pembatalan', C.fmt(nr.totAset), C.fmt(nr.totPasiva));

console.log('\n=== 17. PROTEKSI AKUN ===');
let coaLen = C.DB.coa.length;
C.delAkun('1101');
eq('akun inti tidak bisa dihapus', C.DB.coa.length, coaLen);
C.delAkun('6101'); // dipakai jurnal manual
eq('akun terpakai di jurnal tidak bisa dihapus', C.DB.coa.length, coaLen);

console.log('\n=== 18. RENDER SEMUA HALAMAN & CETAK ===');
['dashboard','barang','penjualan','pembelian','modal','kasbank','quotation',
 'coa','jurnal','bukubesar','neracasaldo','rugilaba','neraca','pengaturan'].forEach(p=>{
  let okRender = true;
  try { C.go(p); } catch(e) { okRender = false; console.log('    error di', p, ':', e.message); }
  ok('render halaman ' + p, okRender);
});
let okPrint = true;
try {
  C.printCOA(); C.printJurnal(first, T); C.printBukuBesar('1101', first, T);
  C.printNeracaSaldo(T); C.printRugiLaba(first, T); C.printNeraca(T);
  C.printBarang(); C.printLedger('kasbank'); C.printLedger('modal');
} catch(e) { okPrint = false; console.log('    error cetak:', e.message); }
ok('semua template cetak berjalan', okPrint);

console.log('\n==========================================');
console.log('HASIL: ' + pass + ' lulus, ' + fail + ' gagal');
console.log('==========================================\n');
process.exit(fail ? 1 : 0);
