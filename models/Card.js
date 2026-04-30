const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema(
  {
    cardId: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    draw: {
      type: String,
      default: '',
    },
    url: {
      type: String,
      default: '',
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    categoria: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Card', cardSchema);
