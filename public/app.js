/* ========== DOM 助手 ========= */
const $ = id => document.getElementById(id);
const qs = (sel, ctx=document) => ctx.querySelector(sel);
const qsa = (sel, ctx=document) => [...ctx.querySelectorAll(sel)];

/* ========== 多语言词典 ========= */
const dict = {
    zh:{ bmi:"BMI", bmr:"BMR", tdee:"TDEE", bf:"体脂%", goal:"目标进度", noRecord:"暂无记录",
        export:"导出 CSV", import:"导入 CSV", delConfirm:"确定删除所有记录？", calcBtn:"开始评估",
        cleared:"历史记录已清空", imported:"导入完成!", toLose:"待减", toGain:"待增", reached:"已达成目标！",
        remind:"记得记录体重" },
    en:{ bmi:"BMI", bmr:"BMR", tdee:"TDEE", bf:"Body Fat %", goal:"Goal Progress", noRecord:"No record",
        export:"Export CSV", import:"Import CSV", delConfirm:"Delete all records?", calcBtn:"Evaluate",
        cleared:"History cleared", imported:"Import done!", toLose:"to lose", toGain:"to gain", reached:"Goal reached!",
        remind:"Don't forget to log your weight" }
};
let lang = localStorage.getItem("lang")||"zh";
applyLang();
$("lang-toggle").onclick=()=>{lang=lang==="zh"?"en":"zh";localStorage.setItem("lang",lang);applyLang();};
function applyLang(){
    qs("#bmi-card h2").textContent=dict[lang].bmi;
    qs("#bmr-card h2").textContent=dict[lang].bmr;
    qs("#tdee-card h2").textContent=dict[lang].tdee;
    $("bf-label").textContent=dict[lang].bf;
    $("gw-label").textContent=dict[lang].goal;
    $("export-btn").textContent=dict[lang].export;
    $("import-btn").textContent=dict[lang].import;
    $("no-record").textContent=dict[lang].noRecord;
    qs("button.primary").textContent=dict[lang].calcBtn;
}

/* ========== 主题切换 ========= */
(function initTheme(){
    const dark = localStorage.getItem("theme")==="dark";
    if(dark) document.body.classList.add("dark");
    $("theme-toggle").textContent = dark?"☀️":"🌙";
})();
$("theme-toggle").onclick=()=>{
    document.body.classList.toggle("dark");
    const dark=document.body.classList.contains("dark");
    localStorage.setItem("theme",dark?"dark":"light");
    $("theme-toggle").textContent=dark?"☀️":"🌙";
};

/* ========== 工具函数 ========= */
const bmiCategory=v=>v<18.5?"偏瘦":v<24.9?"正常":v<29.9?"超重":"肥胖";
const adviceMap={
    偏瘦:"增加优质蛋白，每周 3 力量 2 有氧。",
    正常:"维持均衡饮食，每周 150 min 有氧 + 抗阻。",
    超重:"减少精制碳水，热量赤字＋4 有氧 2 力量。",
    肥胖:"低冲击有氧配合营养师指导，循序渐进力量训练。"
};
const fmtDate=ts=>new Date(ts).toLocaleDateString();

/* ========== 页面路由 ========= */
function switchPage(t){qsa(".page").forEach(p=>p.classList.add("hidden"));$(t).classList.remove("hidden");qsa(".nav-list a").forEach(a=>a.classList.toggle("active",a.dataset.target===t));if(t==="history") renderHistory();}
qsa(".nav-list a").forEach(a=>a.onclick=e=>{e.preventDefault();switchPage(a.dataset.target);});

/* ========== 提交表单 ========= */
$("health-form").onsubmit=e=>{
    e.preventDefault();
    const g=$("gender").value, age=+$("age").value, h=+$("height").value, w=+$("weight").value;
    const act=+$("activity").value, goal=+$("goal-weight").value||0;
    const bmi=+(w/((h/100)**2)).toFixed(1);
    const bmr=g==="male"?10*w+6.25*h-5*age+5:10*w+6.25*h-5*age-161;
    const tdee=Math.round(bmr*act);
    const bf=+(1.2*bmi+0.23*age-10.8*(g==="male"?1:0)-5.4).toFixed(1);

    // 更新卡片
    $("bmi-value").textContent=bmi;
    $("bmi-category").textContent=bmiCategory(bmi);
    $("bmr-value").textContent=Math.round(bmr);
    $("tdee-value").textContent=tdee;
    $("bf-value").textContent=bf;
    $("result").classList.remove("hidden");setTimeout(()=>$("result").classList.add("show"),50);

    $("advice-text").textContent=`${lang==="zh"?"您的 BMI 分类为":"Your BMI is"}【${bmiCategory(bmi)}】\n${adviceMap[bmiCategory(bmi)]}`;
    $("advice").classList.remove("hidden");setTimeout(()=>$("advice").classList.add("show"),300);

    // 保存
    const his=JSON.parse(localStorage.getItem("health-history")||"[]");
    his.push({ts:Date.now(),bmi,bf,bmr:Math.round(bmr),tdee,weight:w});
    localStorage.setItem("health-history",JSON.stringify(his));

    updateGoalProgress(w,goal);

    // 首次提示通知
    if(Notification&&Notification.permission==="default") $("notify-hint").classList.remove("hidden");
};

