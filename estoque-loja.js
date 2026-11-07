// ═════════════════════════════════════════════════════════════════════════════
//  AÇAÍ DA BRU — Lista de itens do estoque + estoque ligado aos ingredientes
//  • LISTA_LOJA: todos os itens que a Bru trabalha, por grupo (atualizado em 03/11/2026)
//  • "Lista da loja": confere o estoque com essa lista (cria o que falta, renomeia,
//    e oferece tirar o que não é mais usado) sem perder quantidade nem histórico
//  • Mantimento zerado → o ingrediente ligado sai da loja; repôs → volta sozinho
//  TF Solutions
// ═════════════════════════════════════════════════════════════════════════════

const GRUPOS_ESTOQUE = ["Copos e tampas", "Açaí", "Mantimentos", "Sorvetes", "Bebidas", "Outros"];

// tipo: "copo" (liga aos tamanhos), "sorvete" (liga ao sabor), "refri" (liga às bebidas),
//       "mantimento" (liga ao complemento/adicional da loja). apelidos = nomes antigos do mesmo item.
const LISTA_LOJA = [
  ...["250ml", "300ml", "400ml", "500ml", "700ml", "1L"].map(t => ({
    nome: `Copo e tampa ${t}`, grupo: "Copos e tampas", unidade: "copo", minimo: 20, tipo: "copo", tam: t,
    apelidos: [`Copo ${t}`, `Copo e tampa ${t}`, `Copos e tampas ${t}`, t === "1L" ? "Copo 1 litro" : `Copo de ${t}`] })),
  { nome: "Açaí polpa Norte 5 kg", grupo: "Açaí", unidade: "balde", minimo: 1, apelidos: ["Polpa de açaí", "Açaí polpa", "Açaí polpa norte", "Polpa açaí"] },
  ...[
    ["M&M's", "pacote", ["Mms", "M&M"]], ["Paçoca", "caixa"], ["Granola", "pacote"], ["Amendoim", "pacote"],
    ["Chocoball", "pacote"], ["Sucrilhos", "pacote"], ["Leite em pó", "pacote"], ["Ovomaltine", "pote"],
    ["Bala de goma", "pacote"], ["Leite condensado", "unidade"], ["Cobertura de morango", "frasco", ["Cobertura morango"]],
    ["Cobertura de chocolate", "frasco"], ["Oreo", "pacote"], ["Kit Kat", "caixa"], ["Prestígio", "caixa"],
    ["Stikadinho", "pacote"], ["Ouro Branco", "pacote"], ["Nutella", "pote"],
    ["Creme Ninho Vabene", "pote"], ["Creme Ninho Confeitosa", "pote"], ["Creme de avelã Confeitosa", "pote", ["Creme avelã confeitosa"]],
    ["Creme de morango", "pote", ["Creme morango"]], ["Creme de doce de leite", "pote", ["Creme doce de leite"]],
    ["Creme Ovomaltine", "pote"], ["Roleta", "pacote"], ["Marshmallow", "pacote"],
  ].map(([nome, unidade, apelidos]) => ({ nome, grupo: "Mantimentos", unidade, minimo: 1, tipo: "mantimento", apelidos: apelidos || [] })),
  ...["Abacaxi", "Napolitano", "Flocos", "Baunilha"].map(sabor => ({
    nome: `Sorvete ${sabor}`, grupo: "Sorvetes", unidade: "pote", minimo: 1, tipo: "sorvete", sabor, apelidos: [] })),
  { nome: "Refri", grupo: "Bebidas", unidade: "unidade", minimo: 6, tipo: "refri", apelidos: ["Refrigerante", "Refrigerantes"] },
];

