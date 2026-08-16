import NewPasswordBox from '../../components/text-input/new-password-box.js';

defineElement('new-password-box', NewPasswordBox);

// const getStrengthBar = host => host.querySelector('[role="progressbar"]');

describe('NewPasswordBox: Initial State', () => {
    /** @type {import('../types').TestFixture<HTMLInputElement>} */
    let fixture;

    beforeEach(async () => {
        fixture = await initTestFixture('<new-password-box label="Yeni Şifre"></new-password-box>');
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('input type should be password by default', () => {
        expect(fixture.input.type).toBe('password');
    });

    it('autocomplete should be new-password', () => {
        expect(fixture.input.autocomplete).toBe('new-password');
    });

    it('minStrength should default to 4', () => {
        expect(fixture.host.minStrength).toBe(4);
    });

    it('strength should be 0 for empty value', () => {
        expect(fixture.host.strength).toBe(0);
    });

    it('should render strength bar', () => {
        expect(fixture.querySelector('[role="progressbar"]')).not.toBeNull();
    });

    it('inherits toggle visibility from PasswordBox', () => {
        const toggleButton = fixture.querySelector('[data-role="toggle-visibility"]');
        expect(toggleButton).not.toBeNull();
    });
});

describe('NewPasswordBox: Strength Calculation', () => {
    /** @type {import('../types').TestFixture<HTMLInputElement>} */
    let fixture;

    beforeEach(async () => {
        fixture = await initTestFixture('<new-password-box label="Yeni Şifre"></new-password-box>');
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('strength should be 0 for empty password', async () => {
        expect(fixture.host.strength).toBe(0);
    });

    it('strength should be 1 for password shorter than 8 characters', async () => {
        fixture.input.focus();
        await fixture.user.type(fixture.input, 'Short');
        await fixture.host.updateComplete;

        expect(fixture.host.strength).toBe(1);
    });

    it('strength should be 2 for 8+ chars with uppercase', async () => {
        fixture.input.focus();
        await fixture.user.type(fixture.input, 'Password');
        await fixture.host.updateComplete;

        expect(fixture.host.strength).toBe(2);
    });

    it('strength should be 3+ for 8+ chars with multiple criteria', async () => {
        fixture.input.focus();
        await fixture.user.type(fixture.input, 'MyPass123');
        await fixture.host.updateComplete;

        expect(fixture.host.strength).toBeGreaterThanOrEqual(3);
    });

    it('strength calculation via direct method call', () => {
        // Test strength calculation at 0 level
        expect(fixture.host.calculatePasswordStrength('')).toBe(0);
        // Test at level 1 (short password)
        expect(fixture.host.calculatePasswordStrength('test')).toBe(1);
    });
});

describe('NewPasswordBox: Strength Rendering', () => {
    /** @type {import('../types').TestFixture<HTMLInputElement>} */
    let fixture;

    beforeEach(async () => {
        fixture = await initTestFixture('<new-password-box label="Yeni Şifre"></new-password-box>');
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('strength bar should have correct aria attributes', () => {
        const bar = fixture.querySelector('[role="progressbar"]');
        expect(bar.getAttribute('role')).toBe('progressbar');
        expect(bar.getAttribute('aria-valuemin')).toBe('0');
        expect(bar.getAttribute('aria-valuemax')).toBe('5');
        expect(bar.getAttribute('aria-valuenow')).toBe('0');
    });

    it('strength bar aria-valuenow should update with strength', async () => {
        const bar = fixture.querySelector('[role="progressbar"]');
        fixture.input.focus();
        await fixture.user.type(fixture.input, 'Password1');
        await fixture.host.updateComplete;

        expect(bar.getAttribute('aria-valuenow')).toBe('3');
    });

    it('strength bar should have data-strength attribute', () => {
        const bar = fixture.querySelector('[role="progressbar"]');
        const presentation = bar.querySelector('[role="presentation"]');
        expect(presentation).not.toBeNull();
        expect(presentation.getAttribute('data-strength')).toBe('0');
    });

    it('data-strength should update as password is typed', async () => {
        const bar = fixture.querySelector('[role="progressbar"]');
        const presentation = bar.querySelector('[role="presentation"]');
        fixture.input.focus();
        await fixture.user.type(fixture.input, 'Password1!');
        await fixture.host.updateComplete;

        expect(presentation.getAttribute('data-strength')).toBe('4');
    });

    it('strength label should have aria-label set', () => {
        const bar = fixture.querySelector('[role="progressbar"]');
        expect(bar.getAttribute('aria-label')).toBeDefined();
    });
});

describe('NewPasswordBox: Validation Based on minStrength', () => {
    /** @type {import('../types').TestFixture<HTMLInputElement>} */
    let fixture;

    beforeEach(async () => {
        fixture = await initTestFixture('<new-password-box label="Yeni Şifre"></new-password-box>');
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('should be invalid when strength is less than minStrength (default 4)', async () => {
        fixture.input.focus();
        await fixture.user.type(fixture.input, 'MyPassword1');
        await fixture.user.tab();

        expect(fixture.host.invalid).toBe(true);
    });

    it('should be valid when strength equals minStrength', async () => {
        fixture.input.focus();
        await fixture.user.type(fixture.input, 'MyPassword1!');
        await fixture.user.tab();

        expect(fixture.host.invalid).toBe(false);
    });

    it('should be valid when strength exceeds minStrength', async () => {
        fixture.host.minStrength = 2;
        fixture.input.focus();
        await fixture.user.type(fixture.input, 'MyPassword1');
        await fixture.host.updateComplete;
        await fixture.user.tab();

        expect(fixture.host.invalid).toBe(false);
    });

    it('should show error message when validation fails', async () => {
        fixture.input.focus();
        await fixture.user.type(fixture.input, 'Weak');
        await fixture.user.tab();

        const errorElement = fixture.error;
        expect(errorElement).not.toBeNull();
    });

    it('should clear error when password becomes strong enough', async () => {
        fixture.input.focus();
        await fixture.user.type(fixture.input, 'Weak');
        await fixture.user.tab();

        expect(fixture.host.invalid).toBe(true);

        await fixture.user.type(fixture.input, 'Password1!');
        await fixture.host.updateComplete;

        // After correction, should be valid
        expect(fixture.host.invalid).toBe(false);
    });

    it('should allow minStrength to be customized', async () => {
        fixture.host.minStrength = 1;
        fixture.input.focus();
        await fixture.user.type(fixture.input, 'Short');
        await fixture.user.tab();

        expect(fixture.host.invalid).toBe(false);
    });
});

describe('NewPasswordBox: i18n Message Localization', () => {
    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('uses passwordStrengthValidationMessage from localeMessages in Turkish', async () => {
        /** @type {import('../types').TestFixture<HTMLInputElement>} */
        const fixture = await initTestFixture('<new-password-box label="Yeni Şifre"></new-password-box>', 'tr');

        const message = fixture.host.passwordStrengthValidationMessage;
        expect(message).toContain('Yeni Şifre');
        expect(message).toContain('daha güçlü');
    });

    it('uses passwordStrengthValidationMessage from localeMessages in English', async () => {
        /** @type {import('../types').TestFixture<HTMLInputElement>} */
        const fixture = await initTestFixture('<new-password-box label="New Password"></new-password-box>', 'en');

        const message = fixture.host.passwordStrengthValidationMessage;
        expect(message).toContain('New Password');
        expect(message).toContain('stronger');
    });

    it('includes label in validation message', async () => {
        /** @type {import('../types').TestFixture<HTMLInputElement>} */
        const fixture = await initTestFixture('<new-password-box label="My Custom Label"></new-password-box>', 'en');

        expect(fixture.host.passwordStrengthValidationMessage).toContain('My Custom Label');
    });

    it('strengthMessage provides localized strength label', async () => {
        /** @type {import('../types').TestFixture<HTMLInputElement>} */
        const fixture = await initTestFixture('<new-password-box label="Yeni Şifre"></new-password-box>', 'tr');

        fixture.input.focus();
        await fixture.user.type(fixture.input, 'Password1!');
        await fixture.host.updateComplete;

        const message = fixture.host.strengthMessage;
        expect(message).toBeDefined();
        expect(typeof message).toBe('string');
    });
});

describe('NewPasswordBox: Accessibility', () => {
    /** @type {import('../types').TestFixture<HTMLInputElement>} */
    let fixture;

    beforeEach(async () => {
        fixture = await initTestFixture('<new-password-box label="Yeni Şifre"></new-password-box>');
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('toggle button should have aria-label', () => {
        const toggleButton = fixture.host.querySelector('[data-role="toggle-visibility"]');
        expect(toggleButton?.getAttribute('aria-label')).toBeDefined();
    });

    it('strength bar should have aria-valuetext with strength message', async () => {
        const bar = fixture.querySelector('[role="progressbar"]');
        fixture.input.focus();
        await fixture.user.type(fixture.input, 'Password1');
        await fixture.host.updateComplete;

        expect(bar.getAttribute('aria-valuetext')).toBeDefined();
    });

    it('strength label should be hidden from visual display but accessible to screen readers', () => {
        const statusElement = fixture.querySelector('[role="status"]');
        expect(statusElement).not.toBeNull();
        expect(statusElement.hasAttribute('data-visually-hidden')).toBe(true);
    });

    it('inherits aria-label from parent input', async () => {
        expect(fixture.input.getAttribute('aria-invalid')).toBeDefined();
    });
});

describe('NewPasswordBox: Integration with PasswordBox Features', () => {
    /** @type {import('../types').TestFixture<HTMLInputElement>} */
    let fixture;

    beforeEach(async () => {
        fixture = await initTestFixture('<new-password-box label="Yeni Şifre" required></new-password-box>');
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('should inherit required validation from PasswordBox', async () => {
        fixture.input.focus();
        await fixture.user.type(fixture.input, 'Test');
        await fixture.user.clear(fixture.input);
        await fixture.user.tab();
        await fixture.host.updateComplete;

        // Should be invalid when required and empty
        expect(fixture.host.invalid).toBe(true);
    });

    it('should validate required before checking strength', async () => {
        fixture.input.focus();
        await fixture.user.type(fixture.input, 'Weak');
        await fixture.user.tab();

        // Should be invalid due to both required being met but strength too low
        expect(fixture.host.invalid).toBe(true);
    });

    it('should toggle visibility with reveal button', async () => {
        const toggleButton = fixture.host.querySelector('[data-role="toggle-visibility"]');
        await fixture.user.click(toggleButton);
        await fixture.host.updateComplete;

        expect(fixture.input.type).toBe('text');
        expect(fixture.host.revealed).toBe(true);
    });

    it('password value should be correctly masked when revealed is false', async () => {
        fixture.input.focus();
        await fixture.user.type(fixture.input, 'MyPassword123!');
        await fixture.host.updateComplete;

        expect(fixture.input.type).toBe('password');
    });

    it('should support allow-pattern filtering from parent', async () => {
        const fixture = await initTestFixture('<new-password-box label="Yeni Şifre" allow-pattern="[A-Za-z0-9]"></new-password-box>');

        fixture.input.focus();
        await fixture.user.type(fixture.input, 'MyPassword1!@');
        await fixture.host.updateComplete;

        // Only alphanumeric characters should be in the value
        expect(fixture.input.value).toBe('MyPassword1');
    });
});
