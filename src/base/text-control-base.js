import { html, nothing } from 'lit';
import StandardControlBase from './standard-control-base.js';
import { spread } from '../modules/spread.js';
import { ifDefined, isEmpty } from '../modules/utilities.js';
import Keys from '../enums/Keys.js';

/**
 * Base class for text-based input components, providing common functionality for masking, unmasking, validation, and event handling.
 * - Provides `mask()` and `unmask()` methods for formatting input values.
 * - Provides `validateLastChar()` for character-level validation based on an allow-pattern regex.
 * - Provides `replaceCaret()` for calculating caret position after formatting.
 *
 * **Promotable Properties**
 *
 * The following fields are set as plain (non-reactive) values in this base class and wired into
 * the render template. Concrete subclasses may promote any of them to **Lit reactive properties**
 * by declaring them in `static get properties()`.
 *
 * Subclasses that want to **seal** a property (fix its value, disallow attribute binding) should
 * simply not include it in `static get properties()` and set the desired value in the constructor.
 *
 * **Promotable fields:** `type: string`, `inputmode: string`, `pattern: string`, `allowPattern: string`,
 * `maxlength: number`, `minlength: number`, `max: number`, `min: number`,
 * `autounmask: boolean`, `autocomplete: string`, `spellcheck: boolean`.
 *
 * Attribute mapping is intentionally left to concrete subclasses. Each subclass decides whether a
 * promoted property should reflect to an attribute and, if so, which attribute name it uses.
 *
 * @abstract Not intended to be used directly in component definitions (for example, with customElements.define). Extend this class to create concrete components.
 * @extends {StandardControlBase}
 */
export default class TextControlBase extends StandardControlBase {
    // #region STATICS, FIELDS, GETTERS

    #isComplete = false;
    #cachedInput = undefined;

    /** @type {String|null} The last key pressed during keydown event */
    #lastKey = null;

    /** @type {string | null } */
    #maskedVal = '';
    /** @type {string | null } */
    #unmaskedValue = '';

    /** @type {RegExp|null} The compiled regex pattern for single character validation */
    #regexPattern = null;
    /** @type {RegExp|null} The compiled allow-pattern regex for single character filtering */
    #allowRegexPattern = null;
    /** @type {RegExp|null} The compiled allow-pattern regex with global flag for filtering operations */
    #globalAllowRegexPattern = null;

