// tema: escuro por padrão; aplicado antes de desenhar a tela para não piscar
try { document.documentElement.dataset.tema = localStorage.getItem('pericias_tema') === 'claro' ? 'claro' : 'escuro'; } catch (e) { document.documentElement.dataset.tema = 'escuro'; }
