import { html, nothing } from 'lit';
import { mixins } from '../../modules/mixin-utils.js';
import { spread } from '../../modules/spread.js';
import { ifDefined, isEmpty } from '../../modules/utilities.js';
import StandardControlBase from '../../base/standard-control-base.js';
import SlotCollectorMixin from '../../mixins/slot-collector-mixin.js';

/**
 * General purpose text area component. Can be used for multi-line text input.
 * - Can be used after defining like `defineElement('text-area', TextArea)` or `customElement.define('text-area', TextArea)`.
 * - The `required`, `maxlength`, `minlength`, `rows`, `cols`, and `wrap` attributes can be used for validation and configuration.
 * @example <text-area name="description" required minlength="10" maxlength="500" rows="5" cols="40"></text-area>
 */
export default class TextArea extends mixins(StandardControlBase, SlotCollectorMixin) {
    // #region STATICS, FIELDS, GETTERS

    static get properties() {
        return {
            ...super.properties,
            autocomplete: { type: String },
            spellcheck: { type: Boolean, reflect: true },
            showCounter: { type: Boolean, reflect: true, attribute: 'show-counter' },
            description: { type: String, attribute: false },
            inputmode: { type: String, reflect: true },
            maxlength: { type: Number },
            minlength: { type: Number },
            rows: { type: Number, reflect: true },
            cols: { type: Number, reflect: true },
            wrap: { type: String, reflect: true },
        };
    }

    #slotContent = '';
    #cachedInput = undefined;

    /**
     * Returns the reference to the native input element within the component. Caches the reference after the first query for performance optimization.
     * @returns {HTMLTextAreaElement | null}
     */
    get inputElement() {
        if (this.#cachedInput === undefined) {
            this.#cachedInput = this.renderRoot?.querySelector('textarea');
        }

        return this.#cachedInput;
    }

    /**
     * The text to be displayed in the character counter, based on the current value length and the maxlength attribute.
     * By default, if maxlength is set, it shows the remaining characters; otherwise, it shows the current length.
     * It can be overridden by subclasses to provide custom counter text logic.
     * @returns {string}
     */
    get counterText() {
        const valueLength = this.value?.length ?? 0;
        const counter = this.maxlength > 0 ? this.maxlength - valueLength : valueLength;

        return `${counter}`;
    }

    get descriptionId() {
        return `${this.componentName}-description-${this.uniqueId}`;
    }

    /**
     * Returns the validation message for the minlength constraint.
     * @returns {string}
     */
    get minLengthValidationMessage() {
        return this.localeMessages.minlength(this.label, this.minlength);
    }

    /**
     * Returns the validation message for the maxlength constraint.
     * @returns {string}
     */
    get maxLengthValidationMessage() {
        return this.localeMessages.maxlength(this.label, this.maxlength);
    }

    // #endregion STATICS, FIELDS, GETTERS

    constructor() {
        super();

        /** @type {string | undefined} The autocomplete attribute for the input element */
        this.autocomplete = undefined;
        /** @type {boolean} Whether spellcheck is enabled for the input element */
        this.spellcheck = true;
        /** @type {boolean} Whether the character counter is shown when maxlength is set */
        this.showCounter = false;
        /** @type {string | HTMLElement | undefined} The description text for the textarea */
        this.description = undefined;
        /** @type {string | undefined} The inputmode attribute for the input element (e.g., 'numeric', 'decimal', 'tel'). Will be 'text' if not specified */
        this.inputmode = undefined;
        /** @type {number | undefined} The maximum length of the input value */
        this.maxlength = undefined;
        /** @type {number | undefined} The minimum length of the input value */
        this.minlength = undefined;
        /** @type {number | undefined} The number of rows for the textarea */
        this.rows = undefined;
        /** @type {number | undefined} The number of columns for the textarea */
        this.cols = undefined;
        /** @type {string | undefined} The wrap attribute for the textarea */
        this.wrap = undefined;
    }

    // #region INTERNAL HOOKS

    /** @inheritdoc */
    validateNode(node, slotName) {
        if (slotName === 'default') {
            return this.#validateDefaultNode(node);
        }
        if (slotName === 'description') {
            return this.#validateDescriptionNode(node);
        }
        return true;
    }

    afterSlotsBinded(hasProjectedContent) {
        if (hasProjectedContent && isEmpty(this.value)) {
            this.value = this.#slotContent;
        }

        this.#slotContent = '';
    }

    /** @override @protected */
    setupFirstInteraction() {
        // programatik atama etkiler mi native ile dene
        this.inputElement?.addEventListener('input', _e => this.dispatchCustomEvent('first-interaction'), { once: true });
    }

    /** @override @protected */
    valueUpdated() {
        if (!super.valueUpdated()) return false;

        this.#checkValidity(false);
        return true;
    }

