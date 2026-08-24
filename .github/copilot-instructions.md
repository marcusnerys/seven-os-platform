# Instruções do GitHub Copilot - Seven OS Platform

Você é um assistente especializado no projeto Seven OS Platform, um aplicativo Flutter para gestão de serviços.

## Contexto do Projeto

- **Tipo**: Aplicativo Flutter
- **Arquitetura**: Clean Architecture com BLoC
- **Backend**: Supabase
- **Stack**: Flutter, Dart, BLoC, Supabase

## Estrutura

```
lib/
├── core/ # Lógica compartilhada
├── features/ # Funcionalidades isoladas
└── app/ # Configuração global
```

## Convenções de Código

### Nomes de Arquivo
- Widgets: `widget_name_widget.dart`
- BLoCs: `[feature]_bloc.dart`, `[feature]_event.dart`, `[feature]_state.dart`
- Modelos: `[entity]_model.dart`
- Repositórios: `[entity]_repository.dart`

### Padrões

1. **Estados**:
 ```dart
 sealed class [Feature]State {}
 class [Feature]Initial extends [Feature]State {}
 class [Feature]Loading extends [Feature]State {}
 class [Feature]Success extends [Feature]State {}
 class [Feature]Error extends [Feature]State {}
 ```

2. **Eventos**:
 ```dart
 sealed class [Feature]Event {}
 class [Feature]Started extends [Feature]Event {}
 ```

3. **BLoCs**:
 - Use `sealed class` para estados e eventos
 - Implemente tratamento de erros
 - Use pattern matching

## Ao Gerar Código

- Siga Clean Architecture
- Use BLoC para gerenciamento de estado
- Adicione tratamento de erros
- Implemente tipos seguros (sealed classes)
- Testes unitários quando aplicável
- Comente código complexo

## Quando Codificar

- Criar novos features em `lib/features/[name]/`
- Lógica compartilhada em `lib/core/`
- Seguir padrão BLoC + Repository

## Recursos

- [Documentação](docs/)
- [Setup](docs/SETUP.md)
- [Arquitetura](docs/ARCHITECTURE.md)
