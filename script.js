// ============================================================
// ALECOM — script.js
// Menú móvil · Galería filtrable · Lightbox
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

  /* ---------- Menú móvil ---------- */
  const burger = document.getElementById('navBurger');
  const mobileNav = document.getElementById('navMobile');
  if (burger && mobileNav){
    burger.addEventListener('click', () => {
      mobileNav.classList.toggle('is-open');
    });
    mobileNav.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => mobileNav.classList.remove('is-open'));
    });
  }

  /* ---------- Datos de la galería ---------- */
  const projects = [
    { src: 'img/gallery/fachada-01.jpg', cat: 'fachada', label: 'Fachada residencial — vidrio y aluminio' },
    { src: 'img/gallery/fachada-02.jpg', cat: 'fachada', label: 'Volumen con celosía de madera y vidrio' },
    { src: 'img/gallery/fachada-03.jpg', cat: 'fachada', label: 'Fachada minimalista con ventanería negra' },
    { src: 'img/gallery/fachada-04.jpg', cat: 'fachada', label: 'Detalle de fachada con listones de madera' },

    { src: 'img/gallery/mampara-01.jpg', cat: 'mampara', label: 'Mampara corredera frente a playa' },
    { src: 'img/gallery/mampara-02.jpg', cat: 'mampara', label: 'Mampara de piso a techo hacia jardín' },
    { src: 'img/gallery/mampara-03.jpg', cat: 'mampara', label: 'Mampara bajo pérgola, acceso a terraza' },
    { src: 'img/gallery/mampara-04.jpg', cat: 'mampara', label: 'Mampara corredera en comedor' },
    { src: 'img/gallery/mampara-05.jpg', cat: 'mampara', label: 'Mampara de doble altura' },
    { src: 'img/gallery/mampara-06.jpg', cat: 'mampara', label: 'Mampara hacia patio con pérgola de madera' },
    { src: 'img/gallery/mampara-07.jpg', cat: 'mampara', label: 'Mampara con perfil negro, vista a jardín' },

    { src: 'img/gallery/ventana-eu-01.jpg', cat: 'ventana-eu', label: 'Ventana europea, perfil oscuro' },
    { src: 'img/gallery/ventana-eu-02.jpg', cat: 'ventana-eu', label: 'Ventana europea sobre área verde' },
    { src: 'img/gallery/ventana-eu-03.jpg', cat: 'ventana-eu', label: 'Ventana con marco madera, fachada blanca' },
    { src: 'img/gallery/ventana-eu-04.jpg', cat: 'ventana-eu', label: 'Serie Thermia® CR46 Magna' },
    { src: 'img/gallery/ventana-eu-05.jpg', cat: 'ventana-eu', label: 'Ventana exterior, acabado madera' },
    { src: 'img/gallery/ventana-eu-06.jpg', cat: 'ventana-eu', label: 'Ventana con vista panorámica al mar' },

    { src: 'img/gallery/puerta-01.jpg', cat: 'puerta', label: 'Puerta corredera de vidrio templado' },
    { src: 'img/gallery/puerta-02.jpg', cat: 'puerta', label: 'Acceso principal con marco de aluminio' },
    { src: 'img/gallery/puerta-03.jpg', cat: 'puerta', label: 'Puerta corredera, vista nocturna' },

    { src: 'img/gallery/baranda-01.jpg', cat: 'baranda', label: 'Baranda de vidrio en escalera interior' },
    { src: 'img/gallery/baranda-02.jpg', cat: 'baranda', label: 'Baranda perimetral con vista al jardín' },
    { src: 'img/gallery/baranda-03.jpg', cat: 'baranda', label: 'Pasamanos con iluminación LED integrada' },
    { src: 'img/gallery/baranda-04.jpg', cat: 'baranda', label: 'Baranda de vidrio en escalera de madera' },
    { src: 'img/gallery/baranda-05.jpg', cat: 'baranda', label: 'Baranda de vidrio en terraza' },

    { src: 'img/gallery/oficina-01.jpg', cat: 'oficina', label: 'División de oficina, perfil acero negro' },
    { src: 'img/gallery/oficina-02.jpg', cat: 'oficina', label: 'Sala de reuniones con muro de vidrio' },
    { src: 'img/gallery/oficina-03.jpg', cat: 'oficina', label: 'Pasillo corporativo con divisiones de vidrio' },
    { src: 'img/gallery/oficina-04.jpg', cat: 'oficina', label: 'Oficina con persiana de aluminio integrada' },
    { src: 'img/gallery/oficina-05.jpg', cat: 'oficina', label: 'División tipo steel frame, vista interior' },

    { src: 'img/gallery/bano-01.jpg', cat: 'bano', label: 'Mampara de ducha en baño moderno' },
    { src: 'img/gallery/bano-02.jpg', cat: 'bano', label: 'Mampara de ducha, perfil negro' },
    { src: 'img/gallery/bano-03.jpg', cat: 'bano', label: 'Mampara de ducha abatible' },
    { src: 'img/gallery/bano-04.jpg', cat: 'bano', label: 'Espejo y mampara en baño premium' },

    { src: 'img/gallery/interior-01.jpg', cat: 'bano', label: 'Espejo decorativo con retroiluminación' },
    { src: 'img/gallery/interior-02.jpg', cat: 'oficina', label: 'Detalle de vidrio en interior residencial' },
    { src: 'img/gallery/interior-03.jpg', cat: 'mampara', label: 'Espejo de baño con marco de madera' },
  ];

  /* ---------- Render de galería ---------- */
  const grid = document.getElementById('galleryGrid');
  if (grid){
    grid.innerHTML = projects.map((p, i) => `
      <button class="gallery-item" type="button" data-cat="${p.cat}" data-idx="${i}" aria-label="Ver imagen: ${p.label}">
        <img src="${p.src}" alt="${p.label}" loading="lazy">
        <span class="gallery-item-label">${p.label}</span>
      </button>
    `).join('');
  }

  /* ---------- Filtros ---------- */
  const filterBtns = document.querySelectorAll('.filter-btn');
  const items = document.querySelectorAll('.gallery-item');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      const filter = btn.dataset.filter;
      items.forEach(item => {
        const show = filter === 'all' || item.dataset.cat === filter;
        item.classList.toggle('is-hidden', !show);
      });
    });
  });

  /* ---------- Lightbox ---------- */
  const lightbox = document.createElement('div');
  lightbox.className = 'lightbox';
  lightbox.innerHTML = `
    <button class="lightbox-close" aria-label="Cerrar">&times;</button>
    <img src="" alt="">
  `;
  document.body.appendChild(lightbox);
  const lightboxImg = lightbox.querySelector('img');
  const lightboxClose = lightbox.querySelector('.lightbox-close');

  function openLightbox(src, alt){
    lightboxImg.src = src;
    lightboxImg.alt = alt;
    lightbox.classList.add('is-open');
  }
  function closeLightbox(){
    lightbox.classList.remove('is-open');
    lightboxImg.src = '';
  }

  document.addEventListener('click', (e) => {
    const item = e.target.closest('.gallery-item');
    if (item){
      const idx = parseInt(item.dataset.idx, 10);
      const p = projects[idx];
      if (p) openLightbox(p.src, p.label);
    }
  });
  lightboxClose.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox();
  });

});
