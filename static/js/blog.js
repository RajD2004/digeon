// ----- Blog list: render posts (view-only safe) -----
const modal = document.getElementById('post-modal');

// guard any optional admin bindings so they never break viewing
const createBtn = document.getElementById('create-post-btn');
if (createBtn) createBtn.onclick = () => { modal.style.display = 'flex'; };

const closeBtn = document.getElementById('close-modal-btn');
if (closeBtn) closeBtn.onclick = () => { modal.style.display = 'none'; };

const postForm = document.getElementById('post-form');
if (postForm) postForm.onsubmit = async function (e) {
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

async function savePost(title, content, imageData) {
  if (!title || !content) return alert("Title and content are required!");
  await fetch("/api/blogs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ title, content, imageData })
  });
  modal.style.display = 'none';
  if (postForm) postForm.reset();
  const prev = document.getElementById('img-preview');
  if (prev) prev.style.display = 'none';
  renderBlog();
}

function escapeHTML(str) {
  return String(str).replace(/[<>&"']/g, m =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[m])
  );
}

async function renderBlog() {
  const list = document.getElementById('blog-list');
  try {
    const res = await fetch("/api/blogs", { credentials: "same-origin" });
    const ct = res.headers.get("content-type") || "";
    const text = await res.text();

    // If we got redirected HTML (e.g., login) or anything non-JSON, show a message instead of silently failing.
    if (!ct.includes("application/json")) {
      list.innerHTML = `<div style="text-align:center;color:#888;font-size:1.18rem;margin-top:36px;">
        Couldn’t load posts. Try a hard refresh (Ctrl/Cmd+Shift+R) and make sure you’re logged in.
      </div>`;
      console.error("Unexpected /api/blogs response:", text);
      return;
    }

    const posts = JSON.parse(text);

    if (!Array.isArray(posts) || posts.length === 0) {
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
    }).join("");

    // fade-in animation
    document.querySelectorAll('.blog-card').forEach(el => {
      const ob = new IntersectionObserver(es =>
        es.forEach(e => e.isIntersecting && e.target.classList.add('visible')),
        { threshold: 0.15 }
      );
      ob.observe(el);
    });
  } catch (err) {
    console.error(err);
    list.innerHTML = `<div style="text-align:center;color:#888;font-size:1.18rem;margin-top:36px;">Failed to load posts.</div>`;
  }
}

// close modal when clicking outside
window.onclick = e => { if (e.target === modal) modal.style.display = 'none'; };

// load posts
renderBlog();
