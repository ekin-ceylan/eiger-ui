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
    /** @type {HTMLTextAreaElement} */
    let input;
    /** @type {TextArea} */
    let host;
    /** @type {import('@testing-library/user-event').UserEvent} */
    let user;

    const getErrorElement = () => host.querySelector('[data-role="error-message"]');

    beforeEach(async () => {
        [input, host, user] = await initInputBase('<text-area label="Description" required minlength="3" maxlength="5"></text-area>');
    });

    it('required validation shows error when value is cleared after interaction', async () => {
        await user.type(input, 'x');
        await user.clear(input);
        await user.tab();

        expect(input.validity.valueMissing).toBe(true);
        const errorElement = getErrorElement();
        expect(errorElement).not.toBeNull();
        expect(errorElement.textContent.trim()).toContain('zorunludur');
    });

    it('minlength shows error on blur when below min length', async () => {
        await user.type(input, 'a');
        await user.tab();

        const errorElement = getErrorElement();
        expect(errorElement).not.toBeNull();
        expect(errorElement.textContent.trim()).toContain('en az');
    });

    it('maxlength prevents overflow and does not show error when capped natively', async () => {
        await user.type(input, 'abcdef');
        await user.tab();

        expect(input.value).toBe('abcde');
        expect(getErrorElement()).toBeNull();
    });

    it('validation is not shown immediately while field is still valid', async () => {
        await user.type(input, 'abc');

        expect(getErrorElement()).toBeNull();
    });

    it('validation updates while editing invalid field back to valid', async () => {
        await user.type(input, 'a');
        await user.tab();
        expect(getErrorElement()).not.toBeNull();

        input.focus();
        await user.type(input, 'bc');
        await user.tab();

        expect(getErrorElement()).toBeNull();
    });
});

describe('Character counter tests', () => {
    it('renders counter when show-counter and maxlength are set', async () => {
        const [, host] = await initInputBase('<text-area label="Description" show-counter maxlength="5"></text-area>');
        const counter = host.querySelector('[data-role="counter"]');

        expect(counter).not.toBeNull();
        expect(counter.textContent.trim()).toBe('5');
    });

    it('updates counter based on maxlength while typing', async () => {
        const [input, host, user] = await initInputBase('<text-area label="Description" show-counter maxlength="5"></text-area>');

        await user.type(input, 'ab');

        const counter = host.querySelector('[data-role="counter"]');
        expect(counter).not.toBeNull();
        expect(counter.textContent.trim()).toBe('3');
    });

    it('renders counter and counts forward when maxlength is not set', async () => {
        const [input, host, user] = await initInputBase('<text-area label="Description" show-counter></text-area>');

        const initialCounter = host.querySelector('[data-role="counter"]');
        expect(initialCounter).not.toBeNull();
        expect(initialCounter.textContent.trim()).toBe('0');

        await user.type(input, 'ab');

        const counter = host.querySelector('[data-role="counter"]');
        expect(counter).not.toBeNull();
        expect(counter.textContent.trim()).toBe('2');
    });

    it('updates counter when value is set programmatically with maxlength', async () => {
        const [, host] = await initInputBase('<text-area label="Description" show-counter maxlength="5"></text-area>');

        host.value = 'abc';
        await host.updateComplete;

        const counter = host.querySelector('[data-role="counter"]');
        expect(counter).not.toBeNull();
        expect(counter.textContent.trim()).toBe('2');
    });

    it('shows negative counter when programmatic value exceeds maxlength', async () => {
        const [, host] = await initInputBase('<text-area label="Description" show-counter maxlength="5"></text-area>');

        host.value = 'abcdef';
        await host.updateComplete;

        const counter = host.querySelector('[data-role="counter"]');
        expect(counter).not.toBeNull();
        expect(counter.textContent.trim()).toBe('-1');
    });

    it('updates forward counter when value is set programmatically without maxlength', async () => {
        const [, host] = await initInputBase('<text-area label="Description" show-counter></text-area>');

        host.value = 'abcd';
        await host.updateComplete;

        const counter = host.querySelector('[data-role="counter"]');
        expect(counter).not.toBeNull();
        expect(counter.textContent.trim()).toBe('4');
    });
});

describe('Value and slot behavior', () => {
    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('uses value attribute as source of truth when provided', async () => {
        const [input, host] = await initInputBase('<text-area label="Desc" value="preset">fallback</text-area>');

        expect(host.value).toBe('preset');
        expect(input.value).toBe('preset');
    });

    it('hydrates value from default slotted text when value is empty', async () => {
        const [input, host] = await initInputBase('<text-area label="Desc">Hello world</text-area>');
        // host.requestUpdate();
        await host.updateComplete;
        expect(host.value).toBe('Hello world');
        expect(input.value).toBe('Hello world');
    });

    it('serializes default slotted element nodes as literal text (outerHTML)', async () => {
        const [input, host] = await initInputBase('<text-area label="Desc"><b>Hi</b></text-area>');
        // host.requestUpdate();
        await host.updateComplete;
        expect(host.value).toContain('<b>Hi</b>');
        expect(input.value).toContain('<b>Hi</b>');
    });
});

