# Flutter Development Tools Configuration

## IDE/Editor Setup

### VS Code Extensions Recomendadas

```json
{
  "recommendations": [
    "dart-code.dart-code",
    "dart-code.flutter",
    "GitHub.copilot",
    "GitHub.copilot-chat",
    "ms-vscode.makefile-tools",
    "Equim.equation",
    "dart-code.dart-code-test-adapter"
  ]
}
```

Instale com:
```bash
code --install-extension dart-code.dart-code
code --install-extension dart-code.flutter
code --install-extension GitHub.copilot
```

### VSCode settings.json

```json
{
  "dart.flutterSdkPath": "/usr/local/flutter",
  "dart.lineLength": 100,
  "dart.sdkPath": "/usr/local/flutter/bin/dart",
  "[dart]": {
    "editor.defaultFormatter": "dart-code.dart-code",
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
      "source.fixAll": true
    }
  }
}
```

## Environment Setup

### 1. Instalação do Flutter

```bash
# macOS
brew install flutter

# Linux (via asdf ou direct)
git clone https://github.com/flutter/flutter.git ~/flutter
export PATH="$PATH:~/flutter/bin"
```

### 2. Flutter Doctor

```bash
flutter doctor
flutter doctor -v  # Verbose
```

### 3. Configurar Emulador

```bash
flutter emulators
flutter emulators launch Pixel_4_API_30
```

## GitHub Codex Integration

### Usar com CLI

```bash
# Abrir em VS Code com Copilot ativo
code .

# Usar com git hooks
git config --local core.hooksPath .githooks
```

### Arquivo de Configuração

Criar `.githooks/prepare-commit-msg`:
```bash
#!/bin/bash
# Opcional: usar Copilot para message de commit
```

## Google AI Studio Integration

### Instalação de Dependência

```bash
flutter pub add google_generative_ai
flutter pub add flutter_dotenv
```

### Exemplo de Uso

```dart
import 'package:google_generative_ai/google_generative_ai.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

class AIService {
  late GenerativeModel _model;
  
  AIService() {
    final apiKey = dotenv.env['GOOGLE_AI_KEY']!;
    _model = GenerativeModel(
      model: 'gemini-pro',
      apiKey: apiKey,
    );
  }
  
  Future<String> generateContent(String prompt) async {
    final response = await _model.generateContent([
      Content.text(prompt),
    ]);
    return response.text ?? '';
  }
}
```

## CI/CD Setup

### GitHub Actions

Criar `.github/workflows/test.yml`:
```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.x'
      - run: flutter pub get
      - run: flutter test
      - run: flutter analyze
```
