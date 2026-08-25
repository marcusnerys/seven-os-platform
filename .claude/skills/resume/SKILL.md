---
name: resume
description: >
  Retomar o projeto exatamente onde parou. Use /resume quando ja existe uma
  tarefa em andamento e voce quer continuar sem reconstruir o contexto da
  sessao anterior. Diferente de /start, nao apresenta resumo completo,
  apenas verifica o ponto atual e continua.
---

# /resume

## Passos

1. Identificar o projeto pelo diretorio atual (mesmo mapeamento do /start)
2. Ler `00_CONTEXTO_ATUAL.md`
3. Localizar os campos: "Ultima tarefa", "Tarefa atual", "Proxima acao", "Problemas"
4. Verificar `05_PROBLEMAS.md` somente se houver problemas listados
5. Continuar de onde o projeto parou

## Regra

Nao carregar historico completo.
Se o contexto atual for suficiente para continuar: comecar o trabalho.
Se estiver incompleto: perguntar ao usuario o que falta, sem explorar o projeto inteiro.
