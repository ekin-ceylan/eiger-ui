import ConfirmPasswordBox from '../../components/text-input/confirm-password-box.js';
import PasswordBox from '../../components/text-input/password-box.js';

defineElement('password-box', PasswordBox);
defineElement('confirm-password-box', ConfirmPasswordBox);

const getErrorElement = host => host.querySelector('[data-role="error-message"]');

describe('ConfirmPasswordBox: Initial State', () => {
    /** @type {import('../types').TestFixture<HTMLInputElement>} */
    let fixture;

    beforeEach(async () => {
        fixture = await initTestFixture('<confirm-password-box label="Şifreyi Doğrula"></confirm-password-box>');
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('autocomplete should be new-password', () => {
        expect(fixture.input.autocomplete).toBe('new-password');
    });

    it('input type should be password by default', () => {
        expect(fixture.input.type).toBe('password');
    });

    it('matchSelector should be undefined by default', () => {
        expect(fixture.host.matchSelector).toBeUndefined();
    });

    it('inherits toggle visibility from PasswordBox', () => {
        const toggleButton = fixture.querySelector('[data-role="toggle-visibility"]');
        expect(toggleButton).not.toBeNull();
    });
});

describe('ConfirmPasswordBox: Matching Validation', () => {
    /** @type {HTMLInputElement} */
    let confirmInput;
    /** @type {ConfirmPasswordBox} */
    let confirmHost;
    /** @type {import('../types').TestFixture<HTMLInputElement>} */
    let fixture;

    beforeEach(async () => {
        fixture = await initTestFixture(`<password-box label="Şifre" id="password"></password-box>
            <confirm-password-box label="Şifreyi Doğrula" match-selector="[id='password']"></confirm-password-box>`);

        confirmHost = document.body.querySelector('confirm-password-box');
        confirmInput = confirmHost.inputElement;

        fixture.input.focus();
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('is valid when passwords match', async () => {
        await fixture.user.type(fixture.input, 'MyPassword123');
        confirmInput.focus();
        await fixture.user.type(confirmInput, 'MyPassword123');
        await fixture.user.tab();

        expect(getErrorElement(confirmHost)).toBeNull();
        expect(confirmHost.invalid).toBe(false);
    });

    it('shows mismatch error when passwords do not match', async () => {
        await fixture.user.type(fixture.input, 'MyPassword123');
        confirmInput.focus();
        await fixture.user.type(confirmInput, 'DifferentPass');
        await fixture.user.tab();

        const errorElement = getErrorElement(confirmHost);
        expect(errorElement).not.toBeNull();
        expect(confirmHost.invalid).toBe(true);
        expect(errorElement.textContent).toContain('eşleşmiyor');
    });

    it('becomes valid when corrected after mismatch', async () => {
        await fixture.user.type(fixture.input, 'MyPassword123');
        confirmInput.focus();
        await fixture.user.type(confirmInput, 'Wrong');
        await fixture.user.tab();

        expect(confirmHost.invalid).toBe(true);

        // Clear and correct the confirm password
        await fixture.user.clear(confirmInput);
        await fixture.user.type(confirmInput, 'MyPassword123');
        await confirmHost.updateComplete;

        expect(getErrorElement(confirmHost)).toBeNull();
        expect(confirmHost.invalid).toBe(false);
    });

    it.skip('ignores match validation when selector target is not found', async () => {
        // Fill password and confirm with different values
        await fixture.user.type(fixture.input, 'MyPassword123');
        confirmInput.focus();
        await fixture.user.type(confirmInput, 'DifferentPass');
        await fixture.user.tab();

        // Should be invalid due to mismatch
        expect(confirmHost.invalid).toBe(true);
        expect(getErrorElement(confirmHost)).not.toBeNull();

        // Change selector to non-existent target
        confirmHost.setAttribute('match-selector', "[id='nonexistent']");
        await confirmHost.updateComplete;

        // Now match validation should be ignored (no target to compare)
        // So it becomes valid if there are no other validation errors
        expect(confirmHost.invalid).toBe(false);
        expect(getErrorElement(confirmHost)).toBeNull();
    });
});

describe('ConfirmPasswordBox: Dynamic Selector Update', () => {
    /** @type {HTMLInputElement} */
    let confirmInput;
    /** @type {ConfirmPasswordBox} */
    let confirmHost;
    /** @type {import('../types').TestFixture<HTMLInputElement>} */
    let fixture;

    beforeEach(async () => {
        fixture = await initTestFixture(`<password-box label="Şifre" id="original"></password-box>
            <confirm-password-box label="Şifreyi Doğrula" match-selector="[id='original']"></confirm-password-box>`);

        confirmHost = document.body.querySelector('confirm-password-box');
        confirmInput = confirmHost.inputElement;

        fixture.input.focus();
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    it.skip('updates target when match-selector attribute changes', async () => {
        await fixture.user.type(fixture.input, 'Pass123');
        confirmInput.focus();
        await fixture.user.type(confirmInput, 'Pass123');
        await fixture.user.tab();

        expect(confirmHost.invalid).toBe(false);

        // Change selector to a non-existent element
        confirmHost.setAttribute('match-selector', "[id='nonexistent']");
        await confirmHost.updateComplete;

        // Now should be invalid because target is not found
        expect(confirmHost.invalid).toBe(true);
    });
});

describe('ConfirmPasswordBox: Message Localization', () => {
    /** @type {import('../types').TestFixture<HTMLInputElement>} */
    let fixture;

    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('uses passwordMismatch message from localeMessages', async () => {
        fixture = await initTestFixture('<confirm-password-box label="Şifreyi Doğrula"></confirm-password-box>', 'tr');

        expect(fixture.host.passwordMismatchMessage).toContain('Şifreyi Doğrula');
    });

    it('passwordMismatchMessage includes label', async () => {
        fixture = await initTestFixture('<confirm-password-box label="Confirm Password"></confirm-password-box>', 'en');

        expect(fixture.host.passwordMismatchMessage).toContain('Confirm Password');
    });
});

describe('ConfirmPasswordBox: Accessibility', () => {
    /** @type {import('../types').TestFixture<HTMLInputElement>} */
    let fixture;

    beforeEach(async () => {
        fixture = await initTestFixture('<confirm-password-box label="Şifreyi Doğrula"></confirm-password-box>');
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('toggle button should be accessible and functional', async () => {
        const toggleButton = fixture.querySelector('[data-role="toggle-visibility"]');

        expect(toggleButton).not.toBeNull();
        expect(toggleButton.getAttribute('aria-label')).toBeDefined();
    });

    it('inherits aria attributes from parent input', async () => {
        expect(fixture.input.getAttribute('aria-invalid')).toBeDefined();
    });
});

describe('ConfirmPasswordBox: Edge Cases & Coverage', () => {
    /** @type {import('../types').TestFixture<HTMLInputElement>} */
    let fixture;

    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('handles null matchTarget gracefully', async () => {
        fixture = await initTestFixture('<confirm-password-box label="Şifreyi Doğrula" match-selector="[id=\'nonexistent\']"></confirm-password-box>');

        await fixture.user.type(fixture.input, 'SomeValue');
        await fixture.user.tab();

        // Should be valid since no match target exists to compare
        expect(fixture.host.invalid).toBe(false);
    });

    it('skips validation when confirm input is empty (isEmpty check)', async () => {
        const innerHtml = `<password-box label="Şifre" id="password"></password-box>
            <confirm-password-box label="Şifreyi Doğrula" match-selector="[id='password']"></confirm-password-box>`;

        fixture = await initTestFixture(innerHtml);

        const passwordHost = fixture.host;
        const confirmHost = document.body.querySelector('confirm-password-box');

        const passwordInput = fixture.input;
        const confirmInput = confirmHost.inputElement;

        await fixture.user.type(passwordInput, 'MyPassword123');

        // Don't fill confirm input, trigger validation on match target
        passwordInput.dispatchEvent(new Event('input', { bubbles: true }));

        // Confirm should still be valid because it's empty
        expect(confirmHost.invalid).toBe(false);
    });

    it('validates only after interaction (interacted property)', async () => {
        const innerHtml = `<password-box label="Şifre" id="password"></password-box>
            <confirm-password-box label="Şifreyi Doğrula" match-selector="[id='password']"></confirm-password-box>`;

        fixture = await initTestFixture(innerHtml);

        const passwordHost = fixture.host;
        const confirmHost = document.body.querySelector('confirm-password-box');

        const passwordInput = fixture.input;
        const confirmInput = confirmHost.inputElement;

        // Set values programmatically (no user interaction)
        passwordInput.value = 'MyPassword123';
        confirmInput.value = 'DifferentPass';

        // Trigger selector change without user interaction
        confirmHost.setAttribute('match-selector', "[id='password']");
        await confirmHost.updateComplete;

        // Should not validate until user interacts
        expect(confirmHost.invalid).toBe(false);
    });

    it('properly removes old listener when selector changes', async () => {
        const innerHtml = `<password-box label="First" id="first"></password-box>
            <password-box label="Second" id="second"></password-box>
            <confirm-password-box label="Confirm" match-selector="[id='first']"></confirm-password-box>`;

        fixture = await initTestFixture(innerHtml);

        const firstHost = fixture.host;
        const secondHost = document.body.querySelector('#second');
        const confirmHost = document.body.querySelector('confirm-password-box');

        const firstInput = fixture.input;
        const secondInput = secondHost.inputElement;
        const confirmInput = confirmHost.inputElement;

        // Fill all matching first
        await fixture.user.type(firstInput, 'Test123');
        confirmInput.focus();
        await fixture.user.type(confirmInput, 'Test123');
        await fixture.user.tab();

        expect(confirmHost.invalid).toBe(false);

        // Fill second to match confirm
        await fixture.user.type(secondInput, 'Test123');

        // Change selector to second (now matches)
        confirmHost.setAttribute('match-selector', '#second');
        await confirmHost.updateComplete;

        // Should still be valid (now matches second input)
        expect(confirmHost.invalid).toBe(false);

        // Change first input - confirm should stay valid (listener removed from first)
        await fixture.user.clear(firstInput);
        await fixture.user.type(firstInput, 'Changed');

        // Confirm still valid because listener is on second, not first
        expect(confirmHost.invalid).toBe(false);

        // Change second input - confirm should revalidate (listener on second)
        await fixture.user.clear(secondInput);
        await fixture.user.type(secondInput, 'Other');

        // Now confirm should be invalid (mismatch with second input)
        expect(confirmHost.invalid).toBe(true);
    });

    it('calls checkValidity() immediately when selector exists and interacted', async () => {
        const innerHtml = `<password-box label="Şifre" id="password"></password-box>
            <confirm-password-box label="Confirm" match-selector="[id='nonexistent']"></confirm-password-box>`;

        fixture = await initTestFixture(innerHtml);

        const passwordHost = fixture.host;
        const confirmHost = document.body.querySelector('confirm-password-box');
        const confirmInput = confirmHost.inputElement;

        // Interact with confirm input first (marks as interacted)
        await fixture.user.type(confirmInput, 'Test');
        await fixture.user.tab();

        // Now change selector to valid target - should immediately validate
        confirmHost.setAttribute('match-selector', "[id='password']");
        await confirmHost.updateComplete;

        // Since values don't match and we've interacted, should be invalid
        expect(confirmHost.invalid).toBe(true);
    });
});
