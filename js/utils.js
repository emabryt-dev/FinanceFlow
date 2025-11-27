export function formatCurrency(amount, currencyCode) {
    return `${parseFloat(amount).toLocaleString()} ${currencyCode}`;
}

export function getCurrentMonthKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function getMonthKeyFromDate(dateString) {
    try {
        const date = new Date(dateString);
        if (isNaN(date)) return getCurrentMonthKey();
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    } catch {
        return getCurrentMonthKey();
    }
}

export function getPreviousMonth(monthKey) {
    const [year, month] = monthKey.split('-').map(Number);
    let prevYear = year;
    let prevMonth = month - 1;
    
    if (prevMonth === 0) {
        prevMonth = 12;
        prevYear = year - 1;
    }
    
    return `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
}

export function showToast(message, type = 'info', duration = 4000) {
    // Only show critical toasts for sync
    if (type === 'info' && (message.includes('sync') || message.includes('Sync'))) {
        updateSyncStatusUI(type, message);
        return;
    }
    
    const toastContainer = document.getElementById('toastContainer');
    const toastId = 'toast-' + Date.now();
    
    const icons = {
        success: 'bi-check-circle-fill',
        info: 'bi-info-circle-fill',
        warning: 'bi-exclamation-triangle-fill',
        danger: 'bi-x-circle-fill'
    };
    
    const toastHTML = `
        <div id="${toastId}" class="toast toast-${type}" role="alert">
            <div class="toast-body">
                <div class="d-flex align-items-center">
                    <i class="bi ${icons[type]} me-2 text-${type}"></i>
                    <span class="flex-grow-1">${message}</span>
                    <button type="button" class="btn-close ms-2" data-bs-dismiss="toast"></button>
                </div>
                <div class="toast-progress"></div>
            </div>
        </div>
    `;
    
    toastContainer.insertAdjacentHTML('beforeend', toastHTML);
    const toastElement = document.getElementById(toastId);
    
    // Bootstrap needs to be available globally or imported
    // Assuming bootstrap is on window per index.html
    const bsToast = new bootstrap.Toast(toastElement, { delay: duration });
    
    toastElement.addEventListener('hidden.bs.toast', () => {
        toastElement.remove();
    });
    
    bsToast.show();
}

export function updateSyncStatusUI(status, message) {
    // A simplified version to update UI text if elements exist
    const statusText = document.getElementById('syncStatusText');
    if (statusText) {
        statusText.textContent = message;
        if(status === 'success') statusText.className = 'text-success ms-2';
        else if(status === 'warning') statusText.className = 'text-warning ms-2';
        else if(status === 'danger') statusText.className = 'text-danger ms-2';
        else statusText.className = 'text-muted ms-2';
    }
}
