
const header = document.querySelector('header');
const topBtn = document.querySelector('.top-btn');
window.addEventListener('scroll', ()=>{
  header.classList.toggle('scrolled', window.scrollY > 50);
  topBtn.classList.toggle('show', window.scrollY > 300);
  activateLink();
});
/* mobile menu */
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');
hamburger.addEventListener('click', ()=>{
  navLinks.classList.toggle('open');
  hamburger.classList.toggle('open');
});
document.querySelectorAll('.nav-links a').forEach(link=>{
  link.addEventListener('click', ()=>{
    navLinks.classList.remove('open');
    hamburger.classList.remove('open');
  });
});
/* active link highlight */
const sections = document.querySelectorAll('section');
const navItems = document.querySelectorAll('.nav-links a');
function activateLink(){
  let index = sections.length;
  while(--index && window.scrollY + 200 < sections[index].offsetTop){}
  navItems.forEach(i=>i.classList.remove('active'));
  navItems[index]?.classList.add('active');
}
activateLink();
/* back to top */
topBtn.addEventListener('click', ()=>window.scrollTo({top:0,behavior:'smooth'}));
