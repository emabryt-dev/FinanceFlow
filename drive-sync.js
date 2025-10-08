// drive-sync.js
let FF_ACCESS_TOKEN = null;
let FF_TOKEN_CLIENT = null;
const FF_FILE_NAME = 'financeflowpro-backup.json';

// ✅ Utility: show/remove loader
function showLoader() {
  const loader = document.createElement('div');
  loader.id = "drive-loader";
  loader.style.position = "fixed";
  loader.style.inset = "0";
  loader.style.background = "rgba(0,0,0,0.6)";
  loader.style.zIndex = "9999";
  document.body.appendChild(loader);

  lottie.loadAnimation({
    container: loader,
    renderer: 'svg',
    loop: true,
    autoplay: true,
    path: "https://lottie.host/9b40ac9f-7357-4f4a-b3e5-1f4072bb6a88/xIu2Z1m7iR.json" // loading animation
  });
}

function hideLoader() {
  const loader = document.getElementById("drive-loader");
  if (loader) loader.remove();
}

// ✅ Utility: show success animation overlay
function showSuccess(message="Success!") {
  const overlay = document.createElement('div');
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.background = "rgba(0,0,0,0.6)";
  overlay.style.zIndex = "10000";
  document.body.appendChild(overlay);

  const anim = lottie.loadAnimation({
    container: overlay,
    renderer: 'svg',
    loop: false,
    autoplay: true,
    path: "https://lottie.host/1a8eac0a-1c1b-44ef-8bfa-2abf5a318be5/ZuO13SpWvA.json" // success animation
  });

  // auto-destroy after 2.5s
  setTimeout(()=>overlay.remove(), 2500);

  // optional: also show a small text
  const msg = document.createElement('div');
  msg.innerText = message;
  msg.style.position = "absolute";
  msg.style.bottom = "30px";
  msg.style.width = "100%";
  msg.style.textAlign = "center";
  msg.style.color = "white";
  msg.style.fontSize = "16px";
  msg.style.fontWeight = "600";
  overlay.appendChild(msg);
}

// ✅ Init Google Client
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
    alert('Google client not initialized. Set client id in app.js or call initGoogleClient.');
    return;
  }
  FF_TOKEN_CLIENT.requestAccessToken();
}

// ✅ Backup to Drive
async function backupToDrive() {
  if (!FF_ACCESS_TOKEN) { alert('Not connected to Google Drive'); return; }

  showLoader();
  try {
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

    hideLoader();
    showSuccess("Backup completed!");
  } catch (err) {
    hideLoader();
    alert('❌ Backup failed: ' + err.message);
  }
}

// ✅ Find latest backup file
async function findBackupFile() {
  if (!FF_ACCESS_TOKEN) throw new Error('no-token');
  const q = encodeURIComponent(`name='${FF_FILE_NAME}' and trashed=false`);
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,modifiedTime)&orderBy=modifiedTime desc`, {
    headers: { Authorization: `Bearer ${FF_ACCESS_TOKEN}` }
  });
  const json = await res.json();
  return (json.files && json.files[0]) || null;
}

// ✅ Restore from Drive
async function restoreFromDrive() {
  if (!FF_ACCESS_TOKEN) { alert('Not connected'); return; }

  showLoader();
  try {
    const file = await findBackupFile();
    if (!file) { alert('No backup found on Drive'); hideLoader(); return; }

    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {
      headers: { Authorization: `Bearer ${FF_ACCESS_TOKEN}` }
    });
    const text = await res.text();

    const parsed = JSON.parse(text);
    if (parsed.transactions && Array.isArray(parsed.transactions)) {
      await window.FFDB.clearStore('transactions');
      for (const tx of parsed.transactions) {
        await window.FFDB.put('transactions', tx);
      }
      hideLoader();
      showSuccess("Restore successful!");
      setTimeout(()=>location.reload(), 2500);
    } else {
      hideLoader();
      alert('❌ Backup format invalid.');
    }
  } catch (err) {
    hideLoader();
    alert('❌ Failed to restore: ' + err.message);
  }
}

// ✅ Expose globally
window.FFDrive = { initGoogleClient, requestGoogleAccess, backupToDrive, restoreFromDrive, findBackupFile };
