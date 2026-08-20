import TextBox from '../../components/text-input/text-box.js';

defineElement('text-box', TextBox);

describe('Component contract', () => {
    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('throws when required label is missing', () => {
        const host = document.createElement('text-box');

        expect(() => {
            host.willUpdate(new Map([['label', undefined]]));
        }).toThrow("text-box: 'label' attribute must be set.");
    });

    it('throws when a required field is cleared after initial render', () => {
        const host = document.createElement('text-box');

        expect(() => {
            host.willUpdate(new Map([['label', 'Name']]));
        }).toThrow("text-box: 'label' attribute must be set.");
    });
});

describe('Validation Tests', () => {
    /** @type {import('../types').TestFixture<HTMLInputElement>} */
    let fixture;

    beforeEach(async () => {
        fixture = await initTestFixture('<text-box label="Name" pattern="[A-Za-z]{5}" required minlength="3" maxlength="5"></text-box>');
    });

    it('Required validation should show error when value is missing', async () => {
        await fixture.user.type(fixture.input, 'x');
        await fixture.user.clear(fixture.input);
        await fixture.user.tab();

        expect(fixture.input.validity.valueMissing).toBe(true);
        expect(fixture.error).not.toBeNull();
        expect(fixture.error.textContent.trim()).toContain('zorunludur');
    });

    it('minlength kontrolü', async () => {
        await fixture.user.type(fixture.input, 'a');
        await fixture.user.tab(); // focus'tan çık

        expect(fixture.error).not.toBeNull();
        expect(fixture.error.textContent.trim()).toContain('en az');
    });

    it('maxlength prevents input beyond max length, does not show error message', async () => {
        await fixture.user.type(fixture.input, 'abcdef');
        await fixture.user.tab(); // focus'tan çık

        expect(fixture.input.value).toBe('abcde');
        expect(fixture.error).toBeNull();
    });

    it('validation is not checked immediately if it is valid or not checked', async () => {
        await fixture.user.type(fixture.input, 'abc');

        expect(fixture.input.value).toBe('abc');
        expect(fixture.error).toBeNull();
    });

    it('validation is checked immediately if it is not valid', async () => {
        await fixture.user.type(fixture.input, 'abc');
        await fixture.user.tab(); // focus'tan çık

        expect(fixture.error).not.toBeNull();

        await fixture.user.type(fixture.input, 'de');

        expect(fixture.input.value).toBe('abcde');
        expect(fixture.error).toBeNull();
    });

    it('if input is required and it gets empty, validation is shown immediately', async () => {
        fixture = await initTestFixture('<text-box label="Name" required></text-box>');

        await fixture.user.type(fixture.input, 'abc');

        expect(fixture.error).toBeNull();

        await fixture.user.clear(fixture.input);
        await fixture.user.tab();
        await fixture.host.updateComplete;

        expect(fixture.input.value).toBe('');
        expect(fixture.error).not.toBeNull();
    });

    // pattern attr göre validasyon ve hata mesajı
    it('pattern with punctuation should fail validation', async () => {
        fixture = await initTestFixture('<text-box label="Name" pattern="[a-zA-ZçÇğĞıİöÖşŞüÜâÂîÎ -]+"></text-box>');

        await fixture.user.type(fixture.input, 'Hello, world!');
        await fixture.user.tab(); // blur to trigger validation

        expect(fixture.error).not.toBeNull();
        expect(fixture.error.textContent.trim()).toMatch(/gereklidir|Lütfen/);
    });
});

