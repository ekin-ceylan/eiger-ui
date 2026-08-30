import { Extension } from '@tiptap/core';
import createElementExtensions from './element-extensions.js';

/** @typedef {import('@tiptap/core').Attribute} Attribute */

/**
 * Creates and returns a Tiptap extension that adds global attributes to all supported elements in the rich text editor. The extension allows for the inclusion of data attributes, ARIA attributes, and other common HTML attributes on various elements.
 * @returns {import('@tiptap/core').Extension}
 */
export default function createAttributeExtension() {
    const elementExtensions = createElementExtensions();
    const extendedElementNames = elementExtensions.map(ext => ext.name);

    // prettier-ignore
    const tags = ['paragraph', 'heading', 'blockquote', 'codeBlock', 'bulletList', 'orderedList', 'listItem',
    'horizontalRule', 'bold', 'italic', 'strike', 'code', 'link', 'image', ...extendedElementNames];
    const allAllowedAttrs = ['class', 'style', 'id', 'title', 'dir', 'lang', 'hidden', 'tabindex', 'role'];

    return Extension.create({
        name: 'globalAttributes',
        addGlobalAttributes() {
            return [
                { types: tags, attributes: getDataAttributesObject('data', 'aria') }, // data attrs
                { types: tags, attributes: getAttributesObject(...allAllowedAttrs) }, // all allowed attrs
                { types: ['link'], attributes: getAttributesObject('href', 'target', 'rel') }, // link attrs
                { types: ['image'], attributes: getAttributesObject('src', 'alt', 'width', 'height') }, // img attrs
            ];
        },
    });
}

function getDataAttributesObject(...prefixes) {
    /** @type {Record<string, Attribute | undefined>} */
    const obj = {};

    for (const prefix of prefixes) {
        const name = `${prefix}Attrs`;

        if (!obj[name]) {
            obj[name] = {
                default: null,
                parseHTML: element => dataHTMLParser(element, `${prefix}-`),
                renderHTML: attributes => {
                    if (attributes[name] == null) return {};
                    return attributes[name];
                },
            };
        }
    }

    return obj;
}

function dataHTMLParser(element, attrPrefix) {
    const dataAttrs = {};

    for (const attr of element.attributes) {
        if (attr.name.startsWith(attrPrefix)) {
            dataAttrs[attr.name] = attr.value;
        }
    }

    return Object.keys(dataAttrs).length > 0 ? dataAttrs : null;
}

/**
 * Returns an object containing all the attributes that can be applied to the supported tags in the rich text editor. The keys of the object are the attribute names, and the values are objects that define how to parse and render those attributes.
 * @param {string[]} attributes - An array of attribute names to include in the returned object. If an attribute is not included in this array, it will not be part of the returned object.
 * @returns {Record<string, Attribute | undefined>}
 */
function getAttributesObject(...attributes) {
    /** @type {Record<string, Attribute | undefined>} */
    const obj = {};

    for (const attr of attributes) {
        if (!obj[attr]) {
            obj[attr] = createAttributeObject(attr);
        }
    }

    return obj;
}

function createAttributeObject(attrName) {
    return {
        default: null,
        parseHTML: element => element.getAttribute(attrName),
        renderHTML: attributes => {
            if (attributes[attrName] == null) return {};
            return { [attrName]: attributes[attrName] };
        },
    };
}
