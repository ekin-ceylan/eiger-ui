import { html } from 'lit';
import { ifDefined } from '../../modules/utilities.js';
import SlotCollectorMixin from '../../mixins/slot-collector-mixin.js';
import InputBase from '../../base/input-base.js';
import { mixins } from '../../modules/mixin-utils.js';

export default class CheckBox extends mixins(InputBase, SlotCollectorMixin) {
    static get properties() {
        return {
            ...super.properties,
            checked: { type: Boolean },
            checkedValue: { type: String, attribute: 'checked-value' },
            uncheckedValue: { type: String, attribute: 'unchecked-value' },
            indeterminate: { type: Boolean, reflect: true },
        };
    }

    get descriptionId() {
        return `${this.componentName}-description-${this.uniqueId}`;
    }

    /**
     *
     * @param {InputEvent} e
     */
    onInput(e) {
        const input = /** @type {HTMLInputElement} */ (e.target);
        this.value = input.checked ? this.checkedValue : this.uncheckedValue;
        this.#checkValidity();
    }

    /**
     * @param {MouseEvent} e
     */
    onClick(e) {
        if (this.readonly) {
            e.preventDefault();
            e.stopImmediatePropagation();
        }
    }

    #checkValidity() {
        const el = this.inputElement;
        const v = el.validity;

        el.setCustomValidity('');
        this.invalid = !v?.valid;
        this.validationMessage = v?.valueMissing ? this.requiredValidationMessage : '';
        el.setCustomValidity(this.validationMessage);
    }

    #syncIndeterminate() {
        if (this.inputElement) {
            this.inputElement.indeterminate = !!this.indeterminate;
        }
    }

    firstUpdated(changed) {
        super.firstUpdated(changed);
        this.inputElement = this.renderRoot.querySelector('input');
        this.#syncIndeterminate();
    }

    updated(changed) {
        super.updated(changed);

        if (changed.has('indeterminate')) {
            this.#syncIndeterminate();
        }
    }

    /** @override @protected @returns {import('lit').TemplateResult} */
    render() {
        return html`
            <label id=${this.labelId} for=${this.fieldId}>
                <input
                    id=${this.fieldId}
                    name=${ifDefined(this.name)}
                    type="checkbox"
                    value=${ifDefined(this.checkedValue)}
                    ?checked=${ifDefined(this.checked)}
                    aria-describedby=${this.descriptionId}
                    aria-errormessage=${ifDefined(this.errorId)}
                    aria-required=${this.required ? 'true' : 'false'}
                    aria-invalid=${ifDefined(this.ariaInvalid)}
                    ?aria-readonly=${this.readonly}
                    ?required=${this.required}
                    ?disabled=${this.disabled}
                    @input=${this.onInput}
                    @click=${this.onClick}
                    @invalid=${this.#checkValidity}
                />
                <span id=${this.descriptionId}><slot></slot></span>
            </label>
            ${this.renderErrorMessage()}
        `;
    }

    constructor() {
        super();
        this.value = null;
        this.required = false;

        /** @type {boolean} */
        this.checked = undefined;

        /** @type {boolean} */
        this.indeterminate = false;

        /** @type {string|boolean|number} */
        this.checkedValue = 'on';

        /** @type {string|boolean|number} */
        this.uncheckedValue = null;
    }
}
