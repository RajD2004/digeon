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
// AoI helpers
const nlCatsSelectAllBtn = document.getElementById('nlCatsSelectAll');
const nlCatsClearBtn     = document.getElementById('nlCatsClear');

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
// Blog extra controls + preview
const blSaveDraftBtn = document.getElementById('blSaveDraftBtn');
const blClearBtn     = document.getElementById('blClearBtn');
const blPvTitle      = document.getElementById('blPvTitle');
const blPvContent    = document.getElementById('blPvContent');
const blPvStatus     = document.getElementById('blPvStatus');
const blTbody = document.getElementById('blTbody');
const blEmpty = document.getElementById('blEmpty');

// ---------- Formatting toolbars (generic, matches your HTML data-attrs) ----------
function wireFormattingToolbar(forTextareaId){
  const ta = document.getElementById(forTextareaId);
  // Support both data-target (your HTML) and legacy data-for just in case
  const toolbar = document.querySelector(`.editor-toolbar[data-target="${forTextareaId}"]`)
               || document.querySelector(`.editor-toolbar[data-for="${forTextareaId}"]`);
  if (!ta || !toolbar) return;

  const wrapSelection = (before, after, placeholder='')=>{
    const start = (ta.selectionStart != null ? ta.selectionStart : 0);
    const end   = (ta.selectionEnd   != null ? ta.selectionEnd   : 0);
    const val   = ta.value;
    const sel   = val.slice(start, end) || placeholder;
    const injected = before + sel + after;
    ta.value = val.slice(0, start) + injected + val.slice(end);
    const caret = start + injected.length;
    ta.focus();
    try { ta.setSelectionRange(caret, caret); } catch {}
    ta.dispatchEvent(new Event('input', {bubbles:true}));
  };

  const prefixEachLine = (prefix)=>{
    const start = (ta.selectionStart != null ? ta.selectionStart : 0);
    const end   = (ta.selectionEnd   != null ? ta.selectionEnd   : 0);
    const val = ta.value;
    const lineStart = val.lastIndexOf('\n', start - 1) + 1;
    const lineEnd   = val.indexOf('\n', end);
    const sliceEnd  = (lineEnd === -1) ? val.length : lineEnd;
    const block = val.slice(lineStart, sliceEnd);
    const lines = block.split('\n').map(l => (l.trim() ? (prefix + l) : l));
    const replaced = lines.join('\n');
    ta.value = val.slice(0, lineStart) + replaced + val.slice(sliceEnd);
    ta.focus();
    try { ta.setSelectionRange(lineStart, lineStart + replaced.length); } catch {}
    ta.dispatchEvent(new Event('input', {bubbles:true}));
  };

  // ===== UPDATED HANDLER STARTS HERE =====
  toolbar.addEventListener('click', (e)=>{
    const btn = e.target.closest('.tb');
    if(!btn) return;

    // 1) Existing attribute-based behavior (keep priority)
    if (btn.hasAttribute('data-insert-link')) {
      const url = prompt('Enter URL (https://...)','https://');
      if(!url) return;
      const sStart = (ta.selectionStart != null ? ta.selectionStart : 0);
      const sEnd   = (ta.selectionEnd   != null ? ta.selectionEnd   : 0);
      const sel = ta.value.slice(sStart, sEnd) || 'link text';
      wrapSelection(`<a href="${url}">`, '</a>', sel);
      return;
    }

    const linePrefixAttr = btn.getAttribute('data-line-prefix');
    if (linePrefixAttr) { prefixEachLine(linePrefixAttr); return; }

    const wsAttr = btn.getAttribute('data-wrap-start');
    const weAttr = btn.getAttribute('data-wrap-end');
    if (wsAttr || weAttr) { wrapSelection(wsAttr || '', weAttr || '', 'text'); return; }

    // 2) NEW: support current HTML's data-act="..." buttons
    const act = btn.getAttribute('data-act');
    if (!act) return;

    switch (act) {
      case 'bold':        wrapSelection('**','**','text'); return;
      case 'italic':      wrapSelection('*','*','text');   return;
      case 'h1':          prefixEachLine('# ');            return;
      case 'h2':          prefixEachLine('## ');           return;
      case 'h3':          prefixEachLine('### ');          return;
      case 'code':        wrapSelection('`','`','code');   return;
      case 'codeblock':   wrapSelection('```\n','\n```','code'); return;
      case 'link': {
        const url = prompt('Enter URL (https://...)','https://');
        if(!url) return;
        const sStart = (ta.selectionStart != null ? ta.selectionStart : 0);
        const sEnd   = (ta.selectionEnd   != null ? ta.selectionEnd   : 0);
        const sel = ta.value.slice(sStart, sEnd) || 'link text';
        wrapSelection(`<a href="${url}">`, '</a>', sel);
        return;
      }
      case 'highlight':   wrapSelection('<mark>','</mark>','text'); return;
      case 'sub':         wrapSelection('<sub>','</sub>','x');      return;
      case 'sup':         wrapSelection('<sup>','</sup>','x');      return;
      default: return;
    }
  });
  // ===== UPDATED HANDLER ENDS HERE =====
}

