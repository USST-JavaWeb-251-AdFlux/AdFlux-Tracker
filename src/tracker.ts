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

let pageViewState: {
    startTime: number;
    visitId: string;
    timerId: number;
    category: string | null;
} = {
    startTime: 0,
    visitId: '',
    timerId: 0,
    category: null,
};

const initPageView = async (categoryName: string | null) => {
    console.group('Init Page View');
    console.log(`Page category: ${categoryName || '[None]'}`);

    if (pageViewState.timerId !== 0) {
        await updatePageView();
        clearInterval(pageViewState.timerId);

        pageViewState = {
            startTime: 0,
            visitId: '',
            timerId: 0,
            category: null,
        };
        console.log('Cleared previous page view');
    }

    if (!categoryName) {
        console.groupEnd();
        return;
    }

    const cacheKey = `adflux_visit_${categoryName}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
        try {
            const { visitId, lastUpdateTime, duration } = JSON.parse(cached);
            if (Date.now() - lastUpdateTime < 5 * 60 * 1000) {
                pageViewState = {
                    startTime: Date.now() - duration * 1000,
                    visitId,
                    timerId: setInterval(updatePageView, 5000),
                    category: categoryName,
                };
                console.log('Resumed page view from cache', pageViewState);
                console.groupEnd();
                return;
            }
        } catch (e) {
            console.error('Failed to parse cached visitId', e);
            sessionStorage.removeItem(cacheKey);
        }
    }

    let result: Awaited<ReturnType<typeof initPageViewApi>>;
    try {
        result = await initPageViewApi({ domain, categoryName, trackId });
    } catch (e) {
        console.error('Failed to initialize page view', e);
        console.groupEnd();
        return;
    }
    pageViewState = {
        startTime: Date.now(),
        visitId: result.data.visitId,
        timerId: setInterval(updatePageView, 5000),
        category: categoryName,
    };
    console.log('Initialized page view', pageViewState);
    console.groupEnd();
};

const updatePageView = async () => {
    if (pageViewState.startTime === 0 || !pageViewState.category) return;
    console.group('Update Page View');

    const duration = (Date.now() - pageViewState.startTime) / 1000;
    try {
        await updatePageViewApi({ visitId: pageViewState.visitId, duration });
    } catch (e) {
        console.error('Failed to update page view', e);
        console.groupEnd();
        return;
    }

    const cacheKey = `adflux_visit_${pageViewState.category}`;
    sessionStorage.setItem(
        cacheKey,
        JSON.stringify({
            visitId: pageViewState.visitId,
            lastUpdateTime: Date.now(),
            duration,
        }),
    );

    console.log(`Updated page view, duration: ${duration}s`);
    console.groupEnd();
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

        if (
            event.data.type === 'updateCategory' &&
            event.data.categoryName !== pageViewState.category
        ) {
            await initPageView(event.data.categoryName);
        }
    },
);
