import SelectBox from '../../components/select/select-box.js';
import CustomOption from '../../components/select/custom-option.js';
import CustomOptgroup from '../../components/select/custom-optgroup.js';

defineElement('select-box', SelectBox);
defineElement('custom-option', CustomOption);
defineElement('custom-optgroup', CustomOptgroup);

/** @typedef {import('../../base/options-control-base.js').default} OptionControlBase */
/** @typedef {import('../types').TestFixture<HTMLSelectElement, OptionControlBase>} SelectBoxFixture */

/**
 * Initializes a select-box and returns useful internals.
 * @param {string} elementStr
 * @returns {Promise<SelectBoxFixture> & { clearButton: HTMLButtonElement | null }>}
 */
async function initSelectBox(elementStr) {
    /** @type {SelectBoxFixture} */
    const fixture = await initTestFixture(elementStr);
    Object.defineProperty(fixture, 'clearButton', {
        get: () => fixture.host.querySelector('button[data-clear]'),
    });

    return fixture;
}

async function openSelect(fixture) {
    fixture.input.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    await fixture.host.updateComplete;
}

describe('SelectBox - Accessibility (A11y) tests', () => {
    it('associates <label> with <select> via for/id and aria-labelledby', async () => {
        const fixture = await initSelectBox('<select-box label="Country"></select-box>');

        expect(fixture.label).not.toBeNull();
        expect(fixture.label.getAttribute('for')).toBe(fixture.host.fieldId);
        expect(fixture.label.id).toBe(fixture.host.labelId);

        expect(fixture.input.id).toBe(fixture.host.fieldId);
        expect(fixture.input.getAttribute('aria-labelledby')).toBe(fixture.host.labelId);
        expect(fixture.input.hasAttribute('aria-label')).toBe(false);
    });

    it('uses aria-label when hide-label is enabled (no visible label)', async () => {
        const fixture = await initSelectBox('<select-box label="Country" hide-label></select-box>');

        expect(fixture.label).toBeNull();
        expect(fixture.input.getAttribute('aria-label')).toBe('Country');
        expect(fixture.input.hasAttribute('aria-labelledby')).toBe(false);
    });

    it('sets required semantics and wires aria-errormessage', async () => {
        const fixture = await initSelectBox('<select-box label="Country" required><option value="tr">Turkey</option></select-box>');

        expect(fixture.error).toBeNull();
        expect(fixture.input.getAttribute('aria-errormessage')).toBeNull();

        await openSelect(fixture);
        fixture.input.blur();
        await fixture.host.updateComplete;

        expect(fixture.input.required).toBe(true);
        expect(fixture.input.getAttribute('aria-required')).toBe('true');
        expect(fixture.input.getAttribute('aria-errormessage')).toBe(fixture.error.id);

        expect(fixture.label).not.toBeNull();
        expect(fixture.label.textContent).toContain('Country');

        expect(fixture.error).not.toBeNull();
        expect(fixture.error.id).toBe(fixture.host.errorId);
        expect(fixture.error.getAttribute('aria-live')).toBe('assertive');
    });

    it('removes aria-errormessage again when the selection becomes valid', async () => {
        const fixture = await initSelectBox(
            '<select-box label="Country" required required-sign="*"><option value="tr">Turkey</option><option value="de">Germany</option></select-box>'
        );

        expect(fixture.input.getAttribute('aria-errormessage')).toBeNull();

        await openSelect(fixture);
        fixture.input.blur();
        await fixture.host.updateComplete;

        expect(fixture.input.getAttribute('aria-errormessage')).toBe(fixture.error.id);
        expect(fixture.error).not.toBeNull();

        await fixture.user.selectOptions(fixture.input, 'tr');
        await fixture.host.updateComplete;

        expect(fixture.input.value).toBe('tr');
        expect(fixture.input.getAttribute('aria-errormessage')).toBeNull();
        expect(fixture.error).toBeNull();
    });

    it('sets aria-required="false" when required is not set', async () => {
        const fixture = await initSelectBox('<select-box label="X"></select-box>');

        expect(fixture.input.getAttribute('aria-required')).toBe('false');
        expect(fixture.input.required).toBe(false);
    });
});

