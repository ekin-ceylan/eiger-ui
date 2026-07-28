import { html, nothing } from 'lit';
import { findLastBy, ifDefined, isEmpty } from '../../modules/utilities.js';
import { spread } from '../../modules/spread.js';
import Option from '../../models/Option.js';
import OptionGroup from '../../models/OptionGroup.js';
import CustomOption from './custom-option.js';
import CustomOptgroup from './custom-optgroup.js';
import OptionsControlBase from '../../base/options-control-base.js';
import Keys from '../../enums/Keys.js';

export default class SelectBox extends OptionsControlBase {
    // #region STATICS, FIELDS, GETTERS

    #cachedInput = undefined;
    #mouseFlag = false;

    /** @type {(Option | OptionGroup)[]} */
    #optionList = []; // işlenmiş seçenek listesi
    /** @type {(Object | string)[]} */
    #options = [];

    get options() {
        if (this.#options?.length) return [...this.#options];
        return this.#optionList?.length ? [...this.#optionList] : [];
    }
    set options(val) {
        if (!Array.isArray(val)) throw new TypeError('options must be an array');

        const oldValue = this.#options;
        this.#options = val;
        
        const list = val.map(o => this.#toOptionElement(o));
this.#optionList = list.filter(o => o instanceof OptionGroup || !isEmpty(o.value));
        const first = list[0];

        if (first instanceof Option && !this.placeholder && isEmpty(first.value)) {
            this.placeholder = first.displayText;
        }

        this.requestUpdate('options', oldValue);
        this.#syncValueAfterOptionsChange();
    }

    /**
     * Returns the currently selected option object from the options array based on the current value of the control.
     * If no matching option is found, it returns null.
     * @returns {object|string|null}
     */
    get selectedOption() {
        if (isEmpty(this.value)) return null;

        if (this.#options?.length) {
            return this.#options.find(o => o.value === this.value || o === this.value) || null;
        }

        const selectedOption = this.#optionList.find(o => o.value === this.value);

        if (selectedOption instanceof OptionGroup) {
            const option = selectedOption.options.find(o => o.value === this.value);
            return option ? { value: option.value, label: option.displayText } : null;
        }

        return selectedOption ? { value: selectedOption.value, label: selectedOption.displayText } : null;
    }

    /**
     * Returns the index of the currently selected option in the options list. If no option is selected, it returns -1.
     * @returns {number}
     */
    get selectedIndex() {
        return this.inputElement?.selectedIndex ?? -1;
    }

    /**
     * Checks if the select box has any options available.
     * @returns {boolean}
     */
    get hasOptions() {
        return this.#optionList?.length > 0;
    }

    /**
     * Checks if the current value of the select box is present in the list of available options.
     * @returns {boolean}
     */
    get hasValue() {
        return this.#valueList.includes(this.value);
    }

    get #valueList() {
        return this.#optionList.flatMap(o => (o instanceof Option ? o.value : [...o.options.map(opt => opt.value)]));
    }

    get resetValue() {
        const selectedValue = findLastBy(this.#optionList, o => o.selected)?.value ?? '';
        return selectedValue || this.getAttribute('value') || '';
    }

    /**
     * Returns the reference to the native input element within the component. Caches the reference after the first query for performance optimization.
     * @returns {HTMLSelectElement | null}
     */
    get inputElement() {
        if (this.#cachedInput === undefined) {
            this.#cachedInput = this.renderRoot?.querySelector('select');
        }

        return this.#cachedInput;
    }

    // #endregion STATICS, FIELDS, GETTERS

    willUpdate(changing) {
        if (changing.has('value') && this.hasOptions && !this.hasValue) {
            this.value = '';
        }
    }

    // #region INTERNAL HOOKS

    /** @inheritdoc */
    validateNode(node, slotName) {
        if (slotName != 'default') return true;

        const hasOptions = this.#options?.length > 0;

        if (hasOptions) {
            console.warn('Options are already set via property. Ignoring slotted nodes.');
            return false;
        }

        const isOptionElement = node instanceof HTMLOptionElement || node instanceof CustomOption;
        const isOptGroupElement = node instanceof HTMLOptGroupElement || node instanceof CustomOptgroup;
        const isAllowedType = isOptionElement || isOptGroupElement;

        if (!isAllowedType) {
            console.error(`Only <option> and <optgroup> elements are allowed as children of ${this.tagName.toLowerCase()}.`);
            return false;
        }

        const option = isOptionElement ? new Option(node) : new OptionGroup(node);

        if (isOptionElement && isEmpty(option.value)) {
if (isEmpty(this.placeholder)) {
            this.placeholder = /** @type {Option} */ (option).displayText;
            }
        } else {
            this.#optionList.push(option);
        }

        if (option.selected) this.value = option.value;

        return false;
    }

    /** @inheritdoc */
    afterSlotsBinded(hasProjectedContent) {
        if (hasProjectedContent) {
            this.requestUpdate();
this.#syncValueAfterOptionsChange();
}
    }

    /** @override @protected */
    setupFirstInteraction() {
        // programatik atama etkiler mi native ile dene
        this.addEventListener('open', _e => this.dispatchCustomEvent('first-interaction'), { once: true });
    }

    valueUpdated() {
                if (this.inputElement?.value === this.value) return false;
        else if (!this.hasOptions) return true;

        this.inputElement.value = this.value;
        this.#checkValidity();

        return true;
    }

    // #endregion INTERNAL HOOKS

    // #region EVENT LISTENERS
    #onInput(e) {
        e.stopPropagation();
        this.value = e.target.value;
        this.dispatchCustomEvent('input', e);
    }

    #onChange(e) {
        e.stopPropagation();
        this.value = e.target.value;
        this.#setOpen(false);
        this.#checkValidity();
        this.dispatchCustomEvent('change', e);
    }

