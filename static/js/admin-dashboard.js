// Toast
const toastEl = document.getElementById('toast'); let toastT=null;
function toast(msg, isErr=false){
  toastEl.textContent = msg;
  toastEl.style.borderColor = isErr ? '#7b2b34' : '#2b5e59';
  toastEl.classList.add('show');
  clearTimeout(toastT); toastT=setTimeout(()=>toastEl.classList.remove('show'),2200);
}

// Newsletter DOM
const nlSubject = document.getElementById('nlSubject');
const nlContent = document.getElementById('nlContent');
const nlInsertName = document.getElementById('nlInsertName');
const nlCatGrid = document.getElementById('nlCatGrid');
const nlClearBtn = document.getElementById('nlClearBtn');
const nlSaveDraftBtn = document.getElementById('nlSaveDraftBtn');
const nlPublishBtn = document.getElementById('nlPublishBtn');

const pvSubject = document.getElementById('pvSubject');
const pvGreet = document.getElementById('pvGreet');
const pvContent = document.getElementById('pvContent');
const pvTags = document.getElementById('pvTags');
const pvStatus = document.getElementById('pvStatus');

// Blog DOM
const blTitle = document.getElementById('blTitle');
const blContent = document.getElementById('blContent');
const blImage = document.getElementById('blImage');
const blPublishBtn = document.getElementById('blPublishBtn');

const blTbody = document.getElementById('blTbody');
const blEmpty = document.getElementById('blEmpty');

// Helpers
function selectedCats(){
  return Array.from(nlCatGrid.querySelectorAll('input[type="checkbox"]:checked')).map(x=>x.value);
}
function setSelectedCats(list){
  nlCatGrid.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = list?.includes(cb.value) || false);
}
function updateNlPreview(){
  pvSubject.textContent = nlSubject.value.trim() || '[Subject will appear here]';
  pvGreet.textContent = nlContent.value.includes('{{name}}') ? 'Hi Alex,' : 'Hi there,';
  pvContent.textContent = nlContent.value || 'Start writing your post body to see a preview…';
  pvTags.innerHTML = '';
  selectedCats().forEach(c=>{
    const s=document.createElement('span'); s.className='pill'; s.textContent=c; pvTags.appendChild(s);
  });
}
nlSubject.addEventListener('input', updateNlPreview);
nlContent.addEventListener('input', updateNlPreview);

nlInsertName.addEventListener('click', ()=>{
  const token='{{name}}';
  const t=nlContent, s=t.selectionStart ?? t.value.length, e=t.selectionEnd ?? t.value.length;
  t.value = t.value.slice(0,s) + token + t.value.slice(e);
  t.focus(); t.setSelectionRange(s+token.length, s+token.length);
  updateNlPreview();
});

function resetNlEditor(){
  nlSubject.value=''; nlContent.value=''; setSelectedCats([]); pvStatus.textContent='Draft not saved'; updateNlPreview();
}
nlClearBtn.onclick = resetNlEditor;

// Load categories -> /api/categories
async function loadCategories(){
  try{
    const r = await fetch('/api/categories');
    const cats = await r.json(); // [{id,name}]
    nlCatGrid.innerHTML = cats.map(c=>`
      <label style="display:flex;gap:8px;align-items:center">
        <input type="checkbox" value="${c.name}"><span>${c.name}</span>
      </label>`).join('');
    nlCatGrid.addEventListener('change', updateNlPreview);
  }catch(err){ toast('Failed to load categories', true); }
}

function validateNewsletter(){
  const subject = nlSubject.value.trim();
  const body = nlContent.value.trim();
  const cats = selectedCats();
  if(!subject || !body){ toast('Subject and body are required', true); return null; }
  return {subject, body, categories: cats};
}

// Save draft -> /api/newsletter/create
async function saveNewsletterDraft(){
  const payload = validateNewsletter(); if(!payload) return;
  payload.status = 'draft';
  try{
    const res = await fetch('/api/newsletter/create',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    const j = await res.json();
    if(j.status===1){ toast('Draft saved'); pvStatus.textContent='Draft saved'; resetNlEditor(); }
    else { toast('Save failed: '+(j.error||'error'), true); }
  }catch{ toast('Save failed', true); }
}
nlSaveDraftBtn.onclick = saveNewsletterDraft;

// Publish -> /api/newsletter/publish (also sends email)
async function publishNewsletter(){
  const payload = validateNewsletter(); if(!payload) return;
  if(!payload.categories.length){ toast('Pick at least one category', true); return; }
  try{
    const res = await fetch('/api/newsletter/publish',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    const j = await res.json();
    if(j.status===1){ toast(`Published. Sent: ${j.sent}, Failed: ${j.failed}`); pvStatus.textContent='Published'; resetNlEditor(); }
    else { toast('Publish failed: '+(j.error||'error'), true); }
  }catch{ toast('Publish failed', true); }
}
nlPublishBtn.onclick = publishNewsletter;

// BLOGS
function excerpt(s){ return (s||'').replace(/\s+/g,' ').slice(0,140); }
function escapeHtml(s){ return (s??'').replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }

async function fetchBlogs(){
  try{
    const r = await fetch('/api/blogs');
    const posts = await r.json();
    if(!posts.length){ blEmpty.style.display='block'; blTbody.innerHTML=''; return; }
    blEmpty.style.display='none';
    blTbody.innerHTML = posts.map(p=>{
      const when = new Date(p.created_at).toLocaleString();
      return `<tr>
        <td>${escapeHtml(p.title)}</td>
        <td>${escapeHtml(excerpt(p.content))}</td>
        <td>${when}</td>
      </tr>`;
    }).join('');
  }catch{ blEmpty.style.display='block'; blTbody.innerHTML=''; }
}

async function publishBlog(){
  const title = blTitle.value.trim();
  const content = blContent.value.trim();
  if(!title || !content){ toast('Title and content are required', true); return; }

  const file = blImage.files && blImage.files[0];
  const send = async (imageData) => {
    try{
      const res = await fetch('/api/blogs',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ title, content, imageData }) });
      const j = await res.json();
      if(j.status===1){ toast('Blog published'); blTitle.value=''; blContent.value=''; if(blImage) blImage.value=''; fetchBlogs(); }
      else { toast('Publish failed', true); }
    }catch{ toast('Publish failed', true); }
  };

  if(file){
    const reader = new FileReader();
    reader.onload = e => send(e.target.result);
    reader.readAsDataURL(file);
  }else{
    send('');
  }
}
blPublishBtn.onclick = publishBlog;

// init
loadCategories();
updateNlPreview();
fetchBlogs();
