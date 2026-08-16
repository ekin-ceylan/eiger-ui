import Pagination from '../../components/table/pagination.js';

defineElement('typed-pagination', Pagination);

async function initPagination(props = {}) {
    const host = document.createElement('typed-pagination');
    Object.assign(host, props);
    document.body.appendChild(host);
    await host.updateComplete;

    return host;
}

describe('Pagination', () => {
    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('does not render pagination markup when only one page exists', async () => {
        const host = await initPagination({ currentPage: 1, pageCount: 1 });

        expect(host.querySelector('nav')).toBeNull();
    });

    it('renders visible pages and ellipsis around the current page', async () => {
        const host = await initPagination({ currentPage: 10, pageCount: 20 });
        const pageLinks = Array.from(host.querySelectorAll('li button'));
        const numericLabels = pageLinks.map(link => link.textContent.trim()).filter(label => /^\d+$/.test(label));
        const ellipsisNodes = host.querySelectorAll('li > span[aria-hidden="true"]');
        // component now renders numeric page items only for the visible page range
        expect(numericLabels).toEqual(['8', '9', '10', '11', '12']);
        expect(ellipsisNodes.length).toBe(2);
    });

    it('respects siblingCount when calculating visible pages', async () => {
        const host = await initPagination({ currentPage: 10, pageCount: 20, siblingCount: 1 });
        const pageLinks = Array.from(host.querySelectorAll('li button'));
        const numericLabels = pageLinks.map(link => link.textContent.trim()).filter(label => /^\d+$/.test(label));

        expect(numericLabels).toEqual(['9', '10', '11']);
    });

    it('dispatches page-change-request when the first page button is clicked', async () => {
        const host = await initPagination({ currentPage: 2, pageCount: 5 });

        const eventPromise = new Promise(resolve => {
            host.addEventListener('page-change-request', resolve, { once: true });
        });

        // find the numeric button that points to page 1 and click it
        const firstLink = Array.from(host.querySelectorAll('li button')).find(b => b.textContent.trim() === '1');
        firstLink.click();

        const event = await eventPromise;

        expect(event.detail.page).toBe(1);
        expect(event.detail.originalEvent).toBeInstanceOf(Event);
    });

    it('does not dispatch page-click for the active page', async () => {
        const host = await initPagination({ currentPage: 3, pageCount: 5 });
        const onPageClick = vi.fn();

        host.addEventListener('page-change-request', onPageClick);

        const activeLink = host.querySelector('button[aria-current="page"]');
        activeLink.click();

        expect(onPageClick).not.toHaveBeenCalled();
        expect(activeLink.getAttribute('aria-current')).toBe('page');
    });
});
