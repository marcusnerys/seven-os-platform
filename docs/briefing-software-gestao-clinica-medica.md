# Briefing — Software de Gestão para Clínicas e Consultórios Médicos

> Documento de partida para a construção de uma plataforma de gestão médica
> **mais eficiente e melhor** que os concorrentes atuais do mercado brasileiro.
> Base: análise de GestãoDS, Amplimed, Amigo Tech, ConTotal (Saúde) e
> MedConsulting/MedIA, além de critérios de mercado para escolha de SaaS clínico.
>
> Data: 2026-10-09 · Status: rascunho v1 (para validação)

---

## 1. Objetivo do produto

Construir um **sistema de gestão de clínicas e consultórios médicos "IA-first"**,
no qual a inteligência artificial e a conversa (WhatsApp/voz) não sejam um
add-on, mas o **modo principal de operar** o dia a dia da clínica — reduzindo
trabalho administrativo, faltas de pacientes e perdas financeiras (glosas,
inadimplência, repasses errados).

**Tese central:** os concorrentes são sistemas de formulários com IA colada por
cima. O nosso será um **assistente que opera a clínica**, onde o cadastro em tela
é a exceção, não a regra.

---

## 2. Concorrentes analisados

| Plataforma | Posicionamento | Força principal | Fraqueza observada |
|------------|----------------|-----------------|--------------------|
| **GestãoDS** | Gestão completa + marketing | Amplo (204 artigos de ajuda, 17 módulos), agente "Helô" | Complexidade; muitos módulos |
| **Amplimed** | Gestão clínica robusta | IA "Amélia" (Copilot, Transcrição, Agendamento), TISS, NFS-e, pagamentos | **Preços ocultos**; recursos fragmentados em complementos pagos |
| **Amigo Tech** | Ecossistema financeiro-clínico | Amigo Pay, Open Finance + "Magic Match", transcrição por IA, app Amigo One | Sem TISS explícito; foco financeiro |
| **ConTotal (Saúde)** | ERP de saúde | Estoque, BI, repasses de convênio | Sem telemedicina, sem TISS, sem preços |
| **MedConsulting/MedIA** | Consultoria + IA | Discurso de automação (faltas de ~30% → <10%) | É consultoria, não produto SaaS puro |
| **Codental** (odonto) | Gestão odontológica acessível e transparente | **Preços públicos** (R$ 89,90–179,90/mês), migração/treinamento grátis, sem fidelidade; parceiros OpenAI, Memed, Asaas, Meta | Foco em odontologia; sem TISS/convênio médico, sem telessaúde; cobra por uso (WhatsApp/NF) |
| **Mediccos** (categoria diferente) | **Assistente de IA para análise de documentos** e apoio à decisão clínica — *ferramenta-ponto, não ERP de gestão* | IA focada: análise de exames/documentos, criação de documentos médicos, apoio ao diagnóstico | Não é gestão de clínica (sem agenda/financeiro/TISS); é copiloto avulso |

> Nota: a landing do Mediccos é um SPA (só o título indexou), então a análise
> acima vem do título oficial + buscas. Confirmar recursos/preços com prints.

**Padrão do mercado:** quase ninguém publica preço (todos pedem "demonstração")
— **o Codental é a exceção e prova que dá pra ser transparente**; a IA é vendida
como diferencial, mas quase sempre limitada a transcrição e agendamento.
**Transparência de preço + IA operacional de verdade** continuam sendo as brechas
mais claras.

**Insights específicos do Codental (referência mais próxima do nosso produto):**
- **Preço público e baixo** (R$ 89,90 Essencial → R$ 179,90 Avançado/mês), anual
  com 10% off. Define a **âncora de preço** da faixa de entrada.
- **Cobrança por uso** além da mensalidade: confirmação WhatsApp **R$ 0,07/msg** e
  NF **a partir de R$ 0,19**. Modelo a considerar (ou a combater com "tudo incluso").
- **Módulos odonto-específicos:** "Agenda odontológica", "Prontuário odontológico"
  com **odontograma**, "Anamnese inteligente" (paciente preenche pelo celular),
  "Controle de prótese", "Gestão de comissões". → reforça a tese do **motor de
  templates por especialidade** (odonto é só mais uma especialidade pra nós).
- **WhatsApp:** "Codental Connect" é uma **extensão para WhatsApp Web** (agenda e
  cadastra sem sair do WhatsApp) — prático, mas inferior a um **agente Cloud API
  bidirecional**, que é a nossa aposta.
