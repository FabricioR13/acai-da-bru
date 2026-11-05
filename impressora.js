// ═════════════════════════════════════════════════════════════════════════════
//  AÇAÍ DA BRU — Impressora térmica (Bluetooth direto, sem app)
//  Testada com a Celark CE-O1501B (58 mm, 32 colunas) no Chrome do Android.
//  • "Conectar impressora" (topo de Pedidos) escolhe a impressora uma vez por sessão
//  • Botão "Imprimir" em cada pedido; opção de imprimir sozinho ao aceitar (Em preparo)
//  • Dados em pedaços de 20 bytes, esperando a impressora confirmar (comanda inteira)
//  TF Solutions
// ═════════════════════════════════════════════════════════════════════════════

const IMP_COLS = 32;
const IMP_SERVICOS = [
  "000018f0-0000-1000-8000-00805f9b34fb", "0000ff00-0000-1000-8000-00805f9b34fb",
  "0000fee7-0000-1000-8000-00805f9b34fb", "49535343-fe7d-4ae5-8fa9-9fafd205e455",
  "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
];
const IMP_PREF = "admin:impressora";
let _impDev = null, _impCarac = null, _impOcupada = false;

// ── Preferências deste aparelho ──────────────────────────────────────────────
function _impPrefs() { try { return JSON.parse(localStorage.getItem(IMP_PREF) || "{}"); } catch (e) { return {}; } }
function _impSalvarPrefs(p) { try { localStorage.setItem(IMP_PREF, JSON.stringify({ ..._impPrefs(), ...p })); } catch (e) {} }
const impAutoAoAceitar = () => !!_impPrefs().auto;
function alternarImpAuto(on) {
  _impSalvarPrefs({ auto: on });
  toast(on ? "Ao tocar em \"Em preparo\", a comanda sai sozinha" : "Impressão automática desligada", "ok");
}

// ── Texto → bytes (ESC/POS, página de código 860 = português) ───────────────
const _CP860 = { "á":0xA0,"à":0x85,"â":0x83,"ã":0x84,"é":0x82,"ê":0x88,"í":0xA1,"ó":0xA2,"ô":0x93,"õ":0x94,"ú":0xA3,"ü":0x81,"ç":0x87,
  "Á":0x86,"À":0x91,"Â":0x8F,"Ã":0x8E,"É":0x90,"Ê":0x89,"Í":0x8B,"Ó":0x9F,"Ô":0x8C,"Õ":0x99,"Ú":0x96,"Ç":0x80,"º":0xA7,"ª":0xA6 };
const _impLimpar = (t) => String(t ?? "")
  .replace(/[·•]/g, "-").replace(/[—–]/g, "-").replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/…/g, "...")
  .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, "").replace(/\s+$/g, "");
function _impBytes(blocos) {
  const out = [0x1B, 0x40, 0x1B, 0x74, 0x03]; // inicia + tabela 860
  blocos.forEach(b => {
    if (b.cmd) { out.push(...b.cmd); return; }
    for (const ch of _impLimpar(b)) {
      if (ch === "\n") out.push(0x0A);
      else if (_CP860[ch] !== undefined) out.push(_CP860[ch]);
      else { const c = ch.charCodeAt(0); out.push(c < 128 ? c : 0x3F); }
    }
    out.push(0x0A);
  });
  out.push(0x0A, 0x0A, 0x0A, 0x1D, 0x56, 0x42, 0x00);
  return new Uint8Array(out);
}
const _B = { negrito: { cmd: [0x1B, 0x45, 1] }, normal: { cmd: [0x1B, 0x45, 0, 0x1D, 0x21, 0x00] }, grande: { cmd: [0x1B, 0x45, 1, 0x1D, 0x21, 0x11] }, alto: { cmd: [0x1B, 0x45, 1, 0x1D, 0x21, 0x01] }, centro: { cmd: [0x1B, 0x61, 1] }, esquerda: { cmd: [0x1B, 0x61, 0] } };

