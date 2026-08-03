# Aplikasi Penjualan, Pembelian, Stok, Modal, Kas/Bank, Quotation & Akuntansi

Aplikasi berbasis satu file HTML. Database tersimpan di Google Spreadsheet Anda
(**Test Program**, ID `1xyar-gvMNp4d-PTNsrNUlCRy4oC7H85ruEwtI7qF5oU`).

## File

- **AplikasiPenjualan.html** — aplikasinya. Cukup klik dua kali untuk membuka di browser (Chrome/Edge disarankan).
- **Code.gs** — jembatan (bridge) yang ditempel ke spreadsheet supaya data tersimpan di Google Sheet.

---

## A. Pakai cepat (tanpa Google Sheet)

Buka `AplikasiPenjualan.html`. Aplikasi langsung berjalan dan **sudah terisi data contoh**
(4 barang, 1 modal, 1 pembelian, 1 penjualan, 1 quotation, mutasi kas/bank) supaya Anda bisa
langsung mencoba semua menu dan mencetak. Pada mode ini data disimpan di browser (localStorage).

Untuk mulai bersih: menu **Pengaturan → Hapus Semua Data**.

---

## B. Sambungkan ke Google Spreadsheet (data tersimpan di Sheet)

Lakukan sekali saja:

1. Buka spreadsheet **Test Program** di Google Sheets.
2. Menu **Extensions → Apps Script**.
3. Hapus isi `Code.gs` bawaan, lalu **tempel seluruh isi file `Code.gs`** dari paket ini. Simpan (Ctrl+S).
4. Klik **Deploy → New deployment**.
   - Klik ikon roda gigi → pilih **Web app**.
   - **Execute as:** Me (email Anda).
   - **Who has access:** Anyone.
   - Klik **Deploy**, lalu **Authorize access** dan izinkan akun Anda.
5. Salin **Web app URL** (berakhiran `/exec`).
6. Buka `AplikasiPenjualan.html` → menu **Pengaturan** → tempel URL di kolom
   *URL Web App* → klik **Simpan & Uji Koneksi**.
   - Titik di kiri bawah berubah **hijau** = tersambung. Data kini disimpan ke Sheet.

Tombol bantu di Pengaturan:
- **Tarik Data dari Sheet** — muat ulang data terbaru dari spreadsheet (mis. saat buka di komputer lain).
- **Kirim Data ke Sheet** — dorong data lokal ke spreadsheet.

Saat pertama tersambung, tab berikut dibuat otomatis di spreadsheet:
`Barang, Penjualan, Pembelian, Modal, KasBank, Quotation, COA, Jurnal, Counters`.

> **Penting (update v2.0):** `Code.gs` sudah diperbarui untuk menyimpan tab **COA** dan **Jurnal**.
> Jika sebelumnya sudah deploy, tempel ulang isi `Code.gs` lalu **Deploy → Manage deployments → Edit → Version: New version**.

> Catatan: jika Anda memperbarui `Code.gs` di kemudian hari, lakukan **Deploy → Manage deployments → Edit → Version: New version** agar perubahan aktif (URL tetap sama).

---

## Menu

- **Dashboard** — saldo kas, bank, modal, nilai stok, penjualan/pembelian bulan ini, stok menipis, transaksi terakhir.
- **Barang & Stok** — master barang (kode, nama, satuan, stok, harga beli/jual, stok minimum). Nilai stok otomatis.
- **Penjualan** — buat invoice. Otomatis **mengurangi stok** dan **menambah kas/bank**. Stok tidak boleh minus.
- **Pembelian** — buat PO. Otomatis **menambah stok** dan **mengurangi kas/bank**.
- **Modal** — setor/tarik modal; otomatis memengaruhi saldo kas/bank.
- **Kas & Bank** — buku kas & bank, pemasukan/pengeluaran manual, saldo berjalan.
- **Quotation** — penawaran harga. Nama barang diketik bebas (ada saran dari master),
  **tidak membaca dan tidak mengubah stok** — sesuai permintaan.
- **Pengaturan** — identitas perusahaan (muncul di semua cetakan), pajak default, koneksi Sheet, backup/restore.

## Modul Akuntansi (v2.0)

