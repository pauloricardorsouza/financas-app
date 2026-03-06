/* ================= ELEMENTOS ================= */

const loginScreen = document.getElementById("loginScreen");
const loginEmail = document.getElementById("loginEmail");
const loginSenha = document.getElementById("loginSenha");

const btnLogin = document.getElementById("btnLogin");
const btnCadastro = document.getElementById("btnCadastro");
const btnLogout = document.getElementById("btnLogout");

const btnAddIncome = document.getElementById("btnAddIncome");
const btnAddExpense = document.getElementById("btnAddExpense");

const incName = document.getElementById("incName");
const incValue = document.getElementById("incValue");

const expName = document.getElementById("expName");
const expValue = document.getElementById("expValue");
const expCat = document.getElementById("expCat");
const expParcelado = document.getElementById("expParcelado");
const expParcelas = document.getElementById("expParcelas");

const listReceitas = document.getElementById("listReceitas");
const listContas = document.getElementById("listContas");

const emptyReceitas = document.getElementById("emptyReceitas");
const emptyContas = document.getElementById("emptyContas");

const kpiReceitas = document.getElementById("kpiReceitas");
const kpiDespesas = document.getElementById("kpiDespesas");
const kpiPago = document.getElementById("kpiPago");
const kpiFalta = document.getElementById("kpiFalta");
const kpiSaldo = document.getElementById("kpiSaldo");

const monthSel = document.getElementById("month");
const yearSel = document.getElementById("year");
const btnPDF = document.getElementById("btnPDF");

/* ================= UTIL ================= */

const fmt = (n) => (Number(n) || 0).toLocaleString("pt-BR", {
  style: "currency",
  currency: "BRL"
});

const uid = () => Math.random().toString(36).slice(2, 10);

const LS_KEY = "financas_app_empresarial_v3";

const months = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"
];

const state = {
  viewCat: "ALL",
  selected: {
    month: new Date().getMonth(),
    year: new Date().getFullYear()
  },
  data: {}
};

const tabs = document.querySelectorAll(".tab");

tabs.forEach(tab=>{
  tab.onclick = () => {

    tabs.forEach(t=>t.classList.remove("active"));
    tab.classList.add("active");

    state.viewCat = tab.dataset.cat;

    render();

  };
});
/* ================= STORAGE ================= */

function keyMY(m, y) {
  return `${y}-${String(m + 1).padStart(2, "0")}`;
}

function load() {
  const raw = localStorage.getItem(LS_KEY);
  if (!raw) return;

  const saved = JSON.parse(raw);

  state.viewCat = saved.viewCat ?? state.viewCat;
  state.selected = saved.selected ?? state.selected;
  state.data = saved.data ?? {};
}

