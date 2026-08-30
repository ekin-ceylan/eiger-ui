import RichTextEditor from '../../addons/rich-text/rich-text-editor.js';
import { Editor } from '@tiptap/core';

defineElement('rich-text-editor', RichTextEditor);

describe('Rich text editor - Component / Value Contract', () => {
    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('RT-001 opens an editor when the component is created', async () => {
        const fixture = await initTestFixture('<rich-text-editor label="Description"></rich-text-editor>');
        const editorElement = getEditorElement(fixture);

        expect(editorElement).not.toBeNull();
    });

    it('RT-002 loads the initial HTML value into the editor', async () => {
        /** @type {RichTextEditor} */
        const host = document.createElement('rich-text-editor');
        host.setAttribute('label', 'Description');
        document.body.appendChild(host);
        await host.updateComplete;

        host.value = '<p>Hello <strong>world</strong></p>';
        await host.updateComplete;

        expect(host.value).toBe('<p>Hello <strong>world</strong></p>');
        expect(host.inputElement.value).toBe('<p>Hello <strong>world</strong></p>');
    });

    it('RT-003 preserves a value assigned before the component is connected', async () => {
        const host = document.createElement('rich-text-editor');
        host.setAttribute('label', 'Description');
        host.value = '<p>Before connect</p>';
        document.body.appendChild(host);
        await host.updateComplete;

        const editorElement = getEditorElement(host);

        expect(editorElement.innerHTML).toBe('<p>Before connect</p>');
        expect(host.value).toBe('<p>Before connect</p>');
    });

    it('RT-004 reflects a programmatic value change in the editor', async () => {
        /** @type {import('../types').TestFixture<HTMLTextAreaElement>} */
        const fixture = await initTestFixture('<rich-text-editor label="Description"></rich-text-editor>');

        fixture.host.value = '<h2>Updated</h2>';
        await fixture.host.updateComplete;

        expect(fixture.host.value).toBe('<h2>Updated</h2>');
        expect(fixture.input.value).toBe('<h2>Updated</h2>');
    });

    it('RT-005 updates the component value after a user edit', async () => {
        const fixture = await initTestFixture('<rich-text-editor label="Description"></rich-text-editor>');
        const editorElement = getEditorElement(fixture);
        await fixture.user.type(editorElement, 'Typed text');
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
        let updateEvents = 0;

        fixture.host.addEventListener('update', () => updateEvents++);
        fixture.host.value = '<p>Same</p>';
        await fixture.host.updateComplete;

        expect(updateEvents).toBe(0);
    });

    it.each([
        ['', 'empty editor'],
        ['<p></p>', 'an empty paragraph'],
    ])('RT-008/RT-009 normalizes %s to the canonical empty value (%s)', async value => {
        const fixture = await initTestFixture('<rich-text-editor label="Description"></rich-text-editor>');
        fixture.host.value = value;
        await fixture.host.updateComplete;

        expect(fixture.host.value).toBe('');
        expect(fixture.input.value).toBe('');
    });

    it('RT-010 preserves whitespace-only content', async () => {
        /** @type {import('../types').TestFixture<HTMLTextAreaElement>} */
        const fixture = await initTestFixture('<rich-text-editor label="Description"></rich-text-editor>');

        fixture.host.value = '<p> </p>';
        await fixture.host.updateComplete;

        expect(fixture.host.value).toBe('<p> </p>');
        expect(fixture.input.value).toBe('<p> </p>');
    });

    it('RT-011 destroys the editor when the component is disconnected', async () => {
        const fixture = await initTestFixture('<rich-text-editor label="Description"></rich-text-editor>');
        const destroy = vi.spyOn(Editor.prototype, 'destroy');

        fixture.host.remove();

        expect(destroy).toHaveBeenCalledOnce();
    });

    it('RT-012 creates a working editor after reconnect', async () => {
        const fixture = await initTestFixture('<rich-text-editor label="Description"></rich-text-editor>');

        fixture.host.remove();
        document.body.appendChild(fixture.host);
        await fixture.host.updateComplete;

        const editorElement = fixture.querySelector('[data-role="editor"] [contenteditable="true"]');
        expect(editorElement).not.toBeNull();

        await fixture.user.click(editorElement);
        await fixture.user.type(editorElement, 'Reconnected');
        await fixture.host.updateComplete;

        expect(fixture.host.value).toBe('<p>Reconnected</p>');
    });

    it('RT-013 keeps multiple editor instances independent', async () => {
        const first = await initTestFixture('<rich-text-editor label="First"></rich-text-editor>');
        const secondHost = document.createElement('rich-text-editor');
        secondHost.setAttribute('label', 'Second');
        first.form.appendChild(secondHost);
        await secondHost.updateComplete;

        const firstEditor = first.querySelector('[data-role="editor"] [contenteditable="true"]');
        const secondEditor = secondHost.querySelector('[data-role="editor"] [contenteditable="true"]');

        await first.user.click(firstEditor);
        await first.user.type(firstEditor, 'First value');
        await first.host.updateComplete;

        expect(first.host.value).toBe('<p>First value</p>');
        expect(secondHost.value).toBe('');
        expect(secondEditor.innerHTML).toBe('<p><br class="ProseMirror-trailingBreak"></p>');
    });

    it('RT-014 keeps toolbar and editor state isolated between instances', async () => {
        const first = await initTestFixture('<rich-text-editor label="First"></rich-text-editor>');
        const secondHost = document.createElement('rich-text-editor');
        secondHost.setAttribute('label', 'Second');
        first.form.appendChild(secondHost);
        await secondHost.updateComplete;

        const firstEditor = first.querySelector('[data-role="editor"] [contenteditable="true"]');
        const firstBoldButton = first.querySelector('button[title="Bold"]');
        const secondBoldButton = secondHost.querySelector('button[title="Bold"]');

        await first.user.click(firstEditor);
        await first.user.type(firstEditor, 'First');
        await first.user.keyboard('{Control>}a{/Control}');
        await first.user.click(firstBoldButton);
        await first.host.updateComplete;

        expect(first.host.value).toBe('<p><strong>First</strong></p>');
        expect(firstBoldButton.getAttribute('aria-pressed')).toBe('true');
        expect(secondBoldButton.getAttribute('aria-pressed')).toBe('false');
        expect(secondHost.value).toBe('');
        expect(secondHost.activeBlock).toBe('p');
    });
});

