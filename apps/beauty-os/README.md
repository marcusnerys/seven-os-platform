# Leshanot Beauty OS

App do piloto Leshanot Beauty OS — React 19 + Vite + Supabase, publicado como PWA.

Ver `docs/superpowers/specs/2026-08-20-leshanot-beauty-os-design.md` e
`docs/superpowers/plans/2026-08-20-leshanot-beauty-os-fase1-migracao.md`
na raiz do repositório para o design e o plano de implementação.

## Desenvolvimento local

```bash
npm install
cp .env.example .env   # preencha VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, GEMINI_API_KEY
npm run dev
```

## Deploy

Projeto configurado para Vercel (`vercel.json`, `framework: vite`).
Conecte o repositório na Vercel apontando o **Root Directory** para `apps/beauty-os`
e configure as variáveis de ambiente no painel do projeto.
