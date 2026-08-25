# CONTEXTO ATUAL

## Projeto

SEVEN-OS

## Objetivo

App Flutter de gestao de servicos com Supabase e IA integrada.

## Status

Scaffolding completo. Sem codigo Dart ainda. Pronto para inicio do desenvolvimento.

## Ultima tarefa

Setup completo de infraestrutura de desenvolvimento:
- Agent Reach instalado em modo somente leitura (hook + permissions.deny)
- API Catalog com 813 APIs catalogadas
- 343 skills NVIDIA instaladas no repositorio e globalmente
- MCP servers configurados: Perplexity, Playwright, Firecrawl, Chrome DevTools, Glif
- Padrao visual com 30 regras em CLAUDE.md
- LESHANOT CLAUDE OS implementado (8 comandos, templates Obsidian)

## Tarefa atual

Nenhuma tarefa em andamento.

## Proxima acao

Definir qual feature iniciar. Opcoes naturais:
- Autenticacao (Supabase Auth)
- Estrutura de navegacao (shell do app)
- Modelo de dados (schema Supabase)

## Problemas

Glif MCP: requer OAuth. Funciona apenas no desktop, nao em sessao remota.
Agent Reach: 3 de 15 plataformas funcionam em sessao remota (limite de rede do container).

## Decisoes recentes

2026-08-25: Agent Reach configurado em somente leitura. Duas camadas: hook Bash e permissions.deny.
2026-08-25: MCP Glif identificado como glif.app, nao glyph-mcp (que e para Excalidraw).
2026-08-25: NVIDIA skills: 343 skills, 4407 arquivos, commitadas no repo e instaladas globalmente.
2026-08-25: Padrao visual: sem emojis, sem travessao, sem gradiente, sem drop shadow, sem bento grid.

## Arquivos relevantes

- CLAUDE.md (padrao visual, 30 regras)
- .mcp.json (configuracao dos MCP servers)
- .claude/settings.json (permissoes e hooks)
- .claude/hooks/agent-reach-readonly.sh (bloqueio de escrita)
- pubspec.yaml (dependencias Flutter)
- docs/MCP.md (documentacao dos servidores MCP)

## Integracoes

- Supabase: backend principal (Postgres, Auth) — nao configurado ainda
- Perplexity MCP: busca web com citacoes
- Playwright MCP: automacao de browser
- Firecrawl MCP: scraping e pesquisa
- Chrome DevTools MCP: inspecao de performance
- Glif MCP: geracao de imagem e video (requer OAuth no desktop)

## Ultima atualizacao

2026-08-25
