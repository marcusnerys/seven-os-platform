# AI Tools Integration Guide - Seven OS Platform

## 🎯 Integração com IA Tools

Este guia explica como usar **Google AI Studio**, **GitHub Codex** e **GitHub Copilot** com este repositório.

---

## 1️⃣ GitHub Copilot

### Instalação
- **VS Code**: Instale a extensão `GitHub Copilot` do marketplace

### Configuração
- Faça login com sua conta GitHub
- A extensão funcionará automaticamente

### Uso
| Atalho | Função |
|--------|--------|
| `Ctrl+K` | Chat com Copilot |
| `Ctrl+I` | IA Inline |
| `Ctrl+Shift+\` | Corrigir código |

### Para Este Projeto
- O Copilot segue as instruções em [`.github/copilot-instructions.md`](.github/copilot-instructions.md)
- Respeita padrões BLoC e Clean Architecture

---

## 2️⃣ Google AI Studio

### Configuração

1. **Gerar API Key**
   - Ir para https://aistudio.google.com
   - Clique em "Create API Key"
   - Copie a chave

2. **Adicionar ao Projeto**
   ```bash
   # Crie o arquivo .env
   cp .env.example .env
   
   # Adicione:
   GOOGLE_AI_KEY=sua_chave_aqui
   ```

3. **No Código Flutter**
   ```dart
   import 'package:google_generative_ai/google_generative_ai.dart';
   
   final apiKey = dotenv.env['GOOGLE_AI_KEY'];
   final model = GenerativeModel(model: 'gemini-pro', apiKey: apiKey);
   ```

### Use Cases
- Análise de dados em tempo real
- Chatbot de suporte
- Geração de relatórios

---

## 3️⃣ GitHub Codex (via Copilot)

Codex está integrado ao GitHub Copilot. Use `Ctrl+K` para:
- Completar código automaticamente
- Gerar funções completas
- Refatorar código existente
- Escrever testes

---

## ✅ Checklist de Setup

```
☐ GitHub CLI autenticado: `gh auth login`
☐ GitHub Copilot instalado no VS Code
☐ `.env.example` copiado para `.env`
☐ API Key do Google AI Studio adicionada ao `.env`
☐ Flutter SDK instalado e configurado
☐ Dependências instaladas: `flutter pub get`
```

---

## 🔒 Segurança

⚠️ **IMPORTANTE**: 
- Nunca committar `.env` (já está em `.gitignore`)
- Regenerar API Keys se expostas
- Usar diferentes keys para dev/prod

---

## 📞 Suporte

- [Documentação Google AI](https://ai.google.dev/tutorials)
- [Documentação Copilot](https://github.com/features/copilot)
- [Docs Flutter](https://flutter.dev/docs)