describe('Accessibility (A11y) tests', () => {
    it('associates <label> with <input> via for/id and aria-labelledby', async () => {
        const fixture = await initTestFixture('<text-box label="Email"></text-box>');
        const expectedFieldId = fixture.host.fieldId;
        const expectedLabelId = fixture.host.labelId;

        // Visible label should be linked to the input.
        expect(fixture.label).not.toBeNull();
        expect(fixture.label.getAttribute('for')).toBe(expectedFieldId);
        expect(fixture.label.id).toBe(expectedLabelId);

        expect(fixture.input.id).toBe(expectedFieldId);
        expect(fixture.input.getAttribute('aria-labelledby')).toBe(expectedLabelId);
        // When label is visible, aria-label should not be used.
        expect(fixture.input.hasAttribute('aria-label')).toBe(false);
    });

    it('uses aria-label when hide-label is enabled (no visible label)', async () => {
        const fixture = await initTestFixture('<text-box label="Email" hide-label></text-box>');

        // No visible label rendered.
        expect(fixture.label).toBeNull();

        // Accessible name should come from aria-label.
        expect(fixture.input.getAttribute('aria-label')).toBe('Email');
        expect(fixture.input.hasAttribute('aria-labelledby')).toBe(false);
    });

    it('sets aria-required="false" when required is not set', async () => {
        const fixture = await initTestFixture('<text-box label="Name"></text-box>');

        expect(fixture.input.getAttribute('aria-required')).toBe('false');
        expect(fixture.input.required).toBe(false);
    });

    it('wires aria-errormessage to the error element id', async () => {
        const fixture = await initTestFixture('<text-box label="Name" required></text-box>');

        expect(fixture.error).toBeNull();
        expect(fixture.input.getAttribute('aria-errormessage')).toBeNull();

        await fixture.user.type(fixture.input, 'x');
        await fixture.user.clear(fixture.input);
        await fixture.user.tab();
        await fixture.host.updateComplete;

        expect(fixture.error).not.toBeNull();
        expect(fixture.error.id).toBe(fixture.host.errorId);
        expect(fixture.input.getAttribute('aria-errormessage')).toBe(fixture.host.errorId);

        // Live region is important for announcing validation updates.
        expect(fixture.error.getAttribute('aria-live')).toBe('assertive');
    });

    it('removes aria-errormessage again when the field becomes valid', async () => {
        const fixture = await initTestFixture('<text-box label="Name" required minlength="3"></text-box>');

        expect(fixture.input.getAttribute('aria-errormessage')).toBeNull();

        await fixture.user.type(fixture.input, 'x');
        await fixture.user.clear(fixture.input);
        await fixture.user.tab();
        await fixture.host.updateComplete;

        expect(fixture.input.getAttribute('aria-errormessage')).toBe(fixture.host.errorId);
        expect(fixture.error).not.toBeNull();

        fixture.input.focus();
        await fixture.user.type(fixture.input, 'abc');
        await fixture.user.tab();
        await fixture.host.updateComplete;

        expect(fixture.input.getAttribute('aria-errormessage')).toBeNull();
        expect(fixture.error).toBeNull();
    });

    it('keeps accessible name coming from the label even when placeholder is present', async () => {
        const fixture = await initTestFixture('<text-box label="Name" placeholder="Type here"></text-box>');

        // Placeholder should be forwarded, but it should not replace the accessible name.
        expect(fixture.input.getAttribute('placeholder')).toBe('Type here');
        expect(fixture.label).not.toBeNull();
        expect(fixture.input.hasAttribute('aria-label')).toBe(false);
        expect(fixture.input.getAttribute('aria-labelledby')).toBe(fixture.host.labelId);
    });

    it('forwards helper attributes: autocomplete, spellcheck, inputmode', async () => {
        const fixture = await initTestFixture('<text-box label="Name" autocomplete="name" inputmode="text" spellcheck></text-box>');

        expect(fixture.input.getAttribute('autocomplete')).toBe('name');
        expect(fixture.input.getAttribute('inputmode')).toBe('text');
        // spellcheck is reflected; different environments may serialize it as "" or "true".
        expect(fixture.input.hasAttribute('spellcheck')).toBe(true);
        expect(fixture.input.spellcheck).toBe(true);
    });

    it('is keyboard reachable and blur triggers validation UI updates', async () => {
        const fixture = await initTestFixture('<text-box label="Name" required></text-box>');

        // Ensure input can receive focus via keyboard navigation.
        fixture.input.blur();
        expect(document.activeElement).not.toBe(fixture.input);
        await fixture.user.tab();
        expect(document.activeElement).toBe(fixture.input);

        // Blurring should run validity check and show the error.
        await fixture.user.type(fixture.input, 'x');
        await fixture.user.clear(fixture.input);
        await fixture.user.tab();
        await fixture.host.updateComplete;
        const error = fixture.error;

        expect(fixture.input.getAttribute('aria-invalid')).toBe('true');
        expect(error).not.toBeNull();
    });

    it('toggles aria-invalid when validation state changes', async () => {
        const fixture = await initTestFixture('<text-box label="Name" required minlength="3"></text-box>');

        // Trigger invalid state.
        await fixture.user.type(fixture.input, 'x');
        await fixture.user.clear(fixture.input);
        await fixture.user.tab();
        await fixture.host.updateComplete;

        expect(fixture.input.getAttribute('aria-invalid')).toBe('true');
        expect(fixture.error).not.toBeNull();

        // Fix the value, then blur again.
        fixture.input.focus();
        await fixture.user.type(fixture.input, 'abc');
        await fixture.user.tab();
        await fixture.host.updateComplete;

        // When valid again, aria-invalid should be removed.
        expect(fixture.input.getAttribute('aria-invalid')).toBeNull();
        expect(fixture.error).toBeNull();
    });

    it('prevents focus when disabled', async () => {
        const fixture = await initTestFixture('<text-box label="X" disabled></text-box>');

        // Disabled inputs are not focusable.
        expect(fixture.input.disabled).toBe(true);
        fixture.input.focus();
        expect(document.activeElement).not.toBe(fixture.input);
    });
});

