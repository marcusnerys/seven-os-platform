# Brasil

APIs com dados brasileiros. É o primeiro arquivo a consultar em projeto nacional —
CEP, CNPJ, FIPE e feriados não têm equivalente útil nas APIs internacionais.

Auth `—` significa que não precisa de chave.

## Endereço e CEP

| API | O que faz | Auth | HTTPS | CORS |
|---|---|---|---|---|
| [ViaCep](https://viacep.com.br) | Brazil RESTful zip codes API | — | Yes | Unknown |
| [Cep.la](http://cep.la/) | Brazil RESTful API to find information about streets, zip codes, neighborhoods, cities and states | — | No | Unknown |
| [Postmon](http://postmon.com.br) | An API to query Brazilian ZIP codes and orders easily, quickly and free | — | No | Unknown |

## Empresa, pessoa e registro público

| API | O que faz | Auth | HTTPS | CORS |
|---|---|---|---|---|
| [BrasilAPI](https://brasilapi.com.br/) | Agrega CEP, CNPJ, DDD, bancos, feriados nacionais, FIPE, cambio e taxas numa API so | — | Yes | Yes |
| [Brazil Receita WS](https://www.receitaws.com.br/) | Consult companies by CNPJ for Brazilian companies | — | Yes | Unknown |
| [CPFHub](https://cpfhub.io) | Brazilian CPF lookup — returns full name, birth date, and gender for any CPF | `apiKey` | Yes | Yes |

## Dinheiro, pagamento e câmbio

| API | O que faz | Auth | HTTPS | CORS |
|---|---|---|---|---|
| [Economia.Awesome](https://docs.awesomeapi.com.br/api-de-moedas) | Portuguese free currency prices and conversion with no rate limits | — | Yes | Unknown |
| [MercadoPago](https://www.mercadopago.com.br/developers/es/reference) | Mercado Pago API reference - all the information you need to develop your integrations | `apiKey` | Yes | Unknown |
| [Boleto.Cloud](https://boleto.cloud/) | A api to generate boletos in Brazil | `apiKey` | Yes | Unknown |
| [Banco do Brasil](https://developers.bb.com.br/home) | All Banco do Brasil financial transaction APIs | `OAuth` | Yes | Yes |
| [Bitcambio](https://nova.bitcambio.com.br/api/v3/docs#a-public) | Get the list of all traded assets in the exchange | — | Yes | Unknown |
| [MercadoBitcoin](https://www.mercadobitcoin.com.br/api-doc/) | Brazilian Cryptocurrency Information | — | Yes | Unknown |
| [Brazil Central Bank Open Data](https://dadosabertos.bcb.gov.br/) | Brazil Central Bank Open Data | — | Yes | Unknown |

## Dados públicos e governo

| API | O que faz | Auth | HTTPS | CORS |
|---|---|---|---|---|
| [IBGE](https://servicodados.ibge.gov.br/api/docs/) | Aggregate services of IBGE (Brazilian Institute of Geography and Statistics) | — | Yes | Unknown |
| [Brazilian Chamber of Deputies Open Data](https://dadosabertos.camara.leg.br/swagger/api.html) | Provides legislative information in Apis XML and JSON, as well as files in various formats | — | Yes | No |
| [Queimadas INPE](https://queimadas.dgi.inpe.br/queimadas/dados-abertos/) | Access to heat focus data (probable wildfire) | — | Yes | Unknown |
| [API Grátis](https://apigratis.com.br/) | Multiples services and public APIs | — | Yes | Unknown |

## Veículos

| API | O que faz | Auth | HTTPS | CORS |
|---|---|---|---|---|
| [Tabela FIPE](https://deividfortuna.github.io/fipe/) | Marca, modelo, ano e preço de mercado de veículos, dados da Fipe | — | Yes | No |

## Logística

| API | O que faz | Auth | HTTPS | CORS |
|---|---|---|---|---|
| [Correios](https://cws.correios.com.br/ajuda) | Integration to provide information and prepare shipments using Correio's services | `apiKey` | Yes | Unknown |

---

Fonte: [public-apis/public-apis](https://github.com/public-apis/public-apis) (MIT).
