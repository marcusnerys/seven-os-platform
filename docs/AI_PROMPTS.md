# AI Tool Prompts - Seven OS Platform

## Sistema de Prompts para IA

Use estes prompts nas suas ferramentas de IA para gerar código consistente com a arquitetura do projeto.

---

## 1⃣ PROMPT MASTER (Geral)

```
Você é um assistente especializado em Flutter e Clean Architecture.

CONTEXTO:
- Projeto: Seven OS Platform (gestão de serviços)
- Stack: Flutter 3.0+, Dart 3.0+, BLoC Pattern, Supabase
- Arquitetura: Clean Architecture com BLoC
- Padrão: Repository Pattern

REGRAS OBRIGATÓRIAS:
1. Use sealed classes para States e Events (Dart 3.0+)
2. Siga Clean Architecture: Presentation → Domain → Data
3. Use BLoC para gerenciamento de estado
4. Nomeie arquivos: [entity]_[type].dart
5. Implemente tratamento de erros sempre
6. Use null safety rigorosamente
7. Adicione documentação em código complexo
8. Nunca hardcode valores - use variáveis de ambiente

ESTRUTURA DE ARQUIVOS:
```
lib/features/[feature]/
├── bloc/
│ ├── [feature]_bloc.dart
│ ├── [feature]_event.dart
│ └── [feature]_state.dart
├── data/
│ ├── datasources/
│ ├── models/
│ └── repositories/
├── domain/
│ ├── entities/
│ ├── repositories/
│ └── usecases/
└── presentation/
 ├── pages/
 ├── widgets/
 └── providers/
```

QUANDO GERAR CÓDIGO:
- Estado inicial, loading, sucesso e erro
- Validação de entrada
- Tratamento de exceções
- Logging de ações
- Testes unitários quando possível

QUANDO EU DISSER "[FEATURE]":
Substitua pelo nome da funcionalidade em snake_case
```

---

## 2⃣ PROMPT PARA CRIAR FEATURE

```
Crie uma nova feature chamada [FEATURE] para o Seven OS Platform.

REQUISITOS:
- Nome: [FEATURE]
- Descrição: [DESCRICAO]
- Entidades: [ENTIDADES]
- Endpoints/Actions: [ENDPOINTS]

GERAR:
1. BLoC com eventos e estados
2. Modelos de dados com factory constructors
3. Repository com métodos básicos
4. DataSource para API
5. Estados sealed classes com todos os casos
6. Tratamento de erros

EXEMPLO DE ESTRUTURA:
- [feature]_bloc.dart - Lógica principal
- [feature]_event.dart - Eventos do BLoC
- [feature]_state.dart - Estados possíveis
- [entity]_model.dart - Modelo JSON
- [entity]_repository.dart - Interface do repo
- [entity]_repository_impl.dart - Implementação
```

---

## 3⃣ PROMPT PARA CRIAR PÁGINA UI

```
Crie uma página Flutter chamada [PAGE] para [FEATURE].

REQUISITOS:
- Nome: [PAGE]
- Propósito: [PROPÓSITO]
- Campos: [CAMPOS]
- Ações: [ACOES]

ESTRUTURA:
1. StatelessWidget com ConsumerWidget ou BlocBuilder
2. Use Material Design 3
3. Adicione loading states
4. Tratamento de erros com SnackBar
5. Validação de formulário
6. Tema do app (colors, typography)

COMPONENTES:
- AppBar customizada
- Form com validators
- Botões com LoadingState
- Mensagens de erro/sucesso
- Responsividade
```

---

## 4⃣ PROMPT PARA BLoC

```
Crie um BLoC para [FEATURE] com as seguintes ações:

AÇÕES:
1. [ACAO1] - Descrição
2. [ACAO2] - Descrição
3. [ACAO3] - Descrição

ESTADOS NECESSÁRIOS:
- Initial
- Loading
- Success (com dados)
- Error (com mensagem)

IMPLEMENTAR:
- Validação de entrada nos eventos
- Try-catch para chamadas à API
- Logger para debug
- Handling de timeout
- Cancelamento de requisições
```

---

## 5⃣ PROMPT PARA MODELO

