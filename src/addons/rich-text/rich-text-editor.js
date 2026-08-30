import { html, nothing } from 'lit';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { SlotCollectorMixin, StandardControlBase, defineComponent, ifDefined, isEmpty, mixins, spread } from 'custom-ui';
import { formatEditorContent, trimTrailingP } from './modules/rich-text-helper.js';
import RichTextImage from './models/RichTextImage.js';
import RichTextEditorLink from './models/RichTextEditorLink.js';
import { RichTextImageForm, RichTextLinkForm } from './rich-text-popover-forms.js';
import createAttributeExtension from './modules/attribute-extensions.js';
import createElementExtensions from './modules/element-extensions.js';

/**
 * Rich Text Editor component for the Custom UI library.
 * Provides a rich text editing interface with support for images, links, and various text formatting options.
 */
export default class RichTextEditor extends mixins(StandardControlBase, SlotCollectorMixin) {
    /** @type {Editor | null} */
    #editor = null;
    #slotContent = '';
    #cachedInput = undefined;
    /** @type {HTMLElement | null} */
    #editorContainer = null;
    /** @type {RichTextLinkForm | null} */
    #linkForm = null;
    /** @type {RichTextImageForm | null} */
    #imageForm = null;
    #showSourceCode = false; // Kaynak kodu göster/gizle durumu

    /** Undo button title from locale messages */
    get undoButtonTitle() {
        return this.localeMessages.undoButtonTitle;
    }

    /** Redo button title from locale messages */
    get redoButtonTitle() {
        return this.localeMessages.redoButtonTitle;
    }

