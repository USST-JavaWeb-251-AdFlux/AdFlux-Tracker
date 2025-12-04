import Cookies from 'universal-cookie';

// Global Constants
const trackIdKey = 'AdFluxTrackId';

// Request Storage Access
let accessState: boolean | null = null;
export const requestAccess = async () => {
    if (accessState !== null) {
        return accessState;
    }

    if (typeof document.requestStorageAccess !== 'function') {
        console.error('Storage access method not provided');
        return (accessState = false);
    }

    try {
        let hasAccess = await document.hasStorageAccess();
        console.log('Has storage access:', hasAccess);
        if (!hasAccess) {
            // Need to request storage access on FireFox
            console.log('Trying to request storage access.');
            await document.requestStorageAccess();
            hasAccess = await document.hasStorageAccess();
            console.log('Has storage access:', hasAccess);
        }
        accessState = hasAccess;
    } catch (error) {
        console.error('Failed to request storage access:', error);
        accessState = false;
    }
    return accessState;
};

// Get Meta Content
export const getMeta = (name: string) =>
    document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)?.content;

// Cookie Management
const generateTrackId = () => crypto.randomUUID();
const cookies = new Cookies({
    maxAge: 630720000,
    sameSite: 'None',
    secure: true,
});
export const getTrackId = async () => {
    await requestAccess();

    let trackId = cookies.get<string>(trackIdKey);
    if (!trackId) {
        trackId = generateTrackId();
        cookies.set(trackIdKey, trackId);
    }
    return trackId;
};

// Create HTML Element
export const createElement = (
    tag: string,
    attrs: Record<string, string> = {},
    textContent?: string,
) => {
    const element = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
        element.setAttribute(key, value);
    }
    if (textContent) {
        element.textContent = textContent;
    }
    return element;
};
