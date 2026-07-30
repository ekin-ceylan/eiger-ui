import { html, nothing } from 'lit';
import PropValidatorMixin from '../mixins/prop-validator-mixin.js';
import UniqueIdGeneratorMixin from '../mixins/unique-id-generator-mixin.js';
import { lightMixins } from '../modules/mixin-utils.js';
import { ifDefined } from '../modules/utilities.js';

/**
 * Base class for form control components providing common functionality for form inputs and selects.
 *
 * IMPLEMENTATION REQUIREMENTS:
 * * `get inputElement()`: MUST be overridden to return the native DOM element (e.g., using `@query('input')`).
 * * `setupFirstInteraction()`: MUST be overridden to define how the component detects user interaction and dispatches the 'first-interaction' event.
 * * `label`: The `label` property is inherently required by this base class and must be provided by the consumer.
 * @abstract Not intended to be used directly in component definitions (for example, with customElements.define). Extend this class to create concrete components.
 * @mixes PropValidatorMixin - Provides required and warning field validation logic. Components can specify required fields that must be set and warning fields that trigger console warnings when empty.
 * @mixes UniqueIdGeneratorMixin - Provides a unique ID generator for creating stable, minify-safe component identifiers.
 */
export default class FormControlBase extends lightMixins(PropValidatorMixin, UniqueIdGeneratorMixin) {
    // #region STATICS, FIELDS, GETTERS

    /** @type {import('lit').PropertyDeclarations} */
    static get properties() {
        return {
            ...super.properties,
            name: { type: String },
            value: { type: String },
            label: { type: String },
            ariaInvalid: { type: String, attribute: false, reflect: false },
            required: { type: Boolean, reflect: true },
            disabled: { type: Boolean, reflect: true },
            readonly: { type: Boolean, reflect: true },
        };
    }

    #interacted = false;
    /** @type {string | null } */
    validationMessage = '';

    /**
     * This is used to reset the form control to its initial state when the form is reset.
     * Subclasses can override this getter to provide a different reset value if needed.
     * @returns {string}
     */
    get resetValue() {
        return this.getAttribute('value') || '';
    }

    /**
     * Represents the native form control element (e.g., input, select) within the component.
     *
     * MUST be overridden by subclasses to provide a reference to the native form control element (e.g., input, select).
     * This is required for value synchronization and native form validation to work correctly.
     *
     * Recommendation: Override with a getter that queries the shadow root directly (e.g., `get inputElement() { return this.renderRoot?.querySelector('input'); }`)
     * @abstract
     * @returns {HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null}
     */
    get inputElement() {
        throw new Error(`[${this.componentName}]: 'inputElement' getter MUST be overridden. Subclasses must provide a reference to the native DOM element.`);
    }

    /**
     * Indicates whether the input has been interacted with by the user.
     * This can be used to determine when to show validation messages (e.g., only after the user has interacted with the input).
     * @returns {boolean}
     */
    get interacted() {
        return this.#interacted;
    }

    /**
     * Convenience boolean API for generic "invalid" state. `true` maps to `ariaInvalid='true'`, `false` clears `ariaInvalid`.
     *
     * Note: grammar/spelling should be set via ariaInvalid directly.
     * @returns {boolean}
     */
    get invalid() {
        return this.ariaInvalid === 'true' || this.ariaInvalid === 'grammar' || this.ariaInvalid === 'spelling';
    }
    set invalid(value) {
        this.ariaInvalid = value ? 'true' : undefined;
    }

    /**
     * Returns the unique ID for the form control element.
     * @returns {string}
     */
    get fieldId() {
        return `${this.componentName}-${this.uniqueId}`;
    }
    /**
     * Returns the unique ID for the label element.
     * @returns {string}
     */
    get labelId() {
        return `${this.componentName}-label-${this.uniqueId}`;
    }
    /**
     * Returns the unique ID for the error message element.
     * @returns {string | null}
     */
    get errorId() {
        return this.validationMessage ? `${this.componentName}-error-${this.uniqueId}` : null;
    }

    /**
     * Validation message to show when a required field is empty. By default, it uses a localized message based on the component's label.
     * Subclasses can override this getter to provide a custom message.
     * @returns {string}
     */
    get requiredValidationMessage() {
        return this.localeMessages.required(this.label);
    }

    get requiredFields() {
        return [...super.requiredFields, 'label'];
    }

    // #endregion STATICS, FIELDS, GETTERS

    // #region LIFECYCLE HOOKS
    constructor() {
        super();

        /** The name attribute of the form control. @type {string} */
        this.name = '';
        /** The label associated with the form control. @type {string} */
        this.label = '';
        /** The current value of the form control. @type {string} */
        this.value = '';
        /**
         * ARIA invalid state passed to the underlying control.
         *
         * Use `'true'` for generic validation errors, or `'grammar'`/`'spelling'` for language-specific issues. Keep undefined to omit the `aria-invalid` attribute.
         * @type {'true' | 'grammar' | 'spelling' | undefined}
         */
        this.ariaInvalid = undefined;
        /** Whether the form control is required. @type {boolean} */
        this.required = false;
        /** Whether the form control is disabled. @type {boolean} */
        this.disabled = false;
        /** Whether the form control is read-only. @type {boolean} */
        this.readonly = false;
    }

