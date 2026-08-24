# Seven OS Platform

App Flutter de gestao de servicos, com Supabase e IA integrada.

## Stack

Flutter 3.0+ / Dart. Estado com BLoC. Backend Supabase (Postgres, Auth).
Local com Hive. HTTP com Dio. Tipografia via google_fonts.

## Comandos

- Instalar: `flutter pub get`
- Analisar: `flutter analyze`
- Testar: `flutter test`
- Rodar: `flutter run`

## Padrao visual

Regra geral: nada aqui pode parecer template generico de IA. Antes de
entregar qualquer tela, componente, documento ou pagina, confira esta lista.
Ela vale para o app, para landing page, para README e para qualquer material
visual do projeto.

### Proibido

**Cor**

1. Gradiente agressivo
2. Paleta arco-iris
3. Roxo com preto
4. Neon
5. Pastel basico
6. Branco puro como fundo. Use um neutro com temperatura.
7. Faixa colorida na lateral esquerda

**Forma e profundidade**

8. Drop shadow. Separe por espacamento, borda ou valor de cor.
9. Canto arredondado generico. Escolha um raio com intencao e mantenha.
10. Liquid glass mal executado. Sem blur decorativo.
11. Orbe radial de fundo
12. Grade de pontinhos

**Tipografia e simbolo**

13. Inter, Geist, Space Grotesk
14. Travessao. Use virgula, dois pontos ou ponto.
15. Emoji, em interface e em documentacao
16. Icone do Lucide
17. Icone de brilho ou estrelinha

**Layout**

18. Tres cards de funcionalidade em fileira
19. Bento grid
20. Janela de terminal decorativa
21. Tres planos de preco

**Movimento**

22. Seta animada
23. Animacao de hover decorativa

**Texto**

24. Construcao "nao e x, e y"
25. Marcador com checkmark
26. Depoimento inventado

### Obrigatorio

27. Skeleton loader em toda tela que espera dado
28. Demonstracao real do produto, nunca mockup ilustrativo
29. Termos de Uso
30. Politica de Privacidade

### Como decidir quando a lista nao cobre

A lista diz o que evitar, nao o que fazer. Diante de uma escolha nao listada,
o criterio e: a decisao vem do produto, ou vem do default da ferramenta? Se
vem do default, refaca. Cor, espacamento e tipografia do Seven OS precisam ter
motivo ligado a gestao de servicos, nao a moda de landing page.
