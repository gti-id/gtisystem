const fs = require('fs');

// 1. UPDATE HTML
let html = fs.readFileSync('AplikasiPenjualan.html', 'utf8');

// Fix the \n bug
html = html.replace('\\n    <div class="app">', '\n    <div class="app">');

// Add logout button to sidebar
const logoutBtn = '<div style="margin-top:12px"><button class="btn btn-danger btn-sm" style="width:100%" onclick="doLogout()">🚪 Keluar</button></div>';
html = html.replace('<div style="margin-top:6px">v2.0 &middot; Penjualan + Akuntansi</div>', '<div style="margin-top:6px">v2.0 &middot; Penjualan + Akuntansi</div>\n                ' + logoutBtn);

// Add login screen overlay
const loginHtml = `
    <div id="loginScreen" class="login-screen">
        <div class="login-box">
            <h2 style="margin-top:0">Masuk ke Sistem</h2>
            <p style="color:var(--muted); font-size:13px; margin-top:5px; margin-bottom:20px;">Masukkan username dan password Anda</p>
            <div class="field">
                <label>Username</label>
                <input type="text" id="loginUsername" placeholder="admin">
            </div>
            <div class="field">
                <label>Password</label>
                <input type="password" id="loginPassword" placeholder="***">
            </div>
            <button class="btn btn-primary" style="width:100%; margin-top:10px; justify-content:center;" onclick="doLogin()">Masuk</button>
            <p id="loginError" style="color:var(--danger); font-size:12px; margin-top:10px; display:none;">Username atau password salah!</p>
        </div>
    </div>
`;
html = html.replace('</body>', loginHtml + '\n</body>');
fs.writeFileSync('AplikasiPenjualan.html', html);

// 2. UPDATE CSS
let css = fs.readFileSync('style.css', 'utf8');
const loginCss = `
/* LOGIN SCREEN */
.login-screen {
    position: fixed;
    inset: 0;
    background: var(--bg);
    display: none;
    align-items: center;
    justify-content: center;
    z-index: 10000;
}
.login-screen.show {
    display: flex;
}
.login-box {
    background: var(--panel);
    padding: 30px;
    border-radius: 12px;
    box-shadow: var(--shadow);
    width: 100%;
    max-width: 360px;
    border: 1px solid var(--line);
}
`;
css += loginCss;
fs.writeFileSync('style.css', css);

// 3. UPDATE SCRIPT
let js = fs.readFileSync('script.js', 'utf8');

// Ensure DB has users
js = js.replace('var DB = { barang: [], penjualan: [], pembelian: [], modal: [], kasbank: [], quotation: [], coa: [], jurnal: [], counters: {} };', 
                'var DB = { barang: [], penjualan: [], pembelian: [], modal: [], kasbank: [], quotation: [], coa: [], jurnal: [], counters: {}, users: [] };');

js = js.replace('DB = Object.assign({ barang: [], penjualan: [], pembelian: [], modal: [], kasbank: [], quotation: [], coa: [], jurnal: [], counters: {} }, j.data);',
                'DB = Object.assign({ barang: [], penjualan: [], pembelian: [], modal: [], kasbank: [], quotation: [], coa: [], jurnal: [], counters: {}, users: [] }, j.data);');

js = js.replace('DB = { barang: [], penjualan: [], pembelian: [], modal: [], kasbank: [], quotation: [], coa: [], jurnal: [], counters: {} };',
                'DB = { barang: [], penjualan: [], pembelian: [], modal: [], kasbank: [], quotation: [], coa: [], jurnal: [], counters: {}, users: DB.users };'); // Keep users on reset

// Update boot() to check login
const bootOriginal = `
                    if (!ok) seedSample();
                    seedCOA(); 
                    rebuildAutoJurnal(); 
                    go('dashboard'); 
                    if (ok) toast('Berhasil mengambil data dari Spreadsheet', 'ok');
`;
const bootNew = `
                    if (!ok) seedSample();
                    seedCOA(); 
                    rebuildAutoJurnal(); 
                    checkLogin(); // Instead of direct go('dashboard')
                    if (ok) toast('Berhasil mengambil data dari Spreadsheet', 'ok');
`;
js = js.replace(bootOriginal, bootNew);

const bootOriginal2 = `
                fixDB();
                seedSample();
                seedCOA();
                rebuildAutoJurnal();
                setSync(false);
                go('dashboard');
`;
const bootNew2 = `
                fixDB();
                seedSample();
                seedCOA();
                rebuildAutoJurnal();
                setSync(false);
                checkLogin();
`;
js = js.replace(bootOriginal2, bootNew2);

