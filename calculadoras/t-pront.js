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
    ['amb', 'Ambulatório'], ['ori', 'Orientações e declarações'], ['cross', 'Respostas CROSS e NIR']
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
`BOA NOITE. PACIENTE JÁ EM ACOMPANHAMENTO NO ___ DEVIDO À CONDIÇÃO DE BASE, E A QUEIXA PRINCIPAL REFERE-SE A PROCEDIMENTO REALIZADO NESSE SERVIÇO. POR GENTILEZA, SOLICITO ENCAMINHAR O PACIENTE PARA O ___. ESTAMOS EM SUPERLOTAÇÃO. VAGA NEGADA. GRATO.`]
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
    ['cross', 'Respostas CROSS e NIR', 'caso aceito, negado por superlotação, não referência']
  ].map(([c, t, d]) => ({ id: 'pront-' + c, g: 'pront', title: t, desc: 'Modelos: ' + d, kw: 'prontuario modelo ' + t + ' ' + d, href: '#/prontuario/c:' + c }));
  M.forEach(m => D.links.push({ id: 'prl-' + m.id, g: 'pront', title: m.t, desc: 'Modelo de prontuário: ' + catName(m.c), kw: 'modelo prontuario texto ' + catName(m.c), href: '#/prontuario/' + m.id }));
  D.add(tool, ...links);
})();
