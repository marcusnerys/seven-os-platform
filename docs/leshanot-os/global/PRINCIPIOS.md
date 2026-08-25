# PRINCIPIOS — LESHANOT

Principios de desenvolvimento que guiam todas as decisoes tecnicas.

## Contexto minimo

Carregar somente o contexto necessario para resolver a tarefa.
Nao explorar o workspace indiscriminadamente.
Busca direcionada: nome do arquivo, funcao, componente, tabela, API.

## Raciocinio antes de exploracao

Entender o problema antes de buscar arquivos.
Depois: buscar somente as evidencias necessarias.

## Codigo como fonte de verdade

Quando memoria e codigo divergirem: o codigo atual prevalece.
Verificar, determinar o estado real, corrigir a memoria.

## Nao inventar

Nunca assumir que uma feature existe, uma API esta configurada, ou uma tarefa foi concluida.
Verificar.

## Nao repetir trabalho

Antes de implementar: consultar contexto, consultar tarefas, pesquisar implementacao existente.
Somente entao alterar.

## Eficiencia sem sacrificar raciocinio

A economia ocorre atraves de: contexto relevante, arquivos selecionados, memoria resumida, checkpoints.
Nao reduzir a profundidade de analise tecnica para economizar tokens.

## Tarefas grandes

Dividir em etapas com checkpoints.
Cada etapa conclui em estado funcional.

## Checkpoints de trabalho

Apos mudanca significativa: atualizar CONTEXTO_ATUAL.
Objetivo: nova sessao comecar sem reconstruir historico.
