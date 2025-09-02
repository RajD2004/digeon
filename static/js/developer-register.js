// Tabs
const tabLogin = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');
const devLoginSection = document.getElementById('dev-login-section');
const devRegisterSection = document.getElementById('dev-register-section');
tabLogin.onclick = () => { tabLogin.classList.add('active'); tabRegister.classList.remove('active'); devLoginSection.style.display = ''; devRegisterSection.style.display = 'none'; };
tabRegister.onclick = () => { tabLogin.classList.remove('active'); tabRegister.classList.add('active'); devLoginSection.style.display = 'none'; devRegisterSection.style.display = ''; };

// Dev login
document.getElementById('dev-login-form').onsubmit = function(e){
  e.preventDefault();
  const email = document.getElementById('dev-login-email').value.trim();
  const pw = document.getElementById('dev-login-password').value;
  const msg = document.getElementById('dev-login-msg');
  msg.style.color = "#e63946";
  if(!email || !pw){ msg.textContent="All fields are required."; return; }
  const formData = new FormData(); formData.append("email",email); formData.append("password",pw);
  fetch("/api/dev-login",{method:"POST",body:formData}).then(r=>r.json()).then(data=>{
    if(data.status===1){ msg.style.color="#19b6ad"; msg.textContent="Login successful! Loading agent registration..."; setTimeout(()=>{document.getElementById('dev-auth-section').style.display="none"; document.getElementById('main-dev-container').style.display="";},800); }
    else { msg.textContent = data.Except || "Invalid credentials or developer not registered."; }
  });
};

// Dev register
document.getElementById('dev-register-form').onsubmit = function(e){
  e.preventDefault();
  const email = document.getElementById('dev-register-email').value.trim();
  const pw = document.getElementById('dev-register-password').value;
  const pw2 = document.getElementById('dev-register-password2').value;
  const msg = document.getElementById('dev-register-msg');
  msg.style.color = "#e63946";
  if(!email || !pw || !pw2){ msg.textContent="All fields are required."; return; }
  if(pw!==pw2){ msg.textContent="Passwords do not match."; return; }
  const formData=new FormData(); formData.append("email",email); formData.append("password",pw);
  fetch("/api/dev-register",{method:"POST",body:formData}).then(r=>r.json()).then(data=>{
    if(data.status===1){ msg.style.color="#19b6ad"; msg.textContent="Registration successful! Loading agent registration..."; setTimeout(()=>{document.getElementById('dev-auth-section').style.display="none"; document.getElementById('main-dev-container').style.display="";},800); }
    else { msg.textContent=data.Except || "Registration failed."; }
  });
};

// ===== Agent Registration + Live Preview =====
const dynamicFields = document.getElementById('dynamic-fields');
const fieldTemplate = document.getElementById('field-row-template'); // NEW
const agentForm   = document.getElementById('agent-form');
const fieldConfig = document.getElementById('field-config');
const agentMsg    = document.getElementById('agent-msg');

const prevName   = document.getElementById('prev-name');
const prevDesc   = document.getElementById('prev-desc');
const prevType   = document.getElementById('prev-type');
const prevPrice  = document.getElementById('prev-price');
const prevInputs = document.getElementById('prev-inputs');

// --- Helpers for mapping select values (template uses Title-cased values)
const typeToTemplateValue = (t) => {
  const m = { text:'Text', file:'File', image:'Image', audio:'Audio', video:'Video', number:'Number', other:'Other' };
  return m[(t||'text').toLowerCase()] || 'Text';
};
const templateValueToType = (v) => (v || 'Text').toLowerCase();

// build fields array (reads from new stacked rows)
function getFieldArray(){
  const rows = dynamicFields.querySelectorAll('.field-row');
  const arr = [];
  rows.forEach(row=>{
    const label = row.querySelector('.field-label-input')?.value?.trim() || '';
    const type  = templateValueToType(row.querySelector('.field-type-select')?.value);
    if(label && type) arr.push({ label, type }); // keep type lowercase for backend stability
  });
  return arr;
}