- **IA:** "Transcrição de evolução clínica com IA" e "prescrições inteligentes"
  (parceria **OpenAI**). Mesmo padrão dos outros: IA limitada a transcrição.
- **"Codental cobranças"** (Pix/boleto/cartão com baixa automática) e **NF
  integrada** via parceiro **Asaas**; prescrição via **Memed**. → confirma a
  estratégia de **camada de conectores** em vez de construir tudo.
- **Diferenciais comerciais:** migração de dados grátis, treinamento grátis, sem
  contrato de fidelidade, "suporte com gente de verdade". → **tabela de aposta
  mínima** que o nosso go-to-market precisa cobrir.

> **🦷 Decisão incorporada — Codental como "molde" da especialidade Odontologia.**
> Como nosso produto é multi-especialidade, a odontologia é só mais uma vertical
> do **motor de templates**. O Codental nos entrega o **escopo pré-moldado** dessa
> especialidade — já sabemos a rota: **odontograma**, **anamnese pelo celular**,
> **controle de prótese/laboratório**, **comissões por dentista**, categorização
> de pacientes por etiqueta. Em vez de descobrir do zero o que uma clínica
> odontológica precisa, **copiamos esse molde** como o template de odonto do dia 1.
> Isso **de-risca** a especialidade e vira um dos **templates-semente** entregues
> no lançamento (ao lado das especialidades médicas que você definir).

**Insight do Mediccos (valida nossa aposta de IA):**
- É uma **ferramenta-ponto de IA** (análise de documentos/exames + apoio à decisão),
  **não** um sistema de gestão. Prova que existe **demanda real** pela camada de IA
  clínica que estamos propondo.
- **Nossa vantagem:** eles vendem a IA **solta**; nós embutimos essa inteligência
  **dentro do sistema que opera a clínica** (scribe + anti-glosa + decisão no mesmo
  fluxo do prontuário). IA acoplada ao workflow > IA avulsa.
- Reforça o diferencial **P0/P1** do PRD: scribe que gera o prontuário + copiloto
  clínico — exatamente onde os ERPs de gestão ainda são fracos.

---

## 3. Matriz de funcionalidades (o que já é "padrão de mercado")

Recursos presentes na maioria dos concorrentes — **mesa de entrada obrigatória**:

| Módulo | GestãoDS | Amplimed | Amigo | ConTotal | Codental | Prioridade MVP |
|--------|:--------:|:--------:|:-----:|:--------:|:--------:|:--------------:|
| Agendamento online + presencial | ✅ | ✅ | ✅ | ✅ | ✅ | **P0** |
| Confirmação/lembrete (WhatsApp/SMS/e-mail) | ✅ | ✅ | ✅ | ✅ | ✅ | **P0** |
| Prontuário eletrônico (PEP) | ✅ | ✅ | ✅ | ✅ | ✅ (odontograma) | **P0** |
| Prescrição digital | ✅ | ✅ | ✅ | ⚠️ | ✅ (Memed) | **P0** |
| Financeiro (fluxo de caixa, contas) | ✅ | ✅ | ✅ | ✅ | ✅ | **P0** |
| Telemedicina / teleconsulta | ✅ | ✅ | ✅ | ❌ | ❌ | **P1** |
| Faturamento TISS (convênios) | ⚠️ | ✅ | ⚠️ | ⚠️ | ❌ | **P1** |
| NFS-e | ⚠️ | ✅ | ✅ | ❌ | ✅ | **P1** |
| Repasses a profissionais | ⚠️ | ✅ | ✅ | ✅ | ✅ (comissões) | **P1** |
| Pagamentos (PIX/boleto/cartão) | ⚠️ | ✅ | ✅ | ⚠️ | ✅ (Asaas) | **P1** |
| Estoque de insumos/medicamentos | ⚠️ | ✅ | ⚠️ | ✅ | ✅ | **P2** |
| Relatórios / BI | ✅ | ✅ | ✅ | ✅ | ✅ | **P1** |
| Marketing / campanhas / recall | ✅ | ✅ | ✅ | ⚠️ | ✅ | **P2** |
| Transcrição de consulta por IA | ❌ | ✅ | ✅ | ❌ | ✅ (OpenAI) | **P0 (diferencial)** |
| Copiloto clínico por IA | ⚠️ | ✅ | ✅ | ❌ | ⚠️ | **P1 (diferencial)** |
| App mobile | ✅ | ✅ | ✅ | ⚠️ | ✅ | **P2** |
| Pesquisa de satisfação (NPS) | ⚠️ | ✅ | ⚠️ | ✅ | ✅ | **P2** |
| Lista de espera / encaixe inteligente | ⚠️ | ⚠️ | ✅ | ❌ | ⚠️ | **P1** |
| Conciliação bancária / Open Finance | ❌ | ⚠️ | ✅ | ⚠️ | ❌ | **P2** |

