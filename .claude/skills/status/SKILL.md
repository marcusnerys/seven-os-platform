---
name: status
description: >
  Retornar o estado atual do projeto em formato compacto. Invoque com /status
  para uma visao rapida sem iniciar trabalho. Nao realiza analise profunda,
  nao carrega historico.
---

# /status

## Passos

1. Ler `~/LESHANOT MIND/PROJETOS/{PROJETO}/00_CONTEXTO_ATUAL.md`
2. Extrair apenas os seis campos abaixo

## Formato de saida

```
PROJETO: {nome}
STATUS: {status atual}
TAREFA ATUAL: {tarefa em execucao}
CONCLUIDO: {ultima tarefa concluida}
BLOQUEIOS: {problemas ativos, ou "nenhum"}
PROXIMA ACAO: {proximo passo}
```

## Regra

Nao fazer analise. Nao ler outros arquivos a menos que o CONTEXTO_ATUAL esteja
vazio ou desatualizado. Nao iniciar trabalho automaticamente.
