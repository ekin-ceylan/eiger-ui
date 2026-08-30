import { html, nothing } from 'lit';
import { LightComponentBase, TextControlBase, defineComponent, CheckBox } from 'custom-ui';
import RichTextImage from './models/RichTextImage.js';
import RichTextEditorLink from './models/RichTextEditorLink.js';

/** @extends {LightComponentBase} */
class RichTextPopoverFormBase extends LightComponentBase {
    static get properties() {
        return {
            ...super.properties,
            value: { type: Object, state: true },
        };
    }

    /**
     * @returns {RichTextPopoverUrlBox}
     * @protected
     */
    get urlInput() {
        return this.renderRoot.querySelector('rtp-url-box');
    }
    /**
     * @returns {RichTextPopoverTextBox}
     * @protected
     */
    get textInput() {
        return this.renderRoot.querySelector('rtp-text-box');
    }

    /**
     * @returns {HTMLFormElement}
     * @protected
     */
    get formElement() {
        return this.renderRoot.querySelector('form');
    }

    /**
     * @param {SubmitEvent} event
     * @protected
     */
    onSubmit(event) {
        event.preventDefault();
        event.stopPropagation();
        this.dispatchCustomEvent('submit');
    }

    reset() {
        this.formElement?.reset();
    }
}

/** @extends {TextControlBase} */
class RichTextPopoverUrlBox extends TextControlBase {
    static get properties() {
        return {
            ...super.properties,
            allowedProtocols: { type: String, attribute: 'allowed-protocols' },
            allowRelative: { type: Boolean, attribute: 'allow-relative' },
            pattern: { type: String, attribute: false },
            allowPattern: { type: String, attribute: false },
        };
    }

    constructor() {
        super();

        this.allowedProtocols = 'http: https:';
        this.allowRelative = false;
        this.placeholder = 'https://...';
        this.pattern = createUrlPattern(this.allowedProtocols, this.allowRelative);
        this.maxlength = 500;
        this.autocomplete = 'off';
        this.spellcheck = false;
        this.allowPattern = String.raw`\S+`;
    }

    willUpdate(changedProperties) {
        if (changedProperties.has('allowedProtocols') || changedProperties.has('allowRelative')) {
            this.pattern = createUrlPattern(this.allowedProtocols, this.allowRelative);
        }

        super.willUpdate(changedProperties);
    }
}

class RichTextPopoverTextBox extends TextControlBase {
    constructor() {
        super();

        this.maxlength = 500;
        this.autocomplete = 'off';
        this.spellcheck = true;
    }
}

class RichTextPopoverCheckbox extends CheckBox {
    constructor() {
        super();

        this.checkedValue = true;
        this.uncheckedValue = false;
    }
}

/**
 * Creates a URL pattern based on allowed protocols and relative URL allowance.
 * @param {string} allowedProtocols
 * @param {boolean} allowRelative
 * @returns {string}
 */
function createUrlPattern(allowedProtocols, allowRelative) {
    const protocols = new Set(allowedProtocols.trim().toLowerCase().split(/\s+/).filter(Boolean));
    const alternatives = [];

    if (protocols.has('http:')) alternatives.push(String.raw`http:\/\/[^\s]+`);
    if (protocols.has('https:')) alternatives.push(String.raw`https:\/\/[^\s]+`);
    if (protocols.has('mailto:')) alternatives.push(String.raw`mailto:[^\s@]+@[^\s@]+\.[^\s@]+`);
    if (protocols.has('tel:')) alternatives.push(String.raw`tel:\+?(?:[0-9]|\(|\)|\.|-)+`);
    if (protocols.has('http:') || protocols.has('https:')) {
        alternatives.push(String.raw`(?:(?:[a-zA-Z0-9]|-)+\.)+[a-zA-Z]{2,}(?:(?:\/|\?|#)[^\s]*)?`);
    }
    if (allowRelative) {
        alternatives.push(String.raw`(?:\/(?!\/)|\.\.?\/|\?|#)[^\s]*`);
    }

    return alternatives.length > 0 ? `^(?:${alternatives.join('|')})$` : '(?!)';
}

export class RichTextImageForm extends RichTextPopoverFormBase {
    constructor() {
        super();

        /** @type {RichTextImage} */
        this.value = new RichTextImage();
    }

    updated(changedProperties) {
        super.updated(changedProperties);

        if (changedProperties.has('value')) {
            this.urlInput.value = this.value.url;
            this.textInput.value = this.value.alt;
        }
    }

    #onCancel() {
        this.value = new RichTextImage();
        this.dispatchCustomEvent('cancel');
    }

    render() {
        return html`
            <form @submit=${this.onSubmit}>
                <rtp-url-box label="Görsel Adresi" allowed-protocols="http: https:" allow-relative @input=${event => (this.value.url = event.target.value)} required></rtp-url-box>
                <rtp-text-box label="Alt Metin" placeholder="Görsel açıklaması" @input=${event => (this.value.alt = event.target.value)}></rtp-text-box>

                <div>
                    <button type="button" @click=${this.#onCancel}>İptal</button>
                    <button type="submit">Kaydet</button>
                </div>
            </form>
        `;
    }
}

export class RichTextLinkForm extends RichTextPopoverFormBase {
    constructor() {
        super();

        /** @type {RichTextEditorLink} */
        this.value = new RichTextEditorLink();
    }

    /**
     * @returns {RichTextPopoverCheckbox}
     * @protected
     */
    get checkInput() {
        return this.renderRoot.querySelector('rtp-checkbox');
    }

    updated(changedProperties) {
        super.updated(changedProperties);

        if (changedProperties.has('value')) {
            this.urlInput.value = this.value.url;
            this.textInput.value = this.value.text;
            this.checkInput.checked = this.value.blank;
        }
    }

    #onCancel(event) {
        this.value = new RichTextEditorLink();
        this.dispatchCustomEvent('cancel');
    }

    #removeLink() {
        this.value = new RichTextEditorLink(); // Reset the value
        this.dispatchCustomEvent('remove');
    }

    /** @returns {import('lit').TemplateResult | typeof nothing} */
    renderRemoveButton() {
        if (this.value.isActive) {
            return html`<button type="button" @click=${this.#removeLink}>Kaldır</button>`;
        }
        return nothing;
    }

    render() {
        return html`
            <form @submit=${this.onSubmit}>
                <rtp-url-box label="Bağlantı" allowed-protocols="http: https: mailto: tel:" allow-relative @input=${e => (this.value.url = e.target.value)} required></rtp-url-box>
                <rtp-text-box label="Metin" placeholder="Tıklanabilir metin" @input=${e => (this.value.text = e.target.value)} ?hidden=${this.value.isBlock}></rtp-text-box>
                <rtp-checkbox label="Yeni sekmede aç" @change=${e => (this.value.blank = e.target.checked)}>Yeni sekmede aç</rtp-checkbox>

                <div>
                    ${this.renderRemoveButton()}
                    <button type="button" @click=${this.#onCancel}>İptal</button>
                    <button type="submit">Kaydet</button>
                </div>
            </form>
        `;
    }
}

defineComponent('rtp-checkbox', RichTextPopoverCheckbox);
defineComponent('rtp-url-box', RichTextPopoverUrlBox);
defineComponent('rtp-text-box', RichTextPopoverTextBox);
