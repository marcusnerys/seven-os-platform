---
name: save
description: >
  Criar um checkpoint da sessao atual. Invoque com /save antes de encerrar
  uma sessao importante, ou apos concluir uma tarefa significativa. Atualiza
  a memoria persistente no Obsidian para que a proxima sessao possa continuar
  sem reconstruir o historico.
---

# /save

## O que fazer

Revisar o trabalho realizado nesta sessao e atualizar a memoria persistente.

## Caminho

Vault: `~/LESHANOT MIND/PROJETOS/{PROJETO}/`

## Passos

### 1. Revisar a sessao

Identificar internamente:
- O que foi implementado ou alterado
- Decisoes tomadas
- Problemas encontrados ou resolvidos
- Tarefas concluidas
- Proxima acao logica

### 2. Atualizar 00_CONTEXTO_ATUAL.md

Reescrever os campos que mudaram:
- Status
- Ultima tarefa (o que acabou de ser concluido)
- Tarefa atual (o que esta em andamento, se houver)
- Proxima acao (passo imediato para a proxima sessao)
- Problemas (atualizar ou limpar)
- Decisoes recentes (resumo das decisoes desta sessao)
- Arquivos relevantes (lista atualizada)
- Ultima atualizacao (data/hora)

Nao transformar o CONTEXTO_ATUAL em historico. Manter pequeno.

### 3. Atualizar 02_TAREFAS.md

- Mover tarefas concluidas para CONCLUIDO
- Atualizar status de tarefas em andamento
- Adicionar novas tarefas identificadas
- Marcar tarefas bloqueadas

### 4. Atualizar 01_DECISOES.md (somente se houver decisao importante)

Adicionar entrada no formato:

```
DATA: {data}
DECISAO: {decisao}
MOTIVO: {motivo}
IMPACTO: {impacto na arquitetura ou no produto}
ARQUIVOS AFETADOS: {lista}
```

### 5. Atualizar 05_PROBLEMAS.md (somente se necessario)

Adicionar problema novo, ou marcar problema resolvido.

## Criterio para atualizar

Atualizar quando:
- Funcionalidade foi concluida
- Arquitetura mudou
- Integracao foi criada
- Bug importante foi corrigido
- Decisao importante foi tomada
- Tarefa ficou bloqueada
- Proximo passo mudou

Nao atualizar para alteracoes triviais (refatoracoes menores, ajustes de texto).

## Resultado esperado

A proxima sessao deve conseguir continuar sem consultar esta conversa.