    /**
     * @param {import('lit').PropertyValues} changedProperties Map of changed properties with old values
     * @protected
     * @override
     * - Calls `super.firstUpdated()` to ensure proper Lit lifecycle.
     * - Sets up a listener for the form's `reset` event to reset the component's value and validation state.
     * - Calls `setupFirstInteraction()` to set up the mechanism for detecting the user's first interaction with the component.
     */
    firstUpdated(changedProperties) {
        super.firstUpdated(changedProperties);
        this.addEventListener('first-interaction', e => {
            e.stopPropagation();
            this.#interacted = true;
        });
        this.inputElement?.form?.addEventListener('reset', this.#onFormReset.bind(this));
        this.setupFirstInteraction();
    }

    /**
     * @param {import('lit').PropertyValues} changedProperties Map of changed properties with old values
     * @protected
     * @override
     * - Calls `super.updated()` to ensure proper Lit lifecycle.
     * - Synchronizes the `value` property with the native input element's value when it changes.
     */
    updated(changedProperties) {
        super.updated(changedProperties);

        if (changedProperties.has('value') && this.valueUpdated()) {
            this.dispatchCustomEvent('update');
        }
    }

    // #endregion LIFECYCLE HOOKS

    // #region INTERNAL HOOKS

    /**
     * Sets up a mechanism to detect the user's first interaction with the component and dispatches a `first-interaction` custom event.
     *
     * ```js
     * this.inputElement?.addEventListener('input', _e => this.dispatchCustomEvent('first-interaction'), { once: true });
     * ```
     *
     * Subclasses MUST override this method to provide the logic for detecting the first user interaction with the component.
     * This is necessary for proper validation behavior, as the component should only show validation messages after the user has interacted with it.
     * @category internal hooks
     * @abstract
     * @protected
     */
    setupFirstInteraction() {
        throw new Error(`[${this.componentName}]: 'setupFirstInteraction' function MUST be overridden. Subclasses must provide the logic to detect the first user interaction.`);
    }

    /**
     * Called when the `value` property or attribute of the component is updated.
     * Sets the native input element's value to match the component's `value` property.
     * Returns `true` if the value was updated, `false` if the native input element's value already matched the component's `value`.
     *
     * Subclasses can override this method to react to value changes (e.g., for validation or side effects).
     * @category internal hooks
     * @protected
     * @returns {boolean}
     */
    valueUpdated() {
        if (this.inputElement?.value === this.value) return false;

        this.inputElement.value = /** @type {string} */ (this.value);
        return true;
    }

    // #endregion INTERNAL HOOKS

    // #region PUBLIC API

    /**
     * Clears the input value.
     * @category public api
     */
    clear() {
        this.value = '';
    }

    /**
     * Clears the validation message and resets the `invalid` state.
     * @category public api
     */
    clearValidation() {
        this.validationMessage = '';
        this.invalid = false;
        this.inputElement?.setCustomValidity(this.validationMessage);
    }

    /**
     * Resets the input value to its initial state, clears any validation messages, and resets the `interacted` state.
     * @category public api
     */
    reset() {
        const currentValue = this.value;

        if (currentValue !== this.resetValue) {
        this.value = this.resetValue;
            this.requestUpdate('value', currentValue);
        }

        this.clearValidation();
        this.#interacted = false;
        this.setupFirstInteraction();
    }

    /**
     * Validates the input value. Updates the Validation Message and `invalid` state based on the validation result, and dispatches a `validate` custom event with the validation message.
     * @fires validate - Dispatched after validation is performed, with the `validationMessage` in the event detail.
     * @category public api
     * @returns {boolean}
     */
    checkValidity() {
        this.validationMessage = this.validate(this.value);
        this.#applyValidationResult(this.validationMessage);

        return !this.validationMessage;
    }

    // #endregion PUBLIC API

    // #region INTERNAL HOOKS

    /**
     * Validates the given value and returns a validation message if invalid.
     * Subclasses can override this method to provide custom validation logic.
     * @param {string} value - The value to validate. `UnmaskedValue` if `autounmask` is enabled, otherwise the `maskedValue`.
     * @protected
     * @category internal hooks
     * @returns {string}
     */
    validate(value) {
        const v = this.inputElement.validity;
        if (v?.valueMissing) return this.requiredValidationMessage;
        return '';
    }

    // #endregion INTERNAL HOOKS

    /**
     * Handles the form reset event by resetting the input value to its initial state and clearing any validation messages.
     * @param {Event} event
     */
    #onFormReset(event) {
        requestAnimationFrame(this.reset.bind(this));
    }

    /**
     * Applies the validation result by setting the `validationMessage`, updating the `invalid` state, and dispatching a `validate` custom event with the validation message.
     * @fires validate - Dispatched after applying the validation result, with the `validationMessage` in the event detail.
     * @param {string} validationMessage
     */
    #applyValidationResult(validationMessage) {
        // this.inputElement.setCustomValidity('');
        this.invalid = !!validationMessage;
        this.inputElement.setCustomValidity(validationMessage || '');
        // this.requestUpdate('validationMessage');
        this.dispatchCustomEvent('validate', null, { validationMessage });
    }

    // #region RENDER HOOKS
    /**
     * Returns the HTML template for displaying validation error messages.
     * The span element includes ARIA attributes for accessibility and is hidden when no validation message exists.
     * @protected
     * @returns {import('lit').TemplateResult | typeof nothing}
     */
    renderErrorMessage() {
        if (!this.validationMessage) return nothing;
        return html`<span id=${ifDefined(this.errorId)} data-role="error-message" aria-live="assertive">${this.validationMessage}</span>`;
    }

    // #endregion RENDER HOOKS
}
