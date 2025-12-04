// src/main.ts
// Import entry for content sites

import { getMeta, createElement } from './utils';
import style from './style.css?raw';

// Inject Tracker Iframe
const trackerUrl = new URL(import.meta.resolve('./tracker.html'));
trackerUrl.searchParams.set('category', getMeta('adflux-page-category') ?? 'Not-Specified');
document.body.append(
    createElement('iframe', {
        src: trackerUrl.href,
        style: 'display: none;',
    }),
);

// Inject Style
document.head.append(createElement('style', {}, style));

// Define AdFluxSlot Element
class AdFluxSlot extends HTMLElement {
    connectedCallback() {
        this.innerHTML = '广告内容';
        requestAnimationFrame(() => {
            // TODO: Pre-load ad image then add is-loaded class
            this.classList.add('is-loaded');
        });
    }
}
customElements.define('ad-flux-slot', AdFluxSlot);
