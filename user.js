// small script to toggle Bulma-like navbar burger and menu
document.addEventListener('DOMContentLoaded', function () {
  const burger = document.querySelector('.navbar-burger');
  const menu = document.getElementById('menu');
  if (!burger) return;

  burger.addEventListener('click', function () {
    const active = burger.classList.toggle('is-active');
    if (menu) menu.classList.toggle('is-active', active);
  });
});
