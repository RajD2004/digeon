document.addEventListener('DOMContentLoaded', function() {
  // Only run on directory page
  if (!window.location.pathname.startsWith('/ai-tools-directory')) return;

  const main = document.querySelector('.directory-section');
  // If you copied my HTML: create the skeleton if it doesn't exist yet.
  let sidebar = document.getElementById('category-sidebar');
  let toolList = document.getElementById('tool-list');
  if (!sidebar || !toolList) {
    // fallback for old HTML: create sidebar + toollist containers
    const layout = document.createElement('div');
    layout.className = 'directory-layout';
    sidebar = document.createElement('aside');
    sidebar.id = 'category-sidebar';
    toolList = document.createElement('div');
    toolList.id = 'tool-list';
    layout.appendChild(sidebar);
    layout.appendChild(toolList);
    main.appendChild(layout);
  }

  function renderTools(tools) {
    toolList.innerHTML = '';
    if (!tools.length) {
      toolList.innerHTML = '<p>No tools found for this category.</p>';
      return;
    }
    const table = document.createElement('table');
    table.className = 'tools-table';
    table.innerHTML = `
      <thead>
        <tr>
          <th>Tool Name</th>
          <th>Date Added</th>
          <th>Link</th>
        </tr>
      </thead>
      <tbody>
        ${tools.map(tool => `
          <tr>
            <td>${tool.tool_name}</td>
            <td>${tool.date_added || ''}</td>
            <td>
              ${tool.link ? `<a href="${tool.link}" target="_blank">Visit</a>` : 'N/A'}
            </td>
          </tr>
        `).join('')}
      </tbody>
    `;
    toolList.appendChild(table);
  }

  function loadTools(category_id) {
    fetch(`/api/tools?category_id=${category_id}`)
      .then(r => r.json())
      .then(renderTools);
  }

  fetch('/api/categories')
    .then(r => r.json())
    .then(categories => {
      sidebar.innerHTML = '';
      categories.forEach((cat, idx) => {
        const btn = document.createElement('button');
        btn.textContent = cat.name;
        btn.className = 'category-btn';
        btn.onclick = () => {
          document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          loadTools(cat.id);
        };
        sidebar.appendChild(btn);
        // Load the first category on page load
        if (idx === 0) {
          btn.classList.add('active');
          loadTools(cat.id);
        }
      });
    });
});
