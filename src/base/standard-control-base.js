import { html, nothing } from 'lit';
import FormControlBase from './form-control-base.js';
import Keys from '../enums/Keys.js';

/**
 * Base class for standard form control components that have `<label>` + `<input>` + `<error>` structure, providing common functionality for inputs, selects, and other form controls.
 * - Provides `hideLabel`, `clearable`, and `placeholder` properties for common form control features.
 * - Provides `renderLabel()` and `renderClearButton()` methods for rendering the label and clear button, respectively.
 * - Exposes underscore-based protected hooks for handling clear button interactions.
 *
 * Subclass override example:
 * ```js
 * import StandardControlBase from './standard-control-base.js';
 *
 * export default class MyControl extends StandardControlBase {
 *     onClearClick(event) {
 *         this.clear();
 *         this.dispatchCustomEvent('clear');
 *         this.inputElement?.focus();
 *     }
 * }
 * ```
 * @abstract Not intended to be used directly in component definitions (for example, with customElements.define). Extend this class to create concrete components.
 * @extends {FormControlBase}
 */
export default class StandardControlBase extends FormControlBase {
    static get properties() {
        return {
            ...super.properties,
            hideLabel: { type: Boolean, attribute: 'hide-label' },
            clearable: { type: Boolean, attribute: 'clearable' },
            placeholder: { type: String, reflect: true },
        };
    }

    /** @override */
    get labelId() {
        return this.hideLabel ? null : super.labelId;
    }

    constructor() {
        super();

        /** @type {boolean} Whether to hide the label visually */
        this.hideLabel = false;
        /** @type {string} Placeholder text for the input */
        this.placeholder = '';
        /** @type {boolean} Show clear button */
        this.clearable = false;
    }

    // #region EVENT LISTENERS

    /**
     * Clears the input value, dispatches a "clear" custom event, and focuses the input element.
     * @param {Event} event The event that triggered the clear action.
     * @fires clear - Dispatched when the clear button is clicked, after the input value has been cleared.
     * @protected
     */
    onClearClick(event) {
        this.clear();
        this.dispatchCustomEvent('clear');
        this.inputElement?.focus(); // select için nasıl çalışır?
    }

    /**
     * Handles keydown events on the clear button. Stops propagation for Enter and Space keys to prevent form submission or other default behaviors.
     * @param {KeyboardEvent} event The keyboard event triggered on the clear button.
     * @protected
     */
    onClearKeyDown(event) {
        /** @type {string[]} */
        const stopKeys = [Keys.ENTER, Keys.SPACE];
        if (stopKeys.includes(event.code)) event.stopPropagation();
    }

    // #endregion EVENT LISTENERS

    // #region RENDER HOOKS

    /**
     * Renders the label text for the input field. By default, it returns the value of the `label` property, but can be overridden by subclasses to provide custom label rendering logic.
     *
     * Implementation example for a required field with an asterisk:
     * ```javascript
     * renderLabelContent() {
     *     return html`${this.label}${this.required ? html`<span>*</span>` : nothing}`;
     * }
     * ```
     * @category rendering
     * @return {import('lit').TemplateResult | string | typeof nothing}
     */
    renderLabelContent() {
        return this.label;
    }

    /**
     * Renders the label element for the input field. If `hideLabel` is true, it returns `nothing`, effectively hiding the label visually. Otherwise, it renders a `<label>` element with the appropriate `id` and `for` attributes, and includes the label text rendered by `renderLabelContent()`.
     * @protected
     * @category rendering
     * @return {import('lit').TemplateResult | typeof nothing}
     */
    renderLabel() {
        return this.hideLabel ? nothing : html`<label id=${this.labelId} for=${this.fieldId}>${this.renderLabelContent()}</label>`;
    }

    /**
     * Renders the text for the clear button. By default, it returns a multiplication sign (`&times;`), but can be overridden to provide custom clear button text or icons.
     * @example
     * renderClearButtonContent() {
     *     return html`<svg ...>...</svg>`; // Custom SVG icon for clear button
     * }
     *
     * @example
     * renderClearButtonContent() {
     *     return 'Clear'; // Custom text for clear button
     * }
     * @category rendering
     * @return {import('lit').TemplateResult | string | typeof nothing}
     */
    renderClearButtonContent() {
        return html`&times;`;
    }

    /**
     * Renders the clear button for the input field. If `clearable` is false, or the input is `readonly` or `disabled`, it returns `nothing`. Otherwise, it renders a `<button>` element with the appropriate ARIA attributes and event listeners, and includes the clear button text rendered by `renderClearButtonContent()`.
     * @protected
     * @category rendering
     * @return {import('lit').TemplateResult | typeof nothing}
     */
    renderClearButton() {
        if (!this.clearable || this.readonly || this.disabled) return nothing;
        const ariaLabel = this.localeMessages.clearButtonAriaLabel;

        return html`
            <button type="button" data-clear ?disabled=${!this.value} @click=${this.onClearClick} @keydown=${this.onClearKeyDown} aria-label="${ariaLabel}">
                ${this.renderClearButtonContent()}
            </button>
        `;
    }

    // #endregion RENDER HOOKS
}
