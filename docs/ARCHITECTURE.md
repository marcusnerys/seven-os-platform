# Arquitetura - Seven OS Platform

## Estrutura de Diretórios

```
lib/
├── main.dart                 # Ponto de entrada da aplicação
├── app/
│   └── seven_os_app.dart    # Configuração principal do app
├── core/                     # Lógica compartilhada
│   ├── api/                 # Clientes HTTP e integração de APIs
│   ├── components/          # Componentes reutilizáveis
│   ├── config/              # Configurações gerais
│   ├── push/                # Notificações push
│   ├── realtime/            # Conexões em tempo real
│   ├── supabase/            # Integração Supabase
│   └── theme/               # Temas e estilos
├── features/                # Funcionalidades principais
│   ├── agenda/              # Agendamento
│   ├── auth/                # Autenticação
│   ├── cash/                # Gestão financeira
│   ├── clients/             # Gerenciamento de clientes
│   ├── dashboard/           # Painel principal
│   ├── shell/               # Layout shell/navegação
│   └── valet/               # Serviço valet
└── ...
```

## Padrões

### Estados (BLoC/Cubit)
```
features/[feature]/
├── bloc/
│   ├── [feature]_bloc.dart
│   ├── [feature]_event.dart
│   └── [feature]_state.dart
├── models/
├── repositories/
└── pages/
```

### Camadas
- **Presentation**: UI e gerenciamento de estado
- **Domain**: Lógica de negócio (entidades, usecases)
- **Data**: Repositórios, datasources, modelos

## Stack Tecnológico

| Camada | Tecnologia |
|--------|-----------|
| UI | Flutter |
| Estado | BLoC/Cubit |
| Backend | Supabase |
| Tempo Real | Supabase Realtime |
| Push | Firebase Cloud Messaging |
| API | HTTP (dio/http) |

## Fluxo de Dados

```
UI → BLoC → Repository → DataSource → API/DB
↑← State ← Events ←
```
