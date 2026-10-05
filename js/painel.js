const $ = (s) => document.querySelector(s);
let sel = null;
window.addEventListener("storage", render);

function render() {
  const list = Store.all();
  const cont = (st) => list.filter((o) => o.status === st).length;
  const ativos = list.filter((o) => o.status !== "entregue").length;
  $("#kpis").innerHTML = [["Veículos no pátio", ativos], ["Aguardando aprovação", cont("aguardando")], ["Prontos p/ retirada", cont("pronto")], ["Em execução", cont("execucao")]]
    .map(([l, v]) => `<div class="card kpi"><strong>${v}</strong><span class="muted">${l}</span></div>`).join("");

  $("#board").innerHTML = STATUS.filter((s) => s[0] !== "entregue").map(([k, l]) => {
    const os = list.filter((o) => o.status === k);
    return `<div class="col"><h3>${l}<span>${os.length}</span></h3>${os.map((o) => `
      <div class="os ${sel === o.id ? "sel" : ""}" data-id="${o.id}">
        <b>${esc(o.veiculo)}</b><small>${esc(o.id)} · ${esc(o.placa)}</small><br>
        <small>${esc(o.mecanico)} · ${brl(total(o))}</small>
      </div>`).join("")}</div>`;
  }).join("");
  document.querySelectorAll(".os").forEach((e) => (e.onclick = () => { sel = e.dataset.id; render(); }));
  detalhe();
}

function detalhe() {
  const o = sel && Store.get(sel);
  $("#det").classList.toggle("hide", !o);
  $("#vazio").classList.toggle("hide", !!o);
  if (!o) return;
  $("#d-titulo").textContent = `${o.veiculo} · ${o.placa}`;
  $("#d-sub").textContent = `${o.id} · ${o.cliente} · ${o.fone}`;
  $("#d-status").innerHTML = STATUS.map(([k, l]) => `<option value="${k}" ${k === o.status ? "selected" : ""}>${l}</option>`).join("");
  $("#d-itens").innerHTML = o.itens.length
    ? o.itens.map((i) => `
      <div class="item" style="grid-template-columns:${i.foto ? "70px " : ""}1fr auto">
        ${i.foto ? `<img src="${i.foto}" alt="" style="width:70px;height:52px">` : ""}
        <div>${esc(i.desc)}<br><span class="ap-${i.aprov}" style="font-size:13px">${i.aprov}</span></div>
        <div class="price">${brl(i.valor)}</div>
      </div>`).join("")
    : '<p class="muted">Sem itens no orçamento.</p>';
}

const MSG_STATUS = {
  recebido: "Veículo recebido.",
  diagnostico: "Diagnóstico iniciado.",
  aguardando: "Orçamento digital enviado. Aguardando sua aprovação.",
  execucao: "Serviço em execução.",
  pronto: "Serviço concluído! Pode retirar seu veículo.",
  entregue: "Veículo entregue. Obrigado pela confiança!",
};

$("#d-status").onchange = (e) => {
  const novo = e.target.value;
  Store.update(sel, (o) => { o.status = novo; Store.log(o, MSG_STATUS[novo]); });
  toast("Status atualizado — cliente notificado");
  render();
};

$("#f-item").onsubmit = (e) => {
  e.preventDefault();
  const form = e.target, f = new FormData(form), file = $("#i-foto").files[0];
  const add = (foto) => {
    Store.update(sel, (o) => {
      o.itens.push({ id: uid(), tipo: f.get("tipo"), desc: f.get("desc"), valor: parseFloat(f.get("valor")), aprov: "pendente", ...(foto ? { foto } : {}) });
      Store.log(o, `Novo item no orçamento: ${f.get("desc")}.`);
    });
    form.reset();
    toast("Item adicionado");
    render();
  };
  if (!file) return add();
  // reduz a foto antes de guardar, senão estoura o limite do localStorage
  const img = new Image();
  img.onload = () => {
    const c = document.createElement("canvas"), r = Math.min(1, 480 / img.width);
    c.width = img.width * r; c.height = img.height * r;
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    add(c.toDataURL("image/jpeg", 0.7));
  };
  img.src = URL.createObjectURL(file);
};

$("#f-nova").onsubmit = (e) => {
  e.preventDefault();
  const f = new FormData(e.target), id = Store.nextId(), l = Store.all();
  l.push({
    id, placa: f.get("placa").replace(/[^a-z0-9]/gi, "").toUpperCase(), cliente: f.get("cliente"), fone: f.get("fone"),
    veiculo: f.get("veiculo"), mecanico: f.get("mecanico"), entrada: Date.now(), previsao: f.get("previsao"),
    status: "recebido", itens: [], timeline: [{ ts: Date.now(), msg: "Veículo recebido na recepção." }],
  });
  Store.save(l);
  sel = id;
  e.target.reset();
  toast(`OS ${id} criada. Informe o código ao cliente.`);
  render();
};

$("#reset").onclick = () => { if (confirm("Restaurar dados de demonstração?")) { Store.reset(); sel = null; render(); } };
render();
