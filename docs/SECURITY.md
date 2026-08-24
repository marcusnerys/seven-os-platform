# Security & Best Practices

## Segurança com AI Tools

### Credenciais

**NUNCA faça isso:**
```dart
// ERRADO - Hardcoded
const apiKey = "AIzaSyD...";
```

**SEMPRE faça isso:**
```dart
// CORRETO - Via .env
final apiKey = dotenv.env['GOOGLE_AI_KEY'];
```

### .env Configuration

```env
# .env (NÃO COMMITAR)
GOOGLE_AI_KEY=AIzaSyD...
GITHUB_TOKEN=ghp_...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=eyJhbGc...
```

### .env.example (COMMITAR)

```env
# .env.example
GOOGLE_AI_KEY=your_api_key_here
GITHUB_TOKEN=your_github_token
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_anon_key
```

---

## Boas Práticas com IA

### 1. Compartimentalizar Dados

Nunca passe dados completos para prompts:

```dart
// ERRADO
final prompt = "Analise este usuário: $userData";

// CORRETO
final prompt = "Gere uma saudação para um usuário";
```

### 2. Validar Saída de IA

```dart
// CORRETO
final response = await aiService.generateContent(prompt);
if (response.isEmpty) {
 return defaultValue;
}
if (!isValidResponse(response)) {
 return defaultValue;
}
return response;
```

### 3. Logs Seguros

```dart
// ERRADO - Pode logar credenciais
print("Response: $response");

// CORRETO - Sanitizado
logger.info("AI Response received (length: ${response.length})");
```

---

## GitHub Configuration

### Personal Access Token

1. GitHub → Settings → Developer Settings → Personal Access Tokens
2. Selecione escopos: `repo`, `user`, `codespace`
3. Copie e guarde com segurança

### Regenerar se Exposte

```bash
# Remover do .env
rm .env

# Se já foi comittado (acidental):
git filter-branch --force --index-filter \
 "git rm -rf --cached --ignore-unmatch .env" \
 --prune-empty --tag-name-filter cat -- --all
```

---

## Checklist de Segurança

```
 .env está em .gitignore
 Nenhuma credencial em arquivos de código
 API Keys regeneradas após exposição
 .env.example não contém valores reais
 Logs não expõem dados sensíveis
 Validação de entrada antes de prompts IA
 Rate limiting em chamadas à API
 CORS configurado corretamente no backend
```

---

## Responder a Incidentes

### Se Expuseste uma Credencial

1. **Regenerar imediatamente** na console do serviço
2. **Remover do git history**:
 ```bash
 git filter-branch --force --index-filter \
 "git rm -rf --cached --ignore-unmatch .env" \
 --prune-empty -- --all
 git push origin --force --all
 ```
3. **Notificar equipe**
4. **Auditar logs** para uso não autorizado

### Se Detectar Anomalia

1. Verificar `git log` para mudanças suspeitas
2. Revisar `.env` e regenerar chaves
3. Audit na console do Google/GitHub
4. Recuperar backup se necessário

---

## Recursos de Segurança

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Flutter Security](https://flutter.dev/docs/release/breaking-changes/content-provider-security)
- [Google Cloud Security](https://cloud.google.com/security)
