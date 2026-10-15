# PRD — MVP da Plataforma de Gestão Clínica (produto novo)

> Especificação de produto do MVP, derivada do
> `docs/briefing-software-gestao-clinica-medica.md` e das decisões do cliente.
> Produto **novo**, **API-first**, **IA-first**, com prontuário **customizável por
> especialidade**, atendendo **particular + convênios** e **telemedicina
> embarcada**, em conformidade com os órgãos reguladores brasileiros.
>
> Data: 2026-10-09 · Status: rascunho v1 (para validação)

---

## 1. Decisões fundadoras (inputs do cliente)

| # | Tema | Decisão |
|---|------|---------|
| 1 | Público-alvo inicial | Consultórios **pequenos e de médio porte** |
| 2 | Segmentos clínicos | **Todos** — sistema **padrão + customizável** por especialidade |
| 3 | Modelo de atendimento | **Convênios e particular** (TISS no núcleo) |
| 4 | Telemedicina | **Integrada/embarcada** no produto |
| 5 | Natureza do produto | **Novo**, com **arquitetura aberta** a conexões de ferramentas |
| 6 | Precificação | Definida pelo **comercial** (fora do escopo deste PRD) |
| 7 | Certificação/protocolos | Conforme **exigência nacional** dos órgãos reguladores |

---

## 2. Visão e princípios de produto

**Visão:** uma plataforma única onde a clínica agenda, atende, documenta, fatura e
recebe — operada por **IA e conversa** sempre que possível, e **aberta** para
plugar ferramentas externas.

**Princípios inegociáveis:**
1. **IA-first:** a IA opera (scribe, agendamento, anti-glosa), não só sugere.
2. **API-first:** tudo que a UI faz, a API expõe. Integração é cidadão de 1ª classe.
3. **Customizável por especialidade:** núcleo comum + camada de template por segmento.
4. **Compliance by design:** LGPD/CFM/SBIS/ICP-Brasil/TISS no desenho, não depois.
5. **Multi-tenant seguro:** isolamento por clínica desde a primeira linha de código.

---

## 3. Personas

| Persona | Objetivo | Dor que resolvemos |
|---------|----------|--------------------|
| **Recepcionista/Secretária** | Encher a agenda, confirmar, receber | Telefone, no-show, encaixe manual |
| **Médico(a)** | Atender bem, documentar rápido | Tempo digitando prontuário |
| **Gestor(a)/Dono(a)** | Previsibilidade financeira | Glosa, inadimplência, repasse errado |
| **Faturista** | Enviar guias sem glosa | TISS manual e retrabalho |
| **Paciente** | Marcar/remarcar fácil, ser lembrado | Atendimento lento, filas de telefone |
| **Desenvolvedor parceiro** | Integrar ferramentas | Sistemas fechados |

---

## 4. Escopo do MVP

### 4.1 Dentro do MVP (P0)
1. **Multi-tenant + Usuários/Permissões** (clínica, unidades, perfis).
2. **Cadastro de pacientes** (com documentos, convênio, LGPD/consentimento).
3. **Agenda** (online + presencial, multiprofissional, por sala/recurso).
4. **Confirmação e lembrete** multicanal (WhatsApp/SMS/e-mail) + **lista de espera**.
5. **Prontuário eletrônico customizável por especialidade** (motor de templates).
6. **Prescrição digital** com assinatura ICP-Brasil (via integração, ex. Memed).
7. **Telemedicina embarcada** (vídeo + prontuário na mesma tela).
8. **Financeiro** (caixa, contas a pagar/receber, particular).
9. **Faturamento TISS** (guias de convênio) — captura e envio; anti-glosa básico.
10. **Pagamentos** (PIX/link/cartão) com baixa automática.
11. **Diferenciais de IA P0:** Scribe ambiente (consulta → prontuário) + Agente de
    agendamento no WhatsApp (bidirecional).
