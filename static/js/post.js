function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

function escapeHTML(str) {
  return String(str).replace(/[<>&"']/g, m => (
    {'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[m]
  ));
}

async function renderPost() {
  const id = getQueryParam('id');
  const container = document.getElementById('post-container');
  if (!id) {
    container.innerHTML = `<div class="error-msg">Invalid post link.</div>`;
    return;
  }
  const res = await fetch(`/api/blog/${id}`);
  if (!res.ok) {
    container.innerHTML = `<div class="error-msg">This blog post could not be found.</div>`;
    return;
  }
  const post = await res.json();
  container.innerHTML = `
    <div class="post-title">${escapeHTML(post.title)}</div>
    <div class="post-date">${post.created_at}</div>
    ${post.image ? `<img src="${post.image}" class="post-image">` : ''}
    <div class="post-content">${post.content.replace(/\n/g, '<br>')}</div>
  `;
}

renderPost();
