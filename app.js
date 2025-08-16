// Simple SPA for sports matchmaking & group-buy
const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];

const storeKey = 'sports_events_v1';

const sampleEvents = [
  {
    id: crypto.randomUUID(),
    title: "籃球 5v5 友誼賽",
    sport: "籃球",
    date: dateShift(2),
    startTime: "19:00",
    endTime: "21:00",
    location: "台北市信義區",
    venue: "信義國中 體育館 A 場",
    fee: "TWD 2400（場租均分）",
    equipment: "室內鞋、自備毛巾",
    indoorOutdoor: "室內",
    referrer: "阿明",
    mode: "隊伍配對",
    capacity: 10,
    teamSize: 5,
    minGroupSize: 0,
    normalPrice: 0,
    groupPrice: 0,
    notes: "友誼為主，球衣深淺自備。",
    participants: [
      { type: "隊伍", name: "藍隊", size: 5 },
      { type: "隊伍", name: "白隊", size: 5 }
    ]
  },
  {
    id: crypto.randomUUID(),
    title: "羽球雙打 個人配對夜場",
    sport: "羽球",
    date: dateShift(5),
    startTime: "20:00",
    endTime: "22:00",
    location: "新北市板橋區",
    venue: "板橋體育館 B2-3 號場",
    fee: "TWD 120 / 人",
    equipment: "室內鞋、自備球拍，羽毛球主辦提供",
    indoorOutdoor: "室內",
    referrer: "社群：羽球一起打",
    mode: "個人配對",
    capacity: 8,
    teamSize: 2,
    minGroupSize: 0,
    normalPrice: 0,
    groupPrice: 0,
    notes: "程度中階以上，現場輪轉配對。",
    participants: [
      { type: "個人", name: "小謙", size: 1 },
      { type: "個人", name: "Miya", size: 1 }
    ]
  },
  {
    id: crypto.randomUUID(),
    title: "初階游泳班（拼團越多人越便宜）",
    sport: "游泳",
    date: dateShift(10),
    startTime: "10:00",
    endTime: "11:30",
    location: "香港九龍灣",
    venue: "九龍灣游泳池",
    fee: "HKD 300 / 人（達標優惠：HKD 240）",
    equipment: "泳帽、護目鏡",
    indoorOutdoor: "室內",
    referrer: "教練 Yuki",
    mode: "課程/活動",
    capacity: 12,
    teamSize: 1,
    minGroupSize: 8,
    normalPrice: 300,
    groupPrice: 240,
    notes: "8 人成團即享團購價；不足 8 人以原價計。",
    participants: [
      { type: "個人", name: "Ken", size: 1 },
      { type: "個人", name: "Ivy", size: 1 },
      { type: "個人", name: "Louis", size: 1 }
    ]
  },
  {
    id: crypto.randomUUID(),
    title: "七人制足球 7v7 戶外草地",
    sport: "足球",
    date: dateShift(7),
    startTime: "18:30",
    endTime: "20:30",
    location: "新界沙田",
    venue: "沙田大圍運動場 2 號場",
    fee: "HKD 160 / 人（場租）",
    equipment: "碎釘鞋、護脛",
    indoorOutdoor: "室外",
    referrer: "主辦：Shatin Football",
    mode: "個人配對",
    capacity: 16,
    teamSize: 7,
    minGroupSize: 0,
    normalPrice: 160,
    groupPrice: 160,
    notes: "若雨天視場地公告決定。",
    participants: []
  }
];

function dateShift(days=0) {
  const d = new Date();
  d.setDate(d.getDate()+days);
  return d.toISOString().slice(0,10);
}

function loadEvents() {
  try {
    const raw = localStorage.getItem(storeKey);
    if (!raw) return sampleEvents;
    const parsed = JSON.parse(raw);
    // guard against schema changes
    return Array.isArray(parsed) ? parsed : sampleEvents;
  } catch {
    return sampleEvents;
  }
}

function saveEvents(list) {
  localStorage.setItem(storeKey, JSON.stringify(list));
}

function formatTimeRange(s,e){ return `${s}–${e}`; }

