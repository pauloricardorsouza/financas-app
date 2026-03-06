/* ================= FIREBASE ================= */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";

import {
getAuth,
signInWithEmailAndPassword,
createUserWithEmailAndPassword,
onAuthStateChanged,
signOut
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

import {
getFirestore,
doc,
setDoc,
getDoc
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

const firebaseConfig = {
apiKey: "AIzaSyCr_6mww70fRdSRXVgApPSgDMs1myRLRSg",
authDomain: "financasmensaispaulods.firebaseapp.com",
projectId: "financasmensaispaulods",
storageBucket: "financasmensaispaulods.firebasestorage.app",
messagingSenderId: "168499253940",
appId: "1:168499253940:web:8d14795ad8195858283de1"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

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

const fmt = (n)=> (Number(n)||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const uid = ()=> Math.random().toString(36).slice(2,10);

const months=[
"Janeiro","Fevereiro","Março","Abril","Maio","Junho",
"Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"
];

const state={
viewCat:"ALL",
selected:{
month:new Date().getMonth(),
year:new Date().getFullYear()
},
data:{}
};

/* ================= STORAGE FIRESTORE ================= */

async function save(){

const user=auth.currentUser;
if(!user) return;

await setDoc(
doc(db,"usuarios",user.uid),
state
);

}

async function load(){

const user=auth.currentUser;
if(!user) return;

const ref=doc(db,"usuarios",user.uid);
const snap=await getDoc(ref);

if(!snap.exists()) return;

const saved=snap.data();

state.viewCat=saved.viewCat ?? state.viewCat;
state.selected=saved.selected ?? state.selected;
state.data=saved.data ?? {};

}

/* ================= LOGIN ================= */

btnLogin.onclick=async function(){

const email=loginEmail.value.trim();
const senha=loginSenha.value.trim();

try{

await signInWithEmailAndPassword(auth,email,senha);

await load();
render();

loginScreen.style.display="none";

}catch(e){

alert("Email ou senha inválidos");

}

};

btnCadastro.onclick=async function(){

const email=loginEmail.value.trim();
const senha=loginSenha.value.trim();

if(!email||!senha){
alert("Digite email e senha");
return;
}

try{

await createUserWithEmailAndPassword(auth,email,senha);

alert("Conta criada");

}catch(e){

alert(e.message);

}

};

btnLogout.onclick=async function(){

await signOut(auth);

};

/* ================= SESSÃO ================= */

onAuthStateChanged(auth,async(user)=>{

if(user){

loginScreen.style.display="none";

await load();
render();

}else{

loginScreen.style.display="flex";

}

});

/* ================= STORAGE LOCAL ================= */

function keyMY(m,y){
return `${y}-${String(m+1).padStart(2,"0")}`;
}

function ensureBucket(m=state.selected.month,y=state.selected.year){

const k=keyMY(m,y);

if(!state.data[k]){
state.data[k]={incomes:[],expenses:[]};
}

return state.data[k];

}

/* ================= RECEITAS ================= */

btnAddIncome.onclick=()=>{

const bucket=ensureBucket();

const name=incName.value.trim()||"Salário";
const value=Number(incValue.value);

if(!value||value<=0){
alert("Valor inválido");
return;
}

bucket.incomes.push({
id:uid(),
name,
value,
createdAt:Date.now()
});

incName.value="";
incValue.value="";

save();
render();

};

/* ================= DESPESAS ================= */

btnAddExpense.onclick=()=>{

const bucket=ensureBucket();

const name=expName.value.trim()||"Conta";
const value=Number(expValue.value);

if(!value||value<=0){
alert("Valor inválido");
return;
}

bucket.expenses.push({
id:uid(),
name,
category:expCat.value,
value,
paid:false,
createdAt:Date.now()
});

expName.value="";
expValue.value="";

save();
render();

};

/* ================= CÁLCULO ================= */

function compute(){

const bucket=ensureBucket();

const totalInc=bucket.incomes.reduce((a,b)=>a+b.value,0);
const totalExp=bucket.expenses.reduce((a,b)=>a+b.value,0);

return{
totalInc,
totalExp,
saldo:totalInc-totalExp
};

}

/* ================= RENDER ================= */

function renderKPIs(){

const {totalInc,totalExp,saldo}=compute();

kpiReceitas.textContent=fmt(totalInc);
kpiDespesas.textContent=fmt(totalExp);
kpiSaldo.textContent=fmt(saldo);

}

/* ================= RENDER ================= */

function render(){

renderKPIs();

}

/* ================= INIT ================= */

window.addEventListener("DOMContentLoaded",()=>{

render();

});