// SpotSure/models/Service.js
const mongoose = require('mongoose');

const ServiceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },

    // Legacy single main image (first provider image)
    imagePath: { type: String, default: '' },

    // Multiple images added by provider (Cloudinary public_ids or URLs)
    providerImages: { type: [String], default: [] },

    averageRating: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },

    isApproved: { type: Boolean, default: true },

    deleteCode: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Service', ServiceSchema);
