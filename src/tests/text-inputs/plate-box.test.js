import PlateBox from '../../components/text-input/plate-box.js';

defineElement('plate-box', PlateBox);

describe('Masking tests', () => {
    /** @type {import('../types').TestFixture<HTMLInputElement>} */
    let fixture;

    /* <plate-box field-id="plate-no" label="Plaka Numarası" value="55  ty" required></plate-box> */

    beforeEach(async () => {
        const el = '<plate-box field-id="plate-no" label="Plaka Numarası"></plate-box>';
        fixture = await initTestFixture(el);
    });

    it.each([
        ['formats while typing full plate', 'type', '34ABC123', '34 ABC 123'],
        ['uppercases while typing', 'type', '34abc123', '34 ABC 123'],
    ])('%s', async (_description, action, value, expected) => {
        await fixture.user[action](fixture.input, value);
        expect(fixture.input.value).toBe(expected);
    });

    it('paste formats', async () => {
        await fixture.user.paste('06BC4567');
        expect(fixture.input.value).toBe('06 BC 4567');
    });

    it('handles backspace', async () => {
        await fixture.user.type(fixture.input, '34ABC1');
        await fixture.user.keyboard('{Backspace}');

        expect(fixture.input.value).toBe('34 ABC');
    });

    it('rejects invalid char on typing', async () => {
        await fixture.user.type(fixture.input, '34A@BC123'); // @ is invalid

        expect(fixture.input.value).toBe('34 ABC 123');
    });

    it('rejects invalid starting characters on typing', async () => {
        await fixture.user.type(fixture.input, 'gh'); // starting with char invalid

        expect(fixture.input.value).toBe(''); // should remain empty
    });

    // Geri silme (backspace) ile maskenin doğru güncellenmesi

    // Caret (imleç) pozisyonunun maskeleme sonrası doğru kalması (aradan karakter silme vb. durumlar)

    // Unmask fonksiyonunun doğru çalışması (maskesiz değer)
});

describe('Validating tests', () => {
    /** @type {import('../types').TestFixture<HTMLInputElement>} */
    let fixture;

    beforeEach(async () => {
        const el = '<plate-box field-id="plate-no" label="Plaka Numarası" required></plate-box>';
        fixture = await initTestFixture(el);
    });

    it('does not show required error before first input interaction', async () => {
        await fixture.user.tab(); // focus'tan çık

        expect(fixture.input.validity.valueMissing).toBe(true);
        expect(fixture.error).toBeNull();
        expect(fixture.host.invalid).toBe(false);
    });

    it('enforces maxlength', async () => {
        await fixture.user.type(fixture.input, '34ABC12345'); // uzun input
        await fixture.user.tab(); // focus'tan çık

        // native davranış: maxlength aşılamaz (fazla karakterler yazılamaz)
        expect(fixture.input.value.length).toBeLessThanOrEqual(fixture.input.maxLength);
    });

    it('enforces minlength', async () => {
        await fixture.user.type(fixture.input, '34A'); // 3 chars, min is 9
        await fixture.user.tab(); // focus'tan çık

        expect(fixture.input.value).toBe('34 A');
        expect(fixture.input.validity.valid).toBe(false);
    });

    it('adds aria-errormessage after first input interaction and invalid state', async () => {
        expect(fixture.error).toBeNull();
        expect(fixture.input.getAttribute('aria-errormessage')).toBeNull();

        await fixture.user.type(fixture.input, '3');
        await fixture.user.clear(fixture.input);
        await fixture.user.tab();
        await fixture.host.updateComplete;

        expect(fixture.error).not.toBeNull();
        expect(fixture.input.getAttribute('aria-errormessage')).toBe(fixture.host.errorId);
    });

    // Minimum karakter sayısı kontrolü ve hata mesajı

    // Pattern (regex) validasyonu ve hata mesajı)
});

// input, change, blur, invalid event'lerinin doğru tetiklenmesi ve state güncellenmesi
// Otomatik tamamlama (autocomplete), spellcheck, inputmode gibi attribute'ların doğru aktarılması
// Değer güncellenince update event'inin tetiklenmesi
// field-id yoksa hata
// label yoksa hata
// Erişilebilirlik (accessibility) attribute'larının doğru ayarlanması (aria-labelledby, aria-describedby vb.)
// Disabled state'in doğru uygulanması ve stil değişiklikleri
// Placeholder'ın doğru gösterilmesi
// Label'ın gizlenmesi (hide-label) durumunda erişilebilirliğin korunması
