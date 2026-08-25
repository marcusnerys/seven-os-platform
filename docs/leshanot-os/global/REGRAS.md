# REGRAS GLOBAIS — LESHANOT

Regras que se aplicam a todos os projetos do ecossistema.

## Codigo

- Nao adicionar comentarios que explicam O QUE o codigo faz. Somente o POR QUE quando nao for obvio.
- Nao criar camadas de abstracao antes de precisar delas. Tres linhas similares sao melhores que uma abstracao prematura.
- Nao adicionar tratamento de erro para cenarios que nao podem acontecer.
- Validar apenas nas fronteiras do sistema: input do usuario, APIs externas.
- Nao adicionar feature flags ou shims de retrocompatibilidade quando pode simplesmente mudar o codigo.

## Seguranca

- Nunca commitar credenciais, tokens ou chaves de API.
- Variaveis de ambiente em .env (nao versionado).
- Cookies e tokens de plataformas em ~/.agent-reach/ (nao versionado).

## Visual

Ver PADROES.md para o padrao visual completo.
Regra principal: nada pode parecer template generico de IA.

## Memoria

- Contexto_atual e o ponto de entrada de qualquer sessao.
- Codigo atual e a fonte de verdade tecnica.
- Historico e ultimo recurso, nunca carregado automaticamente.
- Nunca misturar contexto entre projetos.

## Git

- Commits descritivos em portugues ou ingles, sem emojis.
- Push somente quando o trabalho estiver em estado funcional.
- Nao usar --force sem confirmacao explicita.

## Comunicacao

- Sem emojis em codigo, documentacao ou interface.
- Sem travessao. Usar virgula, dois pontos ou ponto.
- Sem texto em maiusculas por enfase decorativa.
