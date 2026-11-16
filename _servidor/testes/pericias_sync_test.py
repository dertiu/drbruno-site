"""Teste de dois usuários ao mesmo tempo no /pericias: sincronia, presença, ficha presa ao processo e conflito.
   Banco zerado, Apps Script simulado ligado e PERICIAS_SYNC_TESTE=1 no .dev.vars."""
import asyncio, json, os, re, sys, time, requests
from playwright.async_api import async_playwright

B, G = 'http://127.0.0.1:8787', 'http://127.0.0.1:8898'
H = {'Content-Type': 'application/json', 'Origin': B}
OUT = os.path.join(os.path.dirname(__file__), 'capturas') + '/'
res = []
def chk(c, m): res.append((c, m)); print(('  ok ' if c else '  FALHOU ') + m)
class S(requests.Session):
    def request(self, *a, **k):
        r = super().request(*a, **k)
        m = re.search(r'__Secure-pericias=([^;]*)', r.headers.get('Set-Cookie', ''))
        if m: self.headers['Cookie'] = '__Secure-pericias=' + m.group(1)
        return r
def post(s, p, b): return s.post(B + '/pericias/conta/' + p, data=json.dumps(b), headers=H)
def app(s, acao, b, proc=''):
    return s.post(B + '/pericias/api?acao=' + acao + ('&proc=' + proc if proc else ''), data=json.dumps(dict(b, acao=acao)), headers=H).json()
def sync(s, v, ficha='', ed=False): return post(s, 'sincronia', {'v': v, 'ficha': ficha, 'editando': ed, 'pres': True}).json()
P1, P3 = '1000001-11.2026.8.26.0576', '1000003-33.2026.8.26.0576'
d = lambda p: re.sub(r'\D', '', p)

print('== preparar contas')
adm = S(); r = post(adm, 'configurar', {'codigo': 'pericias-teste-123', 'nome': 'Dr. Bruno Thomás Michels', 'login': 'bruno', 'senha': 'SenhaForte2026'}); chk(r.json()['etapa'] == 'pronto', 'administrador')
tk = post(adm, 'admin/criar', {'nome': 'Ana Paula Souza', 'login': 'ana', 'papel': 'assistente'}).json()['link'].split('#definir=')[1]
ana = S(); chk(post(ana, 'convite/definir', {'token': tk, 'senha': 'AnaSenha2026'}).json()['etapa'] == 'pronto', 'assistente')

print('== sincronia pela API')
v0 = post(adm, 'sincronia', {'v': None}).json()['v']; post(ana, 'sincronia', {'v': None})
j = sync(ana, v0, d(P3), True)
j = sync(adm, v0); p = j['presenca']
chk(len(p) == 1 and p[0]['chave'] == 'ana' and p[0]['proc'] == d(P3) and p[0]['editando'] == 1, 'presença: Ana editando o processo 3')
j = app(ana, 'salvar', {'aba': 'PERICIAS', 'linha': 4, 'processoEsperado': P3, 'dados': {'OBSERVACAO': 'nota da Ana'}, 'esperado': {'OBSERVACAO': ''}}, d(P3)); chk(j.get('ok'), 'Ana salvou')
j = sync(adm, v0); m = j['mudancas']
chk(len(m) == 1 and m[0]['chave'] == 'ana' and m[0]['acao'] == 'salvar' and m[0]['proc'] == d(P3), 'Bruno recebe a mudança da Ana na hora %s' % m)
v1 = j['v']
j = app(adm, 'salvar', {'aba': 'PERICIAS', 'linha': 4, 'processoEsperado': P3, 'dados': {'OBSERVACAO': 'nota do Bruno'}, 'esperado': {'OBSERVACAO': ''}}, d(P3))
chk(j.get('erro') == 'CONFLITO_CAMPO', 'Bruno com tela antiga não grava por cima da Ana (conflito)')
chk(sync(ana, v1)['mudancas'] == [], 'gravação recusada não vira mudança')
time.sleep(2.2); requests.get(G + '/editar-planilha'); time.sleep(2.2)
sync(adm, v1); time.sleep(1.2); j = sync(adm, v1)
chk(any(x['acao'] == 'planilha' for x in j['mudancas']), 'mudança feita direto na planilha também avisa')
post(adm, 'sair', {}); post(ana, 'sair', {})