12. **API pública + Webhooks** (base da "arquitetura aberta").

### 4.2 Fora do MVP (fases seguintes)
Estoque, BI avançado, app mobile nativo, marketing/campanhas, pesquisa de
satisfação (NPS), repasses complexos multi-regra, conciliação Open Finance,
copiloto clínico avançado, certificação SBIS NGS2 formal (projetar agora,
certificar depois).

---

## 5. Requisitos funcionais por módulo

### 5.1 Pacientes
- Cadastro com dados pessoais, contato, convênio (operadora, plano, carteirinha,
  validade), documentos anexos.
- Registro de **consentimento LGPD** (data, versão do termo, finalidade).
- Histórico unificado (consultas, exames, prescrições, financeiro).
- Busca rápida; deduplicação por CPF/telefone.

### 5.2 Agenda
- Visões: dia/semana/mês, por profissional, por sala/recurso.
- Status: livre, agendado, confirmado, em atendimento, concluído, faltou, cancelado.
- Bloqueios, recorrência, encaixe, duração por tipo de procedimento.
- **Agendamento online** (página pública por clínica/profissional).
- **Lista de espera inteligente:** ao cancelar, oferta automática a quem espera.
- Regras por convênio (tempo mínimo, autorização prévia).

### 5.3 Confirmação/Lembrete + Agente WhatsApp
- Lembrete automático configurável (ex.: 48h e 2h antes).
- Canais: WhatsApp (Cloud API), SMS, e-mail.
- **Agente bidirecional:** paciente confirma, remarca, cancela e tira dúvidas na
  conversa; o agente escreve na agenda. (Ver padrão em
  `docs/reverse-engineering-meuassessor.md`.)

### 5.4 Prontuário customizável por especialidade ⭐ (coração do produto)
- **Núcleo comum:** identificação, anamnese, evolução (SOAP), hipótese/CID-10,
  conduta, anexos, assinatura.
- **Motor de templates:** campos dinâmicos (texto, escala, tabela, imagem,
  medidas), seções por especialidade, modelos de evolução/laudo reaproveitáveis.
- **Templates prontos** por segmento (ex.: cardiologia, dermatologia, pediatria,
  psicologia, ortopedia…) + **editor** para a clínica criar/ajustar o seu.
- Versionamento e trilha de auditoria imutável (requisito CFM/SBIS).
- Assinatura digital ICP-Brasil do documento finalizado.

> **Nota de arquitetura:** o template é **dado/configuração**, não código — assim
> "todos os segmentos" não viram N forks. Um schema de template versionado por
> clínica/especialidade.

### 5.5 Prescrição digital
- Itens: medicamentos (com base de dados/CID), posologia, anexos.
- **Controlados** conforme ANVISA (fase posterior detalha receituário especial).
- Assinatura ICP-Brasil; envio ao paciente (WhatsApp/e-mail/PDF).
- Integração com provedor de prescrição (ex.: **Memed**) via camada de conectores.

### 5.6 Telemedicina embarcada
- Sala de vídeo segura, link por token para o paciente (sem instalar app).
- Prontuário e prescrição **na mesma tela** da chamada.
- Conformidade **CFM Res. 2.314/2022**; registro/consentimento da teleconsulta.
- Gravação opcional conforme consentimento e política.

### 5.7 Financeiro (particular)
- Contas a receber/pagar, fluxo de caixa, categorias, centro de custo.
- Vínculo consulta → cobrança; recebíveis; inadimplência.
- **Pagamentos** integrados: PIX, link de pagamento, cartão; **baixa automática**.

### 5.8 Faturamento TISS (convênios)
- Geração de **guias TISS** (consulta, SP/SADT) no padrão ANS vigente.
- Captura de dados da carteirinha/autorização; lote de faturamento.
- Envio ao convênio (via integração/portal) e acompanhamento de retorno.
- **Anti-glosa (IA) P0 básico:** valida campos obrigatórios/coerência antes do
  envio; sinaliza risco de glosa. (Copiloto avançado = fase posterior.)