describe('Accessibility (A11y) tests', () => {
    it('associates label with textarea via for/id and aria-labelledby', async () => {
        const [input, host] = await initInputBase('<text-area label="Description"></text-area>');

        const label = host.querySelector('label');
        expect(label).not.toBeNull();
        expect(label.getAttribute('for')).toBe(host.fieldId);
        expect(label.id).toBe(host.labelId);

        expect(input.id).toBe(host.fieldId);
        expect(input.getAttribute('aria-labelledby')).toBe(host.labelId);
    });

    it('uses aria-label when hide-label is enabled', async () => {
        const [input, host] = await initInputBase('<text-area label="Description" hide-label></text-area>');

        expect(host.querySelector('label')).toBeNull();
        expect(input.getAttribute('aria-label')).toBe('Description');
        expect(input.hasAttribute('aria-labelledby')).toBe(false);
    });

    it('forwards helper attributes: autocomplete, spellcheck, inputmode', async () => {
        const [input] = await initInputBase('<text-area label="Description" autocomplete="off" inputmode="text" spellcheck></text-area>');

        expect(input.getAttribute('autocomplete')).toBe('off');
        expect(input.getAttribute('inputmode')).toBe('text');
        expect(input.hasAttribute('spellcheck')).toBe(true);
        expect(input.spellcheck).toBe(true);
    });

    it('forwards rows, cols and wrap attributes', async () => {
        const [input] = await initInputBase('<text-area label="Description" rows="4" cols="30" wrap="soft"></text-area>');

        expect(input.getAttribute('rows')).toBe('4');
        expect(input.getAttribute('cols')).toBe('30');
        expect(input.getAttribute('wrap')).toBe('soft');
    });
});

describe('Reset tests', () => {
    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('component.reset() sets value to value attribute and syncs textarea', async () => {
        const [input, host] = await initInputBase('<text-area label="Desc" value="initial"></text-area>');

        host.value = 'changed';
        await host.updateComplete;
        await host.reset();
        await host.updateComplete;

        expect(host.value).toBe('initial');
        expect(input.value).toBe('initial');
    });
});

describe('Description tests', () => {
    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('renders description element when string property is set', async () => {
        const [, host] = await initInputBase('<text-area label="Description"></text-area>');

        host.description = 'Helper text for the field';
        await host.updateComplete;

        const descElement = host.querySelector('[data-role="description"]');
        expect(descElement).not.toBeNull();
        expect(descElement.textContent.trim()).toBe('Helper text for the field');
    });

    it('sets aria-describedby when description property is set', async () => {
        const [input, host] = await initInputBase('<text-area label="Description"></text-area>');

        host.description = 'Helper text';
        await host.updateComplete;

        expect(input.getAttribute('aria-describedby')).toBe(host.descriptionId);
    });

    it('does not set aria-describedby when description is not set', async () => {
        const [input] = await initInputBase('<text-area label="Description"></text-area>');

        expect(input.hasAttribute('aria-describedby')).toBe(false);
    });

    it('renders HTMLElement description property', async () => {
        const [, host] = await initInputBase('<text-area label="Description"></text-area>');

        const descDiv = document.createElement('div');
        descDiv.innerHTML = '<strong>Important:</strong> This is required';
        host.description = descDiv;
        await host.updateComplete;

        const descElement = host.querySelector('[data-role="description"]');
        expect(descElement).not.toBeNull();
        expect(descElement.querySelector('strong')).not.toBeNull();
        expect(descElement.querySelector('strong').textContent).toBe('Important:');
    });

    it('renders description slot when provided', async () => {
        const [, host] = await initInputBase('<text-area label="Description"><span slot="description">Slotted helper</span></text-area>');
        await host.updateComplete;

        const descElement = host.querySelector('[data-role="description"]');
        expect(descElement).not.toBeNull();
        expect(descElement.textContent).toContain('Slotted helper');
    });

    it('prefers property over slot when both are provided', async () => {
        const [, host] = await initInputBase('<text-area label="Description"><span slot="description">Slotted</span></text-area>');

        host.description = 'Property text';
        await host.updateComplete;

        const descElement = host.querySelector('[data-role="description"]');
        expect(descElement.textContent).toContain('Property text');
        expect(descElement.textContent).not.toContain('Slotted');
    });

    it('does not render description element when neither property nor slot is provided', async () => {
        const [, host] = await initInputBase('<text-area label="Description"></text-area>');

        const descElement = host.querySelector('[data-role="description"]');
        expect(descElement).toBeNull();
    });

    it('removes description when property is cleared', async () => {
        const [, host] = await initInputBase('<text-area label="Description"></text-area>');

        host.description = 'Helper text';
        await host.updateComplete;
        expect(host.querySelector('[data-role="description"]')).not.toBeNull();

        host.description = undefined;
        await host.updateComplete;
        expect(host.querySelector('[data-role="description"]')).toBeNull();
    });

    it('has correct description id format', async () => {
        const [, host] = await initInputBase('<text-area label="Description"></text-area>');

        host.description = 'Helper';
        await host.updateComplete;

        const descElement = host.querySelector('[data-role="description"]');
        expect(descElement.id).toBe(host.descriptionId);
        expect(descElement.id).toContain('description');
        expect(descElement.id).toContain(host.uniqueId);
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
