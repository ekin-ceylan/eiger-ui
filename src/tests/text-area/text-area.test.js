import TextArea from '../../components/text-area/text-area.js';

defineElement('text-area', TextArea);

describe('Component contract', () => {
    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('throws when required label is missing', () => {
        const host = document.createElement('text-area');

        expect(() => {
            host.willUpdate(new Map([['label', undefined]]));
        }).toThrow("text-area: 'label' attribute must be set.");
    });

    it('throws when a required field is cleared after initial render', () => {
        const host = document.createElement('text-area');

        expect(() => {
            host.willUpdate(new Map([['label', 'Description']]));
        }).toThrow("text-area: 'label' attribute must be set.");
    });
});

describe('Validation tests', () => {
    /** @type {import('../types').TestFixture<HTMLInputElement>} */
    let fixture;

    beforeEach(async () => {
        fixture = await initTestFixture('<text-area label="Description" required minlength="3" maxlength="5"></text-area>');
    });

    it('required validation shows error when value is cleared after interaction', async () => {
        await fixture.user.type(fixture.input, 'x');
        await fixture.user.clear(fixture.input);
        await fixture.user.tab();

        expect(fixture.input.validity.valueMissing).toBe(true);
        expect(fixture.error).not.toBeNull();
        expect(fixture.error.textContent.trim()).toContain('zorunludur');
    });

    it('minlength shows error on blur when below min length', async () => {
        await fixture.user.type(fixture.input, 'a');
        await fixture.user.tab();

        expect(fixture.error).not.toBeNull();
        expect(fixture.error.textContent.trim()).toContain('en az');
    });

    it('maxlength prevents overflow and does not show error when capped natively', async () => {
        await fixture.user.type(fixture.input, 'abcdef');
        await fixture.user.tab();

        expect(fixture.input.value).toBe('abcde');
        expect(fixture.error).toBeNull();
    });

    it('validation is not shown immediately while field is still valid', async () => {
        await fixture.user.type(fixture.input, 'abc');

        expect(fixture.error).toBeNull();
    });

    it('validation updates while editing invalid field back to valid', async () => {
        await fixture.user.type(fixture.input, 'a');
        await fixture.user.tab();
        expect(fixture.error).not.toBeNull();

        fixture.input.focus();
        await fixture.user.type(fixture.input, 'bc');
        await fixture.user.tab();

        expect(fixture.error).toBeNull();
    });
});

describe('Character counter tests', () => {
    it('renders counter when show-counter and maxlength are set', async () => {
        const fixture = await initTestFixture('<text-area label="Description" show-counter maxlength="5"></text-area>');
        const counter = fixture.querySelector('[data-role="counter"]');

        expect(counter).not.toBeNull();
        expect(counter.textContent.trim()).toBe('5');
    });

    it('updates counter based on maxlength while typing', async () => {
        const fixture = await initTestFixture('<text-area label="Description" show-counter maxlength="5"></text-area>');
        await fixture.user.type(fixture.input, 'ab');

        const counter = fixture.querySelector('[data-role="counter"]');
        expect(counter).not.toBeNull();
        expect(counter.textContent.trim()).toBe('3');
    });

    it('renders counter and counts forward when maxlength is not set', async () => {
        const fixture = await initTestFixture('<text-area label="Description" show-counter></text-area>');

        const initialCounter = fixture.querySelector('[data-role="counter"]');
        expect(initialCounter).not.toBeNull();
        expect(initialCounter.textContent.trim()).toBe('0');

        await fixture.user.type(fixture.input, 'ab');
        const counter = fixture.querySelector('[data-role="counter"]');

        expect(counter).not.toBeNull();
        expect(counter.textContent.trim()).toBe('2');
    });

    it.each([
        ['5', 'abc', '2', 'updates counter when value is set programmatically with maxlength'],
        ['5', 'abcdef', '-1', 'shows negative counter when programmatic value exceeds maxlength'],
        ['', 'abcd', '4', 'updates counter when value is set programmatically without maxlength'],
    ])('$3', async (maxlength, input, expected) => {
        const maxAttr = maxlength ? `maxlength="${maxlength}"` : '';
        const fixture = await initTestFixture(`<text-area label="Description" show-counter ${maxAttr}></text-area>`);

        fixture.host.value = input;
        await fixture.host.updateComplete;
        const counter = fixture.querySelector('[data-role="counter"]');

        expect(counter).not.toBeNull();
        expect(counter.textContent.trim()).toBe(expected);
    });
});