// ── Montagem da comanda (32 colunas) ─────────────────────────────────────────
const _linha = (c = "-") => c.repeat(IMP_COLS);
const _lado = (a, b) => { a = _impLimpar(a); b = _impLimpar(b); const e = IMP_COLS - a.length - b.length; return e >= 1 ? a + " ".repeat(e) + b : a + "\n" + " ".repeat(Math.max(0, IMP_COLS - b.length)) + b; };
const _quebra = (t, rec = 0) => {
  const pal = _impLimpar(t).split(" "), out = []; let at = "";
  pal.forEach(p => { if ((at + " " + p).trim().length > IMP_COLS - rec) { if (at) out.push(at); at = p; } else at = (at + " " + p).trim(); });
  if (at) out.push(at);
  return out.map(l => " ".repeat(rec) + l).join("\n");
};
const _r$ = (v) => "R$ " + Number(v || 0).toFixed(2).replace(".", ",");

function montarComanda(p) {
  const loja = (_cfgLoja.nomeLoja || "Açaí da Bru").toUpperCase();
  const dt = p.criadoEm?.toDate ? p.criadoEm.toDate() : new Date();
  const tipo = !p.tipo || p.tipo === "entrega" ? "ENTREGA" : p.tipo === "balcao" ? "BALCÃO" : "RETIRADA";
  const B = [];
  B.push(_B.centro, _B.negrito, loja, _B.normal);
  B.push(_B.grande, `${p.numero ? "Nº " + p.numero : "#" + (p.codigo || "")}`, _B.normal);
  if (p.numero && p.codigo) B.push(`#${p.codigo}`);
  B.push(dt.toLocaleDateString("pt-BR") + " " + dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
  B.push(_B.alto, tipo, _B.normal, _B.esquerda, _linha("="));
  (p.itens || []).forEach(it => {
    const q = Number(it.quantidade ?? it.qtd ?? 1) || 1;
    const partes = String(it.detalhes || "").split(" · ").map(x => x.trim()).filter(Boolean)
      .filter(x => x !== it.tamanho); // o tamanho já vai no título
    const combo = partes.some(x => /^\d+º\s*açaí/i.test(x));
    const tam = it.tamanho && !combo ? ` ${it.tamanho}` : "";
    B.push(_B.negrito, _quebra(`${q}x ${it.nome}${tam}`), _B.normal);
    partes.forEach(x => B.push(_quebra(x, 2)));
    B.push(_lado("", _r$(Number(it.preco || 0) * q)));
  });
  B.push(_linha("-"));
  const sub = p.subtotal ?? (p.itens || []).reduce((s, it) => s + Number(it.preco || 0) * (Number(it.quantidade ?? it.qtd ?? 1) || 1), 0);
  B.push(_lado("Subtotal", _r$(sub)));
  if (Number(p.desconto)) B.push(_lado("Desconto", "- " + _r$(p.desconto)));
  if (tipo === "ENTREGA") B.push(_lado(`Entrega${p.bairro ? ` (${p.bairro})` : ""}`, Number(p.taxaEntrega) ? _r$(p.taxaEntrega) : "Grátis"));
  B.push(_B.alto, _lado("TOTAL", _r$(p.total)), _B.normal, _linha("-"));
  B.push(`Pagamento: ${p.pagamento || "-"}${p.pago ? "  [PAGO]" : ""}`);
  if (p.troco) B.push(`Troco para: R$ ${p.troco}`);
  B.push(_quebra(`Cliente: ${p.cliente || "-"}`));
  const tel = String(p.telefone || "").replace(/\D/g, "");
  if (tel) B.push(`Fone: ${tel.length === 11 ? `(${tel.slice(0, 2)}) ${tel.slice(2, 7)}-${tel.slice(7)}` : tel}`);
  if (p.endereco && tipo === "ENTREGA") {
    const e = p.endereco;
    B.push(_quebra(`Endereço: ${e.rua || ""}${e.numero ? ", " + e.numero : ""}${e.bairro || p.bairro ? " - " + (e.bairro || p.bairro) : ""}`));
    if (e.cep) B.push(`CEP: ${e.cep}`);
  }
  if (p.talher) B.push("Mandar colher/canudo");
  if (p.observacoes) B.push(_B.negrito, _quebra(`Obs: ${p.observacoes}`), _B.normal);
  B.push(_linha("="), _B.centro, "Obrigado pela preferência!", _B.esquerda, "", "");
  return B;
}

// ── Conexão Bluetooth ────────────────────────────────────────────────────────
async function _impAcharCanal(srv) {
  for (const uuid of IMP_SERVICOS) {
    try {
      const s = await srv.getPrimaryService(uuid);
      for (const c of await s.getCharacteristics()) if (c.properties.write || c.properties.writeWithoutResponse) return c;
    } catch (e) { /* serviço não existe nesta impressora */ }
  }
  return null;
}
function _impStatus() {
  const b = document.getElementById("btn-impressora");
  if (!b) return;
  const on = !!(_impDev && _impDev.gatt.connected);
  b.className = `btn btn-sm ${on ? "btn-ok-imp" : "btn-ghost"}`;
  b.innerHTML = on ? `<i class="fa-solid fa-print"></i> Impressora ✓` : `<i class="fa-solid fa-print"></i> Conectar impressora`;
  b.title = on ? `Conectada: ${_impDev.name || "impressora"} — toque para opções` : "Escolher a impressora térmica (Bluetooth)";
}
async function _impConectar(escolher) {
  if (!("bluetooth" in navigator)) throw new Error("Este navegador não tem Bluetooth. No celular Android, use o Chrome (ou o app Bru Painel).");
  if (_impDev && !escolher) {
    if (!_impDev.gatt.connected) await _impDev.gatt.connect();
  } else {
    let dev = null;
    if (!escolher && navigator.bluetooth.getDevices) {
      try { const nome = _impPrefs().nome; dev = (await navigator.bluetooth.getDevices()).find(d => d.name && d.name === nome) || null; } catch (e) { dev = null; }
    }
    if (!dev) dev = await navigator.bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: IMP_SERVICOS });
    await dev.gatt.connect();
    dev.addEventListener("gattserverdisconnected", _impStatus);
    _impDev = dev;
    _impSalvarPrefs({ nome: dev.name || "" });
  }
  _impCarac = await _impAcharCanal(_impDev.gatt);
  if (!_impCarac) throw new Error("conectou, mas essa impressora não aceita impressão por aqui");
  _impStatus();
}
async function conectarImpressora() {
  if (_impDev && _impDev.gatt.connected) { abrirModal("imp-modal"); _impRenderModal(); return; }
  try { await _impConectar(false); toast(`Impressora conectada: ${_impDev.name || ""}`, "ok"); }
  catch (e) { _impErro(e); }
}
function _impErro(e) {
  if (e && e.name === "NotFoundError") toast("Nenhuma impressora escolhida. Se ela não aparece: desligue e ligue a impressora e tente de novo.", "err");
  else toast("Impressora: " + (e?.message || e) + " — desligue e ligue a impressora e tente de novo.", "err");
  _impStatus();
}
async function _impEnviar(bytes) {
  const comResp = _impCarac.properties.write;
  for (let i = 0; i < bytes.length; i += 20) {
    const parte = bytes.slice(i, i + 20);
    if (comResp) await _impCarac.writeValueWithResponse(parte);
    else { await _impCarac.writeValueWithoutResponse(parte); await new Promise(r => setTimeout(r, 25)); }
  }
}

