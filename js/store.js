/* Camada de dados: localStorage (demo sem backend). Sincroniza abas via evento "storage". */
const KEY = "veloz.os.v1";
const STATUS = [
  ["recebido", "Recebido"],
  ["diagnostico", "Em diagnóstico"],
  ["aguardando", "Aguardando aprovação"],
  ["execucao", "Em execução"],
  ["pronto", "Pronto p/ retirada"],
  ["entregue", "Entregue"],
];
const statusLabel = (s) => (STATUS.find((x) => x[0] === s) || [, s])[1];
const brl = (n) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDt = (ts) => new Date(ts).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const uid = () => Math.random().toString(36).slice(2, 9);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* Foto ilustrativa gerada em SVG (evita binários e dependências externas). */
function fotoSvg(titulo, cor = "#e4572e") {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360"><rect width="480" height="360" fill="#20262f"/><circle cx="240" cy="150" r="82" fill="none" stroke="${cor}" stroke-width="14"/><circle cx="240" cy="150" r="22" fill="${cor}"/><path d="M240 68v34M240 198v34M158 150h34M288 150h34" stroke="${cor}" stroke-width="10"/><text x="240" y="300" fill="#fff" font-family="sans-serif" font-size="22" text-anchor="middle">${titulo}</text><text x="240" y="330" fill="#9aa4b2" font-family="sans-serif" font-size="14" text-anchor="middle">foto registrada pelo mecânico</text></svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

function seed() {
  const h = 3600e3, now = Date.now();
  return [
    { id: "VLZ-1042", placa: "ABC1D23", cliente: "Mariana Souza", fone: "(11) 90000-0001", veiculo: "Honda Civic 2019", mecanico: "Carlos", entrada: now - 5 * h, previsao: "Hoje, 17h", status: "aguardando",
      itens: [
        { id: uid(), tipo: "peca", desc: "Pastilhas de freio dianteiras (desgaste 2 mm)", valor: 289.9, aprov: "pendente", foto: fotoSvg("Pastilha desgastada") },
        { id: uid(), tipo: "peca", desc: "Disco de freio dianteiro (par)", valor: 520, aprov: "pendente", foto: fotoSvg("Disco empenado", "#d98a00") },
        { id: uid(), tipo: "servico", desc: "Mão de obra - freios", valor: 180, aprov: "pendente" },
      ],
      timeline: [[now - 5 * h, "Veículo recebido na recepção."], [now - 3 * h, "Diagnóstico iniciado pelo mecânico Carlos."], [now - 1 * h, "Orçamento digital enviado. Aguardando sua aprovação."]] },
    { id: "VLZ-1043", placa: "XYZ9K88", cliente: "João Pereira", fone: "(11) 90000-0002", veiculo: "VW Gol 2015", mecanico: "Rafael", entrada: now - 26 * h, previsao: "Hoje, 15h", status: "execucao",
      itens: [{ id: uid(), tipo: "servico", desc: "Troca de óleo e filtro", valor: 210, aprov: "aprovado" }, { id: uid(), tipo: "peca", desc: "Correia dentada", valor: 340, aprov: "aprovado", foto: fotoSvg("Correia ressecada") }],
      timeline: [[now - 26 * h, "Veículo recebido na recepção."], [now - 24 * h, "Orçamento aprovado pelo cliente."], [now - 2 * h, "Serviço em execução no elevador 3."]] },
    { id: "VLZ-1044", placa: "QWE4R56", cliente: "Ana Lima", fone: "(11) 90000-0003", veiculo: "Fiat Argo 2021", mecanico: "Carlos", entrada: now - 2 * h, previsao: "Amanhã, 10h", status: "diagnostico", itens: [],
      timeline: [[now - 2 * h, "Veículo recebido na recepção."], [now - 1 * h, "Diagnóstico iniciado."]] },
    { id: "VLZ-1041", placa: "JKL7M90", cliente: "Pedro Alves", fone: "(11) 90000-0004", veiculo: "Toyota Corolla 2018", mecanico: "Rafael", entrada: now - 30 * h, previsao: "Hoje, 11h", status: "pronto",
      itens: [{ id: uid(), tipo: "servico", desc: "Revisão 60.000 km", valor: 790, aprov: "aprovado" }],
      timeline: [[now - 30 * h, "Veículo recebido na recepção."], [now - 28 * h, "Orçamento aprovado."], [now - 1 * h, "Serviço concluído! Pode retirar seu veículo."]] },
  ].map((o) => ({ ...o, timeline: o.timeline.map(([ts, msg]) => ({ ts, msg })) }));
}

const Store = {
  all() {
    try { const d = JSON.parse(localStorage.getItem(KEY)); if (Array.isArray(d) && d.length) return d; } catch (e) {}
    const s = seed(); this.save(s); return s;
  },
  save(list) { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) { alert("Armazenamento cheio: use fotos menores."); } },
  get(id) { return this.all().find((o) => o.id === id); },
  update(id, fn) { const l = this.all(); const o = l.find((x) => x.id === id); if (o) { fn(o); this.save(l); } return o; },
  log(o, msg) { o.timeline.push({ ts: Date.now(), msg }); },
  findByPlaca(placa, codigo) {
    const p = placa.replace(/[^a-z0-9]/gi, "").toUpperCase();
    return this.all().find((o) => o.placa === p && o.id.toUpperCase() === codigo.trim().toUpperCase());
  },
  nextId() { const n = Math.max(1000, ...this.all().map((o) => +o.id.split("-")[1] || 0)) + 1; return "VLZ-" + n; },
  reset() { localStorage.removeItem(KEY); },
};
const total = (o, soAprov) => o.itens.filter((i) => !soAprov || i.aprov === "aprovado").reduce((s, i) => s + i.valor, 0);
function toast(msg) {
  let t = document.querySelector(".toast");
  if (!t) { t = document.createElement("div"); t.className = "toast"; document.body.append(t); }
  t.textContent = msg; t.classList.add("show");
  clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("show"), 2600);
}