Legenda: ✅ tem · ⚠️ parcial/complemento pago · ❌ não encontrado.

---

## 4. Dores do cliente (validadas na pesquisa)

1. **Faltas de pacientes (no-show)** — citado como ~30% sem automação; grande
   perda de receita.
2. **Sobrecarga administrativa** — telefone, encaixe manual, agenda desorganizada.
3. **Sistemas fragmentados** — retrabalho, lançamento duplicado, erro de cobrança
   e de repasse de convênio.
4. **Pouca previsibilidade financeira** — recebíveis em risco, glosas de convênio.
5. **Médico perde tempo digitando** — prontuário rouba tempo da consulta.
6. **Resistência da equipe a novas rotinas digitais** — adoção é o maior risco.
7. **Pacientes esperam resposta em tempo real** (WhatsApp, 24h).

---

## 5. Como seremos MELHORES — diferenciais propostos

### 5.1 IA operacional, não decorativa
- **Scribe ambiente (prontuário automático):** a consulta é transcrita e vira
  evolução estruturada + CID + prescrição sugerida, sem o médico digitar.
  (Amplimed/Amigo têm transcrição; faremos a *geração completa* do prontuário.)
- **Agente de agendamento no WhatsApp (bidirecional):** paciente marca, remarca,
  confirma e tira dúvidas conversando — não só recebe lembrete.
- **Copiloto de faturamento TISS:** IA pré-valida a guia **antes** do envio para
  prevenir glosa (maior dor financeira e ninguém resolve bem).

### 5.2 Transparência e simplicidade
- **Preço público** e plano único sem "complemento pago" para cada recurso
  (ataca o modelo fragmentado da Amplimed).