### 5.9 Usuários, permissões e multi-tenant
- Hierarquia: organização → clínica → unidade → usuário.
- Perfis: admin, gestor, profissional, recepção, faturista (customizáveis).
- Controle de acesso por nível (requisito LGPD/CFM) e trilha de auditoria.

### 5.10 Plataforma aberta (API + Webhooks)
- **API REST/JSON** autenticada (OAuth2/chave) cobrindo agenda, pacientes,
  prontuário (com restrições), financeiro.
- **Webhooks** para eventos (consulta criada, paciente confirmou, pagamento pago…).
- **Camada de conectores** padronizada para: prescrição (Memed), TISS, pagamentos,
  telemedicina, mensageria, contabilidade, Open Finance (futuro).
- **Marketplace/registry** de integrações (visão de médio prazo).

---

## 6. Modelo de dados (alto nível)

```
organization 1─n clinic 1─n unit
clinic 1─n user ─(role)─ permissions
clinic 1─n patient 1─n consent
patient 1─n appointment ─(n:1)─ professional, room, procedure
appointment 1─1 encounter (atendimento) 1─n clinical_record (prontuário versionado)
encounter 1─n prescription, attachment, telemed_session
encounter 1─1 billing_item ─(particular)─ payment
encounter 1─n tiss_guide ─(convênio)─ tiss_batch, tiss_return
clinic 1─n specialty_template (schema versionado)  ← customização
clinic 1─n integration_connection (conectores)
* todas as tabelas: tenant_id (RLS), audit_log, timestamps
```

**Isolamento multi-tenant:** `tenant_id` em todas as tabelas + Row Level Security
no Postgres/Supabase. Campos sensíveis de saúde com criptografia adicional.

---

## 7. Arquitetura técnica proposta

