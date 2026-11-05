// ═════════════════════════════════════════════════════════════════════════════
//  PIX "copia e cola" (BR Code estático do Banco Central) — usado no admin e em pix.html
//  gerarPixCopiaECola({ chave, nome, cidade, valor, txid }) → texto para colar no app do banco
//  TF Solutions
// ═════════════════════════════════════════════════════════════════════════════
(function (global) {
  const semAcento = (t) => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "");
  const campo = (id, v) => id + String(v.length).padStart(2, "0") + v;
  function crc16(txt) {
    let crc = 0xFFFF;
    for (let i = 0; i < txt.length; i++) {
      crc ^= txt.charCodeAt(i) << 8;
      for (let b = 0; b < 8; b++) crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xFFFF : (crc << 1) & 0xFFFF;
    }
    return crc.toString(16).toUpperCase().padStart(4, "0");
  }
  // Chave: CNPJ/CPF/telefone só com números (telefone com +55), e-mail e aleatória como estão
  function normalizarChave(chave) {
    const c = String(chave || "").trim();
    if (/@/.test(c) || /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(c)) return c;
    const d = c.replace(/\D/g, "");
    if (/^\+/.test(c) || (d.length >= 12 && d.startsWith("55") && d.length <= 13)) return "+" + d;
    return d;
  }
  function gerarPixCopiaECola({ chave, nome, cidade, valor, txid }) {
    const k = normalizarChave(chave);
    if (!k || !nome) return "";
    const nm = semAcento(nome).toUpperCase().replace(/[^A-Z0-9 ]/g, "").trim().slice(0, 25);
    const cd = semAcento(cidade || "BRASIL").toUpperCase().replace(/[^A-Z0-9 ]/g, "").trim().slice(0, 15) || "BRASIL";
    const id = String(txid || "").replace(/[^A-Za-z0-9]/g, "").slice(0, 25) || "***";
    let p = campo("00", "01")
      + campo("26", campo("00", "br.gov.bcb.pix") + campo("01", k))
      + campo("52", "0000") + campo("53", "986");
    const v = Number(valor);
    if (v > 0) p += campo("54", v.toFixed(2));
    p += campo("58", "BR") + campo("59", nm) + campo("60", cd) + campo("62", campo("05", id)) + "6304";
    return p + crc16(p);
  }
  const formatarChave = (chave) => {
    const d = String(chave || "").replace(/\D/g, "");
    if (d.length === 14 && !/@/.test(chave)) return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
    return String(chave || "");
  };
  global.gerarPixCopiaECola = gerarPixCopiaECola;
  global.formatarChavePix = formatarChave;
})(typeof window !== "undefined" ? window : globalThis);
