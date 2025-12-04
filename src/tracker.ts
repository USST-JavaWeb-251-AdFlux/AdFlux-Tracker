// src/tracker.ts
// Tracker script, imported by tracker.html

import { getTrackId } from './utils';

const params = new URLSearchParams(window.location.search);

console.log(`Track ID: ${await getTrackId()}`);
console.log(`Page Category: ${params.get('category') ?? 'Unknown'}`);