describe('SelectBox - Options & value', () => {
    it('parses slotted options and respects selected attribute on startup', async () => {
        const fixture = await initSelectBox(`
			<select-box id="color" label="Color" placeholder="Pick one">
				<option value="r">Red</option>
				<option value="g" selected>Green</option>
			</select-box>
		`);

        expect(fixture.host.value).toBe('g');
        expect(fixture.input.value).toBe('g');
        expect(fixture.input.options).toHaveLength(3);
        expect(fixture.input.selectedOptions[0].textContent).toContain('Green');
    });

    it('handles initial value when no option is marked as selected', async () => {
        const fixture = await initSelectBox(`
			<select-box id="color" label="Color" placeholder="Pick one">
				<option value="r">Red</option>
				<option value="g">Green</option>
				<option value="b">Blue</option>
			</select-box>
		`);

        // When no option has selected attribute, host value should be empty
        expect(fixture.host.value).toBe('');
        expect(fixture.input.value).toBe('');

        // Placeholder option is always rendered as selected (for visual display)
        expect(fixture.input.selectedOptions).toHaveLength(1);
        expect(fixture.input.selectedOptions[0].value).toBe('');
        expect(fixture.input.selectedOptions[0].hasAttribute('hidden')).toBe(true);

        // Placeholder option should be first
        expect(fixture.input.options[0].value).toBe('');
        expect(fixture.input.options[0].textContent).toContain('Pick one');
    });

    it('renders optgroup content from slotted markup', async () => {
        const fixture = await initSelectBox(`
			<select-box id="cities" label="Cities">
				<optgroup label="Turkey">
					<option value="ank">Ankara</option>
					<option value="ist">Istanbul</option>
				</optgroup>
			</select-box>
		`);

        const group = fixture.input.querySelector('optgroup');
        expect(group).not.toBeNull();
        expect(group.label).toBe('Turkey');
        expect(group.querySelectorAll('option')).toHaveLength(2);
    });

    it('parses slotted custom-option nodes and respects selected attribute', async () => {
        const fixture = await initSelectBox(`
			<select-box id="priority" label="Priority" placeholder="Pick one">
				<custom-option value="low">Low</custom-option>
				<custom-option value="high" selected>High</custom-option>
			</select-box>
		`);

        expect(fixture.host.value).toBe('high');
        expect(fixture.input.value).toBe('high');
        expect(fixture.input.options).toHaveLength(3);
        expect(fixture.input.selectedOptions[0].textContent).toContain('High');
    });

    it('renders custom-optgroup with custom-option children', async () => {
        const fixture = await initSelectBox(`
			<select-box id="cars" label="Cars">
				<custom-optgroup label="German Cars" hidden>
					<custom-option value="bmw">BMW</custom-option>
					<custom-option value="audi">Audi</custom-option>
				</custom-optgroup>
			</select-box>
		`);

        const group = fixture.input.querySelector('optgroup');
        expect(group).not.toBeNull();
        expect(group.label).toBe('German Cars');
        expect(group.hidden).toBe(true);
        expect(group.querySelectorAll('option')).toHaveLength(2);
        expect(Array.from(group.querySelectorAll('option')).map(option => option.value)).toEqual(['bmw', 'audi']);
    });

    it('renders noOptionsLabel as a disabled option when there are no options', async () => {
        const fixture = await initSelectBox('<select-box id="empty" label="Empty" placeholder="Choose"></select-box>');

        expect(fixture.input.options).toHaveLength(2);
        expect(fixture.input.options[1].disabled).toBe(true);
        expect(fixture.input.options[1].textContent).toContain('Kayıt Bulunamadı');
    });

    it('conditionally renders label attribute for slotted native option nodes', async () => {
        const fixture = await initSelectBox(`
			<select-box id="city" label="City">
				<option value="ank" label="Ankara Label">Ankara Text</option>
				<option value="ist" label="Istanbul">Istanbul</option>
				<option value="izm">Izmir</option>
			</select-box>
		`);

        const optionWithDifferentText = fixture.input.querySelector('option[value="ank"]');
        const optionWithSameText = fixture.input.querySelector('option[value="ist"]');
        const optionWithoutLabel = fixture.input.querySelector('option[value="izm"]');

        expect(optionWithDifferentText).not.toBeNull();
        expect(optionWithDifferentText.textContent.trim()).toBe('Ankara Text');
        expect(optionWithDifferentText.getAttribute('label')).toBe('Ankara Label');

        expect(optionWithSameText).not.toBeNull();
        expect(optionWithSameText.textContent.trim()).toBe('Istanbul');
        expect(optionWithSameText.getAttribute('label')).toBeNull();

        expect(optionWithoutLabel).not.toBeNull();
        expect(optionWithoutLabel.textContent.trim()).toBe('Izmir');
        expect(optionWithoutLabel.getAttribute('label')).toBeNull();
    });

    it('conditionally renders label attribute for slotted custom-option nodes', async () => {
        const fixture = await initSelectBox(`
			<select-box id="city" label="City">
				<custom-option value="ank" label="Ankara Label">Ankara Text</custom-option>
				<custom-option value="ist" label="Istanbul">Istanbul</custom-option>
				<custom-option value="izm">Izmir</custom-option>
			</select-box>
		`);

        const optionWithDifferentText = fixture.input.querySelector('option[value="ank"]');
        const optionWithSameText = fixture.input.querySelector('option[value="ist"]');
        const optionWithoutLabel = fixture.input.querySelector('option[value="izm"]');

        expect(optionWithDifferentText).not.toBeNull();
        expect(optionWithDifferentText.textContent.trim()).toBe('Ankara Text');
        expect(optionWithDifferentText.getAttribute('label')).toBe('Ankara Label');

        expect(optionWithSameText).not.toBeNull();
        expect(optionWithSameText.textContent.trim()).toBe('Istanbul');
        expect(optionWithSameText.getAttribute('label')).toBeNull();

        expect(optionWithoutLabel).not.toBeNull();
        expect(optionWithoutLabel.textContent.trim()).toBe('Izmir');
        expect(optionWithoutLabel.getAttribute('label')).toBeNull();
    });
});

