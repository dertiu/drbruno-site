// ==UserScript==
// @name         Perícias: abrir processo no eproc
// @namespace    https://brunomichels.com.br/pericias
// @version      1.1
// @description  O botão "eproc" do app Perícias abre direto a página do processo no eproc do TJSP (com login já feito).
// @match        https://eproc1g.tjsp.jus.br/eproc/*
// @match        https://eproc1g-ef.tjsp.jus.br/eproc/*
// @match        https://eproc2g.tjsp.jus.br/eproc/*
// @match        https://sso.tjsp.jus.br/*
// @match        https://brunomichels.com.br/pericias/*
// @match        https://www.brunomichels.com.br/pericias/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @run-at       document-start
// @downloadURL  https://brunomichels.com.br/pericias/eproc-atalho.user.js
// @updateURL    https://brunomichels.com.br/pericias/eproc-atalho.user.js
// ==/UserScript==

(function () {
  'use strict';
  const VALIDADE = 10 * 60 * 1000; // pedido vale 10 minutos (tempo para fazer login, se precisar)
  const host = location.hostname;
  const quandoPronto = fn => (document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn) : fn());

  // 1) No app: avisa que o atalho está instalado
  if (/brunomichels\.com\.br$/.test(host)) {
    quandoPronto(() => document.documentElement.setAttribute('data-eproc-atalho', '1'));
    return;
  }

  // 2) Guarda o número vindo do app (#pericias=NNNNNNNNNNNNNNNNNNNN), inclusive na tela de login
  const m = location.hash.match(/pericias=(\d{20})/);
  if (m) {
    GM_setValue('pericias_proc', JSON.stringify({ n: m[1], t: Date.now() }));
    history.replaceState(null, '', location.href.replace(/#.*$/, ''));
  }
  if (host === 'sso.tjsp.jus.br') return; // depois do login o eproc continua daqui

  let pedido = null;
  try { pedido = JSON.parse(GM_getValue('pericias_proc', 'null')); } catch (e) {}
  if (!pedido || !pedido.n || Date.now() - pedido.t > VALIDADE) return;

  // 3) Aviso "Usuário logado como ... Utilize o botão Sair do Sistema": a página guarda o texto
  //    num <textarea id="txaInfraValidacao"> e chama alert() 300 ms depois. Trocando o id do
  //    textarea antes disso, o alert não aparece. Só mexe nesse aviso, e só quando veio do app.
  const tirarAviso = () => {
    const t = document.getElementById('txaInfraValidacao');
    if (t && /logado como/i.test(t.value || t.textContent)) { t.id = 'txaInfraValidacao-pericias'; return true; }
    return false;
  };
  const obs = new MutationObserver(() => { if (tirarAviso()) obs.disconnect(); });
  obs.observe(document, { childList: true, subtree: true });
  quandoPronto(() => { tirarAviso(); setTimeout(() => obs.disconnect(), 2000); });

  // 4) Já logado: preenche a busca rápida do topo e abre o processo
  quandoPronto(() => {
    let tentativas = 0;
    const timer = setInterval(() => {
      const campo = document.getElementById('txtNumProcessoPesquisaRapida');
      if (campo && campo.form) {
        clearInterval(timer);
        GM_deleteValue('pericias_proc');
        campo.value = pedido.n;
        const btn = campo.form.querySelector('[name=btnPesquisaRapidaSubmit]');
        if (btn) btn.click(); else campo.form.submit();
      } else if (++tentativas > 60) clearInterval(timer); // desiste em 30 s (página sem a busca)
    }, 300);
  });
})();
