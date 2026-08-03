const fs = require('fs');

let code = fs.readFileSync('AplikasiPenjualan Code.gs', 'utf8');

// 1. Update SCHEMA to include audit
code = code.replace(
  "coa: ['kode', 'nama', 'kategori', 'saldoAwal'],",
  "coa: ['kode', 'nama', 'kategori', 'saldoAwal'],\n  audit: ['ts', 'user', 'module', 'action'],"
);

// Update COLL
code = code.replace(
  "var COLL = {",
  "var COLL = {\n  audit: 'audit',"
);

// 2. Add serverTime generation in readAll_
// Find `return data;` in readAll_
code = code.replace(
  "return data;",
  "data.serverTime = new Date().getTime();\n  return data;"
);

// 3. Update doPost to handle LockService and Concurrency
const doPostOld = `function doPost(e){
  try{
    var body = {};
    if(e && e.postData && e.postData.contents){
      body = JSON.parse(e.postData.contents);
    }
    var action = body.action || 'saveAll';
    if(action==='saveAll'){
      writeAll_(body.data||{});
      return json_({ ok:true, message:'Tersimpan.' });
    }
    return json_({ ok:false, error:'unknown action' });
  }catch(err){
    return json_({ ok:false, error:String(err) });
  }
}`;

const doPostNew = `function doPost(e){
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
      
      // Concurrency check using a hidden counter 'last_sync_timestamp'
      var csh = getSheet_('Counters');
      // We assume row 1 is headers. Let's find 'last_sync_timestamp' or just use a dedicated cell?
      // Since writeAll_ rewrites all counters, we can check the current server time via PropertiesService.
      var props = PropertiesService.getScriptProperties();
      var currentServerTime = parseInt(props.getProperty('serverSyncTime') || '0', 10);
      
      var clientSyncTime = body.lastSyncTime || 0;
      
      // If client is older than server's last write time, it's a conflict!
      if (currentServerTime > 0 && clientSyncTime < currentServerTime) {
         return json_({ ok:false, error:'CONFLICT', message:'Data telah diubah pengguna lain. Memuat ulang...' });
      }
      
      // Write data
      writeAll_(data);
      
      // Update server time AFTER successful write
      var newTime = new Date().getTime();
      props.setProperty('serverSyncTime', newTime.toString());
      
      return json_({ ok:true, message:'Tersimpan.', serverTime: newTime });
    }
    return json_({ ok:false, error:'unknown action' });
  }catch(err){
    return json_({ ok:false, error:String(err) });
  }finally{
    lock.releaseLock();
  }
}`;

code = code.replace(doPostOld, doPostNew);

fs.writeFileSync('AplikasiPenjualan Code.gs', code);
console.log('GAS updated.');
