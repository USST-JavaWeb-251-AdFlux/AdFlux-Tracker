import Cookies from 'universal-cookie';

// Global Constants
const trackIdKey = 'AdFluxTrackId';

// Request Storage Access
let accessState: boolean | null = null;

export const requestAccess = async () => {
    if (typeof document.requestStorageAccess !== 'function') {
        return (accessState = false);
    }

    try {
        let permission = await navigator.permissions.query({ name: 'storage-access' });
        console.log('Storage access permission status:', permission);

        // Always request access
        await document.requestStorageAccess();
        accessState = await document.hasStorageAccess();
        console.log('Storage access request result:', accessState);

        permission = await navigator.permissions.query({ name: 'storage-access' });
        console.log('Updated storage access permission status:', permission);
    } catch (error) {
        console.error('Failed to request storage access:', error);
        accessState = false;
    }
    return accessState;
};

// Cookie Management
let trackId: string | null = null;
const generateTrackId = () => crypto.randomUUID();
const cookies = new Cookies(null, {
    maxAge: 630720000,
    sameSite: 'none',
    secure: true,
});

export const getTrackId = () => {
    if (trackId) {
        return trackId;
    }

    trackId = cookies.get<string>(trackIdKey);
    if (!trackId) {
        trackId = generateTrackId();
    }
    return trackId;
};

export const saveTrackId = () => {
    cookies.set(trackIdKey, trackId);

    const savedId = cookies.get<string>(trackIdKey);
    if (savedId !== trackId) {
        console.warn('Cookie set failed - storage access might still be restricted');
        console.log('Current cookies:', cookies.getAll());
    }
    return savedId === trackId;
};
