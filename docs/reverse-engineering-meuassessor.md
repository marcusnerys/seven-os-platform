# Engenharia Reversa — Meu Assessor (meuassessor.com)

> Análise do produto **Meu Assessor** e cruzamento com o estado atual do
> `seven-os-platform` / `beauty-os`. Base: landing page pública
> (`https://www.meuassessor.com/`). Documento de referência para produto e
> arquitetura — nenhum código proprietário foi acessado.
>
> Data: 2026-10-09

---

## 1. Resumo executivo

O **Meu Assessor** é uma **assinatura de "equipe de assessores de IA" que opera
inteiramente dentro do WhatsApp**. O usuário manda texto, áudio ou foto e uma IA
organiza finanças, agenda, tarefas, documentos e cobranças/notas fiscais — sem
precisar aprender um app novo. O WhatsApp *é* a interface principal; o painel web
(`app.meuassessor.com`) é secundário.

A diferenciação central não é tecnológica, é de **posicionamento**: em vez de
vender "um app de finanças com IA", vendem **um time de pessoas** que trabalha
por você. É antropomorfização deliberada.

**Preço:** plano anual = 12× de **R$ 29,90** (~R$ 359/ano), com garantia de
7 dias e sem fidelidade.

---

## 2. O "time" — na prática, roteamento de intents com personas

Cada "assessor" é uma **persona em cima de um agente roteador**. Por baixo há um
só cérebro que classifica a mensagem e despacha para a skill correta.

| Persona | Função aparente        | O que é por baixo                          |
|---------|------------------------|--------------------------------------------|
| Theo    | Diretor de operações   | Orquestrador / roteador de intents         |
| Martin  | Gerente financeiro     | Lançamento de despesas/receitas + Open Finance |
| Sofi    | Secretária executiva   | Google Calendar + Meet + página de booking |
| Luna    | Organização/documentos | Storage/Drive + OCR                        |
| Ítalo   | Estagiário de pesquisa | Busca / RAG                                |
| Rita    | Assistente fiscal      | Emissão de NFS-e + cobrança (PIX/boleto)   |

