export default class RichTextEditorLink {
    get node() {
        return {
            type: 'text',
            text: this.text || this.url,
            marks: [
                {
                    type: 'link',
                    attrs: {
                        href: this.url,
                        target: this.blank ? '_blank' : null,
                        rel: 'noopener noreferrer nofollow',
                    },
                },
            ],
        };
    }

    constructor(data = {}) {
        /** @type {string} */
        this.text = data.text || '';
        /** @type {string} */
        this.url = data.url || '';
        /** @type {boolean} */
        this.blank = data.blank || false;
        /** @type {boolean} */
        this.isActive = data.isActive ?? Boolean(data.url);
        /** @type {boolean} */
        this.isBlock = data.isBlock || false;
    }
}
