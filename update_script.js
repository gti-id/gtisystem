const fs = require('fs');
let js = fs.readFileSync('script.js', 'utf8');

// 1. Update DB schema everywhere
js = js.split('users: [] }').join('users: [], audit: [] }');
js = js.split('users: DB.users }').join('users: DB.users, audit: DB.audit || [] }'); // for resetAll

// 2. Add auditLog function and update persist
const auditLogFunc = `
        function auditLog(module, action) {
            var user = localStorage.getItem('appPenjualan_Session') || 'Unknown';
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
`;
js = js.replace('function persist() {', auditLogFunc + '\n        function persist() {');

// 3. Inject audit logs into save/del actions
js = js.replace('function saveBarang(id) {', 'function saveBarang(id) {\n            auditLog("Barang", (id ? "Edit" : "Tambah") + " barang: " + val("bKode"));');
js = js.replace('function delBarang(id) {', 'function delBarang(id) {\n            auditLog("Barang", "Hapus barang ID " + id);');
js = js.replace('function saveTrx(mode, isDraft) {', 'function saveTrx(mode, isDraft) {\n            auditLog(mode, (isDraft ? "Draft " : "Simpan ") + "transaksi " + mode);');
js = js.replace('function delTrx(mode, id) {', 'function delTrx(mode, id) {\n            auditLog(mode, "Hapus transaksi ID " + id);');
js = js.replace('function saveModal() {', 'function saveModal() {\n            auditLog("Modal", "Simpan modal");');
js = js.replace('function delModal(id) {', 'function delModal(id) {\n            auditLog("Modal", "Hapus modal ID " + id);');
js = js.replace('function saveKB() {', 'function saveKB() {\n            auditLog("KasBank", "Simpan transaksi kas");');
js = js.replace('function delKB(id) {', 'function delKB(id) {\n            auditLog("KasBank", "Hapus transaksi kas ID " + id);');
js = js.replace('function saveQuote() {', 'function saveQuote() {\n            auditLog("Quotation", "Simpan quotation");');
js = js.replace('function delQuote(id) {', 'function delQuote(id) {\n            auditLog("Quotation", "Hapus quotation ID " + id);');
js = js.replace('function saveAkun() {', 'function saveAkun() {\n            auditLog("COA", "Simpan akun " + val("cKode"));');
js = js.replace('function delAkun(kode) {', 'function delAkun(kode) {\n            auditLog("COA", "Hapus akun " + kode);');
js = js.replace('function saveJurnal() {', 'function saveJurnal() {\n            auditLog("Jurnal", "Simpan jurnal");');
js = js.replace('function delJurnal(id) {', 'function delJurnal(id) {\n            auditLog("Jurnal", "Hapus jurnal ID " + id);');

// 4. Update checkLogin to set role
js = js.replace("DB.users = [{ username: 'admin', password: 'admin123' }];", "DB.users = [{ username: 'admin', password: 'admin123', role: 'Admin' }];");

// 5. Update userList to show role
const userListRender = `
        window.renderUserList = function() {
            var tb = '<table class="grid" style="margin-bottom:10px"><thead><tr><th>Username</th><th>Password</th><th>Role</th><th>Aksi</th></tr></thead><tbody>';
            DB.users.forEach(function(u, i) {
                var selAdmin = u.role === 'Admin' ? 'selected' : '';
                var selSales = u.role === 'Sales' ? 'selected' : '';
                tb += '<tr>' +
                    '<td><input type="text" value="' + esc(u.username) + '" onchange="updateUser(' + i + ',\\'username\\', this.value)" style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px;"></td>' +
                    '<td><input type="text" value="' + esc(u.password) + '" onchange="updateUser(' + i + ',\\'password\\', this.value)" style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px;"></td>' +
                    '<td><select onchange="updateUser(' + i + ',\\'role\\', this.value)" style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px;"><option value="Admin" '+selAdmin+'>Admin</option><option value="Sales" '+selSales+'>Sales</option></select></td>' +
                    '<td style="width:50px; text-align:center;"><button class="btn btn-danger btn-sm" onclick="delUser(' + i + ')" ' + (DB.users.length === 1 ? 'disabled' : '') + '>Hapus</button></td>' +
                    '</tr>';
            });
            tb += '</tbody></table>';
            var container = document.getElementById('userList');
            if(container) container.innerHTML = tb;
        }
`;
// Replace the old renderUserList
js = js.replace(/window\.renderUserList = function\(\) \{[\s\S]*?if\(container\) container\.innerHTML = tb;\n        \}/, userListRender.trim());

js = js.replace("DB.users.push({ username: 'user' + Math.floor(Math.random()*1000), password: 'password123' });", "DB.users.push({ username: 'user' + Math.floor(Math.random()*1000), password: 'password123', role: 'Sales' });");

// 6. Update go() for RBAC
const goOld = `
        function go(page) {
            CURRENT_PAGE = page;
            document.querySelectorAll('#nav button').forEach(function (x) { x.classList.toggle('active', x.dataset.page === page); });
`;
const goNew = `
        function go(page) {
            var sess = localStorage.getItem('appPenjualan_Session');
            var validUser = DB.users && DB.users.find(function(u) { return u.username === sess; });
            var isSales = validUser && validUser.role === 'Sales';
            
            // RBAC Check
            var salesAllowed = ['dashboard', 'barang', 'penjualan', 'quotation'];
            if (isSales && salesAllowed.indexOf(page) === -1) {
                toast('Akses Ditolak: Anda tidak memiliki izin', 'err');
                return;
            }

            CURRENT_PAGE = page;
            document.querySelectorAll('#nav button').forEach(function (x) { 
                x.classList.toggle('active', x.dataset.page === page); 
                // Hide restricted buttons for Sales
                if (isSales && salesAllowed.indexOf(x.dataset.page) === -1) {
                    x.style.display = 'none';
                } else {
                    x.style.display = 'block';
                }
            });
            
            // Hide Akuntansi header label
            var sec = document.querySelector('.nav-sec');
            if(sec) sec.style.display = isSales ? 'none' : 'block';
`;
js = js.replace(goOld, goNew);

// 7. Add Audit Trail UI to Pengaturan
const auditUI = `
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
`;
js = js.replace("html += '<div class=\"panel\"><div class=\"panel-head\"><h3>Manajemen Pengguna</h3></div>", auditUI + "\n            html += '<div class=\"panel\"><div class=\"panel-head\"><h3>Manajemen Pengguna</h3></div>");

// 8. Handle Concurrency (lastSyncTime)
js = js.replace(
  "cloudReady = true; saveLocal(); return true;",
  "CFG.lastSyncTime = j.serverTime || 0; delete j.data.serverTime; cloudReady = true; saveLocal(); return true;"
);

const pushOld = `body: JSON.stringify({ action: 'saveAll', data: DB })`;
const pushNew = `body: JSON.stringify({ action: 'saveAll', data: DB, lastSyncTime: CFG.lastSyncTime || 0 })`;
js = js.replace(pushOld, pushNew);

const pushThenOld = `.then(function (j) { return !!(j && j.ok); })`;
const pushThenNew = `.then(function (j) { 
                    if(j && j.error === 'CONFLICT') {
                        alert(j.message);
                        cloudPull().then(function(){ go(CURRENT_PAGE); });
                        return false;
                    }
                    if(j && j.serverTime) {
                        CFG.lastSyncTime = j.serverTime;
                        saveLocal();
                    }
                    return !!(j && j.ok); 
                })`;
js = js.replace(pushThenOld, pushThenNew);


fs.writeFileSync('script.js', js);
console.log('Script updated successfully');
