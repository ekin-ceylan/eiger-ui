type FixtureInputElement = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
type FormControlBase = import('../base/form-control-base.js').default;

export interface TestFixture<TInput extends FixtureInputElement = HTMLInputElement, THost extends FormControlBase = FormControlBase> {
    input: TInput;
    host: THost;
    user: import('@testing-library/user-event').UserEvent;
    submit: HTMLButtonElement;
    reset: HTMLButtonElement;
    form: HTMLFormElement;
    readonly error: HTMLElement | null;
    readonly label: HTMLLabelElement | null;
    querySelector<E extends Element = Element>(selectors: string): E | null;
}