// Wire both toolbars (only if present in HTML)
wireFormattingToolbar('nlContent');
wireFormattingToolbar('blContent');

// ---------- Preview rendering (markdown + allowlisted HTML) ----------
function escapeHtml(s){ return (s==null?'':String(s)).replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }

// Very small allowlist sanitizer
function sanitizeHtmlAllowlist(html){
  const allowed = new Set(['B','STRONG','I','EM','U','SUB','SUP','CODE','PRE','MARK','P','BR','H1','H2','H3','UL','OL','LI','BLOCKQUOTE','A']);
  const root = document.createElement('div');
  root.innerHTML = html;

  (function walk(node){
    const kids = Array.from(node.childNodes);
    for(const child of kids){
      if (child.nodeType === 1){ // element
        const tag = child.tagName;
        if (!allowed.has(tag)){
          // replace unknown element with its text
          const text = document.createTextNode(child.textContent);
          node.replaceChild(text, child);
          continue;
        }
        // strip attributes; keep only safe href for A
        for (const attr of Array.from(child.attributes)){
          if (tag === 'A' && attr.name.toLowerCase() === 'href'){
            const href = child.getAttribute('href') || '';
            if (/^https?:\/\//i.test(href)){
              child.setAttribute('target','_blank');
              child.setAttribute('rel','noopener');
            } else {
              child.removeAttribute('href');
            }
          } else {
            child.removeAttribute(attr.name);
          }
        }
        walk(child);
      } else if (child.nodeType === 8){ // comment
        node.removeChild(child);
      } // text nodes are fine
    }
  })(root);

  return root.innerHTML;
}