// mask pattern ekle
describe('Allow Pattern Tests', () => {
    it('does not filter when allow-pattern is empty', async () => {
        const fixture = await initTestFixture('<text-box label="Name" allow-pattern=""></text-box>');

        await fixture.user.type(fixture.input, 'a1b2');

        expect(fixture.input.value).toBe('a1b2');
    });

    it('filters disallowed characters on typing', async () => {
        const fixture = await initTestFixture('<text-box label="Name" allow-pattern="[0-9]"></text-box>');

        await fixture.user.type(fixture.input, 'a1b2');

        expect(fixture.input.value).toBe('12');
    });

    it('filters disallowed characters on paste', async () => {
        const fixture = await initTestFixture('<text-box label="Name" allow-pattern="[0-9]"></text-box>');

        await fixture.user.paste('a1b2');

        expect(fixture.input.value).toBe('12');
    });

    it('starts filtering when allow-pattern is set after connect', async () => {
        const fixture = await initTestFixture('<text-box label="Name"></text-box>');

        fixture.host.setAttribute('allow-pattern', '[0-9]');
        await fixture.user.type(fixture.input, 'a1b2');

        expect(fixture.input.value).toBe('12');
    });

    it('stops filtering when allow-pattern is removed after connect', async () => {
        const fixture = await initTestFixture('<text-box label="Name" allow-pattern="[0-9]"></text-box>');
        fixture.host.removeAttribute('allow-pattern');

        await fixture.user.type(fixture.input, 'a1');

        expect(fixture.input.value).toBe('a1');
    });

    it('throws when allow-pattern is invalid', async () => {
        let message = '';
        const handler = event => {
            message = event.reason.message;
            event.preventDefault(); // prevent Vitest from failing the test
        };

        globalThis.addEventListener('unhandledrejection', handler);
        document.body.innerHTML = '<text-box label="Name" allow-pattern="["></text-box>';
        await new Promise(resolve => setTimeout(resolve, 0));
        globalThis.removeEventListener('unhandledrejection', handler);

        expect(message).toMatch(/Invalid regular expression/);
    });
});