// Nome "limpo" para comparar: sem acento, sem &/'/., sem "de/do/da", minúsculo
function _chaveEst(t) {
  return String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[&'’.]/g, "").replace(/[^a-z0-9]+/g, " ")
    .split(" ").filter(w => w && !["de", "do", "da", "com"].includes(w)).join(" ");
}
const _tamCopoEst = (t) => { const m = String(t || "").match(/(\d+)\s*ml/i); if (m) return m[1] + "ml"; return /\b1\s*l(itro)?\b/i.test(t || "") ? "1L" : null; };
const _ehRefri = (t) => /coca|refri|guaran|fanta|sprite|pepsi|soda|kuat/i.test(t || "");
const _ehBebida = (p) => /bebida/i.test(p.categoria || "") || _ehRefri(p.nome);

// ── Grupos na tela do estoque ────────────────────────────────────────────────
function _grupoDoItem(e) {
  if (e.grupo && GRUPOS_ESTOQUE.includes(e.grupo)) return e.grupo;
  if (/copo|tampa/i.test(e.nome)) return "Copos e tampas";
  if (/polpa|açaí|acai/i.test(e.nome)) return "Açaí";
  if (/sorvete/i.test(e.nome)) return "Sorvetes";
  if (_ehRefri(e.nome)) return "Bebidas";
  return e.grupo || "Outros";
}
function _gruposEstoque(lista) {
  const ordemDe = new Map(LISTA_LOJA.map((d, i) => [_chaveEst(d.nome), i]));
  const ord = (e) => ordemDe.has(_chaveEst(e.nome)) ? ordemDe.get(_chaveEst(e.nome)) : 999;
  const peso = (e) => _estZerado(e) ? 0 : _estBaixo(e) ? 1 : !_estTemQtd(e) ? 2 : 3;
  return GRUPOS_ESTOQUE.map(nome => ({
    nome, itens: lista.filter(e => _grupoDoItem(e) === nome)
      .sort((a, b) => peso(a) - peso(b) || ord(a) - ord(b) || (a.nome || "").localeCompare(b.nome || "", "pt-BR")),
  })).filter(g => g.itens.length);
}

// ── Modal do item: grupo + ingrediente ligado ────────────────────────────────
function _nomesIngredientes() {
  const vistos = new Set();
  return [..._complementosLoja, ..._adicionaisLoja.map(a => a.nome)]
    .filter(n => { const k = _normNome(n); if (!k || vistos.has(k)) return false; vistos.add(k); return true; })
    .sort((a, b) => a.localeCompare(b, "pt-BR"));
}
function _preencherSelectsEstoque(e) {
  const g = document.getElementById("est-grupo");
  const atualG = e ? _grupoDoItem(e) : "Mantimentos";
  g.innerHTML = GRUPOS_ESTOQUE.map(n => `<option ${n === atualG ? "selected" : ""}>${_escAttr(n)}</option>`).join("");
  const ing = document.getElementById("est-ingrediente");
  const nomes = _nomesIngredientes();
  const atual = e && e.ingrediente ? e.ingrediente : "";
  if (atual && !nomes.some(n => _normNome(n) === _normNome(atual))) nomes.unshift(atual);
  ing.innerHTML = `<option value="">— não liga a nenhum —</option>` +
    nomes.map(n => `<option value="${_escAttr(n)}" ${_normNome(n) === _normNome(atual) ? "selected" : ""}>${_escAttr(n)}</option>`).join("");
}

// ── "Acabou": zera o item na hora ────────────────────────────────────────────
async function marcarAcabouEstoque(docId) {
  const e = _estoque.find(x => x.docId === docId);
  if (!e) return;
  const antes = _estTemQtd(e) ? Number(e.quantidade) : null;
  try {
    await db.collection("estoque").doc(docId).update({ quantidade: 0 });
    await db.collection("estoqueMov").add({ itemId: docId, nome: e.nome, qtd: antes === null ? 0 : -antes, motivo: "Acabou (marcado à mão)", criadoEm: firebase.firestore.FieldValue.serverTimestamp() });
    toast(`${e.nome} acabou${e.ingrediente ? ` — ${e.ingrediente} saiu da loja` : ""}. Quando chegar, toque em Repor.`, "ok");
  } catch (err) { toast("Não consegui salvar: " + err.message, "err"); }
}

// ── Estoque → ingredientes da loja ───────────────────────────────────────────
// Um ingrediente sai da loja quando TODOS os itens ligados a ele (já contados) estão zerados
// (ex.: Creme Ninho Vabene e Confeitosa → "Creme Ninho"). Só volta sozinho o que o estoque
// tirou (lista indispEstoque) — o que a dona desligou à mão continua desligado.
let _indispEstoque = [];
let _cfgPronta = false;
let _syncIngTimer = null;
function sincronizarIngredientesPeloEstoque() {
  clearTimeout(_syncIngTimer);
  _syncIngTimer = setTimeout(_sincronizarIngredientes, 300);
}
async function _sincronizarIngredientes() {
  if (!_cfgPronta || !_estoque.length) return;
  const porIng = new Map();
  _estoque.filter(e => e.ingrediente && _estTemQtd(e)).forEach(e => {
    const k = _normNome(e.ingrediente);
    if (!porIng.has(k)) porIng.set(k, { nome: e.ingrediente, itens: [] });
    porIng.get(k).itens.push(e);
  });
  const zerados = [...porIng.values()].filter(g => g.itens.every(_estZerado));
  const kZerados = new Set(zerados.map(g => _normNome(g.nome)));
  const emFalta = new Set(_indisponiveis.map(_normNome));
  const tirar = zerados.filter(g => !emFalta.has(_normNome(g.nome)));
  const voltar = _indispEstoque.filter(n => !kZerados.has(_normNome(n)));
  if (!tirar.length && !voltar.length) return;
  const kVoltar = new Set(voltar.map(_normNome));
  _indisponiveis = _indisponiveis.filter(n => !kVoltar.has(_normNome(n))).concat(tirar.map(g => g.nome));
  _indispEstoque = _indispEstoque.filter(n => !kVoltar.has(_normNome(n))).concat(tirar.map(g => g.nome));
  try {
    await db.collection("configuracoes").doc("geral").set({ indisponiveis: _indisponiveis, indispEstoque: _indispEstoque }, { merge: true });
    const msg = [tirar.length ? `Saiu da loja (acabou): ${tirar.map(g => g.nome).join(", ")}` : "", voltar.length ? `Voltou para a loja: ${voltar.join(", ")}` : ""].filter(Boolean).join(" · ");
    toast(msg, "ok");
    if (document.getElementById("tab-disponivel")?.classList.contains("active")) renderDisponivel();
  } catch (err) { console.warn("ingredientes pelo estoque:", err.message); }
}

// ── Conferir o estoque com a lista da loja ───────────────────────────────────
let _planoLista = null;

function _vinculosSugeridos(d) {
  const v = [];
  if (d.tipo === "copo") {
    todosProdutos.forEach(p => {
      if (_ehBebida(p) || /sorvete|kit/i.test(`${p.nome} ${p.categoria}`)) return;
      const tams = (Array.isArray(p.tamanhos) && p.tamanhos.length) ? p.tamanhos : [];
      tams.forEach(t => {
        const tamanho = tams.length > 1 ? t.nome : "*";
        // Combo com copos de tamanhos diferentes: "2 açaís de 400ml + 1 de 300ml"
        const partes = [...String(t.nome || "").matchAll(/(\d+)\s*(?:a[çc]a[ií]s?\s*)?de\s*(\d+)\s*(ml|l)\b/gi)];
        if (partes.length) {
          const q = partes.filter(m => m[2] + (m[3].toLowerCase() === "l" ? "L" : "ml") === d.tam).reduce((s, m) => s + Number(m[1]), 0);
          if (q) v.push({ produto: p.docId, tamanho, opcao: "*", qtd: q });
          return;
        }
        const tc = _tamCopoEst(t.nome) || (tams.length === 1 ? _tamCopoEst(p.nome) : null);
        if (tc === d.tam) v.push({ produto: p.docId, tamanho, opcao: "*", qtd: Number(p.copos) || 1 });
      });
    });
  }
  if (d.tipo === "sorvete") {
    const sab = _chaveEst(d.sabor);
    todosProdutos.filter(p => /sorvete/i.test(`${p.nome} ${p.categoria}`)).forEach(p =>
      _combosProduto(p).forEach(c => { if (_chaveEst(c.rotulo).split(" ").includes(sab)) v.push({ produto: p.docId, tamanho: c.tamanho, opcao: c.opcao, qtd: 1 }); }));
  }
  if (d.tipo === "refri") {
    todosProdutos.filter(_ehBebida).forEach(p =>
      _combosProduto(p).forEach(c => v.push({ produto: p.docId, tamanho: c.tamanho, opcao: c.opcao, qtd: 1 })));
  }
  return v;
}

// Complemento/adicional da loja com o mesmo nome (ou o nome "de família": Creme Ninho Vabene → Creme Ninho)
function _ingredienteSugerido(d) {
  if (d.tipo !== "mantimento") return "";
  const k = _chaveEst(d.nome);
  const nomes = _nomesIngredientes();
  const exato = nomes.find(n => _chaveEst(n) === k);
  if (exato) return exato;
  const prefixo = nomes.filter(n => { const c = _chaveEst(n); return c && k.startsWith(c + " "); })
    .sort((a, b) => _chaveEst(b).length - _chaveEst(a).length)[0];
  return prefixo || "";
}

function _itemCasa(d, e) {
  const ke = _chaveEst(e.nome);
  if (ke === _chaveEst(d.nome) || d.apelidos.some(a => _chaveEst(a) === ke)) return true;
  if (d.tipo === "copo") return /copo/i.test(e.nome) && _tamCopoEst(e.nome) === d.tam;
  if (d.tipo === "sorvete") return /sorvete/i.test(e.nome) && ke.split(" ").includes(_chaveEst(d.sabor));
  if (d.tipo === "refri") return _ehRefri(e.nome);
  return false;
}

function abrirListaBru() {
  const usados = new Set();
  const novos = [], existentes = [];
  LISTA_LOJA.forEach(d => {
    const achados = _estoque.filter(e => !usados.has(e.docId) && _itemCasa(d, e));
    // "Refri" junta as bebidas que estavam separadas (Coca-Cola 2L…) num item só
    const e = achados[0];
    if (e) {
      usados.add(e.docId);
      if (d.tipo === "refri") achados.slice(1).forEach(x => usados.add(x.docId));
      existentes.push({ d, e, juntos: d.tipo === "refri" ? achados.slice(1) : [] });
    } else novos.push(d);
  });
  const fora = _estoque.filter(e => !usados.has(e.docId));
  _planoLista = { novos, existentes, fora };

  const chip = (t, sub) => `<span class="lb-chip">${_escAttr(t)}${sub ? ` <small>${_escAttr(sub)}</small>` : ""}</span>`;
  const porGrupo = (lista, f) => GRUPOS_ESTOQUE.map(g => {
    const daqui = lista.filter(x => (x.d || x).grupo === g);
    return daqui.length ? `<p class="lb-sec"><strong>${g}</strong></p><div class="lb-lista">${daqui.map(f).join("")}</div>` : "";
  }).join("");
  const renomeados = existentes.filter(x => x.e.nome !== x.d.nome);
  document.getElementById("listabru-conteudo").innerHTML = `
    <p class="lb-sec"><strong>${LISTA_LOJA.length} itens na lista</strong> <small>· ${existentes.length} já estão no estoque · ${novos.length} novos</small></p>
    ${novos.length ? `<h3 class="np-sec">Novos (entram como "Falta contar")</h3>${porGrupo(novos, d => chip(d.nome, d.unidade))}` : `<p class="lb-sec"><small>Nenhum item novo — tudo já está no estoque.</small></p>`}
    ${renomeados.length ? `<h3 class="np-sec">Ganham o nome da lista <small style="color:var(--muted);font-weight:400">(a quantidade continua)</small></h3>
      <div class="lb-lista">${renomeados.map(x => chip(`${x.e.nome} → ${x.d.nome}`)).join("")}</div>` : ""}
    ${existentes.some(x => x.juntos.length) ? `<p class="lb-sec"><small>As bebidas ${existentes.filter(x => x.juntos.length).flatMap(x => [x.e, ...x.juntos]).map(e => e.nome).join(", ")} viram um item só: "Refri".</small></p>` : ""}
    ${fora.length ? `<h3 class="np-sec">Não estão na lista da loja</h3>
      <p class="lb-sec"><small>Marcados = saem do estoque. Desmarque o que ainda quer controlar.</small></p>
      <div class="lb-fora">${fora.map(e => `<label><input type="checkbox" data-lb-fora="${e.docId}" checked> ${_escAttr(e.nome)} <small style="color:var(--muted)">${_estTemQtd(e) ? _qtdUn(e.quantidade, e.unidade) : "sem quantidade"}</small></label>`).join("")}</div>` : ""}
    <p class="lb-sec"><small><i class="fa-solid fa-link"></i> Os mantimentos ficam ligados ao ingrediente da loja com o mesmo nome: quando zerar, ele sai do cardápio; quando repor, volta.</small></p>`;
  abrirModal("listabru-modal");
}

async function aplicarListaBru() {
  if (!_planoLista) return;
  const { novos, existentes, fora } = _planoLista;
  const btn = document.getElementById("listabru-ok");
  btn.disabled = true;
  try {
    const lote = db.batch();
    const ts = firebase.firestore.FieldValue.serverTimestamp();
    novos.forEach(d => lote.set(db.collection("estoque").doc(), {
      nome: d.nome, grupo: d.grupo, unidade: d.unidade, minimo: d.minimo, quantidade: null,
      vinculos: _vinculosSugeridos(d), ingrediente: _ingredienteSugerido(d), criadoEm: ts,
    }));
    existentes.forEach(({ d, e, juntos }) => {
      const upd = { nome: d.nome, grupo: d.grupo };
      if (!e.unidade || e.unidade === "unidade") upd.unidade = d.unidade;
      if (!Number(e.minimo)) upd.minimo = d.minimo;
      const vinc = _vinculosSugeridos(d);
      if (!(e.vinculos || []).length && vinc.length) upd.vinculos = vinc;
      if (d.tipo === "refri" && juntos.length) {
        // soma as bebidas que viram "Refri"
        upd.vinculos = vinc.length ? vinc : [...(e.vinculos || []), ...juntos.flatMap(x => x.vinculos || [])];
        const qtds = [e, ...juntos].filter(_estTemQtd);
        if (qtds.length) upd.quantidade = qtds.reduce((s, x) => s + Number(x.quantidade || 0), 0);
        juntos.forEach(x => lote.delete(db.collection("estoque").doc(x.docId)));
      }
      if (!e.ingrediente) { const ing = _ingredienteSugerido(d); if (ing) upd.ingrediente = ing; }
      lote.update(db.collection("estoque").doc(e.docId), upd);
    });
    const tirar = new Set([...document.querySelectorAll("[data-lb-fora]")].filter(c => c.checked).map(c => c.dataset.lbFora));
    fora.filter(e => tirar.has(e.docId)).forEach(e => lote.delete(db.collection("estoque").doc(e.docId)));
    await lote.commit();
    fecharModal("listabru-modal");
    toast(`Estoque atualizado: ${novos.length} novos${tirar.size ? `, ${tirar.size} removidos` : ""}. Agora é só contar quanto tem de cada um.`, "ok");
    if (novos.length) filtrarEstoque("semqtd");
  } catch (err) { toast("Erro ao atualizar: " + err.message, "err"); }
  finally { btn.disabled = false; }
}

// ═════════════════════════════════════════════════════════════════════════════
//  PARCERIAS E PERDAS — saídas do estoque que não são venda
//  • Parceria: troca com outro empreendedor (gasta copo, polpa… mas não entra dinheiro)
//  • Perda: copo que caiu, produto que venceu ou estragou
//  Cada registro baixa os itens e fica no histórico "estoqueMov" com tipo, lote e detalhes
//  (o mesmo "lote" junta os itens de um registro; "Desfazer" devolve tudo ao estoque).
// ═════════════════════════════════════════════════════════════════════════════
let _sdTipo = "parceria";
let _sdQtd = {};          // itemId → quantidade que saiu (no formulário)
let _sdMes = null;        // Date no dia 1 do mês mostrado no histórico
let _sdRegistros = [];

function abrirSaidasEstoque() {
  if (!_sdMes) { const h = new Date(); _sdMes = new Date(h.getFullYear(), h.getMonth(), 1); }
  abrirModal("saidas-modal");
  carregarSaidasEstoque();
}
function mudarMesSaidas(passo) {
  _sdMes = new Date(_sdMes.getFullYear(), _sdMes.getMonth() + passo, 1);
  carregarSaidasEstoque();
}
async function carregarSaidasEstoque() {
  const ini = _sdMes, fim = new Date(ini.getFullYear(), ini.getMonth() + 1, 1);
  const h = new Date(), ehAtual = ini.getFullYear() === h.getFullYear() && ini.getMonth() === h.getMonth();
  const mes = ini.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  document.getElementById("sd-mes").textContent = mes.charAt(0).toUpperCase() + mes.slice(1);
  document.getElementById("sd-mes-prox").disabled = ehAtual;
  const hist = document.getElementById("sd-hist");
  hist.innerHTML = `<div class="loader"><i class="fa-solid fa-spinner"></i> Carregando...</div>`;
  let movs = [];
  try {
    const snap = await db.collection("estoqueMov")
      .where("criadoEm", ">=", firebase.firestore.Timestamp.fromDate(ini))
      .where("criadoEm", "<", firebase.firestore.Timestamp.fromDate(fim)).get();
    movs = snap.docs.map(d => d.data()).filter(m => (m.tipo === "parceria" || m.tipo === "perda") && m.lote);
  } catch (e) { hist.innerHTML = `<p class="ingr-vazio">Não consegui carregar: ${_escAttr(e.message)}</p>`; return; }
  // Junta os itens de cada registro (mesmo lote)
  const porLote = new Map();
  movs.forEach(m => {
    if (!porLote.has(m.lote)) porLote.set(m.lote, { ...m, itens: [], data: m.criadoEm?.toDate?.() || new Date() });
    porLote.get(m.lote).itens.push({ nome: m.nome, qtd: -Number(m.qtd || 0), unidade: (_estoque.find(e => e.docId === m.itemId) || {}).unidade });
  });
  _sdRegistros = [...porLote.values()].sort((a, b) => b.data - a.data);
  const tot = (t) => _sdRegistros.filter(r => r.tipo === t);
  const custo = (l) => l.reduce((s, r) => s + Number(r.custo || 0), 0);
  const parc = tot("parceria"), perdas = tot("perda");
  document.getElementById("sd-totais").innerHTML = `
    <div><i class="fa-solid fa-handshake" style="color:var(--blue)"></i> Parcerias<strong>${parc.length}</strong>${custo(parc) ? `custo ${_brl(custo(parc))}` : ""}${parc.some(r => r.venda) ? ` · valeria ${_brl(parc.reduce((s, r) => s + Number(r.venda || 0), 0))}` : ""}</div>
    <div><i class="fa-solid fa-trash-can" style="color:var(--red)"></i> Perdas<strong>${perdas.length}</strong>${custo(perdas) ? `custo ${_brl(custo(perdas))}` : ""}</div>`;
  hist.innerHTML = _sdRegistros.length ? _sdRegistros.map(r => {
    const quando = r.data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) + " às " + r.data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const itens = r.itens.map(i => `${_fmtQtd(i.qtd)}× ${i.nome}`).join(", ");
    const titulo = r.tipo === "parceria" ? (r.parceiro || "Parceria") : (r.motivoPerda || "Perda");
    const valores = [r.custo ? `custo ${_brl(r.custo)}` : "", r.venda ? `valor de venda ${_brl(r.venda)}` : ""].filter(Boolean).join(" · ");
    return `<div class="sd-reg ${r.tipo}">
      <div class="sd-reg-topo"><strong>${_escAttr(titulo)}</strong><span class="est-pill ${r.tipo === "parceria" ? "sd-pill-parc" : "sd-pill-perda"}">${r.tipo === "parceria" ? "Parceria" : "Perda"}</span></div>
      ${r.descricao ? `<span>${_escAttr(r.descricao)}</span>` : ""}
      ${r.troca ? `<span><i class="fa-solid fa-right-left" style="color:var(--muted)"></i> Recebeu: ${_escAttr(r.troca)}</span>` : ""}
      ${r.obs ? `<span><i class="fa-solid fa-comment" style="color:var(--muted)"></i> ${_escAttr(r.obs)}</span>` : ""}
      <small><i class="fa-solid fa-box"></i> Saiu: ${_escAttr(itens)}</small>
      <div class="sd-reg-topo"><small>${quando}${valores ? " · " + valores : ""}</small>
        <button class="btn btn-ghost btn-sm" onclick="desfazerSaidaEstoque('${_escAttr(r.lote)}')" title="Apaga este registro e devolve os itens ao estoque"><i class="fa-solid fa-rotate-left"></i> Desfazer</button></div>
    </div>`;
  }).join("") : `<p class="ingr-vazio">Nada anotado neste mês.</p>`;
}

