# Agent Reach — skill instalada (modo somente leitura)

Skill de terceiros que dá ao agente acesso à internet. Neste projeto ela está
travada em **somente leitura**, com dois usos:

1. **Ler sites** — copiar referências de design, ler artigos e documentação
2. **Ler redes sociais** — buscar informação atualizada (Twitter/X, Reddit,
   Xiaohongshu, Bilibili, V2EX, YouTube, LinkedIn)

Escrever — postar, comentar, curtir, seguir, votar, criar issue/PR/release —
está **bloqueado**.

## Procedência

- Upstream: https://github.com/Panniantong/Agent-Reach
- Versão: v1.5.0
- Commit: `93ae1d18c37b707dec053c7c4f9d91cd8ef8943d`
- Licença: MIT

`SKILL.md`, `SKILL_en.md` e `references/` são cópias literais de
`agent_reach/skill/` do upstream. Para atualizar, recopie desse diretório.

## Como o somente-leitura é imposto

Duas camadas, ambas em `.claude/`:

| Camada | Arquivo | O que faz |
|---|---|---|
| Hook | `.claude/hooks/agent-reach-readonly.sh` | Roda em `PreToolUse` no matcher `Bash`, inspeciona o comando e nega os verbos de escrita. É a camada que de fato segura. |
| Permissões | `.claude/settings.json` | Lista `permissions.deny` com os comandos de escrita mais óbvios. Reforço, não a defesa principal. |

O hook nega escrita em `gh`, `twitter`, `xhs`, `rdt`, `bili`, `opencli`,
`mcporter`, e também `agent-reach install --system` (que altera o host).
Leitura passa livre: `search`, `read`, `profile`, `user-posts`, `feed`,
`subtitle`, `doctor`, além de `git`, `flutter` e o resto do trabalho normal.

Para afrouxar, edite o hook ou remova entradas de `permissions.deny`.

> ⚠️ O hook cobre comandos de shell. Ferramentas MCP (por exemplo o servidor
> GitHub do próprio Claude Code) não passam por ele — o bloqueio vale para a
> superfície do Agent Reach, que é toda via CLI.

## A skill sozinha não basta

`SKILL.md` é só o roteador — ele diz *quais comandos chamar*. Os binários
(`agent-reach`, `yt-dlp`, `mcporter`, `twitter`, `opencli`, `gh`, `bili`,
`rdt`) precisam existir na máquina:

```bash
pipx install https://github.com/Panniantong/agent-reach/archive/main.zip

agent-reach install --env=auto   # só verifica, não altera nada
agent-reach doctor               # mostra o que está ativo
```

`agent-reach install --system` está bloqueado pelo hook de propósito. Se
quiser rodar, rode direto no seu terminal, fora do Claude Code.

Guia completo: https://raw.githubusercontent.com/Panniantong/agent-reach/main/docs/install.md

## Para copiar design, o canal web tem limite

O canal web do Agent Reach é o Jina Reader (`curl https://r.jina.ai/URL`), que
devolve **markdown**. Isso serve para ler texto, mas joga fora CSS, cores,
fontes, espaçamento e layout — justamente o que importa para copiar design.

Para referência visual de verdade, use:

- `WebFetch` — ferramenta nativa do Claude Code, não precisa do Agent Reach
- Screenshot com Playwright + Chromium, e leitura de estilos computados, quando
  precisar de cores e tipografia exatas para mapear em `ThemeData` / `google_fonts`

## Instale e rode na sua máquina, não em sessão remota

Sessões do Claude Code na web rodam em container efêmero com allowlist de
egresso. Os hosts que o Agent Reach precisa (`r.jina.ai`, `v2ex.com`,
`api.bilibili.com`, `xueqiu.com`, `mcp.exa.ai`) recebem **403 no CONNECT**, e o
Exa MCP exige OAuth por navegador. Verificado nesta sessão: `doctor` reporta
3/15.

Rode `claude` no desktop, onde a rede é aberta e o Chrome existe — OpenCLI,
Facebook, Instagram e Xiaohongshu dependem da sessão do Chrome.

## Credenciais

Nada versionado. Cookies, tokens e chaves ficam em `~/.agent-reach/` na máquina
local. Não faça commit desse diretório.

Para os canais que pedem cookie (Twitter, Reddit, Xiaohongshu, Xueqiu), o
upstream recomenda **conta secundária** — o cookie dá acesso total à conta e as
plataformas podem restringir por chamada fora do navegador.