describe('SelectBox - Required validation', () => {
    it('shows required error on blur when no value is selected', async () => {
        const fixture = await initSelectBox(`
			<select-box id="team" label="Team" required placeholder="Choose">
				<option value="a">A</option>
				<option value="b">B</option>
			</select-box>
		`);

        await openSelect(fixture);
        fixture.input.blur();
        await fixture.host.updateComplete;

        expect(fixture.input.validity.valueMissing).toBe(true);
        expect(fixture.input.getAttribute('aria-invalid')).toBe('true');
        expect(fixture.error).not.toBeNull();
        expect(fixture.error.textContent.trim()).toContain('zorunludur');
    });

    it('clears the required error after a valid option is selected', async () => {
        const fixture = await initSelectBox(`
			<select-box id="team" label="Team" required placeholder="Choose">
				<option value="a">A</option>
				<option value="b">B</option>
			</select-box>
		`);

        await openSelect(fixture);
        fixture.input.blur();
        await fixture.host.updateComplete;
        expect(fixture.error).not.toBeNull();

        await fixture.user.selectOptions(fixture.input, 'b');
        await fixture.host.updateComplete;

        expect(fixture.input.value).toBe('b');
        expect(fixture.host.value).toBe('b');
        expect(fixture.input.getAttribute('aria-invalid')).toBeNull();
        expect(fixture.error).toBeNull();
    });
});

describe('SelectBox - Clear button', () => {
    it('clears the current value when clearable is enabled', async () => {
        const fixture = await initSelectBox(`
			<select-box id="city" label="City" clearable>
				<option value="ank" selected>Ankara</option>
				<option value="ist">Istanbul</option>
			</select-box>
		`);

        expect(fixture.clearButton).not.toBeNull();
        expect(fixture.clearButton.disabled).toBe(false);
        expect(fixture.input.value).toBe('ank');

        await fixture.user.click(fixture.clearButton);
        await fixture.host.updateComplete;

        expect(fixture.host.value).toBe('');
        expect(fixture.input.value).toBe('');
        expect(fixture.clearButton.disabled).toBe(true);
    });
});

