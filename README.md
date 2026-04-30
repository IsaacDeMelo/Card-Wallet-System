# Card Wallet

Aplicacao Node.js + Express + EJS para carteira de cartas, com painel admin protegido por senha.

## Rodar localmente

1. Crie um arquivo `.env` com `MONGO_URI`.
2. Instale dependencias com `npm install`.
3. Inicie com `npm start`.

## Deploy no Render

1. Suba este repositório para o GitHub.
2. Crie um novo Web Service no Render apontando para o repo.
3. O Render pode usar o `render.yaml` deste projeto automaticamente.
4. Defina a variavel de ambiente `MONGO_URI` com a string do MongoDB.

## Observacoes

- A porta usa `process.env.PORT` quando o Render fornecer esse valor.
- O arquivo `.env` nao deve ser enviado para o repo.