    get activeBlock() {
        if (!this.#editor) return 'p';
        if (this.#editor.isActive('heading', { level: 1 })) return 'h1';
        if (this.#editor.isActive('heading', { level: 2 })) return 'h2';
        if (this.#editor.isActive('heading', { level: 3 })) return 'h3';
        if (this.#editor.isActive('heading', { level: 4 })) return 'h4';
        if (this.#editor.isActive('heading', { level: 5 })) return 'h5';
        if (this.#editor.isActive('heading', { level: 6 })) return 'h6';
        if (this.#editor.isActive('blockquote')) return 'blockquote';
        if (this.#editor.isActive('codeBlock')) return 'codeBlock';
        return 'p';
    }

    /**
     * Returns the reference to the native input element within the component. Caches the reference after the first query for performance optimization.
     * @returns {HTMLTextAreaElement | null}
     */
    get inputElement() {
        if (this.#cachedInput === undefined) {
            this.#cachedInput = this.renderRoot?.querySelector('textarea[data-role="source"]');
        }

        return this.#cachedInput;
    }

    constructor() {
        super();
        this.value = '';
        this.placeholder = ''; // Varsayılan yer tutucu metin
    }

    connectedCallback() {
        super.connectedCallback();

        // Component DOM'a tekrar eklendiyse (reconnect), editörü yeniden başlat (RT-012)
        if (this.hasUpdated && !this.#editor) {
            this.updateComplete.then(() => this.#initEditor());
        }
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        // DOM'dan çıkışta editör instance'ını temizle (RT-011, P0-029)
        if (this.#editor) {
            this.#editor.destroy();
            this.#editor = null;
        }
    }

    firstUpdated(changedProperties) {
        super.firstUpdated(changedProperties);

        this.#initEditor();
        this.#linkForm = this.renderRoot.querySelector('rt-link-form');
        this.#imageForm = this.renderRoot.querySelector('rt-image-form');

        // this.#editorContainer.addEventListener('mouseover', event => {
        //     // Tıklanan öğe veya onun bir üst öğesi <a> etiketi mi?
        //     const target = /** @type {HTMLElement} */ (event.target);
        //     const linkElement = target.closest('a');

        //     if (linkElement) {
        //         // event.preventDefault(); // İsteğe bağlı: Linkin sayfayı değiştirmesini engelle

        //         const url = linkElement.getAttribute('href');
        //         console.log('hover!', url);
        //         console.log('Tıklanan DOM Elementi:', linkElement);

        //         // Burada istediğin işlemi yapabilirsin (Örn: özel bir tooltip açmak)
        //     }
        // });
    }

    // #region INTERNAL HOOKS

    /**
     * @param {HTMLElement|Text} node
     * @param {string} slotName
     * @returns {boolean}
     * @override
     */
    validateNode(node, slotName) {
        if (slotName !== 'default') return true;

        if (!isEmpty(this.value)) {
            console.warn('Value is already set via property. Ignoring slotted nodes.');
            return false;
        }

        if (node.nodeType === Node.TEXT_NODE) {
            this.#slotContent += node.textContent.trim() ?? '';
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            this.#slotContent += /** @type {HTMLElement} */ (node).outerHTML ?? '';
        }

        return false;
    }

    afterSlotsBinded(hasProjectedContent) {
        if (hasProjectedContent && isEmpty(this.value)) {
            this.value = this.#slotContent;
        }
    }

    /** @override @protected */
    valueUpdated() {
        const currentHtml = this.#getCleanEditorContent(this.#editor);
        const newValue = this.value || '';

        if (currentHtml !== newValue) {
            this.#editor.commands.setContent(newValue, { emitUpdate: false, parseOptions: { preserveWhitespace: true } });
            this.#onEditorUpdate(this.#editor);

            return true;
        }

        return false;
    }

    setupFirstInteraction() {
        this.addEventListener('input', _e => this.dispatchCustomEvent('first-interaction'), { once: true });
    }

    // #endregion INTERNAL HOOKS

    #initEditor() {
        this.#editorContainer = this.renderRoot.querySelector('[data-role="editor"]');
        if (!this.#editorContainer || this.#editor) return;

        const starterKitExtension = StarterKit.configure({ link: { openOnClick: false, markdownLinks: true } });
        const attrExtension = createAttributeExtension();
        const elementExtensions = createElementExtensions();

        this.#editor = new Editor({
            element: this.#editorContainer,
            extensions: [starterKitExtension, attrExtension, ...elementExtensions],
            content: this.value,
            onUpdate: ({ editor }) => this.#onEditorUpdate(editor),
            onTransaction: () => this.requestUpdate(), // Her işlemde component'i güncelle
        });

        this.#onEditorUpdate(this.#editor);
        // this.inputElement.value = formatEditorContent(this.value);
    }

    #checkValidity(force = false) {
        const valueMissing = this.required && isEmpty(this.value);
        const isDeleted = this.interacted && valueMissing; // blur olmadan yazıp sildi mi

        // invalid ise her inputta tekrar kontrol et
        if (!force && !this.invalid && !isDeleted) return true;

        return this.checkValidity();
    }

    /** @param {import('@tiptap/core').Editor} editor */
    #getCleanEditorContent(editor) {
        if (!editor) return '';
        const content = editor.getHTML();

        return trimTrailingP(content);
    }

    /** @param {import('@tiptap/core').Editor} editor */
    #onEditorUpdate(editor) {
        let htmlContent = editor.getHTML();
        htmlContent = trimTrailingP(htmlContent);

        // Kullanıcı kaynaklı bir değişiklik varsa value'yu güncelle ve event fırlat
        if (this.value !== htmlContent) {
            this.value = htmlContent; // RT-005, P0-002
            this.dispatchCustomEvent('input'); // EVT-001
        }

        this.inputElement.value = formatEditorContent(htmlContent);
        this.#checkValidity(false);

        this.requestUpdate();
    }

    #onInput(event) {
        const newValue = event.target.value;
        const currentValue = formatEditorContent(this.value);

        if (currentValue !== newValue) {
            this.#editor.commands.setContent(newValue, { emitUpdate: false, parseOptions: { preserveWhitespace: true } });
            this.value = this.#getCleanEditorContent(this.#editor);
            this.#checkValidity(false);
            this.dispatchCustomEvent('input');
        }
    }

    #onBlur(event) {
        event.target.value = formatEditorContent(this.value);
        this.#checkValidity(true);
    }

    #onBtnCodeClick(_event) {
        this.#showSourceCode = !this.#showSourceCode;
        this.requestUpdate();
    }

    #onLinkSubmit(event) {
        /** @type {RichTextEditorLink} */
        const linkModel = event.target.value;

        // URL silindiyse sildiyse ve submit dediyse, linki kaldır.
        if (!linkModel.url) {
            this.#onLinkRemove();
            return;
        }

        const chain = this.#editor.chain().focus();

        if (linkModel.isBlock) {
            const target = linkModel.blank ? '_blank' : null;
            chain.updateAttributes('blockLink', { href: linkModel.url, target }).run();
        } else {
            // düzenleme moduysa tüm linki seç
            if (this.#editor.isActive('link')) {
                chain.extendMarkRange('link');
            }

            chain.insertContent(linkModel.node).run();
        }

        this.#linkForm.hidePopover(); // İşlem bittikten sonra popover'ı kapat
    }

    #onLinkCancel() {
        this.#linkForm.hidePopover();
    }

