// src/tracker.ts
// Tracker script, imported by tracker.html

import { initPageViewApi, updatePageViewApi } from '@/apis';
import { getTrackId } from '@/utils/tools';

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
    timerId: number;
    category: string | null;
    accumulatedDuration: number;
    lastResumeTime: number;
} = {
    visitId: '',
    timerId: 0,
    category: null,
    accumulatedDuration: 0,
    lastResumeTime: 0,
};

const getCurrentDuration = () => {
    const currentSession =
        pageViewState.lastResumeTime > 0 ? Date.now() - pageViewState.lastResumeTime : 0;
    return (pageViewState.accumulatedDuration + currentSession) / 1000;
};

const startTimer = () => {
    if (
        pageViewState.timerId !== 0 ||
        !pageViewState.visitId ||
        document.visibilityState !== 'visible'
    ) {
        return;
    }
    pageViewState.lastResumeTime = Date.now();
    pageViewState.timerId = setInterval(updatePageView, 5000);
    console.log('Timer started');
};

const stopTimer = () => {
    if (pageViewState.timerId !== 0) {
        clearInterval(pageViewState.timerId);
        pageViewState.timerId = 0;
    }
    if (pageViewState.lastResumeTime > 0) {
        pageViewState.accumulatedDuration += Date.now() - pageViewState.lastResumeTime;
        pageViewState.lastResumeTime = 0;
    }
    console.log('Timer stopped');
};

const initPageView = async (categoryName: string | null) => {
    console.group('Init Page View');
    console.log(`Page category: ${categoryName || '[None]'}`);

    if (pageViewState.visitId !== '') {
        await updatePageView();
        stopTimer();

        pageViewState = {
            visitId: '',
            timerId: 0,
            category: null,
            accumulatedDuration: 0,
            lastResumeTime: 0,
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
                    visitId,
                    timerId: 0,
                    category: categoryName,
                    accumulatedDuration: duration * 1000,
                    lastResumeTime: 0,
                };
                startTimer();
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
        timerId: 0,
        category: categoryName,
        accumulatedDuration: 0,
        lastResumeTime: 0,
    };
    startTimer();
    console.log('Initialized page view', pageViewState);
    console.groupEnd();
};

const updatePageView = async () => {
    if (pageViewState.visitId === '' || !pageViewState.category) return;
    console.group('Update Page View');

    const duration = getCurrentDuration();
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
        startTimer();
    } else {
        stopTimer();
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
