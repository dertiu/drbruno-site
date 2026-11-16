"""Teste no navegador (Playwright): visitante, cadastro, offline, códigos, todas as calculadoras e o painel.
   Rode depois do api_test.py, com o servidor local ligado."""
import asyncio, json, sys, time, requests, re, os
from playwright.async_api import async_playwright
B='http://127.0.0.1:8787'
OUT=os.path.join(os.path.dirname(__file__),'capturas')+'/'
import os; os.makedirs(OUT, exist_ok=True)
H={'Content-Type':'application/json','Origin':B}
res=[]
def chk(c,m): res.append((c,m)); print(('  ok ' if c else '  FALHOU ')+m)

def admin_cookie():
    r=requests.post(B+'/api/configurar',data=json.dumps({'codigo':'codigo-teste-123','nome':'Bruno Thomás Michels','email':'admin@teste.com','senha':'SenhaForte!2026','whatsapp':'17999998888'}),headers=H)
    if r.status_code==409: r=requests.post(B+'/api/entrar',data=json.dumps({'email':'admin@teste.com','senha':'SenhaForte!2026'}),headers=H)
    return re.search(r'__Host-drb=([^;]*)',r.headers['Set-Cookie']).group(1)
def adm(path, body=None, c=None):
    h=dict(H); h['Cookie']='__Host-drb='+c
    return (requests.post(B+'/api/'+path,data=json.dumps(body),headers=h) if body is not None else requests.get(B+'/api/'+path,headers=h)).json()

async def esperar_visivel(pg, sel, seg=40):
    for _ in range(seg*2):
        if await pg.is_visible(sel): return True
        await pg.wait_for_timeout(500)
    raise TimeoutError('não apareceu: '+sel)

