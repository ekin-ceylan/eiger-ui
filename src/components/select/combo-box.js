import { html } from 'lit';
import { ifDefined } from '../../modules/utilities.js';
import SelectBase from '../../base/select-base.js';
import { lockAllScrolls, unlockAllScrolls } from '../../modules/scroll-lock-helper.js';
import ComboOption from '../../models/ComboOption.js';
import CustomOption from './custom-option.js';

/**
 * Custom combo box component that extends SelectBase to provide a searchable dropdown list of options. It supports both native and custom behaviors, allowing for flexible usage in various contexts.
 * - Can be used after defining like `defineElement('combo-box', ComboBox)` or `customElement.define('combo-box', ComboBox)`.
 * - The `options` property accepts an array of option objects or HTMLOptionElements to populate the dropdown list.
 * - The `value` property reflects the currently selected option's value, and the `selectedOption` property provides the full option object.
 * - The component includes built-in filtering functionality, allowing users to search through options by typing in the input field.
 * @extends {SelectBase<HTMLInputElement>}
 */
export default class ComboBox extends SelectBase {
    // #region STATICS, FIELDS, GETTERS

    static get properties() {
        return {
            ...super.properties,
            selectedOption: { type: Object, state: true, attribute: false }, // internal
            filter: { type: String, state: false }, // Filtre metni
            nativeBehavior: { type: Boolean, attribute: 'native-behavior' }, // native select gibi davranır
            activeIndex: { type: Number, state: true, attribute: false },
            directionUp: { type: Boolean, attribute: false, reflect: false }, // açılır kutu yönü
        };
    }

    /** @type {ComboOption[]} */
    #optionList = [];
    /** @type {ComboOption | null} */
    #selectedOption = null;
    /** @type {Array<object|string>} */
    #options = [];

    #focused = false; // Inputun odaklanıp odaklanmadığını takip eder

    get focused() {
        return this.#focused;
    }

