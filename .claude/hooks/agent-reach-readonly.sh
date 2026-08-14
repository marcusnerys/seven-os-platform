#!/usr/bin/env bash
# Bloqueia operações de escrita nas ferramentas usadas pela skill Agent Reach.
#
# Roda como hook PreToolUse no matcher Bash. Lê o payload do hook em stdin,
# extrai o comando e nega se ele corresponder a uma operação de escrita
# (postar, comentar, curtir, seguir, criar/apagar recursos, instalar no host).
#
# Leitura — search, read, profile, feed, subtitle, doctor — passa livre.
set -uo pipefail

payload=$(cat)
cmd=$(printf '%s' "$payload" | jq -r '.tool_input.command // empty' 2>/dev/null)
[ -z "$cmd" ] && exit 0

# Normaliza quebras de linha e espaços repetidos para os padrões casarem.
norm=$(printf '%s' "$cmd" | tr '\n\t' '  ' | tr -s ' ')

deny() {
  jq -nc --arg r "$1" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: $r
    }
  }'
  exit 0
}

# Início de comando: começo da linha, ou depois de ; & | ( ou substituição.
B='(^|[;&|(]|\$\()[[:space:]]*'

# gh: criar/editar/apagar repos, issues, PRs, releases, secrets, workflows.
if printf '%s' "$norm" | grep -Eqi "${B}gh +(repo +(create|delete|fork|rename|archive|unarchive|sync|edit|set-default)|issue +(create|edit|close|reopen|comment|delete|pin|unpin|lock|unlock|transfer)|pr +(create|edit|close|merge|comment|review|ready|reopen)|release +(create|edit|delete|upload)|secret +|variable +|workflow +(run|enable|disable)|run +(rerun|cancel|delete)|cache +delete|gist +(create|edit|delete)|auth +(login|logout|refresh))"; then
  deny "Agent Reach está em modo somente leitura neste projeto: comandos de escrita do gh estão bloqueados. Para ler, use gh search / gh repo view / gh issue list / gh pr view. Para liberar, edite .claude/settings.json."
fi

# gh api com método de escrita.
if printf '%s' "$norm" | grep -Eqi "gh +api +.*(-X|--method) *(POST|PUT|PATCH|DELETE)"; then
  deny "Agent Reach está em modo somente leitura neste projeto: gh api com POST/PUT/PATCH/DELETE está bloqueado. Use gh api sem -X para leitura."
fi

# CLIs de plataforma: postar, comentar, curtir, seguir, votar, apagar.
if printf '%s' "$norm" | grep -Eqi "${B}(twitter|xhs|rdt|bili) +(post|tweet|publish|reply|comment|like|unlike|dislike|follow|unfollow|retweet|repost|dm|send|vote|upvote|downvote|coin|favorite|collect|delete|remove|edit|update)\b"; then
  deny "Agent Reach está em modo somente leitura neste projeto: operações de escrita em plataformas (postar/comentar/curtir/seguir/votar) estão bloqueadas. Leitura (search, read, user-posts, feed) continua liberada."
fi

# OpenCLI: opencli <plataforma> <ação de escrita>.
if printf '%s' "$norm" | grep -Eqi "${B}opencli +[a-z0-9_-]+ +(post|publish|comment|reply|like|unlike|follow|unfollow|send|dm|vote|delete|edit|update|collect|favorite)\b"; then
  deny "Agent Reach está em modo somente leitura neste projeto: operações de escrita via opencli estão bloqueadas. Leitura (search, read, profile, user, groups, subtitle) continua liberada."
fi

# mcporter: chamadas de ferramenta que escrevem.
if printf '%s' "$norm" | grep -Eqi "${B}mcporter +call +[a-z0-9_-]+\.(create|post|send|update|delete|write|add|remove|publish)"; then
  deny "Agent Reach está em modo somente leitura neste projeto: chamadas de escrita via mcporter estão bloqueadas."
fi

# agent-reach install --system altera o host.
if printf '%s' "$norm" | grep -Eqi "agent-reach +install\b.*--system"; then
  deny "agent-reach install --system altera o host (instala pacotes, escreve config) e está bloqueado neste projeto. Use agent-reach install --env=auto para checagem somente leitura, ou rode o --system você mesmo no terminal."
fi

exit 0
