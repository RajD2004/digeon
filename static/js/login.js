document.getElementById('login-form').onsubmit = async function(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const pw = document.getElementById('login-password').value;
  const msg = document.getElementById('login-msg');

  if (!email || !pw) {
    msg.textContent = "All fields are required.";
    return;
  }

  const formData = new FormData();
  formData.append("email", email);
  formData.append("password", pw);

  const res = await fetch("/api/login", { method: "POST", body: formData });
  const result = await res.json();

  if (result.status === 1) {
    localStorage.setItem("marketplaceUser", email);
    msg.style.color = "#19b6ad";
    msg.textContent = "Login successful! Redirecting...";

    const params = new URLSearchParams(window.location.search);
    const nextUrl = params.get("next") || "/marketplace";
    setTimeout(() => window.location.href = nextUrl, 600);
  } else {
    msg.style.color = "#e63946";
    msg.textContent = result.Except || "Invalid email or password.";
  }
};
