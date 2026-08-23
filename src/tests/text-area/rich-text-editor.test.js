import RichTextEditor from '../../components/text-area/rich-text-editor.js';

defineElement('rich-text-editor', RichTextEditor);

describe('Rich text editor - Component / Value Contract', () => {
    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('RT-001 opens an editor when the component is created', async () => {
        const fixture = await initTestFixture('<rich-text-editor label="Description"></rich-text-editor>');

        expect(fixture.host.editor).not.toBeNull();
        expect(fixture.querySelector('[data-role="editor"] [contenteditable="true"]')).not.toBeNull();
    });

    it('RT-002 loads the initial HTML value into the editor', async () => {
        const host = document.createElement('rich-text-editor');
        host.setAttribute('label', 'Description');
        host.value = '<p>Hello <strong>world</strong></p>';
        document.body.appendChild(host);
        await host.updateComplete;
        await host.updateComplete;

        expect(host.editor.getHTML()).toBe('<p>Hello <strong>world</strong></p>');
        expect(host.value).toBe('<p>Hello <strong>world</strong></p>');
        expect(host.inputElement.value).toBe('<p>Hello <strong>world</strong></p>');
    });

    it('RT-003 preserves a value assigned before the component is connected', async () => {
        const host = document.createElement('rich-text-editor');
        host.setAttribute('label', 'Description');
        host.value = '<p>Before connect</p>';
        document.body.appendChild(host);

        await host.updateComplete;

        expect(host.editor.getHTML()).toBe('<p>Before connect</p>');
        expect(host.value).toBe('<p>Before connect</p>');
    });

    it('RT-004 reflects a programmatic value change in the editor', async () => {
        const fixture = await initTestFixture('<rich-text-editor label="Description"></rich-text-editor>');

        fixture.host.value = '<h2>Updated</h2>';
        await fixture.host.updateComplete;

        expect(fixture.host.editor.getHTML()).toBe('<h2>Updated</h2><p></p>');
        expect(fixture.input.value).toBe('<h2>Updated</h2>');
    });

    it('RT-005 updates the component value after a user edit', async () => {
        const fixture = await initTestFixture('<rich-text-editor label="Description"></rich-text-editor>');

        fixture.host.editor.commands.insertContent('Typed text');
        await fixture.host.updateComplete;

        expect(fixture.host.value).toBe('<p>Typed text</p>');
        expect(fixture.input.value).toBe('<p>Typed text</p>');
    });

    it('RT-006 does not dispatch input for a programmatic value assignment', async () => {
        const fixture = await initTestFixture('<rich-text-editor label="Description"></rich-text-editor>');
        let inputEvents = 0;
        let updateEvents = 0;

        fixture.host.addEventListener('input', () => inputEvents++);
        fixture.host.addEventListener('update', () => updateEvents++);
        fixture.host.value = '<p>Programmatic</p>';
        await fixture.host.updateComplete;

        expect(inputEvents).toBe(0);
        expect(updateEvents).toBe(1);
    });

    it('RT-007 does not create a transaction or event when the same value is assigned again', async () => {
        const fixture = await initTestFixture('<rich-text-editor label="Description" value="<p>Same</p>"></rich-text-editor>');
        const setContent = vi.spyOn(fixture.host.editor.commands, 'setContent');
        let updateEvents = 0;

        fixture.host.addEventListener('update', () => updateEvents++);
        fixture.host.value = '<p>Same</p>';
        await fixture.host.updateComplete;

        expect(setContent).not.toHaveBeenCalled();
        expect(updateEvents).toBe(0);
    });

    it.each([
        ['', 'empty editor'],
        ['<p></p>', 'an empty paragraph'],
    ])('RT-008/RT-009 normalizes %s to the canonical empty value (%s)', async value => {
        const fixture = await initTestFixture('<rich-text-editor label="Description"></rich-text-editor>');
        fixture.host.value = value;
        await fixture.host.updateComplete;

        expect(fixture.host.editor.isEmpty).toBe(true);
        expect(fixture.host.editor.getHTML()).toBe('<p></p>');
        expect(fixture.host.value).toBe('');
        expect(fixture.input.value).toBe('');
    });

    it('RT-010 normalizes whitespace-only content to the canonical empty value', async () => {
        const fixture = await initTestFixture('<rich-text-editor label="Description"></rich-text-editor>');

        fixture.host.editor.commands.setContent('<p> </p>');
        await fixture.host.updateComplete;

        expect(fixture.host.editor.isEmpty).toBe(true);
        expect(fixture.host.value).toBe('');
        expect(fixture.input.value).toBe('');
    });

    it('RT-011 destroys the editor when the component is disconnected', async () => {
        const fixture = await initTestFixture('<rich-text-editor label="Description"></rich-text-editor>');
        const editor = fixture.host.editor;
        const destroy = vi.spyOn(editor, 'destroy');

        fixture.host.remove();

        expect(destroy).toHaveBeenCalledOnce();
        expect(fixture.host.editor).toBeNull();
    });

    it('RT-012 creates a working editor after reconnect', async () => {
        const fixture = await initTestFixture('<rich-text-editor label="Description"></rich-text-editor>');

        fixture.host.remove();
        document.body.appendChild(fixture.host);
        await fixture.host.updateComplete;

        expect(fixture.host.editor).not.toBeNull();
        fixture.host.editor.commands.insertContent('Reconnected');
        await fixture.host.updateComplete;

        expect(fixture.host.value).toBe('<p>Reconnected</p>');
    });

    it('RT-013 keeps multiple editor instances independent', async () => {
        const first = await initTestFixture('<rich-text-editor label="First"></rich-text-editor>');
        const secondHost = document.createElement('rich-text-editor');
        secondHost.setAttribute('label', 'Second');
        first.form.appendChild(secondHost);
        await secondHost.updateComplete;

        first.host.editor.commands.insertContent('First value');
        await first.host.updateComplete;

        expect(first.host.value).toBe('<p>First value</p>');
        expect(secondHost.value).toBe('');
        expect(secondHost.editor.getHTML()).toBe('<p></p>');
    });

    it('RT-014 keeps toolbar and editor state isolated between instances', async () => {
        const first = await initTestFixture('<rich-text-editor label="First"></rich-text-editor>');
        const secondHost = document.createElement('rich-text-editor');
        secondHost.setAttribute('label', 'Second');
        first.form.appendChild(secondHost);
        await secondHost.updateComplete;

        first.host.editor.commands.setContent('<p><strong>First</strong></p>');
        await first.host.updateComplete;

        expect(first.host.editor.isActive('bold')).toBe(true);
        expect(secondHost.editor.isActive('bold')).toBe(false);
        expect(secondHost.activeBlock).toBe('p');
    });
});