describe('SelectBox - Options property', () => {
    it('accepts string-only arrays in options API and renders matching values/text', async () => {
        const fixture = await initSelectBox('<select-box id="x" label="X"></select-box>');

        fixture.host.options = ['one', 'two', 'three'];
        await fixture.host.updateComplete;

        const options = Array.from(fixture.input.querySelectorAll('option'));
        const values = options.map(option => option.value);
        const texts = options.map(option => option.textContent.trim());

        expect(values).toEqual(expect.arrayContaining(['one', 'two', 'three']));
        expect(texts).toEqual(expect.arrayContaining(['one', 'two', 'three']));
    });

    it('accepts options arrays and renders them', async () => {
        const fixture = await initSelectBox('<select-box id="x" label="X"></select-box>');

        fixture.host.options = ['one', { value: 'two', label: 'Two' }];
        await fixture.host.updateComplete;
        const values = Array.from(fixture.input.querySelectorAll('option')).map(option => option.value);

        expect(values).toContain('one');
        expect(values).toContain('two');
    });

    it('renders dataset and ariaset from options API on option nodes', async () => {
        const fixture = await initSelectBox('<select-box id="x" label="X"></select-box>');

        fixture.host.options = [
            {
                value: 'ank',
                label: 'Ankara',
                dataset: { trackingId: 'city-ank' },
                ariaset: { label: 'Ankara option' },
            },
        ];
        await fixture.host.updateComplete;
        const option = fixture.input.querySelector('option[value="ank"]');

        expect(option).not.toBeNull();
        expect(option.dataset.trackingId).toBe('city-ank');
        expect(option.getAttribute('aria-label')).toBe('Ankara option');
    });

    it('renders dataset and ariaset from options API on optgroup nodes', async () => {
        const fixture = await initSelectBox('<select-box id="x" label="X"></select-box>');

        fixture.host.options = [
            {
                label: 'Turkey',
                dataset: { region: 'tr' },
                ariaset: { label: 'Turkey cities' },
                options: [{ value: 'ank', text: 'Ankara' }],
            },
        ];
        await fixture.host.updateComplete;
        const group = fixture.input.querySelector('optgroup');

        expect(group).not.toBeNull();
        expect(group.dataset.region).toBe('tr');
        expect(group.getAttribute('aria-label')).toBe('Turkey cities');
    });

    it('collects slotted aria attributes into rendered option and optgroup nodes', async () => {
        const fixture = await initSelectBox(`
            <select-box id="city" label="City">
                <optgroup label="Turkey" aria-label="Turkey group">
                    <option value="ank" aria-label="Ankara option">Ankara</option>
                </optgroup>
            </select-box>
        `);

        const group = fixture.input.querySelector('optgroup');
        const option = fixture.input.querySelector('option[value="ank"]');

        expect(group).not.toBeNull();
        expect(option).not.toBeNull();
        expect(group.getAttribute('aria-label')).toBe('Turkey group');
        expect(option.getAttribute('aria-label')).toBe('Ankara option');
    });

    it('throws when options is not an array', async () => {
        const fixture = await initSelectBox('<select-box id="x" label="X"></select-box>');

        expect(() => {
            fixture.host.options = /** @type {any} */ ('nope');
        }).toThrow(/options must be an array/i);
    });

    it('resolves display text and label attribute via options API rules', async () => {
        const fixture = await initSelectBox('<select-box id="x" label="X"></select-box>');

        fixture.host.options = [
            { value: 'labelOnly', label: 'Only Label' },
            { value: 'textOnly', text: 'Only Text' },
            { value: 'diff', label: 'Ankara Label', text: 'Ankara Text' },
            { value: 'same', label: 'Istanbul', text: 'Istanbul' },
        ];
        await fixture.host.updateComplete;

        const labelOnlyOption = fixture.input.querySelector('option[value="labelOnly"]');
        const textOnlyOption = fixture.input.querySelector('option[value="textOnly"]');
        const differentTextOption = fixture.input.querySelector('option[value="diff"]');
        const sameTextOption = fixture.input.querySelector('option[value="same"]');

        expect(labelOnlyOption).not.toBeNull();
        expect(labelOnlyOption.textContent.trim()).toBe('Only Label');
        expect(labelOnlyOption.getAttribute('label')).toBeNull();

        expect(textOnlyOption).not.toBeNull();
        expect(textOnlyOption.textContent.trim()).toBe('Only Text');
        expect(textOnlyOption.getAttribute('label')).toBeNull();

        expect(differentTextOption).not.toBeNull();
        expect(differentTextOption.textContent.trim()).toBe('Ankara Text');
        expect(differentTextOption.getAttribute('label')).toBe('Ankara Label');

        expect(sameTextOption).not.toBeNull();
        expect(sameTextOption.textContent.trim()).toBe('Istanbul');
        expect(sameTextOption.getAttribute('label')).toBeNull();
    });

    it('uses the first empty-value option from options API as placeholder and filters subsequent empty-value options', async () => {
        const fixture = await initSelectBox('<select-box id="x" label="X"></select-box>');

        fixture.host.options = [
            { value: '', text: 'Choose option' },
            { value: '', text: 'Unknown' },
            { value: 'a', text: 'Option A' },
        ];
        await fixture.host.updateComplete;
        const allOptions = Array.from(fixture.input.querySelectorAll('option'));
        const emptyValueOptions = allOptions.filter(opt => opt.value === '');

        expect(fixture.host.placeholder).toBe('Choose option');
        expect(emptyValueOptions).toHaveLength(1);
        expect(emptyValueOptions[0].textContent.trim()).toBe('Choose option');
        expect(allOptions.map(opt => opt.textContent.trim())).not.toContain('Unknown');
    });

    it('preserves optgroups in options API even when they have no valid child options', async () => {
        const fixture = await initSelectBox('<select-box id="x" label="X"></select-box>');

        fixture.host.options = [
            {
                label: 'Turkey',
                options: [
                    { value: 'ank', text: 'Ankara' },
                    { value: 'ist', text: 'Istanbul' },
                ],
            },
            {
                label: 'Germany',
                options: [{ value: 'ber', text: 'Berlin' }],
            },
        ];
        await fixture.host.updateComplete;
        const groups = Array.from(fixture.input.querySelectorAll('optgroup'));

        expect(groups).toHaveLength(2);
        expect(groups[0].label).toBe('Turkey');
        expect(groups[1].label).toBe('Germany');
        expect(groups[0].querySelectorAll('option')).toHaveLength(2);
        expect(groups[1].querySelectorAll('option')).toHaveLength(1);
    });

    it('handles empty options array without errors', async () => {
        const fixture = await initSelectBox('<select-box id="x" label="X"></select-box>');

        fixture.host.options = [];
        await fixture.host.updateComplete;
        const options = Array.from(fixture.input.querySelectorAll('option'));

        expect(fixture.host.hasOptions).toBe(false);
        expect(fixture.host.placeholder).toBe(undefined);
        expect(options.length).toBeGreaterThanOrEqual(1);
        expect(options[0].value).toBe('');
    });

    it('sets placeholder when first option in options API has empty value but placeholder attr not set', async () => {
        const fixture = await initSelectBox('<select-box id="x" label="X"></select-box>');

        fixture.host.options = [
            { value: '', text: 'Select one' },
            { value: 'opt1', text: 'Option 1' },
        ];
        await fixture.host.updateComplete;

        expect(fixture.host.placeholder).toBe('Select one');
    });

    it('ignores empty-value option from options API when placeholder already set', async () => {
        const fixture = await initSelectBox('<select-box id="x" label="X" placeholder="Custom Placeholder"></select-box>');

        fixture.host.options = [
            { value: '', text: 'Auto Placeholder' },
            { value: 'opt1', text: 'Option 1' },
        ];
        await fixture.host.updateComplete;
        const allOptions = Array.from(fixture.input.querySelectorAll('option'));
        const emptyValueOptions = allOptions.filter(opt => opt.value === '');

        expect(fixture.host.placeholder).toBe('Custom Placeholder');
        expect(emptyValueOptions).toHaveLength(1);
        expect(emptyValueOptions[0].textContent.trim()).toBe('Custom Placeholder');
    });
});

