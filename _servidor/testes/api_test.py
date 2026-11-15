"""Teste da API. Rode com o servidor local ligado (npm run dev) e banco zerado (apague .wrangler/state/v3/d1).
   .dev.vars precisa ter ADMIN_SETUP_CODE=codigo-teste-123"""
import requests, json, sys, time, re
B='http://127.0.0.1:8787'
class S(requests.Session):
    # o cookie é Secure; em http local o requests não reenvia, então guardamos à mão
    def request(self, *a, **k):
        r=super().request(*a, **k)
        sc=r.headers.get('Set-Cookie','')
        m=re.search(r'__Host-drb=([^;]*)', sc)
        if m:
            if m.group(1): self.headers['Cookie']='__Host-drb='+m.group(1)
            else: self.headers.pop('Cookie',None)
        return r
requests.Session=S
H={'Content-Type':'application/json','Origin':B}
ok=0; bad=0
def chk(cond, msg):
    global ok, bad
    if cond: ok+=1; print('  ok ', msg)
    else: bad+=1; print('  FALHOU', msg)
def post(s, p, body): return s.post(B+'/api/'+p, data=json.dumps(body), headers=H)

adm=requests.Session(); u1=requests.Session(); u2=requests.Session()
print('== configurar administrador')
r=post(adm,'configurar',{'codigo':'errado','nome':'Bruno Michels','email':'admin@teste.com','senha':'SenhaForte!2026'}); chk(r.status_code==401,'código de configuração errado recusado')
r=post(adm,'configurar',{'codigo':'codigo-teste-123','nome':'Bruno Michels','email':'admin@teste.com','senha':'SenhaForte!2026','whatsapp':'17999998888'}); j=r.json(); chk(r.ok and j['usuario']['admin'],'admin criado e logado')
r=post(requests.Session(),'configurar',{'codigo':'codigo-teste-123','nome':'Outro','email':'x@teste.com','senha':'SenhaForte!2026'}); chk(r.status_code==409,'segundo setup bloqueado')
r=adm.get(B+'/calculadoras/editor.js'); chk(r.status_code==200,'admin abre editor.js')
r=adm.get(B+'/calculadoras/admin'); chk(r.status_code==200 and 'editor.js' in r.text,'admin abre o editor de conteúdo'); chk(requests.get(B+'/calculadoras/admin',allow_redirects=False).status_code==302,'não logado vai para o painel')

print('== cadastro')
r=post(u1,'cadastro',{'nome':'Ana','email':'ana@teste.com','senha':'12345678','crm':'123456','uf':'SP','whatsapp':'(17) 99123-4567'}); chk(r.status_code==400,'nome curto/senha óbvia recusados: '+r.json().get('erro',''))
r=post(u1,'cadastro',{'nome':'Ana Paula Souza','email':'ana@teste.com','senha':'anapaula2026','uf':'SP','whatsapp':'(17) 99123-4567'}); chk(r.status_code==400 and 'CRM' in r.json()['erro'],'CRM obrigatório')
r=post(u1,'cadastro',{'nome':'Ana Paula Souza','email':'ana@teste.com','senha':'anapaula2026','crm':'123456','uf':'SP','whatsapp':'(17) 9912'}); chk(r.status_code==400 and 'WhatsApp' in r.json()['erro'],'WhatsApp com DDD')
r=post(u1,'cadastro',{'nome':'Ana Paula Souza','email':'Ana@Teste.com','senha':'anapaula2026','crm':'123456','uf':'SP','whatsapp':'(17) 99123-4567'}); j=r.json(); chk(r.ok and j['tipo']=='user','conta criada')
chk(j['acesso']['ok'] and j['acesso']['tipo']=='aberto','com modo visitante ligado, conta sem acesso usa tudo (aberto)')
r=post(requests.Session(),'cadastro',{'nome':'Ana Paula Souza','email':'ana@teste.com','senha':'anapaula2026','crm':'123456','uf':'SP','whatsapp':'17991234567'}); chk(r.status_code==409,'e-mail repetido recusado')

