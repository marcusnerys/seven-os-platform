---
name: context
description: >
  Mostrar o estado de consumo de contexto da sessao atual. Invoque com /context
  para saber o que esta carregado, o que foi lido, e o que nao foi carregado.
  Util para controlar o uso de tokens e verificar se o contexto esta limpo.
---

# /context

## O que mostrar

### Memoria carregada

Listar os arquivos do Obsidian lidos nesta sessao:
- Caminho
- Motivo pelo qual foi lido

### Arquivos do projeto lidos

Listar os arquivos de codigo ou configuracao abertos nesta sessao.

### Decisoes consultadas

Decisoes do arquivo DECISOES.md que influenciaram o trabalho desta sessao.

### Problemas relevantes

Problemas do arquivo PROBLEMAS.md considerados nesta sessao.

### O que NAO foi carregado

Listar explicitamente o que nao foi carregado:
- HISTORICO (somente lido se necessario)
- Outros projetos
- Arquivos nao relacionados a tarefa

## Formato

```
CARREGADO:
  memoria: {lista}
  codigo: {lista}
  decisoes: {lista}

NAO CARREGADO:
  {lista do que foi deliberadamente ignorado}

RESUMO: {consumo estimado — minimo / moderado / alto}
```