describe('Rich text editor - Form Integration', () => {
    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('FORM-001 includes the editor value in form data when name is set', async () => {
        const fixture = await initTestFixture('<rich-text-editor label="Description" name="description"></rich-text-editor>');
        fixture.host.value = '<p>Submitted</p>';
        await fixture.host.updateComplete;

        expect(new FormData(fixture.form).get('description')).toBe('<p>Submitted</p>');
    });

    it('FORM-002 excludes the editor from form data when name is not set', async () => {
        const fixture = await initTestFixture('<rich-text-editor label="Description"></rich-text-editor>');
        fixture.host.value = '<p>Not submitted</p>';
        await fixture.host.updateComplete;

        expect(Array.from(new FormData(fixture.form).entries())).toEqual([]);
    });

    it('FORM-003 submits the initial value', async () => {
        const fixture = await initTestFixture('<rich-text-editor label="Description" name="description" value="<p>Initial</p>"></rich-text-editor>');

        expect(new FormData(fixture.form).get('description')).toBe('<p>Initial</p>');
    });

    it('FORM-004 submits a value changed by the user', async () => {
        const fixture = await initTestFixture('<rich-text-editor label="Description" name="description"></rich-text-editor>');
        const editorElement = getEditorElement(fixture.host);
        await fixture.user.type(editorElement, 'Changed');
        await fixture.host.updateComplete;

        expect(new FormData(fixture.form).get('description')).toBe('<p>Changed</p>');
    });

    it('FORM-005 restores the initial value on form reset', async () => {
        const fixture = await initTestFixture('<rich-text-editor label="Description" name="description" value="<p>Initial</p>"></rich-text-editor>');
        fixture.host.value = '<p>Changed</p>';
        await fixture.host.updateComplete;

        fixture.form.reset();
        await new Promise(resolve => requestAnimationFrame(resolve));
        await fixture.host.updateComplete;

        expect(fixture.host.value).toBe('<p>Initial</p>');
    });

    it('FORM-006 restores the initial value in the editor DOM on form reset', async () => {
        const fixture = await initTestFixture('<rich-text-editor label="Description" value="<p>Initial</p>"></rich-text-editor>');
        fixture.host.value = '<p>Changed</p>';
        await fixture.host.updateComplete;

        fixture.form.reset();
        await new Promise(resolve => requestAnimationFrame(resolve));
        await fixture.host.updateComplete;

        expect(fixture.host.editor.getHTML()).toBe('<p>Initial</p>');
    });

    it('FORM-007 prevents editing while disabled', async () => {
        const fixture = await initTestFixture('<rich-text-editor label="Description" value="<p>Initial</p>" disabled></rich-text-editor>');

        const editorElement = getEditorElement(fixture.host);
        await fixture.user.type(editorElement, 'Changed');
        await fixture.host.updateComplete;

        expect(fixture.host.editor.isEditable).toBe(false);
        expect(fixture.host.value).toBe('<p>Initial</p>');
    });

    it('FORM-008 excludes a disabled editor from form data', async () => {
        const fixture = await initTestFixture('<rich-text-editor label="Description" name="description" value="<p>Initial</p>" disabled></rich-text-editor>');

        expect(new FormData(fixture.form).has('description')).toBe(false);
    });

    it('FORM-009 prevents editing while readonly', async () => {
        const fixture = await initTestFixture('<rich-text-editor label="Description" value="<p>Initial</p>" readonly></rich-text-editor>');

        const editorElement = getEditorElement(fixture.host);
        await fixture.user.type(editorElement, 'Changed');
        await fixture.host.updateComplete;

        expect(fixture.host.editor.isEditable).toBe(false);
        expect(fixture.host.value).toBe('<p>Initial</p>');
    });

    it('FORM-010 includes a readonly editor in form data', async () => {
        const fixture = await initTestFixture('<rich-text-editor label="Description" name="description" value="<p>Initial</p>" readonly></rich-text-editor>');

        expect(new FormData(fixture.form).get('description')).toBe('<p>Initial</p>');
    });

    it('FORM-011 is invalid when required and empty', async () => {
        const fixture = await initTestFixture('<rich-text-editor label="Description" required></rich-text-editor>');

        expect(fixture.host.checkValidity()).toBe(false);
        expect(fixture.input.validity.valueMissing).toBe(true);
    });

    it('FORM-012 is invalid when required and set to an empty paragraph', async () => {
        const fixture = await initTestFixture('<rich-text-editor label="Description" required></rich-text-editor>');
        fixture.host.value = '<p></p>';
        await fixture.host.updateComplete;

        expect(fixture.host.checkValidity()).toBe(false);
        expect(fixture.input.validity.valueMissing).toBe(true);
    });

    it('FORM-013 becomes valid after real content is entered', async () => {
        const fixture = await initTestFixture('<rich-text-editor label="Description" required></rich-text-editor>');
        expect(fixture.host.checkValidity()).toBe(false);

        const editorElement = getEditorElement(fixture.host);
        await fixture.user.type(editorElement, 'Changed');
        await fixture.host.updateComplete;

        expect(fixture.host.checkValidity()).toBe(true);
        expect(fixture.input.validity.valid).toBe(true);
    });

    it('FORM-014 updates validity after a programmatic value change', async () => {
        const fixture = await initTestFixture('<rich-text-editor label="Description" required></rich-text-editor>');
        expect(fixture.host.checkValidity()).toBe(false);

        fixture.host.value = '<p>Programmatic</p>';
        await fixture.host.updateComplete;

        expect(fixture.host.checkValidity()).toBe(true);
        expect(fixture.input.validity.valid).toBe(true);
    });

    it('FORM-015 enforces maxlength', async () => {
        const fixture = await initTestFixture('<rich-text-editor label="Description" maxlength="5"></rich-text-editor>');
        const editorElement = getEditorElement(fixture.host);
        await fixture.user.type(editorElement, '123456');
        await fixture.host.updateComplete;

        expect(editorElement.textContent).toBe('12345');
        expect(fixture.host.value).toBe('<p>12345</p>');
    });

    it('FORM-016 removes the limit when maxlength is removed', async () => {
        const fixture = await initTestFixture('<rich-text-editor label="Description" maxlength="5"></rich-text-editor>');
        fixture.host.removeAttribute('maxlength');
        await fixture.host.updateComplete;

        const editorElement = getEditorElement(fixture.host);
        await fixture.user.type(editorElement, '123456');
        await fixture.host.updateComplete;

        expect(editorElement.textContent).toBe('123456');
        expect(fixture.host.value).toBe('<p>123456</p>');
    });
});