describe('SelectBox - validateNode guards', () => {
    it('returns true for non-default slots', async () => {
        const validateSpy = vi.spyOn(SelectBox.prototype, 'validateNode');

        await initSelectBox('<select-box id="x" label="X"><span slot="suffix">icon</span></select-box>');

        expect(validateSpy).toHaveBeenCalledWith(expect.any(HTMLSpanElement), 'suffix');
        expect(validateSpy).toHaveReturnedWith(true);
        validateSpy.mockRestore();
    });

    it('returns false and warns when slotted nodes exist while options property is already set', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const validateSpy = vi.spyOn(SelectBox.prototype, 'validateNode');

        // options connect'ten önce atanmalı ki bağlama sırasında hasOptions true olsun;
        // "selected" olmayan bir değer #syncValueAfterOptionsChange içinde henüz render edilmemiş inputElement'e erişip patlar
        const host = document.createElement('select-box');
        host.setAttribute('id', 'x');
        host.setAttribute('label', 'X');
        host.options = [{ value: 'one', text: 'One', selected: true }];

        const node = document.createElement('option');
        node.value = 'two';
        node.textContent = 'Two';
        host.appendChild(node);

        document.body.appendChild(host);
        await host.updateComplete;

        expect(validateSpy).toHaveBeenCalledWith(node, 'default');
        expect(validateSpy).toHaveReturnedWith(false);
        expect(warnSpy).toHaveBeenCalledWith('Options are already set via property. Ignoring slotted nodes.');

        warnSpy.mockRestore();
        validateSpy.mockRestore();
        host.remove();
    });

    it('returns false and logs error for invalid child element types', async () => {
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const validateSpy = vi.spyOn(SelectBox.prototype, 'validateNode');

        const host = document.createElement('select-box');
        host.setAttribute('id', 'x');
        host.setAttribute('label', 'X');

        const invalidNode = document.createElement('div');
        host.appendChild(invalidNode);

        document.body.appendChild(host);
        await host.updateComplete;

        expect(validateSpy).toHaveBeenCalledWith(invalidNode, 'default');
        expect(validateSpy).toHaveReturnedWith(false);
        expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Only <option> and <optgroup> elements are allowed as children of'));

        errorSpy.mockRestore();
        validateSpy.mockRestore();
        host.remove();
    });
});