Aplikasi kini memiliki siklus akuntansi lengkap berbasis **COA GTI** (85 akun dari file
*Master COA GTI Final.xlsx*, ditambah akun `4102 Diskon Penjualan`):

- **Daftar Akun (COA)** — master akun: tambah/edit/nonaktifkan akun, isi **saldo awal**
  (searah saldo normal akun). Ada indikator jika saldo awal belum seimbang (Debit ≠ Kredit).
- **Jurnal Umum** — jurnal terbentuk **otomatis** dari setiap transaksi Final:
  - Penjualan: `Dr Kas/Bank (total)`, `Dr Diskon Penjualan`, `Cr Penjualan Barang (subtotal)`
    plus jurnal HPP: `Dr HPP Penjualan Barang`, `Cr Persediaan Barang Dagang` (qty × harga beli).
  - Pembelian: `Dr Persediaan Barang Dagang`, `Cr Kas/Bank`.
  - Modal: `Dr Kas/Bank`, `Cr Modal Disetor` (setor) atau kebalikannya (tarik).
  - Kas/Bank manual: memakai **Akun Lawan** yang dipilih di form (default mengikuti kategori);
    kategori **Transfer** otomatis dijurnal Kas ↔ Bank (hanya sisi *Keluar* agar tidak dobel).
  Selain itu bisa membuat **jurnal manual** (penyesuaian, penyusutan, accrual) — wajib seimbang
  Debit = Kredit. Jurnal otomatis dibentuk ulang dari transaksi setiap kali data disimpan,
  sehingga edit/hapus transaksi otomatis merapikan jurnalnya.
- **Buku Besar** — mutasi per akun + saldo berjalan, dengan saldo awal periode.
- **Neraca Saldo** — trial balance seluruh akun per tanggal, total Debit = Kredit.
- **Laba Rugi** — dihitung dari buku besar: Pendapatan, Diskon, HPP, Laba Kotor,
  Beban Operasional, Laba Usaha, Pendapatan/Beban Lain, Laba Bersih.
- **Neraca** — posisi keuangan (Aset = Liabilitas + Ekuitas + Laba Berjalan),
  dengan peringatan bila tidak balance.

Semua laporan akuntansi bisa dicetak / disimpan PDF dengan kop perusahaan.

> **Catatan saldo awal:** stok awal barang yang diinput di master **tidak otomatis** menjadi
> saldo akun Persediaan. Isi saldo awal akun `1131 Persediaan Barang Dagang` (dan lawannya,
> mis. `3201 Saldo Laba` / `3101 Modal Disetor`) di menu COA agar Neraca mencerminkan stok awal.

## Cetak

Setiap dokumen punya template profesional dengan kop perusahaan, tabel, total, terbilang, dan kolom tanda tangan:
Invoice (penjualan), Purchase Order (pembelian), Bukti Modal, Quotation, Daftar Stok, Buku Kas/Bank, Laporan Modal,
Daftar Akun (COA), Jurnal Umum, Buku Besar, Neraca Saldo, Laba Rugi, dan Neraca.
Klik tombol 🖨️ → jendela cetak browser muncul → bisa **Print** atau **Save as PDF**.

## Format angka

Semua nominal memakai pemisah ribuan dan 2 desimal, contoh: `1,234,567.89`.
Ubah simbol mata uang di **Pengaturan** (default `Rp`).

---

## Hasil pengujian

Aplikasi diuji otomatis dengan data sampel sebelum diserahkan — **100 pemeriksaan lulus, 0 gagal**, mencakup:
format angka & terbilang, COA ter-seed lengkap, master barang (tolak kode duplikat), modal, pembelian
(stok naik, bank turun), penjualan (stok turun, kas naik, diskon), pencegahan stok minus, kas/bank manual
dengan akun lawan, **setiap jurnal seimbang Dr = Cr**, laba rugi berbasis buku besar, **neraca saldo dan
neraca selalu balance** (termasuk setelah jurnal manual, transfer, saldo awal, dan pembatalan transaksi),
buku besar konsisten dengan ledger, draft tidak berjurnal, proteksi akun inti, render semua halaman,
dan semua template cetak. Skrip uji: `test.js` — jalankan `node test.js`.