// Add login logic functions
const loginLogic = `
        /* LOGIN SYSTEM */
        function checkLogin() {
            // Seed default user if empty
            if (!DB.users || DB.users.length === 0) {
                DB.users = [{ username: 'admin', password: 'admin123' }];
                persist(); // Save to spreadsheet
            }
            
            var sess = localStorage.getItem('appPenjualan_Session');
            var validUser = DB.users.find(function(u) { return u.username === sess; });
            
            if (validUser) {
                document.getElementById('loginScreen').classList.remove('show');
                go('dashboard');
            } else {
                document.getElementById('loginScreen').classList.add('show');
            }
        }

        window.doLogin = function() {
            var u = document.getElementById('loginUsername').value.trim();
            var p = document.getElementById('loginPassword').value.trim();
            
            var validUser = DB.users.find(function(user) { 
                return user.username === u && user.password === p; 
            });
            
            if (validUser) {
                localStorage.setItem('appPenjualan_Session', validUser.username);
                document.getElementById('loginScreen').classList.remove('show');
                document.getElementById('loginError').style.display = 'none';
                go('dashboard');
            } else {
                document.getElementById('loginError').style.display = 'block';
            }
        }

        window.doLogout = function() {
            localStorage.removeItem('appPenjualan_Session');
            document.getElementById('loginUsername').value = '';
            document.getElementById('loginPassword').value = '';
            document.getElementById('loginScreen').classList.add('show');
            go('dashboard'); // This hides active page in background
        }
`;
js = js.replace('function setSync(on)', loginLogic + '\\n        function setSync(on)');

// Add User Management to Pengaturan
const userMgmtHtml = `
            html += '<div class="panel"><div class="panel-head"><h3>Manajemen Pengguna</h3></div><div class="panel-body">' +
                '<div class="hint" style="margin-bottom:10px">Password disimpan tanpa hash untuk kemudahan pemulihan.</div>' +
                '<div id="userList"></div>' +
                '<button class="btn btn-ghost btn-sm" onclick="addUser()">+ Tambah Pengguna</button>' +
                '</div></div>';
`;
js = js.replace('html += \\\'<div class="panel"><div class="panel-head"><h3>Data</h3></div>\\\';', userMgmtHtml + '\\n            html += \\\'<div class="panel"><div class="panel-head"><h3>Data</h3></div>\\\';');

const userMgmtLogic = `
        window.renderUserList = function() {
            var tb = '<table class="grid" style="margin-bottom:10px"><thead><tr><th>Username</th><th>Password</th><th>Aksi</th></tr></thead><tbody>';
            DB.users.forEach(function(u, i) {
                tb += '<tr>' +
                    '<td><input type="text" value="' + esc(u.username) + '" onchange="updateUser(' + i + ',\\'username\\', this.value)" style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px;"></td>' +
                    '<td><input type="text" value="' + esc(u.password) + '" onchange="updateUser(' + i + ',\\'password\\', this.value)" style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px;"></td>' +
                    '<td style="width:50px; text-align:center;"><button class="btn btn-danger btn-sm" onclick="delUser(' + i + ')" ' + (DB.users.length === 1 ? 'disabled' : '') + '>Hapus</button></td>' +
                    '</tr>';
            });
            tb += '</tbody></table>';
            var container = document.getElementById('userList');
            if(container) container.innerHTML = tb;
        }
        window.updateUser = function(idx, field, val) {
            DB.users[idx][field] = val.trim();
            persist();
            toast('Pengguna diperbarui', 'ok');
        }
        window.addUser = function() {
            DB.users.push({ username: 'user' + Math.floor(Math.random()*1000), password: 'password123' });
            persist();
            renderUserList();
        }
        window.delUser = function(idx) {
            if(DB.users.length <= 1) { toast('Harus ada minimal 1 pengguna', 'err'); return; }
            if(confirm('Hapus pengguna ini?')) {
                DB.users.splice(idx, 1);
                persist();
                renderUserList();
            }
        }
`;
// Inject userMgmtLogic somewhere near renderPengaturan
js = js.replace('function saveCfg()', userMgmtLogic + '\\n        function saveCfg()');

// Ensure renderUserList is called when Pengaturan is opened
js = js.replace('document.getElementById(\\\'main\\\').innerHTML = html;', 'document.getElementById(\\\'main\\\').innerHTML = html;\\n            renderUserList();');


fs.writeFileSync('script.js', js);
console.log('Login injection complete');
