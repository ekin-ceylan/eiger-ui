import PasswordBox from '../../components/text-input/password-box.js';

defineElement('password-box', PasswordBox);

describe('PasswordBox: Initial State', () => {
    /** @type {import('../types').TestFixture<HTMLInputElement>} */
    let fixture;

    beforeEach(async () => {
        fixture = await initTestFixture('<password-box label="Şifre"></password-box>');
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('input type should be password by default', () => {
        expect(fixture.input.type).toBe('password');
    });

    it('revealed property should be false by default', () => {
        expect(fixture.host.revealed).toBe(false);
    });

    it('revealed attribute should not be present by default', () => {
        expect(fixture.host.hasAttribute('revealed')).toBe(false);
    });

    it('autocomplete should be current-password', () => {
        expect(fixture.input.autocomplete).toBe('current-password');
    });

    it('toggle button should be rendered', () => {
        const btnToggle = fixture.querySelector('[data-role="toggle-visibility"]');
        expect(btnToggle).not.toBeNull();
    });
});

describe('PasswordBox: Toggle Visibility', () => {
    /** @type {import('../types').TestFixture<HTMLInputElement>} */
    let fixture;

    beforeEach(async () => {
        fixture = await initTestFixture('<password-box label="Şifre"></password-box>');
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('clicking toggle button reveals the password', async () => {
        const btnToggle = fixture.querySelector('[data-role="toggle-visibility"]');
        await fixture.user.click(btnToggle);
        await fixture.host.updateComplete;

        expect(fixture.input.type).toBe('text');
        expect(fixture.host.revealed).toBe(true);
    });

    it('clicking toggle button again hides the password', async () => {
        const btnToggle = fixture.querySelector('[data-role="toggle-visibility"]');
        await fixture.user.click(btnToggle);
        await fixture.host.updateComplete;
        await fixture.user.click(btnToggle);
        await fixture.host.updateComplete;

        expect(fixture.input.type).toBe('password');
        expect(fixture.host.revealed).toBe(false);
    });

    it('revealed attribute reflects to DOM when revealed is true', async () => {
        const btnToggle = fixture.querySelector('[data-role="toggle-visibility"]');
        await fixture.user.click(btnToggle);
        await fixture.host.updateComplete;

        expect(fixture.host.hasAttribute('revealed')).toBe(true);
    });

    it('revealed attribute is removed from DOM when hidden again', async () => {
        const btnToggle = fixture.querySelector('[data-role="toggle-visibility"]');
        await fixture.user.click(btnToggle);
        await fixture.host.updateComplete;
        await fixture.user.click(btnToggle);
        await fixture.host.updateComplete;

        expect(fixture.host.hasAttribute('revealed')).toBe(false);
    });
});

describe('PasswordBox: Accessibility', () => {
    /** @type {import('../types').TestFixture<HTMLInputElement>} */
    let fixture;

    beforeEach(async () => {
        fixture = await initTestFixture('<password-box label="Şifre"></password-box>');
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('toggle button aria-label should show reveal label when password is hidden', async () => {
        await fixture.host.updateComplete;
        const button = fixture.querySelector('[data-role="toggle-visibility"]');

        expect(button.getAttribute('aria-label')).toBe(fixture.host.revealPasswordAriaLabel);
    });

    it('toggle button aria-label should show hide label when password is revealed', async () => {
        const button = fixture.querySelector('[data-role="toggle-visibility"]');
        await fixture.user.click(button);
        await fixture.host.updateComplete;

        expect(button.getAttribute('aria-label')).toBe(fixture.host.hidePasswordAriaLabel);
    });

    it('toggle button aria-pressed should be false when password is hidden', async () => {
        await fixture.host.updateComplete;

        const button = fixture.querySelector('[data-role="toggle-visibility"]');
        expect(button.getAttribute('aria-pressed')).toBe('false');
    });

    it('toggle button aria-pressed should be true when password is revealed', async () => {
        const button = fixture.querySelector('[data-role="toggle-visibility"]');
        await fixture.user.click(button);
        await fixture.host.updateComplete;

        expect(button.getAttribute('aria-pressed')).toBe('true');
    });
});

describe('PasswordBox: Validation', () => {
    /** @type {import('../types').TestFixture<HTMLInputElement>} */
    let fixture;

    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('required validation shows error when empty and blurred', async () => {
        fixture = await initTestFixture('<password-box label="Şifre" required></password-box>');

        await fixture.user.type(fixture.input, 'x');
        await fixture.user.clear(fixture.input);
        await fixture.user.tab();

        expect(fixture.error).not.toBeNull();
        expect(fixture.host.invalid).toBe(true);
    });

    it('minlength validation shows error when value is too short', async () => {
        fixture = await initTestFixture('<password-box label="Şifre" required minlength="8"></password-box>');

        await fixture.user.type(fixture.input, 'abc');
        await fixture.user.tab();

        expect(fixture.error).not.toBeNull();
        expect(fixture.error.textContent).toContain('en az');
    });

    it('maxlength prevents input beyond the limit', async () => {
        fixture = await initTestFixture('<password-box label="Şifre" maxlength="5"></password-box>');

        await fixture.user.type(fixture.input, 'abcdefgh');

        expect(fixture.input.value).toBe('abcde');
        expect(fixture.error).toBeNull();
    });

    it('no error when valid value is entered and blurred', async () => {
        fixture = await initTestFixture('<password-box label="Şifre" required minlength="8"></password-box>');

        await fixture.user.type(fixture.input, 'ValidPass1');
        await fixture.user.tab();

        expect(fixture.error).toBeNull();
        expect(fixture.host.invalid).toBe(false);
    });
});

describe('PasswordBox: allow-pattern', () => {
    /** @type {import('../types').TestFixture<HTMLInputElement>} */
    let fixture;

    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('blocks whitespace characters when allow-pattern="\\S"', async () => {
        fixture = await initTestFixture('<password-box label="Şifre" allow-pattern="\\S"></password-box>');

        await fixture.user.type(fixture.input, 'abc def');

        expect(fixture.input.value).toBe('abcdef');
    });

    it('allows all non-whitespace characters when allow-pattern="\\S"', async () => {
        fixture = await initTestFixture('<password-box label="Şifre" allow-pattern="\\S"></password-box>');

        await fixture.user.type(fixture.input, 'P@ss!123');

        expect(fixture.input.value).toBe('P@ss!123');
    });
});
