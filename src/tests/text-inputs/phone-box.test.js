import PhoneBox from '../../components/text-input/phone-box.js';

defineElement('phone-box', PhoneBox);

describe('PhoneBox: Default properties', () => {
    /** @type {import('../types').TestFixture<HTMLInputElement>} */
    let fixture;

    beforeEach(async () => {
        fixture = await initTestFixture('<phone-box field-id="phone" label="Telefon"></phone-box>');
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('has type="tel"', () => {
        expect(fixture.input.type).toBe('tel');
    });

    it('has inputmode="tel"', () => {
        expect(fixture.input.getAttribute('inputmode')).toBe('tel');
    });

    it('has autocomplete="tel"', () => {
        expect(fixture.input.getAttribute('autocomplete')).toBe('tel');
    });

    it('has correct placeholder', () => {
        expect(fixture.input.placeholder).toBe('0(___) ___ __ __');
    });
});

describe('PhoneBox: Masking tests', () => {
    /** @type {import('../types').TestFixture<HTMLInputElement>} */
    let fixture;

    beforeEach(async () => {
        fixture = await initTestFixture('<phone-box field-id="phone" label="Telefon"></phone-box>');
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    it.each([
        ['02121234567', '0(212) 123 45 67', 'formats full number while typing'],
        ['0212', '0(212)', 'formats progressively as digits are typed (step 1)'],
        ['0212123', '0(212) 123', 'formats progressively as digits are typed (step 2)'],
        ['021212345', '0(212) 123 45', 'formats progressively as digits are typed (step 3)'],
        ['02121234567', '0(212) 123 45 67', 'formats progressively as digits are typed (step 4)'],
        ['0212abc123XY4567', '0(212) 123 45 67', 'rejects non-digit characters while typing'],
    ])('$2', async (input, expected) => {
        await fixture.user.type(fixture.input, input);

        expect(fixture.input.value).toBe(expected);
    });

    it('does not allow more than 11 digits', async () => {
        await fixture.user.type(fixture.input, '021212345679999');

        expect(fixture.input.value).toBe('0(212) 123 45 67');
    });

    it('handles backspace correctly', async () => {
        await fixture.user.type(fixture.input, '02121234567');
        await fixture.user.keyboard('{Backspace}');

        expect(fixture.input.value).toBe('0(212) 123 45 6');
    });

    it.each([
        ['2121234567', 'adds leading zero when number starts without it'],
        ['02121234567', 'paste: plain digits format (02121234567)'],
        ['0 212 123 45 67', 'paste: space-separated format (0 212 123 45 67)'],
        ['(0212) 123 45 67', 'paste: bracket format ((0212) 123 45 67)'],
        ['+90 212 123 45 67', 'paste: international format (+90 212 123 45 67)'],
        ['0-212-123-45-67', 'paste: dash-separated format (0-212-123-45-67)'],
    ])('$1', async input => {
        await fixture.user.paste(input);

        expect(fixture.input.value).toBe('0(212) 123 45 67');
    });
});

describe('PhoneBox: Underlay mask (ghost text)', () => {
    /** @type {import('../types').TestFixture<HTMLInputElement>} */
    let fixture;

    beforeEach(async () => {
        fixture = await initTestFixture('<phone-box field-id="phone" label="Telefon"></phone-box>');
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('shows underlay after typing begins', async () => {
        await fixture.user.type(fixture.input, '0212');

        const underlay = fixture.querySelector('[data-role="underlay"]');
        expect(underlay).not.toBeNull();
    });

    it('underlay typed part matches input value', async () => {
        await fixture.user.type(fixture.input, '0212');

        const parts = fixture.host.querySelectorAll('[data-role="underlay"] pre');
        expect(parts[0].textContent).toBe('0(212)');
    });

    it('underlay remaining part shows rest of placeholder', async () => {
        await fixture.user.type(fixture.input, '0212');
        await fixture.host.updateComplete;

        const parts = fixture.host.querySelectorAll('[data-role="underlay"] pre');
        expect(parts[1].textContent).toBe(' ___ __ __');
    });

    it('underlay shows full placeholder after value is cleared', async () => {
        await fixture.user.type(fixture.input, '0212');
        await fixture.user.clear(fixture.input);
        await fixture.host.updateComplete;

        const parts = fixture.host.querySelectorAll('[data-role="underlay"] pre');
        expect(parts[0].textContent).toBe('');
        expect(parts[1].textContent).toBe('0(___) ___ __ __');
    });
});

describe('PhoneBox: Validation tests', () => {
    /** @type {import('../types').TestFixture<HTMLInputElement>} */
    let fixture;

    beforeEach(async () => {
        fixture = await initTestFixture('<phone-box field-id="phone" label="Telefon" required></phone-box>');
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('does not show error before first interaction', async () => {
        await fixture.user.tab();

        expect(fixture.error).toBeNull();
        expect(fixture.host.invalid).toBe(false);
    });

    it('shows required error when cleared after typing', async () => {
        await fixture.user.type(fixture.input, '0212');
        await fixture.user.clear(fixture.input);
        await fixture.user.tab();

        expect(fixture.input.validity.valueMissing).toBe(true);
        expect(fixture.error).not.toBeNull();
        expect(fixture.error.textContent).toContain('zorunludur');
    });

    it('shows pattern error for incomplete phone number', async () => {
        await fixture.user.type(fixture.input, '0212123');
        await fixture.user.tab();

        expect(fixture.input.validity.patternMismatch).toBe(true);
        expect(fixture.error).not.toBeNull();
    });

    it('passes validation for complete and correctly formatted number', async () => {
        await fixture.user.type(fixture.input, '02121234567');
        await fixture.user.tab();

        expect(fixture.input.validity.valid).toBe(true);
        expect(fixture.error).toBeNull();
        expect(fixture.host.invalid).toBe(false);
    });

    it('sets aria-errormessage when validation fails', async () => {
        await fixture.user.type(fixture.input, '0212');
        await fixture.user.clear(fixture.input);
        await fixture.user.tab();
        await fixture.host.updateComplete;

        expect(fixture.input.getAttribute('aria-errormessage')).toBe(fixture.host.errorId);
    });
});