    get filteredOptions() {
        if (!this.filter) {
            return this.#optionList;
        }

        return this.#optionList?.filter(opt => {
            const searchValue = this.filter?.toLowerCase() || '';
            const optionText = opt.label.toLowerCase();

            return optionText.includes(searchValue);
        });
    }

    get options() {
        return this.#options;
    }
    set options(val) {
        if (!Array.isArray(val)) {
            throw new TypeError('options must be an array');
        }

        this.#options = val;
        this.#optionList = this.options.map(o => {
            const opt = this.#toListElement(o);
            if (opt.selected) this.#onSelect(opt);

            return opt;
        });

        this.requestUpdate();
        if (this.isOpen) this.#calcListSizeAndDirection();
    }

    get searchId() {
        return `${this.componentName}-search-${this.uniqueId}`;
    }

    // #endregion STATICS, FIELDS, GETTERS

    constructor() {
        super();

        /**
         * Stores the currently selected option info, which includes both the value and label. This property is updated whenever a new option is selected, providing easy access to the full details of the selected option for use in event handlers or other logic.
         * @type {{ value: string, label: string } | null}
         */
        this.selectedOption = null;
        /** @type {Object|string[]} */
        this.options = [];
        /** @type {string} */
        this.filter = '';
        /** @type {Boolean} */
        this.nativeBehavior = false;

        this.activeIndex = -1;
    }

    // #region LIFECYCLE METHODS
    firstUpdated() {
        this.inputElement = this.renderRoot.querySelector('input[data-role="value"]');
        this.searchElement = /** @type {HTMLInputElement} */ (this.renderRoot.querySelector('input[data-role="search"]'));
        this.displayElement = /** @type {HTMLDivElement} */ (this.renderRoot.querySelector('div[data-role="display"]'));
        this.comboboxDiv = /** @type {HTMLDivElement} */ (this.renderRoot.querySelector('div[role="combobox"]'));
        this.listboxDiv = /** @type {HTMLDivElement} */ (this.renderRoot.querySelector('div[role="listbox"]'));
        this.clearButton = /** @type {HTMLButtonElement} */ (this.renderRoot.querySelector('button[data-role="clear"]'));

        this.#setInputAndDisplay(this.#selectedOption);
        this.searchElement.addEventListener('focus', () => (this.#focused = true), { once: true, capture: false });

        if (globalThis.getComputedStyle(this.listboxDiv).overscrollBehavior != 'contain') {
            this.listboxDiv.style.overscrollBehavior = 'contain';
        }
    }

    updated(changed) {
        if (changed.has('value') && this.inputElement?.value !== this.value) {
            const matchedOption = this.#optionList.find(o => o.value === this.value) || null;
            this.#onSelect(matchedOption);
            this.#checkValidity();
            this.dispatchCustomEvent('update');
        }
    }

    disconnectedCallback() {
        super.disconnectedCallback();

        if (this.isOpen) {
            this.#unlockBody();
        }
    }

    // #endregion LIFECYCLE METHODS

    /** @inheritdoc */
    validateNode(node, slotName) {
        if (slotName != 'default') return true;

        const hasOptions = this.options?.length > 0;
        const isAllowedType = node instanceof HTMLOptionElement || node instanceof CustomOption;

        if (hasOptions) {
            console.warn('Options are already set via property. Ignoring slotted nodes.');
            return false;
        }

        if (!isAllowedType) {
            console.error(`Only \`HTMLOptionElement\` and \`CustomOption\` are allowed as children of \`${this.tagName.toLowerCase()}\`.`);
            return false;
        }

        const option = this.#parseOption(node);
                this.#optionList.push(option);
        if (option.selected) this.#onSelect(option, false);

        return false; // abort default slotting process
    }

    // #region EVENT LISTENERS

    /**
     * Handles focus out event to close the list.
     * @param {FocusEvent} e
     */
    onFocusOut(e) {
        const rt = e.relatedTarget;
        const isNode = rt instanceof Node || rt instanceof Element;

        if (isNode && this.contains(rt)) return;

        this.#closeList();
    }

    onFocusSearch(_e) {
        this.#openList();
    }

    onFocusValue(e) {
        e.target.parentElement.focus();
    }

    onInputSearch(e) {
        e.stopPropagation();
        this.dispatchCustomEvent('search', e);
        this.filter = e.target.value;
        this.activeIndex = 0;
        this.#scrollToActive();
    }

    onKeydown(e) {
        if (e.target === this.clearButton) return;
        const key = e.key;

        if (key === 'Escape') {
            this.#closeList();
            this.comboboxDiv.focus();
        } else if (!this.isOpen) {
            this.#closedKeyboardBehavior(e, key);
        } else if (this.isOpen) {
            this.#openKeyboardBehavior(e, key);
        }

        // yazmaya başladığımızda arama yapılır
    }

    onClick(e) {
        if (!this.isOpen && !e.target.closest('[role="listbox"]')) {
            this.#openList();
            this.searchElement.focus();
        }
    }

    /** @override Clears the current selection. */
    onClearClick(event) {
        super.onClearClick(event);
        this.#onSelect(null);
        this.comboboxDiv.focus();
    }

    onInvalid(_e) {
        // e.preventDefault(); // mesaj baloncuğu çıkmaz
        this.#checkValidity(true);
    }

    onOptionClick(option) {
        this.#onSelect(option);
        this.#closeList();
    }

    onListboxClick(e) {
        const optionId = this.#getOptionIdFromEvent(e);
        const option = this.filteredOptions.find(opt => opt.id === optionId);
        if (!option || option.disabled) return;

        this.onOptionClick(option);
    }

    onListboxMouseover(e) {
        const optionId = this.#getOptionIdFromEvent(e);
        const index = this.filteredOptions.findIndex(opt => opt.id === optionId);
        if (index < 0) return;

        this.activeIndex = index;
    }

    // #endregion EVENT LISTENERS

    // #region PRIVATE METHODS
    /**
     * Handles option selection.
     * @param {ComboOption} selectedOption
     */
    #onSelect(selectedOption) {
        if (this.#selectedOption === selectedOption) return;
        if (this.#selectedOption) this.#selectedOption.selected = false;
        this.#selectedOption = selectedOption;

        if (this.#selectedOption) this.#selectedOption.selected = true;
        this.selectedOption = { value: selectedOption?.value, label: selectedOption?.displayText };
        this.#setInputAndDisplay(selectedOption);
        this.value = selectedOption?.value || null;
        this.dispatchCustomEvent('input');
        this.dispatchCustomEvent('change');
    }

    /**
     * Sets the input value and display content based on the selected option.
     * @param {ComboOption} selectedOption
     */
    #setInputAndDisplay(selectedOption) {
        if (!this.inputElement || !this.displayElement) return;

        this.inputElement.value = selectedOption?.value || '';
        this.displayElement.innerHTML = selectedOption?.displayContent || this.placeholder;
    }

    /**
     * Checks the validity of the input and updates the validation message accordingly.
     * @param {boolean} force
     * @returns {boolean}
     */
    #checkValidity(force = false) {
        if (!this.focused && !force) return true; // etkileşime girilmediyse

        const el = this.inputElement;
        const v = el.validity;

        el.setCustomValidity('');
        this.invalid = !v?.valid;
        this.validationMessage = v?.valueMissing ? this.requiredValidationMessage : '';
        el.setCustomValidity(this.validationMessage);
        this.dispatchCustomEvent('validate', null, { validationMessage: this.validationMessage });

        return !this.validationMessage;
    }

    #openKeyboardBehavior(e, key) {
        const isArrowKey = key === 'ArrowDown' || key === 'ArrowUp';

        if (isArrowKey) {
            e.preventDefault();
            this.activeIndex = this.#getAdjacentIndex(key === 'ArrowDown');
            this.#scrollToActive();
        } else if (key === 'Tab' || key === 'Enter') {
            e.preventDefault();

            if (!this.nativeBehavior && key === 'Enter') {
                this.#selectActiveOption();
            }

            this.#closeList();
            this.comboboxDiv.focus();
        }
    }

    #closedKeyboardBehavior(e, key) {
        const isArrowKey = key === 'ArrowDown' || key === 'ArrowUp';

        // Seçim yap
        if (this.nativeBehavior && isArrowKey) {
            e.preventDefault();
            const [option, idx] = this.#getAdjacentOption(key === 'ArrowDown');

            if (option) {
                this.activeIndex = idx;
                this.#onSelect(option);
            }
        } else if (key === ' ' || key === 'Enter') {
            e.preventDefault();
            this.#openList();
            this.searchElement.focus();
        }
    }

    #selectActiveOption() {
        const option = this.filteredOptions[this.activeIndex];
        if (option) this.#onSelect(option);
    }

    /**
     * Gets the adjacent option based on the current selection.
     * @param {Boolean} next
     * @returns {[ComboOption|null, number]} The adjacent option and its index.
     */
    #getAdjacentOption(next) {
        const direction = next ? 1 : -1;
        let idx = this.filteredOptions.indexOf(this.#selectedOption) + direction;
        while (this.filteredOptions[idx]?.disabled) idx += direction;
        const option = this.filteredOptions[idx] || null;

        return [option, idx];
    }

    /**
     * Gets the adjacent index based on the current active index.
     * @param {Boolean} next
     * @returns {number} The adjacent index.
     */
    #getAdjacentIndex(next) {
        const direction = next ? 1 : -1;
        let idx = this.activeIndex + direction;
        while (this.filteredOptions[idx]?.disabled) idx += direction;

        return this.filteredOptions[idx] ? idx : this.activeIndex;
    }

    #scrollToActive(instant = false) {
        requestAnimationFrame(() => {
            const listbox = this.renderRoot.querySelector('div[role="listbox"]');
            const option =
                this.renderRoot.querySelector('div[role="listbox"] div[role="option"][data-active]') ||
                this.renderRoot.querySelector('div[role="listbox"] div:nth-child(1 of [role="option"])');

            if (!option || !listbox) return;

            const optionRect = option.getBoundingClientRect();
            const listRect = listbox.getBoundingClientRect();
            const offset = optionRect.top - listRect.top;
            const scroll = listbox.scrollTop + (offset - listRect.height / 2 + optionRect.height / 2);
            listbox.scrollTo({ top: scroll, behavior: instant ? 'auto' : 'smooth' });
        });
    }

    #openList() {
        if (this.isOpen) return;
        this.isOpen = true;
        this.listboxDiv?.showPopover();
        this.#lockBody();
        this.#calcListSizeAndDirection();
        this.dispatchCustomEvent('open');
        this.activeIndex = this.filteredOptions.indexOf(this.#selectedOption);
        this.#scrollToActive(true);
    }

    #closeList() {
        if (this.nativeBehavior) this.#selectActiveOption();
        this.isOpen = false;
        this.listboxDiv?.hidePopover();
        this.#unlockBody();
        this.searchElement.blur();
        this.filter = '';
        this.activeIndex = -1;
        this.#checkValidity();
        this.dispatchCustomEvent('close');
    }

    #lockBody() {
        lockAllScrolls(this.listboxDiv);
        globalThis.addEventListener('scroll', this.#onGlobalScroll, { capture: true, passive: true });
        globalThis.addEventListener('pointerdown', this.#onPointerDownOutside, { capture: true });
        globalThis.addEventListener('resize', this.#onResize, { passive: true });
    }

    #unlockBody() {
        unlockAllScrolls(this.listboxDiv);
        globalThis.removeEventListener('scroll', this.#onGlobalScroll, { capture: true });
        globalThis.removeEventListener('pointerdown', this.#onPointerDownOutside, { capture: true });
        globalThis.removeEventListener('resize', this.#onResize);
    }

    #onPointerDownOutside = e => {
        const path = e.composedPath();
        if (!path.includes(this.comboboxDiv)) {
            this.#closeList();
        }
    };
    #onResize = () => {
        this.#closeList();
    };
    #onGlobalScroll = e => {
        if (e.target !== this.listboxDiv) {
            this.#closeList();
        }
    };

    #calcListSizeAndDirection() {
        requestAnimationFrame(() => {
            const rect = this.comboboxDiv.getBoundingClientRect();
            const listbox = this.listboxDiv;
            listbox.style.removeProperty('max-height');

            const style = globalThis.getComputedStyle(listbox);
            const maxHeight = Number.parseFloat(style.maxHeight) || window.innerHeight;
            const borderTop = Number.parseFloat(style.borderTopWidth) || 0;
            const borderBottom = Number.parseFloat(style.borderBottomWidth) || 0;

            const topEdge = rect.top;
            const bottomEdge = rect.bottom;
            const leftEdge = Math.max(0, rect.x);
            const minWidth = Math.min(0, rect.x) + rect.width;
            const borderY = borderTop + borderBottom;
            const spaceBelow = window.innerHeight - bottomEdge;
            const spaceAbove = topEdge;
            const listHeight = Math.min(listbox.scrollHeight + borderY, maxHeight);

            this.directionUp = spaceBelow < listHeight && spaceAbove > spaceBelow;

            if (this.directionUp) {
                const effectiveHeight = Math.min(listHeight, spaceAbove);
                listbox.style.maxHeight = `${effectiveHeight}px`;
                listbox.style.bottom = `${window.innerHeight - topEdge}px`;
                listbox.style.removeProperty('top');
            } else {
                const effectiveHeight = Math.min(listHeight, spaceBelow);
                listbox.style.maxHeight = `${effectiveHeight}px`;
                listbox.style.top = `${bottomEdge}px`;
                listbox.style.removeProperty('bottom');
            }

            listbox.style.minWidth = `${minWidth}px`;
            listbox.style.left = `${leftEdge}px`;
            this.requestUpdate();
        });
    }

    /**
     * Resolves option and index from a delegated listbox event.
     * @param {Event} event
     * @returns {string} The ID of the option element that was interacted with.
     */
    #getOptionIdFromEvent(event) {
        const target = /** @type {HTMLElement} */ (event.target);
        const optionElement = target?.closest('[role="option"]');

        return optionElement?.id || '';
    }

    /**
     * Parses an HTMLOptionElement or ComboOption into a plain object.
     * @param { HTMLOptionElement | CustomOption } opt
     * @returns {ComboOption}
     */
    #parseOption(opt) {
        const option = new ComboOption(opt);
        option.id = `option-${this.generateUniqueId()}`;
        if (this.value === opt.value) option.selected = true;

        return option;
    }

    /**
     * Converts a ComboOption into a div element.
     * @param {ComboOption} opt
     * @param {number} i
     * @returns {import('lit').TemplateResult}
     */
    #optToDiv(opt, i) {
        const isActive = this.activeIndex === -1 ? opt.selected : this.activeIndex === i;

        return opt.toHtml(isActive);
    }

    #toListElement(raw) {
        if (raw instanceof HTMLOptionElement || raw instanceof CustomOption || typeof raw === 'object') {
            return this.#parseOption(raw);
        }

        if (typeof raw === 'string' || typeof raw === 'number') {
            const opt = /** @type {CustomOption} */ ({ value: String(raw) });
            return this.#parseOption(opt);
        }

        throw new TypeError(`Invalid option entry: ${String(raw)}`);
    }

    // #endregion PRIVATE METHODS

    renderSearchInput() {
        return html`<input
            id=${this.searchId}
            type="search"
            .value=${this.filter || ''}
            ?disabled=${this.disabled}
            autocomplete="off"
            spellcheck="false"
            aria-expanded=${this.isOpen}
            aria-labelledby=${ifDefined(this.labelId)}
            @focus=${this.onFocusSearch}
            @input=${this.onInputSearch}
            @change=${e => e.stopPropagation()}
            data-role="search"
            tabindex="-1"
        />`;
    }

    renderListContent() {
        return html`<div aria-disabled ?hidden=${this.filteredOptions?.length > 0}>
                <slot name="no-options">${this.noOptionsLabel}</slot>
            </div>
            ${this.filteredOptions.map(this.#optToDiv.bind(this))}`;
    }

    /** @override @protected @returns {import('lit').TemplateResult} */
    render() {
        const activeDescendantId = this.filteredOptions[this.activeIndex]?.id;

        // prettier-ignore
        return html`
            ${this.renderLabel()}
            <div
                role="combobox"
                aria-activedescendant=${ifDefined(activeDescendantId)}
                aria-disabled=${this.disabled ? 'true' : 'false'}
                ?data-open=${this.isOpen}
                ?data-filtered=${!!this.filter}
                ?data-has-value=${this.inputElement?.value}
                ?data-up=${this.directionUp}
                tabindex="0"
                @focusout=${this.onFocusOut}
                @keydown=${this.onKeydown}
                @click=${this.onClick}
            >
                <input
                    id=${this.fieldId}
                    name=${ifDefined(this.name)}
                    type="text"
                    ?required=${this.required}
                    ?disabled=${this.disabled}
                    aria-labelledby=${ifDefined(this.labelId)}
                    aria-label=${ifDefined(this.hideLabel ? this.label : undefined)}
                    aria-errormessage=${ifDefined(this.errorId)}
                    aria-required=${this.required ? 'true' : 'false'}
                    aria-invalid=${ifDefined(this.ariaInvalid)}
                    aria-readonly="true"
                    @invalid=${this.onInvalid}
                    @focus=${this.onFocusValue}
                    data-role="value"
                    tabindex="-1"
                />
                <div data-role="display" aria-haspopup="listbox" .innerHTML=${this.placeholder}></div>
                ${this.renderSearchInput()} ${this.renderClearButton()} ${this.renderIndicator()}
                <div
                    id=${this.listId}
                    role="listbox"
                    popover="manual"
                    aria-expanded=${this.isOpen ? 'true' : 'false'}
                    @click=${this.onListboxClick}
                    @mouseover=${this.onListboxMouseover}
                >
                    ${this.renderListContent()}
                </div>
            </div>
            ${this.renderErrorMessage()}
        `;
    }
}

// search forma dahil edilmemeli
// aria-activedescendant="opt-3"
// aria-controls
// value var ama seçeneklerde yok -> seçenekler güncellendiğinde vlaue eşleşmeli
