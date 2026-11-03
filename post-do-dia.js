// ═════════════════════════════════════════════════════════════════════════════
//  AÇAÍ DA BRU — Post do dia
//  A dona escolhe o que vai no post (promoções, açaís…) e o painel monta sozinho
//  a imagem para os grupos e o status do WhatsApp, com o texto e o link da loja.
//  O que está esgotado no estoque não entra, e a lista "Hoje tem" mostra só os
//  complementos disponíveis (o que acabou some sozinho).
//  TF Solutions — adaptado do Post do dia da Olimpo
// ═════════════════════════════════════════════════════════════════════════════

const POST_FMT = {
  grupo:  { w: 1080, h: 1350, porImagem: 6, rotulo: "grupo" },
  status: { w: 1080, h: 1920, porImagem: 6, rotulo: "status" },
};
const POST_CHAVE = "acaidabru:postDia";
const POST_COR = { fundo1: "#3a0f27", fundo2: "#1c0613", vinho: "#7A1F4B", ouro: "#D4A24C", ouroClaro: "#F3D58E", creme: "#FFF9F2", texto: "#2B1420" };
const POST_SELOS = { promocao: "PROMOÇÃO", novidade: "NOVIDADE", maisPedido: "MAIS PEDIDO" };

let postFormato = "grupo";
let postSel = null;               // Set de docIds no post de hoje (null = ainda não escolheu → padrão)
let postTextoEditado = false;
let postCanvases = [];
let postRenderId = 0;
const postImgCache = {};

const _postHoje = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const _postMoeda = (v) => "R$ " + Number(v || 0).toFixed(2).replace(".", ",");
const _postEl = (id) => document.getElementById(id);

// ── Preferências (só neste aparelho) ─────────────────────────────────────────
function _postCarregarPrefs() {
  try {
    const s = JSON.parse(localStorage.getItem(POST_CHAVE) || "null");
    if (!s) return;
    if (s.dia === _postHoje() && Array.isArray(s.sel)) postSel = new Set(s.sel);
    if (POST_FMT[s.formato]) postFormato = s.formato;
    if (typeof s.preco === "boolean") _postEl("post-preco").checked = s.preco;
    if (typeof s.ingr === "boolean") _postEl("post-ingr").checked = s.ingr;
    if (typeof s.frase === "string") _postEl("post-frase").value = s.frase;
  } catch (e) { /* sem armazenamento: segue o padrão */ }
}
function _postSalvarPrefs() {
  try {
    localStorage.setItem(POST_CHAVE, JSON.stringify({
      dia: _postHoje(), sel: postSel ? [...postSel] : null, formato: postFormato,
      preco: _postEl("post-preco").checked, ingr: _postEl("post-ingr").checked, frase: _postEl("post-frase").value,
    }));
  } catch (e) { /* ignora */ }
}

// ── Regras ───────────────────────────────────────────────────────────────────
const _postPromoAcabou = (p) => p.promoAte && new Date(p.promoAte + "T23:59:59") < new Date();
const _postEsgotado = (p) => p.estoque !== undefined && p.estoque !== null && Number(p.estoque) <= 0;
const _postPode = (p) => p.ativo !== false && !_postEsgotado(p) && !_postPromoAcabou(p);
const _postNoPost = (p) => _postPode(p) && postSel && postSel.has(p.docId);
const _postSelo = (p) => (typeof _seloDoProduto === "function" ? _seloDoProduto(p) : (p.destaque ? "promocao" : "")) || "";
function _postPreco(p) {
  const precos = (Array.isArray(p.tamanhos) && p.tamanhos.length ? p.tamanhos.map(t => Number(t.preco) || 0) : [Number(p.preco) || 0]).filter(v => v > 0);
  return { valor: precos.length ? Math.min(...precos) : 0, varios: precos.length > 1 };
}
const _postPrecoTxt = (p) => { const { valor, varios } = _postPreco(p); return valor ? (varios ? "a partir de " : "") + _postMoeda(valor) : ""; };

