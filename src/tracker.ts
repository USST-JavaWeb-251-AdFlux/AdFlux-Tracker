// src/tracker.ts
// Tracker script, imported by tracker.html

import { getTrackId } from './utils';

const params = new URLSearchParams(window.location.search);

const trackId = await getTrackId();
const category = params.get('category') ?? 'Unknown';
const origin = params.get('origin');
if (!origin || origin.trim() === '' || origin === '*') {
    throw new Error('Invalid origin parameter');
}

// TODO: Send API Request
console.log(`Track ID: ${trackId}`);
console.log(`Page Category: ${category}`);

window.parent.postMessage('AdFlux-TrackerReady', origin);
