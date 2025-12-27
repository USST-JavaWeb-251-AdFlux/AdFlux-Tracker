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
if (document.getElementById('adflux-tracker')) {
    throw new Error('AdFlux tracker already exists');
}

let currentCategory = getMeta('adflux-page-category') ?? '';
const trackerUrl = new URL(import.meta.resolve('./tracker.html'));
trackerUrl.searchParams.set('origin', window.location.origin);
trackerUrl.searchParams.set('domain', window.location.hostname);
trackerUrl.searchParams.set('category', currentCategory);

const trackerIframe = h<HTMLIFrameElement>('iframe#adflux-tracker', {
    src: trackerUrl.href,
    style: { display: 'none' },
});
document.body.append(trackerIframe);

// Watch for Category Meta Changes
const observer = new MutationObserver(() => {
    const newCategory = getMeta('adflux-page-category') ?? '';
    if (newCategory !== currentCategory) {
        currentCategory = newCategory;
        trackerIframe.contentWindow?.postMessage(
            {
                type: 'updateCategory',
                categoryName: newCategory,
            },
            trackerOrigin,
        );
    }
});
observer.observe(document.head, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['content', 'name'],
});

window.addEventListener('beforeunload', () => {
    observer.disconnect();
});
