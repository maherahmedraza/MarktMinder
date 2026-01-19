import api from './api';

const SW_PATH = '/sw.js';

export async function registerServiceWorker() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        throw new Error('Push messaging is not supported');
    }

    try {
        const registration = await navigator.serviceWorker.register(SW_PATH);
        return registration;
    } catch (error) {
        console.error('Service Worker registration failed:', error);
        throw error;
    }
}

export async function subscribeToPush() {
    const registration = await navigator.serviceWorker.ready;

    try {
        // 1. Get VAPID public key from backend
        const { publicKey } = await api.request<{ publicKey: string }>('/notifications/vapid-key');

        if (!publicKey) {
            throw new Error('VAPID public key not found');
        }

        // 2. Subscribe to push manager
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey)
        });

        // 3. Send subscription to backend
        await api.request('/notifications/subscribe', {
            method: 'POST',
            body: subscription
        });

        return true;
    } catch (error) {
        console.error('Failed to subscribe to push:', error);
        throw error;
    }
}

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}
