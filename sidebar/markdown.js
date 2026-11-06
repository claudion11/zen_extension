// Minimaler, sicherer Markdown-Renderer (escaped zuerst alles HTML).
(function () {
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  function inline(s) {
    const codes = [];
    s = s.replace(/`([^`\n]+)`/g, (_, c) => { codes.push(c); return `\u0000${codes.length - 1}\u0000`; });
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
         .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
         .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    return s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codes[i]}</code>`);
  }

  function render(src) {
    const parts = esc(src).split(/```/);
    let html = "";
    parts.forEach((part, i) => {
      if (i % 2 === 1) {
        const nl = part.indexOf("\n");
        const body = nl >= 0 ? part.slice(nl + 1) : part;
        html += `<pre><code>${body.replace(/\n$/, "")}</code></pre>`;
        return;
      }
      let list = null;
      const close = () => { if (list) { html += `</${list}>`; list = null; } };
      let para = [];
      const flush = () => { if (para.length) { html += `<p>${inline(para.join("<br>"))}</p>`; para = []; } };
      for (const line of part.split("\n")) {
        let m;
        if ((m = line.match(/^(#{1,6})\s+(.*)/))) { flush(); close(); const l = Math.min(m[1].length, 3); html += `<h${l}>${inline(m[2])}</h${l}>`; }
        else if ((m = line.match(/^\s*[-*]\s+(.*)/))) { flush(); if (list !== "ul") { close(); html += "<ul>"; list = "ul"; } html += `<li>${inline(m[1])}</li>`; }
        else if ((m = line.match(/^\s*\d+[.)]\s+(.*)/))) { flush(); if (list !== "ol") { close(); html += "<ol>"; list = "ol"; } html += `<li>${inline(m[1])}</li>`; }
        else if (!line.trim()) { flush(); close(); }
        else { close(); para.push(line); }
      }
      flush(); close();
    });
    return html;
  }

  window.renderMarkdown = render;
})();
