/* Modelos de prontuário: exame físico, evolução, anamnese do PS, condutas, ambulatório, orientações e respostas CROSS/NIR */
(function () {
  'use strict';
  const D = window.DRB, u = D.u;
  const MY = 'drb_pront_my', SEXO = 'drb_pront_sexo';
  const ls = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
  };

  const CATS = [
    ['ef', 'Exame físico'], ['ev', 'Evolução'], ['hpma', 'Anamnese do PS'], ['cd', 'Condutas e frases prontas'],
    ['amb', 'Ambulatório'], ['ori', 'Orientações e declarações'], ['doc', 'Atestados e documentos'], ['cross', 'Respostas CROSS e NIR']
  ];

  // {o|a} = masculino|feminino. ___ = campo a completar.
  const M = [
    // ===== EXAME FÍSICO
    ['ef-geral', 'ef', 'Exame físico geral', '',
`BEG, CORAD{O|A}, HIDRATAD{O|A}, ACIANÓTIC{O|A}, ANICTÉRIC{O|A}, AFEBRIL. CONSCIENTE E ORIENTAD{O|A} EM TEMPO E ESPAÇO.
APL: EUPNEIC{O|A}, MURMÚRIO VESICULAR PRESENTE E SEM RUÍDOS ADVENTÍCIOS.
ACV: 2 BULHAS RÍTMICAS E NORMOFONÉTICAS, SEM SOPROS.
ABDOME: FLÁCIDO, NORMOTENSO, INDOLOR, RHA+, SEM VISCEROMEGALIAS, DB NEGATIVO.
NEUROLÓGICO: CONSCIENTE E ORIENTAD{O|A}, PIFR, AUSÊNCIA DE NISTAGMO E DE SINAIS MENÍNGEOS, AUSÊNCIA DE DÉFICITS MOTORES.
MMII: SEM EDEMAS, PANTURRILHAS LIVRES, TEC < 3 S.`],
    ['ef-curto', 'ef', 'Exame físico abreviado', '',
`BEG, CHAAAE, LOTE, GLASGOW 15.
RCR 2T BNF S/S.
MV+ S/RA.
ABD FLÁCIDO, INDOLOR, RHA+, DB-, MURPHY-, GIORDANO-.
MMII SEM SINAIS DE TVP OU INFECCIOSOS, PULSOS+, TEC < 3 S.`],
    ['ef-ps', 'ef', 'Exame físico do PS (com oroscopia e otoscopia)', '',
`BEG, LOTE, CHAAA.
AP: MV+ BILATERAL SEM RA, EUPNEIC{O|A} EM AA, SEM SINAIS DE DESCONFORTO RESPIRATÓRIO, SATURANDO ___%.
ABD: PLANO, NORMOTENSO, SEM VISCEROMEGALIAS, RHA+, INDOLOR À PALPAÇÃO, DB-.
OROSCOPIA: MUCOSAS ÚMIDAS E CORADAS, SEM EXSUDATO, ANEXOS SEM ALTERAÇÕES.
OTOSCOPIA: MT ÍNTEGRA, CANAL AUDITIVO SEM ALTERAÇÕES, REFLEXO LUMINOSO PRESENTE.
SNC: GLASGOW 15, PUPILAS ISOFOTORREAGENTES, FORÇA PRESERVADA GLOBALMENTE, SEM SINAIS DE IRRITAÇÃO MENÍNGEA.
MMII: PULSOS PRESENTES BILATERALMENTE, SINAL DE HOMANS E SINAL DA BANDEIRA NEGATIVOS, TEC < 2 S.`],
    ['ef-ps-linha', 'ef', 'Exame físico completo com sinais vitais', '',
`BEG, CHAAAE, LOTE. GLASGOW 15, PUPILAS ISOFOTORREAGENTES E ISOCÓRICAS, SEM SINAIS MENÍNGEOS. SEM DÉFICIT NEUROLÓGICO, FORÇA E SENSIBILIDADE PRESERVADAS E SIMÉTRICAS.
AR: MV+ BILATERALMENTE, SEM RA. FR ___ IRPM, SATO2 ___%, SEM DESCONFORTO RESPIRATÓRIO.
ACV: RCR 2T, BNF, SEM SOPROS. FC ___ BPM, PA ___ MMHG, TEC < 3 S.
ABD: FLÁCIDO, INDOLOR À PALPAÇÃO SUPERFICIAL E PROFUNDA, SEM VISCEROMEGALIAS OU MASSAS PALPÁVEIS, RHA+, DB NEGATIVO, GIORDANO NEGATIVO, MURPHY NEGATIVO, BLUMBERG NEGATIVO.
MMII: SEM EDEMA OU EMPASTAMENTO, PULSOS PRESENTES E SIMÉTRICOS.`],
    ['ef-trauma', 'ef', 'Trauma ABCDE (paciente imobilizado)', '',
`A: VIA AÉREA PÉRVIA, IMOBILIZAD{O|A} COM COLAR CERVICAL E PRANCHA RÍGIDA.
B: MV+ SEM RA, EXPANSIBILIDADE TORÁCICA SIMÉTRICA. FR ___ IRPM, SATO2 ___%.
C: RCR 2T SEM SOPROS, AUSÊNCIA DE SANGRAMENTOS EXTERNOS. FC ___ BPM, PA ___ MMHG, TEC < 3 S. ABDOME FLÁCIDO, INDOLOR, DB NEGATIVO. PELVE ESTÁVEL.
D: CONSCIENTE, ORIENTAD{O|A}, PIFR, GLASGOW 15, AUSÊNCIA DE DÉFICIT MOTOR.
E: COLUNAS CERVICAL, TORÁCICA E LOMBAR ESTÁVEIS E INDOLORES À PALPAÇÃO. PREVENÇÃO DE HIPOTERMIA.`],
    ['ef-xabcde', 'ef', 'Trauma XABCDE detalhado (colar retirado)', '',
`X: SEM LESÕES COM HEMORRAGIA EXSANGUINANTE.
A: VIA AÉREA PÉRVIA, SEM SINAIS DE OBSTRUÇÃO OU DESCONFORTO RESPIRATÓRIO. COLUNA CERVICAL COM MOBILIDADE PRESERVADA, SEM DOR OU CREPITAÇÃO À PALPAÇÃO (RETIRO COLAR CERVICAL).
B: MV+ BILATERAL SEM RA, EUPNEIC{O|A} EM AA, SATURANDO ___%, SEM SINAIS DE DESCONFORTO RESPIRATÓRIO.
C: PULSOS PRESENTES, SEM LESÕES EXSANGUINANTES, SEM SINAIS DE INSTABILIDADE. FC ___ BPM, TEC < 2 S. PELVE ESTÁVEL, SEM ALTERAÇÕES ABDOMINAIS.
D: GLASGOW 15, LÚCID{O|A} E ORIENTAD{O|A} EM TEMPO E ESPAÇO, RESPOSTA VERBAL ORGANIZADA, ABERTURA OCULAR ESPONTÂNEA, PUPILAS ISOFOTORREAGENTES.
E: SEM EVIDÊNCIA DE LESÕES OCULTAS.`],
    ['ef-hints', 'ef', 'HINTS (vertigem aguda)', '',
`HINTS:
IMPULSO CEFÁLICO (HEAD IMPULSE): ___ (OLHAR PERMANECE FIXO DURANTE A ROTAÇÃO / SACADA CORRETIVA).
NISTAGMO: AUSENTE NO MOMENTO DA AVALIAÇÃO.
TESTE DE SKEW (COBERTURA ALTERNADA): SEM DESVIO VERTICAL DO OLHAR AO COBRIR E DESCOBRIR.`],

    // ===== EVOLUÇÃO
    ['ev-cg-enf', 'ev', 'Evolução cirurgia geral (enfermaria)', '',
`# EVOLUÇÃO MÉDICA
# CIRURGIA GERAL
# DIAGNÓSTICO: ___
# DIETA: ___
# ATB: ___

# EV: PACIENTE EM LEITO DE ENFERMARIA, CONSCIENTE E ORIENTAD{O|A} EM TEMPO E ESPAÇO, ESTÁVEL HEMODINAMICAMENTE, EUPNEIC{O|A} EM AR AMBIENTE, EM DIETA ___. DIURESE PRESENTE, EVACUAÇÃO PRESENTE. NEGA DOR ABDOMINAL, NÁUSEAS, VÔMITOS, FEBRE E DEMAIS SINTOMAS.

# AO EXAME FÍSICO
BEG, CORAD{O|A}, HIDRATAD{O|A}, ACIANÓTIC{O|A}, ANICTÉRIC{O|A}, AFEBRIL. CONSCIENTE E ORIENTAD{O|A} EM TEMPO E ESPAÇO.
ACV: 2 BULHAS RÍTMICAS E NORMOFONÉTICAS, SEM SOPROS.
APL: MV+ BILATERALMENTE, SEM RUÍDOS ADVENTÍCIOS.
ABD: FLÁCIDO, INDOLOR, RHA+, DB NEGATIVO, MURPHY NEGATIVO, GIORDANO NEGATIVO.
MMII: SEM EDEMA OU EMPASTAMENTO.

# EXAMES COMPLEMENTARES:

# CD: DISCUTO CASO COM DR. ___, QUE ORIENTA:
1. ___`],
    ['ev-cg-emerg', 'ev', 'Evolução cirurgia geral (leito de emergência)', '',
`# EVOLUÇÃO MÉDICA
# CIRURGIA GERAL
# DIAGNÓSTICO: ___
# DIETA: ___
# ATB: ___

# EV: PACIENTE EM LEITO DE EMERGÊNCIA, CONSCIENTE E ORIENTAD{O|A}, ESTÁVEL HEMODINAMICAMENTE, EUPNEIC{O|A} EM AA, EM DIETA ZERO, DIURESE E EVACUAÇÃO PRESENTES. REFERE DOR ___. NEGA FEBRE, VÔMITOS OU OUTROS SINTOMAS.

# EF: BEG, CHAAAE, LOTE, GLASGOW 15.
RCR 2T BNF S/S.
MV+ S/RA.
ABD FLÁCIDO, INDOLOR, RHA+, DB-, MURPHY-, GIORDANO-.
MMII SEM SINAIS DE TVP OU INFECCIOSOS, PULSOS+, TEC < 3 S.

# CD:
1. DISCUTO CASO COM DR. ___
2. SOLICITO ROTINA
3. CUIDADOS DE EMERGÊNCIA`],
    ['ev-torac', 'ev', 'Evolução cirurgia torácica (com dreno)', '',
`# EVOLUÇÃO MÉDICA
# CIRURGIA TORÁCICA / DRENO ___
# DIAGNÓSTICO: ___
# ATB: ___

# EV: PACIENTE EM LEITO DE ENFERMARIA, CONSCIENTE E ORIENTAD{O|A}, ESTÁVEL HEMODINAMICAMENTE, EUPNEIC{O|A} EM AA. REFERE DOR ___. NÃO APRESENTOU DISPNEIA OU ALTERAÇÕES RESPIRATÓRIAS. NEGA OUTROS SINTOMAS.

# EF: BEG, CHAAAE, LOTE.
RCR 2T BNF S/S.
MV+ S/RA.
ABD FLÁCIDO, INDOLOR, RHA+, DB-.
DÉBITO DO DRENO: ___ ML / 24 H, ASPECTO ___.
DRENO: OSCILA ___, BORBULHA ___.

# CD:
1. DISCUTO CASO COM DR. ___
2. CUIDADOS DE ENFERMARIA
3. CUIDADOS COM DRENO`],

    // ===== ANAMNESE DO PS
    ['hp-dorabd-apend', 'hpma', 'Dor abdominal migratória (suspeita de apendicite)', '',
`# QP: dor abdominal há ___.
# HPMA: paciente relata dor abdominal em epigastro de início súbito, em pontada, migrando para fossa ilíaca direita, com piora à deambulação e melhora parcial com analgesia, associada a náuseas, ___ episódios de vômitos, hiporexia, febre e calafrios.
# AP: nega alergias, nega comorbidades, nega etilismo e tabagismo.`],
    ['hp-colica-biliar', 'hpma', 'Cólica biliar', '',
`# QP: dor abdominal há ___.
# HPMA: paciente relata dor em hipocôndrio direito irradiada para região subescapular direita, em cólica, de forte intensidade, intermitente, com piora após alimentação gordurosa e melhora com analgésicos simples, associada a náuseas e vômitos. Nega febre, calafrios, icterícia, colúria, acolia, prurido e confusão mental.
# AP: nega comorbidades, nega alergias, nega uso de medicamentos, nega etilismo e tabagismo.`],
    ['hp-epigastralgia', 'hpma', 'Epigastralgia / gastrite', '',
`# QP: dor no estômago há ___ dias.
# HPMA: paciente relata dor epigástrica em queimação, de moderada intensidade, contínua, associada a náuseas, plenitude pós-prandial e saciedade precoce, com piora após café e melhora com alimentação. Nega vômitos, perda de peso, hematêmese e melena.
# AP: nega alergias, nega comorbidades, nega etilismo e tabagismo.`],
    ['hp-nefrolitiase', 'hpma', 'Cólica renal / nefrolitíase', '',
`# QP: dor nas costas há ___.
# HPMA: paciente relata dor lombar ___ irradiada para região suprapúbica, em cólica, de forte intensidade, contínua, sem posição de conforto, com melhora parcial após analgésicos simples, associada a disúria, polaciúria, urgência miccional, hematúria, náuseas e vômitos. Relata episódios prévios.
Nega febre, corrimento, anúria e cirurgias renais prévias.
# AP: ___`],
    ['hp-itu', 'hpma', 'Infecção urinária (cistite)', '',
`# QP: dor ao urinar há ___ dias.
# HPMA: paciente relata disúria há ___ dias, associada a polaciúria, urgência miccional e dor suprapúbica em queimação, intermitente. Nega febre, calafrios, dor lombar e corrimento.
# AP: ___
HD: ITU baixa.`],
    ['hp-constipacao', 'hpma', 'Constipação', '',
`# QP: constipação há ___ dias.
# HPMA: paciente relata constipação há ___ dias, com eliminação de flatos, associada a dor em baixo ventre em cólica de moderada intensidade. Nega febre, náuseas e vômitos.
# AP: ___`],
    ['hp-diarreia', 'hpma', 'Diarreia aguda / GECA', '',
`# QP: diarreia há ___ dia(s).
# HPMA: paciente relata diarreia há ___ dia(s), ___ episódios/dia, associada a dor em baixo ventre em cólica de leve intensidade, com melhora após evacuação, e ___ episódios de vômitos. Nega febre, sangue ou muco nas fezes e contactantes com os mesmos sintomas.
# AP: nega comorbidades, nega alergias, nega etilismo e tabagismo.`],
    ['hp-nv', 'hpma', 'Náuseas e vômitos', '',
`# QP: náuseas e vômitos há ___.
# HPMA: paciente (acompanhante) relata náuseas e vômitos há ___ dias, associados a inapetência. Nega febre, diarreia, tosse, dispneia, disúria e contactantes com os mesmos sintomas.
# AP: nega alergias, nega comorbidades, nega cirurgias, nega uso de medicamentos.`],
    ['hp-dortorac', 'hpma', 'Dor torácica', '',
`# QP: dor no peito há ___.
# HPMA: paciente relata dor retroesternal em aperto, de moderada intensidade, com duração de ___, com piora aos esforços e melhora ao repouso, associada a ___. Nega dispneia, síncope e edema de MMII.
# AP: ___
# CD:
1. ECG agora (meta: até 10 minutos da chegada)
2. ___`],
    ['hp-cefaleia', 'hpma', 'Cefaleia (perfil migranoso)', '',
`# QP: dor de cabeça há ___.
# HPMA: paciente relata cefaleia frontal irradiada para regiões parietal e occipital, latejante, incapacitante, de forte intensidade, contínua, com piora ao estresse e esforço físico e melhora com repouso e sono, associada a náuseas, vômitos, fotofobia e fonofobia.
Nega febre, trauma, sinais focais, aura, pior cefaleia da vida e início súbito.
# AP: nega alergias, nega comorbidades, nega tabagismo e etilismo, nega cirurgias prévias.`],
    ['hp-ivas', 'hpma', 'IVAS não complicada', '',
`# QP: tosse há ___.
# HPMA: paciente relata tosse seca há ___, associada a rinorreia hialina, odinofagia, mialgia e astenia. Nega febre, dispneia, tosse produtiva e calafrios.
# AP: nega alergias, nega comorbidades, nega uso de medicamentos.`],
    ['hp-sindgripal', 'hpma', 'Síndrome gripal / COVID-19', '',
`# QP: ___
# HPMA: paciente relata odinofagia há ___, associada a pico febril de ___ °C, rinorreia hialina, astenia, mialgia, artralgia, cefaleia frontal latejante de leve intensidade e tosse seca. Nega dispneia, desconforto torácico, diarreia, dor abdominal e exantema.
# AP: nega comorbidades, nega alergias, nega tabagismo e etilismo.`],
    ['hp-sinusite', 'hpma', 'Rinossinusite', '',
`# QP: ___
# HPMA: paciente relata cefaleia frontal há ___, irradiada para região parietal, latejante, de forte intensidade, associada a rinorreia, dor e edema em hemiface ___, náuseas, mialgia e astenia. Nega febre, tosse e diarreia.
# AP: ___`],
    ['hp-asma', 'hpma', 'Crise asmática', '',
`# QP: falta de ar há ___ dias.
# HPMA: paciente com história de asma (bronquite), em crise há ___ dias, sem acompanhamento médico, com dispneia aos médios esforços e tosse seca. Nega febre e odinofagia.
# AP: asma, em uso de salbutamol ___ jatos se necessário. Nega alergias. Tabagismo: ___. Etilismo: ___.`],
    ['hp-eap', 'hpma', 'Dispneia / IC descompensada', '',
`# QP: dispneia há ___ dias.
# HPMA: paciente relata dispneia aos mínimos esforços há ___ dias, associada a palpitações e edema de membros inferiores. Ortopneia: ___. Dispneia paroxística noturna: ___. Nega febre e tosse produtiva.
# AP: ICC. Medicações em uso: ___`],
    ['hp-pa', 'hpma', 'Pico hipertensivo', '',
`# QP: pico pressórico há ___.
# HPMA: paciente relata pico pressórico de ___ mmHg, associado a ___. Nega cefaleia intensa, dor torácica, dispneia, alteração visual e déficits neurológicos.
# AP: HAS. Medicações em uso: ___. Nega alergias.`],
    ['hp-lombalgia', 'hpma', 'Lombalgia mecânica', '',
`# QP: dor nas costas há ___.
# HPMA: paciente relata dor em região lombossacra, em queimação, com piora aos esforços e à deambulação e melhora ao repouso, contínua, desencadeada por esforço físico. Nega trauma, febre, perda de peso, dor noturna, sintomas urinários, alteração esfincteriana e déficit motor.
# AP: ___
# EF: aumento de tônus da musculatura paravertebral em região de L4-L5. Lasègue negativo. Força e sensibilidade preservadas.
HD: lombalgia mecânica.`],
    ['hp-ansiedade', 'hpma', 'Crise de ansiedade', '',
`# HPMA: paciente relata crise de ansiedade há ___, associada a palpitações, dispneia, tremores e medo intenso. Nega ideação suicida e outras queixas.
# AP: medicações em uso: ___. Nega alergias, tabagismo e etilismo.`],
    ['hp-conjuntivite', 'hpma', 'Conjuntivite', '',
`# QP: olho vermelho há ___ dia(s).
# HPMA: paciente relata hiperemia ocular em olho ___, associada a sensação de corpo estranho, prurido, lacrimejamento e secreção. Nega baixa de acuidade visual, fotofobia importante e trauma.
# CD:
1. Prescrevo colírio
2. Oriento compressas frias por 15 minutos 3 vezes ao dia e não compartilhar toalhas
3. Sinais de alarme
4. Alta médica`],
    ['hp-otalgia', 'hpma', 'Otalgia / otite', '',
`# QP: dor no ouvido há ___ dias.
# HPMA: paciente relata otalgia em ouvido ___ há ___ dias, associada a prurido, plenitude auricular, hipoacusia, zumbido e secreção amarelada. Nega febre, vertigem e coriza.
# AP: nega comorbidades, nega alergias, nega tabagismo e etilismo.`],
    ['hp-dengue', 'hpma', 'Suspeita de dengue', '',
`# QP: dor no corpo.
# HPMA: paciente relata febre de ___ °C há ___ dias, associada a artralgia, mialgia, cefaleia retro-orbitária latejante de moderada intensidade e exantema maculopapular. Nega sinais de alarme: dor abdominal intensa, vômitos persistentes, sangramentos, hipotensão, sonolência ou irritabilidade.
# AP: nega comorbidades, nega alergias, nega tabagismo e etilismo.
# CD:
1. Oriento sinais de alarme e retorno em caso de piora: sangramento gengival, vômitos incoercíveis, dor abdominal
2. Oriento hidratação oral abundante
3. Prescrevo sintomáticos`],
    ['hp-escorpiao', 'hpma', 'Picada de escorpião', '',
`# QP: picada de escorpião há ___ minutos.
# HPMA: paciente relata picada de escorpião ___ em ___, com dor local de ___ intensidade, edema e hiperemia. Nega náuseas, vômitos, sudorese, dor torácica, sialorreia e hipotensão.`],
    ['hp-mordedura', 'hpma', 'Mordedura de cão', '',
`# QP: mordedura de cachorro há ___ horas.
# HPMA: paciente relata mordedura de cão há ___ horas em ___, com ferimento corto-contuso de ___ cm. Animal: ___ (conhecido / observável / vacinado). Nega outras queixas.
# AP: vacina antitetânica: ___.`],
    ['hp-ferimento', 'hpma', 'Ferimento corto-contuso com sutura', '',
`# QP: ferimento corto-contuso em ___.
# HPMA: paciente apresenta ferimento corto-contuso em região de ___, de ___ cm. Nega perda de força, parestesia e febre.
# AP: nega comorbidades, nega alergias. Vacina antitetânica: ___.
# CD:
Assepsia e antissepsia
Anestesia local com lidocaína 2% sem vasoconstritor
Campos estéreis
Sutura com fio ___ 3-0, ___ pontos
Curativo
Sintomáticos ___. Oriento retorno em 7 a 10 dias para retirada dos pontos
Alta médica`],
    ['hp-queda', 'hpma', 'Queda da própria altura / trauma de membro', '',
`# QP: queda da própria altura há ___ horas.
# HPMA: paciente relata queda da própria altura há ___ horas com trauma em ___, com edema e dor local de ___ intensidade, com piora à mobilização. Nega TCE, perda de consciência e instabilidade.
# AP: nega alergias, nega comorbidades, nega etilismo e tabagismo.`],
    ['hp-entorse', 'hpma', 'Entorse de tornozelo', '',
`# QP: torção de tornozelo ___ há ___ dias.
# HPMA: paciente relata entorse de tornozelo ___ há ___ dias, com dor local, edema e piora à mobilização. Consegue apoiar o pé: ___.
# AP: nega alergias, nega comorbidades, nega etilismo e tabagismo.`],
    ['hp-politrauma', 'hpma', 'Politrauma / acidente de moto', '',
`# QP: acidente moto x ___.
# HPMA: paciente trazid{o|a} pelo SAMU com colar cervical e prancha rígida, vítima de acidente moto x ___, com TCE leve ___ perda de consciência, apresentando dor e escoriações em ___.
# AP: nega alergias, nega comorbidades, nega etilismo e tabagismo.
# EF:
A: via aérea pérvia, colar e prancha.
B: MV+ bilateral sem RA. FR ___ irpm, SatO2 ___%.
C: RCR 2T BNF S/S. FC ___ bpm, PA ___ mmHg, TEC < 3 s, sem sangramento ativo.
D: Glasgow 15, pupilas isofotorreagentes, força preservada nos 4 membros.
E: prevenção de hipotermia com cobertor térmico.`],
    ['hp-ameaca-aborto', 'hpma', 'Sangramento na gestação inicial', '',
`# QP: perda de sangue há ___ horas.
# HPMA: paciente gestante de ___ semanas relata sangramento vaginal em pequena quantidade, associado a dor em baixo ventre em cólica. Nega perda de líquido e febre.
# AP: nega alergias, nega comorbidades, nega etilismo e tabagismo.
# EF: G___P___A___, IG ___ semanas. AU ___ cm. BCF ___.
Especular: colo fechado, paredes preservadas, sangramento ___.
Toque vaginal: colo fechado, grosso, com raias de sangue em dedo de luva.`],
    ['hp-candidiase', 'hpma', 'Candidíase vulvovaginal', '',
`# QP: corrimento há ___ dias.
# HPMA: paciente relata prurido e hiperemia vulvar associados a leucorreia esbranquiçada grumosa, e dor suprapúbica em pontada de leve intensidade. Nega febre e dor pélvica intensa.
# AP: ___`],
    ['hp-alergia', 'hpma', 'Reação alérgica / exantema', '',
`# QP: alergia há ___ dias.
# HPMA: paciente relata exantema maculopapular em ___, associado a prurido. Nega dispneia, edema de lábios ou língua, rouquidão, sibilância e febre. Possível desencadeante: ___.
# AP: nega alergias conhecidas, nega comorbidades.`],

    // ===== CONDUTAS E FRASES PRONTAS
    ['cd-alta', 'cd', 'Conduta de alta do PS', '',
`# CD:
1. Orientações gerais
2. Oriento sinais de alarme e retorno imediato se necessário
3. Esclareço dúvidas
4. Prescrevo sintomáticos
5. Alta médica`],
    ['cd-medicado', 'cd', 'Medicado e reavaliado', '',
`Paciente medicad{o|a} conforme prescrição. Reavaliad{o|a}, com melhora ___ dos sintomas. Recebe orientações, sinais de alarme e alta médica com receita.`],
    ['cd-rx-normal', 'cd', 'Radiografia sem fratura (oculta não excluída)', '',
`Radiografia sem fraturas visíveis ao método, porém não exclui fratura oculta. Oriento retorno em caso de persistência ou piora dos sintomas.`],
    ['cd-tce-leve', 'cd', 'TCE leve sem indicação de TC', '',
`Paciente de ___ anos, Glasgow 15, sem sinais de fratura de crânio ou de base de crânio, sem amnésia, sem náuseas ou vômitos, sem crise convulsiva, sem déficits neurológicos. Não faz uso de anticoagulantes ou antiagregantes. Nega coagulopatia pessoal ou familiar.
Sem critérios para tomografia de crânio no momento. Oriento observação domiciliar por acompanhante nas próximas 24 h e retorno imediato se cefaleia progressiva, vômitos, sonolência, confusão, convulsão ou déficit.`],
    ['cd-discutido', 'cd', 'Caso discutido com o plantonista', '',
`Caso discutido com Dr. ___ (___), que orienta: ___`],
    ['cd-recusa', 'cd', 'Recusa de conduta / evasão', '',
`Paciente orientad{o|a} quanto ao diagnóstico, à conduta proposta (___) e aos riscos da recusa, incluindo ___. Lúcid{o|a} e orientad{o|a}, com capacidade de decisão preservada, recusa a conduta. Assina termo de recusa. Oriento retorno a qualquer momento.`],

    // ===== AMBULATÓRIO
    ['amb-hernia', 'amb', 'Ambulatório: hérnia', '',
`AMBULATÓRIO / HÉRNIA
BEG, CHAAAE, LOTE.
ABD FLÁCIDO, INDOLOR, RHA+, DB-.
DIURESE E EVACUAÇÕES PRESENTES.
PRESENÇA DE HÉRNIA ___ REDUTÍVEL, SEM SINAIS DE ENCARCERAMENTO OU ISQUEMIA.
FO: ___`],
    ['amb-vesicula', 'amb', 'Ambulatório: vesícula', '',
`AMBULATÓRIO / VESÍCULA
BEG, CHAAAE, LOTE.
ABD FLÁCIDO, INDOLOR, RHA+, DB-, MURPHY-.
DIURESE E EVACUAÇÕES PRESENTES.
FO: ___`],
    ['amb-pontos', 'amb', 'Retorno pós-operatório (retirada de pontos)', '',
`PACIENTE EM PO DE ___, VEM PARA REAVALIAÇÃO DE FERIDA OPERATÓRIA E RETIRADA DE PONTOS. ASSINTOMÁTIC{O|A}. NEGA ALGIAS OU OUTROS SINTOMAS.
EF: BEG, CHAAA, LOTE. FO DE BOM ASPECTO, SEM SINAIS FLOGÍSTICOS OU SECREÇÃO.
CD: RETIRO PONTOS. ___`],
    ['amb-vasc-escl', 'amb', 'Vascular: retorno de escleroterapia / espuma', '',
`PACIENTE VEM AO RETORNO APÓS ESCLEROTERAPIA, COM ___ RESULTADO, PARA AGENDAR NOVA SESSÃO.
EF: BEG, CHAAA, LOTE.
CD: RENOVO GUIAS. SOLICITO NOVA ESPUMA. RETORNO APÓS GUIA AUTORIZADA.`],
    ['amb-vasc-guia', 'amb', 'Vascular: guia autorizada', '',
`PACIENTE VEM AO RETORNO COM GUIA AUTORIZADA PARA AGENDAR ESCLEROTERAPIA. VARIZES DE MMII EM ACOMPANHAMENTO PARA ESPUMA.
CD: AGENDO ESPUMA PARA O DIA ___.`],
    ['amb-vasc-amput', 'amb', 'Vascular: PO de amputação', '',
`PACIENTE EM PO DE AMPUTAÇÃO DE ___ RETORNA PARA REAVALIAÇÃO DE FERIDA OPERATÓRIA. NEGA SINTOMAS DOS DIVERSOS APARELHOS.
EF: BEG, CHAAA, LOTE. FO DE BOM ASPECTO.
CD: ___`],
    ['amb-meia', 'amb', 'Receita de meia elástica', '',
`USO EXTERNO
1) MEIA ELÁSTICA 3/4, COMPRESSÃO 20-30 MMHG ---------- 1 PAR
USAR DURANTE O DIA, RETIRAR PARA DORMIR.`],

    // ===== ORIENTAÇÕES E DECLARAÇÕES
    ['ori-preop', 'ori', 'Orientações pré-operatórias (cirurgia geral)', '',
`ORIENTAÇÕES PRÉ-OPERATÓRIAS

1. Compareça ao hospital no dia ___ às ___ h, no local de internação: ___.
2. Jejum: não coma nem tome nenhum líquido, nem água, nas 8 horas que antecedem a operação.
3. Medicamentos de uso diário: ___ (siga a orientação do anestesista; anticoagulantes e antidiabéticos precisam de orientação específica).
4. Traga todos os seus exames: raio-X, ultrassom, exames de laboratório e cardiológicos.
5. Tome banho pela manhã ao levantar. Se for preciso, apare os pelos da região a ser operada com tesoura ou máquina, sem lâmina e sem ferir a pele.
6. Se estiver gripado, com febre, doente ou com dúvidas, entre em contato pelo telefone ___.`],
    ['ori-preop-parede', 'ori', 'Pré-operatório com preparo (parede abdominal)', 'Serra Dória',
`ORIENTAÇÕES PRÉ-OPERATÓRIAS

1. Internar no hospital às ___ h do dia ___, pela ___.
2. Jejum desde as 22 h da véspera da cirurgia.
3. Levar todos os exames e avaliações.
4. Tomar banho pela manhã do dia da cirurgia e lavar bem o abdome, principalmente dentro do umbigo.
5. Continuar tomando todos os medicamentos de uso habitual, conforme orientação do anestesista.
6. Levar meia elástica 3/4 de média compressão e faixa abdominal elástica com velcro.
7. Tomar suplemento imunomodulador (Impact) 1 frasco 2 vezes ao dia nos 10 dias antes da cirurgia.
8. A partir de ___ (2 dias antes), alimentar-se com dieta líquida ou batida, sem pedaços.
9. Se estiver com febre, gripe ou doente, ligar e avisar.`],
    ['ori-curativo-ubs', 'ori', 'Solicitação de curativo à UBS (PO de amputação)', '',
`À UBS,

Paciente em pós-operatório de amputação de ___, necessita de curativo diário em ___ 2 vezes ao dia, conforme esquema:
1. Lavar a lesão com clorexidina aquosa e secar.
2. Aplicar rifamicina spray na ferida operatória.
3. Ocluir com gaze e faixa.

Grato.`],
    ['ori-amput-cuidados', 'ori', 'Cuidados após amputação (paciente)', '',
`OBSERVAÇÕES:
- Manter a ferida operatória seca e limpa.
- Aquecer o membro inferior ___ (meias de lã).
- Proteger o pé (calçado fechado).
- Não tentar deambular sem orientação da equipe.`],
    ['ori-cadeira', 'ori', 'Declaração: cadeira de rodas', '',
`AOS DEVIDOS FINS,

Paciente em pós-operatório de amputação de ___ necessita de uso de cadeira de rodas por tempo indeterminado.

CID: ___`],
    ['ori-higienica', 'ori', 'Declaração: cadeira higiênica', '',
`AOS DEVIDOS FINS,

Paciente em pós-operatório de amputação de ___ necessita de cadeira higiênica por tempo indeterminado.

CID: ___`],
    ['ori-acomp', 'ori', 'Declaração: necessita de acompanhamento', '',
`AOS DEVIDOS FINS,

Paciente em pós-operatório de ___, necessitando de acompanhamento devido à impossibilidade de locomoção.

CID: ___`],

    // ===== CROSS / NIR
    ['cr-aceito', 'cross', 'Caso aceito', '',
`CASO ACEITO. FAVOR ENCAMINHAR O PACIENTE À EMERGÊNCIA DO SUS COM DOCUMENTAÇÃO ADEQUADA, CARTÃO SUS, EXAMES DE IMAGEM E LABORATORIAIS SE DISPONÍVEIS, PARA AVALIAÇÃO DA EQUIPE. GRATO.`],
    ['cr-aceito-urg', 'cross', 'Caso aceito (encaminhar com urgência se piora)', '',
`CASO ACEITO. FAVOR ENCAMINHAR O PACIENTE À EMERGÊNCIA DO SUS; SE PIORA DO QUADRO CLÍNICO, ENCAMINHAR COM URGÊNCIA. FAVOR ANEXAR DOCUMENTAÇÃO ADEQUADA, CARTÃO SUS, EXAMES DE IMAGEM E LABORATORIAIS SE DISPONÍVEIS, PARA AVALIAÇÃO DA EQUIPE. GRATO.`],
    ['cr-super-curto', 'cross', 'Negado: superlotação (curto)', '',
`CASO NEGADO. ESTAMOS EM SUPERLOTAÇÃO, SEM CONDIÇÕES DE ABSORVER O CASO NO MOMENTO. PEÇO A COMPREENSÃO. GRATO.`],
    ['cr-super-ficha', 'cross', 'Negado: superlotação, manter ficha atualizada', '',
`CASO NEGADO. NO MOMENTO ESTAMOS EM SUPERLOTAÇÃO, SEM CONDIÇÕES DE ABSORVER O CASO. SOLICITO MANTER FICHA ATUALIZADA COM EVOLUÇÃO DO QUADRO CLÍNICO E RESULTADOS DE EXAMES LABORATORIAIS E DE IMAGEM PARA POSTERIOR ACEITE. PEÇO A COMPREENSÃO. GRATO.`],
    ['cr-super-corredor', 'cross', 'Negado: superlotação, pacientes no corredor', '',
`CASO NEGADO. ESTAMOS EM SUPERLOTAÇÃO, COM PACIENTES AGUARDANDO LEITO NO CORREDOR E EM POLTRONAS NO PS, SEM CONDIÇÕES DE ABSORVER O CASO NO MOMENTO. ESTAMOS TENTANDO REMANEJAR LEITOS. FAVOR EXPANDIR AS BUSCAS. PEÇO A COMPREENSÃO. GRATO.`],
    ['cr-super-n', 'cross', 'Negado: superlotação, já absorvidos muitos pacientes', '',
`BOA NOITE. ESTAMOS EM SUPERLOTAÇÃO. JÁ ABSORVEMOS MAIS DE ___ PACIENTES VIA SAMU E CROSS HOJE, E AINDA HÁ ___ PACIENTES AGUARDANDO TRANSFERÊNCIA, ALGUNS EM POLTRONAS. ESTAMOS TENTANDO REMANEJAR LEITOS. SEM CONDIÇÕES DE ABSORVER MAIS PACIENTES NO MOMENTO. PEÇO A COMPREENSÃO DE TODOS. GRATO.`],
    ['cr-pcp3', 'cross', 'Negado: PCP nível 3 ativado', '',
`BOA NOITE. ESTAMOS COM PCP NÍVEL 3 ATIVADO, COM MAIS DE ___ PACIENTES REGULADOS NO DIA, EM SUPERLOTAÇÃO, COM PACIENTES AGUARDANDO EM MACAS NOS CORREDORES, SEM CONDIÇÕES DE ABSORVER O CASO NO MOMENTO. PEÇO MANTER A FICHA ATUALIZADA COM EVOLUÇÃO DO QUADRO CLÍNICO E NEUROLÓGICO E RESULTADOS DE EXAMES LABORATORIAIS E DE IMAGEM PARA POSTERIOR ACEITE. ESTAMOS TENTANDO REMANEJAR LEITOS. PEÇO A COMPREENSÃO. GRATO.`],
    ['cr-isolamento', 'cross', 'Negado: sem leito de isolamento / infectologia', '',
`BOA NOITE. ESTAMOS COM PCP NÍVEL 3 ATIVADO, EM SUPERLOTAÇÃO, SEM LEITO DE ISOLAMENTO DISPONÍVEL PARA RECEBER O PACIENTE NO MOMENTO E SEM SERVIÇO DE INFECTOLOGIA EM NOSSO HOSPITAL. SOLICITO AMPLIAÇÃO DAS BUSCAS. GRATO.`],
    ['cr-resp', 'cross', 'Caso respiratório: pendências', '',
`PACIENTE COLETOU PAINEL VIRAL? ESTÁ EM USO DE OSELTAMIVIR? ESTAMOS TENTANDO REMANEJAR LEITOS PARA ABSORVER OS CASOS RESPIRATÓRIOS. PEÇO A COMPREENSÃO DE TODOS. FAVOR MANTER A FICHA ATUALIZADA PARA POSTERIOR ACEITE. GRATO.`],
    ['cr-municipe', 'cross', 'Negado: munícipe de fora da cidade', '',
`CASO NEGADO. ESTAMOS EM SUPERLOTAÇÃO E NÃO SOMOS REFERÊNCIA PARA MUNÍCIPES DE FORA DE ___. FAVOR ENCAMINHAR PARA A REFERÊNCIA. GRATO.`],
    ['cr-gestante', 'cross', 'Negado: gestante de alto risco', '',
`CASO NEGADO. CONFORME PACTUAÇÃO, NÃO SOMOS REFERÊNCIA PARA GESTANTES DE ALTO RISCO. GRATO.`],
    ['cr-avc', 'cross', 'Negado: AVC em janela de trombólise', '',
`CASO NEGADO. NÃO SOMOS REFERÊNCIA PARA PACIENTES COM AVC EM JANELA TERAPÊUTICA, POIS NÃO DISPOMOS DE TROMBÓLISE. FAVOR ENCAMINHAR PARA A REFERÊNCIA PACTUADA (___). GRATO.`],
    ['cr-hiv', 'cross', 'Negado: HIV (B24), sem infectologia', '',
`CASO NEGADO. ESTAMOS EM SUPERLOTAÇÃO E, CONFORME PACTUAÇÃO, NÃO SOMOS REFERÊNCIA PARA PACIENTES PORTADORES DE B24, POIS NÃO DISPOMOS DE SERVIÇO DE INFECTOLOGIA. GRATO.`],
    ['cr-municipal', 'cross', 'Negado: paciente de hospital com suporte pactuado', '',
`BOA NOITE. NO MOMENTO ESTAMOS EM SUPERLOTAÇÃO, SEM CONDIÇÕES DE ABSORVER O CASO. PACIENTE INTERNADO NO ___, CUJO HOSPITAL DE SUPORTE PACTUADO É O ___. POR GENTILEZA, SOLICITO ENCAMINHAR O PACIENTE PARA O HOSPITAL DE SUPORTE. GRATO.`],
    ['cr-seguimento', 'cross', 'Negado: já acompanha em outro serviço', '',
`BOA NOITE. PACIENTE JÁ EM ACOMPANHAMENTO NO ___ DEVIDO À CONDIÇÃO DE BASE, E A QUEIXA PRINCIPAL REFERE-SE A PROCEDIMENTO REALIZADO NESSE SERVIÇO. POR GENTILEZA, SOLICITO ENCAMINHAR O PACIENTE PARA O ___. ESTAMOS EM SUPERLOTAÇÃO. VAGA NEGADA. GRATO.`],
    // ===== SANTA CASA (frases do sistema do hospital, curadas)
    ['sc-pre-operatorio-cirurgia-geral-sus', 'ori', 'Pré-operatório cirurgia geral (SUS)', 'Santa Casa',
`NO DIA DA CIRURGIA, COMPAREÇA AO HOSPITAL:

1. NO LOCAL DE INTERNAÇÃO DO SUS (EMERGÊNCIA DO SUS, ENTRADA PELA RUA TIRADENTES) ÀS 06:00 H.
2. EM JEJUM: NÃO COMA E NÃO BEBA NADA, NEM ÁGUA, NAS 8 HORAS ANTES DA CIRURGIA.
3. REMÉDIOS DE USO DIÁRIO: SEGUIR A ORIENTAÇÃO DO ANESTESISTA. SE NÃO RECEBEU ORIENTAÇÃO, NÃO TOMAR NO DIA.
4. TRAGA TODOS OS SEUS EXAMES: RAIO X, ULTRASSOM, EXAMES DE LABORATÓRIO E EXAMES DO CORAÇÃO.
5. TOME BANHO PELA MANHÃ, AO LEVANTAR.
6. NÃO SE ESQUEÇA DO TERMO DE CONSENTIMENTO.
7. RETIRE ADORNOS, PIERCING, UNHA DE GEL, CÍLIOS E APLIQUES.
8. SE ESTIVER GRIPADO(A) OU DOENTE, ENTRE EM CONTATO: ___.`],
    ['sc-pos-operatorio-cirurgia-geral-geral', 'ori', 'Pós-operatório cirurgia geral (geral)', 'Santa Casa',
`ORIENTAÇÕES PÓS-OPERATÓRIAS

- ALGUM DESCONFORTO OU DOR NO LOCAL DA CIRURGIA PODE OCORRER NOS PRIMEIROS DIAS.
- REPOUSO RELATIVO. EVITAR ESFORÇO FÍSICO (CARREGAR PESO, AGACHAR, SUBIR E DESCER ESCADAS REPETIDAMENTE, DIRIGIR, ANDAR DE BICICLETA OU MOTO, TER RELAÇÃO SEXUAL) POR ___ DIAS OU ATÉ LIBERAÇÃO MÉDICA.
- CAMINHAR LEVE DENTRO DE CASA É PERMITIDO E RECOMENDADO.
- AO TOSSIR OU ESPIRRAR, PROTEGER A BARRIGA COM AS MÃOS OU UM TRAVESSEIRO.
- USAR A FAIXA ABDOMINAL DURANTE O DIA, RETIRANDO PARA O BANHO E PARA DORMIR.
- APÓS RETIRAR O CURATIVO, LAVAR A FERIDA COM ÁGUA E SABONETE NEUTRO NO BANHO E SECAR BEM, SEM ESFREGAR.
- EVITAR DEITAR SOBRE O LADO OPERADO.
- EVITAR EXPOSIÇÃO DA CICATRIZ AO SOL.
- BEBER 2 LITROS DE ÁGUA POR DIA. EVITAR ALIMENTOS GORDUROSOS, PESADOS E INDUSTRIALIZADOS. COMER FRUTAS, VERDURAS, LEGUMES E FIBRAS.
- USAR AS MEDICAÇÕES CONFORME A RECEITA. PARA DOR, USAR DIPIRONA OU PARACETAMOL.

PROCURAR A EMERGÊNCIA SE:
- FEBRE.
- DOR NA BARRIGA FORTE OU QUE VAI PIORANDO.
- VERMELHIDÃO, CALOR, INCHAÇO OU SAÍDA DE PUS PELA FERIDA.
- SANGRAMENTO PELA CICATRIZ.
- ABERTURA DOS PONTOS.
- NÁUSEAS OU VÔMITOS QUE NÃO PARAM.
- BARRIGA MUITO DISTENDIDA OU PARADA DE ELIMINAÇÃO DE FEZES E GASES.`],
    ['sc-dreno-de-succao-portovac', 'ori', 'Dreno de sucção (Portovac)', 'Santa Casa',
`ORIENTAÇÕES PARA ALTA COM DRENO DE SUCÇÃO (PORTOVAC)

LAVE AS MÃOS COM ÁGUA E SABÃO ANTES E DEPOIS DE MEXER NO DRENO.

- MANTENHA A BOLSA SANFONADA SEMPRE ABAIXO DO LOCAL ONDE O DRENO ENTRA NA PELE.
- O DRENO PODE FICAR PRESO À ROUPA. NÃO DEIXE ENCOSTAR NO CHÃO.
- USE ROUPAS MAIS LARGAS.
- CUIDADO PARA NÃO PUXAR O DRENO AO MUDAR DE POSIÇÃO OU LEVANTAR.

PARA ESVAZIAR:
1. FECHE A PINÇA (CLAMP) DO TUBO.
2. ESVAZIE A BOLSA EM UM FRASCO COM MEDIDA (COPO MEDIDOR OU MAMADEIRA) E ANOTE QUANTOS ML SAÍRAM.
3. APERTE A BOLSA, TAMPE E SOLTE A PINÇA.
4. JOGUE A SECREÇÃO NO VASO SANITÁRIO E LAVE AS MÃOS.

AVISE SEU MÉDICO SE:
- A SECREÇÃO FICAR VERMELHO VIVO OU AUMENTAR MUITO DE QUANTIDADE.
- O DRENO SAIR SOZINHO.
- NÃO SAIR NENHUMA SECREÇÃO EM 24 HORAS.
- A BOLSA ENCHER DE AR SOZINHA MESMO FECHADA (PODE SER VAZAMENTO).`],
    ['sc-cuidados-com-sne-e-gastrostomia', 'ori', 'Cuidados com SNE e gastrostomia', 'Santa Casa',
`ORIENTAÇÕES PARA CUIDADORES DE PACIENTES COM SONDA NASOENTERAL OU GASTROSTOMIA

1. LAVAR AS MÃOS E LIMPAR O LOCAL E O MATERIAL DE PREPARO DA DIETA COM ÁLCOOL 70%.
2. USAR A DIETA LOGO APÓS O PREPARO. SE NÃO USAR, GUARDAR NA GELADEIRA.
3. LAVAR A SONDA COM 50 ML DE ÁGUA FILTRADA ANTES E DEPOIS DE CADA DIETA OU MEDICAÇÃO.
4. DAR AS MEDICAÇÕES PELA SONDA LONGE DAS DIETAS (1 HORA).
5. PENDURAR O FRASCO DA DIETA 60 CM ACIMA DA CABEÇA.
6. ELEVAR A CABECEIRA A 45 GRAUS OU DEIXAR SENTADO DURANTE A DIETA E ESPERAR PELO MENOS 30 MINUTOS PARA DEITAR.
7. ESTIMULAR ALIMENTAÇÃO PELA BOCA COM DIETA PASTOSA SOMENTE QUANDO LIBERADO.`],
    ['sc-dieta-pastosa', 'ori', 'Dieta pastosa', 'Santa Casa',
`ORIENTAÇÃO NUTRICIONAL: DIETA PASTOSA

ALIMENTOS INDICADOS:
- PÃES, MASSAS, ARROZ E CEREAIS QUE POSSAM SER TRANSFORMADOS EM PURÊ; MINGAU DE AVEIA, AMIDO DE MILHO, CREME DE ARROZ.
- LEITE, IOGURTE, VITAMINA, QUEIJO COTTAGE OU RICOTA AMASSADOS, PUDIM, FLAN, MANJAR.
- BOLACHA DE MAISENA, TORRADA, PÃO SEM CASCA.
- CALDO DE FEIJÃO; CARNE, FRANGO E PEIXE MAGROS DESFIADOS OU MOÍDOS.
- PURÊ DE LEGUMES (BATATA, CENOURA, BETERRABA, BATATA-DOCE).
- GELATINA, GELEIA, SORVETE, MEL; FRUTAS COZIDAS EM PAPA, PURÊ OU CREME, SEM CASCA; SUCOS.

ALIMENTOS A EVITAR:
- PÃES DUROS OU COM SEMENTES, BISCOITOS AMANTEIGADOS, SALGADOS DE PASTELARIA.
- ARROZ NORMAL, CEREAIS COM PASSAS, NOZES OU SEMENTES.
- VERDURAS CRUAS, LEGUMES COM SEMENTES OU CASCA.
- FRUTAS COM BAGAÇO (ABACAXI, LARANJA, UVA).
- IOGURTE COM PEDAÇOS DE FRUTA.
- CARNES DURAS, EMPANADAS OU CROCANTES, OVO FRITO, BACON, AZEITONA, COCO.
- SAL, PIMENTA, KETCHUP E MOSTARDA SOMENTE COM MODERAÇÃO.`],
    ['sc-habito-intestinal-e-fibras', 'ori', 'Hábito intestinal e fibras', 'Santa Casa',
`ORIENTAÇÕES PARA O INTESTINO

1. LÍQUIDOS: BEBER 2 A 3 LITROS POR DIA (ÁGUA, SUCOS, CHÁS, LEITE), AOS POUCOS AO LONGO DO DIA.
2. EXERCÍCIO: CAMINHAR OU FAZER ATIVIDADE FÍSICA TODOS OS DIAS.
3. HÁBITO: TENTAR EVACUAR SEMPRE NO MESMO HORÁRIO, COM CALMA, SEM FORÇAR.
4. FIBRAS TODOS OS DIAS:
   - VERDURAS (QUALQUER FOLHA).
   - LEGUMES (CENOURA, ABÓBORA, BERINJELA, QUIABO, TOMATE, FEIJÃO, ERVILHA).
   - FRUTAS (MAMÃO, AMEIXA PRETA, LARANJA COM BAGAÇO).
   - CAFÉ DA MANHÃ COM AVEIA, GRANOLA OU VITAMINA COM BANANA.
   - PÃO INTEGRAL NO LANCHE.
5. DIMINUIR: ARROZ BRANCO, MACARRÃO, PÃO BRANCO, FARINHA, BOLOS, SORVETES CREMOSOS, FRITURAS E SALGADOS.`],
    ['sc-refluxo-gastrite-e-ulcera-dieta-e-habitos', 'ori', 'Refluxo, gastrite e úlcera (dieta e hábitos)', 'Santa Casa',
`ORIENTAÇÕES PARA REFLUXO, GASTRITE E ÚLCERA

EVITAR:
- BEBIDAS: CAFÉ, CHÁ PRETO, MATE E VERDE, BEBIDA ALCOÓLICA, REFRIGERANTE E ÁGUA COM GÁS.
- PIMENTA, MOLHOS PICANTES, KETCHUP, MOSTARDA, MAIONESE E MOLHOS INDUSTRIALIZADOS.
- FRITURAS, CARNES GORDAS, EMBUTIDOS (LINGUIÇA, SALSICHA, BACON), CHOCOLATE.
- FRUTAS ÁCIDAS (LIMÃO, LARANJA, ABACAXI, MARACUJÁ) E MOLHO DE TOMATE.
- ALIMENTOS ULTRAPROCESSADOS.

PREFERIR:
- FRANGO SEM PELE, PEIXE E CARNES MAGRAS, GRELHADOS, ASSADOS OU COZIDOS.
- LEITE DESNATADO E QUEIJOS BRANCOS.
- MAÇÃ, PERA, MAMÃO, BANANA, CENOURA, ABOBRINHA E CHUCHU, DE PREFERÊNCIA COZIDOS.
- ARROZ, MACARRÃO, AVEIA E PÃO TORRADO.

HÁBITOS:
- FAZER REFEIÇÕES MENORES A CADA 3 HORAS. NÃO FICAR LONGOS PERÍODOS EM JEJUM.
- COMER DEVAGAR E MASTIGAR BEM.
- NÃO DEITAR NAS 2 A 3 HORAS APÓS AS REFEIÇÕES.
- DORMIR COM A CABECEIRA DA CAMA ELEVADA (15 A 20 CM).
- EVITAR BEBER MUITO LÍQUIDO DURANTE AS REFEIÇÕES.
- USAR ROUPAS FOLGADAS, SEM CINTOS APERTADOS.
- MANTER PESO SAUDÁVEL E PARAR DE FUMAR.
- NÃO USAR ANTI-INFLAMATÓRIOS SEM ORIENTAÇÃO MÉDICA.
- TOMAR CORRETAMENTE O REMÉDIO DO ESTÔMAGO (OMEPRAZOL OU PANTOPRAZOL) EM JEJUM.`],
    ['sc-pos-esplenectomia-vacinas-a-ubs', 'ori', 'Pós-esplenectomia: vacinas (à UBS)', 'Santa Casa',
`À UNIDADE BÁSICA DE SAÚDE

PACIENTE EM PÓS-OPERATÓRIO DE ESPLENECTOMIA (ASPLENIA). SOLICITO VACINAÇÃO CONFORME CALENDÁRIO DO CRIE PARA ASPLÊNICOS:
- VACINA PNEUMOCÓCICA.
- VACINA MENINGOCÓCICA.
- VACINA CONTRA HAEMOPHILUS INFLUENZAE TIPO B.
- VACINA CONTRA INFLUENZA (ANUAL).`],
    ['sc-atestado-medico-afastamento', 'doc', 'Atestado médico (afastamento)', 'Santa Casa',
`ATESTADO MÉDICO

ATESTO, PARA OS DEVIDOS FINS, QUE O(A) PACIENTE SUPRACITADO(A) ESTEVE SOB MEUS CUIDADOS NESTA DATA E NECESSITA SE AFASTAR DE SUAS ATIVIDADES LABORAIS POR ___ DIAS, A PARTIR DE __/__/____.

CID: ___`],
    ['sc-atestado-de-acompanhante', 'doc', 'Atestado de acompanhante', 'Santa Casa',
`ATESTADO MÉDICO

ATESTO, PARA FINS TRABALHISTAS, QUE O(A) SR(A). ______________________ ESTEVE ACOMPANHANDO O(A) PACIENTE ______________________ DURANTE INTERNAÇÃO HOSPITALAR NESTA INSTITUIÇÃO NO PERÍODO DE __/__/____ A __/__/____, NECESSITANDO DE ___ DIA(S) DE AFASTAMENTO DE SUAS ATIVIDADES LABORAIS.

CID: Z76.3`],
    ['sc-relatorio-de-retorno-as-atividades', 'doc', 'Relatório de retorno às atividades', 'Santa Casa',
`RELATÓRIO MÉDICO

ATESTO, PARA OS DEVIDOS FINS, QUE O(A) PACIENTE ______________________ FOI SUBMETIDO(A) A PROCEDIMENTO CIRÚRGICO NESTE SERVIÇO, SENDO NECESSÁRIOS ___ DIAS DE AFASTAMENTO NO PÓS-OPERATÓRIO. APÓS O TÉRMINO DESTE PERÍODO, O(A) PACIENTE ENCONTRA-SE EM CONDIÇÕES DE RETORNO ÀS ATIVIDADES LABORAIS.`],
    ['sc-declaracao-de-internacao-por-periodo-indeterminado', 'doc', 'Declaração de internação por período indeterminado', 'Santa Casa',
`DECLARAÇÃO

DECLARO QUE O(A) PACIENTE ______________________ ENCONTRA-SE INTERNADO(A) EM ENFERMARIA DESTA INSTITUIÇÃO, EM ACOMPANHAMENTO PELA EQUIPE DE CIRURGIA GERAL. MANTÉM QUADRO CLÍNICO ESTÁVEL, PORÉM NECESSITA DE SUPORTE HOSPITALAR CONTÍNUO E, ATÉ O MOMENTO, NÃO APRESENTA CONDIÇÕES DE ALTA, DEVENDO PERMANECER INTERNADO(A) POR PERÍODO INDETERMINADO PARA CONTROLE TERAPÊUTICO.`],
    ['sc-retorno-no-ambulatorio-da-cirurgia-geral', 'doc', 'Retorno no ambulatório da cirurgia geral', 'Santa Casa',
`RETORNO AMBULATORIAL

AGENDAR RETORNO EM ___ DIAS NO AMBULATÓRIO DA CIRURGIA GERAL, DR(A). ______________________.

LOCAL: AMBULATÓRIO DA CIRURGIA GERAL (RUA SIQUEIRA CAMPOS, PORTA 3).

CIRURGIA REALIZADA: ______________________ EM __/__/____.

MOTIVO DO RETORNO: AVALIAR FERIDA OPERATÓRIA / RETIRADA DE PONTOS / RESULTADO DE BIÓPSIA.

LEVAR ESTA RECEITA E OS EXAMES REALIZADOS.`],
    ['sc-retorno-apos-exames-pre-operatorios', 'doc', 'Retorno após exames pré-operatórios', 'Santa Casa',
`APÓS REALIZAR OS EXAMES PRÉ-OPERATÓRIOS E A AVALIAÇÃO DO ANESTESISTA, AGENDAR RETORNO NO AMBULATÓRIO DA CIRURGIA GERAL, DR(A). ______________________.

LOCAL: AMBULATÓRIO DA CIRURGIA GERAL (RUA SIQUEIRA CAMPOS, PORTA 3).`],
    ['sc-curativo-na-ubs', 'doc', 'Curativo na UBS', 'Santa Casa',
`À UNIDADE BÁSICA DE SAÚDE

PACIENTE NECESSITA DE CURATIVO DIÁRIO EM ______________________ POR ___ DIAS (OU ATÉ CICATRIZAÇÃO), CONFORME ESQUEMA:

1. LAVAR A LESÃO COM SORO FISIOLÓGICO OU CLOREXIDINA AQUOSA.
2. APLICAR ______________________ (EX.: RIFAMICINA SPRAY / COLAGENASE).
3. OCLUIR COM GAZE E FAIXA, SEM COMPRIMIR.

CID: ___`],
    ['sc-material-de-curativo-a-ubs', 'doc', 'Material de curativo (à UBS)', 'Santa Casa',
`À UNIDADE BÁSICA DE SAÚDE

SOLICITO MATERIAL PARA TROCA DE CURATIVO DIÁRIO EM DOMICÍLIO:
- 10 PACOTES DE GAZE ESTÉRIL
- 2 ATADURAS LARGAS
- 2 FRASCOS DE ÓLEO DE GIRASSOL (AGE)
- FITA MICROPORE MÉDIA/LARGA`],
    ['sc-vacina-antitetanica-a-ubs', 'doc', 'Vacina antitetânica (à UBS)', 'Santa Casa',
`À UNIDADE BÁSICA DE SAÚDE

SOLICITO AVALIAÇÃO DA CARTEIRA VACINAL E APLICAÇÃO DE VACINA ANTITETÂNICA (dT), SE INDICADA, EM PACIENTE VÍTIMA DE FERIMENTO POR ______________________ EM __/__/____.`],
    ['sc-solicitacao-de-bolsas-de-colostomia', 'doc', 'Solicitação de bolsas de colostomia', 'Santa Casa',
`RELATÓRIO MÉDICO

PACIENTE PORTADOR(A) DE ______________________ (COLOSTOMIA / ILEOSTOMIA), COM NECESSIDADE DE USO DE BOLSAS COLETORAS PARA MANEJO ADEQUADO DAS ELIMINAÇÕES, PROTEÇÃO DA PELE PERIESTOMAL E PREVENÇÃO DE COMPLICAÇÕES LOCAIS.

SOLICITO AUTORIZAÇÃO E FORNECIMENTO REGULAR DOS INSUMOS EM QUANTIDADE COMPATÍVEL COM O USO, POR TRATAR-SE DE NECESSIDADE ESSENCIAL E NÃO SUBSTITUÍVEL. A FALTA DO MATERIAL ADEQUADO EXPÕE O(A) PACIENTE A RISCO DE DERMATITE PERIESTOMAL, INFECÇÃO, VAZAMENTOS E NOVAS INTERNAÇÕES.

PROCEDIMENTO: DISPENSAÇÃO DE BOLSAS PARA OSTOMIA
QUANTIDADE MENSAL: ___ UNIDADES
CID: Z93.3 / ___`],
    ['sc-termo-de-consentimento-tc-em-gestante-vitima-de-trauma', 'doc', 'Termo de consentimento: TC em gestante vítima de trauma', 'Santa Casa',
`TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO PARA REALIZAÇÃO DE TOMOGRAFIA COMPUTADORIZADA EM GESTANTE VÍTIMA DE TRAUMA

EU, ____________________________________________, RG Nº ____________________, GESTANTE COM IDADE GESTACIONAL APROXIMADA DE ___ SEMANAS, DECLARO QUE FUI DEVIDAMENTE INFORMADA PELA EQUIPE MÉDICA SOBRE MEU QUADRO CLÍNICO ATUAL, DECORRENTE DE TRAUMA.

FUI ESCLARECIDA DE QUE, DIANTE DA SUSPEITA DE LESÕES INTERNAS POTENCIALMENTE GRAVES (CRANIOENCEFÁLICAS, TORÁCICAS E/OU ABDOMINAIS), A TOMOGRAFIA COMPUTADORIZADA É EXAME FUNDAMENTAL PARA DIAGNÓSTICO RÁPIDO E PRECISO, COM IMPACTO DIRETO NA CONDUTA MÉDICA E NA PRESERVAÇÃO DA MINHA VIDA E DA DO FETO.

RECEBI INFORMAÇÕES CLARAS DE QUE:
- A TOMOGRAFIA UTILIZA RADIAÇÃO IONIZANTE;
- A EXPOSIÇÃO À RADIAÇÃO NA GESTAÇÃO PODE, EM DETERMINADAS CIRCUNSTÂNCIAS, REPRESENTAR RISCO POTENCIAL AO FETO, A DEPENDER DA IDADE GESTACIONAL E DA DOSE RECEBIDA;
- NO CONTEXTO DO TRAUMA, OS BENEFÍCIOS DIAGNÓSTICOS SUPERAM OS RISCOS POTENCIAIS, POIS O ATRASO OU A AUSÊNCIA DE DIAGNÓSTICO PODE RESULTAR EM COMPLICAÇÕES GRAVES OU MORTE MATERNA E FETAL;
- SERÃO ADOTADAS AS MEDIDAS TÉCNICAS DISPONÍVEIS PARA REDUZIR A EXPOSIÇÃO FETAL À RADIAÇÃO.

TIVE A OPORTUNIDADE DE ESCLARECER DÚVIDAS, COMPREENDI AS INFORMAÇÕES E ESTOU CIENTE DOS RISCOS, BENEFÍCIOS E ALTERNATIVAS. DESSA FORMA, AUTORIZO A REALIZAÇÃO DA TOMOGRAFIA COMPUTADORIZADA INDICADA PELA EQUIPE MÉDICA.

LOCAL E DATA: SANTA CASA DE SÃO JOSÉ DO RIO PRETO, __/__/____

ASSINATURA DA PACIENTE (OU RESPONSÁVEL): ____________________________________
MÉDICO RESPONSÁVEL / CRM: ____________________________________
ASSINATURA DO MÉDICO: ____________________________________
TESTEMUNHA: ____________________________________`],
    ['sc-termo-de-recusa-de-procedimento-cirurgico', 'doc', 'Termo de recusa de procedimento cirúrgico', 'Santa Casa',
`TERMO DE RECUSA INFORMADA DE PROCEDIMENTO CIRÚRGICO

EU, ____________________________________________, RG ____________________, CPF ____________________, [ ] PACIENTE  [ ] RESPONSÁVEL PELO(A) PACIENTE ____________________________________________, INTERNADO(A) NA SANTA CASA DE SÃO JOSÉ DO RIO PRETO, DECLARO QUE FUI INFORMADO(A) PELA EQUIPE DE ______________________, DE FORMA CLARA E EM LINGUAGEM ACESSÍVEL, SOBRE O QUADRO CLÍNICO ATUAL:

DIAGNÓSTICO: ____________________________________________

FOI-ME EXPLICADO QUE HÁ INDICAÇÃO MÉDICA DE ______________________ (PROCEDIMENTO), EM CARÁTER DE ______________________, SENDO ESTA A CONDUTA CONSIDERADA ADEQUADA PELA EQUIPE.

FUI ESCLARECIDO(A) SOBRE A NATUREZA DO PROCEDIMENTO, SEUS OBJETIVOS E BENEFÍCIOS, OS RISCOS ANESTÉSICO-CIRÚRGICOS, AS POSSÍVEIS COMPLICAÇÕES E AS CONSEQUÊNCIAS DA NÃO REALIZAÇÃO, INCLUINDO: ____________________________________________ E RISCO DE MORTE.

TIVE OPORTUNIDADE DE FAZER PERGUNTAS, QUE FORAM RESPONDIDAS, E COMPREENDO A GRAVIDADE DO QUADRO. MESMO APÓS OS ESCLARECIMENTOS, RECUSO, DE FORMA LIVRE, VOLUNTÁRIA E CONSCIENTE, A REALIZAÇÃO DO PROCEDIMENTO PROPOSTO, ASSUMINDO AS CONSEQUÊNCIAS DESSA DECISÃO.

FUI INFORMADO(A) DE QUE POSSO REVER MINHA DECISÃO A QUALQUER MOMENTO, ENQUANTO HOUVER POSSIBILIDADE TERAPÊUTICA, E QUE A EQUIPE MANTERÁ OS DEMAIS CUIDADOS CABÍVEIS.

LOCAL E DATA: SANTA CASA DE SÃO JOSÉ DO RIO PRETO, __/__/____

ASSINATURA DO PACIENTE OU RESPONSÁVEL: ____________________________________
MÉDICO RESPONSÁVEL / CRM / ASSINATURA: ____________________________________
TESTEMUNHA 1 (NOME / ASSINATURA): ____________________________________
TESTEMUNHA 2 (NOME / ASSINATURA): ____________________________________`],
    ['sc-admissao-na-emergencia', 'ev', 'Admissão na emergência', 'Santa Casa',
`ADMITO PACIENTE EM LEITO DE EMERGÊNCIA. PRONTUÁRIO EM ANEXO.`],
    ['sc-evolucao-diaria-enfermaria-cg', 'ev', 'Evolução diária enfermaria CG', 'Santa Casa',
`EVOLUÇÃO MÉDICA - CIRURGIA GERAL

HD:
CIRURGIA:  (DIA DE PO:  )
ATB:  (D )
DIETA:
AP:
MUC:
ALERGIAS:

EVOLUÇÃO: PACIENTE EM LEITO DE ENFERMARIA, ESTÁVEL HEMODINAMICAMENTE, CONSCIENTE E ORIENTADO EM TEMPO E ESPAÇO, EUPNEICO EM AR AMBIENTE. DIETA ___ COM BOA ACEITAÇÃO. DIURESE PRESENTE. EVACUAÇÃO PRESENTE / AUSENTE, COM FLATOS. NEGA DOR ABDOMINAL, NÁUSEAS, VÔMITOS, FEBRE E DEMAIS SINTOMAS.

EXAME FÍSICO:
BEG, CORADO, HIDRATADO, ACIANÓTICO, ANICTÉRICO, AFEBRIL. CONSCIENTE E ORIENTADO EM TEMPO E ESPAÇO.
ACV: 2 BULHAS RÍTMICAS E NORMOFONÉTICAS, SEM SOPROS.
AR: MV PRESENTE BILATERALMENTE, SEM RUÍDOS ADVENTÍCIOS.
ABD: FLÁCIDO, INDOLOR, RHA PRESENTES, SEM VISCEROMEGALIAS. DB NEGATIVO, MURPHY NEGATIVO, GIORDANO NEGATIVO.
FO: BOM ASPECTO, BORDAS COAPTADAS, LIMPA E SECA, SEM SINAIS FLOGÍSTICOS OU SAÍDA DE SECREÇÃO.
DRENO: DÉBITO DE ___ ML, ASPECTO ___.
MMII: SEM EDEMA, PANTURRILHAS LIVRES. HOMANS E BANDEIRA NEGATIVOS. TEC < 3 S.

EXAMES COMPLEMENTARES:

CD: DISCUTO CASO COM DR(A). ___, QUE ORIENTA:`],
    ['sc-alta-pos-operatoria-enfermaria', 'ev', 'Alta pós-operatória (enfermaria)', 'Santa Casa',
`EVOLUÇÃO MÉDICA - CIRURGIA GERAL

PO: ___ (__/__/__)

EVOLUÇÃO: PACIENTE EM LEITO DE ENFERMARIA, CONSCIENTE E ORIENTADO EM TEMPO E ESPAÇO, ESTÁVEL HEMODINAMICAMENTE, EUPNEICO EM AR AMBIENTE, COM DIETA LEVE EM BOA ACEITAÇÃO. DIURESE PRESENTE. EVACUAÇÃO PRESENTE / AUSENTE, PORÉM ELIMINA FLATOS. NEGA DOR ABDOMINAL, NÁUSEAS, VÔMITOS, FEBRE E DEMAIS SINTOMAS.

EXAME FÍSICO:
BEG, CORADO, HIDRATADO, ACIANÓTICO, ANICTÉRICO, AFEBRIL.
ACV: 2 BULHAS RÍTMICAS E NORMOFONÉTICAS, SEM SOPROS.
AR: MV PRESENTE BILATERALMENTE, SEM RUÍDOS ADVENTÍCIOS.
ABD: FLÁCIDO, INDOLOR, RHA PRESENTES, DB NEGATIVO.
FO: BOM ASPECTO, SEM SANGRAMENTO OU SAÍDA DE SECREÇÃO À EXPRESSÃO.
MMII: SEM EDEMA OU EMPASTAMENTO.

CD: DISCUTO CASO COM DR(A). ___, QUE ORIENTA:
1. PACIENTE COM BOA EVOLUÇÃO PÓS-OPERATÓRIA, SEM NECESSIDADE DE MANTER INTERNAÇÃO.
2. ORIENTO CUIDADOS PÓS-OPERATÓRIOS.
3. ORIENTO SINAIS DE ALARME E RETORNO AO PRONTO-SOCORRO SE NECESSÁRIO.
4. PRESCREVO MEDICAÇÕES PARA CASA.
5. RETORNO AMBULATORIAL.
6. ALTA HOSPITALAR.`],
    ['sc-po-imediato-observacao-na-rpa', 'ev', 'PO imediato (observação na RPA)', 'Santa Casa',
`EM TEMPO, PACIENTE EM PO IMEDIATO DE ___. NO MOMENTO MANTÉM SINAIS VITAIS ESTÁVEIS, FO DE BOM ASPECTO, SEM SANGRAMENTO ATIVO OU DEMAIS SINAIS DE ALARME.

- DR(A). ___ ORIENTA OBSERVAÇÃO EM LEITO DE RECUPERAÇÃO ANESTÉSICA.
- PROVÁVEL ALTA APÓS 6 HORAS DE OBSERVAÇÃO.`],
    ['sc-alta-no-mesmo-dia-cirurgia-ambulatorial', 'ev', 'Alta no mesmo dia (cirurgia ambulatorial)', 'Santa Casa',
`EM TEMPO, PACIENTE EM LEITO DE ___. NO MOMENTO MANTÉM SINAIS VITAIS ESTÁVEIS, SEM QUEIXAS, DIETA VIA ORAL INICIADA E BEM ACEITA, SEM INTERCORRÊNCIAS. FO DE BOM ASPECTO, SEM SANGRAMENTO ATIVO OU DEMAIS SINAIS DE ALARME.

ORIENTO SINAIS DE ALARME E RETORNO IMEDIATO SE NECESSÁRIO, USO DAS MEDICAÇÕES PRESCRITAS (VIDE RECEITUÁRIO), CUIDADOS PÓS-OPERATÓRIOS E SEGUIMENTO AMBULATORIAL. FORNEÇO ATESTADO.

DR(A). ___ ORIENTA ALTA HOSPITALAR.`],
    ['sc-admissao-no-centro-cirurgico', 'ev', 'Admissão no centro cirúrgico', 'Santa Casa',
`PACIENTE ADMITIDO(A) EM CENTRO CIRÚRGICO PARA REALIZAÇÃO DE ___. PROCEDIMENTO REALIZADO SEM INTERCORRÊNCIAS. AO TÉRMINO, ENCAMINHADO(A) ESTÁVEL HEMODINAMICAMENTE À SALA DE RECUPERAÇÃO PÓS-ANESTÉSICA, AOS CUIDADOS DA EQUIPE DE ANESTESIOLOGIA.`],
    ['sc-alta-pela-cg-no-ps-sem-indicacao-cirurgica', 'cd', 'Alta pela CG no PS (sem indicação cirúrgica)', 'Santa Casa',
`CD:
- PACIENTE SEM INDICAÇÃO DE ABORDAGEM CIRÚRGICA DE URGÊNCIA NO MOMENTO E SEM SINAIS DE INSTABILIDADE HEMODINÂMICA. ALTA PELA CIRURGIA GERAL.
- ORIENTADO(A) QUANTO AOS SINAIS DE ALARME: DOR INTENSA OU PROGRESSIVA, FEBRE, VÔMITOS PERSISTENTES, PIORA DO ESTADO GERAL, DEVENDO PROCURAR IMEDIATAMENTE O SERVIÇO DE URGÊNCIA CASO OCORRAM.
- PRESCRITOS SINTOMÁTICOS ___ / ANTIBIOTICOTERAPIA ___, COM ORIENTAÇÃO DE USO.
- ORIENTADO RETORNO AMBULATORIAL EM ___ DIAS NO AMBULATÓRIO DA CIRURGIA GERAL / SEGUIMENTO NA UBS.
- PACIENTE REFERE TER COMPREENDIDO AS ORIENTAÇÕES. DÚVIDAS ESCLARECIDAS.
- FORNECIDO ATESTADO MÉDICO POR ___ DIAS.`],
    ['sc-limitacao-de-suporte-cuidados-paliativos', 'cd', 'Limitação de suporte / cuidados paliativos', 'Santa Casa',
`PACIENTE AVALIADO(A), APRESENTANDO QUADRO CLÍNICO GRAVE, COM ALTO RISCO DE ÓBITO A CURTO PRAZO APESAR DAS MEDIDAS INSTITUÍDAS.

REALIZADA REUNIÃO COM ___ (GRAU DE PARENTESCO), SR(A). ___, EM AMBIENTE ADEQUADO E PRIVATIVO. FORAM FORNECIDAS INFORMAÇÕES DE FORMA CLARA E EM LINGUAGEM ACESSÍVEL SOBRE A GRAVIDADE DO QUADRO, A PROVÁVEL IRREVERSIBILIDADE, O RISCO IMINENTE DE ÓBITO E A BAIXA PROBABILIDADE DE BENEFÍCIO DE MEDIDAS INVASIVAS, INCLUINDO A POSSIBILIDADE DE INSUCESSO DA REANIMAÇÃO CARDIOPULMONAR E OS POTENCIAIS DANOS ASSOCIADOS.

FOI GARANTIDO TEMPO PARA ESCUTA E ESCLARECIMENTO DE DÚVIDAS. O(A) FAMILIAR VERBALIZA COMPREENSÃO DAS INFORMAÇÕES, SENDO ORIENTADO(A) QUANTO À AUSÊNCIA DE GARANTIA DE RECUPERAÇÃO MESMO COM MEDIDAS INVASIVAS MÁXIMAS.

EM PROCESSO DE DECISÃO COMPARTILHADA, OPTA-SE POR LIMITAÇÃO DE SUPORTE AVANÇADO DE VIDA: NÃO REALIZAR INTUBAÇÃO OROTRAQUEAL E NÃO REALIZAR MANOBRAS DE REANIMAÇÃO CARDIOPULMONAR EM CASO DE PARADA CARDIORRESPIRATÓRIA, PRIORIZANDO MEDIDAS DE CONFORTO.

MANTIDAS AS SEGUINTES MEDIDAS: ___ (EX.: MEDICAÇÕES EM CURSO, HEMODERIVADOS CONFORME INDICAÇÃO, DROGA VASOATIVA).

CONDUTA: MANUTENÇÃO DE MEDIDAS CLÍNICAS PROPORCIONAIS, COM FOCO EM CONFORTO, EVITANDO INTERVENÇÕES CONSIDERADAS FÚTEIS OU DESPROPORCIONAIS, CONFORME O MELHOR INTERESSE DO(A) PACIENTE E EM ALINHAMENTO COM O(A) FAMILIAR RESPONSÁVEL.`]
  ].map(([id, c, t, a, x]) => ({ id, c, t, a, x }));

  const hasSex = x => /\{[^{}|]*\|[^{}]*\}/.test(x);
  const applySex = (x, f) => x.replace(/\{([^{}|]*)\|([^{}]*)\}/g, (_, m, w) => f ? w : m);
  const catName = id => id === 'my' ? 'Meus modelos' : (CATS.find(c => c[0] === id) || [])[1] || '';

  const tool = {
    id: 'prontuario', g: 'pront', title: 'Modelos de prontuário', desc: 'Exame físico, evolução, anamnese do PS, condutas, ambulatório, orientações, declarações e respostas CROSS, com troca masculino e feminino',
    kw: 'prontuario modelo exame fisico evolucao anamnese hpma qp conduta alta ambulatorio retorno orientacoes pre operatorias declaracao cadeira de rodas cross nir regulacao vaga negada superlotacao caso aceito trauma abcde xabcde hints tce leve',
    disc: 'Modelos de apoio para agilizar o registro. Ajuste ao que foi efetivamente perguntado, examinado e feito: o prontuário precisa refletir o atendimento real.',
    render: (h, u2, sub) => {
      const root = h('div', { class: 'rx desc pront' });
      const side = h('section', { class: 'rx-l' }), doc = h('section', { class: 'rx-r', id: 'prontdoc' });
      root.append(side, doc);
      const all = () => ls.get(MY, []).map(m => Object.assign({ mine: true, c: 'my', a: 'Meu modelo' }, m)).concat(M);
      const st = { q: '', cat: '', sel: null, txt: null, fem: ls.get(SEXO, false) };
      if (sub && sub.indexOf('c:') === 0) st.cat = sub.slice(2); else if (sub) st.sel = sub;
      const search = h('input', { type: 'search', class: 'rx-q', placeholder: 'Filtrar: evolução, trauma, CROSS…', 'aria-label': 'Filtrar modelos', oninput: e => { st.q = e.target.value; list(); } });
      const catBox = h('div', { class: 'rx-cats' }), ul = h('ul', { class: 'rx-list' }), count = h('p', { class: 'hint desc-n' });
      side.append(h('label', { class: 'gs rx-search' }, u.icon('search'), search), catBox, count, ul);
      const setUrl = () => { try { history.replaceState(null, '', '#/prontuario' + (st.sel ? '/' + st.sel : st.cat ? '/c:' + st.cat : '')); } catch (e) { } };

      function chips() {
        catBox.innerHTML = '';
        const cs = [['', 'Todos']].concat(ls.get(MY, []).length ? [['my', 'Meus modelos']] : [], CATS);
        cs.forEach(([v, l]) => catBox.append(h('button', { type: 'button', class: 'rx-cat' + (st.cat === v ? ' on' : ''), 'aria-pressed': st.cat === v ? 'true' : 'false', onclick: () => { st.cat = v; chips(); list(); setUrl(); } }, l)));
      }
      function list() {
        ul.innerHTML = '';
        const parts = u.norm(st.q.trim()).split(/\s+/).filter(Boolean);
        const ms = all().filter(m => (!st.cat || m.c === st.cat) && parts.every(p => u.norm(m.t + ' ' + catName(m.c) + ' ' + (m.a || '')).includes(p)));
        count.textContent = ms.length + (ms.length === 1 ? ' modelo' : ' modelos');
        if (!ms.length) { ul.append(h('li', { class: 'rx-empty' }, 'Nenhum modelo encontrado. Tente outro termo ou limpe os filtros.')); return; }
        let last = null;
        ms.forEach(m => {
          if (!st.cat && m.c !== last) { last = m.c; ul.append(h('li', { class: 'rx-h' }, catName(m.c))); }
          ul.append(h('li', { class: 'rx-item' + (st.sel === m.id ? ' on' : '') },
            h('button', { type: 'button', class: 'rx-open', onclick: () => { open(m.id); if (window.innerWidth < 1000) window.scrollTo(0, 0); } },
              h('span', { class: 'rx-t' }, m.t), m.a && h('span', { class: 'desc-a' }, m.a))));
        });
      }
      function open(id) { st.sel = id; st.txt = null; list(); render(); setUrl(); }

      function render() {
        doc.innerHTML = '';
        const m = st.sel && all().find(x => x.id === st.sel);
        root.classList.toggle('has-sel', !!m);
        if (!m) {
          doc.append(h('div', { class: 'panel rx-empty-doc' }, h('h2', null, 'Modelos de prontuário'),
            h('p', null, 'São ' + M.length + ' modelos de texto para o plantão e o ambulatório: exame físico, evolução, anamnese das queixas mais comuns do PS, condutas, retornos, orientações ao paciente, declarações e respostas para a CROSS e o NIR. Escolha um, troque entre masculino e feminino quando houver, complete os campos ___ e copie.')));
          return;
        }
        const sx = hasSex(m.x);
        if (st.txt == null) st.txt = applySex(m.x, st.fem);
        const back = h('button', { type: 'button', class: 'rx-btn desc-back', onclick: () => { st.sel = null; list(); render(); setUrl(); window.scrollTo(0, 0); } }, '‹ Todos os modelos');
        const head = h('div', { class: 'desc-head' }, back, h('h2', null, m.t), h('span', { class: 'desc-meta' }, [catName(m.c), m.a && 'Modelo: ' + m.a].filter(Boolean).join(' · ')));
        const ta = h('textarea', { class: 'desc-steps', 'aria-label': 'Texto do modelo', spellcheck: 'true', oninput: e => { st.txt = e.target.value; grow(); chk(); } });
        ta.value = st.txt;
        const grow = () => { ta.style.height = 'auto'; ta.style.height = Math.min(2400, ta.scrollHeight + 4) + 'px'; };
        const seg = sx && h('div', { class: 'seg', role: 'group', 'aria-label': 'Sexo do paciente' }, [[false, 'Masculino'], [true, 'Feminino']].map(([v, l]) =>
          h('button', { type: 'button', class: st.fem === v ? 'on' : '', 'aria-pressed': st.fem === v ? 'true' : 'false', onclick: () => {
            if (st.fem === v) return;
            if (st.txt !== applySex(m.x, st.fem) && !confirm('Trocar o sexo recarrega o modelo e descarta as suas edições. Continuar?')) return;
            st.fem = v; ls.set(SEXO, v); st.txt = null; render();
          } }, l)));
        const upB = h('label', { class: 'desc-chk' }, h('input', { type: 'checkbox' }), 'Copiar em letras maiúsculas');
        const warn = h('div');
        function chk() {
          const n = (st.txt.match(/_{3,}/g) || []).length;
          warn.innerHTML = '';
          if (n) warn.append(h('div', { class: 'alert warn' }, u.icon('alert'), h('span', null, n === 1 ? 'Falta completar 1 campo marcado com ___.' : 'Faltam completar ' + n + ' campos marcados com ___.')));
        }
        const out = () => { const t = st.txt.replace(/[ \t]+\n/g, '\n').trim(); return upB.firstChild.checked ? t.toLocaleUpperCase('pt-BR') : t; };
        const form = h('div', { class: 'panel desc-form' }, sx ? h('div', { class: 'fld full' }, h('span', { class: 'lbl' }, 'Paciente'), seg) : '',
          h('p', { class: 'hint' }, 'Edite à vontade. Os campos com ___ precisam ser completados.'), ta, upB, warn);
        const cb = h('button', { type: 'button', class: 'copy rx-copy' }, u.icon('copy'), 'Copiar texto');
        cb.onclick = () => {
          const t = out(); const done = () => { cb.lastChild.textContent = 'Copiado'; setTimeout(() => { cb.lastChild.textContent = 'Copiar texto'; }, 1600); };
          const fb = () => { const x = h('textarea', { style: 'position:fixed;opacity:0' }); x.value = t; document.body.append(x); x.select(); try { document.execCommand('copy'); done(); } catch (e) { } x.remove(); };
          if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(t).then(done, fb); else fb();
        };
        const acts = h('div', { class: 'rx-actions' }, cb);
        const acts2 = h('div', { class: 'rx-actions desc-more' },
          h('button', { type: 'button', class: 'rx-btn', onclick: () => { st.txt = null; render(); } }, 'Restaurar o modelo'),
          h('button', { type: 'button', class: 'rx-btn', onclick: saveMy }, m.mine ? 'Atualizar meu modelo' : 'Salvar em Meus modelos'),
          m.mine && h('button', { type: 'button', class: 'rx-btn adm-del', onclick: () => { if (!confirm('Excluir “' + m.t + '” de Meus modelos?')) return; ls.set(MY, ls.get(MY, []).filter(x => x.id !== m.id)); st.sel = null; chips(); list(); render(); setUrl(); } }, 'Excluir meu modelo'));
        function saveMy() {
          const l = ls.get(MY, []);
          const t = m.mine ? m.t : (prompt('Nome do seu modelo:', m.t) || '').trim();
          if (!t) return;
          const rec = { id: m.mine ? m.id : 'meu-' + Date.now().toString(36), t, x: st.txt };
          const i = l.findIndex(x => x.id === rec.id); if (i >= 0) l[i] = rec; else l.unshift(rec);
          ls.set(MY, l); st.sel = rec.id; st.txt = null; chips(); list(); render(); setUrl();
        }
        doc.append(head, form, acts, acts2);
        requestAnimationFrame(grow); chk();
      }
      chips(); list(); render();
      return root;
    }
  };

  const links = [
    ['ef', 'Exame físico pronto', 'geral, abreviado, PS, trauma ABCDE e XABCDE, HINTS'],
    ['ev', 'Evolução médica', 'cirurgia geral em enfermaria e emergência, torácica com dreno'],
    ['hpma', 'Anamnese do PS', 'QP e HPMA das queixas mais comuns'],
    ['cd', 'Condutas e frases prontas', 'alta, TCE leve, radiografia sem fratura, recusa'],
    ['amb', 'Ambulatório', 'hérnia, vesícula, retirada de pontos, vascular'],
    ['ori', 'Orientações e declarações', 'pré-operatório, curativo na UBS, cadeira de rodas'],
    ['doc', 'Atestados e documentos', 'atestado, acompanhante, retorno, UBS, bolsas de colostomia, termos'],
    ['cross', 'Respostas CROSS e NIR', 'caso aceito, negado por superlotação, não referência']
  ].map(([c, t, d]) => ({ id: 'pront-' + c, g: 'pront', title: t, desc: 'Modelos: ' + d, kw: 'prontuario modelo ' + t + ' ' + d, href: '#/prontuario/c:' + c }));
  M.forEach(m => D.links.push({ id: 'prl-' + m.id, g: 'pront', title: m.t, desc: 'Modelo de prontuário: ' + catName(m.c), kw: 'modelo prontuario texto ' + catName(m.c), href: '#/prontuario/' + m.id }));
  D.add(tool, ...links);
})();
