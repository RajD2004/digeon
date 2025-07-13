document.addEventListener('DOMContentLoaded', () => {
  // Finance tools data from your CSV
  const financeTools = [
    {
      tool: "Kensho",
      description: "Financial analytics, AI-driven insights & market analysis",
      pricing: "Enterprise pricing",
      link: "https://kensho.com"
    },
    {
      tool: "Upstart",
      description: "AI-powered loan underwriting and credit decisioning",
      pricing: "Custom",
      link: "https://upstart.com"
    },
    {
      tool: "Zest AI",
      description: "AI for fair, automated credit underwriting",
      pricing: "Enterprise",
      link: "https://zest.ai"
    },
    {
      tool: "AlphaSense",
      description: "AI-driven market intelligence & financial research",
      pricing: "Paid (custom)",
      link: "https://alpha-sense.com"
    },
    {
      tool: "Dataminr",
      description: "AI-based real-time risk and finance event detection",
      pricing: "Enterprise",
      link: "https://dataminr.com"
    },
    {
      tool: "Kabbage",
      description: "AI-driven small business loans & financial management",
      pricing: "Custom",
      link: "https://kabbage.com"
    },
    {
      tool: "Cresta",
      description: "AI for contact center coaching & sales analytics",
      pricing: "Paid",
      link: "https://cresta.com"
    },
    {
      tool: "Darktrace",
      description: "AI-based cybersecurity & threat detection for finance",
      pricing: "Enterprise",
      link: "https://darktrace.com"
    },
    {
      tool: "Socure",
      description: "AI-driven identity verification & fraud prevention",
      pricing: "Custom",
      link: "https://socure.com"
    },
    {
      tool: "Socotra",
      description: "AI-powered insurance core platform",
      pricing: "Custom",
      link: "https://socotra.com"
    },
    {
      tool: "C3.ai",
      description: "Enterprise AI for fraud detection, finance, and compliance",
      pricing: "Enterprise",
      link: "https://c3.ai"
    },
    {
      tool: "Ayasdi",
      description: "AI for anti-money laundering and risk in finance",
      pricing: "Enterprise",
      link: "https://ayasdi.com"
    },
    {
      tool: "Aiera",
      description: "AI for real-time financial event monitoring & analytics",
      pricing: "Custom",
      link: "https://aiera.com"
    },
    {
      tool: "Caspian",
      description: "AI trading platform for digital assets & finance",
      pricing: "Paid",
      link: "https://caspian.tech"
    },
    {
      tool: "ThoughtSpot",
      description: "AI analytics & BI for finance teams",
      pricing: "Custom",
      link: "https://thoughtspot.com"
    },
    {
      tool: "Socure",
      description: "AI-based customer identity and fraud solutions",
      pricing: "Enterprise",
      link: "https://socure.com"
    }
  ];

  // Render finance tools
  const financeContainer = document.getElementById('finance-tools');
  if (financeContainer) {
    financeTools.forEach(tool => {
      const card = document.createElement('div');
      card.className = 'tool-card';
      card.innerHTML = `
        <h3>${tool.tool}</h3>
        <p class="tool-desc">${tool.description}</p>
        <div class="tool-meta">
          <span class="tool-price"><strong>Pricing:</strong> ${tool.pricing}</span><br>
          <a class="tool-link" href="${tool.link}" target="_blank" rel="noopener">Visit Site</a>
        </div>
      `;
      financeContainer.appendChild(card);
    });
  }
});

document.addEventListener('DOMContentLoaded', () => {
  // Newsletter form
  const form = document.getElementById('newsletter-form');
  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const email = document.getElementById('newsletter-email').value;
      document.getElementById('newsletter-message').textContent = `Thank you, ${email}! You are now subscribed.`;
      form.reset();
    });
  }

  // Site search (placeholder functionality)
  const searchForm = document.getElementById('site-search');
  if (searchForm) {
    searchForm.addEventListener('submit', e => {
      e.preventDefault();
      const query = document.getElementById('search-input').value;
      alert(`Search for: ${query}`);
      searchForm.reset();
    });
  }

  // Directory (placeholder data loading)
  const dir = document.getElementById('directory-categories');
  if (dir) {
    const categories = ['Analytics', 'Chatbots', 'Image Generation'];
    categories.forEach(cat => {
      const div = document.createElement('div');
      div.className = 'directory-category';
      div.innerHTML = `<h2>${cat}</h2><ul><li>Tool A</li><li>Tool B</li></ul>`;
      dir.appendChild(div);
    });
  }

  // Marketplace chat
  const chatForm = document.getElementById('chat-form');
  if (chatForm) {
    chatForm.addEventListener('submit', e => {
      e.preventDefault();
      const input = document.getElementById('chat-input');
      const msg = document.createElement('div');
      msg.className = 'message';
      msg.textContent = input.value;
      document.getElementById('messages').appendChild(msg);
      input.value = '';
      document.getElementById('messages').scrollTop = document.getElementById('messages').scrollHeight;
    });
  }

  // Blog posts (placeholder)
  const postsContainer = document.getElementById('posts');
  if (postsContainer) {
    const posts = [
      { title: 'Introducing Our AI Tools Hub', date: 'July 1, 2025', excerpt: 'Welcome to our new AI Tools website. Here’s what to expect...' },
      { title: 'Top 5 AI Analytics Tools', date: 'June 25, 2025', excerpt: 'An overview of the best analytics tools in the market...' }
    ];
    posts.forEach(post => {
      const art = document.createElement('article');
      art.innerHTML = `<h2>${post.title}</h2><small>${post.date}</small><p>${post.excerpt}</p><a href="#">Read more</a>`;
      postsContainer.appendChild(art);
    });
  }
});