# Resumo do Projeto — Plataforma de Gestão Clínica (memória da sessão)

> Documento-índice que consolida tudo que discutimos: visão, decisões,
> concorrentes analisados, estimativas de tempo, estratégia de construção
> (base + multi-agente) e próximos passos. Serve como ponto de entrada único
> para os documentos detalhados.
>
> Data: 2026-10-11 · Branch: `ccr-648165d3-01ypfz` (PR #28) · Status: pré-Etapa 0

---

## 1. O que estamos construindo

Uma **plataforma de gestão para clínicas e consultórios médicos**, nova,
**IA-first** e **API-first**, melhor e mais eficiente que os concorrentes do
mercado brasileiro. A IA e a conversa (WhatsApp/voz) são o modo principal de
operar a clínica — o cadastro em tela é a exceção, não a regra.

### Decisões fundadoras (definidas por você)
| # | Tema | Decisão |
|---|------|---------|
| 1 | Público | Consultórios **pequenos e médio porte** |
| 2 | Segmentos | **Todos** — sistema padrão + **customizável por especialidade** |
| 3 | Atendimento | **Convênios e particular** (TISS no núcleo) |
| 4 | Telemedicina | **Integrada/embarcada** |
| 5 | Produto | **Novo**, com **arquitetura aberta** a integrações |
| 6 | Preço | Definido pelo **comercial** |
| 7 | Certificação | Conforme **exigência nacional** (LGPD/CFM/SBIS/ICP-Brasil/TISS) |

---

## 2. Documentos do projeto (já na branch)

| Documento | Conteúdo |
|-----------|----------|
| `docs/reverse-engineering-meuassessor.md` | Engenharia reversa do Meu Assessor (assistente de IA no WhatsApp) |
| `docs/briefing-software-gestao-clinica-medica.md` | Briefing competitivo: 7 concorrentes, matriz de funcionalidades, diferenciais, MVP, compliance, roadmap |
| `docs/prd-mvp-gestao-clinica.md` | PRD do MVP: escopo, requisitos por módulo, modelo de dados, arquitetura, fases |
| `docs/resumo-projeto-clinica-medica.md` | **Este documento** (índice e memória) |

---

## 3. Mapa competitivo (7 players, 3 categorias)

**ERPs de gestão médica:** GestãoDS · Amplimed · Amigo Tech · ConTotal
**ERP de gestão odontológica:** Codental → **molde da vertical odonto**
**Consultoria + IA:** MedConsulting/MedIA
**Ferramenta-ponto de IA:** Mediccos (análise de documentos) → valida a aposta de IA

### Brechas de mercado que vamos atacar
1. **Transparência de preço** — quase ninguém publica (só o Codental: R$ 89,90–179,90/mês).
2. **IA operacional de verdade** — concorrentes param na transcrição; nós vamos ao
   **scribe que gera o prontuário inteiro + anti-glosa TISS + copiloto clínico**.
3. **WhatsApp bidirecional** (agente Cloud API) vs. os lembretes/extensões deles.

### Insight do Codental (odonto = rota pronta)
Odontologia é só mais uma especialidade do nosso motor de templates. O Codental
entrega o **escopo pré-moldado**: odontograma, anamnese pelo celular, controle de
prótese, comissões por dentista. → vira **template-semente do dia 1**.

---

## 4. Diferenciais de IA (nossa aposta central)

| Diferencial | KPI alvo |
|-------------|----------|
| **Scribe ambiente** (consulta → prontuário estruturado) | −70% tempo de documentação |
| **Agente de agendamento no WhatsApp** (bidirecional) | No-show < 10% |
| **Anti-glosa TISS** (valida guia antes do envio) | Queda mensurável de glosa |

> Guardrail: toda saída de IA clínica é **sugestão com revisão humana**, nunca ação
> autônoma.

---

## 5. Estratégia de construção

### 5.1 Reusar a base do Seven OS (beauty-os)
Já existe e transfere: auth + multi-tenant + RLS + auditoria, agenda +
agendamento público, pacientes/contatos, financeiro, OCR de extrato, pipeline de
voz/GenAI, kit de UI, PWA. **Stack idêntico** (React 19 + Vite + Tailwind +
Zustand + Supabase + Google GenAI).

- **Copiar o andaime/infra** como ponto de partida. ✅
- **Modelar o domínio clínico do zero** (paciente, atendimento, prontuário,
  TISS) — não forçar o schema de beleza. ⚠️

### 5.2 Trabalho em paralelo (Claude + Codex + Llama local)
- **Pré-requisito:** Etapa 0 sequencial (modelo de dados + contratos/libs
  compartilhadas) antes de paralelizar.
- **Raias por módulo** + branches separadas + checkpoints de integração + testes
  como fiscal do contrato.
- **Papéis:** Claude = arquitetura/módulos regulados/contratos/revisão · Codex =
  features paralelas · Llama local = boilerplate, testes, seeds e, sobretudo,
  tarefas que tocam **dado de paciente (PHI)** — por ser local, atende LGPD.
- Ganho realista: **~2–2,2×** com 3 agentes (não 3×); o gargalo vira revisão +
  integração.

### 5.3 Design
Clean, sóbrio e **à prova de erro** (software médico). Um **design system único**
(base `UI.tsx`) acelera a paralelização.

---

## 6. Estimativas de tempo (0 → 100%)

| Marco | Base + 2 agentes | Com 3 agentes |
|-------|:----------------:|:-------------:|
| Protótipo navegável | ~1–2 semanas | — |
| **MVP particular (~70%)** | ~6–7 semanas | **~5–6 semanas** |
| Com TISS + API (~90%) | ~4–4,5 meses | **~2,5–3 meses** |
| **100% (SBIS + homologações)** | 7–10 meses | **~6–9 meses** |

> ⚠️ O trecho final (96→100%) **não comprime**: certificação SBIS, homologação
> TISS, verificação Meta/WhatsApp e gateways de pagamento são **burocracia
> externa**, não código. Recomendação: **lançar em produção no ~70% (particular)**
> com clínicas-piloto e rodar as homologações em paralelo.

---

## 7. Compliance nacional (não-negociável, desde o desenho)

LGPD (dados sensíveis) · CFM 1.821/2007 + SBIS (prontuário) · ICP-Brasil
(assinatura) · CFM 2.314/2022 (telemedicina) · Padrão TISS (ANS) · NFS-e
(municipal) · ANVISA (controlados).

Multi-tenant com Row Level Security no Supabase; criptografia de dados sensíveis;
trilha de auditoria por padrão.

---

## 8. Arquitetura aberta (conectores)

Em vez de construir tudo, **camada de conectores** (estratégia confirmada pelos
concorrentes): prescrição (**Memed**), pagamentos/NF (**Asaas** e afins),
telemedicina (WebRTC), mensageria (**WhatsApp Cloud API**), contabilidade,
Open Finance (futuro). + **API pública REST/JSON + webhooks**.

---

## 9. Próximos passos

1. **Definir 2–4 especialidades médicas do dia 1** (odonto já está via molde
   Codental). Ex.: clínica geral, pediatria, dermatologia, cardiologia.
2. **Confirmar:** produto novo em **repo próprio** ou app novo neste monorepo.
3. **Etapa 0 (eu começo):** modelo de dados clínico + contratos/libs
   compartilhadas + motor de templates (já com odonto desenhado) + definição das
   raias dos 3 agentes.
4. Fase 1: multi-tenant + RLS + pacientes + agenda + confirmação WhatsApp.

### Pendências de insumo
- Especialidades do dia 1 (item 1 acima).
- Hardware do Llama local (GPU/VRAM) — decide se ele entra como "terceiro dev" ou
  só em tarefas leves.
- Provedores: confirmar Memed, gateway de pagamento, provedor de telemedicina.

---

### Itens que não consegui acessar nesta sessão
Links de **Instagram (reels/posts)** e **share.google** não são acessíveis por
mim (login/vídeo/redirect). Para analisá-los, preciso do **nome do produto/site**
ou de **prints**.
