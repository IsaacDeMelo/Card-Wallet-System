const mongoose = require('mongoose');

const userOwnedCardSchema = new mongoose.Schema(
  {
    cardId: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },
    customDraw: {
      type: String,
      default: '',
    },
  },
  {
    _id: false,
  }
);

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    whatsapp: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    profilePic: {
      type: String,
      default: '',
    },
    clan: {
      type: String,
      required: true,
      enum: ['uchiha', 'senju'],
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    cards: {
      type: [userOwnedCardSchema],
      default: [],
    },
    recruitedBy: {
      type: String,
      default: null,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('User', userSchema);
