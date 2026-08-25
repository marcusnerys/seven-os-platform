---
name: task
description: >
  Gerenciar tarefas do projeto em 02_TAREFAS.md no Obsidian. Invoque com /task
  para adicionar, concluir, bloquear ou listar tarefas. Mantem as categorias
  EM ANDAMENTO, PROXIMO, BLOQUEADO e CONCLUIDO.
---

# /task

## Subcomandos

### /task add {descricao}

Adicionar uma nova tarefa na secao PROXIMO.

### /task done {descricao ou numero}

Mover tarefa para CONCLUIDO com a data de conclusao.

### /task block {descricao} motivo: {motivo}

Mover tarefa para BLOQUEADO e registrar o motivo.

### /task list

Mostrar o conteudo atual de 02_TAREFAS.md (somente EM ANDAMENTO e PROXIMO).

## Estrutura do arquivo 02_TAREFAS.md

```
# TAREFAS

## EM ANDAMENTO

- {tarefa}

## PROXIMO

- {tarefa}
- {tarefa}

## BLOQUEADO

- {tarefa} | motivo: {motivo}

## CONCLUIDO

- {tarefa} | {data}
```

## Regra

Nao misturar tarefas de projetos diferentes.
Verificar o diretorio atual para identificar o projeto antes de abrir o arquivo.
