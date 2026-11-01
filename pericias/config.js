// URL do app da Web do Apps Script (termina em /exec).
// Veja o passo a passo em pericias/LEIA-ME.md
window.PERICIAS_CONFIG = {
  API: 'https://script.google.com/macros/s/AKfycbxdYxLIQNJuQEgIYvz3RdlwitgR_7aUYoywhYoB0abE4oigpZttzAEdwUeNfpWTmoc4/exec',
  // Valor da UFESP usado para estimar honorários fixados em UFESP (2026: R$ 38,42, Comunicado DICAR 88/2025).
  // Atualize todo mês de janeiro.
  UFESP: 38.42,
  // De quantos em quantos dias conferir nos autos os processos que só aguardam decisão, depósito ou pagamento.
  CONFERIR_DIAS: 3
};
