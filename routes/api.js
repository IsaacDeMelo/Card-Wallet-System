const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Card = require('../models/Card');

const router = express.Router();
const ADMIN_PANEL_PASSWORD = 'AaOWoaONmKjKo';

function sanitizeUser(user) {
  const safeUser = user.toObject ? user.toObject() : { ...user };
  delete safeUser.passwordHash;
  return safeUser;
}

function hasAdminAccess(req) {
  const password =
    (req.body && req.body.adminPassword) ||
    req.headers['x-admin-password'] ||
    req.query.adminPassword;

  return password === ADMIN_PANEL_PASSWORD;
}

function ensureAdminAccess(req, res) {
  if (hasAdminAccess(req)) {
    return true;
  }

  res.status(401).json({
    success: false,
    message: 'Acesso admin negado.',
  });

  return false;
}

async function resolveUserByIdentity({ username }) {
  if (username) {
    return User.findOne({ username });
  }

  return null;
}

async function buildWalletPayload(user) {
  const userCards = Array.isArray(user.cards) ? user.cards : [];
  const cardIds = userCards.map((entry) => entry.cardId);
  const globalCards = await Card.find({ cardId: { $in: cardIds } });
  const cardsById = new Map(globalCards.map((card) => [card.cardId, card]));

  return {
    user,
    cards: userCards.map((entry) => ({
      cardId: entry.cardId,
      quantity: entry.quantity,
      card: cardsById.get(entry.cardId) || null,
    })),
  };
}

router.post('/register', async (req, res) => {
  try {
    const { username, whatsapp, password, profile_pic, clan } = req.body;

    if (!username || !whatsapp || !password || !clan) {
      return res.status(400).json({
        success: false,
        message: 'username, whatsapp, password e clan sao obrigatorios.',
      });
    }

    const existingUser = await User.findOne({
      $or: [{ username }, { whatsapp }],
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Usuario ou WhatsApp ja cadastrado.',
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      whatsapp,
      passwordHash,
      profilePic: profile_pic || '',
      clan,
    });

    return res.status(201).json({
      success: true,
      message: 'Ninja registrado com sucesso!',
      user: {
        username: user.username,
        whatsapp: user.whatsapp,
        clan: user.clan,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Falha ao registrar o usuario.',
      error: error.message,
    });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'username e password sao obrigatorios.',
      });
    }

    const user = await User.findOne({ username });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario ou senha invalidos.',
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Usuario ou senha invalidos.',
      });
    }

    return res.json({
      success: true,
      message: 'Login realizado com sucesso.',
      user: {
        id: user._id,
        username: user.username,
        whatsapp: user.whatsapp,
        clan: user.clan,
        is_admin: user.isAdmin,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Falha ao autenticar.',
      error: error.message,
    });
  }
});

router.get('/wallet', async (req, res) => {
  try {
    const username = req.query.username;

    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'username obrigatorio.',
      });
    }

    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario nao encontrado.',
      });
    }

    const payload = await buildWalletPayload(sanitizeUser(user));

    return res.json({
      success: true,
      user: payload.user,
      cards: payload.cards,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Falha ao carregar a carteira.',
      error: error.message,
    });
  }
});

router.get('/wallet/user/:username', async (req, res) => {
  try {
    const { username } = req.params;

    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'username e obrigatorio.',
      });
    }

    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario nao encontrado.',
      });
    }

    const payload = await buildWalletPayload(sanitizeUser(user));

    return res.json({
      success: true,
      user: payload.user,
      cards: payload.cards,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Falha ao carregar a carteira por username.',
      error: error.message,
    });
  }
});

// Alternate endpoint that explicitly loads wallet by query username
router.get('/walletByUsername', async (req, res) => {
  try {
    const username = req.query.username;

    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'username e obrigatorio.',
      });
    }

    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario nao encontrado.',
      });
    }

    const payload = await buildWalletPayload(sanitizeUser(user));

    return res.json({
      success: true,
      user: payload.user,
      cards: payload.cards,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Falha ao carregar a carteira por username.',
      error: error.message,
    });
  }
});

router.post('/wallet/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'username e password sao obrigatorios.',
      });
    }

    const user = await User.findOne({ username });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario ou senha invalidos.',
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Usuario ou senha invalidos.',
      });
    }

    const safeUser = sanitizeUser(user);

    const payload = await buildWalletPayload(safeUser);

    return res.json({
      success: true,
      message: 'Carteira carregada com sucesso.',
      user: payload.user,
      cards: payload.cards,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Falha ao autenticar a carteira.',
      error: error.message,
    });
  }
});

router.post('/admin/cards', async (req, res) => {
  try {
    if (!ensureAdminAccess(req, res)) {
      return;
    }

    const { cardId, draw, url, title, categoria } = req.body;

    if (!cardId || !draw || !title || !categoria) {
      return res.status(400).json({
        success: false,
        message: 'cardId, draw, title e categoria sao obrigatorios.',
      });
    }

    if (String(draw).trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'draw nao pode ser vazio.',
      });
    }

    const existingCard = await Card.findOne({ cardId });

    if (existingCard) {
      return res.status(409).json({
        success: false,
        message: 'Ja existe carta com esse cardId.',
      });
    }

    const card = await Card.create({
      cardId,
      draw,
      url: url || '',
      title,
      categoria,
    });

    return res.status(201).json({
      success: true,
      message: 'Carta criada com sucesso!',
      card,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Falha ao criar a carta.',
      error: error.message,
    });
  }
});

