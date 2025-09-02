const sidebar         = document.getElementById('category-sidebar');
const categoryListEl  = document.getElementById('category-list') || sidebar; // reuse existing #category-list if present
const clearBtn        = document.getElementById('clear-filters');            // reuse existing Clear filters button if present
const agentsList      = document.getElementById('agents-list');

const resultCountEl = document.getElementById('result-count');
const minRatingEl   = document.getElementById('min-rating');
const searchForm    = document.getElementById('site-search');
const searchInput   = document.getElementById('search-input');

let categories = [];
let selectedCategoryIds = new Set();   // multi-select categories
let allAgents = [];                    // merged agents from all categories
const agentIndex = new Map();          // id -> agent (for merging categories)

// ---- Live search state ------------------------------------------------------
let activeQuery = '';
let searchDebounceId = null;
let isComposing = false;
const normalize = (s='') => s.toLowerCase().trim().replace(/\s+/g, ' ');

// ---- Ratings cache / helpers (unchanged behavior) --------------------------
const ratingCache = new Map();
async function getToolRating(toolId){
  if (ratingCache.has(toolId)) return ratingCache.get(toolId);
  const data = await fetchRating(toolId);
  ratingCache.set(toolId, data);
  return data;
}
async function fetchRating(toolId){
  const r = await fetch(`/api/tools/${toolId}/rating`);
  if (!r.ok) return { avg:0, count:0, user:null };
  return r.json();
}
async function postRating(toolId, value){
  const r = await fetch(`/api/tools/${toolId}/rating`, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ value })
  });
  if (r.status === 401) throw new Error('LOGIN_REQUIRED');
  if (!r.ok) throw new Error('BAD_REQUEST');
  return r.json();
}
function mountStars(container, tool){
  container.innerHTML = `
    <div class="stars" role="radiogroup" aria-label="Rate ${tool.name}">
      ${[1,2,3,4,5].map(i=>`
        <button type="button" class="star-btn" data-v="${i}" role="radio" aria-checked="false" aria-label="${i} star">☆</button>
      `).join('')}
      <span class="rating-meta"></span>
    </div>`;
  const btns = [...container.querySelectorAll('.star-btn')];
  const meta = container.querySelector('.rating-meta');
  const paint = (userVal, avg, count) => {
    btns.forEach((b,i)=>{ const on = i < (userVal||0); b.textContent = on ? '★' : '☆'; b.setAttribute('aria-checked', String(on)); });
    meta.textContent = count ? `(${avg} • ${count})` : '(no ratings yet)';
  };
  fetchRating(tool.id).then(({user, avg, count}) => paint(user, avg, count));
  btns.forEach(b=>{
    b.addEventListener('click', async ()=>{
      const v = +b.dataset.v;
      try {
        const {user, avg, count} = await postRating(tool.id, v);
        paint(user, avg, count);
      } catch(e){
        if (e.message === 'LOGIN_REQUIRED') alert('Please log in to rate.');
        else alert('Could not save rating.');
      }
    });
  });
}

// ---- Rendering --------------------------------------------------------------
function renderAgents(agentList) {
  agentsList.innerHTML = '';
  if (!agentList.length) {
    agentsList.innerHTML = `<div style="color:#666;text-align:center;font-size:1.17rem;">No agents match those filters.</div>`;
    return;
  }
  for (const ag of agentList) {
    const div = document.createElement('div');
    div.className = 'agent-card';
    div.innerHTML = `
      <h3><a href="${ag.link}" target="_blank" style="color:inherit;text-decoration:none;">${ag.name}</a></h3>
      <p>${ag.desc}</p>
      <div class="rating-slot"></div>
    `;
    agentsList.appendChild(div);
    mountStars(div.querySelector('.rating-slot'), ag);
  }
}

function renderCategoryFilters(){
  // If the provided container is literally the sidebar, clear it (legacy fallback)
  if (categoryListEl === sidebar) {
    sidebar.innerHTML = '';
  }

  // Reuse an existing #category-list if it exists; otherwise create one
  let list = categoryListEl.id === 'category-list'
    ? categoryListEl
    : document.createElement('div');

  if (list !== categoryListEl) {
    list.id = 'category-list';
    list.className = 'category-list';
  }

  // (Re)build the checkbox list
  list.innerHTML = '';
  categories.forEach(cat => {
    const id = `cat_${cat.id}`;
    const label = document.createElement('label');
    label.setAttribute('for', id);
    label.innerHTML = `
      <input type="checkbox" id="${id}" value="${cat.id}">
      <span>${cat.name}</span>
    `;
    const cb = label.querySelector('input');
    cb.checked = selectedCategoryIds.has(cat.id);
    cb.addEventListener('change', () => {
      // If the user interacts with filters, clear active search
      activeQuery = '';
      if (searchInput) searchInput.value = '';

      if (cb.checked) selectedCategoryIds.add(cat.id);
      else selectedCategoryIds.delete(cat.id);
      applyFiltersAndRender();
    });
    list.appendChild(label);
  });

  // Mount the list if we created a fresh one
  if (list !== categoryListEl) {
    categoryListEl.innerHTML = '';
    categoryListEl.appendChild(list);
  }

  // ---- Clear button: use existing if present; create only if missing
  const attachClearHandler = (btn) => {
    btn.addEventListener('click', () => {
      selectedCategoryIds.clear();
      list.querySelectorAll('input[type="checkbox"]').forEach(i => i.checked = false);
      if (minRatingEl) minRatingEl.value = '0';

      // Also clear any active search
      activeQuery = '';
      if (searchInput) searchInput.value = '';

      applyFiltersAndRender();
    });
  };

  if (clearBtn) {
    // Ensure a handler is attached to the existing button only once
    clearBtn.replaceWith(clearBtn.cloneNode(true));
    const freshBtn = document.getElementById('clear-filters') || document.querySelector('#clear-filters');
    attachClearHandler(freshBtn);
  } else {
    const newBtn = document.createElement('button');
    newBtn.id = 'clear-filters';
    newBtn.type = 'button';
    newBtn.textContent = 'Clear filters';
    attachClearHandler(newBtn);
    categoryListEl.appendChild(newBtn);
  }
}