describe('Rich text editor - Links', () => {
    afterEach(() => {
        document.body.innerHTML = '';
    });

    const selectAllText = async fixture => {
        const editorElement = getEditorElement(fixture);
        await fixture.user.click(editorElement);
        await fixture.user.keyboard('{Control>}a{/Control}');
        expect(window.getSelection()?.toString()).toBe(editorElement.textContent);
    };

    const selectLink = async fixture => {
        const link = fixture.querySelector('[data-role="editor"] a');
        await fixture.user.click(link);
        return link;
    };

    const openLinkForm = async fixture => {
        await fixture.user.click(fixture.querySelector('button[title="Bağlantı Ekle"]'));

        const linkForm = fixture.querySelector('rt-link-form');
        await linkForm.updateComplete;
        return linkForm;
    };

    const submitLinkForm = async (fixture, { text, url, blank = false }) => {
        const linkForm = await openLinkForm(fixture);

        if (text !== undefined) {
            await fixture.user.clear(linkForm.textInput.inputElement);
            await fixture.user.type(linkForm.textInput.inputElement, text);
        }

        await fixture.user.clear(linkForm.urlInput.inputElement);
        if (url) await fixture.user.type(linkForm.urlInput.inputElement, url);

        if (linkForm.checkInput.checked !== blank) {
            await fixture.user.click(linkForm.checkInput.inputElement);
        }

        await fixture.user.click(linkForm.formElement.querySelector('button[type="submit"]'));
        await fixture.host.updateComplete;

        return linkForm;
    };

    it('LINK-001 adds a link to selected text', async () => {
        const fixture = await initTestFixture('<rich-text-editor label="Description" value="<p>Example</p>"></rich-text-editor>');
        await selectAllText(fixture);

        await submitLinkForm(fixture, { url: 'https://example.com' });

        expect(fixture.host.value).toBe('<p><a rel="noopener noreferrer nofollow" href="https://example.com">Example</a></p>');
    });

    it('LINK-002 updates the URL of an existing link', async () => {
        const fixture = await initTestFixture('<rich-text-editor label="Description" value="<p><a href=&quot;https://old.example&quot;>Example</a></p>"></rich-text-editor>');
        await selectLink(fixture);

        await submitLinkForm(fixture, { url: 'https://new.example' });

        expect(fixture.querySelector('[data-role="editor"] a')?.getAttribute('href')).toBe('https://new.example');
    });

    it('LINK-003 removes an existing link', async () => {
        const fixture = await initTestFixture('<rich-text-editor label="Description" value="<p><a href=&quot;https://example.com&quot;>Example</a></p>"></rich-text-editor>');
        await selectLink(fixture);

        const linkForm = await openLinkForm(fixture);
        await fixture.user.click(Array.from(linkForm.formElement.querySelectorAll('button')).find(button => button.textContent.trim() === 'Kaldır'));
        await fixture.host.updateComplete;

        expect(fixture.host.value).toBe('<p>Example</p>');
        expect(fixture.querySelector('[data-role="editor"] a')).toBeNull();
    });

    it('LINK-004 changes the text of an existing link', async () => {
        const fixture = await initTestFixture('<rich-text-editor label="Description" value="<p><a href=&quot;https://example.com&quot;>Old text</a></p>"></rich-text-editor>');
        await selectLink(fixture);

        await submitLinkForm(fixture, { text: 'New text', url: 'https://example.com' });

        expect(getEditorElement(fixture).textContent).toBe('New text');
        expect(fixture.host.value).toContain('>New text</a>');
    });

    it('LINK-005 autolinks a URL when it is typed', async () => {
        const fixture = await initTestFixture('<rich-text-editor label="Description"></rich-text-editor>');
        const editorElement = fixture.querySelector('[data-role="editor"] [contenteditable="true"]');

        await fixture.user.click(editorElement);
        await fixture.user.type(editorElement, 'https://example.com ');
        await fixture.host.updateComplete;

        expect(fixture.host.value).toContain('<a');
        expect(fixture.host.value).toContain('href="https://example.com"');
    });

    it('LINK-006 autolinks a pasted URL', async () => {
        const fixture = await initTestFixture('<rich-text-editor label="Description"></rich-text-editor>');
        const editorElement = fixture.querySelector('[data-role="editor"] [contenteditable="true"]');

        await fixture.user.click(editorElement);
        await fixture.user.paste('https://example.com');
        await fixture.host.updateComplete;

        expect(fixture.host.value).toContain('<a');
        expect(fixture.host.value).toContain('href="https://example.com"');
    });

    it('LINK-007 links selected text when a URL is pasted over it', async () => {
        const fixture = await initTestFixture('<rich-text-editor label="Description" value="<p>Example</p>"></rich-text-editor>');
        const editorElement = fixture.querySelector('[data-role="editor"] [contenteditable="true"]');
        let pastedText = '';
        editorElement.addEventListener(
            'paste',
            event => {
                pastedText = event.clipboardData.getData('text/plain');
            },
            { once: true }
        );
        editorElement.focus();
        await fixture.user.keyboard('{Control>}a{/Control}');

        expect(document.activeElement).toBe(editorElement);
        expect(window.getSelection()?.toString()).toBe('Example');

        await fixture.user.paste('https://example.com');
        await fixture.host.updateComplete;

        expect(pastedText).toBe('https://example.com');
        expect(editorElement.textContent).toBe('Example');
        expect(editorElement.querySelector('a')?.getAttribute('href')).toBe('https://example.com');
    });

    it.each([
        ['LINK-008', 'https://example.com', true],
        ['LINK-009', 'http://example.com', true],
        ['LINK-010', '/docs/getting-started', true],
        ['LINK-011', 'mailto:test@example.com', true],
        ['LINK-012', 'tel:+905551234567', true],
        ['LINK-013', '', false],
        ['LINK-015', 'javascript:alert(1)', false],
        ['LINK-016', 'JaVaScRiPt:alert(1)', false],
        ['LINK-017', 'java\nscript:alert(1)', false],
    ])('%s applies the URL protocol policy for %s', async (_id, href, accepted) => {
        const fixture = await initTestFixture('<rich-text-editor label="Description" value="<p>Example</p>"></rich-text-editor>');
        await selectAllText(fixture);

        await submitLinkForm(fixture, { url: href });

        expect(fixture.host.value.includes('<a')).toBe(accepted);
    });

    it('LINK-014 trims surrounding whitespace from a URL', async () => {
        const fixture = await initTestFixture('<rich-text-editor label="Description" value="<p>Example</p>"></rich-text-editor>');
        await selectAllText(fixture);

        const linkForm = await openLinkForm(fixture);
        linkForm.urlInput.inputElement.focus();
        await fixture.user.paste('  https://example.com  ');
        await fixture.user.click(linkForm.formElement.querySelector('button[type="submit"]'));
        await fixture.host.updateComplete;

        expect(fixture.querySelector('[data-role="editor"] a')?.getAttribute('href')).toBe('https://example.com');
    });

    it('LINK-018 adds the expected rel attribute to output links', async () => {
        const fixture = await initTestFixture('<rich-text-editor label="Description" value="<p>Example</p>"></rich-text-editor>');
        await selectAllText(fixture);

        await submitLinkForm(fixture, { url: 'https://example.com' });

        expect(fixture.querySelector('[data-role="editor"] a')?.getAttribute('rel')).toBe('noopener noreferrer nofollow');
    });

    it('LINK-019 applies the requested _blank target policy', async () => {
        const fixture = await initTestFixture('<rich-text-editor label="Description" value="<p>Example</p>"></rich-text-editor>');
        await selectAllText(fixture);

        await submitLinkForm(fixture, { url: 'https://example.com', blank: true });

        expect(fixture.querySelector('[data-role="editor"] a')?.getAttribute('target')).toBe('_blank');
    });

    it('LINK-020 disables link navigation while editing', async () => {
        const fixture = await initTestFixture('<rich-text-editor label="Description" value="<p><a href=&quot;https://example.com&quot;>Example</a></p>"></rich-text-editor>');
        const link = fixture.querySelector('[data-role="editor"] a');
        const editorElement = getEditorElement(fixture);
        const currentUrl = location.href;

        await fixture.user.click(link);

        expect(location.href).toBe(currentUrl);
        expect(document.activeElement).toBe(editorElement);
    });

    it('LINK-021 preserves a link after HTML copy and paste', async () => {
        const fixture = await initTestFixture('<rich-text-editor label="Description"></rich-text-editor>');
        const editorElement = fixture.querySelector('[data-role="editor"] [contenteditable="true"]');
        const clipboard = new DataTransfer();
        clipboard.setData('text/plain', 'Example');
        clipboard.setData('text/html', '<a href="https://example.com">Example</a>');

        await fixture.user.click(editorElement);
        await fixture.user.paste(clipboard);
        await fixture.host.updateComplete;

        expect(fixture.host.value).toContain('href="https://example.com"');
        expect(editorElement.textContent).toBe('Example');
    });

    it('LINK-022 supports undo and redo for link changes', async () => {
        const fixture = await initTestFixture('<rich-text-editor label="Description" value="<p>Example</p>"></rich-text-editor>');
        const btnUndo = fixture.querySelector('button[title="Geri al"]');
        const btnRedo = fixture.querySelector('button[title="İleri al"]');

        await selectAllText(fixture);
        await submitLinkForm(fixture, { url: 'https://example.com' });
        expect(fixture.host.value).toContain('<a');
        await fixture.host.updateComplete;

        await fixture.user.click(btnUndo);
        await fixture.host.updateComplete;

        expect(fixture.host.value).toBe('<p>Example</p>');

        await fixture.user.click(btnRedo);
        await fixture.host.updateComplete;
        expect(fixture.host.value).toContain('href="https://example.com"');
    });
});

