// src/main.ts
// Import entry for content sites

import h from 'hyperscript';
import {
    AdClicked,
    AdLayout,
    AdType,
    getAdForSlotApi,
    updateAdDisplayApi,
    type AdResult,
} from '@/apis';
import type { ValueOf } from '@/utils/enum';
import { getBackendFullPath } from '@/utils/request';
import { getMeta } from '@/utils/tools';
import { Timer } from '@/utils/timer';
import style from '@/style.css?inline';

// Define AdFluxSlot Element
class AdFluxSlot extends HTMLElement {
    #adResult: AdResult | null = null;
    #clicked: ValueOf<typeof AdClicked> = AdClicked.notClicked.value;

    #timer = new Timer(() => this.#updateAdStatus());
    #observer: IntersectionObserver | null = null;
    #isIntersecting: boolean = false;

    connectedCallback() {
        this.#fetchAd();
        this.#initIntersectionObserver();
        document.addEventListener('visibilitychange', this.#updateTimer);
    }

    disconnectedCallback() {
        this.#isIntersecting = false;
        this.#updateTimer();
        this.#observer?.disconnect();
        document.removeEventListener('visibilitychange', this.#updateTimer);
    }

    #updateTimer() {
        if (this.#isIntersecting && document.visibilityState === 'visible' && this.#adResult) {
            this.#timer.start();
        } else {
            if (this.#timer.isActive()) {
                this.#timer.stop();
                this.#updateAdStatus();
            }
        }
    }

    #initIntersectionObserver() {
        this.#observer = new IntersectionObserver(
            (entries) => {
                this.#isIntersecting = entries[0].isIntersecting;
                this.#updateTimer();
            },
            { threshold: 1.0 },
        );
        this.#observer.observe(this);
    }

    async #fetchAd() {
        await new Promise(requestAnimationFrame);
        this.attachShadow({ mode: 'open' });
        const shadowRoot = this.shadowRoot as ShadowRoot;
        shadowRoot.append(h<HTMLStyleElement>('style', style));

        try {
            if (!trackId) {
                throw new Error('Track ID is null');
            }

            const size = this.getBoundingClientRect();
            const adLayout = AdLayout[size.height > size.width ? 'sidebar' : 'banner'].value;

            const result = await getAdForSlotApi({
                adType: AdType.image.value,
                adLayout,
                trackId,
                domain: window.location.hostname,
            });
            this.#adResult = result.data;
            this.#renderImage(this.#adResult);
        } catch (e) {
            console.error(e);
            this.classList.add('is-error');
            return;
        }
    }

    #renderImage(adResult: AdResult) {
        const { mediaUrl, title, landingPage } = adResult;
        const image = h<HTMLImageElement>('img#ad', {
            src: getBackendFullPath(mediaUrl),
            title: title,
            alt: title,
            onclick: () => {
                this.#clicked = AdClicked.clicked.value;
                console.log(`Ad ${title} clicked`);
                this.#updateAdStatus();
                window.open(landingPage, '_blank', 'noopener,noreferrer');
            },
            onerror: () => {
                console.error(`Failed to load ad image from ${mediaUrl}`);
                this.classList.add('is-error');
            },
            onload: () => {
                this.classList.add('is-loaded');
                this.#updateTimer();
            },
        });
        this.shadowRoot?.append(image);
    }

    async #updateAdStatus() {
        if (!this.#adResult) {
            return;
        }

        try {
            const duration = this.#timer.getDuration();
            await updateAdDisplayApi(this.#adResult.displayId, {
                clicked: this.#clicked,
                duration,
            });
        } catch (e) {
            console.error(e);
        }
    }
}

// Upgrade AdFluxSlot Elements after Tracker is Ready
let trackId: string | null = null;
const trackerOrigin = new URL(import.meta.url).origin;
const handleMessage = (
    event: MessageEvent<{
        type: 'trackerReady';
        trackId: string;
    }>,
) => {
    if (event.origin !== trackerOrigin || event.data?.type !== 'trackerReady') {
        return;
    }
    trackId = event.data.trackId;
    customElements.define('adflux-slot', AdFluxSlot);
    window.removeEventListener('message', handleMessage);
};
window.addEventListener('message', handleMessage);

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
