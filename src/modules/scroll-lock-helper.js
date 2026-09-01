/** @type {Map<HTMLElement, ((detail: { reason: 'scroll' | 'resize', event: Event, element: HTMLElement }) => void) | undefined>} */
const scrollLocks = new Map();

function findAllowedElement(path) {
    return [...scrollLocks.keys()].find(element => path.includes(element));
}

function preventDefault(e) {
    const path = e.composedPath();
    const targetElement = findAllowedElement(path);

    if (!targetElement) {
        e.preventDefault();
        return;
    }

    const delta = e.deltaY;
    const scrollTop = targetElement.scrollTop;
    const scrollHeight = targetElement.scrollHeight;
    const height = targetElement.clientHeight;

    const noScroll = scrollHeight <= height;
    const cannotScrollUp = delta < 0 && scrollTop <= 0;
    const cannotScrollDown = delta > 0 && scrollTop + height >= scrollHeight - 1;

    if (noScroll || cannotScrollUp || cannotScrollDown) {
        e.preventDefault();
    }
}

function onGlobalScroll(e) {
    const path = e.composedPath();

    for (const [element, callback] of scrollLocks) {
        if (!path.includes(element)) {
            callback?.({ reason: 'scroll', event: e, element });
        }
    }
}

function onResize(e) {
    for (const [element, callback] of scrollLocks) {
        callback?.({ reason: 'resize', event: e, element });
    }
}

/**
 * Prevents all wheel and touchmove events in the page for the given element
 * @param {HTMLElement} element The element for which to lock all scrolls
 * @param {(detail: { reason: 'scroll' | 'resize', event: Event, element: HTMLElement }) => void} [onScrollCallback]
 * Callback invoked when an external scroll or resize can invalidate anchored positioning
 * @returns void
 */
export function lockAllScrolls(element, onScrollCallback) {
    if (!element) return;
    const isFirstLock = scrollLocks.size === 0;
    scrollLocks.set(element, onScrollCallback);

    if (isFirstLock) {
        globalThis.addEventListener('wheel', preventDefault, { passive: false });
        globalThis.addEventListener('touchmove', preventDefault, { passive: false });
        globalThis.addEventListener('scroll', onGlobalScroll, { capture: true, passive: true });
        globalThis.addEventListener('resize', onResize, { passive: true });
    }
}

/**
 * Unlock scroll for the given element
 * @param {HTMLElement} element
 * @returns void
 */
export function unlockAllScrolls(element) {
    if (!element) return;
    scrollLocks.delete(element);

    if (scrollLocks.size === 0) {
        globalThis.removeEventListener('wheel', preventDefault);
        globalThis.removeEventListener('touchmove', preventDefault);
        globalThis.removeEventListener('scroll', onGlobalScroll, { capture: true });
        globalThis.removeEventListener('resize', onResize);
    }
}

const lockerElements = new Set();
let originalBodyOverflow = '';
let originalBodyPaddingRight = '';

/**
 * Hides body scroll and adds padding to prevent layout shift when scrollbar disappears
 * @param {HTMLElement} element
 * @returns void
 */
export function hideBodyScroll(element) {
    if (!element) return;
    lockerElements.add(element);
    if (lockerElements.size != 1) return;

    const style = globalThis.getComputedStyle(document.body);
    const paddingInlineEnd = Number.parseInt(style.paddingInlineEnd) || 0;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    originalBodyPaddingRight = document.body.style.paddingInlineEnd;
    originalBodyOverflow = document.body.style.overflow;

    document.body.style.paddingInlineEnd = `${paddingInlineEnd + scrollbarWidth}px`;
    document.body.style.overflow = 'hidden';
}

/**
 * Shows body scroll and removes padding added to prevent layout shift when scrollbar disappears
 * @param {HTMLElement} element
 * @returns void
 */
export function showBodyScroll(element) {
    if (!element) return;
    lockerElements.delete(element);
    if (lockerElements.size > 0) return;

    document.body.style.overflow = originalBodyOverflow || '';
    document.body.style.paddingInlineEnd = originalBodyPaddingRight || '';
}