    #onLinkToggle(event) {
        if (event.newState === 'closed') {
            this.#linkForm.value = new RichTextEditorLink();
            this.#linkForm.reset(); // Formu sıfırla
            this.#editor.commands.focus(); // Popover kapanınca odak editöre dönsün
        }
    }

    #onLinkRemove() {
        this.#editor.chain().focus().extendMarkRange('link').unsetLink().run();
        this.#linkForm.hidePopover();
    }

    #onImageSubmit(event) {
        /** @type {RichTextImage} */
        const imageModel = event.target.value;

        if (!imageModel.url) return;

        this.#editor.chain().focus().insertContent({ type: 'image', attrs: imageModel.node }).run();
        this.#imageForm.hidePopover();
    }

    #onImageCancel() {
        this.#imageForm.hidePopover();
    }

    #onImageToggle(event) {
        if (event.newState === 'closed') {
            this.#imageForm.value = new RichTextImage();
            this.#imageForm.reset(); // Formu sıfırla
            this.#editor.commands.focus();
        }
    }

    #toggleBold = () => this.#editor?.chain().focus().toggleBold().run();
    #toggleItalic = () => this.#editor?.chain().focus().toggleItalic().run();
    #toggleStrike = () => this.#editor?.chain().focus().toggleStrike().run();
    #toggleBulletList = () => this.#editor?.chain().focus().toggleBulletList().run();
    #toggleOrderedList = () => this.#editor?.chain().focus().toggleOrderedList().run();
    #undo = () => this.#editor?.chain().focus().undo().run();
    #redo = () => this.#editor?.chain().focus().redo().run();

    #showLinkForm() {
        if (!this.#editor) return;

        let { from, to, empty } = this.#editor.state.selection;
        const chain = this.#editor.chain().focus();
        const isLink = this.#editor.isActive('link');
        const isBlock = this.#editor.isActive('blockLink');

        // linkin içinde ama seçim yoksa seçimi genişlet
        if (isLink && empty) {
            chain.extendMarkRange('link').run();
            const newSelection = this.#editor.state.selection;
            from = newSelection.from;
            to = newSelection.to;
            empty = newSelection.empty;
        }

        const linkAttrs = isBlock ? this.#editor.getAttributes('blockLink') : this.#editor.getAttributes('link');
        const url = linkAttrs?.href || '';
        const blank = linkAttrs?.target === '_blank';
        const text = empty || isBlock ? '' : this.#editor.state.doc.textBetween(from, to, ' ');

        this.#linkForm.value = new RichTextEditorLink({ text, url, blank, isBlock });
        this.#openLinkFormPopover(from);
    }

    #showImageForm() {
        if (!this.#editor) return;

        const { from } = this.#editor.state.selection;
        const attr = this.#editor.getAttributes('image');
        this.#imageForm.value = new RichTextImage({ url: attr?.src || '', alt: attr?.alt || '' });
        this.#openImageFormPopover(from);
    }

    /** @param {number} from */
    #openLinkFormPopover(from) {
        this.#linkForm.showPopover();

        const coords = this.#editor.view.coordsAtPos(from); // İmlecin ekrandaki koordinatlarını al

        this.#linkForm.style.margin = '0'; // Popover'ı ekranın ortasına sabitleyen varsayılan margin'i sıfırla
        this.#linkForm.style.top = `${coords.bottom + 10}px`; // Metnin hemen altına (10px boşlukla) yerleştir

        const popoverRect = this.#linkForm.getBoundingClientRect(); // Popover'ın ekranın sağından taşmasını engellemek için basit bir kontrol
        const overflowRight = coords.left + popoverRect.width > window.innerWidth;
        this.#linkForm.style.left = overflowRight ? `${window.innerWidth - popoverRect.width - 20}px` : `${coords.left}px`;
    }

    /** @param {number} from */
    #openImageFormPopover(from) {
        this.#imageForm.showPopover();

        const coords = this.#editor.view.coordsAtPos(from);
        this.#imageForm.style.margin = '0';
        this.#imageForm.style.top = `${coords.bottom + 10}px`;

        const popoverRect = this.#imageForm.getBoundingClientRect();
        const overflowRight = coords.left + popoverRect.width > window.innerWidth;
        this.#imageForm.style.left = overflowRight ? `${window.innerWidth - popoverRect.width - 20}px` : `${coords.left}px`;
    }

    #handleBlockTypeChange(e) {
        const value = e.target.value;
        const chain = this.#editor.chain().focus();

        if (value === 'p') {
            chain.setParagraph().run();
        } else if (value.startsWith('h')) {
            const level = /** @type { 1 | 2 | 3 | 4 | 5 | 6 } */ (Number.parseInt(value.charAt(1), 10));
            chain.toggleHeading({ level }).run();
        } else if (value === 'blockquote') {
            chain.toggleBlockquote().run();
        } else if (value === 'codeBlock') {
            chain.toggleCodeBlock().run();
        }
    }

    /** @returns {import('lit').TemplateResult | typeof nothing} */
    renderPlaceholder() {
        if (!isEmpty(this.value)) return nothing;

        return html`<span data-role="placeholder" aria-hidden="true">${this.placeholder}</span>`;
    }

    renderButton(clickListener, label, title, ...pressedArgs) {
        const [name, attributes] = pressedArgs;
        const ariaPressed = this.#editor?.isActive(name, attributes) ? 'true' : 'false';
        return html`<button type="button" @click=${clickListener} aria-pressed=${ariaPressed} title="${title}">${label}</button>`;
    }

    renderBlockSelection() {
        return html`<select @change=${this.#handleBlockTypeChange} .value=${this.activeBlock} aria-label="Text Style">
            <option value="p">Paragraph</option>
            <option value="h1">Heading 1</option>
            <option value="h2">Heading 2</option>
            <option value="h3">Heading 3</option>
            <option value="h4">Heading 4</option>
            <option value="h5">Heading 5</option>
            <option value="h6">Heading 6</option>
            <option value="blockquote">Blockquote</option>
            <option value="codeBlock">Code Block</option>
        </select>`;
    }

    render() {
        const canUndo = this.#editor?.can().undo() ?? false;
        const canRedo = this.#editor?.can().redo() ?? false;

        const btnUndo = html`<button type="button" @click=${this.#undo} ?disabled=${!canUndo} title="${this.undoButtonTitle}">↩</button>`;
        const btnRedo = html`<button type="button" @click=${this.#redo} ?disabled=${!canRedo} title="${this.redoButtonTitle}">↪</button>`;
        const btnLink = this.renderButton(this.#showLinkForm, '🔗', 'Bağlantı Ekle', 'link');
        const btnImage = this.renderButton(this.#showImageForm, '▧', 'Görsel Ekle', 'image');

        const btnBold = this.renderButton(this.#toggleBold, 'B', 'Bold', 'bold');
        const btnItalic = this.renderButton(this.#toggleItalic, 'I', 'Italic', 'italic');
        const btnStrike = this.renderButton(this.#toggleStrike, 'S', 'Strike', 'strike');
        const btnBulletList = this.renderButton(this.#toggleBulletList, '•', 'Bullet List', 'bulletList');
        const btnOrderedList = this.renderButton(this.#toggleOrderedList, '1.', 'Ordered List', 'orderedList');

        return html`${this.renderLabel()}
            <div role="toolbar">
                <button type="button" @click=${this.#onBtnCodeClick} aria-pressed=${this.#showSourceCode}>${'</>'}</button>
                ${btnUndo} ${btnRedo} ${this.renderBlockSelection()} ${btnBold} ${btnItalic} ${btnStrike} ${btnBulletList} ${btnOrderedList} ${btnLink} ${btnImage}
            </div>
            <div data-role="container">
                <div data-role="editor"></div>
                <textarea
                    ${spread(this.getScopedAttrs('input'))}
                    id=${this.fieldId}
                    name=${ifDefined(this.name)}
                    ?hidden=${!this.#showSourceCode}
                    aria-labelledby=${ifDefined(this.labelId)}
                    aria-label=${ifDefined(this.hideLabel ? this.label : undefined)}
                    aria-errormessage=${ifDefined(this.errorId)}
                    aria-required=${this.required ? 'true' : 'false'}
                    aria-invalid=${ifDefined(this.ariaInvalid)}
                    ?required=${this.required}
                    @input=${this.#onInput}
                    @blur=${this.#onBlur}
                    data-role="source"
                ></textarea>
                ${this.renderPlaceholder()} ${this.renderClearButton()}
            </div>
            <rt-link-form @submit=${this.#onLinkSubmit} @remove=${this.#onLinkRemove} @toggle=${this.#onLinkToggle} @cancel=${this.#onLinkCancel} popover="auto"></rt-link-form>
            <rt-image-form @submit=${this.#onImageSubmit} @toggle=${this.#onImageToggle} @cancel=${this.#onImageCancel} popover="auto"></rt-image-form>
            ${this.renderErrorMessage()}`;
    }
}

defineComponent('rt-link-form', RichTextLinkForm);
defineComponent('rt-image-form', RichTextImageForm);

/*
npm install listesi
esbuild ile tek dosya üretme
importmap’e eklenecek minimal kayıt
view içinde kullanım örneği
*/

/*
Blokları alt alta yaz
class ekle
attr ekle
link ekle

*/

/*
 - Auto-resize: içerik arttıkça yüksekliğin otomatik büyümesi
 - Min/max rows: satır sayısına göre daha kontrollü büyüme
 - Soft limit / hard limit ayrımı: maxlength yakınında uyarı, aşınca engelleme
 - Disabled/read-only görsel ayrımı: sadece davranış değil stil olarak da farklı görünüm
 - Auto-select on focus: odaklanınca tüm metni seçme opsiyonu
 - Mention / autocomplete support: @etiket, öneri listesi, chip dönüşümü
 - Markdown mode: düz text alanı ama markdown yazım desteği
 - Code-like mode: monospace, tab insert, satır numarası gibi geliştirici odaklı ekler
 - Paste normalization: yapıştırılan metni temizleme veya dönüştürme
 - Enter behavior controls: enter ile submit, shift+enter ile yeni satır gibi kurallar
 - History / undo helpers: özellikle editor benzeri senaryolarda
 - Autosave / draft support: yazılanı geçici olarak saklama
 - Slot başlangıç içeriği ile birlikte initial value precedence: bunu zaten ele aldık, ama resmi API’ye bağlanabilir

 Benim öncelik sıram şu olurdu:
 - Auto-resize
 - Min/max rows
 - Paste normalization
 - Markdown veya mention gibi daha özel editör özellikleri
*/
