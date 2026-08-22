# Servidores MCP do projeto

Configurados em [`.mcp.json`](../.mcp.json), na raiz. Ao abrir o projeto com
`claude`, o Claude Code pede aprovação uma vez por servidor — servidor de
projeto não sobe sozinho, por segurança.

## Os cinco

| Servidor | Para que serve | Precisa de chave |
|---|---|---|
| `perplexity` | Busca na web ao vivo, com raciocínio e pesquisa | ✅ `PERPLEXITY_API_KEY` |
| `playwright` | Controla um navegador real: clica, preenche, testa o app como um QA | ❌ |
| `firecrawl` | Varre sites inteiros e traz o conteúdo já limpo | ✅ `FIRECRAWL_API_KEY` |
| `chrome-devtools` | Lê a página aberta no seu Chrome: console, rede, estilos computados | ❌ |
| `glif` | Centenas de modelos de imagem, vídeo e áudio | Conta em glif.app |

## Chaves

Nenhuma chave fica no repositório. O `.mcp.json` referencia variáveis de
ambiente com `${VAR}`; quem resolve é o seu shell.

```bash
# ~/.zshrc ou ~/.bashrc
export PERPLEXITY_API_KEY="pplx-..."
export FIRECRAWL_API_KEY="fc-..."
```

- Perplexity: https://docs.perplexity.ai/guides/mcp-server (a API é paga, por uso)
- Firecrawl: https://firecrawl.dev (tem plano grátis com limite mensal)
- Glif: https://glif.app/mcp (autentica pela conta, no primeiro uso)

## Onde cada um roda

`playwright` e `chrome-devtools` **precisam da sua máquina**. O primeiro baixa
o próprio navegador; o segundo se conecta a um Chrome de verdade — a graça dele
é ler a aba que *você* tem aberta, com sua sessão e seu login. Em sessão remota
do Claude Code na web isso não existe.

`perplexity` e `firecrawl` chamam APIs externas, que a allowlist de egresso da
sessão remota bloqueia. Também são de uso local.

Ou seja: os cinco são para rodar `claude` no desktop. O `.mcp.json` versionado
garante que a configuração esteja lá quando você abrir.

## Chrome DevTools numa aba já aberta

Por padrão o servidor sobe um Chrome novo, sem suas sessões. Para conectar no
Chrome que você já usa, suba o navegador com a porta de depuração e aponte
para ela:

```bash
# 1. Chrome com depuração remota ligada
google-chrome --remote-debugging-port=9222

# 2. no .mcp.json, troque os args do chrome-devtools por:
#    ["-y", "chrome-devtools-mcp@latest", "--browser-url=http://127.0.0.1:9222"]
```

## Sobreposições que valem saber

**Perplexity e o `WebSearch` nativo** cobrem terreno parecido. O `WebSearch` já
vem no Claude Code, é grátis e funciona até em sessão remota. O Perplexity
entrega busca com raciocínio e citação, e cobra por uso. Vale a pena quando a
pergunta é de pesquisa, não de consulta rápida.

**Firecrawl e a skill `agent-reach`** também se cruzam na leitura de páginas. O
Firecrawl é melhor: varre site inteiro e devolve conteúdo limpo, enquanto o
canal web do agent-reach passa pelo Jina Reader e devolve markdown cru. O
agent-reach continua valendo pelas redes sociais, que o Firecrawl não cobre.

**Playwright e Chrome DevTools não competem.** O Playwright *dirige* o
navegador — clica, preenche, navega um fluxo. O Chrome DevTools *observa* uma
página que já está rodando — console, rede, estilos. Usados juntos: o
Playwright chega na tela que interessa, o DevTools inspeciona.
