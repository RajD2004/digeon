document.addEventListener('DOMContentLoaded', function() {
  // Only run on directory page
  if (!window.location.pathname.startsWith('/ai-tools-directory')) return;

  // Main layout
  let sidebar = document.getElementById('category-sidebar');
  let agentsGrid = document.getElementById('agents-list');
  let searchInput = document.getElementById('search-input');
  let searchForm = document.getElementById('site-search');

  let categories = [];
  let current = 0;
  let allTools = [];
  let searchQuery = "";

  // Fetch categories from Flask API
  function fetchCategories() {
    fetch("/api/categories")
      .then(r => r.json())
      .then(cats => {
        categories = cats;
        renderCategories();
        if (categories.length > 0) {
          fetchAndRenderTools(categories[0].id);
        }
      });
  }

  // Render category sidebar with modern wide dark buttons
  function renderCategories() {
    sidebar.innerHTML = '';
    categories.forEach((cat, i) => {
      const btn = document.createElement('button');
      btn.textContent = cat.name;
      btn.className = 'directory-category-btn' + (i === current ? ' selected' : '');
      btn.type = 'button';
      btn.onclick = () => {
        current = i;
        renderCategories();
        fetchAndRenderTools(cat.id);
      };
      sidebar.appendChild(btn);
    });
  }

  // Fetch and render tools (as cards) for selected category
  function fetchAndRenderTools(category_id) {
    fetch(`/api/tools?category_id=${category_id}`)
      .then(r => r.json())
      .then(tools => {
        allTools = tools;
        renderAgents(tools);
      });
  }

  // Render agent cards as grid
  function renderAgents(tools) {
    let filtered = tools;
    if (searchQuery) {
      filtered = tools.filter(tool =>
        tool.tool_name.toLowerCase().includes(searchQuery) ||
        (tool.desc && tool.desc.toLowerCase().includes(searchQuery)) ||
        (tool.link && tool.link.toLowerCase().includes(searchQuery))
      );
    }
    agentsGrid.innerHTML = '';
    if (!filtered.length) {
      agentsGrid.innerHTML = `<div style="color:#666;text-align:center;font-size:1.17rem;">No tools found for this category yet.</div>`;
      return;
    }
    for (const tool of filtered) {
      const div = document.createElement('div');
      div.className = 'agent-card';
      div.innerHTML = `
        <h3>${tool.tool_name}</h3>
        ${tool.desc ? `<p>${tool.desc}</p>` : ""}
        ${tool.link ? `<p style="margin:7px 0;"><a href="${tool.link}" target="_blank" style="color:#0077cc;word-break:break-all;">${tool.link}</a></p>` : ""}
        ${tool.date_added ? `<p style="color:#444;font-size:0.97rem;">Added: ${tool.date_added}</p>` : ""}
      `;
      agentsGrid.appendChild(div);
    }
  }

  // Search bar logic
  if (searchForm && searchInput) {
    searchForm.addEventListener('submit', function(e) {
      e.preventDefault();
      searchQuery = searchInput.value.trim().toLowerCase();
      renderAgents(allTools);
    });
    searchInput.addEventListener('input', function() {
      searchQuery = searchInput.value.trim().toLowerCase();
      renderAgents(allTools);
    });
  }

  // Start
  fetchCategories();
});
