    
document.getElementById('dir-link').addEventListener('click', function(e){
  if (localStorage.getItem('digeonSubscribed') !== 'yes') {
    e.preventDefault();
    alert('Subscribe to the newsletter to access the Directory.');
  }
});
// Replace static AREAS with a live fetch
async function populateCategories() {
  const catGrid = document.getElementById('cat-grid');
  catGrid.innerHTML = '';
  try {
    const res = await fetch('/api/categories');
    const data = await res.json(); // app returns [{id, name}, ...]
    const names = Array.isArray(data)
      ? data.map(o => o.name)                 // current /api/categories response
      : (data.categories || []);              // if you later switch to {categories:[...]}
    names.forEach((name, i) => {
      const id = 'cat_' + i;
      const wrap = document.createElement('label');
      wrap.className = 'cat-item';
      wrap.innerHTML = `<input type="checkbox" id="${id}" value="${name}"><span>${name}</span>`;
      catGrid.appendChild(wrap);
    });
  } catch (e) {
    console.warn('Falling back to static categories', e);
    const fallback = [
      "Development/Automation","Productivity","Writing/Content Creation","Visual Design","Social Media Marketing",
      "Research/Academia","Real Estate","Healthcare","Web/Mobile apps","Data Analytics","Machine Learning","Finance","Data Engineering"
    ];
    fallback.forEach((name, i)=>{
      const id = 'cat_' + i;
      const wrap = document.createElement('label');
      wrap.className='cat-item';
      wrap.innerHTML = `<input type="checkbox" id="${id}" value="${name}"><span>${name}</span>`;
      catGrid.appendChild(wrap);
    });
  }
}
document.addEventListener('DOMContentLoaded', populateCategories);

// Call this after DOM is ready
document.addEventListener('DOMContentLoaded', populateCategories);

const catGrid = document.getElementById('cat-grid');
    
const subjectEl = document.getElementById('subject');
const bodyEl = document.getElementById('body');
const pvSubject = document.getElementById('pv-subject');
const pvGreet = document.getElementById('pv-greet');
const pvContent = document.getElementById('pv-content');
const pvTags = document.getElementById('pv-tags');
const pvStatus = document.getElementById('pv-status');
const saveNote = document.getElementById('save-note');
    
function getSelectedCategories(){
  return Array.from(catGrid.querySelectorAll('input[type="checkbox"]:checked')).map(c=>c.value);
}

async function apiCreate(statusOverride) {
  const payload = {
    subject: subjectEl.value.trim(),
    body: bodyEl.value,
    categories: getSelectedCategories(),
    status: statusOverride || 'draft'
  };
  const res = await fetch('/api/newsletter/create', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(payload)
  });
  return res.json();
}

async function saveDraft(){
  if(!subjectEl.value.trim() || !bodyEl.value){
    alert('Please fill in both subject and body.'); return;
  }
  // server draft
  const r = await apiCreate('draft');
  if (r.status === 1) {
    // optional: keep a local backup too
    localStorage.setItem('newsletterDraft', JSON.stringify({
      subject: subjectEl.value.trim(),
      body: bodyEl.value,
      categories: getSelectedCategories()
    }));
    document.getElementById('save-note').textContent = `Draft saved (Post #${r.post_id}).`;
    document.getElementById('pv-status').textContent = 'Draft saved';
  } else {
    alert('Save failed: ' + (r.error || 'unknown'));
  }
}
document.getElementById('save-draft').addEventListener('click', saveDraft);

document.getElementById('publish').addEventListener('click', async ()=>{
  if(!subjectEl.value.trim() || !bodyEl.value){
    alert('Please fill in both subject and body.'); return;
  }
  const categories = getSelectedCategories();
  if (categories.length === 0) {
    alert('Select at least one Area of Interest.'); return;
  }
  const res = await fetch('/api/newsletter/publish', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({
      subject: subjectEl.value.trim(),
      body: bodyEl.value,
      categories
    })
  });
  const r = await res.json();
  if (r.status === 1) {
    alert(`Published post #${r.post_id}. Sent: ${r.sent}, Failed: ${r.failed}`);
    document.getElementById('pv-status').textContent = 'Published';
  } else {
    alert('Publish failed: ' + (r.error || 'unknown'));
  }
});
