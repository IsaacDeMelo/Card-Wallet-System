const express = require('express');
const dns = require("node:dns/promises");
dns.setServers(["1.1.1.1", "8.8.8.8"]);
const path = require('path');
require('dotenv').config();
const connectDatabase = require('./config/database');
const preLoginRoutes = require('./routes/preLogin');
const apiRoutes = require('./routes/api');
const app = express();

// Middleware para aceitar JSON grande (por causa da imagem em Base64)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.get('/', (req, res) => {
    res.redirect('/home');
});

app.use('/', preLoginRoutes);
app.use('/api', apiRoutes);

async function startServer() {
  try {
    await connectDatabase();

    const port = process.env.PORT || 3300;
    app.listen(port, () => console.log(`Servidor Ninja rodando na porta ${port}!`));
  } catch (error) {
    console.error('Falha ao iniciar o servidor:', error.message);
    process.exit(1);
  }
}

startServer();