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
import { Timer } from '@/utils/timer';
import style from '@/style.css?inline';

// Define AdFluxBase Element
abstract class AdFluxBase extends HTMLElement {
    protected adResult: AdResult | null = null;
    protected clicked: ValueOf<typeof AdClicked> = AdClicked.notClicked.value;

    protected timer = new Timer(() => this.updateAdStatus(), import.meta.env.DEV ? 500 : 5000);
    protected durationDisplay: HTMLElement | null = null;
    protected lastApiUpdateTime: number = 0;

    protected abstract render(adResult: AdResult): void;

    protected getDuration(): number {
        return this.timer.getDuration();
    }

    connectedCallback() {}

    disconnectedCallback() {
        this.timer.stop();
    }

    protected async fetchAd(adType: ValueOf<typeof AdType>, adLayout: ValueOf<typeof AdLayout>) {
        this.attachShadow({ mode: 'open' });
        const shadowRoot = this.shadowRoot as ShadowRoot;
        shadowRoot.append(h<HTMLStyleElement>('style', style));
        await new Promise(requestAnimationFrame);
        await new Promise(requestAnimationFrame);
        this.classList.add('is-initialized');

        if (import.meta.env.DEV) {
            this.durationDisplay = h<HTMLDivElement>('div.dev-duration', '0.0s');
            shadowRoot.append(this.durationDisplay);
        }

        try {
            if (!trackId) {
                throw new Error('Track ID is null');
            }

            const result = await getAdForSlotApi({
                adType,
                adLayout,
                trackId,
                domain: window.location.hostname,
            });
            this.adResult = result.data;
            this.render(this.adResult);
        } catch (e) {
            console.error(e);
            this.classList.add('is-error');
            return;
        }
    }

    protected async updateAdStatus(immediate: boolean = false) {
        if (!this.adResult) {
            return;
        }

        const duration = this.getDuration();
        if (this.durationDisplay) {
            this.durationDisplay.textContent = `${duration.toFixed(1)}s`;
        }

        const now = Date.now();
        if (!immediate && this.timer.isActive() && now - this.lastApiUpdateTime < 5000) {
            return;
        }
        this.lastApiUpdateTime = now;

        try {
            await updateAdDisplayApi(this.adResult.displayId, {
                clicked: this.clicked,
                duration,
            });
        } catch (e) {
            console.error(e);
        }
    }
}

// Define AdFluxSlot Element (Image)
class AdFluxSlot extends AdFluxBase {
    #observer: IntersectionObserver | null = null;
    #isIntersecting: boolean = false;
    #handleVisibilityChange = this.#updateTimer.bind(this);

    connectedCallback() {
        super.connectedCallback();

        let layout: 'sidebar' | 'banner';
        const layoutAttr = this.getAttribute('layout');
        if (layoutAttr === 'sidebar' || layoutAttr === 'banner') {
            layout = layoutAttr;
        } else {
            const size = this.getBoundingClientRect();
            layout = size.height > size.width ? 'sidebar' : 'banner';
        }

        this.fetchAd(AdType.image.value, AdLayout[layout].value);
        this.#initIntersectionObserver();
        document.addEventListener('visibilitychange', this.#handleVisibilityChange);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this.#isIntersecting = false;
        this.#updateTimer();
        this.#observer?.disconnect();
        document.removeEventListener('visibilitychange', this.#handleVisibilityChange);
    }

    #updateTimer() {
        if (this.#isIntersecting && document.visibilityState === 'visible' && this.adResult) {
            this.timer.start();
        } else {
            if (this.timer.isActive()) {
                this.timer.stop();
                this.updateAdStatus();
            }
        }
    }

    #initIntersectionObserver() {
        this.#observer = new IntersectionObserver(
            (entries) => {
                this.#isIntersecting = entries[0].isIntersecting;
                this.#updateTimer();
            },
            { threshold: 0.5 },
        );
        this.#observer.observe(this);
    }

    protected render(adResult: AdResult) {
        const { mediaUrl, title, landingPage } = adResult;
        const image = h<HTMLImageElement>('img#ad', {
            src: getBackendFullPath(mediaUrl),
            title: title,
            alt: title,
            onclick: () => {
                this.clicked = AdClicked.clicked.value;
                console.log(`Ad ${title} clicked`);
                this.updateAdStatus(true);
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
}

// Define AdFluxVideo Element
class AdFluxVideo extends AdFluxBase {
    #video: HTMLVideoElement | null = null;

    connectedCallback() {
        super.connectedCallback();
        this.fetchAd(AdType.video.value, AdLayout.video.value);
    }

    protected render(adResult: AdResult) {
        const { mediaUrl, title, landingPage } = adResult;
        this.#video = h<HTMLVideoElement>('video#ad', {
            src: getBackendFullPath(mediaUrl),
            title: title,
            preload: 'auto',
            onclick: () => {
                this.clicked = AdClicked.clicked.value;
                this.updateAdStatus(true);
                window.open(landingPage, '_blank', 'noopener,noreferrer');
            },
            onplay: () => {
                this.timer.start();
            },
            onpause: () => {
                this.timer.stop();
                this.updateAdStatus(true);
            },
            onended: () => {
                this.timer.stop();
                this.updateAdStatus(true);
                this.dispatchEvent(new CustomEvent('ad-finished'));
            },
            onerror: () => {
                console.error(`Failed to load ad video from ${mediaUrl}`);
                this.classList.add('is-error');
                this.dispatchEvent(new CustomEvent('ad-error'));
            },
            onloadeddata: () => {
                this.classList.add('is-loaded');
            },
        });
        this.shadowRoot?.append(this.#video);
    }

    async play() {
        try {
            await this.#video?.play();
        } catch (e) {
            console.error('Failed to play video ad', e);
            this.classList.add('is-error');
            this.dispatchEvent(new CustomEvent('ad-error'));
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
    if (event.origin !== trackerOrigin) {
        return;
    }
    if (event.data?.type === 'trackerReady') {
        if (trackId) return;
        trackId = event.data.trackId;
        customElements.define('adflux-slot', AdFluxSlot);
        customElements.define('adflux-video', AdFluxVideo);
    }
};
window.addEventListener('message', handleMessage);

// Inject Tracker Iframe
if (document.getElementById('adflux-tracker')) {
    throw new Error('AdFlux tracker already exists');
}

const getMeta = (name: string) =>
    document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)?.content;

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
