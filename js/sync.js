import { state } from './state.js';
import { StorageService } from './storage.js';
import { showToast } from './utils.js';

const CLIENT_ID = '86191691449-lop8lu293h8956071sr0jllc2qsdpc2e.apps.googleusercontent.com';
const DRIVE_FILE_NAME = 'wealth_command_data.json';

export const SyncService = {
    tokenClient: null,

    init() {
        if (window.google) {
            this.tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: CLIENT_ID,
                scope: 'https://www.googleapis.com/auth/drive.file',
                callback: (resp) => this.handleTokenResponse(resp),
            });
        }
    },

    signIn() {
        if (this.tokenClient) this.tokenClient.requestAccessToken();
    },

    async handleTokenResponse(tokenResponse) {
        if (tokenResponse && tokenResponse.access_token) {
            state.user = { access_token: tokenResponse.access_token };
            showToast('Signed in to Google Drive!', 'success');
            await this.syncFromDrive();
        }
    },

    async syncFromDrive() {
        // Logic to search for file, download content, merge with DB
        // Simplified for brevity in this output
        showToast('Syncing data...', 'info');
        // In real impl: fetch files list, get ID, fetch content
        // Then: StorageService.saveTransactions(content.transactions)...
    },

    async syncToDrive() {
        if (!state.user) return;
        const data = {
            transactions: await StorageService.getTransactions(),
            categories: await StorageService.getCategories(),
            // ... other data
        };
        // Logic to upload file to Drive
    }
};
