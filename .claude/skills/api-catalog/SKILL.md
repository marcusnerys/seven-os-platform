---
name: api-catalog
description: >
  Use quando precisar encontrar uma API pública para uma funcionalidade —
  "que API uso para CEP / CNPJ / cotação / feriado / clima / mapa / e-mail /
  frete / placa de carro", "existe API grátis para X", "preciso integrar X",
  "de onde puxo esse dado". Também ao escolher entre alternativas de API, ou ao
  procurar API sem chave para protótipo rápido.

  Catálogo de 794 APIs públicas sem autenticação, mais as principais brasileiras,
  organizadas por domínio. Toda entrada traz HTTPS e CORS — CORS importa em
  Flutter Web, onde uma API sem CORS quebra no navegador.

  NÃO serve para: documentação de uma API específica que você já escolheu (leia
  a doc oficial dela); APIs privadas ou internas do projeto; SDKs e bibliotecas.
---

# Catálogo de APIs públicas

794 APIs **sem autenticação** — sem chave, sem cadastro, sem cartão — mais as
brasileiras que precisam de chave mas não têm substituto.

## Como usar

1. **Projeto brasileiro? Abra `references/brasil.md` primeiro.** CEP, CNPJ,
   FIPE, feriados nacionais e boleto não têm equivalente útil nas
   internacionais. Só depois vá para o arquivo do domínio.
2. Identifique o domínio na tabela abaixo e leia **só aquele arquivo**.
3. Ao recomendar, diga sempre três coisas: se precisa de chave, se atende
   HTTPS, e se tem CORS.
4. Se nada servir, diga isso — não invente endpoint. O catálogo cobre o que
   cobre; o resto está no [repositório upstream](https://github.com/public-apis/public-apis),
   que tem ~900 APIs adicionais que exigem chave.

## Roteamento

| Preciso de | Arquivo |
|---|---|
| CEP, CNPJ, CPF, FIPE, boleto, PIX, IBGE, Correios | [references/brasil.md](references/brasil.md) |
| Câmbio, cripto, finanças, cobrança, vagas, rastreio, e-mail, telefone, validação, calendário | [references/negocio.md](references/negocio.md) |
| Endereço, geocoding, mapa, transporte, clima, ambiente, dados públicos, governo, veículo | [references/lugar-e-dados.md](references/lugar-e-dados.md) |
| Ferramenta de dev, segurança, dados de teste, storage, ML, encurtador, análise de texto | [references/dev.md](references/dev.md) |
| Vídeo, música, foto, arte, livro, notícia, jogo, dicionário | [references/midia.md](references/midia.md) |
| Ciência, matemática, saúde, animais, comida, esporte | [references/ciencia-e-saude.md](references/ciencia-e-saude.md) |

## Regras ao escolher

**CORS decide em Flutter Web.** `CORS: No` significa que a chamada falha no
navegador — funciona em Android e iOS, quebra na web. Nesse caso, ou escolha
outra API, ou faça a chamada por uma Edge Function do Supabase, que roda no
servidor e não sofre CORS.

**`HTTPS: No` é impeditivo em app de produção.** Android e iOS bloqueiam
tráfego em texto puro por padrão. Trate como último recurso, atrás de proxy.

**Sem chave não quer dizer sem limite.** Quase toda API grátis tem limite de
requisição não documentado. Para qualquer coisa em produção, faça cache — no
Seven OS, `hive` já está no `pubspec.yaml` e serve para isso.

**Prefira a API que agrega.** No Brasil, a BrasilAPI resolve CEP, CNPJ, DDD,
banco, feriado, FIPE e câmbio numa base só. Uma dependência em vez de seis.

## Procedência

Extraído de [public-apis/public-apis](https://github.com/public-apis/public-apis)
(MIT), filtrado para as entradas sem autenticação, mais as brasileiras
relevantes. Os dados vieram do README do upstream, não de memória.

Para atualizar: clone o upstream e regenere as tabelas.
