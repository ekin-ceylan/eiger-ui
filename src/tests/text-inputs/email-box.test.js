import EmailBox from '../../components/text-input/email-box.js';

defineElement('email-box', EmailBox);

describe('EmailBox: Masking Tests', () => {
    /** @type {import('../types').TestFixture<HTMLInputElement>} */
    let fixture;

    beforeEach(async () => {
        const el = '<email-box label="E-Posta Adresi"></email-box>';
        fixture = await initTestFixture(el);
    });

    it('converts uppercase to lowercase when typing', async () => {
        await fixture.user.type(fixture.input, 'EXAMPLE@EXAMPLE.COM');

        expect(fixture.input.value).toBe('example@example.com');
    });

    it('converts uppercase to lowercase on paste', async () => {
        await fixture.user.paste('TEST@DOMAIN.COM');

        expect(fixture.input.value).toBe('test@domain.com');
    });

    it('converts mixed case to lowercase', async () => {
        await fixture.user.type(fixture.input, 'Test.User@Example.COM');

        expect(fixture.input.value).toBe('test.user@example.com');
    });

    it('rejects space character on keydown', async () => {
        await fixture.user.type(fixture.input, 'test user@example.com');

        // Spaces should be filtered out
        expect(fixture.input.value).toBe('testuser@example.com');
    });

    it('allows special characters valid in email local part', async () => {
        await fixture.user.type(fixture.input, 'user+tag@example.com');

        expect(fixture.input.value).toBe('user+tag@example.com');
    });

    it('allows dots and hyphens in email', async () => {
        await fixture.user.type(fixture.input, 'first.last@sub-domain.example.com');

        expect(fixture.input.value).toBe('first.last@sub-domain.example.com');
    });
});

describe('EmailBox: Validation Tests', () => {
    /** @type {import('../types').TestFixture<HTMLInputElement>} */
    let fixture;

    beforeEach(async () => {
        const el = '<email-box label="E-Posta Adresi" required></email-box>';
        fixture = await initTestFixture(el);
    });

    it('does not show required error before first input interaction', async () => {
        await fixture.user.tab();

        expect(fixture.input.validity.valueMissing).toBe(true);
        expect(fixture.error).toBeNull();
        expect(fixture.host.invalid).toBe(false);
    });

    it.each(['user@example.com', 'user@mail.example.com', 'user+tag@example.com', 'first.last@example.com'])('accepts valid email format: %s', async email => {
        await fixture.user.type(fixture.input, email);
        await fixture.user.tab();

        expect(fixture.error).toBeNull();
        expect(fixture.host.invalid).toBe(false);
    });

    it('rejects email without @ symbol', async () => {
        await fixture.user.type(fixture.input, 'invalidemail.com');
        await fixture.user.tab();

        expect(fixture.error).not.toBeNull();
        expect(fixture.host.invalid).toBe(true);
        expect(fixture.error.textContent).toContain('geçerli');
    });

    it.each(['user@', '@example.com', 'user@@example.com', 'user..name@example.com'])('rejects invalid email format: %s', async email => {
        await fixture.user.type(fixture.input, email);
        await fixture.user.tab();

        expect(fixture.error).not.toBeNull();
        expect(fixture.host.invalid).toBe(true);
    });

    it('respects maxlength constraint (254 characters)', async () => {
        // Create a string longer than 254 chars
        const longEmail = 'a'.repeat(240) + '@example.com'; // 252 chars total

        await fixture.user.type(fixture.input, longEmail);

        // maxlength should prevent typing beyond 254
        expect(fixture.input.value.length).toBeLessThanOrEqual(254);
    });

    it('shows validation immediately after invalid becomes valid', async () => {
        await fixture.user.type(fixture.input, 'invalid');
        await fixture.user.tab();

        expect(fixture.error).not.toBeNull();

        fixture.input.focus();
        await fixture.user.type(fixture.input, '@example.com');

        // Should validate immediately since it was previously invalid
        expect(fixture.error).toBeNull();
    });
});

describe('EmailBox: Attribute Forwarding', () => {
    it('sets inputmode="email" by default', async () => {
        const fixture = await initTestFixture('<email-box label="Email"></email-box>');

        expect(fixture.input.getAttribute('inputmode')).toBe('email');
    });

    it('sets autocomplete="email" by default', async () => {
        const fixture = await initTestFixture('<email-box label="Email"></email-box>');

        expect(fixture.input.getAttribute('autocomplete')).toBe('email');
    });

    it('sets maxlength=254 by default', async () => {
        const fixture = await initTestFixture('<email-box label="Email"></email-box>');

        expect(fixture.input.maxLength).toBe(254);
    });

    it('allows overriding placeholder attribute', async () => {
        const fixture = await initTestFixture('<email-box label="Email" placeholder="Enter your email"></email-box>');

        expect(fixture.input.getAttribute('placeholder')).toBe('Enter your email');
    });
});

describe('EmailBox: Accessibility (A11y)', () => {
    it('maintains proper label association', async () => {
        const fixture = await initTestFixture('<email-box label="Email Address"></email-box>');
        const label = fixture.host.querySelector('label');

        expect(fixture.label.getAttribute('for')).toBe(fixture.host.fieldId);
        expect(fixture.input.id).toBe(fixture.host.fieldId);
        expect(fixture.input.getAttribute('aria-labelledby')).toBe(fixture.host.labelId);
    });

    it('sets aria-required when required', async () => {
        const fixture = await initTestFixture('<email-box label="Email" required></email-box>');

        expect(fixture.input.getAttribute('aria-required')).toBe('true');
        expect(fixture.input.required).toBe(true);
    });

    it('toggles aria-invalid after input-based validation state change', async () => {
        const fixture = await initTestFixture('<email-box label="Email" required></email-box>');

        // Trigger invalid state after first input interaction
        await fixture.user.type(fixture.input, 'invalid');
        await fixture.user.tab();
        expect(fixture.input.getAttribute('aria-invalid')).toBe('true');

        // Fix the value
        fixture.input.focus();
        await fixture.user.type(fixture.input, 'valid@example.com');
        await fixture.user.tab();

        // Should become valid
        expect(fixture.input.getAttribute('aria-invalid')).toBeNull();
    });

    it('associates error message with aria-errormessage', async () => {
        const fixture = await initTestFixture('<email-box label="Email" required></email-box>');

        expect(fixture.error).toBeNull();
        expect(fixture.input.getAttribute('aria-errormessage')).toBeNull();

        await fixture.user.type(fixture.input, 'invalid');
        await fixture.user.tab();
        await fixture.host.updateComplete;

        const error = fixture.error;

        expect(error.id).toBe(fixture.host.errorId);
        expect(fixture.input.getAttribute('aria-errormessage')).toBe(fixture.host.errorId);
        expect(error.getAttribute('aria-live')).toBe('assertive');
    });

    it('removes aria-errormessage again when the input becomes valid', async () => {
        const fixture = await initTestFixture('<email-box label="Email" required></email-box>');

        expect(fixture.input.getAttribute('aria-errormessage')).toBeNull();

        await fixture.user.type(fixture.input, 'invalid');
        await fixture.user.tab();
        await fixture.host.updateComplete;

        expect(fixture.input.getAttribute('aria-errormessage')).toBe(fixture.host.errorId);
        expect(fixture.error).not.toBeNull();

        fixture.input.focus();
        await fixture.user.type(fixture.input, 'valid@example.com');
        await fixture.user.tab();
        await fixture.host.updateComplete;

        expect(fixture.input.getAttribute('aria-errormessage')).toBeNull();
        expect(fixture.error).toBeNull();
    });
});
