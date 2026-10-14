# Conta compartilhada por convite

Item P1 do roadmap de paridade com o Meu Assessor: o dono convida pessoas da
equipe e escolhe, para cada uma, as áreas que ela vê. Implementado na v3.2.0
(migration `0022_conta_compartilhada.sql`).

## Modelo

- **`beautyos_membros`** (empresa_id, user_id, papel, areas, nome, email).
  - Cada pessoa participa de **uma** empresa só (`unique (user_id)`).
  - Papel `dono` ou `membro`. O dono tem todas as áreas.
  - Áreas possíveis: `agenda`, `clientes`, `financeiro`, `cobranca`.
- **`beautyos_convites`** (codigo, empresa_id, areas, nome, expira_em, usado_por).
  - Código de 10 caracteres, sem letras e números parecidos.
  - Vale por 7 dias e para uma pessoa só.
  - Cada empresa pode ter no máximo 20 convites em aberto.
- A empresa continua tendo o id do login de quem a criou. Contas de uma pessoa só não mudaram nada: o backfill fez cada login dono da própria empresa.

## Quem pode o quê (RLS)

| Tabela | Ler | Gravar |
|---|---|---|
| clientes | clientes, agenda, cobrança | criar e alterar: clientes, agenda; excluir: clientes |
| serviços | toda a equipe | agenda |
| agendamentos | agenda, clientes | agenda |
| transações | financeiro | financeiro; a agenda só **lança receita** (concluir atendimento) |
| fixos e parcelados, extratos | financeiro | financeiro |
| avisos | toda a equipe; os do tipo `financial` só o financeiro | criar: toda a equipe; alterar e excluir: como na leitura |
| modelos de mensagem | toda a equipe | dono |
| registro de envios | toda a equipe | toda a equipe |
| configurações (inclui PIX e link da agenda) | toda a equipe | dono |
| equipe | toda a equipe | só pelas funções abaixo |
| convites | dono | só pelas funções abaixo |

As políticas usam três funções `security definer` sem argumento de linha:
`beautyos_empresa_atual()`, `beautyos_sou_dono()` e `beautyos_tenho_area(text[])`.
Elas aparecem nas políticas como `(select ...)`, então o Postgres avalia cada uma
uma vez por consulta.

Um gatilho recusa um agendamento cujo cliente seja de outra empresa
(`cliente_de_outra_empresa`). A chave estrangeira sozinha não conferia isso.

## Funções chamadas pelo app

| Função | Quem chama | O que faz |
|---|---|---|
| `beautyos_criar_convite(areas, nome)` | dono | Devolve o código do convite. |
| `beautyos_ver_convite(codigo)` | qualquer pessoa logada | Nome do negócio e áreas, antes de aceitar. |
| `beautyos_aceitar_convite(codigo)` | qualquer pessoa logada | Ver abaixo. |
| `beautyos_atualizar_membro(user, areas, nome)` | dono | Muda as áreas e o nome de um membro. |
| `beautyos_remover_membro(user)` | dono | Tira a pessoa da equipe. |
| `beautyos_cancelar_convite(codigo)` | dono | Cancela um convite ainda não usado. |
| `beautyos_sair_da_equipe()` | membro | Sai da equipe e volta a ter uma empresa própria vazia. |
| `beautyos_garantir_empresa()` | o app, ao entrar | Quem ficou sem equipe ganha de novo uma empresa própria. |

`beautyos_aceitar_convite` só aceita quando a conta de quem aceita está vazia: sem
clientes, agenda, transações, serviços, fixos, extratos nem outros membros. Nesse
caso ela apaga a empresa vazia criada no cadastro e põe a pessoa na equipe. Se a
conta tiver dados, devolve `conta_com_dados` e a pessoa precisa usar outro e-mail.

## Fluxo no app