function abrirSaidaEstoque(tipo) {
  _sdQtd = {};
  ["sd-parceiro", "sd-descricao", "sd-troca", "sd-custo", "sd-venda", "sd-custo-perda", "sd-obs", "sd-busca"].forEach(id => { document.getElementById(id).value = ""; });
  document.getElementById("sd-motivo").selectedIndex = 0;
  trocarTipoSaida(tipo || "parceria");
  abrirModal("saida-modal");
  setTimeout(() => document.getElementById(_sdTipo === "parceria" ? "sd-parceiro" : "sd-busca").focus(), 50);
}
function trocarTipoSaida(tipo) {
  _sdTipo = tipo;
  document.querySelectorAll("[data-sd-tipo]").forEach(b => b.classList.toggle("ativo", b.dataset.sdTipo === tipo));
  document.getElementById("sd-campos-parceria").hidden = tipo !== "parceria";
  document.getElementById("sd-campos-perda").hidden = tipo !== "perda";
  document.getElementById("sd-titulo").innerHTML = tipo === "parceria"
    ? `<i class="fa-solid fa-handshake"></i> Nova parceria`
    : `<i class="fa-solid fa-trash-can"></i> Nova perda`;
  renderItensSaida();
}
function renderItensSaida() {
  const busca = _chaveEst(document.getElementById("sd-busca").value);
  const lista = _estoque.filter(e => _estTemQtd(e) && (!busca || _chaveEst(e.nome).includes(busca)));
  const semQtd = _estoque.filter(e => !_estTemQtd(e)).length;
  const el = document.getElementById("sd-itens");
  el.innerHTML = lista.length ? _gruposEstoque(lista).map(g => `<p class="sd-grupo">${_escAttr(g.nome)}</p>` + g.itens.map(e => `
    <label class="sd-item${_sdQtd[e.docId] ? " marcado" : ""}">
      <span>${_escAttr(e.nome)}<small>tem ${_escAttr(_qtdUn(e.quantidade, e.unidade))}</small></span>
      <input type="number" min="0" step="any" inputmode="decimal" placeholder="0" value="${_sdQtd[e.docId] || ""}" aria-label="Quantos ${_escAttr(e.nome)} saíram"
        oninput="_sdQtd['${e.docId}'] = Math.max(0, Number(this.value) || 0); this.closest('.sd-item').classList.toggle('marcado', !!_sdQtd['${e.docId}']); _resumoSaida()">
    </label>`).join("")).join("")
    : `<p class="ingr-vazio" style="padding:8px">${busca ? "Nenhum item com esse nome." : "Nenhum item com quantidade no estoque."}</p>`;
  if (semQtd && !busca) el.insertAdjacentHTML("beforeend", `<p class="ingr-vazio" style="padding:6px 8px;font-size:.75rem">${semQtd} ${semQtd === 1 ? "item ainda não tem" : "itens ainda não têm"} quantidade contada e não ${semQtd === 1 ? "aparece" : "aparecem"} aqui.</p>`);
  _resumoSaida();
}
function _resumoSaida() {
  const esc = Object.entries(_sdQtd).filter(([, q]) => q > 0);
  document.getElementById("sd-escolhidos").textContent = esc.length
    ? "Vai baixar: " + esc.map(([id, q]) => { const e = _estoque.find(x => x.docId === id); return e ? `${_fmtQtd(q)}× ${e.nome}` : ""; }).filter(Boolean).join(", ")
    : "Nenhum item escolhido ainda.";
}
async function salvarSaidaEstoque() {
  const itens = Object.entries(_sdQtd).filter(([id, q]) => q > 0 && _estoque.some(e => e.docId === id));
  const parceria = _sdTipo === "parceria";
  const parceiro = document.getElementById("sd-parceiro").value.trim().slice(0, 60);
  if (parceria && !parceiro) { toast("Coloque com quem foi a parceria.", "err"); document.getElementById("sd-parceiro").focus(); return; }
  if (!itens.length) { toast("Coloque a quantidade de pelo menos um item que saiu.", "err"); document.getElementById("sd-busca").focus(); return; }
  const motivoPerda = document.getElementById("sd-motivo").value;
  const dados = parceria ? {
    tipo: "parceria", parceiro,
    descricao: document.getElementById("sd-descricao").value.trim().slice(0, 120),
    troca: document.getElementById("sd-troca").value.trim().slice(0, 120),
    custo: _lerPreco(document.getElementById("sd-custo").value) || 0,
    venda: _lerPreco(document.getElementById("sd-venda").value) || 0,
    motivo: `Parceria: ${parceiro}`,
  } : {
    tipo: "perda", motivoPerda,
    obs: document.getElementById("sd-obs").value.trim().slice(0, 140),
    custo: _lerPreco(document.getElementById("sd-custo-perda").value) || 0,
    motivo: `Perda: ${motivoPerda}`,
  };
  const lote = db.collection("estoqueMov").doc().id;
  const btn = document.getElementById("sd-salvar");
  btn.disabled = true;
  try {
    const b = db.batch();
    itens.forEach(([id, q]) => {
      const e = _estoque.find(x => x.docId === id);
      b.update(db.collection("estoque").doc(id), { quantidade: firebase.firestore.FieldValue.increment(-q) });
      b.set(db.collection("estoqueMov").doc(), { ...dados, lote, itemId: id, nome: e.nome, qtd: -q, criadoEm: firebase.firestore.FieldValue.serverTimestamp() });
    });
    await b.commit();
    fecharModal("saida-modal");
    toast(`${parceria ? "Parceria" : "Perda"} anotada · baixou ${itens.map(([id, q]) => `${_fmtQtd(q)}× ${(_estoque.find(e => e.docId === id) || {}).nome}`).join(", ")}`, "ok");
    if (document.getElementById("saidas-modal").classList.contains("show")) carregarSaidasEstoque();
  } catch (e) { toast("Não consegui salvar: " + e.message, "err"); }
  finally { btn.disabled = false; }
}
async function desfazerSaidaEstoque(lote) {
  const r = _sdRegistros.find(x => x.lote === lote);
  if (!r || !confirm(`Desfazer este registro?\n\nOs itens voltam para o estoque:\n${r.itens.map(i => `• ${_fmtQtd(i.qtd)}× ${i.nome}`).join("\n")}`)) return;
  try {
    const snap = await db.collection("estoqueMov").where("lote", "==", lote).get();
    const b = db.batch();
    snap.docs.forEach(d => {
      const m = d.data();
      if (_estoque.some(e => e.docId === m.itemId)) b.update(db.collection("estoque").doc(m.itemId), { quantidade: firebase.firestore.FieldValue.increment(-Number(m.qtd || 0)) });
      b.delete(d.ref);
    });
    await b.commit();
    toast("Registro desfeito — os itens voltaram ao estoque", "ok");
    carregarSaidasEstoque();
  } catch (e) { toast("Não consegui desfazer: " + e.message, "err"); }
}
