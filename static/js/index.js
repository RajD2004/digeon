// Homepage animations
document.addEventListener('DOMContentLoaded', function () {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry, idx) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target); // reveal once
          }, idx * 120);
        }
      });
    },
    { threshold: 0.15 }
  );

  const animatedEls = document.querySelectorAll('.animate');
  if (animatedEls.length > 0) {
    animatedEls.forEach((el) => observer.observe(el));
  }
});
