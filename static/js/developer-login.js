const tabLogin = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');
const devLoginSection = document.getElementById('dev-login-section');
const devRegisterSection = document.getElementById('dev-register-section');

tabLogin.onclick = () => {
  tabLogin.classList.add('active');
  tabRegister.classList.remove('active');
  devLoginSection.style.display='';
  devRegisterSection.style.display='none';
};

tabRegister.onclick = () => {
  tabLogin.classList.remove('active');
  tabRegister.classList.add('active');
  devLoginSection.style.display='none';
  devRegisterSection.style.display='';
};

// Decide where to go after login/register: use ?next= if present, else /developer
function nextUrlOrDefault() {
  const next = new URLSearchParams(location.search).get('next');
  return (next && next.startsWith('/')) ? next : '/developer';
}

// Dev login
document.getElementById('dev-login-form').onsubmit = function(e){
  e.preventDefault();
  const email = document.getElementById('dev-login-email').value.trim();
  const pw = document.getElementById('dev-login-password').value;
  const msg = document.getElementById('dev-login-msg');
  msg.style.color = "#e63946";
  if(!email || !pw){
    msg.textContent="All fields are required.";
    return;
  }
  const formData = new FormData();
  formData.append("email",email);
  formData.append("password",pw);
  fetch("/api/dev-login",{method:"POST",body:formData})
    .then(r=>r.json())
    .then(data=>{
      if(data.status===1){
        window.location.href = nextUrlOrDefault();   // <-- fixed
      } else {
        msg.textContent = data.Except || "Invalid credentials or developer not registered.";
      }
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
  if(!email || !pw || !pw2){
    msg.textContent="All fields are required.";
    return;
  }
  if(pw!==pw2){
    msg.textContent="Passwords do not match.";
    return;
  }
  const formData=new FormData();
  formData.append("email",email);
  formData.append("password",pw);
  fetch("/api/dev-register",{method:"POST",body:formData})
    .then(r=>r.json())
    .then(data=>{
      if(data.status===1){
        window.location.href = nextUrlOrDefault();   // <-- fixed
      } else {
        msg.textContent=data.Except || "Registration failed.";
      }
    });
};