1. **Dono convida.** Em Mais → Equipe e acessos → Convidar pessoa, marca as áreas e envia o link `https://leshanotos.vercel.app/?convite=CODIGO` (pelo compartilhar do celular ou copiando).
2. **A pessoa abre o link.** O app guarda o código no aparelho (`guardarConviteDoLink`). A pessoa cria a conta ou entra, e aparece "Convite para a equipe" com o nome do negócio. Ela aceita.
3. **Código digitado.** Quem não usou o link pode digitar o código no primeiro passo da configuração inicial ("Recebi um convite…") ou em Mais → Equipe.
4. **O que muda na tela.**
   - A store lê `beautyos_membros` e passa a usar `empresaId` em todas as consultas e gravações.
   - As abas e os cartões aparecem por área (`src/lib/permissoes.ts`).
   - Comandos de voz de uma área sem acesso respondem com o motivo.
   - Configurações, logo, link de agendamento, Google Agenda, importação de contatos e dízimo ficam só com o dono.
   - O questionário inicial também é só do dono.
5. **Mudanças em tempo real.**
   - Configurações (inclusive PIX) e envios de automação chegam na hora pelo realtime (`beautyos_settings`, `beautyos_automation_logs`).
   - A equipe (`beautyos_membros`) **não** está no realtime: eventos de exclusão não passam pelo RLS e mostrariam a qualquer conta quem trabalha em qual negócio. O app relê a equipe cada vez que volta para a tela.

## Riscos aceitos

- **PIX e link da agenda legíveis.** `agenda_token` e os campos de PIX ficam legíveis para qualquer membro: a cobrança precisa da chave, e o link da agenda é de quem trabalha no negócio. Quem sai da equipe ou é removido perde o link: as duas funções trocam o `agenda_token`, e quem assinou a agenda no calendário precisa assinar de novo. Separar essas colunas exigiria trocar o `select('*')` de configurações por uma RPC.
- **Cota de IA por pessoa.** A cota continua por pessoa (`beautyos_ia_uso`), não por empresa.
- **Aviso lido para todos.** O campo `read` dos avisos é um só: quando um membro lê, fica lido para todos.
- **Receita em dobro.** Quem só tem a agenda não enxerga as transações, então a trava contra lançar duas vezes a receita de um atendimento só vale na mesma sessão. Corrigir pede uma chave única por agendamento no lançamento.
- **Excluir o dono apaga tudo.** Excluir o login do dono no Auth apaga a empresa inteira (cascade), junto com os membros.
- **Fixo de outra empresa.** `beautyos_transactions.recorrente_id` não confere a empresa do fixo. Com uma empresa por pessoa, isso só seria possível para quem já foi do financeiro de outra equipe e guardou ids de lá.
- **Limite da página pública.** O limite de 20 por hora conta agendamentos `Pendente` sem cliente, e a equipe também pode criar agendamentos assim.

## Rota pública `/evento` do Google Agenda

Essa rota é chamada pelo gatilho sem token. Ela deixou de confiar no corpo da
chamada:

- O agendamento é sempre relido. Se ele ainda existe, a rota só atualiza o evento.
- Apagar exige duas coisas: o agendamento tem de ter sumido, e o evento do Google tem de ter `leshanotId` igual ao id do agendamento.
- `status`, `iniciar`, `sincronizar` e `desconectar` usam a empresa do membro.
- Só o dono conecta, sincroniza ou desconecta. O e-mail da conta Google só aparece para o dono.

## Testes

- **RLS:** `supabase/tests/0022_conta_compartilhada.sql` tem 38 casos (dono, agenda, financeiro, estranho, visitante, convites, conta ligada ao Google, saída e remoção com troca do link da agenda). Ele também confere que cada conta real continua vendo exatamente as próprias linhas. O teste roda na mesma transação da migration e termina sempre em erro, então desfaz tudo, inclusive a migration:

  ```bash
  python -X utf8 .claude/ops/supa.py testf supabase/migrations/0022_conta_compartilhada.sql supabase/tests/0022_conta_compartilhada.sql
  ```

  A saída esperada começa com `RESULTADO (falhas: 0)`.
- **Permissões do app:** `npm run check:permissoes`.

## Ordem de publicação

1. Aplicar a migration 0022. O app antigo continua funcionando: para o dono, as políticas novas devolvem as mesmas linhas.
2. Publicar a Edge Function `google-agenda` (`verify_jwt` false).
3. Publicar o app.

A ordem é obrigatória. O app novo assina `beautyos_automation_logs` no realtime, e essa tabela só entra na publicação com a migration. Sem ela, o canal inteiro falha. Se `beautyos_membros` não existir, o app usa o próprio login como empresa.
