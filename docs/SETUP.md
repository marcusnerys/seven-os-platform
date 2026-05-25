# Setup - Seven OS Platform

## Pré-requisitos

- Flutter SDK (3.0+)
- Dart SDK (3.0+)
- Git

## Configuração Inicial

### 1. Clonar o Repositório
```bash
git clone https://github.com/marcusnerys/seven-os-platform.git
cd seven-os-platform
```

### 2. Instalar Dependências
```bash
flutter pub get
```

### 3. Variáveis de Ambiente

Copie `.env.example` para `.env` e configure:

```bash
cp .env.example .env
```

**Configurar:**
- `GOOGLE_AI_KEY`: Obter em [AI Studio](https://aistudio.google.com)
- `GITHUB_TOKEN`: Gerar em GitHub Settings → Developer Settings → Personal Access Tokens
- `SUPABASE_URL` e `SUPABASE_ANON_KEY`: Se usar Supabase

### 4. Executar o Projeto

```bash
# Desenvolvimento
flutter run

# Build release
flutter build apk
flutter build ios
```

## Configurar AI Tools

### GitHub Copilot
1. Instalar extensão no VS Code: `GitHub Copilot`
2. Fazer login com sua conta GitHub
3. Pronto para usar!

### Google AI Studio
1. Gerar API Key em [aistudio.google.com](https://aistudio.google.com)
2. Adicionar ao `.env`:
   ```
   GOOGLE_AI_KEY=your_key_here
   ```

## Troubleshooting

| Problema | Solução |
|----------|---------|
| `pubspec.lock` conflita | `flutter clean && flutter pub get` |
| Codex não funciona | Verificar `GITHUB_TOKEN` no `.env` |
| Google AI não responde | Validar `GOOGLE_AI_KEY` na [console do Google](https://console.cloud.google.com) |
