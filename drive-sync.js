// drive-sync.js — Google Drive sync for FinanceFlow

let accessToken = null;

// Setup Google OAuth2 client
function initGoogleSync() {
  if (!window.google) {
    alert("Google API not loaded yet. Try again in a moment.");
    return;
  }

  const client = google.accounts.oauth2.initTokenClient({
    client_id: "86191691449-lop8lu293h8956071sr0jllc2qsdpc2e.apps.googleusercontent.com",
    scope: "https://www.googleapis.com/auth/drive.file",
    callback: (tokenResponse) => {
      accessToken = tokenResponse.access_token;
      alert("Google Drive connected!");
      syncNow();
    }
  });

  client.requestAccessToken();
}

// Upload backup to Google Drive
async function syncNow() {
  if (!accessToken) return;

  const data = localStorage.getItem("transactions") || "[]";
  const fileContent = new Blob([data], { type: "application/json" });
  const metadata = { name: "financeflow-backup.json", mimeType: "application/json" };

  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  form.append("file", fileContent);

  await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form
  });

  console.log("Backup uploaded to Google Drive.");
}

// Restore latest backup (optional)
async function restoreFromDrive() {
  if (!accessToken) {
    alert("Connect to Google Drive first.");
    return;
  }

  const res = await fetch("https://www.googleapis.com/drive/v3/files?q=name='financeflow-backup.json'&fields=files(id)", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const { files } = await res.json();
  if (!files || files.length === 0) {
    alert("No backup found.");
    return;
  }

  const fileId = files[0].id;
  const fileRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const text = await fileRes.text();
  localStorage.setItem("transactions", text);
  alert("Data restored from Drive.");
  location.reload();
}
