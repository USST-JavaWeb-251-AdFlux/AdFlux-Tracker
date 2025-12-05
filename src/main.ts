// src/main.ts
// Import entry for content sites

import h from 'hyperscript';
import { getMeta } from './utils';
import style from './style.css?inline';

// Define AdFluxSlot Element
class AdFluxSlot extends HTMLElement {
    connectedCallback() {
        this.textContent = 'AD Content';
        requestAnimationFrame(() => {
            // TODO: Pre-load ad image then add is-loaded class
            this.classList.add('is-loaded');
        });
    }
}

// Upgrade AdFluxSlot Elements after Tracker is Ready
const trackerOrigin = new URL(import.meta.url).origin;
const handleMessage = (event: MessageEvent) => {
    if (event.origin !== trackerOrigin || event.data !== 'AdFlux-TrackerReady') {
        return;
    }
    customElements.define('adflux-slot', AdFluxSlot);
    window.removeEventListener('message', handleMessage);
};
window.addEventListener('message', handleMessage);

// Inject Style
if (!document.getElementById('adflux-injected-style')) {
    document.head.append(h<HTMLStyleElement>('style#adflux-injected-style', style));
}

// Inject Tracker Iframe
if (!document.getElementById('adflux-tracker')) {
    const trackerUrl = new URL(import.meta.resolve('./tracker.html'));
    trackerUrl.searchParams.set('category', getMeta('adflux-page-category') ?? 'Not-Specified');
    trackerUrl.searchParams.set('origin', window.location.origin);
    document.body.append(h<HTMLIFrameElement>('iframe#adflux-tracker', { src: trackerUrl.href }));
}