describe('SelectBox - keyboard and invalid handlers', () => {
    it('opens when Enter or Space is pressed on keydown', async () => {
        const fixture = await initSelectBox('<select-box id="x" label="X"></select-box>');

        fixture.host.open = false;
        fixture.input.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter', bubbles: true, cancelable: true }));
        expect(fixture.host.open).toBe(true);

        fixture.host.open = false;
        fixture.input.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', bubbles: true, cancelable: true }));
        expect(fixture.host.open).toBe(true);
    });

    it('closes when Escape, Tab, or Enter is pressed on keyup', async () => {
        const fixture = await initSelectBox('<select-box id="x" label="X"></select-box>');

        fixture.host.open = true;
        fixture.input.dispatchEvent(new KeyboardEvent('keyup', { code: 'Escape', bubbles: true, cancelable: true }));
        expect(fixture.host.open).toBe(false);

        fixture.host.open = true;
        fixture.input.dispatchEvent(new KeyboardEvent('keyup', { code: 'Tab', bubbles: true, cancelable: true }));
        expect(fixture.host.open).toBe(false);

        fixture.host.open = true;
        fixture.input.dispatchEvent(new KeyboardEvent('keyup', { code: 'Enter', bubbles: true, cancelable: true }));
        expect(fixture.host.open).toBe(false);
    });

    it('forces validation on invalid handler', async () => {
        const fixture = await initSelectBox(`
			<select-box id="team" label="Team" required>
				<option value="a">A</option>
			</select-box>
		`);

        fixture.input.dispatchEvent(new Event('invalid', { bubbles: false, cancelable: true }));
        await fixture.host.updateComplete;

        expect(fixture.host.invalid).toBe(true);
        expect(fixture.host.validationMessage).toContain('zorunludur');
    });
});

