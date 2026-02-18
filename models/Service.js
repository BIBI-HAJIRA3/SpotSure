// models/Service.js
const mongoose = require('mongoose');

const ServiceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    imagePath: { type: String, default: '' },

    averageRating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },

    // Always visible once created (no admin approval now)
    isApproved: { type: Boolean, default: true },

    // Secret code required to delete
    deleteCode: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Service', ServiceSchema);
