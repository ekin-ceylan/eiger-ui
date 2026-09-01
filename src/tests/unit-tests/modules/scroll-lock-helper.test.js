import { lockAllScrolls, unlockAllScrolls } from '../../../modules/scroll-lock-helper.js';

describe('scroll-lock-helper', () => {
    it('reports external scroll and resize but ignores scrolling inside the allowed element', () => {
        const allowedElement = document.createElement('div');
        const details = [];
        document.body.append(allowedElement);
        lockAllScrolls(allowedElement, detail => details.push(detail));

        allowedElement.dispatchEvent(new Event('scroll', { bubbles: false }));
        globalThis.dispatchEvent(new Event('scroll'));
        globalThis.dispatchEvent(new Event('resize'));

        expect(details.map(detail => detail.reason)).toEqual(['scroll', 'resize']);
        expect(details.every(detail => detail.element === allowedElement)).toBe(true);

        unlockAllScrolls(allowedElement);
        allowedElement.remove();
    });

    it('stops reporting after the element is unlocked', () => {
        const allowedElement = document.createElement('div');
        let notificationCount = 0;
        lockAllScrolls(allowedElement, () => notificationCount++);
        unlockAllScrolls(allowedElement);

        globalThis.dispatchEvent(new Event('scroll'));
        globalThis.dispatchEvent(new Event('resize'));

        expect(notificationCount).toBe(0);
    });
});