describe('SelectBox - Edge cases', () => {
    it('keeps initial value when options arrive later and include that value', async () => {
        const fixture = await initSelectBox('<select-box id="late-match" label="Late" value="ist"></select-box>');

        expect(fixture.host.value).toBe('ist');

        fixture.host.options = [
            { value: 'ank', text: 'Ankara' },
            { value: 'ist', text: 'Istanbul' },
        ];
        await fixture.host.updateComplete;

        expect(fixture.host.value).toBe('ist');
        expect(fixture.input.value).toBe('ist');
    });

    it('clears initial value when options arrive later and do not include that value', async () => {
        const fixture = await initSelectBox('<select-box id="late-miss" label="Late" value="ist"></select-box>');

        expect(fixture.host.value).toBe('ist');

        fixture.host.options = [
            { value: 'ank', text: 'Ankara' },
            { value: 'izm', text: 'Izmir' },
        ];
        await fixture.host.updateComplete;

        expect(fixture.host.value).toBe('');
        expect(fixture.input.value).toBe('');
    });

    it('uses the last selected option when multiple selected entries are provided via options API', async () => {
        const fixture = await initSelectBox('<select-box id="multi-selected" label="X"></select-box>');

        fixture.host.options = [
            { value: 'a', text: 'A', selected: true },
            { value: 'b', text: 'B', selected: true },
        ];
        await fixture.host.updateComplete;

        expect(fixture.host.value).toBe('b');
        expect(fixture.input.value).toBe('b');
    });

    it('overrides existing value when new options arrive with a selected entry', async () => {
        const fixture = await initSelectBox('<select-box id="override-selected" label="X" value="a"></select-box>');

        fixture.host.options = [
            { value: 'a', text: 'A' },
            { value: 'b', text: 'B' },
        ];
        await fixture.host.updateComplete;

        expect(fixture.host.value).toBe('a');

        fixture.host.options = [
            { value: 'a', text: 'A' },
            { value: 'b', text: 'B', selected: true },
        ];
        await fixture.host.updateComplete;

        expect(fixture.host.value).toBe('b');
        expect(fixture.input.value).toBe('b');
    });

    it('returns a copy from options getter so external mutations do not alter internal state', async () => {
        const fixture = await initSelectBox('<select-box id="copy" label="X"></select-box>');

        fixture.host.options = ['one'];
        await fixture.host.updateComplete;

        const snapshot = fixture.host.options;
        snapshot.push('two');
        await fixture.host.updateComplete;
        const values = Array.from(fixture.input.querySelectorAll('option')).map(option => option.value);

        expect(values).toContain('one');
        expect(values).not.toContain('two');
    });

    it('keeps the last assignment when options are set rapidly', async () => {
        const fixture = await initSelectBox('<select-box id="rapid" label="X"></select-box>');

        fixture.host.options = [{ value: 'first', text: 'First' }];
        fixture.host.options = [{ value: 'second', text: 'Second' }];
        await fixture.host.updateComplete;
        const values = Array.from(fixture.input.querySelectorAll('option')).map(option => option.value);

        expect(values).toContain('second');
        expect(values).not.toContain('first');
    });

    it('uses the first empty-value slotted option as placeholder and discards all subsequent empty-value options', async () => {
        const fixture = await initSelectBox(`
            <select-box id="empty-values" label="X">
                <option value="">Choose city</option>
                <option value="">Unknown city</option>
                <option value="ank">Ankara</option>
            </select-box>
        `);

        await fixture.host.updateComplete;

        const allOptions = Array.from(fixture.input.querySelectorAll('option'));
        const emptyValueOptions = allOptions.filter(option => option.value === '');

        expect(fixture.host.placeholder).toBe('Choose city');
        expect(fixture.input.options[0].textContent.trim()).toBe('Choose city');
        expect(emptyValueOptions).toHaveLength(1);
        expect(emptyValueOptions[0].textContent.trim()).toBe('Choose city');
        expect(allOptions.map(o => o.textContent.trim())).not.toContain('Unknown city');
    });

    it('clears value when value is set directly to an option that does not exist', async () => {
        const fixture = await initSelectBox('<select-box id="direct-invalid" label="X"></select-box>');

        fixture.host.options = [
            { value: 'ank', text: 'Ankara' },
            { value: 'ist', text: 'Istanbul' },
        ];
        await fixture.host.updateComplete;

        fixture.host.value = 'not-exists';
        await fixture.host.updateComplete;

        expect(fixture.host.value).toBe('');
        expect(fixture.input.value).toBe('');
    });

    it('syncs native input value when value is preserved after options change (else if branch)', async () => {
        const fixture = await initSelectBox(`
			<select-box id="preserve" label="Preserve" value="ist">
				<option value="ank">Ankara</option>
				<option value="ist">Istanbul</option>
			</select-box>
		`);

        await fixture.host.updateComplete;

        // Value preserved, native should sync
        expect(fixture.host.value).toBe('ist');
        expect(fixture.input.value).toBe('ist');

        // Now change options, but value still valid - triggers #syncValueAfterOptionsChange
        fixture.host.options = [
            { value: 'ank', text: 'Ankara' },
            { value: 'ist', text: 'Istanbul' },
        ];
        fixture.host.requestUpdate();
        await fixture.host.updateComplete;

        // Verify native input synced via the else if branch
        expect(fixture.host.value).toBe('ist');
        expect(fixture.input.value).toBe('ist');
    });
});