function _postCategorias() {
  const cats = [...todasCategorias].sort((a, b) => (a.ordem ?? 99) - (b.ordem ?? 99));
  return cats.map(c => ({ id: c.id || c.docId, nome: c.nome || c.id || "Outros" }));
}
function _postOrdenar(lista) {
  const ordem = Object.fromEntries(_postCategorias().map((c, i) => [c.id, i]));
  return [...lista].sort((a, b) => (_postSelo(b) ? 1 : 0) - (_postSelo(a) ? 1 : 0) || (ordem[a.categoria] ?? 99) - (ordem[b.categoria] ?? 99) || (a.nome || "").localeCompare(b.nome || "", "pt-BR"));
}
function _postItens() { return _postOrdenar(todosProdutos.filter(_postNoPost)); }

// Modelos prontos
function _postAplicarModelo(m) {
  const pode = todosProdutos.filter(_postPode);
  let lista = [];
  if (m === "destaques") { lista = pode.filter(p => _postSelo(p) || /promo/i.test(p.categoria || "")); if (!lista.length) lista = _postOrdenar(pode).slice(0, 4); }
  if (m === "acai") lista = pode.filter(p => /a[cç]a[ií]/i.test(`${p.nome} ${p.categoria}`) && !/sorvete|bebida/i.test(p.categoria || ""));
  if (m === "tudo") lista = pode;
  postSel = new Set(lista.map(p => p.docId));
}

// Complementos/adicionais que tem hoje (sem os que estão em falta)
function _postIngredientesHoje() {
  const falta = new Set(_indisponiveis.map(_normNome));
  const vistos = new Set();
  return [..._complementosLoja, ..._adicionaisLoja.map(a => a.nome)].filter(n => {
    const k = _normNome(n);
    if (!k || falta.has(k) || vistos.has(k)) return false;
    vistos.add(k); return true;
  });
}

