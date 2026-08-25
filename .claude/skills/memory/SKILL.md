---
name: memory
description: >
  Consultar a memoria persistente do projeto no Obsidian. Invoque com /memory
  seguido do que voce quer buscar. Nao carrega tudo, somente o arquivo ou
  trecho relevante ao assunto solicitado.
---

# /memory

## Comportamento

Receber uma consulta especifica e identificar qual arquivo do Obsidian contem
a resposta. Ler somente esse arquivo, ou somente o trecho relevante.

## Roteamento por categoria

| Consulta sobre                    | Arquivo                  |
|-----------------------------------|--------------------------|
| Estado atual, proxima acao        | 00_CONTEXTO_ATUAL.md     |
| Por que foi tomada uma decisao    | 01_DECISOES.md           |
| O que falta fazer, pendencias     | 02_TAREFAS.md            |
| Como o sistema esta estruturado   | 03_ARQUITETURA.md        |
| Como uma API ou servico funciona  | 04_INTEGRACOES.md        |
| Por que algo nao funciona         | 05_PROBLEMAS.md          |
| Algo que aconteceu ha muito tempo | 99_HISTORICO.md          |

## Regra

Nao abrir todos os arquivos para encontrar a resposta.
Identificar o arquivo certo, abrir, extrair a resposta, fechar.
Se o arquivo nao existir ou nao tiver a resposta, informar e sugerir onde buscar.

## Exemplo de uso

`/memory por que usamos BLoC em vez de Provider?`
Abrir: 01_DECISOES.md, buscar entrada sobre gerenciamento de estado.

`/memory quais integracoes o projeto usa?`
Abrir: 04_INTEGRACOES.md.
