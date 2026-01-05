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
        // Always request access
        await document.requestStorageAccess();
        accessState = await document.hasStorageAccess();
        console.log('Storage access request result:', accessState);
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
    if (!trackId) {
        trackId = getTrackId();
    }
    cookies.set(trackIdKey, trackId);

    const savedId = cookies.get<string>(trackIdKey);
    if (savedId !== trackId) {
        console.warn('Cookie set failed - storage access might still be restricted');
        console.log('Current cookies:', cookies.getAll());
    }
    return savedId === trackId;
};