describe('Value and slot behavior', () => {
    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('uses value attribute as source of truth when provided', async () => {
        const fixture = await initTestFixture('<text-area label="Desc" value="preset">fallback</text-area>');

        expect(fixture.host.value).toBe('preset');
        expect(fixture.input.value).toBe('preset');
    });

    it('hydrates value from default slotted text when value is empty', async () => {
        const fixture = await initTestFixture('<text-area label="Desc">Hello world</text-area>');

        expect(fixture.host.value).toBe('Hello world');
        expect(fixture.input.value).toBe('Hello world');
    });

    it('serializes default slotted element nodes as literal text (outerHTML)', async () => {
        const fixture = await initTestFixture('<text-area label="Desc"><b>Hi</b></text-area>');

        expect(fixture.host.value).toContain('<b>Hi</b>');
        expect(fixture.input.value).toContain('<b>Hi</b>');
    });
});

describe('Accessibility (A11y) tests', () => {
    it('associates label with textarea via for/id and aria-labelledby', async () => {
        const fixture = await initTestFixture('<text-area label="Description"></text-area>');

        expect(fixture.label).not.toBeNull();
        expect(fixture.label.getAttribute('for')).toBe(fixture.host.fieldId);
        expect(fixture.label.id).toBe(fixture.host.labelId);

        expect(fixture.input.id).toBe(fixture.host.fieldId);
        expect(fixture.input.getAttribute('aria-labelledby')).toBe(fixture.host.labelId);
    });

    it('uses aria-label when hide-label is enabled', async () => {
        const fixture = await initTestFixture('<text-area label="Description" hide-label></text-area>');

        expect(fixture.label).toBeNull();
        expect(fixture.input.getAttribute('aria-label')).toBe('Description');
        expect(fixture.input.hasAttribute('aria-labelledby')).toBe(false);
    });

    it('forwards helper attributes: autocomplete, spellcheck, inputmode', async () => {
        const fixture = await initTestFixture('<text-area label="Description" autocomplete="off" inputmode="text" spellcheck></text-area>');

        expect(fixture.input.getAttribute('autocomplete')).toBe('off');
        expect(fixture.input.getAttribute('inputmode')).toBe('text');
        expect(fixture.input.hasAttribute('spellcheck')).toBe(true);
        expect(fixture.input.spellcheck).toBe(true);
    });

    it('forwards rows, cols and wrap attributes', async () => {
        const fixture = await initTestFixture('<text-area label="Description" rows="4" cols="30" wrap="soft"></text-area>');

        expect(fixture.input.getAttribute('rows')).toBe('4');
        expect(fixture.input.getAttribute('cols')).toBe('30');
        expect(fixture.input.getAttribute('wrap')).toBe('soft');
    });
});

describe('Reset tests', () => {
    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('component.reset() sets value to value attribute and syncs textarea', async () => {
        const fixture = await initTestFixture('<text-area label="Desc" value="initial"></text-area>');

        fixture.host.value = 'changed';
        await fixture.host.updateComplete;
        await fixture.host.reset();
        await fixture.host.updateComplete;

        expect(fixture.host.value).toBe('initial');
        expect(fixture.input.value).toBe('initial');
    });
});

