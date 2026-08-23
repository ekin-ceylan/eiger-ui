import Image from '@tiptap/extension-image';
import StarterKit from '@tiptap/starter-kit';
import elementExtensions from './element-extensions.js';
import createAttributeExtension from './attribute-extensions.js';

const attrExtension = createAttributeExtension();
const starterKitExtension = StarterKit.configure({ link: { openOnClick: false } });
const extensions = [starterKitExtension, Image, attrExtension, ...elementExtensions];

/**
 * Formats the content of the rich text editor by adding line breaks before and after block-level HTML tags, and removing extra blank lines. This is useful for displaying the content in a more readable format when viewing the raw HTML.
 * @param {string} editorContent The raw HTML content from the rich text editor.
 * @example
 * const rawContent = '<p>Hello</p><div>World</div>';
 * const formattedContent = formatEditorContent(rawContent);
 * console.log(formattedContent);
 * // Output:
 * // <p>Hello</p>
 * // <div>World</div>
 * @returns {string}
 */
function formatEditorContent(editorContent) {
    if (!editorContent) return '';

    const blockTags = 'div|p|h[1-6]|ul|ol|li|blockquote|pre|table|thead|tbody|tr|td|th';

    let formatted = editorContent;
    formatted = formatted.replace(new RegExp(`(<(${blockTags})[^>]*>)`, 'gi'), '\n$1'); // Açılış etiketlerinden önce satır atla
    formatted = formatted.replace(new RegExp(`(</(${blockTags})>)`, 'gi'), '$1\n'); // Kapanış etiketlerinden sonra satır atla
    formatted = formatted.replace(/\n\s*\n/g, '\n'); // çoklu satır boşluklarını (\n\n) tek satıra (\n) indir
    // formatted = formatted.replace(/(<p><\/p>|<p><br><\/p>)\s*$/i, '').trim();

    return formatted.trim();
}

export { extensions, formatEditorContent };
