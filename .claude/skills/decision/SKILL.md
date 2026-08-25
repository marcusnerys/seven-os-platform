---
name: decision
description: >
  Registrar uma decisao importante na memoria persistente do projeto. Invoque
  com /decision seguido da decisao a registrar. Grava em 01_DECISOES.md no
  Obsidian. Use para decisoes que afetam arquitetura, stack, integracao ou
  comportamento do produto.
---

# /decision

## Quando usar

Registrar quando a decisao:
- Altera arquitetura ou estrutura do projeto
- Define qual tecnologia, biblioteca ou servico usar
- Muda o comportamento de uma feature
- Resolve um problema que pode voltar
- Afeta outros projetos do ecossistema

## Comportamento

1. Receber a descricao da decisao
2. Perguntar ao usuario o motivo, se nao estiver claro
3. Identificar arquivos afetados
4. Abrir `~/LESHANOT MIND/PROJETOS/{PROJETO}/01_DECISOES.md`
5. Adicionar a entrada no final do arquivo

## Formato da entrada

```
---

DATA: {data atual}
DECISAO: {o que foi decidido}
MOTIVO: {por que essa decisao foi tomada}
IMPACTO: {o que muda no projeto}
ARQUIVOS AFETADOS: {lista de arquivos ou modulos}
```

## Regra

Nao inventar motivos. Se o usuario nao explicou o motivo, perguntar antes de registrar.
