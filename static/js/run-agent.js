// static/js/run-agent.js
document.addEventListener('DOMContentLoaded', async () => {
  // Read ?name=...
  const params = new URLSearchParams(location.search);
  const agentName = params.get('name');
  if (!agentName) {
    alert('No agent specified. Return to the marketplace and choose an agent.');
    return;
  }

  // Fetch the agent's input fields and metadata
  try {
    const [fields, agents] = await Promise.all([
      fetch(`/api/agent-inputs?agent_name=${encodeURIComponent(agentName)}`).then(r => r.json()),
      fetch('/api/market-agents').then(r => r.json())
    ]);
    const meta = (agents || []).find(a => a.name === agentName) || { name: agentName };

    // Build agent object for the modal
    const agent = {
      id: meta.id,
      name: meta.name || agentName,
      desc: meta.description || '',
      type: meta.type || '',
      price: meta.price || '',
      fields: fields || []
    };
    openModal(agent);
  } catch (e) {
    console.error(e);
    alert('Failed to load agent configuration.');
  }
});

// Modal wiring (re-using your existing modal HTML/CSS)
const modalBg   = document.getElementById('agent-modal-bg');
const modal     = document.getElementById('agent-modal');
const modalIcon = document.getElementById('modal-icon');
const modalTitle= document.getElementById('modal-title');
const modalType = document.getElementById('modal-type');
const modalDesc = document.getElementById('modal-desc');
const modalForm = document.getElementById('modal-form');
const modalOutput = document.getElementById('modal-output');
let currentAgent = null;

function openModal(agent) {
  currentAgent = agent;

  // Header
  modalIcon.style.display = 'none'; // show your brand icon if you have one
  modalTitle.textContent = agent.name || '';
  modalType.textContent  = agent.type ? `Type: ${agent.type}` : '';
  modalDesc.textContent  = agent.desc || '';

  // Build dynamic inputs
  modalForm.innerHTML = '';
  modalOutput.style.display = 'none';
  modalOutput.textContent = '';

  (agent.fields || []).forEach((f, i) => {
    const label = document.createElement('label');
    label.textContent = f.label;
    label.setAttribute('for', 'modal-input-' + i);
    modalForm.appendChild(label);

    const input = document.createElement('input');
    input.id = 'modal-input-' + i;
    input.name = f.label;
    input.type = (f.type === 'file') ? 'file' : 'text';
    modalForm.appendChild(input);
  });

  // Run button
  const runBtn = document.createElement('button');
  runBtn.type = 'submit';
  runBtn.className = 'modal-run-btn';
  runBtn.textContent = 'Run Agent';
  modalForm.appendChild(runBtn);

  // Show
  modalBg.classList.add('active');
}

document.getElementById('modal-close').onclick = () => {
  modalBg.classList.remove('active');
  setTimeout(() => { modalOutput.textContent = ''; modalOutput.style.display = 'none'; }, 250);
};
modalBg.onclick = (e) => { if (e.target === modalBg) document.getElementById('modal-close').click(); };

modalForm.onsubmit = async (e) => {
  e.preventDefault();
  if (!currentAgent) return;

  const inputs = Array.from(modalForm.querySelectorAll('input'));
  const hasFile = inputs.some(inp => inp.type === 'file' && inp.files.length > 0);

  modalOutput.className = 'modal-output';
  modalOutput.style.display = 'block';
  modalOutput.innerHTML = '<span style="color:#19b6ad;">Processing...</span>';

  try {
    let res;
    if (hasFile) {
      const fd = new FormData();
      fd.append('agent_name', currentAgent.name);
      inputs.forEach(inp => {
        if (inp.type === 'file') {
          if (inp.files[0]) fd.append(inp.name, inp.files[0]);
        } else {
          fd.append(inp.name, inp.value);
        }
      });
      res = await fetch('/api/run-agent', { method: 'POST', body: fd }).then(r => r.json());
    } else {
      const data = {};
      inputs.forEach(inp => (data[inp.name] = inp.value));
      res = await fetch('/api/run-agent', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ agent_name: currentAgent.name, inputs: data })
      }).then(r => r.json());
    }

    if (res.status === 1) {
      // --- NEW: if backend sent a file, auto-download it
      if (res.file && res.file.b64) {
        const byteChars = atob(res.file.b64);
        const byteNums = new Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) byteNums[i] = byteChars.charCodeAt(i);
        const blob = new Blob([new Uint8Array(byteNums)], { type: res.file.mime || 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = res.file.filename || 'output.bin';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);

        modalOutput.className = 'modal-output';
        modalOutput.innerText = `Downloaded: ${res.file.filename || 'output.bin'}`;
        return;
      }

      // Otherwise it's text/JSON — show it and offer a download button
      const isObject = typeof res.result === 'object';
      const text = isObject ? JSON.stringify(res.result, null, 2) : String(res.result);
      modalOutput.className = 'modal-output';
      modalOutput.innerText = text;

      // Ensure we don’t stack multiple buttons on repeated runs
      const oldBtn = modalOutput.parentElement.querySelector('.download-btn');
      if (oldBtn) oldBtn.remove();

      // Add a lightweight "Download" button for text results
      const dlBtn = document.createElement('button');
      dlBtn.className = 'download-btn';
      dlBtn.textContent = isObject ? 'Download JSON' : 'Download .txt';
      dlBtn.style.marginTop = '10px';
      dlBtn.onclick = () => {
        const blob = new Blob([text], { type: isObject ? 'application/json' : 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const ts = new Date().toISOString().replace(/[:.]/g, '-');
        const base = (currentAgent?.name || 'agent').replace(/\s+/g, '_');
        a.href = url;
        a.download = isObject ? `${base}-${ts}.json` : `${base}-${ts}.txt`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      };
      modalOutput.parentElement.appendChild(dlBtn);
    } else {
      modalOutput.className = 'modal-output error';
      modalOutput.innerText = 'Error: ' + res.error;
    }
  } catch (err) {
    modalOutput.className = 'modal-output error';
    modalOutput.innerText = 'Network error: ' + err;
  }
};

// Allow ESC key to close modal
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.getElementById('modal-close').click();
  }
});
