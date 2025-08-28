const sidebar = document.getElementById('category-sidebar');
const agentsList = document.getElementById('agents-list');
let currentCategoryId = null;
let categories = [];

// ---- Rating filter UI handles
const resultCountEl = document.getElementById('result-count');
const minRatingEl   = document.getElementById('min-rating');

// ---- Ratings cache
const ratingCache = new Map();
async function getToolRating(toolId){
  if (ratingCache.has(toolId)) return ratingCache.get(toolId);
  const data = await fetchRating(toolId);
  ratingCache.set(toolId, data);
  return data;
}
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
function renderCategories() {
  sidebar.innerHTML = '';
  categories.forEach((cat) => {
    const btn = document.createElement('button');
    btn.textContent = cat.name;
    btn.className = 'directory-category-btn' + (cat.id === currentCategoryId ? ' selected' : '');
    btn.onclick = () => { currentCategoryId = cat.id; renderCategories(); fetchAgents(cat.id); };
    sidebar.appendChild(btn);
  });
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
function renderAgents(agentList) {
  agentsList.innerHTML = '';
  if (!agentList.length) {
    agentsList.innerHTML = `<div style="color:#666;text-align:center;font-size:1.17rem;">No agents found for this category yet.</div>`;
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
async function fetchCategories() {
  const res = await fetch('/api/categories');
  categories = await res.json();
  if (categories.length > 0) {
    currentCategoryId = categories[0].id;
    renderCategories();
    fetchAgents(currentCategoryId);
  }
}
async function fetchAgents(categoryId) {
  const res = await fetch(`/api/tools?category_id=${categoryId}`);
  const agents = await res.json();
  await Promise.all(agents.map(a => getToolRating(a.id).catch(() => ({avg:0, count:0, user:null}))));
  const filtered = applyRatingFilter(agents);
  resultCountEl.textContent = `${filtered.length} result${filtered.length !== 1 ? 's' : ''}`;
  renderAgents(filtered);
}
fetchCategories();
minRatingEl?.addEventListener('change', () => { if (currentCategoryId) fetchAgents(currentCategoryId); });

// Search
document.getElementById("site-search").addEventListener("submit", async function(e) {
  e.preventDefault();
  const query = document.getElementById("search-input").value.trim();
  if (!query) return;
  const res = await fetch(`/api/tool-link?name=${encodeURIComponent(query)}`);
  const data = await res.json();
  if (data.link) window.open(data.link, "_blank"); else alert("Tool not found.");
});

// Animations
document.addEventListener('DOMContentLoaded', function(){
  const obs = new IntersectionObserver((entries)=>{ entries.forEach((e,i)=>{ if(e.isIntersecting){ setTimeout(()=>e.target.classList.add('visible'), i*120); }}); },{threshold:.15});
  document.querySelectorAll('.animate').forEach(el=>obs.observe(el));
  const list = document.getElementById('agents-list');
  const mo = new MutationObserver(muts=>{ muts.forEach(m=>{ m.addedNodes.forEach(n=>{ if(n.nodeType===1 && n.classList && n.classList.contains('agent-card')){ n.classList.add('animate'); obs.observe(n); } }); }); });
  mo.observe(list, { childList:true });
});
