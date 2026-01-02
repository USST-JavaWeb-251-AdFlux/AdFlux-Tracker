// src/main.ts
// Import entry for content sites

import h from 'hyperscript';
import { getMeta } from '@/utils/tools';
import style from '@/style.css?inline';
import { AdLayout, AdType, getAdForSlotApi } from '@/apis';

// Define AdFluxSlot Element
class AdFluxSlot extends HTMLElement {
    connectedCallback() {
        loadAdForSlot(this);
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

const loadAdForSlot = async (slot: AdFluxSlot) => {
    // slot.textContent = 'AD Content';
    await new Promise(requestAnimationFrame);
    slot.attachShadow({ mode: 'open' });
    const shadowRoot = slot.shadowRoot as ShadowRoot;
    shadowRoot.append(h<HTMLStyleElement>('style', style));

    let adResult: Awaited<ReturnType<typeof getAdForSlotApi>>;
    try {
        if (!trackId) {
            throw new Error('Track ID is null');
        }

        const size = slot.getBoundingClientRect();
        const adLayout = size.height > size.width ? AdLayout.sidebar.value : AdLayout.banner.value;

        adResult = await getAdForSlotApi({
            adType: AdType.image.value,
            adLayout,
            trackId,
            domain: window.location.hostname,
        });
    } catch (e) {
        console.error(e);
        slot.classList.add('is-error');
        return;
    }

    const { mediaUrl, title, landingPage } = adResult.data;
    const image = h<HTMLImageElement>('img#ad', {
        src: mediaUrl,
        title: title,
        alt: title,
        onclick: () => {
            // TODO: Set clicked API
            console.log(`Ad ${title} clicked`);
            window.open(landingPage, '_blank', 'noopener,noreferrer');
        },
        onerror: () => {
            console.error(`Failed to load ad image from ${mediaUrl}`);
            slot.classList.add('is-error');
        },
        onload: () => {
            slot.classList.add('is-loaded');
        },
    });
    shadowRoot.append(image);
};
