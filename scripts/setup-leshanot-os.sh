#!/usr/bin/env bash
# setup-leshanot-os.sh
# Configura o LESHANOT CLAUDE OS na maquina local:
# 1. Cria a estrutura do vault Obsidian em ~/LESHANOT MIND
# 2. Instala os skills de comando globalmente em ~/.claude/skills/

set -euo pipefail

VAULT="$HOME/LESHANOT MIND"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TEMPLATES="$REPO_ROOT/docs/leshanot-os/templates"
GLOBAL_DOCS="$REPO_ROOT/docs/leshanot-os/global"
SKILLS_SRC="$REPO_ROOT/.claude/skills"
SKILLS_DEST="$HOME/.claude/skills"

PROJETOS=(LESHANOT N-TOP NOBLE SEVEN-OS XANOU ADEF-CONNECT)

echo "==> Criando estrutura do vault: $VAULT"

mkdir -p "$VAULT/GLOBAL"
mkdir -p "$VAULT/SESSOES/CHECKPOINTS"

for projeto in "${PROJETOS[@]}"; do
  dir="$VAULT/PROJETOS/$projeto"
  mkdir -p "$dir"

  for template in 00_CONTEXTO_ATUAL 01_DECISOES 02_TAREFAS 03_ARQUITETURA 04_INTEGRACOES 05_PROBLEMAS 99_HISTORICO; do
    dest="$dir/${template}.md"
    if [ ! -f "$dest" ]; then
      cp "$TEMPLATES/${template}.md" "$dest"
      echo "  criado: $dest"
    else
      echo "  ja existe, pulando: $dest"
    fi
  done
done

echo "==> Copiando arquivos globais"
for f in REGRAS PADROES STACK PRINCIPIOS; do
  dest="$VAULT/GLOBAL/${f}.md"
  if [ ! -f "$dest" ]; then
    cp "$GLOBAL_DOCS/${f}.md" "$dest"
    echo "  criado: $dest"
  else
    echo "  ja existe, pulando: $dest"
  fi
done

echo "==> Copiando conteudo inicial do SEVEN-OS"
SEVEN_SRC="$REPO_ROOT/docs/leshanot-os/seven-os"
SEVEN_DEST="$VAULT/PROJETOS/SEVEN-OS"
for f in 00_CONTEXTO_ATUAL 01_DECISOES 02_TAREFAS; do
  src="$SEVEN_SRC/${f}.md"
  dest="$SEVEN_DEST/${f}.md"
  if [ -f "$src" ]; then
    cp "$src" "$dest"
    echo "  copiado: $dest"
  fi
done

echo "==> Instalando skills globalmente em $SKILLS_DEST"
mkdir -p "$SKILLS_DEST"

LESHANOT_SKILLS=(start resume save status context memory decision task)

for skill in "${LESHANOT_SKILLS[@]}"; do
  src="$SKILLS_SRC/$skill"
  dest="$SKILLS_DEST/$skill"
  if [ -d "$src" ]; then
    if [ -L "$dest" ] || [ -d "$dest" ]; then
      echo "  ja existe, pulando: $dest"
    else
      ln -s "$src" "$dest"
      echo "  symlink criado: $dest -> $src"
    fi
  else
    echo "  AVISO: skill nao encontrado em $src"
  fi
done

echo ""
echo "Setup concluido."
echo ""
echo "Vault criado em: $VAULT"
echo "Skills instalados em: $SKILLS_DEST"
echo ""
echo "Proximos passos:"
echo "  1. Abra o vault no Obsidian: $VAULT"
echo "  2. Abra o projeto no terminal e execute: claude"
echo "  3. Use /start para comecar a sessao"