describe('Rich text editor - Images', () => {
    afterEach(() => {
        document.body.innerHTML = '';
    });

    const submitImageForm = async (fixture, { url, alt }) => {
        await fixture.user.click(fixture.querySelector('button[title="Görsel Ekle"]'));

        const imageForm = fixture.querySelector('rt-image-form');
        await imageForm.updateComplete;
        await fixture.user.type(imageForm.urlInput.inputElement, url);
        if (alt) await fixture.user.type(imageForm.textInput.inputElement, alt);
        await fixture.user.click(imageForm.formElement.querySelector('button[type="submit"]'));
        await fixture.host.updateComplete;
    };

    it('IMG-002/IMG-003/IMG-004/IMG-012 preserves image HTML and attributes', async () => {
        const fixture = await initTestFixture('<rich-text-editor label="Description"></rich-text-editor>');
        const image = '<img src="https://example.com/image.png" alt="Example" title="Preview" width="320" height="180" class="hero" data-id="42">';

        fixture.host.value = image;
        await fixture.host.updateComplete;

        const serializedImage = new DOMParser().parseFromString(fixture.host.value, 'text/html').querySelector('img');
        expect(serializedImage?.outerHTML).not.toBeNull();
        expect(Object.fromEntries(Array.from(serializedImage.attributes, attribute => [attribute.name, attribute.value]))).toEqual({
            src: 'https://example.com/image.png',
            alt: 'Example',
            title: 'Preview',
            width: '320',
            height: '180',
            class: 'hero',
            'data-id': '42',
        });
        const renderedImage = fixture.querySelector('[data-role="editor"] img');
        expect(renderedImage.getAttribute('src')).toBe('https://example.com/image.png');
        expect(renderedImage.getAttribute('alt')).toBe('Example');
        expect(renderedImage.getAttribute('title')).toBe('Preview');
        expect(renderedImage.getAttribute('width')).toBe('320');
        expect(renderedImage.getAttribute('height')).toBe('180');
        expect(renderedImage.classList).toContain('hero');
        expect(renderedImage.getAttribute('data-id')).toBe('42');
    });

    it('IMG-001 inserts an image through the image popover', async () => {
        const fixture = await initTestFixture('<rich-text-editor label="Description"></rich-text-editor>');

        await submitImageForm(fixture, { url: 'https://example.com/image.png', alt: 'Example' });

        expect(fixture.host.value).toBe('<img src="https://example.com/image.png" alt="Example">');
        expect(fixture.querySelector('[data-role="editor"] img')?.getAttribute('src')).toBe('https://example.com/image.png');
    });

    it('IMG-011 rejects Base64 images while parsing HTML', async () => {
        const fixture = await initTestFixture('<rich-text-editor label="Description"></rich-text-editor>');

        fixture.host.value = '<img src="data:image/png;base64,AA==" alt="Embedded">';
        await fixture.host.updateComplete;

        expect(fixture.host.value).toBe('');
        expect(getEditorElement(fixture).textContent).toBe('');
    });
});

