const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Card = require('../models/Card');

const router = express.Router();
const ADMIN_PANEL_PASSWORD = process.env.ADMIN_PANEL_PASSWORD || 'AaOWoaONmKjKo';
const ADMIN_LITE_PASSWORD = process.env.ADMIN_LITE_PASSWORD || 'adminrpg090920201010';

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

function hasAdminLiteAccess(req) {
  const password =
    (req.body && req.body.adminPassword) ||
    req.headers['x-admin-password'] ||
    req.query.adminPassword;

  return password === ADMIN_LITE_PASSWORD;
}

function ensureAdminLiteAccess(req, res) {
  if (hasAdminLiteAccess(req)) {
    return true;
  }

  res.status(401).json({
    success: false,
    message: 'Acesso admin-lite negado.',
  });

  return false;
}

async function resolveUserByIdentity({ username }) {
  if (username) {
    return User.findOne({ username: String(username).trim() });
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
      customDraw: entry.customDraw || '',
      card: cardsById.get(entry.cardId) || null,
    })),
  };
}

async function buildAdminLitePayload() {
  const [users, cards] = await Promise.all([
    User.find().sort({ username: 1 }),
    Card.find().sort({ title: 1 }),
  ]);

  const cardsById = new Map(cards.map((card) => [card.cardId, card]));

  return {
    cards: cards.map((card) => ({
      cardId: card.cardId,
      title: card.title || card.cardId,
      categoria: card.categoria || '',
    })),
    users: users.map((user) => {
      const userCards = Array.isArray(user.cards) ? user.cards : [];

      return {
        username: user.username,
        whatsapp: user.whatsapp,
        clan: user.clan,
        cards: userCards
          .map((entry) => {
            const card = cardsById.get(entry.cardId);

            return {
              cardId: entry.cardId,
              title: card ? (card.title || card.cardId) : entry.cardId,
              quantity: entry.quantity || 0,
            };
          })
          .filter((entry) => entry.quantity > 0),
      };
    }),
  };
}

async function deleteCardEverywhere(cardId) {
  const [deletedCard] = await Promise.all([
    Card.findOneAndDelete({ cardId }),
    User.updateMany(
      {},
      {
        $pull: {
          cards: { cardId },
        },
      }
    ),
  ]);

  return deletedCard;
}

router.post('/register', async (req, res) => {
  try {
    const { username, whatsapp, password, profile_pic, clan, recruitedBy } = req.body;

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

    // Validate referrer if provided
    let referrerExists = null;

if (recruitedBy) {
  referrerExists = await User.findOne({
    username: new RegExp(`^${String(recruitedBy).trim()}$`, 'i')
  });

  if (!referrerExists) {
    return res.status(400).json({
      success: false,
      message: 'Recrutador nao encontrado.',
    });
  }
}

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      whatsapp,
      passwordHash,
      profilePic: profile_pic || '',
      clan,
      recruitedBy: recruitedBy ? String(recruitedBy).trim() : null,
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

router.post('/wallet/customDraw', async (req, res) => {
  try {
    const { username, cardId, customDraw } = req.body;

    if (!username || !cardId) {
      return res.status(400).json({
        success: false,
        message: 'username e cardId sao obrigatorios.',
      });
    }

    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario nao encontrado.',
      });
    }

    const ownedCard = user.cards.find((entry) => entry.cardId === cardId);

    if (!ownedCard) {
      return res.status(404).json({
        success: false,
        message: 'Usuario nao possui essa carta.',
      });
    }

    ownedCard.customDraw = String(customDraw || '').slice(0, 50000);

    await user.save();

    return res.json({
      success: true,
      message: 'Desenho personalizado salvo com sucesso.',
      customDraw: ownedCard.customDraw,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Falha ao salvar o desenho personalizado.',
      error: error.message,
    });
  }
});

router.get('/admin-lite/overview', async (req, res) => {
  try {
    if (!ensureAdminLiteAccess(req, res)) {
      return;
    }

    const payload = await buildAdminLitePayload();

    return res.json({
      success: true,
      cards: payload.cards,
      users: payload.users,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Falha ao carregar o admin-lite.',
      error: error.message,
    });
  }
});

router.get('/admin-lite/recruitment', async (req, res) => {
  try {
    if (!ensureAdminLiteAccess(req, res)) {
      return;
    }

    // Get all users with recruitment data
    const users = await User.find({ recruitedBy: { $ne: null } }).sort({ recruitedBy: 1 });

    // Count recruits per recruiter
    const recruitmentMap = new Map();
    users.forEach((user) => {
      const recruiter = user.recruitedBy;
      recruitmentMap.set(recruiter, (recruitmentMap.get(recruiter) || 0) + 1);
    });

    // Build ranking array
    const ranking = Array.from(recruitmentMap.entries())
      .map(([recruiter, count]) => ({
        recruiter,
        recruits: count,
      }))
      .sort((a, b) => b.recruits - a.recruits);

    return res.json({
      success: true,
      ranking,
      totalRecruited: users.length,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Falha ao carregar ranking de recrutamento.',
      error: error.message,
    });
  }
});

router.post('/admin-lite/cards', async (req, res) => {
  try {
    if (!ensureAdminLiteAccess(req, res)) {
      return;
    }

    const { cardId, title, categoria, draw, url } = req.body;

    if (!cardId || !title || !categoria) {
      return res.status(400).json({
        success: false,
        message: 'cardId, title e categoria sao obrigatorios.',
      });
    }

    const existingCard = await Card.findOne({ cardId });

    if (existingCard) {
      return res.status(409).json({
        success: false,
        message: 'Ja existe uma carta com esse cardId.',
      });
    }

    const card = await Card.create({
      cardId,
      title,
      categoria,
      draw: draw || '',
      url: url || '',
    });

    return res.status(201).json({
      success: true,
      message: 'Carta criada com sucesso pelo admin-lite.',
      card,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Falha ao criar a carta no admin-lite.',
      error: error.message,
    });
  }
});

router.delete('/admin-lite/cards/:cardId', async (req, res) => {
  try {
    if (!ensureAdminLiteAccess(req, res)) {
      return;
    }

    const { cardId } = req.params;

    if (!cardId) {
      return res.status(400).json({
        success: false,
        message: 'cardId e obrigatorio.',
      });
    }

    const deletedCard = await deleteCardEverywhere(cardId);

    if (!deletedCard) {
      return res.status(404).json({
        success: false,
        message: 'Carta nao encontrada.',
      });
    }

    return res.json({
      success: true,
      message: 'Carta excluida com sucesso.',
      cardId,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Falha ao excluir a carta.',
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

    if (!cardId || !title || !categoria) {
      return res.status(400).json({
        success: false,
        message: 'cardId, title e categoria sao obrigatorios.',
      });
    }

    const card = await Card.create({
      cardId,
      draw: draw || '',
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

    if (!title || !categoria) {
      return res.status(400).json({
        success: false,
        message: 'title e categoria sao obrigatorios.',
      });
    }

    const card = await Card.findOneAndUpdate(
      { cardId },
      {
        draw: draw || '',
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

router.delete('/admin/users/:username', async (req, res) => {
  try {
    if (!ensureAdminAccess(req, res)) {
      return;
    }

    const username = String(req.params.username || '').trim();

    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'username e obrigatorio.',
      });
    }

    const deletedUser = await User.findOneAndDelete({ username });

    if (!deletedUser) {
      return res.status(404).json({
        success: false,
        message: 'Usuario nao encontrado.',
      });
    }

    return res.json({
      success: true,
      message: 'Usuario excluido com sucesso.',
      username,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Falha ao excluir o usuario.',
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
