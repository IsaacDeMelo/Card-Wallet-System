# Card Wallet

Aplicacao Node.js + Express + EJS para carteira de cartas, com painel admin protegido por senha.

## Rodar localmente

1. Crie um arquivo `.env` com `MONGO_URI`.
2. Instale dependencias com `npm install`.
3. Inicie com `npm start`.

## Como usar

1. Acesse `/home` para fazer o cadastro e ser redirecionado para a carteira.
2. Abra `/wallet?username=seu_usuario` para ver a bolsa, copiar textos de cartas e salvar um draw personalizado.
3. Abra `/admin` para o painel completo, onde voce cria e edita cartas, entrega ou remove cartas de usuarios e pode excluir contas.
4. Abra `/admin-lite` para o painel rapido, focado em criar cartas base, consultar usuarios e gerenciar inventarios por modal.

## Senhas de admin

As senhas dos painéis podem ser definidas por ambiente:

- `ADMIN_PANEL_PASSWORD`
- `ADMIN_LITE_PASSWORD`

Se essas variaveis nao existirem, o projeto usa os valores padrao definidos em `routes/api.js`.

## Deploy no Render

1. Suba este repositório para o GitHub.
2. Crie um novo Web Service no Render apontando para o repo.
3. O Render pode usar o `render.yaml` deste projeto automaticamente.
4. Defina a variavel de ambiente `MONGO_URI` com a string do MongoDB.

## Observacoes

- A porta usa `process.env.PORT` quando o Render fornecer esse valor.
- O arquivo `.env` nao deve ser enviado para o repo.
- Se quiser mudar as senhas administrativas, coloque as variaveis no `.env` ou no painel do Render.