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
getDoc,
onSnapshot,
enableIndexedDbPersistence
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

const firebaseConfig = {
apiKey:"AIzaSyCr_6mww70fRdSRXVgApPSgDMs1myRLRSg",
authDomain:"financasmensaispaulods.firebaseapp.com",
projectId:"financasmensaispaulods",
storageBucket:"financasmensaispaulods.firebasestorage.app",
messagingSenderId:"168499253940",
appId:"1:168499253940:web:8d14795ad8195858283de1"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

enableIndexedDbPersistence(db).catch(()=>{});

/* ================= ELEMENTOS ================= */

const loginScreen=document.getElementById("loginScreen");
const loginEmail=document.getElementById("loginEmail");
const loginSenha=document.getElementById("loginSenha");

const btnLogin=document.getElementById("btnLogin");
const btnCadastro=document.getElementById("btnCadastro");
const btnLogout=document.getElementById("btnLogout");

const btnAddIncome=document.getElementById("btnAddIncome");
const btnAddExpense=document.getElementById("btnAddExpense");

const incName=document.getElementById("incName");
const incValue=document.getElementById("incValue");

const expName=document.getElementById("expName");
const expValue=document.getElementById("expValue");
const expCat=document.getElementById("expCat");
const expParcelado=document.getElementById("expParcelado");
const expParcelas=document.getElementById("expParcelas");

const listReceitas=document.getElementById("listReceitas");
const listContas=document.getElementById("listContas");

const emptyReceitas=document.getElementById("emptyReceitas");
const emptyContas=document.getElementById("emptyContas");

const kpiReceitas=document.getElementById("kpiReceitas");
const kpiDespesas=document.getElementById("kpiDespesas");
const kpiPago=document.getElementById("kpiPago");
const kpiFalta=document.getElementById("kpiFalta");
const kpiSaldo=document.getElementById("kpiSaldo");

const monthSel=document.getElementById("month");
const yearSel=document.getElementById("year");
const btnPDF=document.getElementById("btnPDF");

const tabs=document.querySelectorAll(".tab");

/* ================= UTIL ================= */

const fmt=(n)=>(Number(n)||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const uid=()=>Math.random().toString(36).slice(2,10);

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

let chartSaldo=null;
let unsubscribeUserData=null;
let isApplyingRemoteState=false;

/* ================= TABS ================= */

tabs.forEach(tab=>{
tab.onclick=()=>{
tabs.forEach(t=>t.classList.remove("active"));
tab.classList.add("active");
state.viewCat=tab.dataset.cat;
render();
};
});

/* ================= STORAGE ================= */

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

async function save(){

if(isApplyingRemoteState) return;

const user=auth.currentUser;
if(!user) return;

const payload={
viewCat:state.viewCat,
selected:state.selected,
data:state.data,
updatedAt:Date.now()
};

await setDoc(doc(db,"usuarios",user.uid),payload);

localStorage.setItem(
`backup_financas_${user.uid}`,
JSON.stringify(payload)
);

}

async function load(){

const user=auth.currentUser;
if(!user) return;

const ref=doc(db,"usuarios",user.uid);
const snap=await getDoc(ref);

if(snap.exists()){

const saved=snap.data();

state.viewCat=saved.viewCat??state.viewCat;
state.selected=saved.selected??state.selected;
state.data=saved.data??{};

return;
}

const backupLocal=localStorage.getItem(`backup_financas_${user.uid}`);

if(backupLocal){

const saved=JSON.parse(backupLocal);

state.viewCat=saved.viewCat??state.viewCat;
state.selected=saved.selected??state.selected;
state.data=saved.data??{};
}

}

/* ================= LOGIN ================= */

btnLogin.onclick=async()=>{

const email=loginEmail.value.trim();
const senha=loginSenha.value.trim();

try{

await signInWithEmailAndPassword(auth,email,senha);

}catch(e){

alert("Email ou senha inválidos");

}

};

btnCadastro.onclick=async()=>{

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

btnLogout.onclick=async()=>{

if(unsubscribeUserData) unsubscribeUserData();

await signOut(auth);

};

onAuthStateChanged(auth,async(user)=>{

if(user){

loginScreen.style.display="none";

await load();

render();

}else{

loginScreen.style.display="flex";

}

});

/* ================= RECEITAS ================= */

btnAddIncome.onclick=async()=>{

const bucket=ensureBucket();

const name=incName.value.trim()||"Salário";
const value=Number(incValue.value);

if(!value||value<=0){

alert("Valor inválido");
return;

}

const origemId=uid();

bucket.incomes.push({

id:uid(),
origemId,
name,
value,
recorrente:true,
mesInicio:state.selected.month,
anoInicio:state.selected.year,
createdAt:Date.now()

});

incName.value="";
incValue.value="";

render();
await save();

};

function removeIncomeGlobal(origemId){

Object.keys(state.data).forEach(k=>{

state.data[k].incomes=
state.data[k].incomes.filter(i=>i.origemId!==origemId);

});

render();

}

/* ================= DESPESAS ================= */

btnAddExpense.onclick=async()=>{

const name=expName.value.trim()||"Conta";
const valor=Number(expValue.value);

if(!valor||valor<=0){

alert("Valor inválido");
return;

}

const category=expCat.value;
const parcelado=expParcelado.checked;
const parcelas=Number(expParcelas.value||0);

const origemId=uid();

if(parcelado){

for(let i=0;i<parcelas;i++){

let mes=state.selected.month+i;
let ano=state.selected.year;

while(mes>11){

mes-=12;
ano++;

}

const bucket=ensureBucket(mes,ano);

bucket.expenses.push({

id:uid(),
origemId,
name,
category,
value:valor,
parcelas,
parcelaAtual:i+1,
paid:false,
createdAt:Date.now()

});

}

}else{

const bucket=ensureBucket();

bucket.expenses.push({

id:uid(),
origemId,
name,
category,
value:valor,
paid:false,
createdAt:Date.now()

});

}

render();
await save();

};

/* ================= EXCLUIR GLOBAL ================= */

function removeExpenseGlobal(origemId){

Object.keys(state.data).forEach(k=>{

state.data[k].expenses=
state.data[k].expenses.filter(e=>e.origemId!==origemId);

});

render();

}

/* ================= RENDER ================= */

function render(){

renderKPIs();
renderReceitas();
renderList();

if(!isApplyingRemoteState) save();

}
