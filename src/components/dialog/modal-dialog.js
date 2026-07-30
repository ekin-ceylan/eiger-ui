import { html, nothing } from 'lit';
import SlotCollectorMixin from '../../mixins/slot-collector-mixin.js';
import { hideBodyScroll, showBodyScroll } from '../../modules/scroll-lock-helper.js';
import { lightMixins } from '../../modules/mixin-utils.js';
import Keys from '../../enums/Keys.js';

/**
 * Custom modal dialog component that extends LightComponentBase and uses SlotCollectorMixin to manage its content. It provides features such as backdrop click to close, Escape key to close, and customizable header and footer rendering.
 * - Can be used after defining like `defineElement('modal-dialog', ModalDialog)` or `customElement.define('modal-dialog', ModalDialog)`.
 * - The `open` attribute controls the visibility of the dialog.
 * - The `backdrop-close` attribute allows closing the dialog by clicking on the backdrop area.
 * - The `esc-close` attribute allows closing the dialog by pressing the Escape key.
 * - The `renderHeader()` method can be overridden to customize the dialog header, and `renderFooter()` for the footer. By default, a close button is provided in the header, and the footer is empty.
 * @example
 * ```html
 * <modal-dialog backdrop-close esc-close>
 *     <h2>Dialog Title</h2>
 *     <p>Dialog content goes here.</p>
 *     <button slot="footer" ⁣@click="this.hide()">Close</button>
 * </modal-dialog>
 * ```
 */
export default class ModalDialog extends lightMixins(SlotCollectorMixin) {
    // #region FIELDS

    /**
     * Component reactive properties
     * @type {import('lit').PropertyDeclarations}
     */
    static get properties() {
        return {
            open: { type: Boolean },
            backdropClose: { type: Boolean, attribute: 'backdrop-close' },
            escClose: { type: Boolean, attribute: 'esc-close' },
        };
    }

    #dialog = null;
    #timeout = undefined;

    // #endregion FIELDS

    constructor() {
        super();

        /** @type {boolean} */
        this.open = false;

        /** @type {boolean} */
        this.backdropClose = false;

        /** @type {boolean} Close when pressing the Escape key. */
        this.escClose = false;
    }

    /** @override @protected */
    firstUpdated() {
        this.#dialog = this.renderRoot.querySelector('dialog');

        this.#dialog?.addEventListener('cancel', e => {
            e.preventDefault(); // prevent browser to close modal immediately
            if (this.escClose) this.hide();
        });

        this.#dialog?.addEventListener('keydown', e => {
            if (e.code !== Keys.ESCAPE) return;
            e.preventDefault(); // prevent browser to close modal immediately
            if (this.escClose) this.hide();
        });

        this.#dialog?.addEventListener('click', e => {
            if (!this.backdropClose) return; // if no backdropClose attr
            if (!this.#clickedOnBackdrop(e)) return; //  if clicked inside dialog
            e.preventDefault();
            this.hide();
        });
    }

    disconnectedCallback() {
        super.disconnectedCallback();

        if (this.open) {
            showBodyScroll(this.#dialog);
        }
    }

    /** @override */
    updated(changedProperties) {
        super.updated(changedProperties);

        if (this.#dialog && changedProperties.has('open') && this.open != this.#dialog.open) {
            this.open ? this.#show() : this.#hide();
        }
    }

    /** Open the dialog programmatically. */
    show() {
        this.open = true;
    }
    /** Close the dialog programmatically. */
    hide() {
        this.open = false;
    }

    /**
     * Renders the dialog header area.
     *
     * Default implementation renders only the close button:
     * ```
     * return html`
     *     <button type="button"⠀@click=${this.hide} data-role="close" aria-label="Close">
     *        &times;
     *     </button>`;
     * ```
     * Subclasses may override this method to:
     * - add a title or custom actions
     * - replace the close button
     * - return `nothing` to omit the header entirely
     *
     * @return {import('lit').TemplateResult | typeof nothing} */
    renderHeader() {
        return html`<button type="button" @click=${this.hide} data-role="close" aria-label="Close">&times;</button>`;
    }

    /**
     * Renders the dialog footer area.
     *
     * Default implementation renders nothing:
     * ```js
     * return nothing;
     * ```
     * Subclasses may override this method to:
     * - add action buttons
     * - add slots for custom content
     * @example
     * ```js
     * return html`
     *     <slot name="footer"></slot>
     *     <button type="button" ⁣@click=${this.hide}>Close</button>
     * `;
     * ```
     *
     * @return {import('lit').TemplateResult | typeof nothing} */
    renderFooter() {
        return nothing;
    }

    /** Show with small delay for CSS transitions. */
    #show() {
        this.#dialog?.showModal();
        hideBodyScroll(this.#dialog);
        clearTimeout(this.#timeout);

        this.#timeout = setTimeout(() => {
            this.#dialog?.setAttribute('data-active', '');
            this.dispatchCustomEvent('show');
        }, 20);
    }

    /** Hide with small delay for CSS transitions. */
    #hide() {
        this.#dialog?.removeAttribute('data-active');
        clearTimeout(this.#timeout);

        this.#timeout = setTimeout(() => {
            showBodyScroll(this.#dialog);
            this.#dialog?.close();
            this.dispatchCustomEvent('hide');
        }, 300);
    }

    /**
     * Returns true if click was on the backdrop area (outside dialog rect).
     * @param {MouseEvent} e
     */
    #clickedOnBackdrop = e => {
        if (this.#dialog.contains(e.target) && this.#dialog != e.target) return false;

        const r = this.#dialog.getBoundingClientRect();
        const [x, y] = [e.clientX, e.clientY];

        return x < r.left || x > r.right || y < r.top || y > r.bottom;
    };

    /** @override @protected @returns {import('lit').TemplateResult} */
    render() {
        return html`<dialog role="dialog" aria-modal="true" tabindex="-1">
            ${this.renderHeader()}
            <slot></slot>
            ${this.renderFooter()}
        </dialog>`;
    }
}
