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
        const tc = _tamCopoEst(t.nome) || (tams.length === 1 ? _tamCopoEst(p.nome) : null);
        if (tc === d.tam) v.push({ produto: p.docId, tamanho: tams.length > 1 ? t.nome : "*", opcao: "*", qtd: Number(p.copos) || 1 });
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