print('== desligar visitante')
r=post(adm,'admin/config',{'config':{'visitante':False,'contato_whatsapp':'(17) 99999-8888'}}); chk(r.ok and r.json()['config']['visitante']==False,'modo visitante desligado')
time.sleep(0.2)
vis=requests.Session(); r=post(vis,'visitante',{}); chk(r.status_code==403,'botão visitante recusado')
j=u1.get(B+'/api/eu').json(); chk(not j['acesso']['ok'] and j['acesso']['motivo']=='sem_acesso','Ana sem acesso agora')
chk(u1.get(B+'/calculadoras/app.js').status_code==403,'app.js recusado para Ana (403)')
chk(j['config']['contato_whatsapp']=='17999998888','WhatsApp de contato aparece')

print('== códigos')
r=post(adm,'admin/codigos',{'mode':'dias','days':30,'qtd':2,'usos':1,'rotulo':'Teste 30d'}); codes=r.json()['codigos']; chk(r.ok and len(codes)==2,'2 códigos de 30 dias: '+', '.join(codes))
r=post(u1,'resgatar',{'codigo':'ZZZZ-ZZZZ'}); chk(r.status_code==404,'código inexistente')
r=post(u1,'resgatar',{'codigo':codes[0].lower().replace('-',' ')}); j=r.json(); chk(r.ok and j['acesso']['tipo']=='periodo','código aplicado (minúsculas e espaço aceitos)')
dias=round((j['acesso']['ate']-j['agora'])/86400000); chk(dias==30,'30 dias de acesso (%s)'%dias)
chk(u1.get(B+'/calculadoras/app.js').status_code==200,'app.js liberado')
r=post(u1,'resgatar',{'codigo':codes[0]}); chk(r.status_code in (409,410),'mesmo código não usa 2x: '+r.json()['erro'])
r=post(u1,'resgatar',{'codigo':codes[1]}); j=r.json(); dias=round((j['acesso']['ate']-j['agora'])/86400000); chk(dias==60,'segundo código soma: %s dias'%dias)
r=post(adm,'admin/codigos',{'mode':'vitalicio','qtd':1,'usos':3,'rotulo':'Grupo'}); grupo=r.json()['codigos'][0]
r=post(adm,'admin/codigos',{'mode':'data','until':'2027-03-31','qtd':1,'email':'beto@teste.com'}); beto_code=r.json()['codigos'][0]
print('== cadastro com código')
r=post(u2,'cadastro',{'nome':'Carlos Alberto','email':'carlos@teste.com','senha':'carlos2026x','crm':'98765','uf':'MG','whatsapp':'31988887777','codigo':beto_code}); chk(r.status_code==403,'código de outro e-mail recusado no cadastro (conta não criada)')
r=post(u2,'cadastro',{'nome':'Carlos Alberto','email':'carlos@teste.com','senha':'carlos2026x','crm':'98765','uf':'MG','whatsapp':'31988887777','codigo':grupo}); j=r.json(); chk(r.ok and j['acesso']['tipo']=='vitalicio','cadastro + código de grupo vitalício')
b=requests.Session(); r=post(b,'cadastro',{'nome':'Roberto Lima','email':'beto@teste.com','senha':'roberto2026','crm':'55555','uf':'SP','whatsapp':'17977776666','codigo':beto_code}); j=r.json(); chk(r.ok and j['acesso']['tipo']=='periodo','código só-para-email aceito pelo dono')
print('== painel')
j=adm.get(B+'/api/admin/resumo').json(); chk(j['usuarios']['total']==4 and j['usuarios']['ativos']==4,'resumo: %s usuários, %s ativos'%(j['usuarios']['total'],j['usuarios']['ativos']))
j=adm.get(B+'/api/admin/usuarios?f=com_acesso&q=ana').json(); ana=j['usuarios'][0]; chk(j['total']==1 and ana['email']=='ana@teste.com','busca e filtro')
r=post(adm,'admin/usuario/acesso',{'id':ana['id'],'mode':'data','until':'2026-12-31'}); chk(r.ok,'admin define data exata')
j=u1.get(B+'/api/eu').json(); chk(j['acesso']['ate'] < (time.time()+60*86400)*1000,'data exata reduziu o acesso')
r=post(adm,'admin/usuario/acesso',{'id':ana['id'],'mode':'remover'}); chk(r.ok and not u1.get(B+'/api/eu').json()['acesso']['ok'],'retirar acesso')
r=post(adm,'admin/usuario/acesso',{'id':ana['id'],'mode':'dias','days':7}); chk(u1.get(B+'/api/eu').json()['acesso']['ok'],'+7 dias')
r=post(adm,'admin/usuario/status',{'id':ana['id'],'status':'bloqueado'}); chk(r.ok,'bloquear')
chk(u1.get(B+'/api/eu').json()['logado']==False,'bloqueio derruba a sessão')
r=post(requests.Session(),'entrar',{'email':'ana@teste.com','senha':'anapaula2026'}); chk(r.status_code==403,'conta bloqueada não entra')
post(adm,'admin/usuario/status',{'id':ana['id'],'status':'ativo'})
r=post(adm,'admin/usuario/senha',{'id':ana['id']}); link=r.json()['link']; tok=link.split('redefinir=')[1]; chk('#redefinir=' in link,'link de nova senha')
s=requests.Session(); r=post(s,'senha/verificar',{'token':tok}); chk(r.ok and r.json()['email']=='ana@teste.com','link válido')
r=post(s,'senha/redefinir',{'token':tok,'senha':'novaSenhaAna1'}); chk(r.ok and r.json()['usuario']['email']=='ana@teste.com','nova senha salva e entrou')
r=post(requests.Session(),'senha/redefinir',{'token':tok,'senha':'outraSenha99'}); chk(r.status_code==410,'link usado não vale de novo')
print('== aparelhos e senha')
sess=[requests.Session() for _ in range(4)]
for x in sess: post(x,'entrar',{'email':'ana@teste.com','senha':'novaSenhaAna1'})
alive=[x.get(B+'/api/eu').json()['logado'] for x in sess]; chk(alive==[False,True,True,True] or sum(alive)==3,'máximo 3 aparelhos: %s'%alive)
print('== tentativas')
z=requests.Session(); codes_=[post(z,'entrar',{'email':'carlos@teste.com','senha':'errada%d'%i}).status_code for i in range(11)]
chk(codes_[-1]==429,'bloqueio após 10 tentativas: %s'%codes_[-3:])
print('== códigos lista / revogar / csv / registro')
j=adm.get(B+'/api/admin/codigos?f=todos').json(); chk(len(j['codigos'])==4,'4 códigos na lista')
g=[c for c in j['codigos'] if c['code']==grupo][0]; chk(g['uses']==1 and len(g['quem'])==1,'grupo: 1 de 3 usos, quem usou')
r=post(adm,'admin/codigo/revogar',{'code':grupo}); r2=post(requests.Session(),'cadastro',{'nome':'Diego Teste','email':'d@teste.com','senha':'diego2026x','crm':'11111','uf':'SP','whatsapp':'17966665555','codigo':grupo}); chk(r2.status_code==410,'código cancelado não funciona')
r=adm.get(B+'/api/admin/usuarios.csv'); chk(r.ok and 'Ana Paula' in r.text and r.headers['content-type'].startswith('text/csv'),'exportar CSV')
j=adm.get(B+'/api/admin/registro').json(); chk(len(j['registro'])>10,'registro com %d entradas'%len(j['registro']))
r=u2.get(B+'/api/admin/resumo'); chk(r.status_code==403,'não-admin não acessa painel')
print('== sair');
r=post(u2,'sair',{}); chk(u2.get(B+'/calculadoras/app.js').status_code==401,'depois de sair, app.js 401')
print('\n%d ok, %d falharam'%(ok,bad)); sys.exit(1 if bad else 0)
