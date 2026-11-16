"""Teste no navegador do /pericias (Playwright), com o Apps Script simulado e banco zerado.
   Fluxo: configurar administrador pela tela, cadastrar autenticador, abrir o app, Minha conta, painel de usuários,
   convite de uma assistente, sessão encerrada pelo administrador. Capturas em testes/capturas/."""
import asyncio, os, re, sys, time, hmac, hashlib, base64, struct
from playwright.async_api import async_playwright

B = 'http://127.0.0.1:8787'
OUT = os.path.join(os.path.dirname(__file__), 'capturas') + '/'
os.makedirs(OUT, exist_ok=True)
res = []
def chk(c, m): res.append((c, m)); print(('  ok ' if c else '  FALHOU ') + m)
def totp(secret, d=0):
    secret = re.sub(r'\s', '', secret)
    key = base64.b32decode(secret + '=' * ((8 - len(secret) % 8) % 8))
    c = int(time.time() // 30) + d
    h = hmac.new(key, struct.pack('>Q', c), hashlib.sha1).digest()
    o = h[19] & 15
    return '%06d' % ((struct.unpack('>I', h[o:o + 4])[0] & 0x7fffffff) % 1000000)

async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch(executable_path=os.environ.get('CHROME') or None, args=['--no-sandbox'])
        ctx = await br.new_context(viewport={'width': 1280, 'height': 860})
        pg = await ctx.new_page(); erros = []
        pg.on('pageerror', lambda e: erros.append(str(e)))
        pg.on('console', lambda m: erros.append(m.text) if m.type == 'error' else None)

        # ---------- configurar o administrador pela tela ----------
        await pg.goto(B + '/pericias/'); await pg.wait_for_selector('#en-login')
        await pg.screenshot(path=OUT + 'p01-entrada.png')
        await pg.click('text=Configurar o primeiro administrador')
        await pg.fill('#en-cf-cod', 'pericias-teste-123'); await pg.fill('#en-cf-nome', 'Dr. Bruno Thomás Michels')
        await pg.fill('#en-cf-login', 'bruno'); await pg.fill('#en-cf-senha', 'SenhaForte2026')
        await pg.click('button:has-text("Criar administrador")')
        # ---------- o app abre em modo site ----------
        await pg.wait_for_selector('#tela-app:not([hidden])', timeout=20000)
        await pg.wait_for_selector('.conteudo :is(.kpi, .card, section, .bloco)', timeout=20000); await pg.wait_for_timeout(1200)
        await pg.screenshot(path=OUT + 'p04-app-painel.png')
        chk(await pg.inner_text('#nav-user') == 'Dr. Bruno Thomás Michels', 'nome de exibição no menu, com link para Minha conta')
        txt = await pg.inner_text('#conteudo'); chk('Fictício' in txt or 'Processos' in txt or 'Prazos' in txt, 'painel com dados da planilha (simulada)')
        await pg.evaluate("location.hash='#processos'"); await pg.click('[data-view="processos"]'); await pg.wait_for_timeout(800)
        chk('Paciente Fictício Um' in await pg.inner_text('#conteudo'), 'lista de processos carregada pelo repasse')
        await pg.screenshot(path=OUT + 'p05-app-processos.png')

        # ---------- Minha conta e painel de usuários ----------
        await pg.click('#nav-user a'); await pg.wait_for_selector('.pf-card'); await pg.wait_for_timeout(800)
        await pg.screenshot(path=OUT + 'p06-minha-conta.png', full_page=True)
        chk(await pg.is_visible('text=Desativada.'), 'duas etapas desligadas por padrão')
        # ligar as duas etapas é opcional, pela Minha conta
        await pg.click('.pf-card:has-text("Verificação em duas etapas") button:has-text("Ativar")'); await pg.wait_for_selector('.en-qr'); await pg.wait_for_timeout(300)
        await pg.screenshot(path=OUT + 'p02-ativar-2etapas-opcional.png', full_page=True)
        chk(await pg.locator('.en-qr svg path').count() == 1, 'QR code desenhado')
        await pg.click('text=Não consigo ler o QR code'); segredo = (await pg.inner_text('.en-segredo')).replace(' ', '')
        await pg.fill('.pf-2fa .en-codigo-in', totp(segredo)); await pg.click('.pf-2fa button:has-text("Confirmar")')
        await pg.wait_for_selector('.en-codigos'); codigos = await pg.locator('.en-codigos code').all_inner_texts()
        chk(len(codigos) == 10, '10 códigos de recuperação mostrados')
        await pg.screenshot(path=OUT + 'p03-codigos-recuperacao.png', full_page=True)
        await pg.check('.en-check input'); await pg.click('.en-rec button.primario'); await pg.wait_for_selector('text=Ativa.')
        chk(True, 'duas etapas ativadas por opção própria')
        await pg.click('.pf-abas >> text=Usuários'); await pg.wait_for_selector('text=Nova conta')
        inputs = pg.locator('.pf-card:has-text("Nova conta") input.pf-in')
        await inputs.nth(0).fill('Ana Paula Souza'); await inputs.nth(1).fill('ana'); await inputs.nth(4).fill('17991112222')
        chk(await inputs.nth(2).input_value() == 'ana', 'usuário da planilha sugerido a partir do login')
        await pg.click('button:has-text("Criar conta e gerar convite")'); await pg.wait_for_selector('.pf-link code'); await pg.wait_for_timeout(400)
        link = await pg.inner_text('.pf-link code')
        await pg.screenshot(path=OUT + 'p07-usuarios-convite.png', full_page=True)
        chk('#definir=' in link, 'convite gerado: ' + link[:50] + '...')
        await pg.click('.pf-item.link:has-text("Ana Paula Souza")'); await pg.wait_for_selector('.pf-cab'); await pg.wait_for_timeout(300)
        await pg.screenshot(path=OUT + 'p08-usuario-detalhe.png', full_page=True)
        await pg.click('.pf-abas >> text=Ajustes'); await pg.wait_for_selector('.pf-sw'); await pg.wait_for_timeout(200)
        await pg.screenshot(path=OUT + 'p09-ajustes.png', full_page=True)
        await pg.click('.pf-abas >> text=Registro'); await pg.wait_for_selector('.pf-log > div'); await pg.wait_for_timeout(300)
        await pg.screenshot(path=OUT + 'p10-registro.png')

        # ---------- a assistente aceita o convite (celular) ----------
        c2 = await br.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
        p2 = await c2.new_page(); e2 = []
        p2.on('pageerror', lambda e: e2.append(str(e)))
        await p2.goto(link.replace('https://', 'http://')); await p2.wait_for_selector('#en-n1')
        await p2.screenshot(path=OUT + 'p11-convite-celular.png')
        await p2.fill('#en-n1', 'AnaSenha2026'); await p2.fill('#en-n2', 'AnaSenha2026'); await p2.click('button:has-text("Salvar senha")')
        await p2.wait_for_selector('#tela-app:not([hidden])', timeout=20000); await p2.wait_for_timeout(1500)
        await p2.screenshot(path=OUT + 'p13-app-assistente-celular.png')
        nav = await p2.inner_text('#nav-itens')
        chk('Financeiro' not in nav, 'assistente não vê o Financeiro')
        await p2.click('[data-acao="nav-mais"]'); await p2.wait_for_timeout(300)
        chk(await p2.is_visible('#nav-mais >> text=Minha conta'), 'no celular, Minha conta fica em "Mais"')
        await p2.click('#nav-mais >> text=Minha conta'); await p2.wait_for_selector('.pf-card'); await p2.wait_for_timeout(600)
        await p2.screenshot(path=OUT + 'p14-minha-conta-celular.png', full_page=True)
        chk(not await p2.is_visible('.pf-abas'), 'assistente não vê as abas de administração')

        # ---------- administrador desconecta a assistente: o app dela volta para a entrada ----------
        await pg.goto(B + '/pericias/perfil/#usuarios'); await pg.wait_for_selector('.pf-item.link')
        await pg.click('.pf-item.link:has-text("Ana Paula Souza")'); await pg.wait_for_selector('button:has-text("Desconectar aparelhos")')
        await pg.click('button:has-text("Desconectar aparelhos")'); await pg.wait_for_timeout(800)
        await p2.goto(B + '/pericias/'); await p2.wait_for_selector('#en-login', timeout=10000)
        chk(True, 'assistente desconectada volta para a tela de entrada')
        await p2.fill('#en-login', 'ana'); await p2.fill('#en-senha', 'AnaSenha2026'); await p2.click('.en-form button.primario')
        await p2.wait_for_selector('#tela-app:not([hidden])', timeout=20000)
        chk(True, 'assistente entra só com login e senha')

        # o administrador, que ligou as duas etapas, precisa do código
        c3 = await br.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True); p3 = await c3.new_page()
        await p3.goto(B + '/pericias/'); await p3.wait_for_selector('#en-login')
        await p3.fill('#en-login', 'bruno'); await p3.fill('#en-senha', 'SenhaForte2026'); await p3.click('.en-form button.primario')
        await p3.wait_for_selector('#en-codigo'); await p3.screenshot(path=OUT + 'p15-codigo-celular.png')
        await p3.fill('#en-codigo', totp(segredo, 1))  # envia sozinho ao completar 6 números
        await p3.wait_for_selector('#tela-app:not([hidden])', timeout=20000)
        chk(True, 'quem ligou as duas etapas entra com o código (envio automático)')

        # ---------- sair ----------
        await pg.goto(B + '/pericias/'); await pg.wait_for_selector('#tela-app:not([hidden])', timeout=20000)
        await pg.click('#btn-sair'); await pg.wait_for_selector('#en-login', timeout=10000)
        chk(await pg.evaluate('typeof window.PERICIAS_SESSAO') == 'undefined', 'sair volta para a entrada sem dados na página')

        bloqueios = [e for e in erros + e2 if 'Content Security Policy' in e or 'Refused' in e]
        chk(not bloqueios, 'nenhum bloqueio da política de segurança: %s' % bloqueios[:2])
        outros = [e for e in erros + e2 if e not in bloqueios and 'Failed to load resource' not in e and 'fonts.g' not in e]
        chk(not outros, 'sem erros de JavaScript: %s' % outros[:3])
        await br.close()
    bad = [m for c, m in res if not c]; print('\n%d ok, %d falharam' % (len(res) - len(bad), len(bad))); sys.exit(1 if bad else 0)
asyncio.run(main())
