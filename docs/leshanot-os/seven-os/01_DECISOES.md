# DECISOES — SEVEN-OS

---

DATA: 2026-08-25
DECISAO: Agent Reach em modo somente leitura
MOTIVO: Evitar postagens acidentais em plataformas enquanto o agente tem acesso a redes sociais e GitHub
IMPACTO: O agente pode ler Twitter, Reddit, YouTube, GitHub e outras plataformas, mas nao pode escrever
ARQUIVOS AFETADOS: .claude/hooks/agent-reach-readonly.sh, .claude/settings.json

---

DATA: 2026-08-25
DECISAO: MCP Glif configurado como endpoint HTTP (glif.app/api/mcp)
MOTIVO: O pacote npm glyph-mcp e para Excalidraw, nao para geracao de midia. O servico correto e o Glif (glif.app).
IMPACTO: Geracao de imagem e video disponivel, mas requer autenticacao OAuth no desktop
ARQUIVOS AFETADOS: .mcp.json, docs/MCP.md

---

DATA: 2026-08-25
DECISAO: 343 skills NVIDIA commitadas no repositorio e instaladas globalmente via symlink
MOTIVO: Usuario pediu persistencia no repo e habilitacao global (profil de usuario)
IMPACTO: 4407 arquivos no repositorio em .claude/skills/; symlinks em ~/.claude/skills/
ARQUIVOS AFETADOS: .claude/skills/ (343 diretorios)

---

DATA: 2026-08-25
DECISAO: Stack principal definida: Flutter 3.0+ / Dart, BLoC, Supabase, Hive, Dio, google_fonts
MOTIVO: Padrao do ecossistema Leshanot para apps mobile
IMPACTO: Define todas as decisoes de bibliotecas e arquitetura
ARQUIVOS AFETADOS: pubspec.yaml, CLAUDE.md

---

DATA: 2026-08-25
DECISAO: Padrao visual com 30 regras proibindo patterns genericos de IA
MOTIVO: O produto nao pode parecer template generico de IA. Cada decisao visual deve ter motivo ligado a gestao de servicos.
IMPACTO: Todas as telas, documentacao e landing page devem ser auditadas antes de entrega
ARQUIVOS AFETADOS: CLAUDE.md

---
