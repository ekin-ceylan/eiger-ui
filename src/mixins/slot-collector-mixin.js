/**
 * @typedef {import('../base/light-component-base.js').default} LightComponentBase
 */

/**
 * @template T
 * @typedef {import('./types').Constructor<T>} Constructor
 */

/**
 * @typedef {import('./types').SlotCollector} SlotCollector
 */

/**
 * Slot collector mixin that provides functionality to collect and manage slotted content in a web component. It collects child nodes, validates them, and binds them to their respective slots in the component's template.
 * - Collects child nodes when the component is connected to the DOM and binds them to slots defined in the template like `<slot name="...">`.
 * - Provides a `validateNode` method that can be overridden to filter out nodes that should not be included in the slots.
 * - After binding slots, it calls `afterSlotsBinded()` which can be used for any post-processing.
 * - **Constraint:** Can only be applied to classes extending `LightComponentBase` (ensures LitElement APIs like `updateComplete` / `requestUpdate` exist).
 *
 * @template {Constructor<LightComponentBase>} TBase
 * @param {TBase} Base - The base class to extend
 * @category mixins
 * @returns {Constructor<SlotCollector> & TBase}
 */
export default function SlotCollectorMixin(Base) {
    return class SlotCollector extends Base {
        #slotNodes = [];
        #isCollected = false;

        /** @type {Set<Element>} */
        #hiddenByCollector = new Set();

        constructor(...args) {
            super(...args);
            this.#collectSlots(); // başlangıçta DOM'a bağlıysa çalışır
        }

        connectedCallback() {
            super.connectedCallback?.();

            if (!this.#isCollected) {
                this.#isCollected = true;
                this.#runCollectBindProcess();
            }
        }

        /**
         * Binds the collected nodes to their respective slot elements.
         * Removes placeholder slots and replaces them with the collected nodes. If a slot has no collected nodes, it will render its fallback content.
         * @param {(HTMLElement|Text)[]} collectedNodes - Collected nodes to bind to slots.
         */
        bindSlots(collectedNodes = []) {
            /** @type {Map<string, (Element|Text)[]>} */
            const bySlot = new Map();

            // validate nodes and group by slot name
            for (const node of collectedNodes) {
                const isElement = node instanceof Element;
                const nodeSlotName = (isElement && node.getAttribute(SLOT_ATTR)) || 'default';
                isElement && node.removeAttribute(SLOT_ATTR);

                // bu ikli if yer değiştirmeli mi?
                if (node instanceof HTMLTemplateElement) {
                    const nodes = this.#validateAndGetTemplateContent(node, nodeSlotName);
                    this.#pushToMapArray(bySlot, nodeSlotName, ...nodes);
                    continue;
                }

                if (!this.validateNode(node, nodeSlotName)) {
                    continue;
                }

                this.#pushToMapArray(bySlot, nodeSlotName, node);
            }

            const slotElements = Array.from(this.querySelectorAll(SLOT_TAG_NAME));

            // Replace placeholder slots with collected nodes
            for (const slotEl of slotElements) {
                const slotName = slotEl.getAttribute('name') || 'default';
                const nodes = bySlot.get(slotName);

                if (nodes?.length) {
                    const fragment = document.createDocumentFragment();
                    fragment.append(...nodes);
                    slotEl.replaceWith(fragment);
                    bySlot.delete(slotName); // Aynı isimli ikinci bir <slot> varsa (nadir) sil
                } else {
                    slotEl.replaceWith(...slotEl.childNodes); // Fallback içerik
                }
            }
        }

        /**
         * Validates nodes for slot binding.
         * @param {HTMLElement|Text} node
         * @param {String} slotName
         * @returns {Boolean}
         */
        validateNode(node, slotName) {
            return true;
        }

        /** Called after slots have been bound. */
        afterSlotsBinded(hasProjectedContent) {
            // Hook for child classes.
        }

        /**
         * @param {Map<string, (Element|Text)[]>} map
         * @param {string} key
         * @param {...(Element|Text)} value
         */
        #pushToMapArray(map, key, ...value) {
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(...value);
        }

        /**
         * Validates the content of a template element and returns an array of valid nodes for slot binding.
         * @param {HTMLTemplateElement} template - The template element to validate.
         * @param {string} slotName - The name of the slot for which the template content is being validated.
         * @returns {(HTMLElement|Text)[]}
         */
        #validateAndGetTemplateContent(template, slotName) {
            const childNodes = template.content?.childNodes;
            /** @type {(HTMLElement|Text)[]} */
            const nodes = [];

            for (const node of childNodes) {
                if (this.#validateTemplateNode(node, slotName)) {
                    nodes.push(/** @type {HTMLElement|Text} */ (node));
                }
            }

            return nodes;
        }

        /**
         * Validates a single node from a template's content for slot binding.
         * @param {ChildNode} node - The node to validate.
         * @param {string} slotName - The name of the slot for which the node is being validated.
         * @returns {boolean}
         */
        #validateTemplateNode(node, slotName) {
            if (node.nodeType != Node.TEXT_NODE && node.nodeType != Node.ELEMENT_NODE) {
                return false;
            }

            return this.validateNode(/** @type {HTMLElement|Text} */ (node), slotName);
        }

        async #runCollectBindProcess() {
            this.#collectSlots(); // sonradan DOM'a bağlandıysa çalışır
            await this.updateComplete;
            this.#detachHiddenNodes();
            this.bindSlots(this.#slotNodes); // Tüm slot placeholder'larını bul
            this.afterSlotsBinded(this.#slotNodes?.length > 0);
        }

        #collectSlots() {
            if (this.#slotNodes.length > 0) return;

            const slots = Array.from(this.childNodes).filter(node => {
                const isTextNode = node.nodeType === Node.TEXT_NODE;

                if (isTextNode)
                    node.remove(); // detach nodes
                else if (node instanceof Element && !node.hasAttribute('hidden')) {
                    node.setAttribute('hidden', '');
                    this.#hiddenByCollector.add(node);
                }

                return node.nodeType === Node.ELEMENT_NODE || (isTextNode && node.textContent.trim());
            });

            this.#slotNodes = slots;
        }

        #detachHiddenNodes() {
            this.#slotNodes.forEach(node => {
                if (node instanceof Element) {
                    node.remove(); // detach nodes
                    // this.#tempFragment.append(node); // detach nodes
                }
            });
            this.#hiddenByCollector.forEach(node => node?.removeAttribute('hidden'));
            this.#hiddenByCollector = new Set();
        }
    };
}

const SLOT_TAG_NAME = 'slot';
const SLOT_ATTR = 'slot';

// template testleri
// new testleri
// DOM üzerinde başlama testleri
// validateNode override testleri
// lit component ile entegrasyon testleri
// dinamik slot testleri
