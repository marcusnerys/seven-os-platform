# Google AI Studio Prompts - Seven OS Platform

## Prompts Otimizados para Google Generative AI

Use estes prompts em https://aistudio.google.com para análises, planejamento e geração de código complexo.

---

## 1⃣ ANÁLISE ARQUITETURAL

**Objetivo:** Validar estrutura do projeto

```
Analise a seguinte estrutura de projeto Flutter:

lib/
├── features/
│ ├── auth/
│ │ ├── bloc/
│ │ ├── data/
│ │ ├── domain/
│ │ └── presentation/
│ ├── dashboard/
│ └── clients/
├── core/
│ ├── config/
│ ├── theme/
│ └── api/

Isso segue Clean Architecture corretamente?
Quais melhorias você sugeriria?
Há problemas de acoplamento?
```

---

## 2⃣ DESIGN DE SCHEMA

**Objetivo:** Planejar estrutura de banco de dados

```
Desenhe um schema PostgreSQL para uma aplicação de gestão de serviços:

Funcionalidades:
- Autenticação de usuários
- Gestão de clientes
- Agendamento de serviços
- Pagamentos
- Relatórios

Inclua:
- Tabelas normalizadas
- Foreign keys apropriadas
- Timestamps (created_at, updated_at)
- Soft deletes
- Índices para performance
- RLS policies para segurança

Forneça o SQL completo.
```

---

## 3⃣ MIGRAÇÃO DE DADOS

**Objetivo:** Planejar migração de sistema legado

```
Como migrar dados de um CSV para Supabase?

Dados:
- 5000 clientes
- 15000 transações
- 1000 agendamentos

Problemas esperados:
- Dados duplicados
- Datas em formato inconsistente
- Valores faltando

Crie um plano passo-a-passo incluindo:
1. Limpeza de dados
2. Transformação
3. Validação
4. Backup
5. Rollback strategy
```

---

## 4⃣ OTIMIZAÇÃO DE PERFORMANCE

**Objetivo:** Analisar e melhorar performance

```
Analise este código Flutter para otimizações:

[PASTE SEU CÓDIGO]

Procure por:
- Rebuilds desnecessários
- Vazamento de memória
- Queries ineficientes
- Operações bloqueantes

Sugira:
- Refatoração específica
- Caching strategy
- Lazy loading
- Paginação
- Código otimizado
```

---

## 5⃣ PADRÃO DE ERRO

**Objetivo:** Estruturar tratamento de erros

```
Para uma aplicação Flutter com Supabase, crie um sistema robusto de erro:

Tipos de erro:
- Network error
- Validation error
- Authentication error
- Server error
- Timeout

Retorne:
- Hierarquia de classes
- Mapeamento de códigos HTTP
- Mensagens amigáveis ao usuário
- Logging strategy
- Retry logic

Código Dart completo.
```

---

## 6⃣ INTEGRAÇÃO IA

**Objetivo:** Planejar uso de IA no app

```
Como integrar Google Generative AI em uma app de gestão de serviços?

Casos de uso:
- Análise de feedback de clientes
- Geração de relatórios automáticos
- Chatbot de suporte
- Previsão de demanda
- Recomendações personalizadas

Para cada caso, forneça:
- Prompt engineering
- Model selection (Gemini)
- Cost analysis
- Implementation strategy
- Fallback para offline
```

---

## 7⃣ SEGURANÇA

**Objetivo:** Auditar segurança

```
Revise a segurança desta aplicação Flutter:

Stack:
- Frontend: Flutter
- Backend: Supabase (PostgreSQL)
- Autenticação: JWT
- API: REST com Supabase client

Verifique:
- Vulnerabilidades comuns
- OWASP Top 10
- Armazenamento de credenciais
- Validação de input
- SQL injection risks
- XSS/CSRF risks

Forneça:
- Checklist de segurança
- Vulnerabilidades encontradas
- Recomendações de correção
- Código seguro
```

---

## 8⃣ TESTES

**Objetivo:** Estratégia de testes

```
Crie uma estratégia de testes para Flutter:

Componentes para testar:
- BLoCs (state management)
- Repositories (data layer)
- Widgets (UI)
- API calls (integration)

Forneça:
- Unit tests exemplo
- Widget tests exemplo
- Integration tests plano
- Coverage targets
- CI/CD strategy
- Tools recomendadas
```

---

## 9⃣ DOCUMENTAÇÃO API

**Objetivo:** Gerar documentação

