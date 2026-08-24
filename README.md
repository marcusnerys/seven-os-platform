# Seven OS Platform

Aplicativo Flutter de ponta para gestão de serviços com integração de IA.

## Características

- Interface moderna com Flutter
- Integração com Google AI Studio
- GitHub Copilot para desenvolvimento
- Backend em tempo real com Supabase
- Notificações push
- Dashboard intuitivo

## Stack Tecnológico

- **Frontend**: Flutter 3.0+
- **Backend**: Supabase
- **Estado**: BLoC Pattern
- **IA**: Google AI Studio + Codex
- **Autenticação**: Supabase Auth
- **Database**: PostgreSQL (Supabase)

## Quick Start

```bash
# Clone
git clone https://github.com/marcusnerys/seven-os-platform.git
cd seven-os-platform

# Instale dependências
flutter pub get

# Configure o .env
cp .env.example .env
# Edite com suas credenciais

# Execute
flutter run
```

## Documentação

- [Setup Completo](docs/SETUP.md) - Guia de instalação e configuração
- [Arquitetura](docs/ARCHITECTURE.md) - Estrutura do projeto
- [Instruções Copilot](.github/copilot-instructions.md) - Padrões de código
- [Servidores MCP](docs/MCP.md) - Perplexity, Playwright, Firecrawl, Chrome DevTools, Glif

## Configurar IA Tools

### Google AI Studio
1. Gerar API Key: https://aistudio.google.com
2. Adicionar ao `.env`: `GOOGLE_AI_KEY=your_key`

### GitHub Copilot
1. Instalar extensão no VS Code
2. Fazer login com GitHub
3. Usar `Ctrl+I` para IA inline ou `Ctrl+K` para chat

## Estrutura

```
lib/
├── main.dart
├── app/
├── core/
└── features/
 ├── agenda/
 ├── auth/
 ├── cash/
 ├── clients/
 ├── dashboard/
 ├── shell/
 └── valet/
```

## Contribuir

1. Crie uma branch: `git checkout -b feature/sua-feature`
2. Commit: `git commit -m 'feat: descrição'`
3. Push: `git push origin feature/sua-feature`
4. Abra um Pull Request

## Licença

MIT - Veja [LICENSE](LICENSE) para detalhes

## Autor

- **Marcus Nery** - [@marcusnerys](https://github.com/marcusnerys)