router.put('/admin/cards/:cardId', async (req, res) => {
  try {
    if (!ensureAdminAccess(req, res)) {
      return;
    }

    const { cardId } = req.params;
    const { draw, url, title, categoria } = req.body;

    if (!cardId) {
      return res.status(400).json({
        success: false,
        message: 'cardId e obrigatorio.',
      });
    }

    if (!draw || !title || !categoria) {
      return res.status(400).json({
        success: false,
        message: 'draw, title e categoria sao obrigatorios.',
      });
    }

    if (String(draw).trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'draw nao pode ser vazio.',
      });
    }

    const card = await Card.findOneAndUpdate(
      { cardId },
      {
        draw,
        url: url || '',
        title,
        categoria,
      },
      { new: true }
    );

    if (!card) {
      return res.status(404).json({
        success: false,
        message: 'Carta nao encontrada.',
      });
    }

    return res.json({
      success: true,
      message: 'Carta atualizada com sucesso.',
      card,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Falha ao atualizar a carta.',
      error: error.message,
    });
  }
});

router.get('/admin/cards', async (req, res) => {
  try {
    if (!ensureAdminAccess(req, res)) {
      return;
    }

    const cards = await Card.find().sort({ createdAt: -1 });

    return res.json({
      success: true,
      cards,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Falha ao listar cartas.',
      error: error.message,
    });
  }
});

router.get('/admin/users', async (req, res) => {
  try {
    if (!ensureAdminAccess(req, res)) {
      return;
    }

    const users = await User.find().sort({ username: 1 });
    const safeUsers = users.map((user) => {
      const safeUser = sanitizeUser(user);
      const cards = Array.isArray(safeUser.cards) ? safeUser.cards : [];
      const totalCards = cards.reduce((acc, entry) => acc + (entry.quantity || 0), 0);

      return {
        id: safeUser._id,
        username: safeUser.username,
        clan: safeUser.clan,
        whatsapp: safeUser.whatsapp,
        uniqueCards: cards.length,
        totalCards,
      };
    });

    return res.json({
      success: true,
      users: safeUsers,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Falha ao listar usuarios.',
      error: error.message,
    });
  }
});

router.post('/admin/assign', async (req, res) => {
  try {
    if (!ensureAdminAccess(req, res)) {
      return;
    }

    const { username, cardId } = req.body;
    const quantity = Math.max(1, Number(req.body.quantity) || 1);

    if (!username || !cardId) {
      return res.status(400).json({
        success: false,
        message: 'username e cardId sao obrigatorios.',
      });
    }

    const [user, card] = await Promise.all([
      resolveUserByIdentity({ username }),
      Card.findOne({ cardId }),
    ]);

    if (!user || !card) {
      return res.status(404).json({
        success: false,
        message: 'Usuario ou carta nao encontrados.',
      });
    }

    const ownedCard = user.cards.find((entry) => entry.cardId === cardId);

    if (ownedCard) {
      ownedCard.quantity += quantity;
    } else {
      user.cards.push({ cardId, quantity });
    }

    await user.save();

    const payload = await buildWalletPayload(sanitizeUser(user));

    return res.status(201).json({
      success: true,
      message: 'Carta entregue ao ninja!',
      inventory: payload.cards,
      card,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Falha ao atribuir a carta.',
      error: error.message,
    });
  }
});

router.post('/admin/remove', async (req, res) => {
  try {
    if (!ensureAdminAccess(req, res)) {
      return;
    }

      const { username, cardId } = req.body;
    const quantity = Math.max(1, Number(req.body.quantity) || 1);

      if (!username || !cardId) {
        return res.status(400).json({
          success: false,
          message: 'username e cardId sao obrigatorios.',
        });
      }

    const [user, card] = await Promise.all([
      resolveUserByIdentity({ username }),
      Card.findOne({ cardId }),
    ]);

    if (!user || !card) {
      return res.status(404).json({
        success: false,
        message: 'Usuario ou carta nao encontrados.',
      });
    }

    const ownedCard = user.cards.find((entry) => entry.cardId === cardId);

    if (!ownedCard) {
      return res.status(404).json({
        success: false,
        message: 'O usuario nao possui essa carta.',
      });
    }

    ownedCard.quantity -= quantity;
    user.cards = user.cards.filter((entry) => entry.quantity > 0);

    await user.save();

    const payload = await buildWalletPayload(sanitizeUser(user));

    return res.json({
      success: true,
      message: 'Carta removida do inventario do ninja.',
      inventory: payload.cards,
      card,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Falha ao remover carta.',
      error: error.message,
    });
  }
});

module.exports = router;