| Camada | Escolha proposta | Observação |
|--------|------------------|------------|
| Backend/DB | **Supabase (Postgres + Auth + RLS + Storage)** | Já é a base do `seven-os-platform`; RLS atende multi-tenant/LGPD |
| API | REST/JSON + Webhooks (Edge Functions / serviço dedicado) | API-first; contrato versionado |
| Frontend | Web responsivo (React/Vite, como `beauty-os`) | App mobile fica para fase posterior |
| IA | LLM para scribe/roteador/anti-glosa; STT p/ áudio; OCR p/ documentos | Reaproveita `ocr.ts` e pipeline de voz (#22) |
| Mensageria | **WhatsApp Cloud API** (entrada + saída) + SMS + e-mail | Evolui o `whatsapp.ts` de deep link para bidirecional |
| Telemedicina | WebRTC (provedor embarcável) | Vídeo + prontuário na mesma tela |
| Conectores | Camada padronizada (prescrição, TISS, pagamentos, contábil) | Base da "plataforma aberta" |

**Reaproveitamento do `seven-os-platform`:** `vertical.ts` (conceito de
configuração por segmento), agenda/calendar (#23), `financeiro.ts`/`recorrentes.ts`
(#27), `ocr.ts` (#25/#26), `contatos.ts`, pipeline de voz (#22), Supabase.

**Decisão estrutural:** produto **novo** (repo/app próprio) para não acoplar o
domínio clínico (regulado) ao app atual — mas **reutilizando bibliotecas** e o
mesmo stack, e expondo **API** para que ambos conversem.

---

## 8. Requisitos não-funcionais e compliance

| Requisito | Alvo |
|-----------|------|
| **LGPD** | Criptografia em trânsito/repouso, consentimento versionado, acesso por nível, trilha de auditoria, política de retenção, direito de exclusão |
| **CFM 1.821/2007 + SBIS** | Prontuário íntegro, versionado, assinado (projetar p/ NGS2) |
| **ICP-Brasil** | Assinatura digital de prontuário e prescrição |
| **CFM 2.314/2022** | Regras de telemedicina e consentimento |
| **TISS (ANS)** | Versão vigente do padrão; XML/guia conforme |
| **NFS-e** | Emissão por município (fase fiscal) |
| **Disponibilidade** | Alvo ≥ 99,5%; backup e recuperação testados |
| **Auditoria** | Log imutável de acesso/alteração a dado de saúde |
| **Segurança** | MFA p/ equipe, política de senha, least-privilege |

---

## 9. Diferenciais de IA no MVP (como medir)

| Diferencial | Entrega no MVP | KPI |
|-------------|----------------|-----|
| **Scribe ambiente** | Áudio da consulta → evolução estruturada + CID + rascunho de prescrição (revisão médica obrigatória) | −70% tempo de documentação |
| **Agente de agendamento WhatsApp** | Marca/remarca/confirma conversando | No-show < 10% |
| **Anti-glosa TISS (básico)** | Valida guia antes do envio | Queda mensurável de glosa |

> **Guardrail clínico:** toda saída de IA em contexto clínico é **sugestão com
> revisão humana**, nunca ação autônoma. Registrar que houve revisão.

---

## 10. Roadmap de execução

| Fase | Duração alvo | Entregas |
|------|--------------|----------|
| **F1 — Fundação** | 0–1,5 mês | Multi-tenant + RLS, usuários/permissões, pacientes, agenda, confirmação WhatsApp |
| **F2 — Atendimento** | 1,5–3 meses | Prontuário customizável (motor de templates) + prescrição + **scribe IA** + telemedicina |
| **F3 — Dinheiro** | 3–5 meses | Financeiro particular + pagamentos + **TISS** + anti-glosa básico |
| **F4 — Abertura** | 5–6 meses | API pública + webhooks + 1–2 conectores (Memed, pagamentos) estáveis |

*(Fases podem paralelizar; sequência prioriza valor + dependências.)*

---

## 11. Métricas de sucesso do MVP

- No-show < 10%; tempo de documentação −70%; onboarding de clínica < 1 dia.
- Taxa de glosa em queda; % de recebíveis baixados automaticamente.
- Adoção diária da equipe (DAU/WAU) — principal sinal de product-market fit.

---

## 12. Riscos e mitigações

| Risco | Mitigação |
|-------|-----------|
| Escopo inflado ("todos os segmentos" vira infinitos campos) | Template = dado versionado + biblioteca curada de modelos; não código por especialidade |
| Regulatório caro (SBIS/ICP/TISS) | Projetar desde já; certificar por etapas; usar provedores homologados |
| Precisão do scribe/IA | Revisão humana obrigatória; medir aceitação; começar por especialidades de texto mais estruturado |
| Integrações de terceiros (Memed/TISS/pagamentos) | Camada de conectores desacoplada; contrato estável; fallback manual |
| Adoção da equipe | UX de conversa + onboarding guiado; migração assistida de dados |

---

## 13. Itens em aberto (não bloqueiam o início)

1. **Provedores:** confirmar Memed (prescrição), provedor de telemedicina/WebRTC,
   gateway de pagamentos (ex.: Asaas/Pagar.me/Stripe) e emissor de NFS-e.
2. **Especialidades do "dia 1":** quais 3–5 templates entregamos prontos primeiro?
3. **Stack do frontend do produto novo:** reusar React/Vite (como `beauty-os`) —
   confirmar.
4. **Repo:** criar repositório próprio do produto clínico ou módulo separado neste
   monorepo? (recomendo repo/app próprio, mesmo stack)
5. **Marca/nome** do produto.

---

### Próximo passo sugerido
Validar o item 13 (sobretudo #2 especialidades e #4 repo) e eu inicio a **Fase 1**:
modelo de dados + migrations (Supabase) multi-tenant com RLS, e o esqueleto de
agenda + pacientes. Posso já abrir a estrutura do produto novo.
