"""Teste da API do /pericias (login, duas etapas, convites, painel, repasse assinado ao Apps Script).
   Precisa do servidor local (npm run dev) e do Apps Script simulado (node testes/gas_simulado.mjs), com banco zerado
   e .dev.vars com PERICIAS_SETUP_CODE=pericias-teste-123, PERICIAS_CHAVE igual à do simulado e PERICIAS_GAS_URL=http://127.0.0.1:8898/exec"""
import requests, json, sys, time, re, hmac, hashlib, base64, struct, secrets

B = 'http://127.0.0.1:8787'
G = 'http://127.0.0.1:8898'
CHAVE = 'chave-de-teste-0123456789abcdef0123456789abcdef'
H = {'Content-Type': 'application/json', 'Origin': B}
ok = bad = 0
def chk(c, m):
    global ok, bad
    if c: ok += 1; print('  ok ', m)
    else: bad += 1; print('  FALHOU', m)

class S(requests.Session):
    """o cookie é Secure; em http local guardamos à mão"""
    def request(self, *a, **k):
        r = super().request(*a, **k)
        m = re.search(r'__Secure-pericias=([^;]*)', r.headers.get('Set-Cookie', ''))
        if m:
            if m.group(1): self.headers['Cookie'] = '__Secure-pericias=' + m.group(1)
            else: self.headers.pop('Cookie', None)
        return r

