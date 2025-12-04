// src/main.ts
// Import entry for content sites

import { getMeta } from './utils.js';

const trackerUrl = new URL(import.meta.resolve('./tracker.html'));
trackerUrl.searchParams.set('category', getMeta('adflux-page-category') ?? 'Not-Specified');

document.addEventListener('DOMContentLoaded', () => {
    const node = document.createElement('iframe');
    node.src = trackerUrl.href;
    node.style.display = 'none';
    document.body.append(node);
});
