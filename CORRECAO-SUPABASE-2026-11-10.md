# Conexão Supabase — correção para a apresentação

A tela branca enviada no chat corresponde ao bloqueio local de configuração. Esse bloqueio ocorria antes de o app tentar se conectar ao banco.

O código anterior só aceitava o nome EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY e o prefixo sb_publishable_. Uma chave pública legada anon, embora suportada pelo Supabase, era recusada. Configuração ausente, URL errada e esse formato de chave geravam a mesma mensagem. A captura não permite distinguir qual dessas entradas estava no computador usado.

## O que foi corrigido

- A apresentação inclui em constants/backendPublic.ts a URL e a chave publicável ativa do projeto ELAS. São configurações de cliente; não são chave administrativa, senha nem token de sessão.
- Um clone ou extração limpa pode abrir o aplicativo no modo de apresentação/desenvolvimento sem criar um .env.
- As configurações explícitas podem usar EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY, EXPO_PUBLIC_SUPABASE_ANON_KEY ou EXPO_PUBLIC_SUPABASE_KEY. A chave pública anon também pode estar no campo PUBLISHABLE_KEY.
- Espaços externos, aspas que envolvem o valor e barra final da URL são normalizados.
- Chaves administrativas e tokens de sessão não são aceitos. Uma anon identificada como pertencente a outro projeto gera erro específico.
- Um projeto alternativo exige URL e chave correspondentes. Produção e staging continuam exigindo configuração explícita, sem adotar o banco da apresentação silenciosamente.
- Login, recuperação de senha e cache offline usam a mesma configuração resolvida.
- Erros reais de API key e de senha incorreta possuem mensagens distintas.

Nenhuma senha foi trocada e nenhuma permissão no banco foi ampliada nesta correção. O controle de acesso continua vindo da autenticação e das regras RLS.

## Como abrir

1. Extraia o ZIP atualizado em uma pasta nova.
2. Encerre o Expo da pasta antiga.
3. Abra Apresentar-ELAS.cmd no Windows, ou execute npm run apresentacao.
4. No celular, leia o QR novo. No navegador, faça recarregamento completo se estava usando a versão antiga.

Para usar outro banco, configure o .env na pasta que contém package.json. URL e chave devem ser do mesmo projeto. Reinicie o Expo após alterar o arquivo.

## Validação

- npm ci, TypeScript, lint e a suíte completa passaram, incluindo 28 casos de configuração.
- A cópia limpa, sem .env, abriu o template e usou o projeto e a chave pública do ELAS na chamada de login. A resposta simulada diferenciou chave inválida de senha incorreta.
- As chaves publicável e anon foram aceitas pelo endpoint de configuração de autenticação do Supabase real (HTTP 200).
- Os manifests e bundles de entrada Android/iOS da cópia limpa usaram Expo SDK 58.

Esses testes não usam a senha do administrador e não substituem o ensaio no aparelho.
