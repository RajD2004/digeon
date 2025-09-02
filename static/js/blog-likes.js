
(function () {
    async function j(url, opts){
        const r = await fetch(url, { credentials: 'same-origin', ...(opts||{}) });
        if (!r.ok) throw new Error(await r.text());
        return r.json();
    }
    function mk(html){ const d=document.createElement('div'); d.innerHTML=html.trim(); return d.firstElementChild; }

  async function wire(card){
    const blogId = card.getAttribute('data-post-id');
    const footer = card.querySelector('.blog-card-footer');
    if(!blogId || !footer) return;

    footer.innerHTML = '';
    const ui = mk(`
      <div class="likes-comments" data-blog-id="${blogId}">
        <button class="like-btn" type="button"><span class="heart">♡</span><span class="txt">Like</span><span class="cnt" style="margin-left:6px;opacity:.8">0</span></button>
        <div class="comments" style="margin-top:10px;width:100%">
          <details>
            <summary style="cursor:pointer;color:#9fdad6">Comments</summary>
            <ul class="list" style="list-style:none;margin:10px 0 8px;padding:0;display:grid;gap:10px"></ul>
            <form class="add" style="display:flex;gap:8px;align-items:flex-start;margin-top:6px">
              <input name="user_name" placeholder="Name (optional)" style="flex:0 0 180px;padding:8px;border-radius:8px;border:1px solid #2a2d34;background:#0f141a;color:#e6eaea">
              <textarea name="body" placeholder="Write a comment…" required style="flex:1;padding:8px;border-radius:8px;border:1px solid #2a2d34;background:#0f141a;color:#e6eaea;min-height:60px"></textarea>
              <button type="submit" class="like-btn" style="white-space:nowrap">Post</button>
            </form>
          </details>
        </div>
      </div>
    `);
    footer.appendChild(ui);

    const likeBtn = ui.querySelector('.like-btn');
    const cntEl   = ui.querySelector('.cnt');
    const listEl  = ui.querySelector('.list');
    const formEl  = ui.querySelector('form.add');

    async function refreshLikes(){
      try{
        const s = await j(`/api/blogs/${blogId}/likes`);
        cntEl.textContent = s.count;
        likeBtn.classList.toggle('liked', !!s.liked);
        likeBtn.querySelector('.heart').textContent = s.liked ? '♥' : '♡';
        likeBtn.querySelector('.txt').textContent   = s.liked ? 'Liked' : 'Like';
      }catch(_){}
    }
    async function refreshComments(){
      try{
        const rows = await j(`/api/blogs/${blogId}/comments`);
        listEl.innerHTML = rows.map(c=>{
          const name=(c.user_name||c.user_email||'Anonymous').replace(/</g,'&lt;').replace(/>/g,'&gt;');
          const body=(c.body||'').replace(/</g,'&lt;').replace(/>/g,'&gt;');
          const when=new Date(c.created_at).toLocaleString();
          return `<li><div style="font-size:13px;color:#aab8c2"><strong style="color:#e6eaea">${name}</strong> • ${when}</div><div style="color:#d6dde6">${body}</div></li>`;
        }).join('');
      }catch(_){}
    }

    likeBtn.addEventListener('click', async ()=>{
      likeBtn.classList.add('disabled');
      try{
        const s = await j(`/api/blogs/${blogId}/like`, {method:'POST'});
        cntEl.textContent = s.count;
        likeBtn.classList.toggle('liked', !!s.liked);
        likeBtn.querySelector('.heart').textContent = s.liked ? '♥' : '♡';
        likeBtn.querySelector('.txt').textContent   = s.liked ? 'Liked' : 'Like';
      }catch{ alert('Please log in to like posts.'); }
      finally{ likeBtn.classList.remove('disabled'); }
    });

    formEl.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const fd=new FormData(formEl);
      const body=(fd.get('body')||'').trim();
      if(!body) return;
      try{
        await j(`/api/blogs/${blogId}/comments`, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(Object.fromEntries(fd.entries()))});
        formEl.reset(); refreshComments();
      }catch{ alert('Please log in to comment.'); }
    });

    await refreshLikes();
    await refreshComments();
  }

  window.initLikesAndComments = function(){
    document.querySelectorAll('.blog-card').forEach(wire);
  };
})();