/* ========== 目标进度 ========= */
function updateGoalProgress(current,goal){
    if(!goal){$("goal-card").classList.add("hidden");return;}
    const data=JSON.parse(localStorage.getItem("health-history")||"[]");
    const start=data.length?data[0].weight:current;
    const total=Math.abs(goal-start)||1; // 避免除以 0
    const done=Math.abs(current-start);
    const pct=Math.min(100,Math.round((done/total)*100));
    $("gw-progress").value=pct;
    const diff=goal-current;
    $("gw-text").textContent=diff===0?dict[lang].reached:`${Math.abs(diff).toFixed(1)} kg ${diff<0?dict[lang].toLose:dict[lang].toGain}`;
    $("goal-card").classList.remove("hidden");
}

/* ========== 绘图 ========= */
let chart;
function drawChart(data,goal){
    const ctx=$("bmi-chart").getContext("2d");
    if(chart) chart.destroy();
    if(!data.length){ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);return;}
    const labels=data.map(d=>fmtDate(d.ts));
    const datasets=[
        {label:"BMI",data:data.map(d=>d.bmi),borderWidth:2,tension:.25,pointRadius:3},
        {label:"Weight",data:data.map(d=>d.weight),borderWidth:2,tension:.25,pointRadius:3}
    ];
    if(goal){datasets.push({label:"Goal",data:Array(labels.length).fill(goal),borderDash:[6,4],pointRadius:0,borderWidth:1});}
    chart=new Chart(ctx,{type:"line",data:{labels,datasets},options:{scales:{y:{beginAtZero:false}},plugins:{legend:{display:true}}}});
}

/* ========== 渲染历史 ========= */
function renderHistory(){
    const tbody=qs("#history-table tbody");tbody.innerHTML="";
    const data=JSON.parse(localStorage.getItem("health-history")||"[]");
    $("no-record").style.display=data.length?"none":"block";
    data.forEach((r,i)=>{
        const tr=document.createElement("tr");
        tr.innerHTML=`<td>${fmtDate(r.ts)}</td><td>${r.bmi}</td><td>${r.bf||"--"}</td><td>${r.weight}</td><td>${r.tdee}</td><td><button class="delete-row" data-idx="${i}">×</button></td>`;
        tbody.appendChild(tr);
    });
    qsa(".delete-row").forEach(btn=>btn.onclick=()=>{data.splice(+btn.dataset.idx,1);localStorage.setItem("health-history",JSON.stringify(data));renderHistory();});
    const goal=+$("goal-weight").value||0;
    drawChart(data,goal);
}

/* ========== CSV 导入 / 导出 ========= */
$("export-btn").onclick=()=>{
    const data=JSON.parse(localStorage.getItem("health-history")||"[]");
    if(!data.length) return alert(dict[lang].noRecord);
    const csv="日期,BMI,体脂,体重,TDEE\n"+data.map(d=>`${fmtDate(d.ts)},${d.bmi},${d.bf},${d.weight},${d.tdee}`).join("\n");
    const url=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
    const a=document.createElement("a");a.href=url;a.download="health_history.csv";a.click();URL.revokeObjectURL(url);
};
$("import-btn").onclick=()=>$("import-file").click();
$("import-file").onchange=e=>{
    const file=e.target.files[0];if(!file) return;
    const reader=new FileReader();
    reader.onload=ev=>{
        const lines=ev.target.result.trim().split(/\r?\n/).slice(1);
        const newData=lines.map(l=>{const [date,bmi,bf,weight,tdee]=l.split(",");return{ts:new Date(date).getTime(),bmi:+bmi,bf:+bf,bmr:0,tdee:+tdee,weight:+weight};});
        const old=JSON.parse(localStorage.getItem("health-history")||"[]");
        localStorage.setItem("health-history",JSON.stringify(old.concat(newData)));
        renderHistory();alert(dict[lang].imported);
    };reader.readAsText(file);
};

/* ========== 清空 ========= */
$("clear-btn").onclick=()=>{
    if(!confirm(dict[lang].delConfirm)) return;
    localStorage.removeItem("health-history");alert(dict[lang].cleared);renderHistory();
};

/* ========== 本地通知 ========= */
if("Notification" in window){
    navigator.serviceWorker?.register("sw.js");
    $("notify-hint").onclick=async()=>{
        if(Notification.permission!=="granted"){await Notification.requestPermission();}
        if(Notification.permission==="granted") new Notification(dict[lang].remind,{body:"🏃‍♀️ "+dict[lang].remind,tag:"daily"});
    };
}

/* 默认 */
switchPage("dashboard");