async def ui():
    async with async_playwright() as pw:
        br = await pw.chromium.launch(executable_path=os.environ.get('CHROME') or None, args=['--no-sandbox'])
        async def entrar(login, senha, w=1180):
            c = await br.new_context(viewport={'width': w, 'height': 820}); pg = await c.new_page(); er = []
            pg.on('pageerror', lambda e: er.append(str(e)))
            await pg.goto(B + '/pericias/'); await pg.wait_for_selector('#en-login')
            await pg.fill('#en-login', login); await pg.fill('#en-senha', senha); await pg.click('.en-form button.primario')
            await pg.wait_for_selector('#tela-app:not([hidden])', timeout=20000); await pg.wait_for_timeout(1500)
            return pg, er
        pb, eb = await entrar('bruno', 'SenhaForte2026')
        pa, ea = await entrar('ana', 'AnaSenha2026')
        async def abrir(pg, nome):
            await pg.click('[data-view="processos"]'); await pg.wait_for_timeout(500)
            await pg.click('#conteudo :text("' + nome + '")'); await pg.wait_for_selector('#ficha-nome'); await pg.wait_for_timeout(300)
        await abrir(pa, 'Paciente Fictício Três'); await abrir(pb, 'Paciente Fictício Três')
        await pb.wait_for_selector('#presenca-ficha', timeout=9000)
        chk('Ana também está com este processo aberto' in await pb.inner_text('#presenca-ficha'), 'Bruno vê que a Ana está no mesmo processo')
        chk('online' in await pb.inner_text('#online'), 'topo mostra quem está online')
        # Ana passa para a aba Dados (editando)
        await pa.click('#ficha [data-acao="ficha-aba"][data-k="dados"]'); await pa.wait_for_timeout(6500)
        chk('editando' in await pb.inner_text('#presenca-ficha'), 'Bruno vê que a Ana está editando')
        await pb.screenshot(path=OUT + 's01-presenca.png')
        # alguém move o processo 1 para Concluídos: as linhas sobem, a ficha do Bruno continua no processo 3
        s = S(); post(s, 'entrar', {'login': 'bruno', 'senha': 'SenhaForte2026'})
        j = app(s, 'mover', {'de': 'PERICIAS', 'para': 'CONCLUSOS', 'linha': 2, 'processoEsperado': P1}, d(P1)); chk(j.get('ok'), 'processo 1 movido para Concluídos (outra janela)')
        await pb.wait_for_timeout(7000)
        chk(await pb.inner_text('#ficha-nome') == 'Paciente Fictício Três', 'ficha aberta continua no processo certo depois das linhas subirem')
        # Ana digitando na aba Dados; Bruno grava uma alteração no mesmo processo
        obs = pa.locator('#ficha-form [data-h="OBSERVACAO"]')
        await obs.click(); await obs.fill('texto da Ana')
        lin = [x for x in s.post(B + '/pericias/api?acao=inicial', data='{"acao":"inicial"}', headers=H).json()['abas']['PERICIAS']['linhas'] if x['v'][0] == P3][0]
        j = app(s, 'salvar', {'aba': 'PERICIAS', 'linha': lin['linha'], 'processoEsperado': P3, 'dados': {'OBSERVACAO': 'nota do Bruno'}, 'esperado': {'OBSERVACAO': lin['v'][14]}}, d(P3)); chk(j.get('ok'), 'Bruno salvou a observação')
        await pa.wait_for_selector('#aviso-sync', timeout=9000)
        chk(await obs.input_value() == 'texto da Ana', 'aviso na ficha da Ana, sem apagar o que ela estava digitando')
        await pa.screenshot(path=OUT + 's02-aviso-ficha.png')
        await pa.click('#ficha button:has-text("Salvar alterações")'); await pa.wait_for_timeout(1500)
        tt = await pa.inner_text('#toast'); chk('Não salvei' in tt, 'Ana tenta salvar por cima: o app recusa e explica: "%s"' % tt.strip()[:120])
        await pa.wait_for_timeout(1500)
        # lista do Bruno atualiza sozinha quando a Ana muda algo
        await pb.click('#ficha [data-acao="fechar-ficha"]'); await pb.click('[data-view="processos"]')
        sa = S(); post(sa, 'entrar', {'login': 'ana', 'senha': 'AnaSenha2026'})
        lin2 = [x for x in sa.post(B + '/pericias/api?acao=inicial', data='{"acao":"inicial"}', headers=H).json()['abas']['PERICIAS']['linhas'] if x['v'][0] == '1000002-22.2026.8.26.0576'][0]
        app(sa, 'salvar', {'aba': 'PERICIAS', 'linha': lin2['linha'], 'processoEsperado': lin2['v'][0], 'dados': {'REQUERENTE': 'Paciente Fictício Dois Atualizado'}, 'esperado': {'REQUERENTE': lin2['v'][1]}}, d(lin2['v'][0]))
        t0 = time.time()
        await pb.wait_for_selector('#conteudo :text("Paciente Fictício Dois Atualizado")', timeout=12000)
        dt = time.time() - t0
        chk(dt < 9, 'tela do Bruno atualizou sozinha em %.1f s' % dt)
        toast = await pb.inner_text('#toast'); chk('Ana' in toast, 'aviso diz quem mudou: "%s"' % toast.strip()[:70])
        await pb.screenshot(path=OUT + 's03-atualizou-sozinho.png')
        chk(not eb and not ea, 'sem erros de JavaScript: %s' % (eb + ea)[:2])
        await br.close()
asyncio.run(ui())
bad = [m for c, m in res if not c]; print('\n%d ok, %d falharam' % (len(res) - len(bad), len(bad))); sys.exit(1 if bad else 0)
