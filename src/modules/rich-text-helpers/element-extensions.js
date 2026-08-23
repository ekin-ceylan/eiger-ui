import { mergeAttributes, Node } from '@tiptap/core';
import { TableCell, TableHeader, TableRow, Table } from '@tiptap/extension-table';

/** @typedef {import('@tiptap/core').NodeView} NodeView */

const BlockLinkNode = Node.create({
    name: 'blockLink',
    group: 'block', // Bu bir blok elemandır
    content: 'block+', // İçine en az bir tane blok (p, div, h1 vs) almak zorundadır
    addAttributes: () => ({
        ...getAttributesObject('href', 'target'),
        rel: { default: 'noopener noreferrer nofollow' },
    }),
    parseHTML() {
        return [
            {
                tag: 'a',
                priority: 1100,
                getAttrs: element => {
                    // a etiketinin içindeki alt elemanlara bak
                    const hasBlockChild = Array.from(element.children).some(child => {
                        const tagName = child.tagName.toUpperCase();
                        // İçinde aşağıdaki blok etiketlerinden biri var mı?
                        return ['DIV', 'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'UL', 'OL', 'TABLE', 'PRE', 'IMG'].includes(tagName);
                    });

                    return hasBlockChild ? null : false;
                },
            },
        ];
    },
    renderHTML: ({ HTMLAttributes }) => ['a', HTMLAttributes, 0], // Çıktıyı <a> olarak ver, HTML özelliklerini bas ve içindeki içerikleri '0' deliğine yerleştir
});

const DivHTMLNode = Node.create({
    name: 'divElement',
    group: 'block',
    content: 'block*', // div etiketi, içine diğer blok elemanlarını (p, h1, diğer div'ler vb.) alabilir
    parseHTML: () => [{ tag: 'div' }],
    renderHTML: ({ HTMLAttributes }) => ['div', HTMLAttributes, 0],
});

const InputHTMLNode = Node.create({
    name: 'inputElement',
    group: 'inline', // Metin (paragraf) içinde yan yana durabilmesi için
    inline: true,
    atom: true, // İçinde başka Tiptap içeriği (bold, italic vs) barındıramaz, tek parçadır.
    addAttributes: () => getAttributesObject('type', 'value', 'placeholder', 'name', 'disabled', 'checked'),
    parseHTML: () => [{ tag: 'input' }],
    renderHTML: ({ HTMLAttributes }) => ['input', HTMLAttributes], // Çıktıya aynen <input ...> olarak bas
});

const ButtonNode = Node.create({
    name: 'button',
    group: 'inline', // Metinlerle aynı satırda durabilmesi için inline yapıyoruz
    inline: true,
    content: 'inline*', // İçine metin veya başka inline elementler (kalın, italik) alabilir
    parseHTML: () => [{ tag: 'button' }], // Kaynak kodda <button> gördüğünde bunu yakala
    renderHTML: ({ HTMLAttributes }) => ['button', mergeAttributes(HTMLAttributes), 0], // Çıktıya <button ...> olarak bas ve içeriği '0' deliğine yerleştir
    addAttributes: () => getAttributesObject('type', 'disabled', 'name', 'value'),
});

const CleanTable = Table.extend({
    addNodeView() {
        const parentNodeView = this.parent?.();

        return props => {
            if (!parentNodeView) return undefined;

            const view = parentNodeView(props); // 1. Tiptap'ın orjinal çizim nesnesini (sürükleme motorunu) çalıştır

            // 2. view.table -> Görsel editördeki GERÇEK <table> elementidir.
            // Oraya kendi özelliklerimizi zorla (force) yazıyoruz!
            if (view?.['table']) {
                applyAttrs(view, props.node.attrs); // İlk render anında ekrana bas
                const originalUpdate = view.update; // Tabloda bir değişiklik olduğunda (sürükleme vs.) özellikleri kaybetmemek için update metodunu hackliyoruz
                view.update = newNode => {
                    const result = originalUpdate ? originalUpdate.call(view, newNode) : true;
                    if (result) {
                        applyAttrs(view, newNode.attrs);
                    }
                    return result;
                };
            }

            return view;
        };
    },
    renderHTML({ node, HTMLAttributes }) {
        const { style, class: className, border, cellpadding, cellspacing, ...rest } = HTMLAttributes;
        const attrs = { ...rest };

        // Kaynak koddan gelenleri aynen aktar
        if (style) attrs.style = style;
        if (className) attrs.class = className;
        if (border !== null) attrs.border = border;
        if (cellpadding !== null) attrs.cellpadding = cellpadding;
        if (cellspacing !== null) attrs.cellspacing = cellspacing;

        // Resizable için colgroup şart. Ama 'min-width: 25px' dayatmasını siliyoruz.
        let hasWidths = false;
        const colgroup = ['colgroup', {}];

        node.forEach(row => {
            if (!hasWidths) {
                row.forEach(cell => {
                    const { colwidth } = cell.attrs;
                    // Eğer kullanıcı gerçekten sürükleyip boyut verdiyse:
                    if (colwidth && colwidth.length > 0 && colwidth[0] !== null) {
                        hasWidths = true;
                        colwidth.forEach(width => {
                            colgroup.push(['col', { style: `width: ${width}px` }]);
                        });
                    } else {
                        colgroup.push(['col', {}]); // Sürükleme yoksa bomboş col bırakıyoruz
                    }
                });
            }
        });

        if (this.options.resizable) {
            return ['table', attrs, colgroup, ['tbody', 0]];
        }

        return ['table', attrs, ['tbody', 0]];
    },
    addAttributes: () => getAttributesObject('border', 'cellpadding', 'cellspacing'),
});

const CleanTableRow = TableRow.extend({
    renderHTML({ HTMLAttributes }) {
        const { style, class: className, ...rest } = HTMLAttributes;
        const attrs = { ...rest };

        if (style) attrs.style = style;
        if (className) attrs.class = className;

        return ['tr', attrs, 0];
    },
});

const CleanTableCell = TableCell.extend({
    content: 'inline*',
    renderHTML: ({ HTMLAttributes }) => cellRenderHTML(HTMLAttributes, 'td'),
});

const CleanTableHeader = TableHeader.extend({
    content: 'inline*',
    renderHTML: ({ HTMLAttributes }) => cellRenderHTML(HTMLAttributes, 'th'),
});

/**
 *
 * @param {Record<string, any>} HTMLAttributes
 * @param {string} tag
 * @returns {[string, ...any[]]}
 */
function cellRenderHTML(HTMLAttributes, tag) {
    const { style, class: className, colwidth, colspan, rowspan, ...rest } = HTMLAttributes;

    let finalStyle = style || ''; // 1. Kaynaktan gelen orjinal stili koru!

    // 2. Kullanıcı sütunu sürüklediyse (colwidth), stili dinamik olarak ekle
    if (colwidth && colwidth.length > 0 && colwidth[0] !== null) {
        finalStyle += (finalStyle ? '; ' : '') + `width: ${colwidth[0]}px`;
    }

    const attrs = { ...rest };
    if (finalStyle.trim()) attrs.style = finalStyle.trim();
    if (className) attrs.class = className;

    // 3. Tiptap'ın otomatik eklediği gereksiz '1' değerlerini sil
    if (colspan === 1 || colspan === '1') delete attrs.colspan;
    if (rowspan === 1 || rowspan === '1') delete attrs.rowspan;

    return [tag, attrs, 0];
}

function applyAttrs(view, attrs) {
    applyAttr(view, attrs, 'style');
    applyAttr(view, attrs, 'class');
    applyAttr(view, attrs, 'border');
    applyAttr(view, attrs, 'cellpadding');
    applyAttr(view, attrs, 'cellspacing');
}

/**
 * @param {NodeView} view
 * @param {any} attrs
 * @param {string} tag
 */
function applyAttr(view, attrs, tag) {
    if (attrs[tag]) view['table'].setAttribute(tag, attrs[tag]);
    else view['table'].removeAttribute(tag);
}

function getAttributesObject(...attributes) {
    const obj = {};

    for (const attr of attributes) {
        if (!obj[attr]) {
            obj[attr] = { default: null };
        }
    }

    return obj;
}

const elementExtensions = [BlockLinkNode, DivHTMLNode, InputHTMLNode, CleanTable.configure({ resizable: true }), CleanTableRow, CleanTableCell, CleanTableHeader, ButtonNode];

export default elementExtensions;
export { BlockLinkNode, DivHTMLNode, InputHTMLNode, CleanTable, CleanTableRow, CleanTableCell, CleanTableHeader };
