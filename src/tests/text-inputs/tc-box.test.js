import TcBox from '../../components/text-input/tc-box.js';

defineElement('tc-box', TcBox);

describe('TcBox: Masking tests', () => {
    /** @type {import('../types').TestFixture<HTMLInputElement>} */
    let fixture;

    beforeEach(async () => {
        fixture = await initTestFixture('<tc-box field-id="tc" label="TC Kimlik"></tc-box>');
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('accepts only digits while typing', async () => {
        await fixture.user.type(fixture.input, '10a0b00000x146!');

        expect(fixture.input.value).toBe('10000000146');
        expect(fixture.host.value).toBe('10000000146');
    });

    it('does not allow more than 11 digits', async () => {
        await fixture.user.type(fixture.input, '10000000146123');

        expect(fixture.input.value).toBe('10000000146');
        expect(fixture.input.value.length).toBe(11);
    });

    it('shows underlay mask after input with remaining underscores', async () => {
        await fixture.user.type(fixture.input, '1000');
        await fixture.host.updateComplete;

        const underlay = fixture.host.querySelector('[data-role="underlay"]');
        expect(underlay).not.toBeNull();

        const parts = underlay.querySelectorAll('pre');
        expect(parts).toHaveLength(2);
        expect(parts[0].textContent).toBe('1000');
        expect(parts[1].textContent).toBe('_______');
    });
});

describe('TcBox: Validation tests', () => {
    /** @type {import('../types').TestFixture<HTMLInputElement>} */
    let fixture;

    beforeEach(async () => {
        fixture = await initTestFixture('<tc-box field-id="tc" label="TC Kimlik" required></tc-box>');
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('shows required validation when empty', async () => {
        await fixture.user.type(fixture.input, '3');
        await fixture.user.clear(fixture.input);
        await fixture.user.tab();

        expect(fixture.input.validity.valueMissing).toBe(true);
        expect(fixture.error).not.toBeNull();
        expect(fixture.error.textContent).toContain('zorunludur');
    });

    it('accepts a valid Turkish ID', async () => {
        await fixture.user.type(fixture.input, '10000000146');
        await fixture.user.tab();

        expect(fixture.error).toBeNull();
        expect(fixture.host.invalid).toBe(false);
    });

    it.each([
        ['rejects an invalid Turkish ID', '10000000145', 'Lütfen geçerli bir TC Kimlik giriniz.'],
        ['rejects an ID that starts with 0', '01234567890', 'Lütfen geçerli bir TC Kimlik giriniz.'],
        ['keeps minlength validation for incomplete values', '1234567890', 'en az'],
    ])('%s', async (_title, value, expectedErrorText) => {
        await fixture.user.type(fixture.input, value);
        await fixture.user.tab();

        const error = fixture.error;
        expect(error).not.toBeNull();
        expect(fixture.host.invalid).toBe(true);
        expect(error.textContent).toContain(expectedErrorText);
    });
});

describe('TcBox: Attribute forwarding', () => {
    it('forwards numeric and length constraints', async () => {
        const fixture = await initTestFixture('<tc-box field-id="tc" label="TC Kimlik"></tc-box>');
        const input = fixture.input;

        expect(input.getAttribute('inputmode')).toBe('numeric');
        expect(input.minLength).toBe(11);
        expect(input.maxLength).toBe(11);
        expect(input.getAttribute('pattern')).toBe(String.raw`\d{11}`);
    });
});
