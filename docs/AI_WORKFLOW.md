# Guia de Uso: Google AI Studio + GitHub Copilot + Codex

## 🎯 Fluxo de Desenvolvimento com IA

### 1. Planejar com AI Studio

1. Abra https://aistudio.google.com
2. Descreva a funcionalidade:
   ```
   Crie um modelo de dados para a feature de Agendamento
   com campos: id, client_id, service_id, date, time, status
   ```
3. Gere a estrutura e copie para seu projeto

### 2. Implementar com Copilot

1. Abra o arquivo no VS Code
2. Use `Ctrl+K` para gerar código:
   ```
   Crie um BLoC para a agenda com estados Loading, Success, Error
   ```
3. Refine e customize conforme necessário

### 3. Validar com Codex

1. Selecione uma função
2. Use `Ctrl+Shift+\` para sugestões de correção
3. Execute testes com `flutter test`

---

## 💡 Casos de Uso

### Caso 1: Criar novo Feature

**AI Studio:**
```
Crie a estrutura de uma feature de "Valet" com:
- Modelo de dados
- Estados do BLoC
- Eventos
- Repositório
```

**Resultado:** Template completo da feature

**Copilot:**
```
Implemente os métodos do repository para listar valets
```

**Resultado:** Código pronto para testes

---

### Caso 2: Corrigir Bug

**Copilot:**
1. Copie a mensagem de erro
2. Use `Ctrl+K`: "Corrija este erro: [erro]"
3. Revise e aplique a correção

---

### Caso 3: Otimizar Performance

**AI Studio:**
```
Analise este código Flutter e sugira otimizações de performance
[cole seu código]
```

**Resultado:** Dicas de otimização

**Copilot:**
```
Refatore o código seguindo as sugestões
```

---

## 🔑 Prompts Efetivos

### Para AI Studio

✅ **Bom:**
```
Crie um modelo Dart para representar um cliente com campos:
- id, name, email, phone, address
Use getters e factory constructors
```

❌ **Ruim:**
```
Make a model
```

### Para Copilot

✅ **Bom:**
```
Adicione tratamento de erro no BLoC para quando 
a chamada à API falhar
```

❌ **Ruim:**
```
Fix error handling
```

---

## 📊 Workflow Recomendado

```
1. Definir requisitos (AI Studio)
2. Estruturar projeto (IA)
3. Implementar (Copilot)
4. Testar (Manual + AI)
5. Revisar (Copilot Suggestions)
6. Otimizar (AI Studio Analysis)
```

---

## ⚡ Atalhos Úteis

| Atalho | Ação | Ferramenta |
|--------|------|-----------|
| `Ctrl+K` | Chat com IA | Copilot |
| `Ctrl+I` | IA Inline | Copilot |
| `Ctrl+/` | Comentar | VS Code |
| `F1` + "Refactor" | Refatoração | Copilot |
| `Tab` | Aceitar sugestão | Copilot |
| `Esc` | Rejeitar sugestão | Copilot |

---

## 🚫 Limitações e Cuidados

⚠️ **Nem sempre a IA está correta:**
- Sempre revise o código gerado
- Teste antes de usar em produção
- Verifique a lógica

⚠️ **Segurança:**
- Não exponha dados sensíveis aos prompts
- Não copie credenciais para IA
- Use variáveis de ambiente

⚠️ **Performance:**
- Não gere arquivos muito grandes de uma vez
- Divida em partes menores
- Teste incrementalmente

---

## 📚 Recursos

- [Google AI Studio Docs](https://ai.google.dev)
- [GitHub Copilot Tips](https://github.blog/2023-06-20-how-to-write-better-prompts-for-github-copilot/)
- [Flutter Best Practices](https://flutter.dev/docs/testing/best-practices)
