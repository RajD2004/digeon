
const dynamicFields = document.getElementById('dynamic-fields');
const fieldTemplate = document.getElementById('field-row-template');
const agentForm   = document.getElementById('agent-form');
const fieldConfig = document.getElementById('field-config');
const agentMsg    = document.getElementById('agent-msg');

const prevName   = document.getElementById('prev-name');
const prevDesc   = document.getElementById('prev-desc');
const prevType   = document.getElementById('prev-type');
const prevPrice  = document.getElementById('prev-price');
const prevInputs = document.getElementById('prev-inputs');

const typeToTemplateValue = (t) => {
  const m = { text:'Text', file:'File', image:'Image', audio:'Audio', video:'Video', number:'Number', other:'Other' };
  return m[(t||'text').toLowerCase()] || 'Text';
};
const templateValueToType = (v) => (v || 'Text').toLowerCase();

function getFieldArray(){
  const rows = dynamicFields.querySelectorAll('.field-row');
  const arr = [];
  rows.forEach(row=>{
    const label = row.querySelector('.field-label-input')?.value?.trim() || '';
    const type  = templateValueToType(row.querySelector('.field-type-select')?.value);
    if(label && type) arr.push({ label, type });
  });
  return arr;
}

function saveFieldConfig(){
  fieldConfig.value = JSON.stringify(getFieldArray());
  renderPreview();
}

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

    let ctrl;
    const tt = (type||'text').toLowerCase();
    if (tt === 'number') {
      ctrl = document.createElement('input'); ctrl.type='number'; ctrl.disabled=true; ctrl.placeholder='0';
    } else if (tt === 'file' || tt === 'image' || tt === 'audio' || tt === 'video') {
      ctrl = document.createElement('input'); ctrl.type='file'; ctrl.disabled=true;
    } else {
      ctrl = document.createElement('input'); ctrl.type='text'; ctrl.disabled=true; ctrl.placeholder='Sample input';
    }

    wrap.appendChild(lab); wrap.appendChild(ctrl); prevInputs.appendChild(wrap);
  });
}

function addField(label='User Input', type='text'){
  if(!fieldTemplate) return;
  const node = fieldTemplate.content.firstElementChild.cloneNode(true);

  const labelInput = node.querySelector('.field-label-input');
  const typeSelect = node.querySelector('.field-type-select');
  const removeBtn  = node.querySelector('.remove-field-btn');

  labelInput.value = label;
  typeSelect.value = typeToTemplateValue(type);

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

['agent-name','agent-desc','agent-type','agent-price'].forEach(id=>{
  document.getElementById(id).addEventListener('input', renderPreview);
  document.getElementById(id).addEventListener('change', renderPreview);
});

addField("User Input","text");
renderPreview();