def totp(secret, d=0):
    key = base64.b32decode(secret + '=' * ((8 - len(secret) % 8) % 8))
    c = int(time.time() // 30) + d
    h = hmac.new(key, struct.pack('>Q', c), hashlib.sha1).digest()
    o = h[19] & 15
    return '%06d' % ((struct.unpack('>I', h[o:o + 4])[0] & 0x7fffffff) % 1000000)
def post(s, p, body): return s.post(B + '/pericias/conta/' + p, data=json.dumps(body), headers=H)
def app(s, acao, body=None, raw=None):
    return s.post(B + '/pericias/api?acao=' + acao, data=raw if raw is not None else json.dumps(body or {'acao': acao}), headers=H)

print('== arquivos sem login')
for p, esperado in [('/pericias/', 200), ('/pericias/entrar.js', 200), ('/pericias/app.css', 200), ('/pericias/eproc-atalho.user.js', 200),
                    ('/pericias/app.js', 401), ('/pericias/config.js', 401), ('/pericias/LEIA-ME.md', 401), ('/pericias/perfil/perfil.js', 401)]:
    chk(requests.get(B + p, allow_redirects=False).status_code == esperado, '%s -> %d' % (p, esperado))
r = requests.get(B + '/pericias/perfil/', allow_redirects=False); chk(r.status_code == 302, 'Minha conta sem login volta para a entrada')
r = requests.get(B + '/pericias/'); csp = r.headers.get('Content-Security-Policy', '')
chk("script-src 'self'" in csp and "frame-ancestors 'none'" in csp, 'política de segurança restrita na página')
chk('script.google' not in r.text and 'script.google' not in requests.get(B + '/pericias/entrar.js').text, 'endereço do Apps Script não aparece')

print('== primeiro administrador')
adm = S()
r = post(adm, 'configurar', {'codigo': 'errado', 'nome': 'Bruno', 'login': 'bruno', 'senha': 'SenhaForte2026'}); chk(r.status_code == 401, 'código errado recusado')
r = post(adm, 'configurar', {'codigo': 'pericias-teste-123', 'nome': 'Dr. Bruno Thomás Michels', 'login': 'Bruno.Michels', 'chave': 'bruno', 'senha': 'SenhaForte2026'})
j = r.json(); chk(r.ok and j['etapa'] == 'pronto', 'padrão: entra só com login e senha (duas etapas opcionais)')
sc = r.headers.get('Set-Cookie', '')
chk('Path=/pericias' in sc and 'HttpOnly' in sc and 'SameSite=Strict' in sc and 'Secure' in sc, 'cookie só vale em /pericias, HttpOnly, Strict')
chk(adm.get(B + '/pericias/conta/2fa/estado').json()['ativo'] is False, 'duas etapas desligadas no início')
r = post(adm, '2fa/iniciar', {}); j = r.json(); sec_adm = j['segredo']
r = post(adm, '2fa/ativar', {'ticket': j['ticket'], 'codigo': '000000'}); chk(r.status_code == 401, 'código errado')
r = post(adm, '2fa/ativar', {'ticket': j['ticket'], 'codigo': totp(sec_adm)}); j = r.json()
chk(r.ok and len(j['recuperacao']) == 10, 'quem quiser liga as duas etapas em Minha conta (10 códigos de recuperação)')
rec_adm = j['recuperacao']
r = post(adm, 'admin/ajustes', {'ajustes': {'exigir_2fa': True}}); chk(r.json()['ajustes']['exigir_2fa'] is True, 'administrador pode tornar obrigatórias')
j = adm.get(B + '/pericias/conta/eu').json(); chk(j['logado'] and j['usuario']['chave'] == 'bruno' and j['usuario']['admin'] and j['usuario']['login'] == 'bruno.michels', 'sessão do administrador')
r = post(S(), 'configurar', {'codigo': 'pericias-teste-123', 'nome': 'X', 'login': 'x', 'senha': 'SenhaForte2026'}); chk(r.status_code == 409, 'segundo administrador pelo código: recusado')
chk(adm.get(B + '/pericias/app.js').status_code == 200 and adm.get(B + '/pericias/config.js').status_code == 200, 'com login, app.js e config.js liberados')
chk(adm.get(B + '/pericias/perfil/admin.js').status_code == 200, 'admin.js liberado para o administrador')

print('== repasse ao Apps Script')
r = app(adm, 'inicial'); j = r.json(); chk(r.ok and j.get('ok') and j['usuario'] == 'bruno' and j['papel'] == 'perito', 'inicial: usuário bruno, perfil perito')
chk(len(j['abas']['PERICIAS']['linhas']) == 3, 'dados chegam pela assinatura')
r = app(adm, 'gestao'); chk(r.json().get('gestao') is True, 'perito vê a Gestão')
chk(app(S(), 'inicial').status_code == 401, 'sem login: 401')
chk(app(adm, 'login').status_code == 400, 'ação login bloqueada no repasse')
r = app(adm, 'inicial', {'acao': 'gestao'}); chk(r.json().get('erro') == 'SESSAO', 'ação diferente da assinada: recusada pelo Apps Script')
big = json.dumps({'acao': 'upload', 'dados': 'A' * 2_000_000}); r = app(adm, 'upload', raw=big); chk(r.json().get('tamanho') == 2_000_000, 'envio de 2 MB passa inteiro')
r = adm.post(B + '/pericias/api?acao=inicial', data='{}', headers={'Content-Type': 'application/json', 'Origin': 'https://mal.exemplo'}); chk(r.status_code == 403, 'pedido vindo de outro site: recusado')

print('== Apps Script direto (sem passar pelo site)')
def assinar(u='bruno', p='perito', a='inicial', t=None, n=None):
    t = str(int(time.time() * 1000)) if t is None else t; n = n or secrets.token_hex(8)
    s = hmac.new(CHAVE.encode(), '|'.join([u, p, a, t, n]).encode(), hashlib.sha256).hexdigest()
    return {'u': u, 'p': p, 'a': a, 't': t, 'n': n, 's': s}
def gas(params, body): return requests.post(G + '/exec', params=params, data=json.dumps(body)).json()
pr = assinar(); chk(gas(pr, {'acao': 'inicial'}).get('ok'), 'assinatura certa: aceita')
chk(gas(pr, {'acao': 'inicial'}).get('erro') == 'SESSAO', 'mesmo pedido repetido: recusado')
x = assinar(); x['s'] = '0' * 64; chk(gas(x, {'acao': 'inicial'}).get('erro') == 'SESSAO', 'assinatura falsa: recusada')
chk(gas(assinar(t=str(int(time.time() * 1000) - 10 * 60000)), {'acao': 'inicial'}).get('erro') == 'SESSAO', 'assinatura de 10 min atrás: recusada')
x = assinar(p='assistente'); x['p'] = 'perito'; chk(gas(x, {'acao': 'gestao'}).get('erro') == 'SESSAO', 'trocar o perfil depois de assinar: recusado')
j = gas({}, {'acao': 'login', 'usuario': 'antigo', 'senha': 'senha-antiga'}); chk(j.get('ok'), 'transição: login antigo ainda funciona')
requests.get(G + '/so-site')
j = gas({}, {'acao': 'login', 'usuario': 'antigo', 'senha': 'senha-antiga'}); chk(j.get('erro') == 'SESSAO', 'com SO_SITE ligado: login antigo recusado')
chk(gas({}, {'acao': 'inicial', 'token': 'x' * 64}).get('erro') == 'SESSAO', 'com SO_SITE ligado: token antigo recusado')
chk(app(adm, 'inicial').json().get('ok'), 'com SO_SITE ligado: o site continua funcionando')

print('== conta criada pelo administrador (convite)')
r = post(adm, 'admin/criar', {'nome': 'Ana Assistente', 'login': 'ana', 'papel': 'assistente', 'whatsapp': '17991112222'}); j = r.json()
chk(r.ok and '#definir=' in j['link'], 'conta criada com link de convite')
tok = j['link'].split('#definir=')[1]
ana = S()
r = post(ana, 'entrar', {'login': 'ana', 'senha': 'qualquer123'}); chk(r.status_code == 401 and 'convite' in r.json()['erro'], 'antes do convite não entra')
j = post(ana, 'convite/verificar', {'token': tok}).json(); chk(j['login'] == 'ana' and j['tipo'] == 'convite', 'convite válido')
r = post(ana, 'convite/definir', {'token': tok, 'senha': '12345678'}); chk(r.status_code == 400, 'senha óbvia recusada')
r = post(ana, 'convite/definir', {'token': tok, 'senha': 'AnaSenha2026'}); j = r.json(); chk(j['etapa'] == 'cadastrar', 'senha criada; pede duas etapas')
sec_ana = j['segredo']
j = post(ana, 'entrar/codigo', {'ticket': j['ticket'], 'codigo': totp(sec_ana)}).json(); chk(j['etapa'] == 'pronto' and j['usuario']['papel'] == 'assistente', 'Ana entrou como assistente')
rec_ana = j['recuperacao']
chk(post(S(), 'convite/verificar', {'token': tok}).status_code == 410, 'convite não vale duas vezes')
chk(app(ana, 'gestao').status_code == 403, 'assistente não acessa a Gestão (barrado no site)')
j = app(ana, 'inicial').json(); chk(j['usuario'] == 'ana' and j['papel'] == 'assistente', 'Apps Script recebe ana como assistente')
chk(ana.get(B + '/pericias/perfil/admin.js').status_code == 403, 'admin.js não chega para a assistente')
chk(post(ana, 'admin/usuarios', {}).status_code in (403, 404) and ana.get(B + '/pericias/conta/admin/usuarios').status_code == 403, 'assistente não usa o painel de usuários')
eq = ana.get(B + '/pericias/conta/equipe').json()['usuarios']; chk({x['u'] for x in eq} == {'bruno', 'ana'} and all('nome' in x for x in eq), 'equipe com nomes de exibição')

print('== Minha conta')
r = post(ana, 'perfil', {'nome': 'Ana Paula', 'login': 'bruno.michels'}); chk(r.status_code == 400, 'login já usado: recusado')
r = post(ana, 'perfil', {'nome': 'Ana Paula Souza', 'login': 'Ana.Paula'}); chk(r.ok and r.json()['usuario']['login'] == 'ana.paula' and r.json()['usuario']['chave'] == 'ana', 'troca de nome e login (usuário da planilha não muda)')
r = post(ana, 'senha', {'atual': 'errada', 'nova': 'NovaSenha2026'}); chk(r.status_code == 401, 'senha atual errada')
r = post(ana, 'senha', {'atual': 'AnaSenha2026', 'nova': 'NovaSenha2026'}); chk(r.ok, 'senha trocada')
s2 = S(); j = post(s2, 'entrar', {'login': 'ana', 'senha': 'NovaSenha2026'}); chk(j.status_code == 401, 'login antigo não vale mais')
j = post(s2, 'entrar', {'login': 'ana.paula', 'senha': 'NovaSenha2026'}).json(); chk(j['etapa'] == 'codigo', 'login novo pede o código')
r = post(s2, 'entrar/codigo', {'ticket': j['ticket'], 'codigo': totp(sec_ana)}); chk(r.status_code == 401, 'mesmo código de 6 números não vale duas vezes')
r = post(s2, 'entrar/codigo', {'ticket': j['ticket'], 'codigo': rec_ana[0].lower()}); jj = r.json(); chk(r.ok and jj['restam'] == 9, 'código de recuperação aceito (restam 9)')
j = post(S(), 'entrar', {'login': 'ana.paula', 'senha': 'NovaSenha2026'}).json()
chk(post(S(), 'entrar/codigo', {'ticket': j['ticket'], 'codigo': rec_ana[0]}).status_code == 401, 'código de recuperação não vale duas vezes')
ses = s2.get(B + '/pericias/conta/sessoes').json()['sessoes']; chk(len(ses) == 2 and sum(1 for x in ses if x['atual']) == 1, 'aparelhos conectados listados')
r = post(s2, 'sessoes/encerrar', {'id': 'outras'}); chk(r.json()['encerradas'] == 1 and ana.get(B + '/pericias/conta/eu').json()['logado'] is False, 'desconectar os outros aparelhos')
r = post(s2, '2fa/desativar', {'senha': 'NovaSenha2026'}); chk(r.status_code == 403, 'com duas etapas obrigatórias, não dá para desligar')
r = post(s2, '2fa/iniciar', {}); jj = r.json(); r = post(s2, '2fa/ativar', {'ticket': jj['ticket'], 'codigo': totp(jj['segredo'])}); chk(r.ok and len(r.json()['recuperacao']) == 10, 'trocar de celular (novo autenticador)')
sec_ana = jj['segredo']
h_ = s2.get(B + '/pericias/conta/historico').json()['registro']; chk(any(x['action'] == 'trocou a senha' for x in h_), 'atividade da conta registrada')

print('== painel do administrador')
j = adm.get(B + '/pericias/conta/admin/usuarios').json(); ana_id = [u for u in j['usuarios'] if u['chave'] == 'ana'][0]['id']; chk(len(j['usuarios']) == 2, 'lista de usuários')
r = post(adm, 'admin/editar', {'id': ana_id, 'papel': 'perito'}); chk(r.ok and app(s2, 'gestao').status_code == 200, 'perfil trocado para perito vale na hora')
post(adm, 'admin/editar', {'id': ana_id, 'papel': 'assistente'})
r = post(adm, 'admin/2fa-reset', {'id': ana_id}); chk(r.ok and s2.get(B + '/pericias/conta/eu').json()['logado'] is False, 'zerar duas etapas desconecta')
j = post(s2, 'entrar', {'login': 'ana.paula', 'senha': 'NovaSenha2026'}).json(); chk(j['etapa'] == 'cadastrar', 'depois de zerar, cadastra de novo')
r = post(adm, 'admin/status', {'id': ana_id, 'status': 'bloqueado'}); chk(r.ok, 'bloquear')
r = post(S(), 'entrar', {'login': 'ana.paula', 'senha': 'NovaSenha2026'}); chk(r.status_code == 403, 'bloqueada não entra')
post(adm, 'admin/status', {'id': ana_id, 'status': 'ativo'})
r = post(adm, 'admin/link-senha', {'id': ana_id}); chk('#definir=' in r.json()['link'], 'link de nova senha')
r = post(adm, 'admin/status', {'id': 1, 'status': 'bloqueado'}); chk(r.status_code == 400, 'administrador não se bloqueia')
r = post(adm, 'admin/ajustes', {'ajustes': {'max_aparelhos': 1, 'sessao_dias': 3}}); chk(r.json()['ajustes']['max_aparelhos'] == 1, 'ajustes salvos')
x1 = S(); j = post(x1, 'entrar', {'login': 'bruno.michels', 'senha': 'SenhaForte2026'}).json(); post(x1, 'entrar/codigo', {'ticket': j['ticket'], 'codigo': rec_adm[0]})
chk(adm.get(B + '/pericias/conta/eu').json()['logado'] is False and x1.get(B + '/pericias/conta/eu').json()['logado'], 'limite de 1 aparelho: o antigo sai')
adm = x1
post(adm, 'admin/ajustes', {'ajustes': {'max_aparelhos': 3, 'exigir_2fa': False}})
r = post(adm, 'admin/criar', {'nome': 'Carlos Teste', 'login': 'carlos', 'papel': 'assistente'}); tk = r.json()['link'].split('#definir=')[1]
j = post(S(), 'convite/definir', {'token': tk, 'senha': 'CarlosSenha1'}).json(); chk(j['etapa'] == 'pronto', 'com duas etapas opcionais, entra só com senha')
reg = adm.get(B + '/pericias/conta/admin/registro').json()['registro']; acoes = {x['action'] for x in reg}
chk({'criou a conta', 'senha errada', 'bloqueou a conta', 'zerou as duas etapas', 'app: upload', 'entrou com código de recuperação'} <= acoes, 'registro completo (%d entradas)' % len(reg))
chk(not any(x['action'] == 'app: inicial' for x in reg), 'leituras não lotam o registro')
r = post(adm, 'admin/excluir', {'id': ana_id, 'confirmar': 'errado'}); chk(r.status_code == 400, 'excluir pede o login')
r = post(adm, 'admin/excluir', {'id': ana_id, 'confirmar': 'ana.paula'}); chk(r.ok, 'conta excluída')

print('== tentativas')
z = S(); cs = [post(z, 'entrar', {'login': 'carlos', 'senha': 'errada%d' % i}).status_code for i in range(9)]
chk(cs[-1] == 429, 'bloqueio depois de 8 senhas erradas: %s' % cs[-3:])
print('== sair')
r = post(adm, 'sair', {}); chk(app(adm, 'inicial').status_code == 401 and adm.get(B + '/pericias/app.js').status_code == 401, 'depois de sair, nada passa')
print('\n%d ok, %d falharam' % (ok, bad)); sys.exit(1 if bad else 0)
