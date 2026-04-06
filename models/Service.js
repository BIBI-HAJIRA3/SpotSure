// SpotSure/models/Service.js
const mongoose = require('mongoose');

const ServiceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },

    // Main hero image
    imagePath: { type: String, default: '' },

    // Additional images uploaded by provider
    providerImages: [{ type: String }],

    // Optional lat/lng (you already compute location in routes)
    location: {
      lat: { type: Number },
      lng: { type: Number },
    },

    averageRating: { type: Number, default: 0 },
    // how many people have rated this service at least once
    ratingCount: { type: Number, default: 0 },
    // how many written reviews (non‑empty comments)
    reviewCount: { type: Number, default: 0 },

    // Always visible once created (no admin approval now)
    isApproved: { type: Boolean, default: true },

    // Secret code required to delete (no longer used in UI but kept for compatibility)
    deleteCode: { type: String, required: false },

    // Who created this service (for creator-only actions)
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Removal request state
    removalRequested: { type: Boolean, default: false },
    removalRequestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Service', ServiceSchema);
