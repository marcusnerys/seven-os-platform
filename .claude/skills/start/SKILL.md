---
name: start
description: >
  Ponto de entrada de uma nova sessao. Invoque com /start ao abrir o projeto
  pela primeira vez no dia, ou ao retomar depois de qualquer pausa. Carrega
  apenas o contexto minimo necessario e comeca o trabalho imediatamente.
  Nao recria historico de sessoes anteriores.
---

# /start

## 1. Identificar o projeto

Verificar o diretorio de trabalho atual e mapear:

| Diretorio           | Projeto      |
|---------------------|--------------|
| seven-os-platform   | SEVEN-OS     |
| leshanot            | LESHANOT     |
| n-top               | N-TOP        |
| noble               | NOBLE        |
| xanou               | XANOU        |
| adef-connect        | ADEF-CONNECT |

Vault padrao: `~/LESHANOT MIND`
Caminho completo: `~/LESHANOT MIND/PROJETOS/{PROJETO}/`

## 2. Carregar contexto minimo

Ler nesta ordem, parando quando a tarefa estiver clara:

1. `00_CONTEXTO_ATUAL.md` — sempre
2. `02_TAREFAS.md` — somente as secoes EM ANDAMENTO e PROXIMO

Nao carregar automaticamente: HISTORICO, DECISOES completo, ARQUITETURA, projetos vizinhos.

## 3. Apresentar resumo compacto

Formato obrigatorio, sem adicionar campos extras:

```
PROJETO: {nome}
STATUS: {status}
TAREFA: {tarefa em andamento ou proxima}
PROXIMA ACAO: {passo imediato}
ARQUIVOS: {arquivos listados como relevantes no contexto}
```

## 4. Comecar o trabalho

Iniciar imediatamente apos o resumo.
Nao pedir confirmacao, nao reconstruir historico, nao reler o projeto inteiro.