> **Insight de produto:** dar nome e cargo a cada skill aumenta a confiança
> percebida e o perdão a erro ("a Sofi se confundiu" soa melhor que "o bot
> bugou"). Custa zero em engenharia e é trivialmente replicável.

---

## 3. Arquitetura inferida

```
WhatsApp (usuário: texto / áudio / foto)
        │
        ▼
WhatsApp Business API (Meta, conta verificada)   ← webhook de ENTRADA
        │
        ▼
┌───────────────────────────────────────────────┐
│  Camada de ingestão                             │
│  • áudio → STT (transcrição)                    │
│  • foto  → OCR / visão (extrato, nota, recibo)  │
│  • texto → direto                               │
└───────────────────────────────────────────────┘
        │
        ▼
  ROTEADOR DE INTENT ("Theo")  → financeiro? agenda? doc? cobrança? pesquisa?
        │
        ├── Financeiro → DB + Open Finance (leitura, 114 instituições, Bacen)
        ├── Agenda      → Google Calendar / Meet / página pública de booking
        ├── Documentos  → storage + OCR
        ├── Cobrança/NF → gateway PIX/boleto + NFS-e
        └── Pesquisa    → busca / RAG
        │
        ▼
  Resposta formatada de volta pelo WhatsApp  +  painel web (app.meuassessor.com)
```

### Stack provável (padrão de mercado BR para esse tipo de produto)
- **Canal:** WhatsApp Cloud API (Meta) com conta verificada.
- **Backend:** Node/serverless.
- **Banco:** PostgreSQL.
- **IA:** LLM para roteamento de intent + extração estruturada; STT para áudio;
  OCR/visão para foto.
- **Integrações:** Google OAuth (Calendar/Meet/Gmail); agregador de Open Finance
  (ex. Pluggy / Belvo / Klavi); emissor de NFS-e (ex. PlugNotas / Focus NFe);
  gateway de cobrança (ex. Asaas / Pagar.me / Stripe).

### Pontos técnicos não-triviais (o "fosso" real)
1. **Open Finance read-only em 114 instituições** — exige certificação/parceria
   com agregador. Caro e burocrático. Maior barreira de entrada.
2. **Emissão de NFS-e** — cada município tem webservice próprio; só viável via
   gateway de notas.
3. **Conta verificada na WhatsApp Business API** — processo de aprovação Meta.
4. **Extração estruturada confiável de áudio/foto** — STT + OCR + parsing para
   lançamento financeiro correto.

---

## 4. Modelo de negócio

- **Preço:** anual em 12× de R$ 29,90 (~R$ 359/ano). Mensal não é destacado →
  âncora no anual.
- **"Tudo incluso, sem limite de uso":** remove ansiedade de consumo, mas o custo
  real por mensagem é LLM + STT + OCR. Margem depende de usuários leves
  subsidiarem os pesados.
- **Garantia de 7 dias + sem fidelidade:** reduz fricção de conversão.
- **Conta compartilhada sem taxa por usuário** (convite por código, incl.
  "convidar meu contador") → vetor de crescimento viral B2B2C.

---

## 5. Funil

Hero (dor: "onde foi parar o dinheiro?") → demonstração visual (prints de chat e
dashboards) → prova/confiança (Open Finance, segurança LGPD/criptografia,
depoimentos, FAQ) → **preço** → signup no app → trial 7 dias.

- **Sem captura de lead na landing** — jogam direto para o cadastro no app.
- **Suporte por WhatsApp** (coerente com o produto).

### Headlines (verbatim)
- Hero: *"Sua vida organizada começa numa conversa."*
- *"Pare de tentar organizar tudo sozinho. Tenha um assessor especializado em
  cada parte da sua rotina."*
- *"Se você sabe mandar uma mensagem no WhatsApp, já sabe usar o Meu Assessor."*
- *"Seus bancos entram na conversa."* / *"O seu extrato chega arrumado."*
- *"Cobrar, emitir a nota e ver o pagamento cair. Tudo pela mesma conversa."*

### CTAs (verbatim)
`Começar agora →` · `Contratar minha equipe` · `Conheça seus assessores` ·
`Veja o que dá para pedir` · `Contratar equipe` · `Fazer login` ·
`Falar com o suporte` · `Convidar meu contador →`

### Integrações e segurança citadas
WhatsApp Business API (Meta, verificada) · Open Finance (Bacen, 114 instituições,
leitura) · Google Calendar/Meet/Gmail · NFS-e · painel web · criptografia em
trânsito e em repouso · conformidade LGPD · não venda de dados.

---

## 6. Cruzamento com o `seven-os-platform` / `beauty-os`

A espinha dorsal já existe no repositório. Comparação por capacidade:

| Capacidade Meu Assessor                    | Já existe? | Onde no repo |
|--------------------------------------------|:----------:|--------------|
| WhatsApp como canal                        | ⚠️ Parcial | `whatsapp.ts` (`openWhatsApp` via deep link `wa.me`) |
| Financeiro (despesas/receitas, recorrentes, parcelado, dízimo) | ✅ | `financeiro.ts`, `recorrentes.ts` (#27) |
| OCR de extrato/nota                        | ✅ | `ocr.ts` (#25, #26) |
| Importações em lote                        | ✅ | `importacoes.ts` |
| Contatos / import                          | ✅ | `contatos.ts` (#23) |
| Comandos de voz                            | ✅ | Flash-Lite para voz (#22) |
| Agenda / calendar sync                     | ✅ | (#23) |
| Multi-vertical (inclui "Finanças Pessoais")| ✅ | `vertical.ts` |
| Roteador de intent com personas            | ❌ | — |
| Open Finance (agregador bancário)          | ❌ | — |
| Emissão de NFS-e                           | ❌ | — |
| Cobrança PIX/boleto + conciliação          | ❌ | — |
| Conta compartilhada por convite            | ❌ | — |

### Diferença de arquitetura mais importante
Hoje o WhatsApp do `seven-os-platform` é **saída por deep link**
(`wa.me/...?text=`). O do Meu Assessor é **entrada bidirecional via Cloud API** —
o usuário conversa *com* o assistente.

Para "virar um Meu Assessor", a mudança-chave é:
**webhook de entrada da WhatsApp Cloud API → STT/OCR → roteador de intent → reaproveitar
as funções existentes (`financeiro.ts`, `ocr.ts`, `recorrentes.ts`) como "skills".**

O mais caro (financeiro, OCR, recorrentes, voz, verticais) já está construído.
Falta a camada de conversa de entrada + roteamento (barata, ~1 chamada de LLM de
classificação) e, para paridade total, as integrações reguladas (Open Finance /
NFS-e / cobrança), que são o fosso deles.

---

## 7. Roadmap de paridade (priorizado por esforço × risco)

| Prioridade | Item | Esforço | Risco/barreira | Observação |
|:---------:|------|:-------:|----------------|------------|
| P0 | Roteador de intent + personas sobre as skills atuais | Baixo | Baixo | Reaproveita `financeiro.ts`, `ocr.ts`, `recorrentes.ts` |
| P0 | WhatsApp Cloud API de **entrada** (webhook + STT + OCR) | Médio | Médio (aprovação Meta) | Converte o canal de saída em bidirecional |
| P1 | Conta compartilhada por convite | Médio | Baixo | Vetor de crescimento; modelo de dados multiusuário |
| P2 | Open Finance (via Pluggy/Belvo/Klavi) | Alto | Alto (certificação) | Maior fosso competitivo |
| P2 | Cobrança PIX/boleto + conciliação | Médio | Médio | Gateway (Asaas/Pagar.me) |
| P3 | Emissão de NFS-e | Alto | Alto (por município) | Via gateway de notas (PlugNotas/Focus) |

---

## 8. Conclusão

O Meu Assessor é, em essência, um **roteador de intents com personas** rodando
sobre finanças, agenda, documentos, Open Finance e NFS-e, entregue pela
conveniência radical de "é só o WhatsApp". O valor percebido vem mais do
**posicionamento** (uma equipe) do que de tecnologia inédita.

O `seven-os-platform` já cobre ~70% das capacidades. O caminho mais curto para
paridade funcional é a camada de **WhatsApp de entrada + roteador de intent**; a
diferenciação defensável de longo prazo está nas **integrações reguladas**
(Open Finance, NFS-e, cobrança).
