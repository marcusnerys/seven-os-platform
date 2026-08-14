# Agent Reach — skill instalada

Skill de terceiros que dá ao agente acesso à internet (15 plataformas: web,
YouTube, GitHub, RSS, Exa, Twitter/X, Reddit, B站, 小红书, V2EX, LinkedIn,
Facebook, Instagram, 雪球, 小宇宙).

## Procedência

- Upstream: https://github.com/Panniantong/Agent-Reach
- Versão: v1.5.0
- Commit: `93ae1d18c37b707dec053c7c4f9d91cd8ef8943d`
- Licença: MIT

Os arquivos `SKILL.md`, `SKILL_en.md` e `references/` são cópias literais de
`agent_reach/skill/` do upstream. Para atualizar, recopie desse diretório.

## A skill sozinha não basta

`SKILL.md` é só o roteador — ele descreve *quais comandos chamar*. Os comandos
(`agent-reach`, `yt-dlp`, `mcporter`, `twitter`, `opencli`, `gh`, `bili`, `rdt`)
precisam existir na máquina. Instale o CLI:

```bash
pipx install https://github.com/Panniantong/agent-reach/archive/main.zip

agent-reach install --env=auto            # só verifica, não altera nada
agent-reach install --env=auto --system   # instala de fato (requer sua aprovação)
agent-reach doctor                        # mostra o que está ativo
```

Guia completo: https://raw.githubusercontent.com/Panniantong/agent-reach/main/docs/install.md

## Instale e rode na sua máquina, não em sessão remota

As sessões do Claude Code na web rodam em container efêmero com allowlist de
egresso. Os hosts que o Agent Reach precisa (`r.jina.ai`, `v2ex.com`,
`api.bilibili.com`, `xueqiu.com`, `mcp.exa.ai`) recebem **403 no CONNECT** do
gateway, e o Exa MCP exige OAuth por navegador — impossível sem interface.

Rode `claude` no seu desktop, onde a rede é aberta e o Chrome existe (OpenCLI,
Facebook, Instagram e 小红书 dependem da sessão do Chrome).

## Credenciais

Nenhum cookie, token ou chave é versionado aqui. Tudo fica em `~/.agent-reach/`
na máquina local. Não faça commit desse diretório.

Para plataformas que pedem cookie (Twitter, Reddit, 小红书, 雪球), o upstream
recomenda **conta secundária** — cookie dá acesso total à conta e a plataforma
pode banir por chamada não-navegador.
