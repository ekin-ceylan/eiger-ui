import { html } from 'lit';
import { Editor } from '@tiptap/core';
import { extensions, formatEditorContent } from '../../modules/rich-text-helpers/rich-text-helper.js';
import RichTextImageForm from './rich-text-image-form.js';
import RichTextLinkForm from './rich-text-link-form.js';
import RichTextImage from '../../models/RichTextImage.js';
import RichTextEditorLink from '../../models/RichTextEditorLink.js';
import { defineComponent, ifDefined, isEmpty } from '../../modules/utilities.js';
import { Placeholder } from '@tiptap/extensions';
import StandardControlBase from '../../base/standard-control-base.js';
import { spread } from '../../modules/spread.js';

/** @typedef {1 | 2 | 3 | 4 | 5 | 6} HeadingLevel */

export default class RichTextEditor extends StandardControlBase {
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
        if (!this.editor) return 'p';
        if (this.editor.isActive('heading', { level: 1 })) return 'h1';
        if (this.editor.isActive('heading', { level: 2 })) return 'h2';
        if (this.editor.isActive('heading', { level: 3 })) return 'h3';
        if (this.editor.isActive('heading', { level: 4 })) return 'h4';
        if (this.editor.isActive('heading', { level: 5 })) return 'h5';
        if (this.editor.isActive('heading', { level: 6 })) return 'h6';
        if (this.editor.isActive('blockquote')) return 'blockquote';
        if (this.editor.isActive('codeBlock')) return 'codeBlock';
        return 'p';
    }

    /**
     * Returns the reference to the native input element within the component. Caches the reference after the first query for performance optimization.
     * @returns {HTMLInputElement | null}
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
        this.placeholder = 'Bir şeyler yazın...'; // Varsayılan yer tutucu metin
        this.editor = null;
    }

    connectedCallback() {
        super.connectedCallback();

        // Component DOM'a tekrar eklendiyse (reconnect), editörü yeniden başlat (RT-012)
        if (this.hasUpdated && !this.editor) {
            this.updateComplete.then(() => this.#initEditor());
        }
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        // DOM'dan çıkışta editör instance'ını temizle (RT-011, P0-029)
        if (this.editor) {
            this.editor.destroy();
            this.editor = null;
        }
    }

    firstUpdated(changedProperties) {
        super.firstUpdated(changedProperties);

        this.#initEditor();
        this.#linkForm = this.renderRoot.querySelector('rt-link-form');
        this.#imageForm = this.renderRoot.querySelector('rt-image-form');

        this.#editorContainer.addEventListener('mouseover', event => {
            // Tıklanan öğe veya onun bir üst öğesi <a> etiketi mi?
            const target = /** @type {HTMLElement} */ (event.target);
            const linkElement = target.closest('a');

            if (linkElement) {
                // event.preventDefault(); // İsteğe bağlı: Linkin sayfayı değiştirmesini engelle

                const url = linkElement.getAttribute('href');
                console.log('hover!', url);
                console.log('Tıklanan DOM Elementi:', linkElement);

                // Burada istediğin işlemi yapabilirsin (Örn: özel bir tooltip açmak)
            }
        });
    }

    updated(changedProperties) {
        super.updated(changedProperties);

        if (changedProperties.has('value')) {
            const currentHtml = this.editor.isEmpty ? '' : this.editor.getHTML();
            const newValue = this.value || '';

            if (currentHtml !== newValue) {
                this.editor.commands.setContent(newValue, { emitUpdate: false }); // false = emitUpdate kapatır
                this.inputElement.value = formatEditorContent(newValue);
                this.dispatchCustomEvent('update');
            }
        }
    }

    valueUpdated() {
        const currentHtml = this.editor.isEmpty ? '' : this.editor.getHTML();
        const newValue = this.value || '';

        if (currentHtml !== newValue) {
            this.editor.commands.setContent(newValue, { emitUpdate: false }); // false = emitUpdate kapatır
            this.inputElement.value = formatEditorContent(newValue);
            this.#checkValidity(false);

            return true;
        }

        return false;
    }

    setupFirstInteraction() {
        this.addEventListener('input', _e => this.dispatchCustomEvent('first-interaction'), { once: true });
    }

    #initEditor() {
        this.#editorContainer = this.renderRoot.querySelector('[data-role="editor"]');
        if (!this.#editorContainer || this.editor) return;

        this.editor = new Editor({
            element: this.#editorContainer,
            extensions: [...extensions, Placeholder.configure({ placeholder: this.placeholder })],
            content: this.value, // Başlangıç değeri
            onUpdate: this.#onEditorUpdate.bind(this),
            onTransaction: () => this.requestUpdate(), // Her işlemde component'i güncelle
        });
    }

    #checkValidity(force = false) {
        const valueMissing = this.required && isEmpty(this.value);
        const isDeleted = this.interacted && valueMissing; // blur olmadan yazıp sildi mi

        // invalid ise her inputta tekrar kontrol et
        if (!force && !this.invalid && !isDeleted) return true;

        return this.checkValidity();
    }

    /** @param {{ editor: import('@tiptap/core').Editor }} props */
    #onEditorUpdate(props) {
        const editor = props.editor;
        let htmlContent = editor.getHTML();

        // Boş editor durumunu canonical bir yapıya (<empty string>) normalize et (RT-008, RT-009, P0-004)
        if (editor.isEmpty || htmlContent === '<p></p>') {
            htmlContent = '';
        }

        // Kullanıcı kaynaklı bir değişiklik varsa value'yu güncelle ve event fırlat
        if (this.value !== htmlContent) {
            this.value = htmlContent; // RT-005, P0-002
            this.inputElement.value = formatEditorContent(htmlContent);
            this.#checkValidity(false);
            this.dispatchCustomEvent('input'); // EVT-001
        }
    }

    #onInput(event) {
        const newValue = event.target.value;
        const currentValue = formatEditorContent(this.value);

        if (currentValue !== newValue) {
            this.editor.commands.setContent(newValue, { emitUpdate: false }); // false = emitUpdate kapatır
            this.value = this.editor.isEmpty ? '' : this.editor.getHTML();
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

    #onLinkFormSubmit(event) {
        /** @type {RichTextEditorLink} */
        const linkModel = event.target.value;

        // URL silindiyse sildiyse ve submit dediyse, linki kaldır.
        if (!linkModel.url) {
            this.#onLinkFormRemove();
            return;
        }

        const chain = this.editor.chain().focus();

        if (linkModel.isBlock) {
            const target = linkModel.blank ? '_blank' : null;
            chain.updateAttributes('blockLink', { href: linkModel.url, target }).run();
        } else {
            // düzenleme moduysa tüm linki seç
            if (this.editor.isActive('link')) {
                chain.extendMarkRange('link');
            }

            chain.insertContent(linkModel.node).run();
        }

        this.#linkForm.hidePopover(); // İşlem bittikten sonra popover'ı kapat
    }

    #onLinkFormCancel() {
        this.#linkForm.hidePopover();
    }

    #onLinkFormToggle(event) {
        if (event.newState === 'closed') {
            this.#linkForm.value = new RichTextEditorLink();
            this.editor.commands.focus(); // Popover kapanınca odak editöre dönsün
            this.requestUpdate();
            this.#linkForm.requestUpdate();
        }
    }

    #onLinkFormRemove() {
        this.editor.chain().focus().extendMarkRange('link').unsetLink().run();
        this.#linkForm.hidePopover();
    }

    #onImageFormSubmit(event) {
        /** @type {RichTextImage} */
        const imageModel = event.target.value;

        if (!imageModel.url) return;

        this.editor.chain().focus().setImage(imageModel.node).run();
        this.#imageForm.hidePopover();
    }

    #onImageFormCancel() {
        this.#imageForm.hidePopover();
    }

    #onImageFormToggle(event) {
        if (event.newState === 'closed') {
            this.#imageForm.value = new RichTextImage();
            this.editor.commands.focus();
        }
    }

    #toggleBold = () => this.editor?.chain().focus().toggleBold().run();
    #toggleItalic = () => this.editor?.chain().focus().toggleItalic().run();
    #toggleStrike = () => this.editor?.chain().focus().toggleStrike().run();
    #toggleBulletList = () => this.editor?.chain().focus().toggleBulletList().run();
    #toggleOrderedList = () => this.editor?.chain().focus().toggleOrderedList().run();
    #undo = () => this.editor?.chain().focus().undo().run();
    #redo = () => this.editor?.chain().focus().redo().run();

    /** @param {number} from */
    #openLinkFormPopover(from) {
        this.#linkForm.showPopover();

        const coords = this.editor.view.coordsAtPos(from); // İmlecin ekrandaki koordinatlarını al

        this.#linkForm.style.margin = '0'; // Popover'ı ekranın ortasına sabitleyen varsayılan margin'i sıfırla
        this.#linkForm.style.top = `${coords.bottom + 10}px`; // Metnin hemen altına (10px boşlukla) yerleştir

        const popoverRect = this.#linkForm.getBoundingClientRect(); // Popover'ın ekranın sağından taşmasını engellemek için basit bir kontrol
        const oveflowRight = coords.left + popoverRect.width > window.innerWidth;
        this.#linkForm.style.left = oveflowRight ? `${window.innerWidth - popoverRect.width - 20}px` : `${coords.left}px`;
    }

    #showLinkForm() {
        if (!this.editor) return;

        let { from, to, empty } = this.editor.state.selection;
        const chain = this.editor.chain().focus();
        const isLink = this.editor.isActive('link');
        const isBlock = this.editor.isActive('blockLink');

        // linkin içinde ama seçim yoksa seçimi genişlet
        if (isLink && empty) {
            chain.extendMarkRange('link').run();
            const newSelection = this.editor.state.selection;
            from = newSelection.from;
            to = newSelection.to;
            empty = newSelection.empty;
        }

        const linkAttrs = isBlock ? this.editor.getAttributes('blockLink') : this.editor.getAttributes('link');
        const url = linkAttrs?.href || '';
        const blank = linkAttrs?.target === '_blank';
        const text = empty || isBlock ? '' : this.editor.state.doc.textBetween(from, to, ' ');

        this.#linkForm.value = new RichTextEditorLink({ text, url, blank, isBlock });
        this.#openLinkFormPopover(from);
        this.requestUpdate();
    }

    #showImageForm() {
        if (!this.editor) return;

        const { from } = this.editor.state.selection;
        const attr = this.editor.getAttributes('image');
        this.#imageForm.value = new RichTextImage({ url: attr?.src || '', alt: attr?.alt || '' });
        this.#imageForm.showPopover();

        const coords = this.editor.view.coordsAtPos(from);
        this.#imageForm.style.margin = '0';
        this.#imageForm.style.top = `${coords.bottom + 10}px`;

        const popoverRect = this.#imageForm.getBoundingClientRect();
        const overflowRight = coords.left + popoverRect.width > window.innerWidth;
        this.#imageForm.style.left = overflowRight ? `${window.innerWidth - popoverRect.width - 20}px` : `${coords.left}px`;
    }

    #handleBlockTypeChange(e) {
        const value = e.target.value;
        const chain = this.editor.chain().focus();

        if (value === 'p') {
            chain.setParagraph().run();
        } else if (value.startsWith('h')) {
            const level = /** @type {HeadingLevel} */ (Number.parseInt(value.charAt(1), 10));
            chain.toggleHeading({ level }).run();
        } else if (value === 'blockquote') {
            chain.toggleBlockquote().run();
        } else if (value === 'codeBlock') {
            chain.toggleCodeBlock().run();
        }
    }

    renderButton(clickListener, label, title, ...pressedArgs) {
        const [name, attributes] = pressedArgs;
        const ariaPressed = this.editor?.isActive(name, attributes) ? 'true' : 'false';
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
        const canUndo = this.editor?.can().undo() ?? false;
        const canRedo = this.editor?.can().redo() ?? false;

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
            <rt-link-form
                @submit=${this.#onLinkFormSubmit}
                @remove=${this.#onLinkFormRemove}
                @toggle=${this.#onLinkFormToggle}
                @cancel=${this.#onLinkFormCancel}
                popover="auto"
            ></rt-link-form>
            <rt-image-form @submit=${this.#onImageFormSubmit} @toggle=${this.#onImageFormToggle} @cancel=${this.#onImageFormCancel} popover="auto"></rt-image-form>
            ${this.renderClearButton()} ${this.renderErrorMessage()}`;
    }
}

defineComponent('rt-link-form', RichTextLinkForm);
defineComponent('rt-image-form', RichTextImageForm);