```
Crie um modelo Dart para [ENTIDADE] com as seguintes propriedades:

PROPRIEDADES:
- [prop1]: [tipo] - descrição
- [prop2]: [tipo] - descrição
- [prop3]: [tipo] - descrição

GERAR:
1. Classe com propriedades finais
2. Constructor com parâmetros nomeados
3. copyWith() para imutabilidade
4. toJson() para serialização
5. fromJson() factory constructor
6. toString() para debug
7. Equatable para comparação
```

---

## 6⃣ PROMPT PARA TESTE

```
Crie testes unitários para [COMPONENTE] em [ARQUIVO].

CENÁRIOS A TESTAR:
1. [CENARIO1] - Descrição
2. [CENARIO2] - Descrição
3. [CENARIO3] - Descrição

USAR:
- mocktail para mocks
- bloc_test para BLoC
- expect() para assertions
- setUp() para configuração

COBERTURA:
- Fluxo feliz
- Casos de erro
- Validações
- Edge cases
```

---

## 7⃣ PROMPT PARA INTEGRAÇÃO SUPABASE

```
Configure a integração Supabase para [FEATURE].

TABELA: [NOME_TABELA]

COLUNAS:
- [col1]: [tipo]
- [col2]: [tipo]
- [col3]: [tipo]

GERAR:
1. DataSource para chamadas Supabase
2. Métodos: fetch, create, update, delete
3. Tratamento de erros Supabase
4. Real-time listeners (se necessário)
5. Autenticação (se necessário)
```

---

## 8⃣ PROMPT PARA GOOGLE AI INTEGRATION

```
Integrate Google Generative AI para [FEATURE].

USE CASE: [DESCRICAO]

PROMPT PARA IA:
[PROMPT_AQUI]

EXPECTED OUTPUT:
[FORMATO_ESPERADO]

GERAR:
1. Service wrapper para Google AI
2. Método para enviar prompts
3. Tratamento de erros e timeouts
4. Caching de respostas (opcional)
5. Rate limiting
```

---

## CHECKLIST DE QUALIDADE

Antes de usar código gerado, verifique:

```
 Sealed classes usadas para States/Events
 Null safety completo (sem dynamic)
 Tratamento de erros em todos os catch
 Logs apropriados para debug
 Validação de entrada
 Nomes de arquivo corretos
 Sem hardcoding de valores
 Documentação em código complexo
 Testes unitários inclusos
 Padrão Clean Architecture seguido
```

---

## PADRÃO DE CÓDIGO ESPERADO

```dart
// BOM
sealed class AuthState {}

class AuthInitial extends AuthState {}

class AuthLoading extends AuthState {}

class AuthSuccess extends AuthState {
 final User user;
 AuthSuccess(this.user);
}

class AuthError extends AuthState {
 final String message;
 AuthError(this.message);
}

// Estados com Equatable para comparação
sealed class AuthEvent extends Equatable {
 const AuthEvent();
 @override
 List<Object?> get props => [];
}

class AuthLoginRequested extends AuthEvent {
 final String email;
 final String password;
 const AuthLoginRequested(this.email, this.password);
 @override
 List<Object?> get props => [email, password];
}
```

---

## COMO USAR

### No Google AI Studio:
1. Copie o prompt principal
2. Preencha os placeholders [ENTRE_COLCHETES]
3. Cole no Google AI Studio
4. Gere e revise o código

### No GitHub Copilot:
1. Abra um arquivo
2. Use `Ctrl+K`
3. Cole o prompt relevan
4. Deixe o Copilot completar
5. Revise e aceite com `Tab`

---

## EXEMPLOS REAIS

### Criar Feature "Valet"

```
Crie uma nova feature chamada 'valet' para o Seven OS Platform.

REQUISITOS:
- Nome: valet
- Descrição: Gerenciamento de serviço de estacionamento
- Entidades: Valet, ValetRequest, ValetPrice
- Endpoints:
 • GET /valets - Listar valets disponíveis
 • POST /valet-requests - Criar solicitação
 • GET /valet-requests/{id} - Obter detalhes

GERAR:
1. BLoC com eventos e estados
2. Modelos com factory constructors
3. Repository pattern implementation
4. DataSource para Supabase
```

---

## QUANDO USAR QUAL PROMPT

| Tarefa | Prompt |
|--------|--------|
| Começar nova feature | #2 |
| Criar página UI | #3 |
| Desenvolver BLoC | #4 |
| Criar modelo de dados | #5 |
| Escrever testes | #6 |
| Conectar Supabase | #7 |
| Usar Google AI | #8 |
| Verificar qualidade | Checklist |