- **Onboarding em minutos** e UX de conversa — reduz a resistência da equipe
  (dor #6).

### 5.3 Dinheiro no lugar certo
- **Conciliação automática + Open Finance** e **repasse de profissionais**
  calculado por regra (por convênio/procedimento), com visão consolidada.
- **Pagamentos integrados** (PIX/link/cartão) com baixa automática.

### 5.4 Combate ao no-show
- Confirmação ativa multicanal + **lista de espera inteligente** que preenche
  encaixes automaticamente quando há cancelamento.

---

## 6. Escopo do MVP (Fase 1)

**Objetivo do MVP:** uma clínica pequena (1–5 profissionais) operar agenda +
prontuário + financeiro básico, com dois diferenciais de IA ligados desde o dia 1.

- **P0 — núcleo:** Agendamento (online + presencial), Cadastro de pacientes,
  Prontuário eletrônico, Prescrição digital, Financeiro básico (receitas/despesas,
  fluxo de caixa), Confirmação/lembrete por WhatsApp.
- **P0 — diferenciais de IA:** Scribe ambiente (transcrição → prontuário) +
  Agente de agendamento no WhatsApp.
- **Fora do MVP (fases seguintes):** TISS, NFS-e, telemedicina embarcada,
  estoque, BI avançado, app mobile, marketing.

---

## 7. Requisitos regulatórios e de conformidade (Brasil) ⚠️

Não-negociáveis para software médico no Brasil — precisam entrar no desenho desde
o início (custo de refazer depois é altíssimo):

| Requisito | O que exige | Impacto |
|-----------|-------------|---------|
| **LGPD** (dados sensíveis de saúde) | Criptografia em trânsito e repouso, controle de acesso por nível, trilha de auditoria, consentimento | Arquitetural |
| **CFM Res. 1.821/2007 + SBIS** | Certificação **NGS1/NGS2** para prontuário eletrônico; guarda e integridade | Certificação |
| **ICP-Brasil** | Assinatura digital de prontuário e prescrição com certificado | Integração |
| **CFM Res. 2.314/2022** | Regras de telemedicina | Fase telemedicina |
| **Padrão TISS (ANS)** | Troca de informação com convênios | Fase convênios |
| **NFS-e** | Emissão por município (via gateway de notas) | Fase fiscal |
| **ANVISA / receituário de controlados** | Regras de prescrição controlada | Fase prescrição avançada |

**Decisão aberta:** certificar prontuário (SBIS NGS2) agora ou após validação de
mercado? Recomendo projetar *para* a certificação desde já, mas certificar na
Fase 2.

---

## 8. Arquitetura proposta e reaproveitamento do `seven-os-platform`

A boa notícia: **o `seven-os-platform` já tem fundações reutilizáveis.** Saúde
pode entrar como mais uma **vertical** no modelo que já existe.

| Já existe no repo | Reaproveitamento para saúde |
|-------------------|-----------------------------|
| `vertical.ts` (beauty/auto/personal/generic + `hasScheduling`) | Adicionar vertical `health` com terminologia médica (paciente, consulta, procedimento) |
| Agendamento / calendar sync (#23) | Base da agenda clínica |
| `financeiro.ts`, `recorrentes.ts` (#27) | Financeiro da clínica, mensalidades |
| `ocr.ts` (#25, #26) | OCR de exames, guias, documentos |
| `contatos.ts` (#23) | Base de pacientes |
| `whatsapp.ts` | Evoluir de deep link (`wa.me`) para **Cloud API bidirecional** |
| Comandos de voz / Flash-Lite (#22) | Base do scribe ambiente e ditado de prontuário |
| Supabase (Auth + Postgres + RLS) | Backend; RLS é ótimo para isolar dados por clínica (multi-tenant) e atender LGPD |

**Camada nova necessária:**
- Webhook WhatsApp Cloud API (entrada) + STT + roteador de intent (mesmo padrão
  do estudo de engenharia reversa do Meu Assessor — ver
  `docs/reverse-engineering-meuassessor.md`).
- Motor de prontuário (templates, evolução, CID, assinatura ICP-Brasil).
- Conectores regulados: TISS, NFS-e, prescrição (ex. Memed), pagamentos.

**Multi-tenancy e LGPD:** isolamento por clínica via Row Level Security no
Supabase; criptografia de campos sensíveis; trilha de auditoria por padrão.

---

## 9. Roadmap por fases

| Fase | Entregas | Resultado esperado |
|------|----------|--------------------|
| **F1 — MVP (0–3 meses)** | Núcleo P0 + Scribe IA + Agente WhatsApp | Clínica pequena opera ponta a ponta; prova do diferencial de IA |
| **F2 — Receita (3–6 meses)** | TISS + copiloto anti-glosa, NFS-e, pagamentos, repasses, Open Finance | Resolve a dor financeira; destrava clínicas com convênio |
| **F3 — Escala (6–9 meses)** | Telemedicina, BI/dashboards, lista de espera inteligente, app mobile | Paridade completa + escala |
| **F4 — Diferenciação (9–12 meses)** | Copiloto clínico, análise preditiva, marketing/recall, certificação SBIS | Liderança por IA e compliance |

---

## 10. Métricas de sucesso (KPIs do produto)

- **Redução de no-show** (meta: <10%).
- **Tempo de documentação por consulta** (meta: −70% com scribe).
- **Taxa de glosa de convênio** (meta: redução mensurável com copiloto TISS).
- **Tempo de onboarding** de uma nova clínica (meta: < 1 dia).
- **DAU/WAU** da equipe (adoção — maior risco).
- **Inadimplência** e **prazo de recebimento**.

---

## 11. Riscos

1. **Adoção/resistência da equipe** — mitigar com UX de conversa e onboarding guiado.
2. **Regulatório** (SBIS, ICP-Brasil, LGPD) — projetar desde o início; custo real.
3. **Precisão do scribe/IA clínica** — sempre com revisão médica; nunca autônomo.
4. **Integrações reguladas** (TISS, NFS-e, prescrição) — dependência de terceiros;
   maior esforço das fases F2–F3.
5. **Escopo inflado** — o MVP precisa resistir à tentação de copiar os 17 módulos
   dos concorrentes de uma vez.

---

## 12. Perguntas em aberto (para validarmos juntos)

1. **Público-alvo inicial:** consultório individual, clínica pequena, ou clínica
   com convênios? (muda totalmente a prioridade de TISS)
2. **Especialidade foco** no começo? (ex.: um nicho converte mais rápido)
3. **Convênios no MVP ou só particular primeiro?** (TISS é caro — vale adiar?)
4. **Telemedicina embarcada** ou integração com terceiros?
5. **É um produto novo separado** ou uma **vertical `health`** dentro do
   `seven-os-platform` existente?
6. **Modelo de preço** — qual âncora e faixa pretendida?
7. **Certificação SBIS** — buscar desde já ou após tração?

---

### Próximo passo sugerido
Responder às 7 perguntas do item 12 → eu transformo este briefing em um **PRD**
(especificação de produto) do MVP, com modelo de dados, fluxos de tela e a
arquitetura técnica detalhada do núcleo P0 + diferenciais de IA.