describe('Description tests', () => {
    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('renders description element when string property is set', async () => {
        const fixture = await initTestFixture('<text-area label="Description"></text-area>');

        fixture.host.description = 'Helper text for the field';
        await fixture.host.updateComplete;
        const descElement = fixture.host.querySelector('[data-role="description"]');

        expect(descElement).not.toBeNull();
        expect(descElement.textContent.trim()).toBe('Helper text for the field');
    });

    it('sets aria-describedby when description property is set', async () => {
        const fixture = await initTestFixture('<text-area label="Description"></text-area>');

        fixture.host.description = 'Helper text';
        await fixture.host.updateComplete;

        expect(fixture.input.getAttribute('aria-describedby')).toBe(fixture.host.descriptionId);
    });

    it('does not set aria-describedby when description is not set', async () => {
        const fixture = await initTestFixture('<text-area label="Description"></text-area>');

        expect(fixture.input.hasAttribute('aria-describedby')).toBe(false);
    });

    it('renders HTMLElement description property', async () => {
        const fixture = await initTestFixture('<text-area label="Description"></text-area>');

        const descDiv = document.createElement('div');
        descDiv.innerHTML = '<strong>Important:</strong> This is required';
        fixture.host.description = descDiv;
        await fixture.host.updateComplete;
        const descElement = fixture.querySelector('[data-role="description"]');

        expect(descElement).not.toBeNull();
        expect(descElement.querySelector('strong')).not.toBeNull();
        expect(descElement.querySelector('strong').textContent).toBe('Important:');
    });

    it('renders description slot when provided', async () => {
        const fixture = await initTestFixture('<text-area label="Description"><span slot="description">Slotted helper</span></text-area>');
        await fixture.host.updateComplete;
        const descElement = fixture.querySelector('[data-role="description"]');

        expect(descElement).not.toBeNull();
        expect(descElement.textContent).toContain('Slotted helper');
    });

    it('prefers property over slot when both are provided', async () => {
        const fixture = await initTestFixture('<text-area label="Description"><span slot="description">Slotted</span></text-area>');

        fixture.host.description = 'Property text';
        await fixture.host.updateComplete;
        const descElement = fixture.querySelector('[data-role="description"]');

        expect(descElement.textContent).toContain('Property text');
        expect(descElement.textContent).not.toContain('Slotted');
    });

    it('does not render description element when neither property nor slot is provided', async () => {
        const fixture = await initTestFixture('<text-area label="Description"></text-area>');
        const descElement = fixture.querySelector('[data-role="description"]');

        expect(descElement).toBeNull();
    });

    it('removes description when property is cleared', async () => {
        const fixture = await initTestFixture('<text-area label="Description"></text-area>');

        fixture.host.description = 'Helper text';
        await fixture.host.updateComplete;
        expect(fixture.querySelector('[data-role="description"]')).not.toBeNull();

        fixture.host.description = undefined;
        await fixture.host.updateComplete;
        expect(fixture.querySelector('[data-role="description"]')).toBeNull();
    });

    it('has correct description id format', async () => {
        const fixture = await initTestFixture('<text-area label="Description"></text-area>');

        fixture.host.description = 'Helper';
        await fixture.host.updateComplete;
        const descElement = fixture.querySelector('[data-role="description"]');

        expect(descElement.id).toBe(fixture.host.descriptionId);
        expect(descElement.id).toContain('description');
        expect(descElement.id).toContain(fixture.host.uniqueId);
    });
});

/*
TEST CASES FOR TEXT AREA COMPONENT

COMPONENT CONTRACT
1. throws when required label is missing
2. throws when a required field is cleared after initial render

VALUE / SLOT BEHAVIOR
1. uses value attribute/property as source of truth when provided
2. collects default slotted text nodes as initial textarea value when value is empty
3. collects default slotted element nodes as literal text (outerHTML)
4. ignores slotted nodes when value is already set and logs warning
5. non-default slot content should keep standard SlotCollector behavior (extensibility)

VALIDATION
1. required: shows error when value becomes empty after interaction
2. minlength: shows error on blur when below minimum length
3. maxlength: native textarea prevents overflow input, no custom error if capped
4. validation is not checked immediately while valid (interacted-gated behavior)
5. validation is checked immediately after becoming invalid and while editing to valid state
6. if required field is cleared after interaction, validation appears immediately
7. valueUpdated path triggers validation refresh for programmatic value changes

EVENTS
1. input event updates host.value and dispatches custom input event
2. change event updates host.value and dispatches custom change event
3. blur triggers interacted-based validation check
4. invalid event forces validation check

ACCESSIBILITY (A11Y)
1. associates <label> with <textarea> via for/id and aria-labelledby
2. uses aria-label when hide-label is enabled and no visible label exists
3. sets aria-required="false" when required is not set
4. wires aria-errormessage to rendered error element id
5. removes aria-errormessage when field becomes valid
6. keeps accessible name sourced from label even with placeholder present
7. forwards helper attributes: autocomplete, spellcheck, inputmode
8. textarea is keyboard reachable and blur updates invalid UI
9. toggles aria-invalid when validity state changes
10. prevents focus when disabled

TEXTAREA-SPECIFIC ATTRS
1. forwards rows/cols/wrap attributes to native textarea
2. respects readonly behavior

DESCRIPTION
1. renders description element when string property is set
2. sets aria-describedby when description property is set
3. does not set aria-describedby when description is not set
4. renders HTMLElement description property
5. renders description slot when provided
6. prefers property over slot when both are provided
7. does not render description element when neither property nor slot is provided
8. removes description when property is cleared
9. has correct description id format with componentName and uniqueId

RESET
1. component.reset() sets value to value attribute
2. component.reset() syncs inner textarea value to value attribute
3. component.reset() clears invalid state and error message
4. component.reset() resets interacted to false
5. form reset mirrors the same behavior as component.reset()
*/
