function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

function escapeHTML(str) {
  return String(str).replace(/[<>&"']/g, m => (
    {'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[m]
  ));
}

function pluralize(n, s) {
  return `${n} ${s}${n === 1 ? '' : 's'}`;
}

function fmtWhen(ts) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts || '';
  }
}

async function fetchJSON(url, options={}) {
  try {
    const res = await fetch(url, { credentials: 'same-origin', ...options });
    const ct = res.headers.get('content-type') || '';
    if (!res.ok || !ct.includes('application/json')) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/* ---------- Likes ---------- */
async function loadLikes(postId) {
  const data = await fetchJSON(`/api/blog/${postId}/likes`);
  // Expected: { likes: number, liked: boolean }
  if (!data) return { likes: 0, liked: false };
  return { likes: +data.likes || 0, liked: !!data.liked };
}

async function toggleLike(postId) {
  const data = await fetchJSON(`/api/blog/${postId}/like`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ toggle: true })
  });
  // Expected: { likes: number, liked: boolean }
  if (!data) return null;
  return { likes: +data.likes || 0, liked: !!data.liked };
}

function paintLikeUI({ likes, liked }) {
  const btn   = document.getElementById('like-btn');
  const heart = btn?.querySelector('.heart');
  const text  = document.getElementById('like-text');
  const count = document.getElementById('like-count');
  if (!btn || !heart || !text || !count) return;

  btn.classList.toggle('liked', liked);
  btn.setAttribute('aria-pressed', String(liked));
  heart.textContent = liked ? '♥' : '♡';
  text.textContent  = liked ? 'Liked' : 'Like';
  count.textContent = String(likes);
}

/* ---------- Comments ---------- */
async function loadComments(postId) {
  const arr = await fetchJSON(`/api/blog/${postId}/comments`);
  // Expected: [{ id, name, text, created_at }]
  if (!Array.isArray(arr)) return [];
  return arr;
}

async function submitComment(postId, name, text) {
  const data = await fetchJSON(`/api/blog/${postId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({ name, text })
  });
  // Expected: { status:1, comment:{ id,name,text,created_at } } OR { id,... }
  if (!data) return null;
  if (data.comment) return data.comment;
  return data; // best-effort fallback
}

function renderComments(list) {
  const wrap = document.getElementById('comments-list');
  const ccEl = document.getElementById('comment-count');
  if (!wrap) return;

  if (!Array.isArray(list) || list.length === 0) {
    wrap.innerHTML = `<div class="comment-item"><div class="comment-body" style="color:#9fb0c2">No comments yet. Be the first!</div></div>`;
    if (ccEl) ccEl.textContent = '0 comments';
    return;
  }

  wrap.innerHTML = list.map(c => {
    const name = escapeHTML(c.name || 'Anonymous');
    const when = escapeHTML(fmtWhen(c.created_at || ''));
    const body = escapeHTML(c.text || '');
    return `
      <div class="comment-item">
        <div class="comment-meta">
          <span class="comment-name">${name}</span>
          <span class="comment-time">• ${when}</span>
        </div>
        <div class="comment-body">${body}</div>
      </div>
    `;
  }).join('');

  if (ccEl) ccEl.textContent = pluralize(list.length, 'comment');
}

/* ---------- Engagement bootstrapping ---------- */
async function initEngagement(postId) {
  // Likes
  const likeBtn = document.getElementById('like-btn');
  const initial = await loadLikes(postId);
  paintLikeUI(initial);

  if (likeBtn) {
    likeBtn.addEventListener('click', async () => {
      if (likeBtn.classList.contains('disabled')) return;
      likeBtn.classList.add('disabled');
      try {
        const updated = await toggleLike(postId);
        if (updated) paintLikeUI(updated);
      } finally {
        likeBtn.classList.remove('disabled');
      }
    });
  }

  // Comments (load + submit)
  let comments = await loadComments(postId);
  renderComments(comments);

  const form = document.getElementById('comment-form');
  const nameEl = document.getElementById('comment-name');
  const textEl = document.getElementById('comment-text');

  if (form && nameEl && textEl) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = nameEl.value.trim() || 'Anonymous';
      const text = textEl.value.trim();
      if (!text) return;

      // Optimistic: append locally; if backend returns enriched object, swap it in
      const optimistic = {
        id: 'tmp_' + Date.now(),
        name, text,
        created_at: new Date().toISOString()
      };
      comments = [...comments, optimistic];
      renderComments(comments);

      nameEl.value = nameEl.value; // keep name
      textEl.value = '';

      const saved = await submitComment(postId, name, text);
      if (saved && saved.id) {
        // Replace optimistic with saved (match by tmp id)
        const idx = comments.findIndex(c => c.id === optimistic.id);
        if (idx !== -1) {
          comments[idx] = { ...optimistic, ...saved };
          renderComments(comments);
        } else {
          // If optimistic not found, just re-append
          comments = [...comments, saved];
          renderComments(comments);
        }
      }
      // If it failed silently, we leave the optimistic comment in place
    });
  }
}

/* ---------- Post render (original, unchanged) ---------- */
async function renderPost() {
  const id = getQueryParam('id');
  const container = document.getElementById('post-container');
  if (!id) {
    container.innerHTML = `<div class="error-msg">Invalid post link.</div>`;
    return;
  }
  try {
    const res = await fetch(`/api/blog/${id}`, { credentials: 'same-origin' });
    if (!res.ok) {
      container.innerHTML = `<div class="error-msg">This blog post could not be found.</div>`;
      return;
    }
    const post = await res.json();
    container.innerHTML = `
      <div class="post-title">${escapeHTML(post.title)}</div>
      <div class="post-date">${escapeHTML(fmtWhen(post.created_at))}</div>
      ${post.image ? `<img src="${post.image}" class="post-image">` : ''}
      <div class="post-content">${(post.content || '').replace(/\n/g, '<br>')}</div>
    `;

    // After content is rendered, initialize likes & comments UI
    await initEngagement(id);
  } catch (err) {
    container.innerHTML = `<div class="error-msg">Failed to load this post.</div>`;
  }
}

renderPost();