function _postLink() {
  if (_cfgLoja.linkCatalogo) return _cfgLoja.linkCatalogo;
  try { return new URL("./", location.href).href; } catch (e) { return ""; }
}
const _postDataExtenso = () => { const t = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" }); return t.charAt(0).toUpperCase() + t.slice(1); };
const _postFrase = () => _postEl("post-frase").value.trim() || "Hoje tem açaí!";

// ── Tela ─────────────────────────────────────────────────────────────────────
function renderPostDia() {
  if (!_postEl("tab-post")) return;
  if (postSel === null) _postAplicarModelo("destaques");
  document.querySelectorAll("#post-formato [data-formato]").forEach(b => b.classList.toggle("ativo", b.dataset.formato === postFormato));
  if (document.activeElement !== _postEl("post-link")) _postEl("post-link").value = _cfgLoja.linkCatalogo || "";
  _postEl("post-link").placeholder = _postLink() || "https://...";

  const n = todosProdutos.filter(_postNoPost).length;
  _postEl("post-contagem").textContent = n === 1 ? "1 produto no post" : `${n} produtos no post`;

  const ativos = todosProdutos.filter(p => p.ativo !== false);
  const cats = _postCategorias();
  const grupos = cats.map(c => ({ nome: c.nome, itens: ativos.filter(p => p.categoria === c.id) })).filter(g => g.itens.length);
  const semCat = ativos.filter(p => !cats.some(c => c.id === p.categoria));
  if (semCat.length) grupos.push({ nome: "Outros", itens: semCat });

  _postEl("post-lista").innerHTML = grupos.length ? grupos.map(g => `
    <p class="post-cat">${_escAttr(g.nome)}</p>
    ${g.itens.map(p => {
      const pode = _postPode(p), on = _postNoPost(p), selo = _postSelo(p);
      const tag = _postEsgotado(p) ? `<span class="post-tag esg">Esgotado</span>` : _postPromoAcabou(p) ? `<span class="post-tag esg">Promoção encerrada</span>` : selo ? `<span class="post-tag">${POST_SELOS[selo] ? POST_SELOS[selo].toLowerCase() : "destaque"}</span>` : "";
      return `<button type="button" class="post-item${on ? " on" : ""}${pode ? "" : " sem"}" data-post-item="${p.docId}" aria-pressed="${on}">
        <span class="post-check"><i class="fa-solid fa-check"></i></span>
        ${p.imagem ? `<img src="${_escAttr(p.imagem)}" alt="" loading="lazy">` : `<span class="post-noimg"><i class="fa-solid fa-image"></i></span>`}
        <span class="post-info"><strong>${_escAttr(p.nome)}</strong><span>${_postPrecoTxt(p)}${tag}</span></span>
      </button>`;
    }).join("")}`).join("") : `<p class="ingr-vazio">Nenhum produto cadastrado.</p>`;

  _postAtualizarTexto();
  _postAgendarDesenho();
}

// ── Texto da mensagem ────────────────────────────────────────────────────────
function _postMontarTexto() {
  const itens = _postItens();
  const loja = _cfgLoja.nomeLoja || "Açaí da Bru";
  const preco = _postEl("post-preco").checked;
  const l = [`💜 *${loja} — ${_postFrase()}* 💜`, `📅 ${_postDataExtenso()}`, ""];
  itens.forEach(p => {
    const selo = _postSelo(p);
    const ate = p.promoAte ? ` _(até ${p.promoAte.split("-").reverse().slice(0, 2).join("/")})_` : "";
    l.push(`${selo === "promocao" ? "🔥" : selo === "novidade" ? "✨" : "🍧"} ${p.nome}${preco && _postPrecoTxt(p) ? ` — *${_postPrecoTxt(p)}*` : ""}${ate}`);
  });
  if (itens.length) l.push("");
  if (_postEl("post-ingr").checked) {
    const ingr = _postIngredientesHoje();
    if (ingr.length) l.push(`🥄 *Hoje tem:* ${ingr.join(", ")}`, "");
  }
  const entrega = [_cfgLoja.entregaDisponivel !== false ? `🛵 Entrega${_cfgLoja.tempoEntrega ? ` (${_cfgLoja.tempoEntrega})` : ""}` : "", _cfgLoja.retiradaDisponivel !== false ? "🏠 Retirada" : ""].filter(Boolean).join(" · ");
  if (entrega) l.push(entrega, "");
  l.push("👉 *Monte o seu e peça pelo link:*", _postLink() || "(link da loja)", "", "Escolhe o tamanho, os complementos, e o pedido chega prontinho no nosso WhatsApp 💜");
  return l.join("\n");
}
function _postAtualizarTexto() { if (!postTextoEditado) _postEl("post-texto").value = _postMontarTexto(); }
function postRefazerTexto() { postTextoEditado = false; _postEl("post-texto-refazer").hidden = true; _postAtualizarTexto(); }

// ── Desenho (canvas) ─────────────────────────────────────────────────────────
let _postTimer = null;
function _postAgendarDesenho() { clearTimeout(_postTimer); _postTimer = setTimeout(_postDesenhar, 150); }

function _postImg(src) {
  if (!src) return Promise.resolve(null);
  if (postImgCache[src]) return postImgCache[src];
  postImgCache[src] = new Promise(ok => {
    const img = new Image();
    if (/^https?:/i.test(src) && !src.startsWith(location.origin)) img.crossOrigin = "anonymous";
    img.onload = () => ok(img); img.onerror = () => ok(null);
    img.src = src;
  });
  return postImgCache[src];
}
function _postRet(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function _postCobrir(ctx, img, x, y, w, h) {
  const e = Math.max(w / img.width, h / img.height), sw = w / e, sh = h / e;
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
}
function _postQuebrar(ctx, texto, max, linhasMax) {
  const pal = String(texto).split(/\s+/), linhas = []; let at = "";
  for (const p of pal) { const t = at ? at + " " + p : p; if (ctx.measureText(t).width <= max || !at) at = t; else { linhas.push(at); at = p; } }
  if (at) linhas.push(at);
  if (linhas.length > linhasMax) { const c = linhas.slice(0, linhasMax); let u = c[linhasMax - 1]; while (ctx.measureText(u + "…").width > max && u.length > 1) u = u.slice(0, -1); c[linhasMax - 1] = u.trimEnd() + "…"; return c; }
  return linhas;
}
const _postOuro = (ctx, y0, y1) => { const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, POST_COR.ouroClaro); g.addColorStop(1, POST_COR.ouro); return g; };

async function _postDesenhar() {
  const id = ++postRenderId;
  const fmt = POST_FMT[postFormato];
  const itens = _postItens();
  const paginas = [];
  for (let i = 0; i < Math.max(itens.length, 1); i += fmt.porImagem) paginas.push(itens.slice(i, i + fmt.porImagem));
  try { await Promise.all(['800 60px "Montserrat"', '700 30px "Montserrat"', '600 30px "Inter"', '700 30px "Inter"'].map(f => document.fonts.load(f))); } catch (e) { /* segue */ }
  const [logo, ...fotos] = await Promise.all([_postImg(_cfgLoja.logoUrl || "assets/logo.jpg"), ...itens.map(p => _postImg(p.imagem))]);
  if (id !== postRenderId) return;
  const fotoDe = new Map(itens.map((p, i) => [p.docId, fotos[i]]));
  const ingr = _postEl("post-ingr").checked ? _postIngredientesHoje() : [];

  postCanvases = paginas.map((pag, n) => {
    const cv = document.createElement("canvas"); cv.width = fmt.w; cv.height = fmt.h;
    _postPagina(cv.getContext("2d"), fmt, pag, fotoDe, logo, n, paginas.length, n === paginas.length - 1 ? ingr : []);
    return cv;
  });
  const area = _postEl("post-previa");
  area.innerHTML = "";
  postCanvases.forEach((cv, n) => {
    const f = document.createElement("figure"); f.appendChild(cv);
    if (postCanvases.length > 1) { const c = document.createElement("figcaption"); c.textContent = `Imagem ${n + 1} de ${postCanvases.length}`; f.appendChild(c); }
    area.appendChild(f);
  });
  _postEl("post-aviso-paginas").hidden = postCanvases.length < 2;
  _postEl("post-aviso-paginas").textContent = `Como são muitos produtos, o painel separou em ${postCanvases.length} imagens (até ${fmt.porImagem} por imagem). Todas vão juntas ao compartilhar.`;
}

function _postPagina(ctx, fmt, itens, fotoDe, logo, nPag, totPag, ingr) {
  const W = fmt.w, H = fmt.h, status = postFormato === "status";
  // Fundo vinho com brilho
  const f = ctx.createRadialGradient(W / 2, H * 0.25, 60, W / 2, H * 0.5, H * 0.9);
  f.addColorStop(0, "#5C1638"); f.addColorStop(0.55, POST_COR.fundo1); f.addColorStop(1, POST_COR.fundo2);
  ctx.fillStyle = f; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(212,162,76,.55)"; ctx.lineWidth = 3; _postRet(ctx, 26, 26, W - 52, H - 52, 34); ctx.stroke();

  // Cabeçalho: logo redondo + frase + data
  let y = status ? 150 : 60;
  const tl = status ? 190 : 140;
  if (logo) {
    ctx.save(); ctx.shadowColor = "rgba(212,162,76,.45)"; ctx.shadowBlur = 30;
    ctx.beginPath(); ctx.arc(W / 2, y + tl / 2, tl / 2, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill(); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.arc(W / 2, y + tl / 2, tl / 2 - 4, 0, Math.PI * 2); ctx.clip(); _postCobrir(ctx, logo, W / 2 - tl / 2 + 4, y + 4, tl - 8, tl - 8); ctx.restore();
    ctx.strokeStyle = POST_COR.ouro; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(W / 2, y + tl / 2, tl / 2, 0, Math.PI * 2); ctx.stroke();
  }
  y += tl + (status ? 86 : 70);
  const frase = _postFrase().toUpperCase();
  let tt = status ? 78 : 68;
  ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
  ctx.font = `800 ${tt}px "Montserrat", sans-serif`;
  while (ctx.measureText(frase).width > W - 150 && tt > 36) { tt -= 2; ctx.font = `800 ${tt}px "Montserrat", sans-serif`; }
  ctx.fillStyle = _postOuro(ctx, y - tt, y); ctx.fillText(frase, W / 2, y);
  y += status ? 56 : 48;
  ctx.font = `600 ${status ? 36 : 31}px "Inter", sans-serif`; ctx.fillStyle = POST_COR.creme;
  ctx.fillText(_postDataExtenso() + (totPag > 1 ? `  ·  ${nPag + 1}/${totPag}` : ""), W / 2, y);

  // Rodapé (de baixo para cima)
  const tb = status ? 42 : 36, hb = tb * 2.1;
  const margemBaixo = status ? 190 : 70;
  // "Hoje tem" (complementos)
  const tIng = status ? 30 : 26;
  ctx.font = `600 ${tIng}px "Inter", sans-serif`;
  const linhasIng = ingr.length ? _postQuebrar(ctx, ingr.join("  ·  "), W - 200, status ? 4 : 3) : [];
  const hIng = linhasIng.length ? 62 + linhasIng.length * tIng * 1.4 + 26 : 0;
  const topoRodape = H - margemBaixo - hb - (status ? 56 : 0) - (hIng ? hIng + 26 : 0);
  const topoGrade = y + (status ? 54 : 36), baseGrade = topoRodape - (status ? 30 : 22);

  // Grade de produtos
  const n = itens.length;
  if (!n) {
    ctx.font = `800 ${status ? 50 : 44}px "Montserrat", sans-serif`; ctx.fillStyle = POST_COR.creme;
    ctx.fillText("Monte o seu do seu jeito!", W / 2, (topoGrade + baseGrade) / 2);
    ctx.font = `600 ${status ? 32 : 28}px "Inter", sans-serif`; ctx.fillStyle = "rgba(255,249,242,.75)";
    ctx.fillText("Escolha o tamanho e os complementos pelo link", W / 2, (topoGrade + baseGrade) / 2 + 54);
  } else {
    const cols = n === 1 ? 1 : n <= 4 ? 2 : 3, linhas = Math.ceil(n / cols);
    const mg = 70, gap = status ? 26 : 22;
    const lc = Math.min((W - mg * 2 - gap * (cols - 1)) / cols, cols === 1 ? 560 : 9999);
    const hc = Math.min((baseGrade - topoGrade - gap * (linhas - 1)) / linhas, lc * (cols === 1 ? 1.1 : 1.32));
    let yc = topoGrade + (baseGrade - topoGrade - (hc * linhas + gap * (linhas - 1))) / 2;
    const tn = Math.max(22, Math.min(36, lc * 0.076)), tp = tn * 1.12;
    const preco = _postEl("post-preco").checked;
    const ht = preco ? tn * 2.4 + tp * 1.35 : tn * 2.6;
    for (let l = 0; l < linhas; l++) {
      const daLinha = itens.slice(l * cols, l * cols + cols);
      let xc = (W - (daLinha.length * lc + (daLinha.length - 1) * gap)) / 2;
      daLinha.forEach(p => { _postCartao(ctx, p, fotoDe.get(p.docId), xc, yc, lc, hc, ht, tn, tp, preco); xc += lc + gap; });
      yc += hc + gap;
    }
  }

  // Caixa "Hoje tem"
  let yr = topoRodape;
  if (linhasIng.length) {
    ctx.fillStyle = "rgba(255,249,242,.08)"; ctx.strokeStyle = "rgba(212,162,76,.45)"; ctx.lineWidth = 2;
    _postRet(ctx, 70, yr, W - 140, hIng, 24); ctx.fill(); ctx.stroke();
    ctx.font = `800 ${tIng * 1.05}px "Montserrat", sans-serif`; ctx.fillStyle = POST_COR.ouro;
    ctx.fillText("HOJE TEM", W / 2, yr + 48);
    ctx.font = `600 ${tIng}px "Inter", sans-serif`; ctx.fillStyle = POST_COR.creme;
    let yi = yr + 48 + tIng * 1.5;
    linhasIng.forEach(t => { ctx.fillText(t, W / 2, yi); yi += tIng * 1.4; });
    yr += hIng + 26;
  }
  // Botão
  ctx.font = `800 ${tb}px "Montserrat", sans-serif`;
  const tx = "PEÇA PELO LINK 👉";
  const lb = Math.min(W - 140, ctx.measureText(tx).width + 120);
  ctx.save(); ctx.shadowColor = "rgba(0,0,0,.45)"; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8;
  ctx.fillStyle = _postOuro(ctx, yr, yr + hb); _postRet(ctx, (W - lb) / 2, yr, lb, hb, hb / 2); ctx.fill(); ctx.restore();
  ctx.fillStyle = POST_COR.fundo2; ctx.textBaseline = "middle"; ctx.fillText(tx, W / 2, yr + hb / 2 + 2); ctx.textBaseline = "alphabetic";
  if (status) { ctx.font = `600 28px "Inter", sans-serif`; ctx.fillStyle = "rgba(255,249,242,.8)"; ctx.fillText("O link está na mensagem", W / 2, yr + hb + 50); }
}

function _postCartao(ctx, p, foto, x, y, w, h, ht, tn, tp, preco) {
  const r = 24;
  ctx.save(); ctx.shadowColor = "rgba(0,0,0,.45)"; ctx.shadowBlur = 22; ctx.shadowOffsetY = 8;
  ctx.fillStyle = POST_COR.creme; _postRet(ctx, x, y, w, h, r); ctx.fill(); ctx.restore();
  const hf = Math.max(60, h - ht);
  ctx.save(); _postRet(ctx, x, y, w, h, r); ctx.clip();
  if (foto) _postCobrir(ctx, foto, x, y, w, hf);
  else { ctx.fillStyle = "#EEDDE3"; ctx.fillRect(x, y, w, hf); ctx.font = `${Math.round(hf * 0.35)}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("🍧", x + w / 2, y + hf / 2); ctx.textBaseline = "alphabetic"; }
  ctx.fillStyle = POST_COR.ouro; ctx.fillRect(x, y + hf - 4, w, 4);
  ctx.restore();

  ctx.textAlign = "center";
  ctx.font = `800 ${tn}px "Montserrat", sans-serif`; ctx.fillStyle = POST_COR.texto;
  const linhas = _postQuebrar(ctx, p.nome, w - 28, 2);
  const bloco = linhas.length * tn * 1.18 + (preco ? tp * 1.25 : 0);
  let ty = y + hf + (h - hf - bloco) / 2 + tn * 0.95;
  linhas.forEach(t => { ctx.fillText(t, x + w / 2, ty); ty += tn * 1.18; });
  if (preco) {
    const { valor, varios } = _postPreco(p);
    if (valor) {
      ty += tp * 0.12;
      const v = _postMoeda(valor);
      if (varios) {
        ctx.font = `700 ${tp * 0.6}px "Inter", sans-serif`; const pre = "a partir de "; const lp = ctx.measureText(pre).width;
        ctx.font = `800 ${tp}px "Montserrat", sans-serif`; const lv = ctx.measureText(v).width;
        const x0 = x + w / 2 - (lp + lv) / 2; ctx.textAlign = "left";
        ctx.font = `700 ${tp * 0.6}px "Inter", sans-serif`; ctx.fillStyle = "#7a6470"; ctx.fillText(pre, x0, ty);
        ctx.font = `800 ${tp}px "Montserrat", sans-serif`; ctx.fillStyle = POST_COR.vinho; ctx.fillText(v, x0 + lp, ty);
        ctx.textAlign = "center";
      } else { ctx.font = `800 ${tp}px "Montserrat", sans-serif`; ctx.fillStyle = POST_COR.vinho; ctx.fillText(v, x + w / 2, ty); }
    }
  }
  const selo = POST_SELOS[_postSelo(p)];
  if (selo) _postSeloDesenho(ctx, selo, x + 14, y + 14, Math.max(17, tn * 0.6), _postSelo(p) === "promocao" ? "#e11d48" : POST_COR.fundo2, _postSelo(p) === "promocao" ? "#fff" : POST_COR.ouroClaro);
}
function _postSeloDesenho(ctx, texto, x, y, t, fundo, cor) {
  ctx.font = `800 ${t}px "Montserrat", sans-serif`;
  const w = ctx.measureText(texto).width + t * 1.2, h = t * 1.7;
  ctx.save(); ctx.shadowColor = "rgba(0,0,0,.3)"; ctx.shadowBlur = 8; ctx.shadowOffsetY = 2;
  ctx.fillStyle = fundo; _postRet(ctx, x, y, w, h, h / 2); ctx.fill(); ctx.restore();
  ctx.fillStyle = cor; ctx.textAlign = "left"; ctx.textBaseline = "middle";
  ctx.fillText(texto, x + t * 0.6, y + h / 2 + 1);
  ctx.textBaseline = "alphabetic"; ctx.textAlign = "center";
}

// ── Exportar / compartilhar ──────────────────────────────────────────────────
function _postArquivos() {
  return Promise.all(postCanvases.map((cv, i) => new Promise((ok, erro) => {
    try { cv.toBlob(b => b ? ok(new File([b], `acai-da-bru-${POST_FMT[postFormato].rotulo}-${_postHoje()}${postCanvases.length > 1 ? "-" + (i + 1) : ""}.png`, { type: "image/png" })) : erro(new Error("vazio")), "image/png"); }
    catch (e) { erro(e); }
  })));
}
function _postErro(e) {
  console.error(e);
  toast(e && e.name === "SecurityError" ? "O navegador bloqueou a imagem: abra o painel pelo site publicado, não direto do arquivo." : "Não consegui gerar a imagem. Tente de novo.", "err");
}
async function postCopiarTexto(silencioso = false) {
  const t = _postEl("post-texto").value;
  try { await navigator.clipboard.writeText(t); if (!silencioso) toast("Texto copiado! É só colar no grupo.", "ok"); return true; }
  catch (e) { _postEl("post-texto").select(); try { document.execCommand("copy"); if (!silencioso) toast("Texto copiado! É só colar no grupo.", "ok"); return true; } catch (e2) { return false; } }
}
async function postBaixar() {
  try {
    const arqs = await _postArquivos();
    arqs.forEach((f, i) => setTimeout(() => {
      const url = URL.createObjectURL(f), a = document.createElement("a");
      a.href = url; a.download = f.name; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    }, i * 400));
    toast(arqs.length > 1 ? `${arqs.length} imagens salvas!` : "Imagem salva!", "ok");
  } catch (e) { _postErro(e); }
}
async function postCompartilhar() {
  let arqs;
  try { arqs = await _postArquivos(); } catch (e) { _postErro(e); return; }
  const texto = _postEl("post-texto").value;
  if (navigator.canShare && navigator.canShare({ files: arqs })) {
    await postCopiarTexto(true); // garante o texto caso o WhatsApp ignore a legenda
    try { await navigator.share({ files: arqs, text: texto }); return; } catch (e) { if (e.name === "AbortError") return; }
  }
  await postBaixar(); await postCopiarTexto(true);
  toast("Imagem salva e texto copiado. Abrindo o WhatsApp…", "ok");
  setTimeout(() => window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank"), 900);
}

// ── Eventos ──────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  if (!_postEl("tab-post")) return;
  _postCarregarPrefs();
  _postEl("post-lista").addEventListener("click", e => {
    const b = e.target.closest("[data-post-item]"); if (!b) return;
    const p = todosProdutos.find(x => x.docId === b.dataset.postItem); if (!p) return;
    if (!_postPode(p)) { toast(_postEsgotado(p) ? `${p.nome} está esgotado — reponha no Estoque para entrar no post.` : "Essa promoção já encerrou. Mude a data no produto para usar de novo.", "err"); return; }
    if (postSel.has(p.docId)) postSel.delete(p.docId); else postSel.add(p.docId);
    _postSalvarPrefs(); renderPostDia();
  });
  _postEl("post-modelos").addEventListener("click", e => {
    const b = e.target.closest("[data-modelo]"); if (!b) return;
    if (b.dataset.modelo === "nada") postSel = new Set(); else _postAplicarModelo(b.dataset.modelo);
    _postSalvarPrefs(); renderPostDia();
  });
  _postEl("post-formato").addEventListener("click", e => {
    const b = e.target.closest("[data-formato]"); if (!b) return;
    postFormato = b.dataset.formato; _postSalvarPrefs(); renderPostDia();
  });
  ["post-preco", "post-ingr"].forEach(id => _postEl(id).addEventListener("change", () => { _postSalvarPrefs(); _postAtualizarTexto(); _postAgendarDesenho(); }));
  _postEl("post-frase").addEventListener("input", () => { _postSalvarPrefs(); _postAtualizarTexto(); _postAgendarDesenho(); });
  _postEl("post-texto").addEventListener("input", () => { postTextoEditado = true; _postEl("post-texto-refazer").hidden = false; });
  _postEl("post-link").addEventListener("change", async e => {
    const link = e.target.value.trim();
    _cfgLoja.linkCatalogo = link;
    try { await db.collection("configuracoes").doc("geral").set({ linkCatalogo: link }, { merge: true }); toast("Link da loja salvo.", "ok"); }
    catch (err) { toast("Não consegui salvar o link: " + err.message, "err"); }
    _postAtualizarTexto();
  });
});
