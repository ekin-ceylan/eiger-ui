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

/**
 * Tiptap'ın belgenin sonuna yapısal olarak eklediği boş <p></p> etiketini siler.
 * Kullanıcının bilerek bıraktığı boşluklara (nbsp, br) dokunmaz.
 * @param {string} html
 * @returns {string}
 */
function trimTrailingP(html) {
    if (!html || html === '<p></p>') return '';

    // Tiptap'ın getHTML() çıktısında otomatik eklenen P her zaman tam olarak böyledir
    if (html.endsWith('<p></p>')) {
        return html.slice(0, -7); // En sondaki 7 karakteri (<p></p>) kesip atar
    }

    return html;
}

export { formatEditorContent, trimTrailingP };

/*
TODO: İleride İhtiyaç Duyulabilecek Spesifik Nitelikler (Edge Cases)
---------------------------------------------------------------------
* Numaralı Listeler (orderedList - <ol>):
  - 'start' -> Listeyi 1'den değil, istenen sayıdan başlatmak için.

* Kod Blokları (codeBlock - <pre><code>):
  - 'language' -> Kodun hangi dilde yazıldığını tutmak için (Tiptap bunu genellikle kendi yönetir ama manuel müdahale gerekebilir).

* Videolar / Gömülü İçerikler (İleride iframe veya video eklentisi yazılırsa):
  - 'allowfullscreen', 'frameborder', 'controls', 'autoplay', 'muted' vb.
*/
