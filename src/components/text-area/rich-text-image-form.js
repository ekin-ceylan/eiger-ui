import LightComponentBase from '../../base/light-component-base.js';
import TextControlBase from '../../base/text-control-base.js';
import { defineComponent } from '../../modules/utilities.js';
import { html } from 'lit';
import RichTextImage from '../../models/RichTextImage.js';

export default class RichTextImageForm extends LightComponentBase {
    static get properties() {
        return {
            ...super.properties,
            value: { type: Object, state: true },
        };
    }

    /** @type {RichTextImageUrlBox} */
    #urlInput;
    /** @type {RichTextImageAltBox} */
    #altInput;

    constructor() {
        super();

        /** @type {RichTextImage} */
        this.value = new RichTextImage();
    }

    updated(changedProperties) {
        super.updated(changedProperties);

        if (changedProperties.has('value')) {
            this.#urlInput.value = this.value.url;
            this.#altInput.value = this.value.alt;
        }
    }

    firstUpdated(changedProperties) {
        super.firstUpdated(changedProperties);

        this.#urlInput = this.renderRoot.querySelector('rtp-image-url-box');
        this.#altInput = this.renderRoot.querySelector('rtp-image-alt-box');
    }

    /** @param {SubmitEvent} event */
    #onSubmit(event) {
        event.preventDefault();
        event.stopPropagation();
        this.dispatchCustomEvent('submit');
    }

    #onCancel() {
        this.value = new RichTextImage();
        this.dispatchCustomEvent('cancel');
    }

    render() {
        return html`
            <form @submit=${this.#onSubmit}>
                <rtp-image-url-box label="Görsel Adresi (URL)" @input=${event => (this.value.url = event.target.value)} required></rtp-image-url-box>
                <rtp-image-alt-box label="Alt Metin" @input=${event => (this.value.alt = event.target.value)}></rtp-image-alt-box>

                <div>
                    <button type="button" @click=${this.#onCancel}>İptal</button>
                    <button type="submit">Kaydet</button>
                </div>
            </form>
        `;
    }
}

class RichTextImageUrlBox extends TextControlBase {
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

class RichTextImageAltBox extends TextControlBase {
    constructor() {
        super();

        this.placeholder = 'Görsel açıklaması...';
        this.maxlength = 500;
        this.autocomplete = 'off';
        this.spellcheck = true;
    }
}

defineComponent('rtp-image-url-box', RichTextImageUrlBox);
defineComponent('rtp-image-alt-box', RichTextImageAltBox);
