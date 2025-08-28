document.getElementById('register-form').onsubmit = async function(e) {
  e.preventDefault();
  const email = document.getElementById('register-email').value.trim();
  const pw = document.getElementById('register-password').value;
  const pw2 = document.getElementById('register-password2').value;
  const msg = document.getElementById('register-msg');
  if (!email || !pw || !pw2) {
    msg.textContent = "All fields are required.";
    return;
  }
  if (pw !== pw2) {
    msg.textContent = "Passwords do not match.";
    return;
  }
  const formData = new FormData();
  formData.append("name", email);  // You can use another value for name if you want a real name field
  formData.append("email", email);
  formData.append("password", pw);

  const res = await fetch("/api/register", {
    method: "POST",
    body: formData
  });
  const result = await res.json();
  if (result.status === 1) {
    localStorage.setItem('marketplaceUser', email);
    msg.style.color = "#19b6ad";
    msg.textContent = "Registration successful! Redirecting...";
    setTimeout(() => window.location.href = "/marketplace", 1200);
  } else {
    msg.style.color = "#e63946";
    msg.textContent = result.Except || "Registration failed.";
  }
};
