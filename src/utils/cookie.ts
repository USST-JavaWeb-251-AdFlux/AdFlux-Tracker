// Global Constants
const trackIdKey = 'AdFluxTrackId';

// Request Storage Access
let accessState: boolean | null = null;

export const requestAccess = async () => {
    // Treat browsers that do not support Storage Access API as having access
    // Since they do not block third-party cookies
    if (typeof document.requestStorageAccess !== 'function') {
        return (accessState = true);
    }

    accessState = await document.hasStorageAccess();
    console.log('Initial storage access check result:', accessState);
    if (!accessState) {
        try {
            await document.requestStorageAccess();
            accessState = await document.hasStorageAccess();
            console.log('Storage access after request result:', accessState);
        } catch (error) {
            console.error('Failed to request storage access:', error);
            accessState = false;
        }
    }
    return accessState;
};

// Cookie Helpers
const getCookie = (name: string): string | null => {
    const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
};

const setCookie = (name: string, value: string) => {
    document.cookie = `${name}=${encodeURIComponent(value)}; max-age=630720000; path=/; SameSite=None; Secure`;
};

// Cookie Management
let trackId: string | null = null;
const generateTrackId = () => crypto.randomUUID();

export const getTrackId = () => {
    if (trackId) {
        return trackId;
    }

    trackId = getCookie(trackIdKey);
    if (!trackId) {
        trackId = generateTrackId();
    }
    return trackId;
};

export const saveTrackId = () => {
    if (!trackId) {
        trackId = getTrackId();
    }
    setCookie(trackIdKey, trackId);

    const savedId = getCookie(trackIdKey);
    if (savedId !== trackId) {
        console.warn('Cookie set failed - storage access might still be restricted');
        console.log('Current cookies:', document.cookie);
    }
    return savedId === trackId;
};