    /**
     * The masked value of the input, derived from the raw value. This is the value that is displayed in the input field, which may include formatting or masking based on the component's configuration.
     * @returns {string | null}
     */
    get maskedValue() {
        return this.#maskedVal;
    }
    set #maskedValue(val) {
        this.#maskedVal = val;
        this.#unmaskedValue = this.unmask(val);
    }

    /**
     * The unmasked value of the input, derived from the masked value. This is the raw value without any formatting or masking applied.
     * @returns {string | null }
     */
    get unmaskedValue() {
        return this.#unmaskedValue;
    }

    /**
     * The last key pressed during keydown event
     * @returns {string|null}
     */
    get lastKey() {
        return this.#lastKey;
    }

    /**
     * Returns the validation message for the minlength constraint, using the current locale messages and the component's label.
     * @returns {string}
     */
    get minLengthValidationMessage() {
        return this.localeMessages.minlength(this.label, this.minlength);
    }

    /**
     * Returns the validation message for the maxlength constraint, using the current locale messages and the component's label.
     * @returns {string}
     */
    get maxLengthValidationMessage() {
        return this.localeMessages.maxlength(this.label, this.maxlength);
    }

    /**
     * Returns the validation message for the maximum value constraint, using the current locale messages and the component's label.
     * @returns {string}
     */
    get maxValueValidationMessage() {
        return this.localeMessages.max(this.label, this.max);
    }

    /**
     * Returns the validation message for the minimum value constraint, using the current locale messages and the component's label.
     * @returns {string}
     */
    get minValueValidationMessage() {
        return this.localeMessages.min(this.label, this.min);
    }

    /**
     * Returns the validation message for the pattern constraint, using the current locale messages and the component's label.
     * @returns {string}
     */
    get patternValidationMessage() {
        return this.localeMessages.pattern(this.label);
    }

    /**
     * Returns the reference to the native input element within the component. Caches the reference after the first query for performance optimization.
     * @returns {HTMLInputElement | null}
     */
    get inputElement() {
        if (this.#cachedInput === undefined) {
            this.#cachedInput = this.renderRoot?.querySelector('input');
        }

        return this.#cachedInput;
    }

    // #endregion STATICS, FIELDS, GETTERS

    // #region LIFECYCLE

    constructor() {
        super();

        this.label = '';
        this.placeholder = '';
        this.required = false;
        this.value = '';

        /** @type {string} The type attribute for the input element (e.g., 'text', 'email', 'tel') */
        this.type = 'text';
        /** @type {string | undefined} The inputmode attribute for the input element (e.g., 'numeric', 'decimal', 'tel'). Will be 'text' if not specified */
        this.inputmode = undefined;
        /** @type {string | undefined} Regex source to allow/filter characters during masking */
        this.allowPattern = undefined; //'[a-zA-ZçÇğĞıİöÖşŞüÜâÂîÎ ]';
        /** @type {string | undefined} The regex pattern for input validation */
        this.pattern = undefined;
        /** @type {number | undefined} The maximum length of the input value */
        this.maxlength = undefined;
        /** @type {number | undefined} The minimum length of the input value */
        this.minlength = undefined;
        /** @type {number | undefined} The maximum numeric value allowed */
        this.max = undefined;
        /** @type {number | undefined} The minimum numeric value allowed */
        this.min = undefined;
        /** @type {boolean} Whether to unmask the value on change event */
        this.autounmask = false;
        /** @type {string | undefined} The autocomplete attribute for the input element */
        this.autocomplete = undefined;
        /** @type {boolean | undefined} Whether spellcheck is enabled for the input element */
        this.spellcheck = undefined;
    }

    /**
     * @param {import('lit').PropertyValues} changedProperties Map of changed properties with old values
     * @protected
     * @override
     * - Calls `super.firstUpdated()` to ensure proper Lit lifecycle.
     * - Sets up a listener for the form's `formdata` event to handle form data submission.
     * - Calls `#createRegexPatterns()` to compile regex patterns for validation and character filtering.
     */
    firstUpdated(changedProperties) {
        super.firstUpdated(changedProperties);
        this.inputElement?.form?.addEventListener('formdata', this.#handleFormData.bind(this));
        this.#createRegexPatterns();
    }

    /**
     * @param {import('lit').PropertyValues} changedProperties Map of changed properties with old values
     * @protected
     * @override
     * - Calls `super.willUpdate()` to ensure proper Lit lifecycle.
     * - If the `value` property has changed, it updates the masked and unmasked values accordingly, and applies masking if `autounmask` is not enabled.
     */
    willUpdate(changedProperties) {
        super.willUpdate(changedProperties);

        if (changedProperties.has('value')) {
            const valStr = this.value?.toString() || this.value;
            this.#maskedValue = this.mask(valStr);
            this.value = this.autounmask ? this.unmaskedValue : this.maskedValue;
        }
    }

    /**
     * @param {import('lit').PropertyValues} changedProperties Map of changed properties with old values
     * @protected
     * @override
     * - Calls `super.updated()` to ensure proper Lit lifecycle.
     * - If the `allowPattern` or `pattern` properties have changed, it recompiles the regex patterns used for validation and character filtering.
     */
    updated(changedProperties) {
        super.updated(changedProperties);

        // Recompile patterns when they change at runtime (attribute or property update).
        if (changedProperties.has('allowPattern') || changedProperties.has('pattern')) {
            this.#createRegexPatterns();
        }
    }

    // #endregion LIFECYCLE

    // #region PUBLIC API

    /**
     * Checks if the input value is complete based on the defined constraints.
     * @category public api
     * @returns {boolean}
     */
    isComplete() {
        return false;
    }

    // #endregion PUBLIC API

    // #region INTERNAL HOOKS

    /**
     * Masks the input value by applying a masking algorithm.
     *
     * Subclasses can override this method to provide custom masking logic based on specific formatting requirements.
     * @param {string} value - The value to be masked
     * @protected
     * @category internal hooks
     * @returns {string}
     */
    mask(value) {
        if (isEmpty(value)) return value;

        const re = this.#globalAllowRegexPattern;
        const filtered = re ? (value.match(re) ?? []).join('') : value;

        return filtered;
    }

    /**
     * Unmasks the input value by reversing the masking process.
     *
     * Subclasses can override this method to provide custom unmasking logic if needed.
     * @param {string} maskedValue - The masked value to be unmasked
     * @protected
     * @category internal hooks
     * @returns {string}
     */
    unmask(maskedValue) {
        return maskedValue;
    }

    /**
     * Calculates the new caret position after formatting the input value.
     *
     * This method can be overridden by subclasses to provide custom caret positioning logic based on specific formatting rules.
     * @param {number} caretPosition The current position of the caret in the input value
     * @param {string} snapshotValue The snapshot value of the input at the time of input event
     * @protected
     * @category internal hooks
     * @returns {number}
     */
    replaceCaret(caretPosition, snapshotValue) {
        const maskedLength = this.maskedValue.length;
        const valueLength = snapshotValue.length;

        if (this.lastKey == Keys.BACKSPACE) return caretPosition;
        if (caretPosition === valueLength) return maskedLength; // imleç sona
        if (this.lastKey == Keys.DELETE) return caretPosition + Number(maskedLength > valueLength);

        return this.mask(snapshotValue.slice(0, caretPosition)).length; // imleci eski konumuna
    }

    /** @inheritdoc */
    validate(value) {
        const noValue = isEmpty(value);

        if (this.required && noValue) return this.requiredValidationMessage;
        if (value?.length > 0 && value?.length < this.minlength) return this.minLengthValidationMessage;
        if (value?.length > this.maxlength) return this.maxLengthValidationMessage;
        if (!noValue && Number(value) > this.max) return this.maxValueValidationMessage;
        if (!noValue && Number(value) < this.min) return this.minValueValidationMessage;
        if (!this.#validatePattern(value)) return this.patternValidationMessage;

        return '';
    }

    /**
     * Validates the last character entered based on the allow-pattern regex.
     * This method is called during the keydown event to prevent invalid characters from being entered into the input field.
     *
     * Subclasses can override this method to provide custom validation logic for the last character entered.
     * @param {KeyboardEvent & { target: HTMLInputElement }} keyDownEvent The keyboard event triggered on the input element
     * @protected
     * @category internal hooks
     * @returns {boolean}
     */
    validateLastChar(keyDownEvent) {
        return this.#allowRegexPattern ? this.#allowRegexPattern.test(keyDownEvent.key) : true;
    }

    /**
     * Called when the `value` property or attribute of the component is updated.
     * Set the input element's value to the masked value, checks for completion and validity, and dispatches an 'update' event.
     *
     * Subclasses can override this method to react to value changes (e.g., for validation or side effects).
     * @category internal hooks
     * @override
     */
    valueUpdated() {
        if (this.inputElement?.value === this.maskedValue) return false;

        this.inputElement.value = this.maskedValue;
        this.#checkCompletion();
        this.#checkValidity(false);

        return true;
    }

    /** @override @protected */
    setupFirstInteraction() {
        // programatik atama etkiler mi native ile dene
        this.inputElement?.addEventListener('input', _e => this.dispatchCustomEvent('first-interaction'), { once: true });
    }

    // #endregion INTERNAL HOOKS

    // #region EVENT HANDLERS

    /**
     * If `autounmask` is enabled, handles the formdata event for the input element by setting the unmasked value.
     * @param {FormDataEvent} event - The formdata event triggered on the input element.
     */
    #handleFormData(event) {
        const inputName = this.inputElement?.name;

        if (!inputName || !this.autounmask) return;
        if (event.formData.get(inputName) === undefined) return;

        event.formData.set(inputName, this.unmaskedValue);
    }

    /**
     * Handles the blur event for the text box.
     * @param {Event} _e
     */
    #onBlur(_e) {
        this.#checkValidity(this.interacted);
    }

    /**
     * Handles the change event for the text box.
     * @param {Event & { target: HTMLInputElement }} event
     */
    #onChange(event) {
        event.stopPropagation();
        this.dispatchCustomEvent('change', event);
    }

    /**
     * Handles the input event for the text box.
     * @param {InputEvent & { target: HTMLInputElement }} event
     * @fires input - Dispatched when the input value changes, after processing the input and updating the value.
     * @fires complete - Dispatched when the input value is considered complete based on the defined constraints.
     */
    #onInput(event) {
        event.stopPropagation();
        this.#handleInput(event.target);
        this.#checkCompletion();
        this.#checkValidity(false);
        this.dispatchCustomEvent('input', event);
    }

    /**
     * Handles the invalid event for the text box.
     * @param {Event & { target: HTMLInputElement }} event
     */
    #onInvalid(event) {
        //event.preventDefault(); // mesaj baloncuğu çıkmaz
        this.#checkValidity(true);
    }

    /**
     * Handles the keydown event for the text box.
     * @param {KeyboardEvent & { target: HTMLInputElement }} event
     */
    #onKeydown(event) {
        if (event.isComposing) return;

        this.#lastKey = event.key;
        const keyCode = event.code;
        /** @type {string[]} */
        const allowedKeys = [Keys.BACKSPACE, Keys.TAB, Keys.ESCAPE, Keys.ENTER, Keys.DELETE, Keys.ARROW_LEFT, Keys.ARROW_RIGHT, Keys.HOME, Keys.END, Keys.PROCESS];

        // değer bir karakter değilse
        if (allowedKeys.includes(keyCode) || event.ctrlKey || event.altKey || event.metaKey) {
            return;
        }

        // Yeni karakter, değeri uyumsuz hale getiriyorsa engelle
        if (!this.validateLastChar(event)) {
            event.preventDefault();
        }
    }

    // #endregion EVENT HANDLERS

    // #region PRIVATE METHODS

    #checkCompletion() {
        const complete = this.isComplete();
        if (complete === this.#isComplete) return;
        if (complete && !this.#isComplete) {
            this.dispatchCustomEvent('complete');
        }

        this.#isComplete = complete;
    }

    #checkValidity(force = false) {
        const valueMissing = this.required && isEmpty(this.maskedValue) && isEmpty(this.unmaskedValue);
        const isDeleted = this.interacted && valueMissing; // blur olmadan yazıp sildi mi

        // invalid ise her inputta tekrar kontrol et
        if (!force && !this.invalid && !this.#isComplete && !isDeleted) return true;

        return this.checkValidity();
    }

    #createRegexPatterns() {
        this.#allowRegexPattern = this.allowPattern ? new RegExp(this.allowPattern) : null;
        this.#globalAllowRegexPattern = this.allowPattern ? new RegExp(this.allowPattern, 'g') : null;

        this.#regexPattern = this.pattern ? new RegExp(this.pattern) : null;
    }

    /**
     * Handles input processing by formatting the value, updating unmasked value, and setting the final value.
     * @param {HTMLInputElement} element - The input element to process
     */
    #handleInput(element) {
        const snapshotValue = element.value;
        const caret = element.selectionStart;
        this.#maskedValue = this.mask(snapshotValue); // saving the value!

        if (this.maskedValue !== snapshotValue) {
            const newCaretPosition = this.replaceCaret(caret, snapshotValue);
            element.value = this.maskedValue;
            element.setSelectionRange(newCaretPosition, newCaretPosition);
        }

        this.value = this.autounmask ? this.unmaskedValue : this.maskedValue;
    }

    #validatePattern(value) {
        if (isEmpty(value) || !this.#regexPattern) return true;
        if (this.#regexPattern.global) this.#regexPattern.lastIndex = 0;
        const m = this.#regexPattern.exec(value);

        return !!m && m.index === 0 && m[0].length === value.length;
    }

    // #endregion PRIVATE METHODS

    // #region RENDER HOOKS

    /**
     * Renders the adornment element for the input field. By default, it returns `nothing`, but can be overridden by subclasses to provide custom adornment rendering logic.
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
     * @override
     * @protected
     * @category rendering
     * @returns {import('lit').TemplateResult}
     */
    render() {
        return html`${this.renderLabel()}
            <div data-role="container">
                <input
                    ${spread(this.getScopedAttrs('input'))}
                    id=${this.fieldId}
                    name=${ifDefined(this.name)}
                    type=${this.type || 'text'}
                    ?disabled=${this.disabled}
                    ?readonly=${this.readonly}
                    aria-labelledby=${ifDefined(this.labelId)}
                    aria-label=${ifDefined(this.hideLabel ? this.label : undefined)}
                    aria-errormessage=${ifDefined(this.errorId)}
                    aria-required=${this.required ? 'true' : 'false'}
                    aria-invalid=${ifDefined(this.ariaInvalid)}
                    .placeholder=${this.placeholder}
                    autocomplete=${ifDefined(this.autocomplete)}
                    ?required=${this.required}
                    spellcheck=${ifDefined(this.spellcheck)}
                    inputmode=${ifDefined(this.inputmode)}
                    pattern=${this.pattern || nothing}
                    maxlength=${ifDefined(this.maxlength)}
                    minlength=${ifDefined(this.minlength)}
                    ?data-has-value=${this.value}
                    @input=${this.#onInput}
                    @change=${this.#onChange}
                    @keydown=${this.#onKeydown}
                    @blur=${this.#onBlur}
                    @invalid=${this.#onInvalid}
                />
                ${this.renderAdornment()} ${this.renderClearButton()}
            </div>
            ${this.renderErrorMessage()}`;
    }
    // #endregion RENDER HOOKS
}