/*
# Rich Text Editor Test Case Listesi

## 1. Component / Value Contract

* [ ] RT-001 — Component boş oluşturulduğunda editor açılır.
* [ ] RT-002 — Başlangıç `value` HTML'i editörde doğru gösterilir.
* [ ] RT-003 — Component connect olmadan önce verilen `value` doğru yüklenir.
* [ ] RT-004 — Connect olduktan sonra programatik `value` değişikliği editöre yansır.
* [ ] RT-005 — Kullanıcı edit yaptığında component `value` güncellenir.
* [ ] RT-006 — Programatik `value` ataması kullanıcı input'u gibi değerlendirilmez.
* [ ] RT-007 — Aynı `value` tekrar atanırsa gereksiz transaction/event oluşmaz.
* [ ] RT-008 — Boş editor component seviyesinde canonical boş değere normalize edilir.
* [ ] RT-009 — `<p></p>` boş içerik olarak kabul edilir.
* [ ] RT-010 — Yalnız whitespace içeren içerik için boşluk semantiği doğru çalışır.
* [ ] RT-011 — Component DOM'dan kaldırıldığında Tiptap instance destroy edilir.
* [ ] RT-012 — Remove/reconnect sonrası editor tekrar düzgün çalışır.
* [ ] RT-013 — Sayfada birden fazla editor birbirinden bağımsız çalışır.
* [ ] RT-014 — Bir editorün toolbar, selection veya state'i diğer editorü etkilemez.

---

## 2. Form Integration

* [ ] FORM-001 — `name` varsa form submit sırasında editor değeri gönderilir.
* [ ] FORM-002 — `name` yoksa form verisine dahil edilmez.
* [ ] FORM-003 — Başlangıç değeri submit edilir.
* [ ] FORM-004 — Kullanıcı tarafından değiştirilmiş değer submit edilir.
* [ ] FORM-005 — `form.reset()` başlangıç değerini geri yükler.
* [ ] FORM-006 — Reset sonrası editor DOM'u da başlangıç değerine döner.
* [ ] FORM-007 — `disabled` durumda edit yapılamaz.
* [ ] FORM-008 — `disabled` durumda değer form submit'e dahil edilmez.
* [ ] FORM-009 — `readonly` durumda içerik değiştirilemez.
* [ ] FORM-010 — `readonly` durumda değer form submit'e dahil edilir.
* [ ] FORM-011 — `required` + boş editor invalid olur.
* [ ] FORM-012 — `required` + `<p></p>` invalid olur.
* [ ] FORM-013 — Gerçek içerik girildiğinde validity düzelir.
* [ ] FORM-014 — Programatik `value` değişimi validity durumunu günceller.
* [ ] FORM-015 — `maxlength` tanımlıysa limit uygulanır.
* [ ] FORM-016 — `maxlength` kaldırıldığında limit kaldırılır.

---

## 3. Placeholder

* [ ] PLACE-001 — Boş editor placeholder gösterir.
* [ ] PLACE-002 — İçerik girildiğinde placeholder kaybolur.
* [ ] PLACE-003 — İçerik silinip editor tekrar boşaldığında placeholder geri gelir.
* [ ] PLACE-004 — Programatik value verilince placeholder kaybolur.
* [ ] PLACE-005 — Programatik value temizlenince placeholder geri gelir.
* [ ] PLACE-006 — Placeholder metni sonradan değiştirilebilir.
* [ ] PLACE-007 — Placeholder gerçek editor içeriğine serialize edilmez.
* [ ] PLACE-008 — Placeholder form value içine girmez.

---

## 4. Character Count / Max Length

* [ ] COUNT-001 — Boş editor karakter sayısı 0'dır.
* [ ] COUNT-002 — Normal metin doğru sayılır.
* [ ] COUNT-003 — Türkçe karakterler doğru sayılır.
* [ ] COUNT-004 — Emoji sayımı belirlenen stratejiye göre doğrudur.
* [ ] COUNT-005 — Rich-text mark'ları karakter sayısını artırmaz.
* [ ] COUNT-006 — Paragraph/block yapısı karakter sayımını beklenmedik şekilde etkilemez.
* [ ] COUNT-007 — Paste işlemi sayaç değerini günceller.
* [ ] COUNT-008 — Undo/redo sayaç değerini günceller.
* [ ] COUNT-009 — Programatik value değişimi sayaç değerini günceller.
* [ ] COUNT-010 — `maxlength` aşılamaz.
* [ ] COUNT-011 — Limitteyken silme işlemi yapılabilir.
* [ ] COUNT-012 — Limit aşan paste işlemi belirlenen politikaya göre engellenir veya kırpılır.

---

## 5. Basic Editing

* [ ] EDIT-001 — Normal karakter yazılabilir.
* [ ] EDIT-002 — Türkçe karakterler yazılabilir.
* [ ] EDIT-003 — Unicode karakterler yazılabilir.
* [ ] EDIT-004 — Emoji yazılabilir.
* [ ] EDIT-005 — Enter yeni paragraph oluşturur.
* [ ] EDIT-006 — Shift+Enter hard break oluşturur.
* [ ] EDIT-007 — Backspace karakter siler.
* [ ] EDIT-008 — Delete karakter siler.
* [ ] EDIT-009 — Seçili metnin üzerine yazılabilir.
* [ ] EDIT-010 — Ctrl/Cmd+A tüm editor içeriğini seçer.
* [ ] EDIT-011 — Paragraph sınırında Backspace doğru merge davranışı gösterir.
* [ ] EDIT-012 — Heading/list gibi block sınırlarında Backspace document'i bozmaz.
* [ ] EDIT-013 — Boş block'ta Backspace beklenen block dönüşümünü yapar.
* [ ] EDIT-014 — Hızlı yazımda karakter kaybı olmaz.
* [ ] EDIT-015 — IME composition sırasında içerik bozulmaz.
* [ ] EDIT-016 — IME composition sırasında gereksiz ara input/value event'leri dış API'yi bozmaz.

---

## 6. Focus / Blur

* [ ] FOCUS-001 — Editor focus alabilir.
* [ ] FOCUS-002 — Editor blur olabilir.
* [ ] FOCUS-003 — Toolbar kullanımı editor selection'ını gereksiz yere kaybettirmez.
* [ ] FOCUS-004 — Toolbar command sonrası focus uygun şekilde editöre döner.
* [ ] FOCUS-005 — Blur/focus sonrası cursor beklenmedik konuma sıçramaz.
* [ ] FOCUS-006 — Disabled editor focus alamaz.
* [ ] FOCUS-007 — Readonly editor focus alabilir ancak içerik değiştiremez.
* [ ] FOCUS-008 — Birden fazla editor arasında focus geçişi doğru çalışır.

---

## 7. Selection

* [ ] SEL-001 — Collapsed cursor doğru algılanır.
* [ ] SEL-002 — Tek mark içindeki selection doğru algılanır.
* [ ] SEL-003 — Mixed-format selection doğru algılanır.
* [ ] SEL-004 — Selection birden fazla block'u kapsayabilir.
* [ ] SEL-005 — Mouse selection çalışır.
* [ ] SEL-006 — Shift+Arrow keyboard selection çalışır.
* [ ] SEL-007 — Toolbar butonuna basınca selection kaybolmaz.
* [ ] SEL-008 — Formatting işleminden sonra selection korunur.
* [ ] SEL-009 — Editor dışına click edildiğinde selection state'i tutarlı kalır.
* [ ] SEL-010 — Select-all sonrası formatting doğru uygulanır.

---

## 8. Inline Formatting

Aşağıdaki case'ler Bold, Italic, Underline, Strike ve Inline Code için parametrik çalıştırılabilir.

* [ ] MARK-001 — Selected text'e mark uygulanır.
* [ ] MARK-002 — Mevcut mark kaldırılır.
* [ ] MARK-003 — Collapsed cursor'da mark aktif edilir.
* [ ] MARK-004 — Mark aktifken yazılan yeni text mark'lı olur.
* [ ] MARK-005 — Mark kapatıldıktan sonra yazılan yeni text normal olur.
* [ ] MARK-006 — Birden fazla mark aynı text üzerinde birlikte çalışır.
* [ ] MARK-007 — Nested mark HTML round-trip'te korunur.
* [ ] MARK-008 — Mixed selection üzerinde toggle deterministik davranır.
* [ ] MARK-009 — Undo mark işlemini geri alır.
* [ ] MARK-010 — Redo mark işlemini tekrar uygular.
* [ ] MARK-011 — Toolbar active state doğru görünür.
* [ ] MARK-012 — Unsupported block içinde mark uygulanmaz veya doğru şekilde engellenir.

---

## 9. Headings / Paragraphs / Blocks

* [ ] BLOCK-001 — Paragraph oluşturulur.
* [ ] BLOCK-002 — Paragraph heading'e dönüştürülür.
* [ ] BLOCK-003 — Heading tekrar paragraph'a dönüştürülür.
* [ ] BLOCK-004 — Desteklenen tüm heading seviyeleri çalışır.
* [ ] BLOCK-005 — Paragraph blockquote'a dönüştürülür.
* [ ] BLOCK-006 — Blockquote'tan çıkılabilir.
* [ ] BLOCK-007 — Code block oluşturulur.
* [ ] BLOCK-008 — Code block'tan çıkılabilir.
* [ ] BLOCK-009 — Code block içinde inline formatting politikası doğru uygulanır.
* [ ] BLOCK-010 — Horizontal rule eklenir.
* [ ] BLOCK-011 — Horizontal rule öncesinde yazılabilir.
* [ ] BLOCK-012 — Horizontal rule sonrasında yazılabilir.
* [ ] BLOCK-013 — Block dönüşümleri undo/redo edilebilir.

---

## 10. Lists

* [ ] LIST-001 — Bullet list oluşturulur.
* [ ] LIST-002 — Ordered list oluşturulur.
* [ ] LIST-003 — List item Enter ile bölünür.
* [ ] LIST-004 — Boş list item Enter ile listeden çıkar.
* [ ] LIST-005 — List paragraph'a dönüştürülebilir.
* [ ] LIST-006 — Nested list oluşturulabilir.
* [ ] LIST-007 — Tab ile list item indent edilir.
* [ ] LIST-008 — Shift+Tab ile list item outdent edilir.
* [ ] LIST-009 — Nested list copy/paste çalışır.
* [ ] LIST-010 — List undo/redo çalışır.
* [ ] LIST-011 — List sonrasında normal paragraph oluşturulabilir.
* [ ] LIST-012 — Birden fazla list item selection üzerinde formatting çalışır.

---

## 11. Text Alignment

* [ ] ALIGN-001 — Paragraph left align olur.
* [ ] ALIGN-002 — Paragraph center align olur.
* [ ] ALIGN-003 — Paragraph right align olur.
* [ ] ALIGN-004 — Paragraph justify olur.
* [ ] ALIGN-005 — Heading alignment çalışır.
* [ ] ALIGN-006 — Unsupported node'a alignment uygulanmaz.
* [ ] ALIGN-007 — Multi-block selection alignment çalışır.
* [ ] ALIGN-008 — Alignment unset/reset edilebilir.
* [ ] ALIGN-009 — Alignment HTML round-trip'te korunur.
* [ ] ALIGN-010 — Toolbar active state doğru görünür.
* [ ] ALIGN-011 — Firefox'ta justify davranışı beklenen şekilde çalışır.

---

## 12. Undo / Redo

* [ ] HIST-001 — Typing undo edilir.
* [ ] HIST-002 — Delete undo edilir.
* [ ] HIST-003 — Formatting undo edilir.
* [ ] HIST-004 — Paste undo edilir.
* [ ] HIST-005 — Link işlemi undo edilir.
* [ ] HIST-006 — Image insertion undo edilir.
* [ ] HIST-007 — Table insertion undo edilir.
* [ ] HIST-008 — Redo işlemi tekrar uygular.
* [ ] HIST-009 — Undo sonrası yeni edit redo stack'ini temizler.
* [ ] HIST-010 — Initial content history'de kullanıcı işlemi olarak bulunmaz.
* [ ] HIST-011 — Programatik `value` atamasının history davranışı belirlenen sözleşmeye uyar.
* [ ] HIST-012 — Hızlı art arda undo/redo document'i bozmaz.

---

## 13. Links

* [ ] LINK-001 — Selected text'e link eklenir.
* [ ] LINK-002 — Mevcut link URL'i değiştirilebilir.
* [ ] LINK-003 — Link kaldırılabilir.
* [ ] LINK-004 — Link text'i değiştirilebilir.
* [ ] LINK-005 — URL yazıldığında autolink davranışı doğru çalışır.
* [ ] LINK-006 — URL paste edildiğinde autolink davranışı doğru çalışır.
* [ ] LINK-007 — Selected text üzerine URL paste davranışı belirlenen sözleşmeye uyar.
* [ ] LINK-008 — `https://` URL kabul edilir.
* [ ] LINK-009 — `http://` URL politikaya göre kabul/reddedilir.
* [ ] LINK-010 — Relative URL politikaya göre kabul/reddedilir.
* [ ] LINK-011 — `mailto:` politikaya göre kabul/reddedilir.
* [ ] LINK-012 — `tel:` politikaya göre kabul/reddedilir.
* [ ] LINK-013 — Boş href link oluşturmaz.
* [ ] LINK-014 — Baştaki/sondaki whitespace normalize edilir.
* [ ] LINK-015 — `javascript:` URL reddedilir.
* [ ] LINK-016 — Mixed-case tehlikeli scheme reddedilir.
* [ ] LINK-017 — Control character içeren tehlikeli URL bypass edemez.
* [ ] LINK-018 — Output link'te beklenen `rel` attribute'u bulunur.
* [ ] LINK-019 — `_blank` target politikası doğru uygulanır.
* [ ] LINK-020 — Edit modunda link click yanlışlıkla navigation başlatmaz.
* [ ] LINK-021 — Link copy/paste sonrası korunur.
* [ ] LINK-022 — Link undo/redo çalışır.

---

## 14. Images

* [ ] IMG-001 — URL ile image eklenebilir.
* [ ] IMG-002 — `src` serialize edilir.
* [ ] IMG-003 — `alt` serialize edilir.
* [ ] IMG-004 — `title` serialize edilir.
* [ ] IMG-005 — Image seçilebilir.
* [ ] IMG-006 — Image silinebilir.
* [ ] IMG-007 — Image insertion undo/redo çalışır.
* [ ] IMG-008 — Broken image URL editorü bozmaz.
* [ ] IMG-009 — Boş URL image oluşturmaz.
* [ ] IMG-010 — Unsupported URL scheme politikaya göre engellenir.
* [ ] IMG-011 — Base64 image varsayılan politikaya göre reddedilir.
* [ ] IMG-012 — Image HTML round-trip'te korunur.
* [ ] IMG-013 — Image öncesinde cursor konumlandırılabilir.
* [ ] IMG-014 — Image sonrasında cursor konumlandırılabilir.

### Image Upload / File Handler

* [ ] IMG-UP-001 — File picker üzerinden image upload çalışır.
* [ ] IMG-UP-002 — Clipboard'dan image paste yakalanır.
* [ ] IMG-UP-003 — Drag/drop image yakalanır.
* [ ] IMG-UP-004 — Unsupported MIME type reddedilir.
* [ ] IMG-UP-005 — Maksimum dosya boyutu uygulanır.
* [ ] IMG-UP-006 — Upload başarısızlığı editorü bozmaz.
* [ ] IMG-UP-007 — Upload başarısızlığı kullanıcıya bildirilebilir.
* [ ] IMG-UP-008 — Upload devam ederken component destroy edilirse sorun oluşmaz.
* [ ] IMG-UP-009 — Aynı dosyanın duplicate upload davranışı belirlenmiştir.
* [ ] IMG-UP-010 — Zararlı veya garip filename upload pipeline'ını bozmaz.
* [ ] IMG-UP-011 — Upload tamamlanınca placeholder gerçek image node'a dönüşür.
* [ ] IMG-UP-012 — Upload sonrası undo image'i kaldırır.
* [ ] IMG-UP-013 — Image olmayan file paste/drop doğru şekilde reddedilir.

---

## 15. Tables

* [ ] TABLE-001 — RxC table oluşturulur.
* [ ] TABLE-002 — Header row oluşturulur.
* [ ] TABLE-003 — Cell içine yazı yazılabilir.
* [ ] TABLE-004 — Tab sonraki cell'e geçer.
* [ ] TABLE-005 — Shift+Tab önceki cell'e geçer.
* [ ] TABLE-006 — Son cell'de Tab davranışı belirlenen sözleşmeye uyar.
* [ ] TABLE-007 — Row eklenebilir.
* [ ] TABLE-008 — Row silinebilir.
* [ ] TABLE-009 — Column eklenebilir.
* [ ] TABLE-010 — Column silinebilir.
* [ ] TABLE-011 — Cell merge çalışır.
* [ ] TABLE-012 — Merged cell split çalışır.
* [ ] TABLE-013 — Header toggle çalışır.
* [ ] TABLE-014 — Bütün table silinebilir.
* [ ] TABLE-015 — Multi-cell selection çalışır.
* [ ] TABLE-016 — Selected cells içeriği silinebilir.
* [ ] TABLE-017 — Cell içine normal text paste çalışır.
* [ ] TABLE-018 — HTML table paste document'i bozmaz.
* [ ] TABLE-019 — Excel table paste document'i bozmaz.
* [ ] TABLE-020 — Table copy/paste round-trip çalışır.
* [ ] TABLE-021 — Table işlemleri undo/redo edilebilir.
* [ ] TABLE-022 — Table'ın hemen öncesinde cursor konumlandırılabilir.
* [ ] TABLE-023 — Table'ın hemen sonrasında cursor konumlandırılabilir.
* [ ] TABLE-024 — Document sonunda bulunan table kullanıcıyı editörden kilitlemez.
* [ ] TABLE-025 — Table içindeki marks/links doğru çalışır.
* [ ] TABLE-026 — Table HTML round-trip'te korunur.

---

## 16. Plain Text Clipboard

* [ ] CLIP-001 — Plain text paste çalışır.
* [ ] CLIP-002 — Multiline plain text paste çalışır.
* [ ] CLIP-003 — Türkçe karakter içeren text paste çalışır.
* [ ] CLIP-004 — Unicode text paste çalışır.
* [ ] CLIP-005 — Emoji paste çalışır.
* [ ] CLIP-006 — Selected text üzerine paste çalışır.
* [ ] CLIP-007 — Plain text copy çalışır.
* [ ] CLIP-008 — Cut çalışır.
* [ ] CLIP-009 — Cut undo edilebilir.

---

## 17. Rich HTML Clipboard

* [ ] CLIP-010 — Bold text copy/paste korunur.
* [ ] CLIP-011 — Birden fazla mark içeren text copy/paste korunur.
* [ ] CLIP-012 — Heading copy/paste korunur.
* [ ] CLIP-013 — Bullet list copy/paste korunur.
* [ ] CLIP-014 — Ordered list copy/paste korunur.
* [ ] CLIP-015 — Nested list copy/paste korunur.
* [ ] CLIP-016 — Link copy/paste korunur.
* [ ] CLIP-017 — Table copy/paste korunur.
* [ ] CLIP-018 — Image copy/paste politikaya göre çalışır.
* [ ] CLIP-019 — Aynı editor içinde copy/paste çalışır.
* [ ] CLIP-020 — Bir editor instance'ından diğerine copy/paste çalışır.

---

## 18. External Clipboard Sources

* [ ] CLIP-EXT-001 — Normal web sayfasından rich text paste edilir.
* [ ] CLIP-EXT-002 — Microsoft Word'den paste document'i bozmaz.
* [ ] CLIP-EXT-003 — Google Docs'tan paste document'i bozmaz.
* [ ] CLIP-EXT-004 — Excel'den table paste document'i bozmaz.
* [ ] CLIP-EXT-005 — Gmail/email HTML paste document'i bozmaz.
* [ ] CLIP-EXT-006 — Gereksiz CSS class'ları içeriğe sızmaz.
* [ ] CLIP-EXT-007 — Gereksiz inline style'lar temizlenir.
* [ ] CLIP-EXT-008 — Unsupported HTML node'ları document'i bozmaz.
* [ ] CLIP-EXT-009 — Semantic formatting mümkün olduğunca korunur.
* [ ] CLIP-EXT-010 — Presentation ağırlıklı formatting normalize edilir.

---

## 19. Paste Normalization

* [ ] PASTE-001 — Kaynak font-family temizlenir.
* [ ] PASTE-002 — Kaynak font-size temizlenir.
* [ ] PASTE-003 — Kaynak text color politikaya göre temizlenir.
* [ ] PASTE-004 — Kaynak background-color politikaya göre temizlenir.
* [ ] PASTE-005 — Gereksiz `class` attribute'ları temizlenir.
* [ ] PASTE-006 — Gereksiz `id` attribute'ları temizlenir.
* [ ] PASTE-007 — Gereksiz `style` attribute'ları temizlenir.
* [ ] PASTE-008 — `<strong>` / bold semantiği korunur.
* [ ] PASTE-009 — `<em>` / italic semantiği korunur.
* [ ] PASTE-010 — Link semantiği korunur.
* [ ] PASTE-011 — List semantiği korunur.
* [ ] PASTE-012 — Table semantiği korunur.
* [ ] PASTE-013 — Paste normalization idempotent çalışır.

---

## 20. Security / Hostile HTML

* [ ] SEC-001 — `<script>` paste edilince executable script oluşmaz.
* [ ] SEC-002 — `<img onerror="...">` event handler korunmaz.
* [ ] SEC-003 — `<p onclick="...">` event handler korunmaz.
* [ ] SEC-004 — `<a href="javascript:...">` link oluşturmaz.
* [ ] SEC-005 — Mixed-case `JaVaScRiPt:` bypass edemez.
* [ ] SEC-006 — Baştaki/sondaki whitespace URL validation'ı bypass edemez.
* [ ] SEC-007 — Control character içeren URL validation'ı bypass edemez.
* [ ] SEC-008 — Unsupported `<iframe>` korunmaz.
* [ ] SEC-009 — Unsupported `<object>` korunmaz.
* [ ] SEC-010 — Unsupported `<embed>` korunmaz.
* [ ] SEC-011 — Inline `<style>` korunmaz.
* [ ] SEC-012 — Arbitrary event handler attribute'ları korunmaz.
* [ ] SEC-013 — Arbitrary `style` attribute'ları politikaya göre temizlenir.
* [ ] SEC-014 — Arbitrary `class` attribute'ları politikaya göre temizlenir.
* [ ] SEC-015 — Arbitrary `id` attribute'ları politikaya göre temizlenir.
* [ ] SEC-016 — Malicious HTML initial `value` olarak verildiğinde executable DOM oluşmaz.
* [ ] SEC-017 — Malicious HTML programatik `value` olarak verildiğinde executable DOM oluşmaz.
* [ ] SEC-018 — Malicious clipboard HTML aynı şekilde temizlenir.
* [ ] SEC-019 — Serialized HTML tekrar render edildiğinde executable içerik taşımaz.
* [ ] SEC-020 — Unsupported protocol içeren image URL'leri engellenir.
* [ ] SEC-021 — HTML entity / encoding kullanılarak URL validation bypass edilemez.
* [ ] SEC-022 — Çok büyük malicious HTML editorü kilitlemez veya kontrollü ele alınır.

---

## 21. Serialization / Persistence

* [ ] SER-001 — Paragraph round-trip korunur.
* [ ] SER-002 — Heading round-trip korunur.
* [ ] SER-003 — Inline marks round-trip korunur.
* [ ] SER-004 — Nested marks round-trip korunur.
* [ ] SER-005 — Bullet list round-trip korunur.
* [ ] SER-006 — Ordered list round-trip korunur.
* [ ] SER-007 — Nested lists round-trip korunur.
* [ ] SER-008 — Link round-trip korunur.
* [ ] SER-009 — Image round-trip korunur.
* [ ] SER-010 — Table round-trip korunur.
* [ ] SER-011 — Alignment round-trip korunur.
* [ ] SER-012 — Empty paragraphs round-trip davranışı deterministiktir.
* [ ] SER-013 — Hard breaks round-trip korunur.
* [ ] SER-014 — Türkçe karakterler round-trip korunur.
* [ ] SER-015 — Unicode round-trip korunur.
* [ ] SER-016 — Emoji round-trip korunur.
* [ ] SER-017 — Unsupported HTML deterministik biçimde normalize edilir.
* [ ] SER-018 — Serialize → deserialize → serialize idempotent olur.
* [ ] SER-019 — Semantik olarak aynı HTML farklı attribute sırasından etkilenmez.
* [ ] SER-020 — Gereksiz editor-only DOM serialization'a sızmaz.

---

## 22. Events

* [ ] EVT-001 — Kullanıcı typing yaptığında `input` event'i gelir.
* [ ] EVT-002 — Formatting değişikliği `input` olarak değerlendirilir.
* [ ] EVT-003 — Link ekleme `input` üretir.
* [ ] EVT-004 — Image ekleme `input` üretir.
* [ ] EVT-005 — Table işlemi `input` üretir.
* [ ] EVT-006 — Undo `input` üretir.
* [ ] EVT-007 — Redo `input` üretir.
* [ ] EVT-008 — Selection değişikliği `input` üretmez.
* [ ] EVT-009 — Toolbar active-state değişmesi `input` üretmez.
* [ ] EVT-010 — Programatik `value` ataması `input` üretmez.
* [ ] EVT-011 — Focus event doğru expose edilir.
* [ ] EVT-012 — Blur event doğru expose edilir.
* [ ] EVT-013 — `change` yalnız belirlenen semantiğe göre oluşur.
* [ ] EVT-014 — Aynı transaction için duplicate public event üretilmez.
* [ ] EVT-015 — Event target/currentTarget component API'siyle tutarlıdır.

---

## 23. Toolbar

* [ ] TOOL-001 — Toolbar button'ları doğru command'i çağırır.
* [ ] TOOL-002 — Unsupported command button'u disabled olur.
* [ ] TOOL-003 — Aktif mark button active state gösterir.
* [ ] TOOL-004 — Toggle button'larda `aria-pressed` doğru güncellenir.
* [ ] TOOL-005 — Mixed selection state'i belirlenen şekilde gösterilir.
* [ ] TOOL-006 — Toolbar click selection'ı kaybettirmez.
* [ ] TOOL-007 — Toolbar keyboard ile kullanılabilir.
* [ ] TOOL-008 — Button'ların accessible name'i vardır.
* [ ] TOOL-009 — Tooltip yalnız mouse'a bağlı değildir.
* [ ] TOOL-010 — Readonly durumda mutation button'ları disabled olur.
* [ ] TOOL-011 — Disabled durumda toolbar etkileşime kapalı olur.
* [ ] TOOL-012 — Command exception editorü unusable hale getirmez.
* [ ] TOOL-013 — Birden fazla editorün toolbar state'leri birbirinden bağımsızdır.

---

## 24. Keyboard Shortcuts

* [ ] KEY-001 — Ctrl/Cmd+B bold çalışır.
* [ ] KEY-002 — Ctrl/Cmd+I italic çalışır.
* [ ] KEY-003 — Ctrl/Cmd+U underline çalışır.
* [ ] KEY-004 — Ctrl/Cmd+Z undo çalışır.
* [ ] KEY-005 — Ctrl/Cmd+Shift+Z veya platform redo shortcut'ı çalışır.
* [ ] KEY-006 — Ctrl/Cmd+A editor scope içinde doğru çalışır.
* [ ] KEY-007 — Enter paragraph davranışı doğru.
* [ ] KEY-008 — Shift+Enter hard break davranışı doğru.
* [ ] KEY-009 — Tab table/list context'inde doğru çalışır.
* [ ] KEY-010 — Escape varsa floating UI/dialog davranışını doğru kapatır.
* [ ] KEY-011 — Browser'ın native shortcut'ları gereksiz yere engellenmez.

---

## 25. Accessibility

* [ ] A11Y-001 — Component label ile ilişkilendirilebilir.
* [ ] A11Y-002 — Editor keyboard-only kullanılabilir.
* [ ] A11Y-003 — Editor focus görünürdür.
* [ ] A11Y-004 — Toolbar tab order mantıklıdır.
* [ ] A11Y-005 — Toolbar button isimleri screen reader tarafından okunabilir.
* [ ] A11Y-006 — Toggle button state'i accessible olarak bildirilir.
* [ ] A11Y-007 — Validation error editor ile ilişkilendirilir.
* [ ] A11Y-008 — Required state expose edilir.
* [ ] A11Y-009 — Disabled state expose edilir.
* [ ] A11Y-010 — Readonly state expose edilir.
* [ ] A11Y-011 — Table output semantik `table/tr/th/td` yapısını korur.
* [ ] A11Y-012 — Placeholder label yerine kullanılmaz.
* [ ] A11Y-013 — Error message screen reader tarafından ilişkilendirilebilir.
* [ ] A11Y-014 — Toolbar ile editor arasında keyboard focus trap oluşmaz.

---

## 26. Light DOM / CSS Integration

* [ ] DOM-001 — Editor içeriği uygulamanın global typography CSS'inden etkilenir.
* [ ] DOM-002 — Paragraph stilleri editor içinde uygulanır.
* [ ] DOM-003 — Heading stilleri editor içinde uygulanır.
* [ ] DOM-004 — Link stilleri editor içinde uygulanır.
* [ ] DOM-005 — Blockquote stilleri editor içinde uygulanır.
* [ ] DOM-006 — Code/code-block stilleri editor içinde uygulanır.
* [ ] DOM-007 — Table stilleri editor içinde uygulanır.
* [ ] DOM-008 — Image stilleri editor içinde uygulanır.
* [ ] DOM-009 — Editor-specific CSS diğer page content'ini yanlışlıkla etkilemez.
* [ ] DOM-010 — Birden fazla editor instance'ı CSS açısından birbirini bozmaz.
* [ ] DOM-011 — Bootstrap/global reset editor DOM'unu unusable hale getirmez.
* [ ] DOM-012 — Editor dışındaki global CSS contenteditable davranışını bozmaz.

---

## 27. Lifecycle / Memory

* [ ] LIFE-001 — Component connect olduğunda tek editor instance oluşturulur.
* [ ] LIFE-002 — Property/attribute update yeni gereksiz editor instance oluşturmaz.
* [ ] LIFE-003 — Disconnect olduğunda editor destroy edilir.
* [ ] LIFE-004 — Disconnect sonrası event listener'lar kaldırılır.
* [ ] LIFE-005 — Reconnect sonrası editor tekrar çalışır.
* [ ] LIFE-006 — Reconnect sonrası duplicate event oluşmaz.
* [ ] LIFE-007 — 100 mount/destroy sonrası belirgin memory leak oluşmaz.
* [ ] LIFE-008 — Async upload devam ederken destroy güvenli şekilde ele alınır.

---

## 28. Stress / Resilience

* [ ] STRESS-001 — 50 KB HTML sorunsuz yüklenir.
* [ ] STRESS-002 — 500 KB paste kontrollü şekilde işlenir.
* [ ] STRESS-003 — Çok sayıda paragraph ile editor kullanılabilir kalır.
* [ ] STRESS-004 — Büyük table editorü bozmaz.
* [ ] STRESS-005 — Çok sayıda image editorü bozmaz.
* [ ] STRESS-006 — Hızlı typing sırasında karakter kaybı olmaz.
* [ ] STRESS-007 — Hızlı undo/redo document'i bozmaz.
* [ ] STRESS-008 — Art arda programatik `value` değişiklikleri güvenli çalışır.
* [ ] STRESS-009 — Büyük HTML serialization kabul edilebilir davranır.
* [ ] STRESS-010 — Aynı sayfada çok sayıda editor instance çalışabilir.

---

## 29. Cross-Browser

* [ ] BROWSER-001 — Chromium üzerinde temel editing çalışır.
* [ ] BROWSER-002 — Firefox üzerinde temel editing çalışır.
* [ ] BROWSER-003 — Safari/WebKit üzerinde temel editing çalışır.
* [ ] BROWSER-004 — Selection Chromium'da doğru çalışır.
* [ ] BROWSER-005 — Selection Firefox'ta doğru çalışır.
* [ ] BROWSER-006 — Selection WebKit'te doğru çalışır.
* [ ] BROWSER-007 — Clipboard Chromium'da doğru çalışır.
* [ ] BROWSER-008 — Clipboard Firefox'ta doğru çalışır.
* [ ] BROWSER-009 — Clipboard WebKit'te doğru çalışır.
* [ ] BROWSER-010 — Table keyboard navigation browser'lar arasında tutarlıdır.
* [ ] BROWSER-011 — Text justify Firefox'ta kabul edilen davranışı gösterir.
* [ ] BROWSER-012 — IME composition browser'lar arasında document'i bozmaz.

---

# İlk Uygulanacak P0 Test Seti

İlk aşamada bütün listeyi yazmak yerine aşağıdaki testleri önce tamamla:

* [ ] P0-001 — Initial value doğru yüklenir.
* [ ] P0-002 — User edit → component value güncellenir.
* [ ] P0-003 — Programmatic value → editor güncellenir.
* [ ] P0-004 — Empty editor → canonical empty value.
* [ ] P0-005 — Form submit doğru value gönderir.
* [ ] P0-006 — Form reset başlangıç değerine döner.
* [ ] P0-007 — Required validation çalışır.
* [ ] P0-008 — Disabled davranışı doğru çalışır.
* [ ] P0-009 — Readonly davranışı doğru çalışır.
* [ ] P0-010 — Placeholder doğru çalışır.
* [ ] P0-011 — Character count doğru çalışır.
* [ ] P0-012 — Maxlength uygulanır.
* [ ] P0-013 — Normal typing çalışır.
* [ ] P0-014 — Enter / Shift+Enter doğru çalışır.
* [ ] P0-015 — Toolbar click selection'ı kaybettirmez.
* [ ] P0-016 — Bold toggle çalışır.
* [ ] P0-017 — Birden fazla mark birlikte çalışır.
* [ ] P0-018 — Undo / redo çalışır.
* [ ] P0-019 — Link add/remove çalışır.
* [ ] P0-020 — `javascript:` link reddedilir.
* [ ] P0-021 — Plain text paste çalışır.
* [ ] P0-022 — Rich HTML paste çalışır.
* [ ] P0-023 — Paste normalization çalışır.
* [ ] P0-024 — Hostile HTML paste executable içerik üretmez.
* [ ] P0-025 — HTML round-trip çalışır.
* [ ] P0-026 — Image URL ile eklenebilir.
* [ ] P0-027 — Image paste/drop pipeline çalışır.
* [ ] P0-028 — Table oluşturulabilir ve düzenlenebilir.
* [ ] P0-029 — Component destroy editor instance'ı temizler.
* [ ] P0-030 — İki editor instance birbirinden bağımsız çalışır.

---

# Önerilen Test Katmanları

## Unit

* Value normalization
* Empty-content detection
* Character-count policy
* URL validation policy
* Paste HTML normalization
* Sanitization helpers
* Attribute/property conversion helpers

## Component / Integration

* Component lifecycle
* Value synchronization
* Form integration
* Validity
* Placeholder
* Character count
* Toolbar commands
* Events
* Readonly / disabled
* Serialization

## Real Browser / E2E

* Selection
* Focus
* Keyboard
* Clipboard
* Word / Docs / Excel paste
* IME composition
* Drag/drop
* Image paste
* Table keyboard navigation
* Firefox-specific behavior
* Security paste scenarios

*/
