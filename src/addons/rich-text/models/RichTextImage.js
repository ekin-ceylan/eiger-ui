export default class RichTextImage {
    get node() {
        return {
            src: this.url,
            alt: this.alt,
        };
    }

    constructor(data = {}) {
        /** @type {string} */
        this.url = data.url || '';
        /** @type {string} */
        this.alt = data.alt || '';
    }
}