async def app_flow(br):
    C=admin_cookie()
    ctx=await br.new_context(viewport={'width':390,'height':844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    pg=await ctx.new_page(); errs=[]
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: errs.append(m.text) if m.type=='error' else None)
    await pg.goto(B+'/calculadoras/'); await pg.wait_for_selector('.gt-card')
    await esperar_visivel(pg, 'text=Entrar como visitante')
    await pg.screenshot(path=OUT+'01-entrada-celular.png')
    chk(await pg.is_visible('text=Criar conta'),'tela de entrada com visitante, entrar e criar conta')
    await pg.click('text=Entrar como visitante')
    await pg.wait_for_selector('#app .tile, #app a, #app section', timeout=15000)
    await pg.wait_for_timeout(600)
    chk(not await pg.is_visible('.gt-w'),'app abriu como visitante')
    await pg.screenshot(path=OUT+'02-app-visitante.png')
    n=await pg.evaluate('window.DRB && DRB.tools.length'); chk(n and n>50,'%s ferramentas carregadas do pacote protegido'%n)
    # espera o cache offline
    await pg.wait_for_function("(async()=>{const c=await caches.open('prot-v1');return (await c.keys()).length>=4})()", timeout=30000)
    chk(True,'código guardado para uso offline (4 arquivos)')
    await pg.click('#menu'); await pg.wait_for_timeout(300)
    await pg.click('.gt-side'); await pg.wait_for_selector('.gt-acc')
    await pg.screenshot(path=OUT+'03-conta-visitante.png')
    await pg.click('.gt-acc >> text=Criar minha conta'); await pg.wait_for_selector('#gt-nome')
    await pg.screenshot(path=OUT+'04-cadastro.png', full_page=True)
    await pg.fill('#gt-nome','Mariana Costa Lima'); await pg.fill('#gt-cemail','mariana@teste.com'); await pg.fill('#gt-csenha','mariana2026')
    await pg.fill('#gt-crm','224466'); await pg.fill('#gt-tel','17991112222')
    chk(await pg.input_value('#gt-tel')=='(17) 99111-2222','máscara do WhatsApp')
    await pg.click('.gt-w button[type=submit]'); await pg.wait_for_timeout(1500)
    chk(not await pg.is_visible('.gt-w'),'conta criada e app continua aberto')
    lic=await pg.evaluate("JSON.parse(localStorage.drb_lic)"); chk(lic['tipo']=='aberto' and lic['nome']=='Mariana Costa Lima','licença offline atualizada (%s)'%lic['tipo'])
    # ---------- offline ----------
    await ctx.set_offline(True); await pg.reload(); await pg.wait_for_timeout(2500)
    n2=await pg.evaluate('window.DRB && DRB.tools.length'); chk(n2==n and not await pg.is_visible('.gt-w'),'sem internet: app abre do cache')
    await pg.evaluate("location.hash='#/dose'"); await pg.wait_for_timeout(600)
    await pg.screenshot(path=OUT+'05-offline-ferramenta.png')
    await ctx.set_offline(False)
    # ---------- visitante desligado ----------
    adm('admin/config',{'config':{'visitante':False}},C); await asyncio.sleep(21)
    await pg.reload(); await pg.wait_for_timeout(3000)
    chk(await pg.is_visible('text=Liberar acesso'),'modo visitante desligado: conta sem acesso vê tela de código')
    await pg.screenshot(path=OUT+'06-sem-acesso.png', full_page=True)
    prot=await pg.evaluate("(async()=>{const c=await caches.open('prot-v1');return (await c.keys()).length})()"); chk(prot==0,'código apagado do aparelho ao perder acesso')
    code=adm('admin/codigos',{'mode':'dias','days':30,'qtd':1},C)['codigos'][0]
    await pg.fill('#gt-rcode',code.lower()); await pg.click('.gt-w button[type=submit]'); await pg.wait_for_timeout(2500)
    chk(not await pg.is_visible('.gt-w') and await pg.evaluate('!!window.DRB'),'código liberou o app')
    await pg.click('#menu'); await pg.wait_for_timeout(300); await pg.click('.gt-side'); await pg.wait_for_selector('.gt-acc')
    txt=await pg.inner_text('.gt-acc'); chk('Acesso até' in txt,'Minha conta mostra a data: '+re.search(r'Acesso até [\d/]+',txt).group(0))
    await pg.screenshot(path=OUT+'07-minha-conta.png')
    await pg.click('.gt-acc >> text=Sair da conta'); await pg.wait_for_timeout(2500)
    chk(await pg.is_visible('#gt-email') and not await pg.is_visible('text=Entrar como visitante'),'saiu; sem botão de visitante')
    await pg.screenshot(path=OUT+'08-entrada-sem-visitante.png')
    # entrar de novo
    await pg.fill('#gt-email','mariana@teste.com'); await pg.fill('#gt-senha','senhaerrada1'); await pg.click('form button:has-text("Entrar")'); await pg.wait_for_timeout(1200)
    chk(await pg.is_visible('text=E-mail ou senha incorretos'),'senha errada avisa')
    await pg.fill('#gt-senha','mariana2026'); await pg.click('form button:has-text("Entrar")'); await pg.wait_for_timeout(2500)
    chk(not await pg.is_visible('.gt-w'),'entrou com e-mail e senha')
    chk(not [e for e in errs if 'Failed to load resource' not in e],'sem erros de JavaScript no app: %s'%errs[:3])
    await ctx.close()



async def main():
    C=admin_cookie()
    adm('admin/config',{'config':{'visitante':True,'contato_whatsapp':'17999998888'}},C)
    async with async_playwright() as p:
        br=await p.chromium.launch(executable_path=os.environ.get('CHROME') or None, args=['--no-sandbox'])
        if not os.environ.get('SO_FERRAMENTAS'):
          await app_flow(br)
        # ---------- todas as ferramentas: pacote protegido x site original ----------
        async def render_all(url, setup=None):
            c=await br.new_context(viewport={'width':1280,'height':900}); pg=await c.new_page(); er=[]
            pg.on('pageerror', lambda e: er.append(str(e)))
            if setup:
                await pg.goto(B+'/painel/')
                await pg.evaluate("fetch('/api/entrar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'admin@teste.com',senha:'SenhaForte!2026'})})")
                await pg.wait_for_timeout(800)
            await pg.goto(url); await pg.wait_for_selector('#side .sl', state='attached', timeout=20000); await pg.wait_for_timeout(500)
            ids=await pg.evaluate("DRB.tools.filter(t=>!t.href).map(t=>t.id)")
            out={}
            for i in ids:
                await pg.evaluate("id=>{location.hash='#/'+id}", i); await pg.wait_for_timeout(80)
                out[i]=await pg.evaluate("document.querySelector('#app').innerText.length")
            await c.close(); return ids,out,er
        import subprocess
        srv=subprocess.Popen(['python3','-m','http.server','8899','--bind','127.0.0.1'],cwd=os.path.abspath(os.path.join(os.path.dirname(__file__),'..','..')),stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        await asyncio.sleep(1)
        try:
            ids0,o0,e0=await render_all('http://127.0.0.1:8899/calculadoras/')
        finally: srv.terminate()
        ids1,o1,e1=await render_all(B+'/calculadoras/', C)
        chk(ids0==ids1,'mesmas %d ferramentas no original e no protegido'%len(ids1))
        diff=[i for i in ids1 if (o0.get(i,0)>0)!=(o1.get(i,0)>0) or abs(o0.get(i,0)-o1.get(i,0))>40]
        chk(not diff,'todas as ferramentas renderizam igual (diferenças: %s)'%diff[:8])
        chk(not e1,'sem erros ao abrir todas as ferramentas (protegido): %s'%e1[:3])
        print('   erros no original (referência):', e0[:3])

        # ---------- painel ----------
        for w,h_,tag in [(1280,900,'desktop'),(390,844,'celular')]:
            c=await br.new_context(viewport={'width':w,'height':h_}, device_scale_factor=2 if w<500 else 1)
            pg=await c.new_page(); er=[]; pg.on('pageerror', lambda e: er.append(str(e)))
            await pg.goto(B+'/painel/'); await pg.wait_for_selector('#pn-email')
            if tag=='desktop': await pg.screenshot(path=OUT+'10-painel-login.png')
            await pg.fill('#pn-email','admin@teste.com'); await pg.fill('#pn-senha','SenhaForte!2026'); await pg.click('button:has-text("Entrar")')
            await pg.wait_for_selector('.pn-stats'); await pg.wait_for_timeout(300)
            await pg.screenshot(path=OUT+f'11-painel-resumo-{tag}.png', full_page=True)
            await pg.click('.pn-tabs >> text=Usuários'); await pg.wait_for_selector('.pn-row'); await pg.wait_for_timeout(300)
            await pg.screenshot(path=OUT+f'12-painel-usuarios-{tag}.png', full_page=True)
            await pg.click('.pn-row:has-text("Mariana")'); await pg.wait_for_selector('.pn-now'); await pg.wait_for_timeout(300)
            await pg.screenshot(path=OUT+f'13-painel-usuario-{tag}.png', full_page=True)
            if tag=='desktop':
                await pg.click('button:has-text("90 dias")'); await pg.wait_for_timeout(900)
                t=await pg.inner_text('.pn-now'); chk('faltam' in t,'painel: +90 dias aplicado ('+t+')')
                await pg.click('button:has-text("Gerar link de nova senha")'); await pg.wait_for_selector('.pn-code-out'); chk(True,'painel: link de nova senha')
            await pg.click('.pn-tabs >> text=Códigos'); await pg.wait_for_selector('.pn-seg')
            if tag=='desktop':
                await pg.click('.pn-seg >> text=Vitalício'); await pg.click('summary'); 
                await pg.fill('.pn-more input[type=number] >> nth=0','3'); await pg.click('button:has-text("Gerar")'); await pg.wait_for_selector('.pn-codebig'); await pg.wait_for_timeout(400)
                chk(await pg.locator('.pn-codebig').count()==3,'painel: 3 códigos vitalícios gerados')
            await pg.wait_for_timeout(400)
            await pg.screenshot(path=OUT+f'14-painel-codigos-{tag}.png', full_page=True)
            await pg.click('.pn-tabs >> text=Ajustes'); await pg.wait_for_selector('.pn-sw'); await pg.wait_for_timeout(200)
            await pg.screenshot(path=OUT+f'15-painel-ajustes-{tag}.png', full_page=True)
            await pg.click('.pn-tabs >> text=Registro'); await pg.wait_for_selector('.pn-log > div'); await pg.wait_for_timeout(300)
            await pg.screenshot(path=OUT+f'16-painel-registro-{tag}.png')
            chk(not er,'painel sem erros (%s): %s'%(tag,er[:2]))
            await c.close()
        # entrada no desktop
        c=await br.new_context(viewport={'width':1280,'height':860}); pg=await c.new_page()
        C=admin_cookie()  # sessão nova: as entradas no painel acima passam do limite de aparelhos e derrubam a antiga
        r=adm('admin/config',{'config':{'visitante':True}},C); chk(r.get('ok'),'visitante religado'); await asyncio.sleep(21)
        await pg.goto(B+'/calculadoras/'); await esperar_visivel(pg, 'text=Entrar como visitante'); await pg.screenshot(path=OUT+'09-entrada-desktop.png')
        await c.close()
        await br.close()
    bad=[m for c,m in res if not c]; print('\n%d ok, %d falharam'%(len(res)-len(bad),len(bad))); sys.exit(1 if bad else 0)
asyncio.run(main())
