// Renderizador Markdown mínimo y seguro.
// Escapa TODO el HTML de entrada primero y luego aplica un conjunto
// limitado de transformaciones, así no hay inyección de HTML/scripts.
// Soporta: # a ###, **negrita**, *cursiva*, [enlace](url), listas
// (- o 1.), citas (>), y párrafos separados por línea en blanco.

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inline(text: string): string {
  let t = escapeHtml(text);
  // Enlaces [texto](http...) — solo http/https.
  t = t.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    (_m, label, url) =>
      `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-emerald-700 underline hover:text-emerald-800 dark:text-emerald-400">${label}</a>`,
  );
  // Negrita y cursiva.
  t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  t = t.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
  return t;
}

/** Convierte Markdown (de confianza, escrito por admin) a HTML. */
export function renderMarkdown(src: string): string {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let list: "ul" | "ol" | null = null;
  let para: string[] = [];

  const flushPara = () => {
    if (para.length) {
      out.push(`<p>${inline(para.join(" "))}</p>`);
      para = [];
    }
  };
  const closeList = () => {
    if (list) {
      out.push(`</${list}>`);
      list = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (!line.trim()) {
      flushPara();
      closeList();
      continue;
    }

    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      flushPara();
      closeList();
      const level = h[1].length + 1; // # => h2, ## => h3, ### => h4
      const cls =
        level === 2
          ? "mt-8 text-2xl font-bold"
          : level === 3
            ? "mt-6 text-xl font-semibold"
            : "mt-4 text-lg font-semibold";
      out.push(`<h${level} class="${cls}">${inline(h[2])}</h${level}>`);
      continue;
    }

    const uli = line.match(/^[-*]\s+(.*)$/);
    const oli = line.match(/^\d+\.\s+(.*)$/);
    if (uli || oli) {
      flushPara();
      const want: "ul" | "ol" = uli ? "ul" : "ol";
      if (list !== want) {
        closeList();
        const cls = want === "ul" ? "list-disc" : "list-decimal";
        out.push(`<${want} class="my-4 pl-6 ${cls} space-y-1">`);
        list = want;
      }
      out.push(`<li>${inline((uli ?? oli)![1])}</li>`);
      continue;
    }

    const q = line.match(/^>\s?(.*)$/);
    if (q) {
      flushPara();
      closeList();
      out.push(
        `<blockquote class="my-4 border-l-4 border-emerald-300 pl-4 italic text-zinc-600 dark:text-zinc-400">${inline(q[1])}</blockquote>`,
      );
      continue;
    }

    para.push(line.trim());
  }

  flushPara();
  closeList();
  return out.join("\n");
}
