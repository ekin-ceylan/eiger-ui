import WarningField from '../models/WarningField';

/** A generic type that represents any class constructor. */
export type Constructor<T> = new (...args: any[]) => T;

export interface UniqueIdGenerator {
    /** Gets the unique ID of the component. */
    get uniqueId(): string;

    /** Generates a unique ID string by incrementing an internal counter and
     * converting it to a hexadecimal string. The resulting ID is padded
     * with leading zeros to ensure it is at least 4 characters long.
     * @protected
     */
    generateUniqueId(): string;
}

export interface SlotCollector {
    /**
     * Binds the collected nodes to their respective slot elements.
     * @param {(HTMLElement|Text)[]} collectedNodes - Collected nodes to bind to slots.
     * @protected
     */
    bindSlots(collectedNodes: (HTMLElement | Text)[]): void;

    /**
     * A hook that is called after slots have been bound.
     * Components can perform post-processing here (e.g., derive state from slot content).
     *
     * **Important:** If you modify reactive properties, you must call `requestUpdate()`
     * if Lit's reactivity doesn't automatically trigger it (e.g., direct assignments).
     * @param {boolean} hasProjectedContent Indicates if there is projected content in the slots.
     * @protected
     */
    afterSlotsBinded(hasProjectedContent: boolean): void;

    /**
     * A hook that validates nodes for slot binding.
     * Returns true if the node is valid and should be included in the slot, false otherwise.
     * @param {HTMLElement|Text} node The node to validate.
     * @param {string} slotName The name of the slot the node is intended for.
     * @protected
     */
    validateNode(node: HTMLElement | Text, slotName: string): boolean;
}

export interface PropValidator {
    /**
     * Gets the list of required field names.
     * Subclasses should override this to specify fields that must be set.
     * Throws an error if any required field is empty when validation runs.
     */
    get requiredFields(): string[];

    /**
     * Gets the list of warning field configurations.
     * Subclasses should override this to specify fields that trigger warnings.
     * A warning is logged if all fields in a configuration are empty or false.
     */
    get warningFields(): WarningField[];
}

export interface InputMask {
    /**
     * The input mask text displayed when the input is being edited.
     * If not set, it defaults to the value of the `placeholder` property.
     * @protected
     */
    inputMask: string;
}