// Render: supports ###, ##, #, > quotes, `code`, fenced ``` blocks, **bold**, *italic*, __underline__
// Also preserves literal <b>/<i>/<u>/<sub>/<sup>/<code>/<pre>/<mark>/<a> inserted by toolbar.
function renderMarkdownLite(src){
  const parts = String(src||'').split(/```/);
  let out = '';

  for (let i=0;i<parts.length;i++){
    const seg = parts[i];

    if (i % 2 === 1){
      // code block: escape only contents
      out += `<pre><code>${escapeHtml(seg)}</code></pre>`;
      continue;
    }

    // Headings & blockquotes on line starts
    let s = seg.replace(/^###\s+(.*)$/gm, (_,t)=>`<h3>${escapeHtml(t)}</h3>`)
               .replace(/^##\s+(.*)$/gm,  (_,t)=>`<h2>${escapeHtml(t)}</h2>`)
               .replace(/^#\s+(.*)$/gm,   (_,t)=>`<h1>${escapeHtml(t)}</h1>`)
               .replace(/^\s*>\s+(.*)$/gm,(_,t)=>`<blockquote>${escapeHtml(t)}</blockquote>`);

    // Inline code (backticks) — escape inside
    s = s.replace(/`([^`\n]+)`/g, (_,code)=>`<code>${escapeHtml(code)}</code>`);

    // Markdown inline styles (order matters)
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
         .replace(/__(.+?)__/g, '<u>$1</u>')
         .replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Markdown links
    s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

    // Paragraphs: split on blank lines; wrap plain blocks; keep blocks that already start with allowed tags
    const blocks = s.split(/\n{2,}/).map(block=>{
      const trimmed = block.trim();
      if (!trimmed) return '';
      if (/^<(h1|h2|h3|blockquote|pre|ul|ol|p|code|mark|strong|em|u|b|i)/i.test(trimmed)){
        return trimmed;
      }
      // escape any stray HTML here, then allow single \n as <br>
      const safe = escapeHtml(trimmed).replace(/\n/g,'<br>');
      return `<p>${safe}</p>`;
    }).join('\n');

    out += blocks;
  }

  return sanitizeHtmlAllowlist(out);
}

// ---------- Helpers ----------
function selectedCats(){
  return Array.from(nlCatGrid.querySelectorAll('input[type="checkbox"]:checked')).map(function(x){return x.value;});
}
function setSelectedCats(list){
  nlCatGrid.querySelectorAll('input[type="checkbox"]').forEach(function(cb){
    cb.checked = (list && list.indexOf(cb.value) !== -1) ? true : false;
  });
}
function updateNlPreview(){
  pvSubject.textContent = nlSubject.value.trim() || '[Subject will appear here]';
  pvGreet.textContent   = (nlContent.value.indexOf('{{name}}') !== -1) ? 'Hi Alex,' : 'Hi there,';
  // render rich preview instead of plain text
  pvContent.innerHTML   = renderMarkdownLite(nlContent.value || 'Start writing your post body to see a preview…');
  pvTags.innerHTML = '';
  selectedCats().forEach(function(c){
    const s=document.createElement('span'); s.className='pill'; s.textContent=c; pvTags.appendChild(s);
  });
}
nlSubject.addEventListener('input', updateNlPreview);
nlContent.addEventListener('input', updateNlPreview);

nlInsertName.addEventListener('click', function(){
  const token='{{name}}';
  const t=nlContent;
  const s=(t.selectionStart != null ? t.selectionStart : t.value.length);
  const e=(t.selectionEnd   != null ? t.selectionEnd   : t.value.length);
  t.value = t.value.slice(0,s) + token + t.value.slice(e);
  t.focus(); try { t.setSelectionRange(s+token.length, s+token.length); } catch {}
  updateNlPreview();
});

function resetNlEditor(){
  nlSubject.value=''; nlContent.value=''; setSelectedCats([]); pvStatus.textContent='Draft not saved'; updateNlPreview();
}
nlClearBtn.onclick = resetNlEditor;

// Newsletter AoI Select All / Clear
if (nlCatsSelectAllBtn){
  nlCatsSelectAllBtn.addEventListener('click', function(){
    nlCatGrid.querySelectorAll('input[type="checkbox"]').forEach(function(cb){ cb.checked = true; });
    updateNlPreview();
  });
}
if (nlCatsClearBtn){
  nlCatsClearBtn.addEventListener('click', function(){
    nlCatGrid.querySelectorAll('input[type="checkbox"]').forEach(function(cb){ cb.checked = false; });
    updateNlPreview();
  });
}

// Load categories -> /api/categories
async function loadCategories(){
  try{
    const r = await fetch('/api/categories');
    const cats = await r.json(); // [{id,name}]
    nlCatGrid.innerHTML = cats.map(function(c){
      return '<label style="display:flex;gap:8px;align-items:center">'
        + '<input type="checkbox" value="'+c.name+'"><span>'+c.name+'</span>'
        + '</label>';
    }).join('');
    nlCatGrid.addEventListener('change', updateNlPreview);
  }catch(err){
    toast('Failed to load categories', true);
  }
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
    if(j.status===1){ toast('Published. Sent: '+j.sent+', Failed: '+j.failed); pvStatus.textContent='Published'; resetNlEditor(); }
    else { toast('Publish failed: '+(j.error||'error'), true); }
  }catch{ toast('Publish failed', true); }
}
nlPublishBtn.onclick = publishNewsletter;

// BLOGS
function excerpt(s){ return (s||'').replace(/\s+/g,' ').slice(0,140); }
function escapeHtml(s){ return (s==null?'':String(s)).replace(/[&<>"']/g, function(m){ return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[m]; }); }

// very light markdown-ish renderer (reused by blog preview now via renderMarkdownLite above)

async function fetchBlogs(){
  try{
    const r = await fetch('/api/blogs');
    const posts = await r.json();
    if(!posts.length){ blEmpty.style.display='block'; blTbody.innerHTML=''; return; }
    blEmpty.style.display='none';
    blTbody.innerHTML = posts.map(function(p){
      const when = new Date(p.created_at).toLocaleString();
      return '<tr>'
        + '<td>'+escapeHtml(p.title)+'</td>'
        + '<td>'+escapeHtml(excerpt(p.content))+'</td>'
        + '<td>'+when+'</td>'
        + '<td><button class="btn btn-danger" data-action="delete" data-id="'+escapeHtml(String(p.blog_id))+'">Delete</button></td>'
        + '</tr>';
    }).join('');
  }catch{ blEmpty.style.display='block'; blTbody.innerHTML=''; }
}

// delegated handler for Delete buttons
if (blTbody){
  blTbody.addEventListener('click', async function(e){
    const btn = e.target.closest('button[data-action="delete"]');
    if(!btn) return;
    const id = btn.getAttribute('data-id');
    if(!id){ toast('Missing post id', true); return; }
    if(!confirm('Delete this blog post? This cannot be undone.')) return;

    btn.disabled = true;
    const ok = await deleteBlog(id).catch(function(){return false;});
    btn.disabled = false;

    if(ok){
      toast('Blog deleted');
      fetchBlogs();
    }else{
      toast('Delete failed', true);
    }
  });
}

// delete API helper (tries DELETE, then POST fallback)
async function deleteBlog(id){
  try{
    const res = await fetch('/api/blogs/'+encodeURIComponent(id), {
      method:'DELETE',
      headers:{'Content-Type':'application/json'}
    });
    if(res.ok){
      let j={status:1};
      try{ j = await res.json(); }catch(_){}
      if(j.status===1 || j.success === true) return true;
    }
  }catch(_){}

  try{
    const res = await fetch('/api/blogs/delete', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ id: id })
    });
    if(res.ok){
      const j = await res.json();
      if(j.status===1 || j.success === true) return true;
    }
  }catch(_){}

  return false;
}

