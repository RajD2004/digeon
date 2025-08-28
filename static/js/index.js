// Moved from inline footer <script>
document.addEventListener('DOMContentLoaded', function () {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry, idx) => {
        if (entry.isIntersecting) {
          setTimeout(
            () => entry.target.classList.add('visible'),
            idx * 120
          );
        }
      });
    },
    { threshold: 0.15 }
  );

  document.querySelectorAll('.animate').forEach((el) => observer.observe(el));
});
