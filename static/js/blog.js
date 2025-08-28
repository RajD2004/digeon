const modal = document.getElementById('post-modal');

document.getElementById('create-post-btn').onclick = () => { modal.style.display = 'flex'; };
document.getElementById('close-modal-btn').onclick = () => { modal.style.display = 'none'; };

document.getElementById('post-form').onsubmit = async function(e) {
  e.preventDefault();
  const title = document.getElementById('post-title').value.trim();
  const content = document.getElementById('post-content').value.trim();
  let imageData = '';
  const img = document.getElementById('post-image').files[0];
  if (img) {
    const reader = new FileReader();
    reader.onload = async (ev) => {
      imageData = ev.target.result;
      await savePost(title, content, imageData);
    };
    reader.readAsDataURL(img);
  } else {
    await savePost(title, content, imageData);
  }
};

async function savePost(title, content, imageData){
  if (!title || !content) return alert("Title and content are required!");
  await fetch("/api/blogs", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({title, content, imageData})
  });
  modal.style.display = 'none';
  document.getElementById('post-form').reset();
  document.getElementById('img-preview').style.display = 'none';
  renderBlog();
}

// Re-run animation observer for new posts
document.querySelectorAll('.blog-card').forEach(el => {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('visible');
    });
  }, { threshold: 0.15 });
  observer.observe(el);
});

function escapeHTML(str) {
  return String(str).replace(/[<>&"']/g, m => (
    {'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[m]
  ));
}

renderBlog();
window.onclick = e => { if (e.target === modal) modal.style.display = 'none'; };

async function renderBlog() {
  const res = await fetch("/api/blogs");
  const posts = await res.json();
  const list = document.getElementById('blog-list');

  if (!posts.length) {
    list.innerHTML = `<div style="text-align:center;color:#888;font-size:1.18rem;margin-top:36px;">No blog posts yet.</div>`;
    return;
  }

  list.innerHTML = posts.map(post => {
    const preview = post.content.length > 180
      ? escapeHTML(post.content.substring(0, 180)) + "…"
      : escapeHTML(post.content);
    const when = new Date(post.created_at).toLocaleString();
    return `
      <div class="blog-card animate">
        ${post.image ? `<img src="${post.image}" alt="">` : ""}
        <div class="blog-card-title">
          <a href="/post?id=${post.blog_id}" style="color:#fff;text-decoration:none;">
            ${escapeHTML(post.title)}
          </a>
        </div>
        <div class="blog-card-date">${when}</div>
        <div class="blog-card-content">${preview}</div>
        <a href="/post?id=${post.blog_id}" class="read-more">Read More →</a>
      </div>
    `;
  }).join('');

  // fade-in animation
  document.querySelectorAll('.blog-card').forEach(el => {
    const ob = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && e.target.classList.add('visible')), {threshold:0.15});
    ob.observe(el);
  });
}

function escapeHTML(str){
  return String(str).replace(/[<>&"']/g, m => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[m]));
}
renderBlog();