describe('Rich text editor - Markdown Conversions', () => {
    afterEach(() => {
        document.body.innerHTML = '';
    });

    it.each([
        {
            id: 'MD-001',
            description: 'converts image syntax',
            markdown: '![Example](https://example.com/image.png',
            expected: '<img src="https://example.com/image.png" alt="Example">',
        },
        {
            id: 'MD-002',
            description: 'converts image syntax with a relative URL and spaced title',
            markdown: '![The San Juan Mountains are beautiful](/assets/images/san-juan-mountains.jpg "San Juan Mountains"',
            expected: '<img title="San Juan Mountains" src="/assets/images/san-juan-mountains.jpg" alt="The San Juan Mountains are beautiful">',
        },
        {
            id: 'MD-003',
            description: 'converts link syntax',
            markdown: '[Example](https://example.com',
            expected: '<p><a target="_blank" rel="noopener noreferrer nofollow" href="https://example.com">Example</a></p>',
        },
        {
            id: 'MD-004',
            description: 'does not convert links with unsafe protocols',
            markdown: '[Bad](javascript:alert(1)',
            expected: '<p>[Bad](javascript:alert(1))</p>',
        },
        {
            id: 'MD-005',
            description: 'does not convert images with unsafe protocols',
            markdown: '![Bad](javascript:alert',
            expected: '<p>![Bad](javascript:alert)</p>',
        },
    ])('$id $description when the closing parenthesis is typed', async ({ markdown, expected }) => {
        const fixture = await initTestFixture('<rich-text-editor label="Description"></rich-text-editor>');
        const editorElement = getEditorElement(fixture.host);

        fixture.host.value = markdown;
        editorElement.focus();
        await fixture.user.type(editorElement, ')');
        await fixture.host.updateComplete;

        expect(fixture.host.value).toBe(expected);
    });

    it.each([
        {
            id: 'MD-006',
            description: 'converts link syntax',
            markdown: '[Example](https://example.com)',
            expected: '<p><a target="_blank" rel="noopener noreferrer nofollow" href="https://example.com">Example</a></p>',
        },
        {
            id: 'MD-007',
            description: 'converts image syntax with a relative URL and spaced title',
            markdown: '![The San Juan Mountains are beautiful](/assets/images/san-juan-mountains.jpg "San Juan Mountains")',
            expected: '<img title="San Juan Mountains" src="/assets/images/san-juan-mountains.jpg" alt="The San Juan Mountains are beautiful">',
        },
        {
            id: 'MD-008',
            description: 'does not convert images with unsafe protocols',
            markdown: '![Bad](data:image/png;base64,AA==)',
            expected: '<p>![Bad](data:image/png;base64,AA==)</p>',
        },
    ])('$id $description when plain-text Markdown is pasted', async ({ markdown, expected }) => {
        const fixture = await initTestFixture('<rich-text-editor label="Description"></rich-text-editor>');
        const editorElement = getEditorElement(fixture.host);

        editorElement.focus();
        await fixture.user.paste(markdown);
        await fixture.host.updateComplete;

        expect(fixture.host.value).toBe(expected);
    });
});

