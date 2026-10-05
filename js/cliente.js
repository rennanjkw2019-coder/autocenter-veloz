let atual = null; // id da OS em exibição
const $ = (s) => document.querySelector(s);

$("#form-busca").addEventListener("submit", (e) => {
  e.preventDefault();
  const os = Store.findByPlaca($("#placa").value, $("#codigo").value);
  if (!os) return ($("#erro").textContent = "Não encontramos. Confira a placa e o código do comprovante.");
  $("#erro").textContent = "";
  atual = os.id;
  sessionStorage.setItem("veloz.cli", atual);
  render();
});
$("#sair").addEventListener("click", () => { atual = null; sessionStorage.removeItem("veloz.cli"); render(); });
window.addEventListener("storage", render); // atualiza quando o painel muda algo em outra aba
setInterval(render, 5000);

function aprovar(itemId, valor) {
  Store.update(atual, (o) => {
    const it = o.itens.find((i) => i.id === itemId);
    it.aprov = valor;
    Store.log(o, `Cliente ${valor === "aprovado" ? "aprovou" : "recusou"}: ${it.desc}.`);
    const respondeuTudo = o.itens.every((i) => i.aprov !== "pendente");
    if (respondeuTudo && o.itens.some((i) => i.aprov === "aprovado")) {
      o.status = "execucao";
      Store.log(o, "Todos os itens respondidos. Serviço liberado para execução.");
    }
  });
  toast(valor === "aprovado" ? "Item aprovado ✔" : "Item recusado");
  render();
}

function aprovarTodos() {
  Store.update(atual, (o) => {
    o.itens.filter((i) => i.aprov === "pendente").forEach((i) => (i.aprov = "aprovado"));
    o.status = "execucao";
    Store.log(o, "Cliente aprovou o orçamento completo. Serviço liberado.");
  });
  toast("Orçamento aprovado! A oficina já foi avisada.");
  render();
}

function render() {
  const os = atual && Store.get(atual);
  $("#tela-busca").classList.toggle("hide", !!os);
  $("#tela-os").classList.toggle("hide", !os);
  if (!os) return;

  const idx = STATUS.findIndex((s) => s[0] === os.status);
  $("#cab").innerHTML = `
    <div class="row" style="align-items:center">
      <div>
        <span class="tag">${esc(os.id)} · ${esc(os.placa)}</span>
        <h1 style="font-size:1.5rem">${esc(os.veiculo)}</h1>
        <span class="muted">Olá, ${esc(os.cliente.split(" ")[0])}! Previsão de entrega: <b>${esc(os.previsao)}</b> · Mecânico: ${esc(os.mecanico)}</span>
      </div>
      <div style="flex:0"><span class="pill ${os.status}">${statusLabel(os.status)}</span></div>
    </div>
    <div class="steps">${STATUS.map((s, i) => `<div class="step ${i < idx ? "done" : i === idx ? "now" : ""}"><i>${i < idx ? "✓" : i + 1}</i>${s[1]}</div>`).join("")}</div>`;

  const pend = os.itens.filter((i) => i.aprov === "pendente").length;
  if (os.itens.length === 0) {
    $("#orc").innerHTML = `<p class="muted">O mecânico ainda está avaliando o veículo. Assim que o orçamento estiver pronto você será avisado aqui.</p>`;
  } else {
    $("#orc").innerHTML = os.itens.map((i) => `
      <div class="item">
        <div>${i.foto ? `<img src="${i.foto}" alt="Foto: ${esc(i.desc)}" data-zoom>` : `<div class="tag" style="text-align:center">${i.tipo === "peca" ? "Peça" : "Serviço"}</div>`}</div>
        <div><span class="tag">${i.tipo === "peca" ? "Peça" : "Serviço"}</span><div>${esc(i.desc)}</div><div class="price">${brl(i.valor)}</div></div>
        <div class="acts">${i.aprov === "pendente"
          ? `<button class="btn ok sm" data-a="${i.id}">Aprovar</button><button class="btn bad sm" data-r="${i.id}">Recusar</button>`
          : `<span class="ap-${i.aprov}">${i.aprov === "aprovado" ? "✔ Aprovado" : "✖ Recusado"}</span>`}</div>
      </div>`).join("") +
      `<div class="total"><span>Total aprovado</span><span>${brl(total(os, true))}</span></div>
       <div class="muted" style="font-size:13px">Orçamento completo: ${brl(total(os))}</div>` +
      (pend ? `<p><button class="btn" id="aprova-tudo" style="width:100%">Aprovar tudo (${pend} ${pend > 1 ? "itens" : "item"})</button></p>` : "");
  }

  $("#tl").innerHTML = [...os.timeline].reverse().map((t) => `<li><time>${fmtDt(t.ts)}</time>${esc(t.msg)}</li>`).join("");
  $("#aviso").classList.toggle("hide", os.status !== "pronto");

  document.querySelectorAll("[data-a]").forEach((b) => (b.onclick = () => aprovar(b.dataset.a, "aprovado")));
  document.querySelectorAll("[data-r]").forEach((b) => (b.onclick = () => aprovar(b.dataset.r, "recusado")));
  const todos = $("#aprova-tudo");
  if (todos) todos.onclick = aprovarTodos;
  document.querySelectorAll("[data-zoom]").forEach((im) => (im.onclick = () => { $("#zoom img").src = im.src; $("#zoom").classList.add("show"); }));
}

$("#zoom").onclick = () => $("#zoom").classList.remove("show");
atual = sessionStorage.getItem("veloz.cli");
render();
