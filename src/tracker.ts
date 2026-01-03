// src/tracker.ts
// Tracker script, imported by tracker.html

import { initPageViewApi, updatePageViewApi } from '@/apis';
import { getTrackId } from '@/utils/tools';
import { Timer } from '@/utils/timer';

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
window.parent.postMessage({ type: 'trackerReady', trackId }, origin);

let pageViewState: {
    visitId: string;
    category: string | null;
} = {
    visitId: '',
    category: null,
};

const timer = new Timer(() => updatePageView());

const initPageView = async (categoryName: string | null) => {
    console.group('Init Page View');
    console.log(`Page category: ${categoryName || '[None]'}`);

    if (pageViewState.visitId !== '') {
        await updatePageView();
        timer.stop();

        pageViewState = {
            visitId: '',
            category: null,
        };
        timer.setDuration(0);
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
                    visitId,
                    category: categoryName,
                };
                timer.setDuration(duration);
                timer.start();
                console.log('Resumed page view from cache', pageViewState);
                console.groupEnd();
                return;
            } else {
                sessionStorage.removeItem(cacheKey);
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
        visitId: result.data.visitId,
        category: categoryName,
    };
    timer.setDuration(0);
    timer.start();
    console.log('Initialized page view', pageViewState);
    console.groupEnd();
};

const updatePageView = async () => {
    if (pageViewState.visitId === '' || !pageViewState.category) return;
    console.group('Update Page View');

    const duration = timer.getDuration();
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

document.addEventListener('visibilitychange', () => {
    console.log(`Document visibility changed: ${document.visibilityState}`);
    if (document.visibilityState === 'visible') {
        timer.start();
    } else {
        timer.stop();
        updatePageView();
    }
});

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
