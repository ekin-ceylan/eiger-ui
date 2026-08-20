import { LitElement } from 'lit';
import { getMessages } from '../i18n/locale.js';

/**
 * @typedef {keyof import('../i18n/types').LocaleRegistry} LocaleKey
 */

/**
 * Base class for components that render into the **light DOM** (no ShadowRoot).
 * - Keep page/global styles affecting the component (no style encapsulation).
 * - Provide `getScopedAttrs()` helper for attribute forwarding.
 * - Provide `dispatchCustomEvent()` helper for consistent custom event dispatching.
 * - Provide a stable `componentName` for logs/errors (minify-safe).
 * - Because it extends `LitElement`, instances have `updateComplete`, `requestUpdate`, etc.
 * - `createRenderRoot()` returns `this`, so styles and DOM are not encapsulated.
 * @abstract Not intended to be used directly in component definitions (for example, with customElements.define). Extend this class to create concrete components.
 * @extends {LitElement}
 */
export default class LightComponentBase extends LitElement {
    #lang = null;

    /**
     * Stable component identifier for logs/errors (minify-safe).
     * Falls back to `constructor.name` when not connected/upgraded.
     * @returns {string}
     */
    get componentName() {
        return this.localName || (this.tagName ? this.tagName.toLowerCase() : '') || this.constructor.name;
    }

    /**
     * Current locale of the component, derived from the closest ancestor with a `lang` attribute. Updates automatically on `locale-change` events.
     * @returns {LocaleKey | null}
     */
    get lang() {
        return /** @type {LocaleKey | null} */ (this.#lang);
    }

    /**
     * Messages for the current locale, derived from the closest ancestor with a `lang` attribute.
     * @returns {Readonly<import('../i18n/types').LocaleMessages>}
     */
    get localeMessages() {
        return getMessages(this.lang);
    }

    /** @override @protected */
    firstUpdated(changedProperties) {
        super.firstUpdated(changedProperties);
        this.dispatchCustomEvent('load');
    }

    /**
     * @override
     * Initializes component lifecycle, locale, and event listeners.
     * - Calls `super.connectedCallback()` for proper Lit lifecycle.
     * - Sets locale from closest `[lang]` ancestor.
     * - Listens to `locale-change` events for dynamic locale updates.
     */
    connectedCallback() {
        super.connectedCallback();
        this.#setLocale();
        document.addEventListener('locale-change', this.#onLocaleChange);
    }

    /**
     * @override
     * Cleans up event listeners and other resources when the component is disconnected.
     */
    disconnectedCallback() {
        super.disconnectedCallback();
        document.removeEventListener('locale-change', this.#onLocaleChange);
    }

    /** @override @protected */
    createRenderRoot() {
        return this; // Shadow DOM'u kapat
    }

    /**
     * Collects host attributes that carry the given `prefix:` scope, strips
     * the prefix, and returns a plain object ready for the `spread` directive.
     *
     * Convention: write `prefix:attr-name="value"` on the custom element to
     * forward an attribute to a specific inner element without touching the host.
     *
     * @example
     * // In HTML:
     * // <typed-image img:fetchpriority="high" img:aria-hidden="true" />
     *
     * // In render():
     * // html`<img ${spread(this.getScopedAttrs('img'))} src=${this.src} />`
     *
     * @param {string} prefix - Scope name, e.g. `'img'`, `'input'`, `'label'`.
     * @returns {Record<string, string>}
     */
    getScopedAttrs(prefix) {
        const scopePrefix = `${prefix}:`;
        /** @type {Record<string, string>} */
        const result = {};

        for (const { name, value } of this.attributes) {
            if (name.startsWith(scopePrefix)) {
                result[name.slice(scopePrefix.length)] = value;
            }
        }

        return result;
    }

    /**
     * Helper to dispatch custom events with consistent options and detail structure.
     * @param {string} eventName
     * @param {Event | null} originalEvent
     * @param {Object | null} data - Additional data to include in event.detail
     */
    dispatchCustomEvent(eventName, originalEvent = null, data = null) {
        this.dispatchEvent(new CustomEvent(eventName, this.#eventInitDict(originalEvent, data)));
    }

    #eventInitDict(originalEvent, data) {
        return {
            bubbles: true,
            cancelable: true,
            composed: true,
            detail: {
                ...data,
                originalEvent,
                synthetic: !(originalEvent && originalEvent instanceof Event),
            },
        };
    }

    /** Updates the component's locale based on the closest ancestor with a `lang` attribute. */
    #setLocale() {
        this.#lang = this.getAttribute('lang') || this.closest('[lang]')?.getAttribute('lang');
    }

    #onLocaleChange = () => this.#setLocale();
}

// güvenli sorgu yardımcısı eklenebilir.
// $scope(selector) { return this.querySelector(selector); }