    /** @override */
    validate(value) {
        if (this.required && !value) return this.requiredValidationMessage;
        if (value?.length > 0 && value?.length < this.minlength) return this.minLengthValidationMessage;
        if (value?.length > this.maxlength) return this.maxLengthValidationMessage;

        return '';
    }

    // #endregion INTERNAL HOOKS

    // #region EVENT HANDLERS

    /**
     * Handles input event for textarea: syncs value and re-dispatches as component event.
     * @param {InputEvent & { target: HTMLTextAreaElement }} event
     */
    #onInput(event) {
        event.stopPropagation();
        this.value = event.target.value;
        this.#checkValidity(false);
        this.dispatchCustomEvent('input', event);
    }

    /**
     * Handles change event for textarea.
     * @param {Event & { target: HTMLTextAreaElement }} event
     */
    #onChange(event) {
        event.stopPropagation();
        this.value = event.target.value;
        this.dispatchCustomEvent('change', event);
    }

    /**
     * Handles blur event for textarea.
     * @param {Event} _event
     */
    #onBlur(_event) {
        this.#checkValidity(this.interacted);
    }

    /**
     * Handles native invalid event from textarea.
     * @param {Event} _event
     */
    #onInvalid(_event) {
        this.#checkValidity(true);
    }

    #checkValidity(force = false) {
        const valueMissing = this.required && isEmpty(this.value);
        const isDeleted = this.interacted && valueMissing;

        // Validate eagerly only when forced, already invalid, or cleared after interaction.
        if (!force && !this.invalid && !isDeleted) return true;

        return this.checkValidity();
    }

    // #endregion EVENT HANDLERS

    // #region PRIVATE

    #validateDefaultNode(node) {
        if (!isEmpty(this.value)) {
            console.warn('Value is already set via property. Ignoring slotted nodes.');
            return false;
        }

        if (node.nodeType === Node.TEXT_NODE) {
            this.#slotContent += node.textContent ?? '';
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            this.#slotContent += node.outerHTML ?? '';
        }

        return false;
    }

    #validateDescriptionNode(node) {
        this.description = node ?? '';
        return false;
    }

    // #endregion PRIVATE

    /**
     * Renders the adornment element for the textarea.
     * By default, it returns `nothing`, but can be overridden by subclasses to provide custom adornment rendering logic.
     *
     * @example
     * renderAdornment() {
     *     return html`<span class="adornment">%</span>`;
     * }
     * @protected
     * @category rendering
     * @return {import('lit').TemplateResult | typeof nothing}
     */
    renderAdornment() {
        return nothing;
    }

    /**
     * Renders the counter element for the textarea.
     * It can be overridden by subclasses to provide custom counter rendering logic.
     * @protected
     * @category rendering
     * @return {import('lit').TemplateResult | typeof nothing}
     */
    renderCounter() {
        if (!this.showCounter) return nothing;
        return html`<span data-role="counter" aria-live="polite">${this.counterText}</span>`;
    }

    /**
     * Renders the description element for the textarea.
     * It can be overridden by subclasses to provide custom description rendering logic.
     * @protected
     * @category rendering
     * @return {import('lit').TemplateResult | typeof nothing}
     */
    renderDescription() {
        if (!this.description) return nothing;
        return html`<div data-role="description" id=${this.descriptionId}>${this.description}</div>`;
    }

    render() {
        return html`${this.renderLabel()}
            <div data-role="container">
                <textarea
                    ${spread(this.getScopedAttrs('textarea'))}
                    id=${this.fieldId}
                    name=${ifDefined(this.name)}
                    ?disabled=${this.disabled}
                    ?readonly=${this.readonly}
                    aria-labelledby=${ifDefined(this.labelId)}
                    aria-label=${ifDefined(this.hideLabel ? this.label : undefined)}
                    aria-errormessage=${ifDefined(this.errorId)}
                    aria-describedby=${ifDefined(this.description ? this.descriptionId : undefined)}
                    aria-required=${this.required ? 'true' : 'false'}
                    aria-invalid=${ifDefined(this.ariaInvalid)}
                    .placeholder=${this.placeholder}
                    autocomplete=${ifDefined(this.autocomplete)}
                    ?required=${this.required}
                    spellcheck=${ifDefined(this.spellcheck)}
                    inputmode=${ifDefined(this.inputmode)}
                    maxlength=${ifDefined(this.maxlength)}
                    minlength=${ifDefined(this.minlength)}
                    rows=${ifDefined(this.rows)}
                    cols=${ifDefined(this.cols)}
                    wrap=${ifDefined(this.wrap)}
                    ?data-has-value=${this.value}
                    @input=${this.#onInput}
                    @change=${this.#onChange}
                    @blur=${this.#onBlur}
                    @invalid=${this.#onInvalid}
                ></textarea>
                ${this.renderAdornment()} ${this.renderCounter()} ${this.renderClearButton()} ${this.renderDescription()}
            </div>
            ${this.renderErrorMessage()}`;
    }
}
