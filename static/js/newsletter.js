// Show/hide persistent login banner if user is not logged in
window.addEventListener('DOMContentLoaded', function() {
  if (!localStorage.getItem('marketplaceUser')) {
    document.getElementById('directory-access-banner').style.display = "flex";
  }
});

// Newsletter subscription confirmation logic
document.getElementById('newsletter-form').onsubmit = async function(e) {
  e.preventDefault();

  const name = document.getElementById('newsletter-name').value.trim();
  const email = document.getElementById('newsletter-email').value.trim();
  const checkboxes = document.querySelectorAll('input[name="area[]"]:checked');
  const categories = Array.from(checkboxes).map(cb => cb.value);

  const btn = document.getElementById('newsletter-submit');
  btn.disabled = true;
  btn.textContent = "Subscribing...";

  const res = await fetch("/api/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, categories })
  });

  const result = await res.json();
  if (result.status === 1) {
    document.getElementById('newsletter-form').style.display = "none";
    document.getElementById('newsletter-success').style.display = "block";
  } else {
    alert("Subscription failed: " + (result.error || "unknown error"));
    btn.disabled = false;
    btn.textContent = "Subscribe";
  }

  const params = new URLSearchParams(window.location.search);
  if (params.get("next") === "/directory") {
    window.location.href = "/directory";
    return;
  }
};

// Intersection Observer animation
document.addEventListener('DOMContentLoaded',function(){
  const obs=new IntersectionObserver((entries)=>{
    entries.forEach((e,i)=>{
      if(e.isIntersecting){
        setTimeout(()=>e.target.classList.add('visible'), i*120);
      }
    });
  },{threshold:.15});
  document.querySelectorAll('.animate').forEach(el=>obs.observe(el));
});