describe('Reset Tests', () => {
    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('component.reset() sets value to the value attribute even if value has not changed', async () => {
        /** @type {import('../types').TestFixture<HTMLInputElement>} */
        const fixture = await initTestFixture('<text-box label="Name" value="initial"></text-box>');

        await fixture.host.reset();

        expect(fixture.host.value).toBe('initial');
        expect(fixture.input.value).toBe('initial');
    });

    it('component.reset() sets value to the value attribute after value changed', async () => {
        const fixture = await initTestFixture('<text-box label="Name" value="initial"></text-box>');

        fixture.host.value = 'changed';
        await fixture.host.updateComplete;

        await fixture.host.reset();

        expect(fixture.host.value).toBe('initial');
    });

    it('component.reset() syncs inner input value to the value attribute', async () => {
        const fixture = await initTestFixture('<text-box label="Name" value="initial"></text-box>');

        fixture.host.value = 'changed';
        await fixture.host.updateComplete;

        await fixture.host.reset();
        await fixture.host.updateComplete;

        expect(fixture.input.value).toBe('initial');
    });

    it('component.reset() clears invalid state and error message', async () => {
        const fixture = await initTestFixture('<text-box label="Name" required></text-box>');

        await fixture.user.type(fixture.input, 'x');
        await fixture.user.clear(fixture.input);
        await fixture.user.tab();
        await fixture.host.updateComplete;

        expect(fixture.host.invalid).toBe(true);
        expect(fixture.error).not.toBeNull();

        await fixture.host.reset();
        await fixture.host.updateComplete;

        expect(fixture.host.invalid).toBe(false);
        expect(fixture.error).toBeNull();
    });

    it('component.reset() resets interacted to false', async () => {
        const fixture = await initTestFixture('<text-box label="Name"></text-box>');

        await fixture.user.type(fixture.input, 'hello');
        expect(fixture.host.interacted).toBe(true);

        await fixture.host.reset();

        expect(fixture.host.interacted).toBe(false);
    });

    it('form reset sets value to the value attribute when value has not changed', async () => {
        /** @type {import('../types').TestFixture<HTMLInputElement>} */
        const fixture = await initTestFixture('<text-box label="Name" value="initial"></text-box>');

        fixture.reset.click();
        await new Promise(resolve => requestAnimationFrame(resolve));

        expect(fixture.host.value).toBe('initial');
        expect(fixture.input.value).toBe('initial');
    });

    it('form reset sets value to the value attribute', async () => {
        const fixture = await initTestFixture('<text-box label="Name" value="initial"></text-box>');

        fixture.host.value = 'changed';
        await fixture.host.updateComplete;

        fixture.reset.click();
        await new Promise(resolve => requestAnimationFrame(resolve));
        await fixture.host.updateComplete;

        expect(fixture.host.value).toBe('initial');
    });

    it('form reset syncs inner input value to the value attribute', async () => {
        const fixture = await initTestFixture('<text-box label="Name" value="initial"></text-box>');

        fixture.host.value = 'changed';
        await fixture.host.updateComplete;

        fixture.reset.click();
        await new Promise(resolve => requestAnimationFrame(resolve));
        await fixture.host.updateComplete;

        expect(fixture.input.value).toBe('initial');
    });

    it('form reset clears invalid state', async () => {
        const fixture = await initTestFixture('<text-box label="Name" required></text-box>');

        // Trigger invalid state directly
        fixture.host.checkValidity();
        await fixture.host.updateComplete;

        expect(fixture.host.invalid).toBe(true);

        fixture.reset.click();
        await new Promise(resolve => requestAnimationFrame(resolve));
        await fixture.host.updateComplete;

        expect(fixture.host.invalid).toBe(false);
        expect(fixture.error).toBeNull();
    });

    it('form reset resets interacted to false', async () => {
        const fixture = await initTestFixture('<text-box label="Name"></text-box>');

        // Simulate interaction by dispatching a first-interaction event directly
        fixture.host.dispatchEvent(new CustomEvent('first-interaction', { bubbles: true }));
        expect(fixture.host.interacted).toBe(true);

        fixture.reset.click();
        await new Promise(resolve => requestAnimationFrame(resolve));

        expect(fixture.host.interacted).toBe(false);
    });
});
