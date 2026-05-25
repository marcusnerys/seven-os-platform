# Prompts Prontos para Copilot & Google AI

> Copie e cole diretamente em suas ferramentas de IA

---

## 🔥 PROMPT 1: Feature Completa

**Onde usar:** Google AI Studio (análise) → Copilot (implementação)

```
Crie uma feature Flutter completa seguindo Clean Architecture para o Seven OS Platform.

FEATURE: Agendamento de Serviços

DADOS:
- Appointments: id, client_id, service_id, date_time, status, notes
- Services: id, name, price, duration
- Clients: id, name, email, phone

IMPLEMENTAR:
1. BLoC para listar agendamentos
2. BLoC para criar novo agendamento
3. Página de listagem com status
4. Página de criar agendamento com datepicker
5. Modelo de dados com JSON serialization
6. Repository para Supabase
7. Tratamento de erros completo

USE sealed classes, null safety e padrão Clean Architecture.
```

---

## 🔥 PROMPT 2: BLoC Rápido

**Onde usar:** GitHub Copilot (`Ctrl+K`)

```
Crie um BLoC para a feature [FEATURE] que:

1. Carrega lista de [ENTIDADE] do Supabase
2. Permite adicionar nova [ENTIDADE]
3. Permite deletar [ENTIDADE]
4. Trata erros com mensagens amigáveis

Estados: Initial, Loading, Success, Error
Use sealed classes e events.
```

---

## 🔥 PROMPT 3: Widget com BLoC

**Onde usar:** Copilot (`Ctrl+K`) em arquivo de widget

```
Crie um StatelessWidget chamado [WIDGET]Widget que:

1. Usa BlocBuilder para ouvir [FEATURE]Bloc
2. Mostra lista de [ITEMS]
3. Adiciona loading state com CircularProgressIndicator
4. Mostra erro com SnackBar
5. Botão para adicionar novo [ITEM]
6. Cada item com ações delete/edit

Use Material Design 3 e responsividade.
```

---

## 🔥 PROMPT 4: Modelo JSON

**Onde usar:** Copilot (`Ctrl+K`) em arquivo model

```
Crie um modelo Dart para [ENTIDADE] com:

Propriedades:
- id (String)
- name (String)
- email (String)
- phone (String)
- created_at (DateTime)

Inclua:
- Constructor com parâmetros nomeados
- copyWith() para imutabilidade
- toJson() e fromJson()
- toString() para debug
- Equatable para comparação
```

---

## 🔥 PROMPT 5: Repository

**Donde usar:** Copilot (`Ctrl+K`) em arquivo repository

```
Crie uma implementação de repository para [ENTIDADE]:

Métodos:
- getAll() → Future<List<[Entity]>>
- getById(id) → Future<[Entity]>
- create(data) → Future<[Entity]>
- update(id, data) → Future<[Entity]>
- delete(id) → Future<void>

Use Supabase client.
Adicione try-catch e logging.
```

---

## 🔥 PROMPT 6: DataSource Supabase

**Onde usar:** Copilot (`Ctrl+K`)

```
Crie um Supabase DataSource para [TABELA]:

Métodos:
- fetchAll()
- fetchById(id)
- create(Map data)
- update(id, Map data)
- delete(id)

Conecte à tabela '[TABELA]' no Supabase.
Trate erros PostgrestException.
```

---

## 🔥 PROMPT 7: Validações

**Onde usar:** Copilot (`Ctrl+K`) em widget de form

```
Crie validadores Dart para:

1. Email válido
2. Telefone com 11 dígitos
3. Senha com 8+ caracteres, número e maiúscula
4. Data não no passado
5. Valor monetário positivo

Use regex quando apropriado.
```

---

## 🔥 PROMPT 8: Integração Google AI

**Donde usar:** Google AI Studio (análise)

```
Crie um serviço de IA para analisar texto de feedback de cliente.

Retorne:
- Sentimento: positivo/negativo/neutro
- Tópicos mencionados
- Nível de satisfação (1-5)
- Recomendações

JSON response com esses campos.
```

---

## 🔥 PROMPT 9: Testes Unitários

**Donde usar:** Copilot (`Ctrl+K`) em arquivo test

```
Crie testes para [BLOC]:

Casos:
1. Inicial retorna Initial state
2. Carregamento retorna Loading depois Success
3. Erro em API retorna Error com mensagem
4. Validação de entrada falha retorna erro
5. Atualização de dados refetch lista

Use bloc_test e mocktail.
```

---

## 🔥 PROMPT 10: Migração Supabase

**Donde usar:** Google AI Studio (planejamento)

```
Crie schema SQL para Seven OS Platform:

Tabelas:
- users (auth)
- clients (dados de clientes)
- services (serviços oferecidos)
- appointments (agendamentos)
- payments (pagamentos)

Com:
- Primary keys e foreign keys
- Timestamps created_at, updated_at
- Soft delete (deleted_at)
- Indexes para performance
- RLS policies básicas
```

---

## 📋 FLUXO RECOMENDADO

```
1. Usar PROMPT 10 no Google AI
   ↓ Gerar schema SQL

2. Usar PROMPT 8 no Google AI  
   ↓ Planejar integrações de IA

3. Usar PROMPT 1 no Google AI
   ↓ Visão geral de uma feature

4. Usar PROMPTS 2-7 no Copilot
   ↓ Implementar código

5. Usar PROMPT 9 no Copilot
   ↓ Adicionar testes

6. Revisar e testar manualmente
```

---

## 🎯 DICAS DE USO

### Google AI Studio
- ✅ Use para planejamento e análise
- ✅ Gere estruturas e schemas
- ✅ Peça sugestões de arquitetura
- ❌ Não use para código pequenininho
- ❌ Não confie 100% em sintaxe

### GitHub Copilot
- ✅ Use `Ctrl+K` para completação
- ✅ Excelente para código boilerplate
- ✅ Use para padrões repetitivos
- ✅ Revise sempre antes de aceitar
- ❌ Não deixe autosave ativo sem revisar

---

## 🚀 TEMPLATE: Criar Sua Feature

Copie e customize:

```
Crie uma nova feature para Seven OS Platform:

NOME: [seu_nome]
DESCRIÇÃO: [descrição curta]

ENTIDADES:
- [Entidade1]: propriedades
- [Entidade2]: propriedades

ENDPOINTS/AÇÕES:
- [Ação1]: método
- [Ação2]: método

USE Clean Architecture + BLoC.
```

---

## 📞 SUPORTE

Se um prompt não funcionar:
1. Divida em partes menores
2. Seja mais específico
3. Forneça exemplos
4. Revise o output gerado

Consulte [AI_TOOLS.md](./AI_TOOLS.md) para mais detalhes.
