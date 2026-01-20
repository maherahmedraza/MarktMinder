/**
 * MarktMinder Options Page Script
 */

const DEFAULT_SETTINGS = {
    showWidget: true,
    showBadge: true,
    chartRange: '30d',
    enableNotifications: true,
    soundNotifications: false,
    apiUrl: 'http://localhost:3001',
    websiteUrl: 'http://localhost:3000',
};

// DOM Elements
const elements = {
    // Account
    loggedOut: document.getElementById('logged-out'),
    loggedIn: document.getElementById('logged-in'),
    loginBtn: document.getElementById('login-btn'),
    logoutBtn: document.getElementById('logout-btn'),
    userAvatar: document.getElementById('user-avatar'),
    userName: document.getElementById('user-name'),
    userEmail: document.getElementById('user-email'),

    // Settings
    showWidget: document.getElementById('show-widget'),
    showBadge: document.getElementById('show-badge'),
    chartRange: document.getElementById('chart-range'),
    enableNotifications: document.getElementById('enable-notifications'),
    soundNotifications: document.getElementById('sound-notifications'),
    apiUrl: document.getElementById('api-url'),
    websiteUrl: document.getElementById('website-url'),

    // Actions
    saveBtn: document.getElementById('save-btn'),
    status: document.getElementById('status'),
};

/**
 * Load settings from storage
 */
async function loadSettings() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['settings', 'authToken', 'userEmail', 'userName'], (result) => {
            const settings = { ...DEFAULT_SETTINGS, ...result.settings };

            // Apply settings to form
            elements.showWidget.checked = settings.showWidget;
            elements.showBadge.checked = settings.showBadge;
            elements.chartRange.value = settings.chartRange;
            elements.enableNotifications.checked = settings.enableNotifications;
            elements.soundNotifications.checked = settings.soundNotifications;
            elements.apiUrl.value = settings.apiUrl;
            elements.websiteUrl.value = settings.websiteUrl;

            // Update account section
            if (result.authToken) {
                showLoggedIn(result.userName || 'User', result.userEmail || '');
            } else {
                showLoggedOut();
            }

            resolve(settings);
        });
    });
}

/**
 * Save settings to storage
 */
async function saveSettings() {
    const settings = {
        showWidget: elements.showWidget.checked,
        showBadge: elements.showBadge.checked,
        chartRange: elements.chartRange.value,
        enableNotifications: elements.enableNotifications.checked,
        soundNotifications: elements.soundNotifications.checked,
        apiUrl: elements.apiUrl.value.trim() || DEFAULT_SETTINGS.apiUrl,
        websiteUrl: elements.websiteUrl.value.trim() || DEFAULT_SETTINGS.websiteUrl,
    };

    return new Promise((resolve) => {
        chrome.storage.local.set({ settings }, () => {
            resolve();
        });
    });
}

/**
 * Show status message
 */
function showStatus(message, type = 'success') {
    elements.status.textContent = message;
    elements.status.className = `status ${type}`;
    elements.status.classList.remove('hidden');

    setTimeout(() => {
        elements.status.classList.add('hidden');
    }, 3000);
}

/**
 * Show logged in state
 */
function showLoggedIn(name, email) {
    elements.loggedOut.classList.add('hidden');
    elements.loggedIn.classList.remove('hidden');

    elements.userName.textContent = name;
    elements.userEmail.textContent = email;
    elements.userAvatar.textContent = name.charAt(0).toUpperCase();
}

/**
 * Show logged out state
 */
function showLoggedOut() {
    elements.loggedIn.classList.add('hidden');
    elements.loggedOut.classList.remove('hidden');
}

/**
 * Handle login
 */
function handleLogin() {
    const websiteUrl = elements.websiteUrl.value || DEFAULT_SETTINGS.websiteUrl;
    chrome.tabs.create({ url: `${websiteUrl}/login?extension=true` });
}

/**
 * Handle logout
 */
async function handleLogout() {
    await chrome.storage.local.remove(['authToken', 'refreshToken', 'tokenExpiry', 'userName', 'userEmail']);
    chrome.runtime.sendMessage({ action: 'logout' });
    showLoggedOut();
    showStatus('Logged out successfully');
}

/**
 * Handle save
 */
async function handleSave() {
    try {
        await saveSettings();
        showStatus('Settings saved!');

        // Notify background script of settings change
        chrome.runtime.sendMessage({ action: 'settingsUpdated' });
    } catch (error) {
        showStatus('Failed to save settings', 'error');
    }
}

// Event listeners
elements.loginBtn.addEventListener('click', handleLogin);
elements.logoutBtn.addEventListener('click', handleLogout);
elements.saveBtn.addEventListener('click', handleSave);

// Initialize
loadSettings();
