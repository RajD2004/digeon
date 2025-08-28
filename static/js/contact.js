const form = document.getElementById('contact-form');
const status = document.getElementById('status');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = Object.fromEntries(new FormData(form).entries());

  try {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (res.ok && data.ok) {
      status.textContent = "Message sent successfully!";
      status.style.color = "lightgreen";
      form.reset();
    } else {
      status.textContent = data.error || "Failed to send.";
      status.style.color = "red";
    }
  } catch {
    status.textContent = "Network error.";
    status.style.color = "red";
  }
});
