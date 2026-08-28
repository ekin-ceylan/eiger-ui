import { html, nothing } from 'lit';
import RichTextImage from './models/RichTextImage.js';
import RichTextEditorLink from './models/RichTextEditorLink.js';

import { LightComponentBase, TextControlBase, defineComponent, CheckBox } from 'eiger-ui';

// import LightComponentBase from '../../base/light-component-base.js';
// import TextControlBase from '../../base/text-control-base.js';
// import CheckBox from '../../components/select/check-box.js';
// import { defineComponent } from '../../modules/utilities.js';

/** @extends {LightComponentBase} */
export class RichTextPopoverFormBase extends LightComponentBase {
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
export class RichTextPopoverUrlBox extends TextControlBase {
    constructor() {
        super();

        this.placeholder = 'https://...';
        this.pattern = String.raw`(https?://)?([a-zA-Z0-9.\-]+)\.([a-zA-Z]{2,})(/.*)?`;
        this.maxlength = 500;
        this.autocomplete = 'off';
        this.spellcheck = false;
        this.allowPattern = String.raw`\S+`;
    }
}

export class RichTextPopoverTextBox extends TextControlBase {
    constructor() {
        super();

        this.maxlength = 500;
        this.autocomplete = 'off';
        this.spellcheck = true;
    }
}

export class RichTextPopoverCheckbox extends CheckBox {
    constructor() {
        super();

        this.checkedValue = true;
        this.uncheckedValue = false;
    }
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
                <rtp-url-box label="Görsel Adresi (URL)" @input=${event => (this.value.url = event.target.value)} required></rtp-url-box>
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
                <rtp-text-box label="Metin" placeholder="Tıklanabilir metin" @input=${e => (this.value.text = e.target.value)} ?hidden=${this.value.isBlock}></rtp-text-box>
                <rtp-url-box label="Bağlantı" @input=${e => (this.value.url = e.target.value)} required></rtp-url-box>
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
