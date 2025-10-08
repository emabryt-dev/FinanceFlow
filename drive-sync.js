// drive-sync.js
let FF_ACCESS_TOKEN = null;
let FF_TOKEN_CLIENT = null;
const FF_FILE_NAME = 'financeflowpro-backup.json';

function initGoogleClient(clientId) {
  if (!window.google) return;
  if (FF_TOKEN_CLIENT) return;
  FF_TOKEN_CLIENT = google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: 'https://www.googleapis.com/auth/drive.file openid email profile',
    callback: (resp) => {
      if (resp && resp.access_token) {
        FF_ACCESS_TOKEN = resp.access_token;
        console.info('FinanceFlowPro: Google connected');
        document.getElementById('connectGoogle').innerText = 'Connected';
      }
    }
  });
}

function requestGoogleAccess() {
  if (!FF_TOKEN_CLIENT) {
    alert('Google client not initialized. Set client id in drive-sync.js (call initGoogleClient).');
    return;
  }
  FF_TOKEN_CLIENT.requestAccessToken();
}

async function backupToDrive() {
  if (!FF_ACCESS_TOKEN) { alert('Not connected to Google Drive'); return; }
  // gather data
  const txs = await window.FFDB.getAll('transactions');
  const meta = { createdAt: new Date().toISOString() };
  const content = JSON.stringify({ meta, transactions: txs });
  const metadata = { name: FF_FILE_NAME, mimeType: 'application/json' };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)],{type:'application/json'}));
  form.append('file', new Blob([content],{type:'application/json'}));

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
    method:'POST',
    headers:{ Authorization: `Bearer ${FF_ACCESS_TOKEN}` },
    body: form
  });
  const json = await res.json();
  console.log('backup result', json);
  alert('Backup uploaded to Google Drive.');
}

async function findBackupFile() {
  if (!FF_ACCESS_TOKEN) throw new Error('no-token');
  const q = encodeURIComponent(`name='${FF_FILE_NAME}' and trashed=false`);
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,modifiedTime)&orderBy=modifiedTime desc`, {
    headers: { Authorization: `Bearer ${FF_ACCESS_TOKEN}` }
  });
  const json = await res.json();
  return (json.files && json.files[0]) || null;
}

async function restoreFromDrive() {
  if (!FF_ACCESS_TOKEN) { alert('Not connected'); return; }
  const file = await findBackupFile();
  if (!file) { alert('No backup found on Drive'); return; }
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {
    headers: { Authorization: `Bearer ${FF_ACCESS_TOKEN}` }
  });
  const text = await res.text();
  try {
    const parsed = JSON.parse(text);
    if (parsed.transactions && Array.isArray(parsed.transactions)) {
      // clear and write
      await window.FFDB.clearStore('transactions');
      for (const tx of parsed.transactions) {
        await window.FFDB.put('transactions', tx);
      }
      alert('Restored backup from Drive. Reloading...');
      location.reload();
    } else {
      alert('Backup format invalid.');
    }
  } catch (err) {
    alert('Failed to restore: ' + err.message);
  }
}

// Expose on window
window.FFDrive = { initGoogleClient, requestGoogleAccess, backupToDrive, restoreFromDrive, findBackupFile };
