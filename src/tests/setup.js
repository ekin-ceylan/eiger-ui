/// <reference types="vitest/globals" />
/// <reference types="vitest" />

// import { describe, it, expect, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import InputBase from '../base/input-base';

/**
 * Initializes a InputBase component for testing.
 * @param {string} elementStr
 * @param {string} [lang='tr']
 * @returns {Promise<import('./types').TestFixture>} A promise that resolves to an array containing the input element, host component, user event instance, form element, submit button, and reset button.
 */
async function initTestFixture(elementStr, lang = 'tr') {
    document.body.setAttribute('lang', lang);
    document.body.innerHTML = elementStr;

    const host = document.body.firstElementChild;
    const form = document.createElement('form');
    const btnSubmit = document.createElement('button');
    const btnReset = document.createElement('button');

    btnSubmit.setAttribute('type', 'submit');
    btnReset.setAttribute('type', 'reset');

    form.appendChild(btnSubmit);
    form.appendChild(btnReset);
    form.insertBefore(host, form.firstElementChild);

    document.body.appendChild(form);

    if (!host) {
        throw new Error('initTestFixture: no host element found in document.body');
    }
    await host.updateComplete;

    const input = host.inputElement;
    input.focus();

    const user = userEvent.setup();

    return {
        input: input,
        host: host,
        user: user,
        submit: btnSubmit,
        reset: btnReset,
        form: form,

        get error() {
            return this.host.querySelector('[data-role="error-message"]');
        },

        get label() {
            return this.host.querySelector('label');
        },

        querySelector(selector) {
            return this.host.querySelector(selector);
        },
    };
}

/**
 * Defines a custom element if not already defined.
 * @param {string} elementName
 * @param {CustomElementConstructor} ElementClass
 */
function defineElement(elementName, ElementClass) {
    if (!customElements.get(elementName)) {
        customElements.define(elementName, ElementClass);
    }
}

globalThis.initTestFixture = initTestFixture;
globalThis.defineElement = defineElement;