```
Crie documentação OpenAPI (Swagger) para:

Endpoints:
- GET /users - Listar usuários
- POST /users - Criar usuário
- GET /users/:id - Obter usuário
- PUT /users/:id - Atualizar
- DELETE /users/:id - Deletar

Para cada endpoint:
- Descrição
- Parâmetros
- Response examples
- Error codes
- Authentication

Forneça YAML completo.
```

---

## PERFORMANCE BENCHMARK

**Objetivo:** Planejar performance

```
Para uma app com 100k usuários simultâneos:

Gargalos esperados:
- Database queries
- API latency
- Mobile bandwidth
- Device memory

Crie:
- Benchmark targets (ms, requests/sec)
- Caching strategy (Redis, CDN)
- Database optimization (indexes, queries)
- Load testing plan
- Monitoring dashboard
- Scaling strategy
```

---

## 1⃣1⃣ CODE REVIEW

**Objetivo:** Revisar código

```
Faça code review deste código Flutter:

[PASTE SEU CÓDIGO]

Verifique:
- Padrões de design
- Clean code principles
- Best practices Flutter
- Performance issues
- Security issues
- Testes e documentação

Retorne:
- Issues encontradas
- Sugestões de melhoria
- Código refatorado
- Explicações
```

---

## 1⃣2⃣ ARQUITETURA NOVO PROJETO

**Objetivo:** Estruturar novo projeto

```
Estou começando um novo projeto Flutter.

Requisitos:
- [REQ1]
- [REQ2]
- [REQ3]

Escala esperada:
- Usuários: [N]
- Dados: [SIZE]
- Regiões: [REGIOES]

Design:
- Backend: Supabase / Firebase / Custom?
- Cache: Redis / Local?
- IA: Google AI / OpenAI / Custom?
- Analytics: Firebase / Custom?

Recomende:
- Arquitetura
- Stack completo
- Folder structure
- CI/CD pipeline
- Deployment strategy
- Monitoring & logging
```

---

## 1⃣3⃣ REFATORAÇÃO

**Objetivo:** Refatorar código legado

```
Preciso refatorar um projeto Flutter legado:

Problemas atuais:
- [PROBLEMA1]
- [PROBLEMA2]
- [PROBLEMA3]

Objetivo:
- Implementar Clean Architecture
- Migrar para BLoC
- Melhorar tests

Crie:
- Plano de refatoração (fases)
- Migração zero-downtime strategy
- Backward compatibility
- Teste plan
- Timeline estimado
```

---

## 1⃣4⃣ FEATURE BRAINSTORM

**Objetivo:** Gerar ideias de features

```
Meu app é para gestão de serviços (salão, oficina, etc).

Features atuais:
- Agendamento
- Gestão de clientes
- Pagamentos

Sugira:
- 10 novas features de alto impacto
- Esforço de implementação (horas)
- ROI esperado
- Prioridade

Para top 3 features, detalhe:
- User stories
- Technical requirements
- Mockups description
- Implementation path
```

---

## 1⃣5⃣ TROUBLESHOOTING

**Objetivo:** Resolver problemas

```
Tenho um erro no meu Flutter app:

Error: [ERRO_MENSAGEM]

Contexto:
- [CODIGO_RELEVANTE]
- Stack trace: [STACK_TRACE]
- Quando ocorre: [QUANDO]

Analyze:
- Causa raiz
- Solução imediata
- Solução definitiva
- Prevention strategy
```

---

## WORKFLOW COM GOOGLE AI

```
1. Use Prompt #2 para desenhar schema
2. Use Prompt #6 para gerar SQL
3. Use Prompt #1 para validar arquitetura
4. Use Prompt #4 para otimizar
5. Use Prompt #7 para segurança
6. Use Prompt #8 para testes
7. Implemente com Copilot
8. Revise com Prompt #11
```

---

## TEMPLATE CUSTOMIZE

```
[Selecione um prompt acima]
[Customize com seus detalhes]
[Cole no Google AI Studio]
[Revise o output]
[Implemente ou discuta com equipe]
```

---

## DICAS

 **DO:**
- Seja específico nos prompts
- Forneça contexto completo
- Peça por exemplos
- Valide o output

 **DON'T:**
- Prompts genéricos
- Sem contexto
- Não revisar output
- Copiar blindly

---

## RECURSOS

- [Google AI Docs](https://ai.google.dev)
- [Gemini API Guide](https://ai.google.dev/tutorials)
- [Prompt Engineering Guide](https://cloud.google.com/vertex-ai/docs/generative-ai/text/text-overview)