// persist + trigger preview
function saveFieldConfig(){
  fieldConfig.value = JSON.stringify(getFieldArray());
  renderPreview();
}

// live preview
function renderPreview(){
  prevName.textContent  = document.getElementById('agent-name').value || 'Agent name';
  prevDesc.textContent  = document.getElementById('agent-desc').value || 'Short description…';
  const t = document.getElementById('agent-type').value || '—';
  prevType.textContent  = `Type: ${t}`;
  const price = document.getElementById('agent-price').value;
  prevPrice.textContent = price ? `$${Number(price).toFixed(2)}` : '$0.00';

  prevInputs.innerHTML = '';
  const fields = getFieldArray();
  if(!fields.length){
    const p=document.createElement('p'); p.style.color='#789'; p.textContent='Add input fields to preview…';
    prevInputs.appendChild(p); return;
  }
  fields.forEach(({label,type})=>{
    const wrap=document.createElement('div'); wrap.className='prev-field';
    const lab=document.createElement('label'); lab.textContent=label || 'Field';

    // Choose appropriate disabled control by type
    let ctrl;
    const t = (type||'text').toLowerCase();
    if (t === 'number') {
      ctrl = document.createElement('input'); ctrl.type='number'; ctrl.disabled=true; ctrl.placeholder='0';
    } else if (t === 'file' || t === 'image' || t === 'audio' || t === 'video') {
      ctrl = document.createElement('input'); ctrl.type='file'; ctrl.disabled=true;
    } else {
      ctrl = document.createElement('input'); ctrl.type='text'; ctrl.disabled=true; ctrl.placeholder='Sample input';
    }

    wrap.appendChild(lab); wrap.appendChild(ctrl); prevInputs.appendChild(wrap);
  });
}

// add/remove dynamic rows using the template (label on top, type below)
function addField(label='User Input', type='text'){
  if(!fieldTemplate) return; // safety
  const node = fieldTemplate.content.firstElementChild.cloneNode(true);

  const labelInput = node.querySelector('.field-label-input');
  const typeSelect = node.querySelector('.field-type-select');
  const removeBtn  = node.querySelector('.remove-field-btn');

  labelInput.value = label;
  typeSelect.value = typeToTemplateValue(type);

  // wire events
  labelInput.addEventListener('input', saveFieldConfig);
  typeSelect.addEventListener('change', saveFieldConfig);
  removeBtn.addEventListener('click', ()=>{
    dynamicFields.removeChild(node);
    saveFieldConfig();
  });

  dynamicFields.appendChild(node);
  saveFieldConfig();
}
document.getElementById('add-field-btn').onclick = () => addField();

// submit
agentForm.onsubmit = function(e){
  e.preventDefault();
  if(getFieldArray().length===0){ agentMsg.style.color="#e63946"; agentMsg.textContent="Add at least one agent input field!"; return; }
  agentMsg.style.color="#19b6ad"; agentMsg.textContent="Submitting agent...";
  const formData=new FormData();
  formData.append("name",  document.getElementById('agent-name').value);
  formData.append("desc",  document.getElementById('agent-desc').value);
  formData.append("type",  document.getElementById('agent-type').value);
  formData.append("price", document.getElementById('agent-price').value);
  formData.append("api_url", document.getElementById('agent-api-url').value);
  formData.append("inputs", JSON.stringify(getFieldArray())); // unchanged endpoint contract
  fetch("/api/agent-register",{method:"POST",body:formData})
    .then(r=>r.json()).then(data=>{
      if(data.status===1){ window.location.href="/marketplace"; }
      else { agentMsg.style.color="#e63946"; agentMsg.textContent=data.Except || "Failed to register agent."; }
    });
};

// hook top-level inputs to preview
['agent-name','agent-desc','agent-type','agent-price'].forEach(id=>{
  document.getElementById(id).addEventListener('input', renderPreview);
  document.getElementById(id).addEventListener('change', renderPreview);
});

// init
addField("User Input","text");
renderPreview();