// ---- Filtering logic --------------------------------------------------------
function applyRatingFilter(items){
  const minR = parseInt(minRatingEl?.value || '0', 10);
  if (!minR) return items;
  return items.filter(it => {
    const rc = ratingCache.get(it.id);
    const userVal = rc?.user || 0;
    const avgVal  = rc?.avg  || 0;
    const effective = userVal || avgVal;
    return effective >= minR;
  });
}
function applyCategoryFilter(items){
  if (selectedCategoryIds.size === 0) return items;
  return items.filter(a => {
    const set = a._cats; // Set of category ids we attach while building allAgents
    if (!set) return false;
    for (const cid of set) if (selectedCategoryIds.has(cid)) return true; // OR semantics
    return false;
  });
}
function applyFiltersAndRender(){
  const byCat    = applyCategoryFilter(allAgents);
  const byRating = applyRatingFilter(byCat);
  resultCountEl.textContent = `${byRating.length} result${byRating.length !== 1 ? 's' : ''}`;
  renderAgents(byRating);
}

// ---- Search rendering (prefix) ---------------------------------------------
function resetFiltersUI(){
  selectedCategoryIds.clear();
  const list = document.getElementById('category-list');
  if (list) list.querySelectorAll('input[type="checkbox"]').forEach(i => i.checked = false);
  if (minRatingEl) minRatingEl.value = '0';
}
function applySearchAndRender(q){
  if (!q) {
    // No query: show ALL (baseline, filters cleared)
    resultCountEl.textContent = `${allAgents.length} result${allAgents.length !== 1 ? 's' : ''}`;
    renderAgents(allAgents);
    return;
  }
  // Query present: clear filters and show prefix matches
  resetFiltersUI();
  const matches = allAgents.filter(a => a._name.startsWith(q));
  resultCountEl.textContent = `${matches.length} result${matches.length !== 1 ? 's' : ''}`;
  renderAgents(matches);
}
function triggerSearch(){
  const q = normalize(searchInput?.value || '');
  activeQuery = q;
  applySearchAndRender(q);
}

// ---- Data fetching (same backend endpoints) --------------------------------
async function fetchCategories() {
  const res = await fetch('/api/categories');
  categories = await res.json();
}

async function fetchAgentsByCategory(categoryId){
  const res = await fetch(`/api/tools?category_id=${categoryId}`);
  return res.json();
}

async function buildAllAgentsFromBackend(){
  await fetchCategories();
  agentIndex.clear();

  for (const cat of categories) {
    const list = await fetchAgentsByCategory(cat.id);
    for (const ag of list) {
      if (!agentIndex.has(ag.id)) {
        ag._cats = new Set(); // attach category ids set
        agentIndex.set(ag.id, ag);
      }
      agentIndex.get(ag.id)._cats.add(cat.id);
    }
  }

  allAgents = Array.from(agentIndex.values());

  // Precompute normalized name for fast prefix search
  allAgents.forEach(a => { a._name = normalize(a.name); });

  // Pre-warm ratings
  await Promise.all(allAgents.map(a => getToolRating(a.id).catch(() => ({avg:0, count:0, user:null}))));
}

// ---- Init -------------------------------------------------------------------
async function init(){
  await buildAllAgentsFromBackend();  // builds allAgents and warms ratings
  renderCategoryFilters();            // builds sidebar checkboxes (no duplicate Clear button)
  // Initial: show ALL
  resultCountEl.textContent = `${allAgents.length} result${allAgents.length !== 1 ? 's' : ''}`;
  renderAgents(allAgents);
}

init();

// Rating filter change handler (also clears active search)
minRatingEl?.addEventListener('change', () => {
  activeQuery = '';
  if (searchInput) searchInput.value = '';
  applyFiltersAndRender();
});

// Live search wiring (prefix)
if (searchInput) {
  searchInput.addEventListener('compositionstart', () => { isComposing = true; });
  searchInput.addEventListener('compositionend', () => {
    isComposing = false;
    // run immediately at composition end
    triggerSearch();
  });
  searchInput.addEventListener('input', () => {
    if (isComposing) return;
    if (searchDebounceId) clearTimeout(searchDebounceId);
    searchDebounceId = setTimeout(triggerSearch, 120);
  });
}

// Keep the form from navigating; Enter just uses live results
if (searchForm) {
  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    triggerSearch();
    if (searchInput) searchInput.focus();
  });
}

// Animations (unchanged)
document.addEventListener('DOMContentLoaded', function(){
  const obs = new IntersectionObserver((entries)=>{ entries.forEach((e,i)=>{ if(e.isIntersecting){ setTimeout(()=>e.target.classList.add('visible'), i*120); }}); },{threshold:.15});
  document.querySelectorAll('.animate').forEach(el=>obs.observe(el));
  const list = document.getElementById('agents-list');
  const mo = new MutationObserver(muts=>{ muts.forEach(m=>{ m.addedNodes.forEach(n=>{ if(n.nodeType===1 && n.classList && n.classList.contains('agent-card')){ n.classList.add('animate'); obs.observe(n); } }); }); });
  mo.observe(list, { childList:true });
});
