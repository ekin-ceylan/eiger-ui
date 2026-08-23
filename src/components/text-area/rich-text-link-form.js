import LightComponentBase from '../../base/light-component-base.js';
import TextControlBase from '../../base/text-control-base.js';
import { defineComponent } from '../../modules/utilities.js';
import { html, nothing } from 'lit';
import CheckBox from '../select/check-box.js';
import RichTextEditorLink from '../../models/RichTextEditorLink.js';

export default class RichTextLinkForm extends LightComponentBase {
    static get properties() {
        return {
            ...super.properties,
            value: { type: Object, state: true },
        };
    }

    constructor() {
        super();

        /** @type {RichTextEditorLink} */
        this.value = new RichTextEditorLink();
    }

    /** @param {SubmitEvent} event */
    #onSubmit(event) {
        event.preventDefault();
        event.stopPropagation();
        this.dispatchCustomEvent('submit');
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
            <form @submit=${this.#onSubmit}>
                <rtp-text-box label="Görüntülenecek Metin" .value=${this.value.text} @input=${e => (this.value.text = e.target.value)} ?hidden=${this.value.isBlock}></rtp-text-box>
                <rtp-url-box label="Bağlantı Adresi (URL)" .value=${this.value.url} @input=${e => (this.value.url = e.target.value)} required></rtp-url-box>
                <rtp-checkbox label="Yeni sekmede aç" .value=${this.value.blank} @change=${e => (this.value.blank = e.target.checked)}>Yeni sekmede aç</rtp-checkbox>

                <div>
                    ${this.renderRemoveButton()}
                    <button type="button" @click=${this.#onCancel}>İptal</button>
                    <button type="submit">Kaydet</button>
                </div>
            </form>
        `;
    }
}

class RichTextPopoverUrlBox extends TextControlBase {
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

class RichTextPopoverTextBox extends TextControlBase {
    constructor() {
        super();

        this.placeholder = 'Tıklanabilir metin...';
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

defineComponent('rtp-url-box', RichTextPopoverUrlBox);
defineComponent('rtp-text-box', RichTextPopoverTextBox);
defineComponent('rtp-checkbox', RichTextPopoverCheckbox);
