document.addEventListener('DOMContentLoaded', () => {
  // -- AUTH --
  const authSection = document.getElementById('auth-section');
  const marketSection = document.getElementById('marketplace-section');
  const authForm = document.getElementById('register-form');
  const authMsg = document.getElementById('auth-message');

  function isLoggedIn() {
    return !!localStorage.getItem('userEmail');
  }
  function showMarketplace() {
    authSection.style.display = 'none';
    marketSection.style.display = '';
    renderAgents();
  }
  function showAuth() {
    authSection.style.display = '';
    marketSection.style.display = 'none';
  }

  if (isLoggedIn()) showMarketplace();
  else showAuth();

  if (authForm) {
    authForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('register-email').value;
      const pass = document.getElementById('register-password').value;
      if (email && pass) {
        localStorage.setItem('userEmail', email);
        authMsg.textContent = "";
        showMarketplace();
      } else {
        authMsg.textContent = "Please fill both fields.";
      }
      authForm.reset();
    });
  }

  // --- Marketplace Data (replace/edit for real data!) ---
  const agents = [
    {name: "TextBot", type: "text", description: "A smart text
assistant for Q&A."},
    {name: "CodeHelper", type: "text", description: "Your coding sidekick."},
    {name: "VoiceGen", type: "audio", description: "Text-to-speech and
voice commands.", link: "https://audio-agent.com/install"},
    {name: "VideoAI", type: "video", description: "Video analysis and
summarization.", link: "https://video-agent.com/install"},
    {name: "MusicAI", type: "audio", description: "Music generation
and audio enhancement.", link: "https://music-agent.com/install"},
    {name: "DocReader", type: "text", description: "Extracts meaning
from PDFs and docs."},
    {name: "SceneDetect", type: "video", description: "Detects scenes
and objects in video.", link: "https://scene-agent.com/install"}
  ];

  const agentList = document.getElementById('agent-list');
  const filterForm = document.getElementById('filter-form');
  const agentSearch = document.getElementById('agent-search');
  const agentTypeFilter = document.getElementById('agent-type-filter');

  function renderAgents() {
    if (!agentList) return;
    let searchVal = agentSearch.value.trim().toLowerCase();
    let typeVal = agentTypeFilter.value;
    agentList.innerHTML = '';
    const filtered = agents.filter(agent => {
      const matchesType = !typeVal || agent.type === typeVal;
      const matchesSearch = !searchVal ||
agent.name.toLowerCase().includes(searchVal) ||
agent.description.toLowerCase().includes(searchVal);
      return matchesType && matchesSearch;
    });
    if (filtered.length === 0) {
      agentList.innerHTML = '<p>No agents found.</p>';
      return;
    }
    filtered.forEach(agent => {
      const card = document.createElement('div');
      card.className = 'agent-card';
      card.innerHTML = `
        <h3>${agent.name}</h3>
        <p>${agent.description}</p>
        <span class="agent-type"><strong>Type:</strong>
${agent.type.charAt(0).toUpperCase()+agent.type.slice(1)}</span>
        <div style="margin-top:10px;">
          ${agent.type === "text"
            ? `<button class="run-agent-btn"
data-name="${agent.name}">Run</button>`
            : `<button class="install-agent-btn"
data-link="${agent.link}" data-name="${agent.name}">Install</button>`
          }
        </div>
      `;
      agentList.appendChild(card);
    });
  }

  if (filterForm) {
    filterForm.addEventListener('input', renderAgents);
  }

  // --- Text Agent Chat ---
  const chatContainer = document.getElementById('chat-container');
  const chatForm = document.getElementById('chat-form');
  const chatInput = document.getElementById('chat-input');
  const messagesDiv = document.getElementById('messages');
  const chatAgentTitle = document.getElementById('chat-agent-title');
  const closeChatBtn = document.getElementById('close-chat');
  let currentAgent = null;

  if (agentList) {
    agentList.addEventListener('click', function(e) {
      if (e.target.classList.contains('run-agent-btn')) {
        // Open chat for text agent
        const agentName = e.target.dataset.name;
        chatAgentTitle.textContent = agentName;
        messagesDiv.innerHTML = '';
        chatContainer.style.display = '';
        currentAgent = agentName;
        chatContainer.scrollIntoView({ behavior: "smooth" });
      }
      if (e.target.classList.contains('install-agent-btn')) {
        const link = e.target.dataset.link;
        const agentName = e.target.dataset.name;
        if (confirm(`Install or access "${agentName}" via an external
link?\n\nProceed to: ${link}`)) {
          window.open(link, "_blank");
        }
      }
    });
  }

  if (chatForm) {
    chatForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const userMsg = chatInput.value.trim();
      if (!userMsg) return;
      const msgDiv = document.createElement('div');
      msgDiv.className = 'message';
      msgDiv.textContent = "You: " + userMsg;
      messagesDiv.appendChild(msgDiv);

      // Simulated agent reply
      setTimeout(() => {
        const reply = document.createElement('div');
        reply.className = 'message';
        reply.textContent = `${currentAgent}: [Simulated reply to
"${userMsg}"]`;
        messagesDiv.appendChild(reply);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
      }, 600);

      chatInput.value = '';
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    });
  }

  if (closeChatBtn) {
    closeChatBtn.addEventListener('click', function() {
      chatContainer.style.display = 'none';
      currentAgent = null;
    });
  }
});