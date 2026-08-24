import { mergeAttributes, Node, Mark } from '@tiptap/core';

/** @typedef {import('@tiptap/core').NodeView} NodeView */

const SpanMark = Mark.create({
    name: 'span',
    parseHTML: () => [{ tag: 'span' }],
    renderHTML: ({ HTMLAttributes }) => ['span', mergeAttributes(HTMLAttributes), 0],
});

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
// 1. TABLE
// İçine caption, colgroup, thead, tbody, tfoot veya doğrudan tr alabilir.
const SimpleTable = Node.create({
    name: 'table',
    group: 'block',
    content: '(tableCaption | tableColgroup | tableHead | tableBody | tableFoot | tableRow)*',
    parseHTML: () => [{ tag: 'table' }],
    renderHTML: ({ HTMLAttributes }) => ['table', HTMLAttributes, 0],
    addAttributes: () => getAttributesObject('border', 'cellpadding', 'cellspacing', 'width', 'summary'),
});

// 2. CAPTION
const SimpleTableCaption = Node.create({
    name: 'tableCaption',
    content: 'inline*', // İsteğe bağlı 'block*' da yapabilirsin
    parseHTML: () => [{ tag: 'caption' }],
    renderHTML: ({ HTMLAttributes }) => ['caption', HTMLAttributes, 0],
    addAttributes: () => getAttributesObject('align'),
});

// 3. COLGROUP
const SimpleTableColgroup = Node.create({
    name: 'tableColgroup',
    content: 'tableCol*',
    parseHTML: () => [{ tag: 'colgroup' }],
    renderHTML: ({ HTMLAttributes }) => ['colgroup', HTMLAttributes, 0],
    addAttributes: () => getAttributesObject('span', 'width'),
});

// 4. COL (Kendi kapanan etiket olduğu için atom: true ve içerik deliği '0' yok)
const SimpleTableCol = Node.create({
    name: 'tableCol',
    atom: true,
    parseHTML: () => [{ tag: 'col' }],
    renderHTML: ({ HTMLAttributes }) => ['col', HTMLAttributes],
    addAttributes: () => getAttributesObject('span', 'width'),
});

// --- YARDIMCI FONKSİYON (thead, tbody, tfoot için ortak yapı) ---
const createTableSection = (name, tag) =>
    Node.create({
        name,
        content: 'tableRow+', // Mutlaka en az bir TR içermeli
        parseHTML: () => [{ tag }],
        renderHTML: ({ HTMLAttributes }) => [tag, HTMLAttributes, 0],
        addAttributes: () => getAttributesObject('align', 'valign'),
    });

// 5, 6, 7. THEAD, TBODY, TFOOT
const SimpleTableHead = createTableSection('tableHead', 'thead');
const SimpleTableBody = createTableSection('tableBody', 'tbody');
const SimpleTableFoot = createTableSection('tableFoot', 'tfoot');

// 8. TABLE ROW (TR)
const SimpleTableRow = Node.create({
    name: 'tableRow',
    content: '(tableCell | tableHeader)*',
    parseHTML: () => [{ tag: 'tr' }],
    renderHTML: ({ HTMLAttributes }) => ['tr', HTMLAttributes, 0],
    addAttributes: () => getAttributesObject('align', 'valign'),
});

// 9. TABLE CELL (TD)
const SimpleTableCell = Node.create({
    name: 'tableCell',
    content: 'inline*',
    parseHTML: () => [{ tag: 'td' }],
    renderHTML: ({ HTMLAttributes }) => ['td', HTMLAttributes, 0],
    addAttributes: () => getAttributesObject('colspan', 'rowspan', 'headers', 'scope', 'align', 'valign', 'width', 'height'),
});

// 10. TABLE HEADER (TH)
const SimpleTableHeader = Node.create({
    name: 'tableHeader',
    content: 'inline*',
    parseHTML: () => [{ tag: 'th' }],
    renderHTML: ({ HTMLAttributes }) => ['th', HTMLAttributes, 0],
    addAttributes: () => getAttributesObject('colspan', 'rowspan', 'headers', 'scope', 'align', 'valign', 'width', 'height'),
});

function getAttributesObject(...attributes) {
    const obj = {};

    for (const attr of attributes) {
        if (!obj[attr]) {
            obj[attr] = { default: null };
        }
    }

    return obj;
}

const elementExtensions = [
    BlockLinkNode,
    DivHTMLNode,
    InputHTMLNode,
    ButtonNode,
    SimpleTable,
    SimpleTableCaption,
    SimpleTableColgroup,
    SimpleTableCol,
    SimpleTableHead,
    SimpleTableBody,
    SimpleTableFoot,
    SimpleTableRow,
    SimpleTableCell,
    SimpleTableHeader,
    SpanMark,
];

export default elementExtensions;