function save() {
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

function ensureBucket(m = state.selected.month, y = state.selected.year) {
  const k = keyMY(m, y);
  if (!state.data[k]) {
    state.data[k] = { incomes: [], expenses: [] };
  }
  return state.data[k];
}

/* ================= LOGIN ================= */

function getUsers() {
  return JSON.parse(localStorage.getItem("usuarios_financas") || "[]");
}

function saveUsers(users) {
  localStorage.setItem("usuarios_financas", JSON.stringify(users));
}

function checkLogin() {
  const user = localStorage.getItem("usuario_logado");
  loginScreen.style.display = user ? "none" : "flex";
}

btnLogin.onclick = function () {
  const email = loginEmail.value.trim();
  const senha = loginSenha.value.trim();

  const users = getUsers();
  const user = users.find(u => u.email === email && u.senha === senha);

  if (!user) {
    alert("Usuário ou senha inválidos");
    return;
  }

  localStorage.setItem("usuario_logado", email);
  loginScreen.style.display = "none";
};

btnCadastro.onclick = function () {
  const email = loginEmail.value.trim();
  const senha = loginSenha.value.trim();

  if (!email || !senha) {
    alert("Preencha email e senha");
    return;
  }

  const users = getUsers();

  if (users.some(u => u.email === email)) {
    alert("Usuário já existe");
    return;
  }

  users.push({ email, senha });
  saveUsers(users);

  alert("Conta criada!");
};

btnLogout.onclick = function () {
  localStorage.removeItem("usuario_logado");
  location.reload();
};

/* ================= MÊS / ANO ================= */

function initMonthYear() {
  monthSel.innerHTML = months
    .map((m, i) => `<option value="${i}">${m}</option>`)
    .join("");

  const currentYear = new Date().getFullYear();
  yearSel.innerHTML = "";

  for (let i = currentYear - 5; i <= currentYear + 5; i++) {
    yearSel.innerHTML += `<option value="${i}">${i}</option>`;
  }

  monthSel.value = state.selected.month;
  yearSel.value = state.selected.year;

  monthSel.onchange = () => {
    state.selected.month = Number(monthSel.value);
    save();
    render();
  };

  yearSel.onchange = () => {
    state.selected.year = Number(yearSel.value);
    save();
    render();
  };
}

/* ================= RECORRÊNCIA ANUAL ================= */

function aplicarRecorrencia() {
  const anoAtual = state.selected.year;

  const bases = [];

  for (let m = 0; m < 12; m++) {
    const bucket = ensureBucket(m, anoAtual);

    bucket.incomes.forEach(inc => {
      if (inc.recorrente && inc.origemId) {
        const jaExisteNaBase = bases.some(x => x.origemId === inc.origemId);

        if (!jaExisteNaBase) {
          bases.push({
            origemId: inc.origemId,
            name: inc.name,
            value: inc.value,
            mesInicio: inc.mesInicio ?? 0,
            anoInicio: inc.anoInicio ?? anoAtual
          });
        }
      }
    });
  }

  bases.forEach(base => {
    if (base.anoInicio !== anoAtual) return;

    for (let m = base.mesInicio; m < 12; m++) {
      const bucket = ensureBucket(m, anoAtual);

      const existe = bucket.incomes.some(x => x.origemId === base.origemId);

      if (!existe) {
        bucket.incomes.push({
          id: uid(),
          origemId: base.origemId,
          name: base.name,
          value: base.value,
          recorrente: true,
          mesInicio: base.mesInicio,
          anoInicio: base.anoInicio,
          createdAt: Date.now()
        });
      }
    }
  });
}

/* ================= RECEITAS ================= */

btnAddIncome.onclick = () => {
  const bucket = ensureBucket();
  const name = incName.value.trim() || "Salário";
  const value = Number(incValue.value);

  if (!value || value <= 0) {
    alert("Valor inválido.");
    return;
  }

  const origemId = uid();

  bucket.incomes.push({
    id: uid(),
    origemId,
    name,
    value,
    recorrente: true,
    mesInicio: state.selected.month,
    anoInicio: state.selected.year,
    createdAt: Date.now()
  });

  incName.value = "";
  incValue.value = "";

  save();
  render();
};

function removeIncome(id) {
  const bucket = ensureBucket();
  bucket.incomes = bucket.incomes.filter(x => x.id !== id);
  save();
  render();
}

function removeIncomeGlobal(origemId) {
  if (!confirm("Deseja excluir este salário em TODOS os meses?")) return;

  Object.keys(state.data).forEach(k => {
    state.data[k].incomes = state.data[k].incomes.filter(
      i => i.origemId !== origemId
    );
  });

  save();
  render();
}

/* ================= DESPESAS ================= */

if (expParcelado && expParcelas) {
  expParcelado.addEventListener("change", () => {
    expParcelas.style.display = expParcelado.checked ? "block" : "none";
  });
}

btnAddExpense.onclick = () => {
  const name = expName.value.trim() || "Conta";
  const valor = Number(expValue.value);

  if (!valor || valor <= 0) {
    alert("Valor inválido.");
    return;
  }

  const category = expCat.value;
  const parcelado = expParcelado.checked;
  const parcelas = Number(expParcelas.value || 0);

 if (parcelado) {
  if (parcelas < 2) {
    alert("Mínimo 2 parcelas.");
    return;
  }

  for (let i = 0; i < parcelas; i++) {
    let mes = state.selected.month + i;
    let ano = state.selected.year;

    while (mes > 11) {
      mes -= 12;
      ano++;
    }

    const bucket = ensureBucket(mes, ano);

    bucket.expenses.push({
      id: uid(),
      name,
      category,
      value: valor, // mantém o valor cheio em todas as parcelas
      parcelas,
      parcelaAtual: i + 1,
      paid: false,
      createdAt: Date.now()
    });
  }
} else {
    const bucket = ensureBucket();

    bucket.expenses.push({
      id: uid(),
      name,
      category,
      value: valor,
      paid: false,
      createdAt: Date.now()
    });
  }

  expName.value = "";
  expValue.value = "";
  expParcelado.checked = false;
  expParcelas.value = "";
  expParcelas.style.display = "none";

  save();
  render();
};

function togglePaid(id) {
  const bucket = ensureBucket();
  const item = bucket.expenses.find(x => x.id === id);

  if (item) {
    item.paid = !item.paid;
    save();
    render();
  }
}

function removeExpense(id) {
  const bucket = ensureBucket();
  bucket.expenses = bucket.expenses.filter(x => x.id !== id);
  save();
  render();
}

/* ================= CÁLCULO ================= */

function compute() {
  const bucket = ensureBucket();
  const totalInc = bucket.incomes.reduce((a, b) => a + b.value, 0);
  const totalExp = bucket.expenses.reduce((a, b) => a + b.value, 0);
  const paid = bucket.expenses
    .filter(x => x.paid)
    .reduce((a, b) => a + b.value, 0);

  return {
    totalInc,
    totalExp,
    paid,
    pending: totalExp - paid,
    saldo: totalInc - totalExp
  };
}

/* ================= RENDER ================= */

function renderKPIs() {
  const { totalInc, totalExp, paid, pending, saldo } = compute();

  kpiReceitas.textContent = fmt(totalInc);
  kpiDespesas.textContent = fmt(totalExp);
  kpiPago.textContent = fmt(paid);
  kpiFalta.textContent = fmt(pending);
  kpiSaldo.textContent = fmt(saldo);
}

function renderReceitas() {
  const bucket = ensureBucket();

  listReceitas.innerHTML = "";
  emptyReceitas.style.display = bucket.incomes.length === 0 ? "block" : "none";

  bucket.incomes.forEach(r => {
    const div = document.createElement("div");
    div.className = "item";

    div.innerHTML = `
      <div class="title">
        <strong>${r.name}</strong>
        <div class="meta">
          <span class="chip good">Recorrente</span>
        </div>
      </div>
      <div class="money">${fmt(r.value)}</div>
      <div></div>
      <div class="actions">
        <button class="btn secondary" data-origem="${r.origemId}" data-action="remove-income-global">
          Excluir todos os meses
        </button>
      </div>
    `;

    listReceitas.appendChild(div);
  });

  listReceitas.querySelectorAll('[data-action="remove-income"]').forEach(btn => {
    btn.onclick = () => removeIncome(btn.dataset.id);
  });

  listReceitas.querySelectorAll('[data-action="remove-income-global"]').forEach(btn => {
    btn.onclick = () => removeIncomeGlobal(btn.dataset.origem);
  });
}

function renderList() {
  const bucket = ensureBucket();

  listContas.innerHTML = "";

  let despesas = bucket.expenses;

  if (state.viewCat === "FIXA") {
    despesas = despesas.filter(x => x.category === "FIXA");
  }

  if (state.viewCat === "CASA") {
    despesas = despesas.filter(x => x.category === "CASA");
  }

  if (state.viewCat === "DIVERSOS") {
    despesas = despesas.filter(x => x.category === "DIVERSOS");
  }

  if (state.viewCat === "PENDENTE") {
    despesas = despesas.filter(x => !x.paid);
  }

  if (state.viewCat === "PAGO") {
    despesas = despesas.filter(x => x.paid);
  }

  emptyContas.style.display = despesas.length === 0 ? "block" : "none";

  despesas.forEach(c => {
    const div = document.createElement("div");
    div.className = "item";

    const parcelaChip = c.parcelas
      ? `<span class="chip bad">${c.parcelaAtual}/${c.parcelas}</span>`
      : "";

    div.innerHTML = `
      <div class="title">
        <strong>${c.name}</strong>
        <div class="meta">
          <span class="chip ${c.paid ? "good" : "warn"}">${c.paid ? "Pago" : "Pendente"}</span>
          ${parcelaChip}
        </div>
      </div>
      <div class="money">${fmt(c.value)}</div>
      <div class="actions">
        <button class="btn" data-id="${c.id}" data-action="toggle-paid">
          ${c.paid ? "Marcar pendente" : "Marcar pago"}
        </button>
      </div>
      <div class="actions">
        <button class="btn danger" data-id="${c.id}" data-action="remove-expense">Excluir</button>
      </div>
    `;

    listContas.appendChild(div);
  });

  listContas.querySelectorAll('[data-action="toggle-paid"]').forEach(btn => {
    btn.onclick = () => togglePaid(btn.dataset.id);
  });

  listContas.querySelectorAll('[data-action="remove-expense"]').forEach(btn => {
    btn.onclick = () => removeExpense(btn.dataset.id);
  });
}

/* ================= GRÁFICO ================= */

/* ================= GRÁFICO ================= */

let chartSaldo = null;

function renderChartAno(){

  const ctx = document.getElementById("chartSaldoAno");
  if(!ctx || typeof Chart === "undefined") return;

  const ano = state.selected.year;
  const saldos = [];

  let saldoAno = 0;

  for(let m=0;m<12;m++){

    const bucket = state.data[keyMY(m,ano)] || {incomes:[],expenses:[]};

    const receitas = bucket.incomes.reduce((a,b)=>a+b.value,0);
    const despesas = bucket.expenses.reduce((a,b)=>a+b.value,0);

    const saldoMes = receitas - despesas;

    saldos.push(saldoMes);

    saldoAno += saldoMes;

  }

  const saldoAnoEl = document.getElementById("saldoAno");
  if(saldoAnoEl){
    saldoAnoEl.textContent = fmt(saldoAno);
  }

  if(chartSaldo){
    chartSaldo.destroy();
  }

  chartSaldo = new Chart(ctx,{
    type:"line",
    data:{
      labels:months,
      datasets:[{
        label:"Saldo mensal",
        data:saldos,
        tension:0.3,
        fill:true
      }]
    },
    options:{
      responsive:true,
      plugins:{
        legend:{display:true}
      }
    }
  });

}

/* ================= PDF ================= */

btnPDF.onclick = function () {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const bucket = ensureBucket();
  const { totalInc, totalExp, paid, pending, saldo } = compute();

  let y = 20;
  const mes = months[state.selected.month];
  const ano = state.selected.year;

  doc.setFontSize(18);
  doc.text("Relatório Financeiro", 20, y);

  y += 10;
  doc.setFontSize(12);
  doc.text(`Mês: ${mes} / ${ano}`, 20, y);

  y += 10;
  doc.text(`Total Receitas: ${fmt(totalInc)}`, 20, y);
  y += 7;
  doc.text(`Total Despesas: ${fmt(totalExp)}`, 20, y);
  y += 7;
  doc.text(`Pago: ${fmt(paid)}`, 20, y);
  y += 7;
  doc.text(`Falta pagar: ${fmt(pending)}`, 20, y);
  y += 7;
  doc.text(`Saldo: ${fmt(saldo)}`, 20, y);

  y += 12;
  doc.setFontSize(14);
  doc.text("Receitas", 20, y);

  y += 8;
  bucket.incomes.forEach(r => {
    doc.setFontSize(11);
    doc.text(`${r.name} - ${fmt(r.value)}`, 20, y);
    y += 6;
  });

  y += 8;
  doc.setFontSize(14);
  doc.text("Despesas", 20, y);

  y += 8;
  bucket.expenses.forEach(e => {
    const status = e.paid ? "Pago" : "Pendente";
    const parcela = e.parcelas ? ` (${e.parcelaAtual}/${e.parcelas})` : "";

    doc.setFontSize(11);
    doc.text(`${e.name}${parcela} - ${fmt(e.value)} - ${status}`, 20, y);
    y += 6;

    if (y > 270) {
      doc.addPage();
      y = 20;
    }
  });

  doc.save(`financas_${mes}_${ano}.pdf`);
};

/* ================= RENDER FINAL ================= */

function render() {
  aplicarRecorrencia();
  renderKPIs();
  renderReceitas();
  renderList();
  renderChartAno();
}

/* ================= INIT ================= */

window.addEventListener("DOMContentLoaded", () => {
  checkLogin();
  load();
  initMonthYear();
  ensureBucket();
  render();
});
/* ================= MINIMIZAR SEÇÕES ================= */

document.querySelectorAll(".toggle").forEach(header=>{

  header.style.cursor="pointer";

  header.onclick=()=>{

    const target = document.getElementById(header.dataset.target);

    if(!target) return;

    if(target.style.display==="none"){
      target.style.display="block";
    }else{
      target.style.display="none";
    }

  };

});