function render() {
  const list = loadEvents();
  const filtered = applyFilters(list);
  const wrap = $("#eventList");
  wrap.innerHTML = "";
  if (!filtered.length) { $("#emptyHint").style.display = "block"; return; }
  $("#emptyHint").style.display = "none";

  for (const ev of filtered) {
    const filled = totalJoined(ev);
    const card = document.createElement("article");
    card.className = "card event-card";
    card.innerHTML = `
      <span class="badge">${ev.indoorOutdoor}</span>
      <div class="content">
        <h3>${escapeHTML(ev.title)}</h3>
        <div class="kpis">
          <span class="chip">運動：${escapeHTML(ev.sport)}</span>
          <span class="chip">模式：${escapeHTML(ev.mode)}</span>
          <span class="chip">人數：${filled}/${ev.capacity}</span>
        </div>
        <div class="meta">
          <div class="row">📅 ${ev.date} · 🕒 ${formatTimeRange(ev.startTime, ev.endTime)}</div>
          <div class="row">📍 ${escapeHTML(ev.location)} · ${escapeHTML(ev.venue||"")}</div>
          <div class="row">💸 ${escapeHTML(ev.fee||"")}</div>
          <div class="row">🧰 ${escapeHTML(ev.equipment||"無")}</div>
          <div class="row">👤 介紹人：${escapeHTML(ev.referrer||"")}</div>
        </div>
        <div class="view-actions">
          <button class="primary" data-view="${ev.id}">查看 / 報名</button>
          <button class="secondary" data-edit="${ev.id}">編輯</button>
        </div>
      </div>
    `;
    wrap.appendChild(card);
  }

  // bind buttons
  $$("button[data-view]").forEach(b => b.onclick = () => openView(b.dataset.view));
  $$("button[data-edit]").forEach(b => b.onclick = () => openDialogForEdit(b.dataset.edit));
}

function totalJoined(ev) {
  return (ev.participants||[]).reduce((a,p)=>a+(p.size||1),0);
}

function applyFilters(list) {
  const kw = $("#fKeyword").value.trim().toLowerCase();
  const indoor = $("#fIndoor").value;
  const mode = $("#fMode").value;
  const dFrom = $("#fDateFrom").value;
  const dTo = $("#fDateTo").value;

  return list.filter(ev => {
    if (kw) {
      const blob = [ev.title, ev.sport, ev.location, ev.venue].join(" ").toLowerCase();
      if (!blob.includes(kw)) return false;
    }
    if (indoor && ev.indoorOutdoor !== indoor) return false;
    if (mode && ev.mode !== mode) return false;
    if (dFrom && ev.date < dFrom) return false;
    if (dTo && ev.date > dTo) return false;
    return true;
  });
}

// Create/Edit dialog
const dlg = $("#eventDialog");
const form = $("#eventForm");
const btnCreate = $("#btnCreateEvent");
const btnDelete = $("#btnDeleteEvent");
const btnSave = $("#btnSaveEvent");
const btnExport = $("#btnExport");

btnCreate.onclick = () => openDialogForCreate();
btnExport.onclick = () => exportData();

function openDialogForCreate(){
  $("#dialogTitle").textContent = "建立活動";
  form.reset();
  form.id.value = "";
  btnDelete.style.display = "none";
  dlg.showModal();
}

function openDialogForEdit(id){
  const list = loadEvents();
  const ev = list.find(x=>x.id===id);
  if (!ev) return;
  $("#dialogTitle").textContent = "編輯活動";
  for (const [k,v] of Object.entries(ev)) {
    if (form[k] !== undefined && k !== "participants") form[k].value = v ?? "";
  }
  btnDelete.style.display = "inline-block";
  dlg.showModal();
}

btnDelete.onclick = () => {
  const id = form.id.value;
  const list = loadEvents().filter(x=>x.id!==id);
  saveEvents(list);
  dlg.close();
  render();
};

form.onsubmit = (e) => {
  e.preventDefault();
  const fd = new FormData(form);
  const data = Object.fromEntries(fd.entries());
  // normalize types
  data.capacity = Number(data.capacity||0);
  data.teamSize = Number(data.teamSize||0);
  data.minGroupSize = Number(data.minGroupSize||0);
  data.normalPrice = Number(data.normalPrice||0);
  data.groupPrice = Number(data.groupPrice||0);

  let list = loadEvents();
  if (data.id) {
    // update
    const i = list.findIndex(x=>x.id===data.id);
    if (i>=0){
      list[i] = { ...list[i], ...data };
    }
  } else {
    data.id = crypto.randomUUID();
    data.participants = [];
    list.unshift(data);
  }
  saveEvents(list);
  dlg.close();
  render();
};

// View / Join
const viewDlg = $("#viewDialog");
const viewContent = $("#viewContent");
$("#btnCloseView").onclick = () => viewDlg.close();

