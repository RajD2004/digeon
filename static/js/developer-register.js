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
const agentForm   = document.getElementById('agent-form');
const fieldConfig = document.getElementById('field-config');
const agentMsg    = document.getElementById('agent-msg');

const prevName   = document.getElementById('prev-name');
const prevDesc   = document.getElementById('prev-desc');
const prevType   = document.getElementById('prev-type');
const prevPrice  = document.getElementById('prev-price');
const prevInputs = document.getElementById('prev-inputs');

// build fields array
function getFieldArray(){
  const arr = [];
  for(const row of dynamicFields.children){
    const label = row.querySelector('.field-label').value;
    const type  = row.querySelector('.field-type').value;
    if(label && type) arr.push({label, type});
  }
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
    const ctrl=document.createElement('input'); ctrl.disabled=true; ctrl.type=(type==='file')?'file':'text'; if(type!=='file') ctrl.placeholder='Sample input';
    wrap.appendChild(lab); wrap.appendChild(ctrl); prevInputs.appendChild(wrap);
  });
}

// add/remove dynamic rows
function addField(label='', type='text'){
  const row=document.createElement('div');
  row.className='dyn-field-row';
  row.innerHTML=`
    <input type="text" class="field-label" placeholder="Enter label (e.g., Prompt, Upload PDF)" value="${label}" required maxlength="32">
    <select class="field-type">
      <option value="text" ${type==='text'?'selected':''}>Text</option>
      <option value="file" ${type==='file'?'selected':''}>File</option>
    </select>
    <button type="button" class="remove-field-btn" title="Remove Field">&times;</button>
  `;
  row.querySelector('.remove-field-btn').onclick = function(){ dynamicFields.removeChild(row); saveFieldConfig(); };
  row.querySelector('.field-label').oninput  = saveFieldConfig;
  row.querySelector('.field-type').onchange = saveFieldConfig;
  dynamicFields.appendChild(row);
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
  formData.append("inputs", JSON.stringify(getFieldArray()));
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
