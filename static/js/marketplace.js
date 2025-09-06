// Show login overlay unless logged in
const overlay = document.getElementById('login-overlay');
const mainContent = document.getElementById('marketplace-main');

function checkLogin() {
  if (localStorage.getItem('marketplaceUser')) {
    overlay.style.display = "none";
    mainContent.style.filter = "";
  } else {
    overlay.style.display = "flex";
    mainContent.style.filter = "blur(1.5px)";
  }
}
checkLogin();

document.getElementById('login-form').onsubmit = function(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value.trim();
  const msg = document.getElementById('login-msg');
  if (email && password) {
    localStorage.setItem('marketplaceUser', email);
    msg.textContent = "";
    checkLogin();
  } else {
    msg.textContent = "Please enter both email and password.";
  }
};

// Render agent card
function renderAgentCard(agent) {
  return `
    <div class="agent-card animate" data-agent='${JSON.stringify(agent).replace(/'/g, "&apos;")}'>
      <h3>${agent.name}</h3>
      <p>${agent.description || ''}</p>
      <div class="agent-type">Type: ${agent.type}</div>
      <div class="agent-price">$${agent.price}</div>
      <button class="buy-btn">Purchase</button>
    </div>
  `;
}

// Fetch and render agents
fetch('/api/market-agents')
  .then(r => r.json())
  .then(agents => {
    const container = document.getElementById('agents-list');
    if (!container) return;
    if (agents.length === 0) {
      container.innerHTML = "<p>No agents yet!</p>";
      return;
    }
    container.innerHTML = agents.map(renderAgentCard).join('');

    // Purchase → go to Run Agent page
    container.querySelectorAll('.buy-btn').forEach(function(btn) {
      btn.onclick = async function () {
        const agent = JSON.parse(
          this.closest('.agent-card').getAttribute('data-agent').replace(/&apos;/g, "'")
        );
        const fd = new FormData();
        fd.append('agent_name', agent.name);

        const r = await fetch('/api/purchase', { method: 'POST', body: fd }).then(x => x.json());
        if (r.status === 1) {
          // Deep-link into your Developer Portal and auto-open this agent there
          window.location.href = "/profile";
        } else {
          alert(r.error || 'Failed to purchase');
        }
      };
    });

  });

// Animation observer (cascading fade/slide)
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry, idx) => {
    if (entry.isIntersecting) {
      setTimeout(() => entry.target.classList.add('visible'), idx * 120);
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });

// Observe anything with .animate (including cards rendered after fetch)
document.querySelectorAll('.animate').forEach(el => revealObserver.observe(el));

// If cards are (re)rendered after fetch, hook them too:
const list = document.getElementById('agents-list');
if (list) {
  const mo = new MutationObserver((muts) => {
    muts.forEach(m => {
      m.addedNodes.forEach(n => {
        if (n.nodeType === 1 && n.classList && n.classList.contains('animate')) {
          revealObserver.observe(n);
        }
      });
    });
  });
  mo.observe(list, { childList: true });
}
