(() => {
  const data = window.ADMISSIONS_DATA;
  if (!data) return;
  const els = {
    keyword: document.querySelector('#keyword'), city: document.querySelector('#cityFilter'), level: document.querySelector('#levelFilter'),
    score: document.querySelector('#scoreFilter'), scoreValue: document.querySelector('#scoreValue'), subject: document.querySelector('#subjectFilter'), category: document.querySelector('#categoryFilter'),
    air: document.querySelector('#airConditioning'), ensuite: document.querySelector('#ensuite'), sort: document.querySelector('#sortBy'), cards: document.querySelector('#cardList'),
    loadMore: document.querySelector('#loadMore'), hint: document.querySelector('#resultHint'), title: document.querySelector('#resultTitle'), active: document.querySelector('#activeFilters'), dialog: document.querySelector('#detailDialog'), detail: document.querySelector('#detailContent'), filters: document.querySelector('#filters')
  };
  const state = { view: 'schools', keyword: '', nature: '', city: '', level: '', minScore: 150, air: false, ensuite: false, subject: '', category: '', sort: 'scoreDesc', visible: 16 };
  const totalMajors = data.schools.reduce((n, school) => n + school.majors.length, 0);
  document.querySelector('#schoolTotal').textContent = data.schools.length;
  document.querySelector('#majorTotal').textContent = totalMajors.toLocaleString();
  const unique = (arr) => [...new Set(arr.filter(Boolean))].sort((a,b) => String(a).localeCompare(String(b), 'zh-CN'));
  const optionize = (el, values) => values.forEach(v => el.insertAdjacentHTML('beforeend', `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`));
  optionize(els.city, unique(data.schools.flatMap(s => String(s['城市']).split('/'))));
  optionize(els.subject, unique(data.schools.flatMap(s => s.majors.map(m => m['选科要求']))));
  optionize(els.category, unique(data.schools.flatMap(s => s.majors.map(m => String(m['专业类别']).replace(/^\//, '')))));

  function escapeHtml(value) { return String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char])); }
  function number(value) { const n = Number(value); return Number.isFinite(n) ? n : 0; }
  function lower(value) { return String(value ?? '').toLowerCase(); }
  function matchesText(items) { if (!state.keyword) return true; const term = lower(state.keyword); return items.some(item => lower(item).includes(term)); }
  function filterSchools() {
    return data.schools.filter(s => {
      const maxScore = number(s['最高分']);
      return matchesText([s['学校名称'],s['城市'],s['性质'],s['标签'],s['学校简介'],...s.majors.map(m => `${m['专业名称']} ${m['专业类别']}`)]) &&
        (!state.nature || s['性质'] === state.nature) && (!state.city || String(s['城市']).includes(state.city)) && (!state.level || s['办学层次'] === state.level) &&
        (state.minScore === 150 || maxScore >= state.minScore) && (!state.air || String(s['空调']).includes('有')) && (!state.ensuite || String(s['宿舍其他']).includes('独卫'));
    });
  }
  function filterMajors() {
    return data.schools.flatMap(s => s.majors.map(m => ({...m, school: s}))).filter(({school:s, ...m}) =>
      matchesText([s['学校名称'],s['城市'],s['性质'],m['专业名称'],m['专业备注'],m['专业类别']]) &&
      (!state.nature || s['性质'] === state.nature) && (!state.city || String(s['城市']).includes(state.city)) && (!state.level || s['办学层次'] === state.level) &&
      (!state.subject || m['选科要求'] === state.subject) && (!state.category || String(m['专业类别']).replace(/^\//,'') === state.category) &&
      (state.minScore === 150 || number(m['最低分']) >= state.minScore));
  }
  function sortRows(rows) {
    const direction = state.sort.endsWith('Asc') ? 1 : -1;
    const key = state.sort.startsWith('major') ? '专业数' : state.sort.startsWith('rate') ? '专升本率(%)' : '最低分';
    return rows.sort((a,b) => direction * (number(a[key] ?? a.school?.[key]) - number(b[key] ?? b.school?.[key])));
  }
  function badge(s) { return `<span class="badge ${s['性质'] === '民办' ? 'private' : ''}">${escapeHtml(s['性质'])}</span>`; }
  function schoolLogo(s) { const name = s['学校名称']; const url = `https://sd.getianedu.cn/xiakao/logos/${encodeURIComponent(name)}.jpg`; return `<div class="school-logo-wrap"><img class="school-logo" src="${url}" alt="${escapeHtml(name)} Logo" onerror="this.style.display='none';this.nextElementSibling.style.display='grid'" /><div class="school-avatar" style="display:none">${escapeHtml(name.slice(0,1))}</div></div>`; }
  function schoolCard(s) { const tags = String(s['标签'] || '').split(/[，,]/).filter(Boolean).slice(0,2); const rate = s['专升本率(%)'] === '' ? '—' : `${s['专升本率(%)']}%`; return `<article class="school-card"><div class="card-top">${schoolLogo(s)}<div class="card-main"><div class="card-title">${escapeHtml(s['学校名称'])}${badge(s)}</div><div class="card-sub">${escapeHtml(s['城市'])} · ${escapeHtml(s['办学层次'])} · ${number(s['专业数'])} 个专业</div>${tags.map(t=>`<span class="badge gold">${escapeHtml(t)}</span>`).join('')}</div><div class="score-box"><strong>${number(s['最低分'])}–${number(s['最高分'])}</strong><span>专业最低录取分</span></div></div><div class="metrics"><span>专升本率<strong>${rate}</strong></span><span>主管部门<strong>${escapeHtml(s['主管部门'])}</strong></span><span>宿舍<strong>${String(s['空调']).includes('有') ? '有空调' : '—'}</strong></span></div><button class="card-action" data-school="${escapeHtml(s['学校名称'])}">查看学校详情 →</button></article>`; }
  function majorCard(row) { const s = row.school; return `<article class="major-card"><div class="card-top"><div class="school-avatar">专</div><div class="card-main"><div class="card-title">${escapeHtml(row['专业名称'])}${row['是否新增'] ? '<span class="badge gold">新</span>' : ''}</div><div class="card-sub">${escapeHtml(s['学校名称'])} · ${escapeHtml(s['城市'])}${badge(s)}</div></div><div class="score-box"><strong>${number(row['最低分'])}</strong><span>位次 ${number(row['最低位次']).toLocaleString()}</span></div></div><div class="major-line"><span>${escapeHtml(String(row['专业类别']).replace(/^\//,''))}</span><span>选科 <strong>${escapeHtml(row['选科要求'] || '不限')}</strong></span><span>计划 <strong>${number(row['招生计划'])}</strong></span><span>学费 <strong>${number(row['学费(元/年)']).toLocaleString()} 元</strong></span><button class="card-action" data-school="${escapeHtml(s['学校名称'])}">学校详情 →</button></div></article>`; }
  function render() {
    const rows = state.view === 'schools' ? sortRows(filterSchools()) : sortRows(filterMajors());
    document.querySelectorAll('.nav-link').forEach(b => b.classList.toggle('active', b.dataset.view === state.view));
    document.querySelectorAll('[data-school-filter]').forEach(x => x.hidden = state.view !== 'schools');
    document.querySelectorAll('[data-major-filter]').forEach(x => x.hidden = state.view !== 'majors');
    els.title.textContent = state.view === 'schools' ? '学校列表' : '专业招生列表';
    els.hint.textContent = `找到 ${rows.length.toLocaleString()} 条${state.view === 'schools' ? '学校' : '专业招生'}信息`;
    els.cards.innerHTML = rows.slice(0, state.visible).map(state.view === 'schools' ? schoolCard : majorCard).join('') || '<div class="detail-text">没有找到符合条件的信息，请调整筛选条件。</div>';
    els.loadMore.hidden = rows.length <= state.visible;
    renderActiveFilters();
  }
  function renderActiveFilters() { const tags = []; if(state.keyword) tags.push(`关键词：${state.keyword}`); if(state.nature) tags.push(state.nature); if(state.city) tags.push(state.city); if(state.level) tags.push(state.level); if(state.subject) tags.push(state.subject); if(state.category) tags.push(state.category); if(state.minScore > 150) tags.push(`最低分 ≥ ${state.minScore}`); els.active.innerHTML = tags.map(t=>`<button class="filter-tag">${escapeHtml(t)} ×</button>`).join(''); }
  function openDetail(name) { const s = data.schools.find(s => s['学校名称'] === name); if (!s) return; const majors = [...s.majors].sort((a,b)=>number(b['最低分'])-number(a['最低分'])); const dorm = [['空调',s['空调']],['房型',s['房型']],['床桌',s['床桌']],['用电',s['用电']],['作息',s['作息']],['宿舍其他',s['宿舍其他']]]; els.detail.innerHTML = `<article class="detail"><div class="detail-hero detail-brand">${schoolLogo(s)}<div><p class="eyebrow" style="color:#1677ff">${escapeHtml(s['城市'])} · ${escapeHtml(s['办学层次'])}</p><h2>${escapeHtml(s['学校名称'])}${badge(s)}</h2><p class="card-sub">${escapeHtml(s['主管部门'])}${s['标签'] ? ` · ${escapeHtml(s['标签'])}` : ''}</p></div></div><div class="detail-grid"><div class="detail-stat"><span>专业数</span><strong>${number(s['专业数'])}</strong></div><div class="detail-stat"><span>最低分区间</span><strong>${number(s['最低分'])}–${number(s['最高分'])}</strong></div><div class="detail-stat"><span>专升本率</span><strong>${s['专升本率(%)'] === '' ? '—' : `${s['专升本率(%)']}%`}</strong></div><div class="detail-stat"><span>数据年份</span><strong>2025</strong></div></div><h3 class="section-title">招生专业（${majors.length} 条）</h3><div class="table-wrap"><table class="detail-table"><thead><tr><th>专业</th><th>选科</th><th>计划</th><th>学费</th><th>最低分</th><th>最低位次</th></tr></thead><tbody>${majors.map(m=>`<tr><td>${escapeHtml(m['专业名称'])}${m['是否新增'] ? ' <span class="badge gold">新</span>' : ''}<br><small>${escapeHtml(m['招生类型'] || '')}</small></td><td>${escapeHtml(m['选科要求'] || '不限')}</td><td>${number(m['招生计划'])}</td><td>${number(m['学费(元/年)']).toLocaleString()} 元</td><td class="highlight">${number(m['最低分'])}</td><td>${number(m['最低位次']).toLocaleString()}</td></tr>`).join('')}</tbody></table></div><h3 class="section-title">学校简介</h3><p class="detail-text">${escapeHtml(s['学校简介'])}</p><h3 class="section-title">宿舍条件</h3><div class="dorm-grid">${dorm.map(([k,v])=>`<div><strong>${k}</strong>${escapeHtml(v || '暂无数据')}</div>`).join('')}</div></article>`; els.dialog.showModal(); }
  document.querySelectorAll('.nav-link').forEach(button => button.addEventListener('click', () => { state.view = button.dataset.view; state.visible = 16; render(); }));
  document.querySelectorAll('[data-keyword]').forEach(button => button.addEventListener('click', () => { els.keyword.value = button.dataset.keyword; state.keyword = els.keyword.value; state.visible = 16; render(); }));
  els.keyword.addEventListener('input', e => { state.keyword=e.target.value.trim(); state.visible=16; render(); });
  document.querySelector('#clearSearch').addEventListener('click',()=>{els.keyword.value='';state.keyword='';render();});
  document.querySelectorAll('[data-filter="nature"]').forEach(button => button.addEventListener('click', () => { state.nature=button.dataset.value; document.querySelectorAll('[data-filter="nature"]').forEach(x=>x.classList.toggle('selected',x===button)); state.visible=16;render(); }));
  [['city',els.city],['level',els.level],['subject',els.subject],['category',els.category],['sort',els.sort]].forEach(([key,el])=>el.addEventListener('change',e=>{state[key]=e.target.value;state.visible=16;render();}));
  els.score.addEventListener('input',e=>{state.minScore=number(e.target.value);els.scoreValue.textContent=state.minScore===150?'不限':`${state.minScore} 分`;state.visible=16;render();});
  els.air.addEventListener('change',e=>{state.air=e.target.checked;render();}); els.ensuite.addEventListener('change',e=>{state.ensuite=e.target.checked;render();});
  els.cards.addEventListener('click',e=>{const button=e.target.closest('[data-school]');if(button) openDetail(button.dataset.school);});
  els.loadMore.addEventListener('click',()=>{state.visible+=16;render();});document.querySelector('.dialog-close').addEventListener('click',()=>els.dialog.close());
  document.querySelector('#resetFilters').addEventListener('click',()=>{Object.assign(state,{keyword:'',nature:'',city:'',level:'',minScore:150,air:false,ensuite:false,subject:'',category:'',sort:'scoreDesc',visible:16});els.keyword.value='';els.city.value='';els.level.value='';els.subject.value='';els.category.value='';els.score.value=150;els.scoreValue.textContent='不限';els.air.checked=false;els.ensuite.checked=false;els.sort.value='scoreDesc';document.querySelector('[data-filter="nature"][data-value=""]').click();render();});
  document.querySelector('#mobileFilters').addEventListener('click',()=>els.filters.classList.toggle('open'));
  render();
})();