async function publishBlog(){
  const title = blTitle.value.trim();
  const content = blContent.value.trim();
  if(!title || !content){ toast('Title and content are required', true); return; }

  const file = blImage.files && blImage.files[0];
  const send = async function(imageData){
    try{
      const res = await fetch('/api/blogs',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ title:title, content:content, imageData:imageData }) });
      const j = await res.json();
      if(j.status===1){
        toast('Blog published');
        blTitle.value=''; blContent.value=''; if(blImage) blImage.value='';
        updateBlogPreview();
        fetchBlogs();
      } else { toast('Publish failed', true); }
    }catch{ toast('Publish failed', true); }
  };

  if(file){
    const reader = new FileReader();
    reader.onload = function(e){ send(e.target.result); };
    reader.readAsDataURL(file);
  }else{
    send('');
  }
}
blPublishBtn.onclick = publishBlog;

// Blog Save Draft
async function saveBlogDraft(){
  const title = blTitle.value.trim();
  const content = blContent.value.trim();
  if(!title || !content){ toast('Title and content are required', true); return; }

  try{
    const res = await fetch('/api/blogs', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ title:title, content:content, status:'draft' })
    });
    const j = await res.json();
    if(j.status===1){
      toast('Draft saved');
      if (blPvStatus) blPvStatus.textContent = 'Draft saved';
      fetchBlogs();
    }else{
      toast('Save failed', true);
    }
  }catch{ toast('Save failed', true); }
}
if (blSaveDraftBtn) blSaveDraftBtn.onclick = saveBlogDraft;

// Blog Clear
function clearBlogEditor(){
  blTitle.value=''; blContent.value=''; if(blImage) blImage.value='';
  updateBlogPreview();
}
if (blClearBtn) blClearBtn.onclick = clearBlogEditor;

// Blog live preview wiring (now uses renderMarkdownLite which handles allowed HTML + markdown)
function updateBlogPreview(){
  if(blPvTitle) blPvTitle.textContent = blTitle.value.trim() || '[Title will appear here]';
  if(blPvContent) blPvContent.innerHTML = renderMarkdownLite(blContent.value);
}
if (blTitle){
  blTitle.addEventListener('input', updateBlogPreview);
  blTitle.addEventListener('change', updateBlogPreview);
}
if (blContent){
  blContent.addEventListener('input', updateBlogPreview);
  blContent.addEventListener('change', updateBlogPreview);
}

// All Newsletters list (optional)
async function fetchNewsletters(){
  if(!nlTbody || !nlEmpty) return;
  try{
    const r = await fetch('/api/newsletters');
    if(!r.ok) throw new Error();
    const items = await r.json();
    if(!items.length){ nlEmpty.style.display='block'; nlTbody.innerHTML=''; return; }
    nlEmpty.style.display='none';
    nlTbody.innerHTML = items.map(function(n){
      const when = new Date(n.created_at).toLocaleString();
      const prev = (n.body || '').replace(/\s+/g,' ').slice(0,140);
      return '<tr>'
        + '<td>'+escapeHtml(n.subject || '')+'</td>'
        + '<td>'+escapeHtml(prev)+'</td>'
        + '<td>'+when+'</td>'
        + '</tr>';
    }).join('');
  }catch(_){
    nlEmpty.style.display='block'; nlTbody.innerHTML='';
  }
}

// init
loadCategories();
updateNlPreview();
fetchBlogs();
fetchNewsletters();
updateBlogPreview();