// ── Imprimir ─────────────────────────────────────────────────────────────────
async function imprimirBlocos(blocos, rotulo) {
  if (_impOcupada) { toast("Aguarde: a impressora ainda está imprimindo.", "err"); return false; }
  _impOcupada = true;
  try {
    await _impConectar(false);
    toast(`Imprimindo ${rotulo || ""}…`, "ok");
    await _impEnviar(_impBytes(blocos));
    return true;
  } catch (e) { _impErro(e); return false; }
  finally { _impOcupada = false; }
}
function imprimirPedido(docId) {
  const p = (typeof _pedidos !== "undefined" ? _pedidos : []).find(x => x.docId === docId);
  if (!p) { toast("Pedido não encontrado.", "err"); return; }
  return imprimirBlocos(montarComanda(p), _nomePedido(p));
}
function imprimirTesteImpressora() {
  return imprimirBlocos([_B.centro, _B.negrito, (_cfgLoja.nomeLoja || "Açaí da Bru").toUpperCase(), _B.normal, "Impressora funcionando!", new Date().toLocaleString("pt-BR"), _B.esquerda, ""], "teste");
}
function desconectarImpressora() {
  try { _impDev?.gatt?.disconnect(); } catch (e) {}
  _impDev = null; _impCarac = null; _impStatus(); fecharModal("imp-modal");
  toast("Impressora desconectada", "ok");
}
function _impRenderModal() {
  document.getElementById("imp-nome").textContent = _impDev ? (_impDev.name || "impressora") : "-";
  document.getElementById("imp-auto").checked = impAutoAoAceitar();
}

document.addEventListener("DOMContentLoaded", () => { _impStatus(); });