/** @return {HTMLElement | null} */
function getEditorElement(host) {
    return host.querySelector('[data-role="editor"] [contenteditable="true"]');
}

/*
# Rich Text Editor Test Case Listesi

## 1. Component / Value Contract

* [x] RT-001 — Component boş oluşturulduğunda editor açılır.
* [x] RT-002 — Başlangıç `value` HTML'i editörde doğru gösterilir.
* [x] RT-003 — Component connect olmadan önce verilen `value` doğru yüklenir.
* [x] RT-004 — Connect olduktan sonra programatik `value` değişikliği editöre yansır.
* [x] RT-005 — Kullanıcı edit yaptığında component `value` güncellenir.
* [x] RT-006 — Programatik `value` ataması kullanıcı input'u gibi değerlendirilmez.
* [x] RT-007 — Aynı `value` tekrar atanırsa gereksiz transaction/event oluşmaz.
* [x] RT-008 — Boş editor component seviyesinde canonical boş değere normalize edilir.
* [x] RT-009 — `<p></p>` boş içerik olarak kabul edilir.
* [x] RT-010 — Yalnız whitespace içeren içerik için boşluk semantiği doğru çalışır.
* [x] RT-011 — Component DOM'dan kaldırıldığında Tiptap instance destroy edilir.
* [x] RT-012 — Remove/reconnect sonrası editor tekrar düzgün çalışır.
* [x] RT-013 — Sayfada birden fazla editor birbirinden bağımsız çalışır.
* [x] RT-014 — Bir editorün toolbar, selection veya state'i diğer editorü etkilemez.

---

## 2. Form Integration

* [x] FORM-001 — `name` varsa form submit sırasında editor değeri gönderilir.
* [x] FORM-002 — `name` yoksa form verisine dahil edilmez.
* [x] FORM-003 — Başlangıç değeri submit edilir.
* [x] FORM-004 — Kullanıcı tarafından değiştirilmiş değer submit edilir.
* [x] FORM-005 — `form.reset()` başlangıç değerini geri yükler.
* [x] FORM-006 — Reset sonrası editor DOM'u da başlangıç değerine döner.
* [x] FORM-007 — `disabled` durumda edit yapılamaz.
* [x] FORM-008 — `disabled` durumda değer form submit'e dahil edilmez.
* [x] FORM-009 — `readonly` durumda içerik değiştirilemez.
* [x] FORM-010 — `readonly` durumda değer form submit'e dahil edilir.
* [x] FORM-011 — `required` + boş editor invalid olur.
* [x] FORM-012 — `required` + `<p></p>` invalid olur.
* [x] FORM-013 — Gerçek içerik girildiğinde validity düzelir.
* [x] FORM-014 — Programatik `value` değişimi validity durumunu günceller.
* [x] FORM-015 — `maxlength` tanımlıysa limit uygulanır.
* [x] FORM-016 — `maxlength` kaldırıldığında limit kaldırılır.

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

* [x] LINK-001 — Selected text'e link eklenir.
* [x] LINK-002 — Mevcut link URL'i değiştirilebilir.
* [x] LINK-003 — Link kaldırılabilir.
* [x] LINK-004 — Link text'i değiştirilebilir.
* [x] LINK-005 — URL yazıldığında autolink davranışı doğru çalışır.
* [x] LINK-006 — URL paste edildiğinde autolink davranışı doğru çalışır.
* [x] LINK-007 — Selected text üzerine URL paste davranışı belirlenen sözleşmeye uyar.
* [x] LINK-008 — `https://` URL kabul edilir.
* [x] LINK-009 — `http://` URL politikaya göre kabul/reddedilir.
* [x] LINK-010 — Relative URL politikaya göre kabul/reddedilir.
* [x] LINK-011 — `mailto:` politikaya göre kabul/reddedilir.
* [x] LINK-012 — `tel:` politikaya göre kabul/reddedilir.
* [x] LINK-013 — Boş href link oluşturmaz.
* [x] LINK-014 — Baştaki/sondaki whitespace normalize edilir.
* [x] LINK-015 — `javascript:` URL reddedilir.
* [x] LINK-016 — Mixed-case tehlikeli scheme reddedilir.
* [x] LINK-017 — Control character içeren tehlikeli URL bypass edemez.
* [x] LINK-018 — Output link'te beklenen `rel` attribute'u bulunur.
* [x] LINK-019 — `_blank` target politikası doğru uygulanır.
* [x] LINK-020 — Edit modunda link click yanlışlıkla navigation başlatmaz.
* [x] LINK-021 — Link copy/paste sonrası korunur.
* [x] LINK-022 — Link undo/redo çalışır.

---

## 14. Images

* [x] IMG-001 — URL ile image eklenebilir.
* [x] IMG-002 — `src` serialize edilir.
* [x] IMG-003 — `alt` serialize edilir.
* [x] IMG-004 — `title` serialize edilir.
* [ ] IMG-005 — Image seçilebilir.
* [ ] IMG-006 — Image silinebilir.
* [ ] IMG-007 — Image insertion undo/redo çalışır.
* [ ] IMG-008 — Broken image URL editorü bozmaz.
* [ ] IMG-009 — Boş URL image oluşturmaz.
* [ ] IMG-010 — Unsupported URL scheme politikaya göre engellenir.
* [x] IMG-011 — Base64 image varsayılan politikaya göre reddedilir.
* [x] IMG-012 — Image HTML round-trip'te korunur.
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

## 15. Markdown Dönüşümleri

* [x] MD-001 — Kapanış parantezi yazıldığında Markdown image syntax'ı dönüştürülür.
* [x] MD-002 — Relative URL ve boşluklu title içeren Markdown image syntax'ı dönüştürülür.
* [x] MD-003 — Kapanış parantezi yazıldığında Markdown link syntax'ı dönüştürülür.
* [x] MD-004 — Güvensiz protokollü Markdown link dönüştürülmez.
* [x] MD-005 — Güvensiz protokollü Markdown image dönüştürülmez.
* [x] MD-006 — Plain-text paste edilen Markdown link syntax'ı dönüştürülür.
* [x] MD-007 — Plain-text paste edilen relative URL ve title içeren Markdown image syntax'ı dönüştürülür.
* [x] MD-008 — Plain-text paste edilen Base64 image dönüştürülmez.

---

## 16. Tables

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

## 17. Plain Text Clipboard

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

## 18. Rich HTML Clipboard

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

## 19. External Clipboard Sources

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

## 20. Paste Normalization

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

## 21. Security / Hostile HTML

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

## 22. Serialization / Persistence

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

## 23. Events

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

## 24. Toolbar

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

## 25. Keyboard Shortcuts

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

## 26. Accessibility

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

## 27. Light DOM / CSS Integration

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

## 28. Lifecycle / Memory

* [ ] LIFE-001 — Component connect olduğunda tek editor instance oluşturulur.
* [ ] LIFE-002 — Property/attribute update yeni gereksiz editor instance oluşturmaz.
* [ ] LIFE-003 — Disconnect olduğunda editor destroy edilir.
* [ ] LIFE-004 — Disconnect sonrası event listener'lar kaldırılır.
* [ ] LIFE-005 — Reconnect sonrası editor tekrar çalışır.
* [ ] LIFE-006 — Reconnect sonrası duplicate event oluşmaz.
* [ ] LIFE-007 — 100 mount/destroy sonrası belirgin memory leak oluşmaz.
* [ ] LIFE-008 — Async upload devam ederken destroy güvenli şekilde ele alınır.

---

## 29. Stress / Resilience

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

## 30. Cross-Browser

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