    #onBlur(_e) {
        this.#setOpen(false);
        this.#checkValidity();
    }

    /**
     * Handles mouseup events on the select box. Closes the dropdown if the mouseup event occurs on an option element or if the mouse flag is not set.
     * @param {MouseEvent} e
     */
    #onMouseup(e) {
        if (e.target instanceof HTMLOptionElement || !this.#mouseFlag) {
            this.#setOpen(false);
        }

        this.#mouseFlag = false;
    }

    #onMousedown(_e) {
        this.#mouseFlag = true;
        this.#setOpen(!this.open);
    }

    /**
     * Handles keydown events on the select box.
     * @param {KeyboardEvent} e
     */
    #onKeydown(e) {
        if (e.code === Keys.SPACE || e.code === Keys.ENTER) {
            this.#setOpen(true);
        }
    }

    /**
     * Handles keyup events on the select box. Closes the dropdown when Escape, Tab, or Enter keys are released.
     * @param {KeyboardEvent} e
     */
    #onKeyup(e) {
        // chrome'da bug var.  console.log('keyup', e.code);
        if (e.code === Keys.ESCAPE || e.code === Keys.TAB || e.code === Keys.ENTER) {
            this.#setOpen(false);
        }
    }

    #onInvalid(_e) {
        // e.preventDefault(); // mesaj baloncuğu çıkmaz
        this.#checkValidity(true);
    }

    /**
     * @event input Dispatched when the value of the select box changes due to user input.
     * @event change Dispatched when the value of the select box changes and the user commits the change (e.g., by selecting an option).
     * @override
     * @protected
     */
    onClearClick(event) {
        super.onClearClick(event);
        this.dispatchCustomEvent('input');
        this.dispatchCustomEvent('change');
        this.#checkValidity(true);
    }

    // #endregion EVENT LISTENERS

    // #region PRIVATE METHODS

    /** @param {boolean} open */
    #setOpen(open) {
        if (open && !this.open) this.dispatchCustomEvent('open');
        else if (!open && this.open) this.dispatchCustomEvent('close');
        this.open = open;
    }
    #syncValueAfterOptionsChange() {
        const selected = findLastBy(this.#optionList, o => o.selected);

        if (selected) {
            this.value = selected.value;
        } else if (this.#valueList.includes(this.value)) {
            this.updateComplete.then(() => (this.inputElement.value = this.value));
        } else {
            this.value = '';
            this.inputElement.value = this.value;
        }
    }

    #checkValidity(force = false) {
        if (!this.interacted && !force) return true;
        return this.checkValidity();
    }

    #toOptionElement(raw) {
        if (raw instanceof Option || raw instanceof OptionGroup) return raw;
        if (raw instanceof HTMLOptionElement || raw instanceof CustomOption) return new Option(raw);
        if (raw instanceof HTMLOptGroupElement || raw instanceof CustomOptgroup) return new OptionGroup(raw);

        if (typeof raw === 'string' || typeof raw === 'number') {
            return new Option({ value: String(raw) });
        }

        if (raw && typeof raw === 'object') {
            return this.#isGroupLike(raw) ? new OptionGroup(raw) : new Option(raw);
        }

        throw new TypeError(`Invalid option entry: ${String(raw)}`);
    }

    #isGroupLike(object) {
        const optionsValue = object.options;
        const childrenValue = object.children;
        const hasArrayOptions = Array.isArray(optionsValue);
        const hasArrayChildren = Array.isArray(childrenValue);
        const hasCollectionChildren =
            (typeof HTMLCollection !== 'undefined' && childrenValue instanceof HTMLCollection) ||
            (typeof HTMLOptionsCollection !== 'undefined' && childrenValue instanceof HTMLOptionsCollection) ||
            (typeof NodeList !== 'undefined' && childrenValue instanceof NodeList);

        return hasArrayOptions || hasArrayChildren || hasCollectionChildren;
    }

    // #endregion PRIVATE METHODS

    /** @override */
    renderNoOptions() {
        const isHidden = this.hasOptions || !this.noOptionsLabel;
        return isHidden ? nothing : html`<option disabled>${this.noOptionsLabel}</option>`;
    }

    /** @override @protected @returns {import('lit').TemplateResult} */
    render() {
        return html`${this.renderLabel()}
            <div>
                <select
                    ${spread(this.getScopedAttrs('select'))}
                    id=${this.fieldId}
                    name=${ifDefined(this.name)}
                    ?required=${this.required}
                    ?disabled=${this.disabled}
                    aria-labelledby=${ifDefined(this.labelId)}
                    aria-label=${ifDefined(this.hideLabel ? this.label : undefined)}
                    aria-errormessage=${ifDefined(this.required ? this.errorId : undefined)}
                    aria-required=${this.required ? 'true' : 'false'}
                    aria-invalid=${ifDefined(this.ariaInvalid)}
                    @input=${this.#onInput}
                    @change=${this.#onChange}
                    @mousedown=${this.#onMousedown}
                    @mouseup=${this.#onMouseup}
                    @keydown=${this.#onKeydown}
                    @keyup=${this.#onKeyup}
                    @blur=${this.#onBlur}
                    @invalid=${this.#onInvalid}
                    ?data-has-value=${this.hasValue}
                    ?data-open=${this.open}
                >
                    <option value="" disabled selected hidden>${this.placeholder}</option>
                    ${this.renderNoOptions()} ${this.#optionList.map(option => option.htmlElement)}
                </select>

                ${this.renderClearButton()} ${this.renderIndicator()}
            </div>
            ${this.renderErrorMessage()}`;
    }
}
