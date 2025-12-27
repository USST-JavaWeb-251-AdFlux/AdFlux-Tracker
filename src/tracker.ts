// src/tracker.ts
// Tracker script, imported by tracker.html

import { initPageViewApi, updatePageViewApi } from './apis';
import { getTrackId } from './utils';

const params = new URLSearchParams(window.location.search);

const trackId = await getTrackId();
const origin = params.get('origin');
const domain = params.get('domain');
if (!origin || origin.trim() === '' || origin === '*') {
    throw new Error('Invalid origin parameter');
}
if (!domain || domain.trim() === '') {
    throw new Error('Invalid domain parameter');
}

console.log(`Track ID: ${trackId}`);
console.log(`Domain: ${domain}`);
window.parent.postMessage('AdFlux-TrackerReady', origin);

let pageViewState = {
    startTime: 0,
    visitId: '',
    timerId: 0,
};

const initPageView = async (categoryName: string | null) => {
    console.log(`Page category: ${categoryName || '[None]'}`);

    if (pageViewState.timerId !== 0) {
        await updatePageView();
        clearInterval(pageViewState.timerId);

        pageViewState = {
            startTime: 0,
            visitId: '',
            timerId: 0,
        };
        console.log('Cleared previous page view');
    }

    if (!categoryName) return;

    const result = await initPageViewApi({ domain, categoryName, trackId });
    pageViewState = {
        startTime: Date.now(),
        visitId: result.data.visitId,
        timerId: setInterval(updatePageView, 5000),
    };
    console.log('Initialized page view');
};

const updatePageView = async () => {
    if (pageViewState.startTime === 0) return;

    const duration = (Date.now() - pageViewState.startTime) / 1000;
    await updatePageViewApi({ visitId: pageViewState.visitId, duration });
    console.log(`Updated page view, duration: ${duration}s`);
};

initPageView(params.get('category'));

self.addEventListener(
    'message',
    async (
        event: MessageEvent<{
            type: 'updateCategory';
            categoryName: string | null;
        }>,
    ) => {
        if (event.origin !== origin) return;

        if (event.data.type === 'updateCategory') {
            await initPageView(event.data.categoryName);
        }
    },
);