function openView(id){
  const list = loadEvents();
  const ev = list.find(x=>x.id===id);
  if (!ev) return;
  const joined = totalJoined(ev);
  const left = Math.max(0, (ev.capacity||0) - joined);
  const groupProgress = ev.minGroupSize ? Math.min(100, Math.round((joined/ev.minGroupSize)*100)) : 0;
  const groupInfo = ev.minGroupSize && ev.groupPrice && ev.normalPrice ?
    `<div>📣 拼團門檻：${ev.minGroupSize} 人；目前 <b>${joined}</b> 人，進度 <b>${groupProgress}%</b></div>
     <div>💰 價格：原價 <b>${ev.normalPrice}</b>，拼團價 <b>${ev.groupPrice}</b>（達標後生效）</div>` : `<div class="muted">本活動無拼團設定</div>`;

  const participants = (ev.participants||[]).map(p=>`${p.type}：${escapeHTML(p.name)} × ${p.size}`).join("、") || "（尚無）";

  viewContent.innerHTML = `
    <h3>${escapeHTML(ev.title)}</h3>
    <div class="view-kpis">
      <span class="chip">運動：${escapeHTML(ev.sport)}</span>
      <span class="chip">模式：${escapeHTML(ev.mode)}</span>
      <span class="chip">室內/室外：${escapeHTML(ev.indoorOutdoor)}</span>
      <span class="chip">總人數：${joined}/${ev.capacity}</span>
    </div>
    <div class="view-section">📅 ${ev.date} · 🕒 ${ev.startTime}–${ev.endTime}</div>
    <div class="view-section">📍 ${escapeHTML(ev.location)} · ${escapeHTML(ev.venue||"")}</div>
    <div class="view-section">💸 ${escapeHTML(ev.fee||"")}</div>
    <div class="view-section">🧰 ${escapeHTML(ev.equipment||"無")}</div>
    <div class="view-section">👤 介紹人：${escapeHTML(ev.referrer||"")}</div>
    <div class="view-section">📝 備註：${escapeHTML(ev.notes||"無")}</div>
    <div class="view-section">
      ${groupInfo}
      <div class="progress" aria-label="拼團進度"><span style="width:${groupProgress}%;"></span></div>
    </div>
    <div class="view-section">目前報名：${participants}</div>
    <div class="view-actions">
      <button class="primary" id="joinInd">我要以個人參加</button>
      <button class="secondary" id="joinTeam">我要以隊伍參加</button>
      <button class="secondary" id="copyLink">複製活動資料</button>
    </div>
  `;

  // Bind join buttons
  $("#joinInd", viewContent).onclick = () => promptJoin(ev.id, "個人");
  $("#joinTeam", viewContent).onclick = () => promptJoin(ev.id, "隊伍");
  $("#copyLink", viewContent).onclick = () => copyEventText(ev);

  viewDlg.showModal();
}

function promptJoin(id, type){
  const name = prompt(type === "個人" ? "請輸入你的名字：" : "請輸入隊伍名稱：");
  if (!name) return;
  let size = 1;
  const list = loadEvents();
  const ev = list.find(x=>x.id===id);
  if (!ev) return;

  if (type==="隊伍"){
    const n = parseInt(prompt("請輸入隊伍人數（例如 5）：")||"0", 10);
    if (isNaN(n) || n<=0) return alert("隊伍人數不正確。");
    size = n;
  }

  const joined = totalJoined(ev);
  if (joined + size > ev.capacity) return alert("超過人數上限，無法加入。");

  ev.participants = ev.participants || [];
  ev.participants.push({ type, name, size });
  saveEvents(list);
  openView(id); // refresh
  render();
}

function copyEventText(ev){
  const text = [
    `活動：${ev.title}`,
    `運動：${ev.sport}；模式：${ev.mode}；${ev.indoorOutdoor}`,
    `日期時間：${ev.date} ${ev.startTime}–${ev.endTime}`,
    `地點：${ev.location} ${ev.venue||""}`,
    `費用：${ev.fee||"-"}`,
    `裝備：${ev.equipment||"-"}`,
    `介紹人：${ev.referrer||"-"}`,
    ev.minGroupSize?`拼團門檻：${ev.minGroupSize}；原價/團購價：${ev.normalPrice}/${ev.groupPrice}`:"",
    `備註：${ev.notes||"-"}`
  ].filter(Boolean).join("\n");
  navigator.clipboard.writeText(text).then(()=> alert("已複製活動資訊！"));
}

// Filters
$("#btnClearFilters").onclick = () => {
  $("#fKeyword").value = "";
  $("#fIndoor").value = "";
  $("#fMode").value = "";
  $("#fDateFrom").value = "";
  $("#fDateTo").value = "";
  render();
};
["fKeyword","fIndoor","fMode","fDateFrom","fDateTo"].forEach(id => {
  $("#" + id).addEventListener("input", render);
  $("#" + id).addEventListener("change", render);
});

// Theme toggle (persist via localStorage)
const themeKey = "site_theme_light";
const themeToggle = $("#toggleTheme");
function applyTheme() {
  const light = localStorage.getItem(themeKey)==="1";
  document.documentElement.classList.toggle("light", light);
  themeToggle.checked = light;
}
themeToggle.onchange = () => {
  localStorage.setItem(themeKey, themeToggle.checked ? "1" : "0");
  applyTheme();
};

// Export JSON
function exportData(){
  const data = loadEvents();
  const blob = new Blob([JSON.stringify(data, null, 2)], {type: "application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "events-export.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Helpers
function escapeHTML(str=""){
  return str.replace(/[&<>"']/g, s => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"
  })[s] || s);
}

$("#year").textContent = new Date().getFullYear();
applyTheme();
render();
