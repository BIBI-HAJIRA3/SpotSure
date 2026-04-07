const mongoose = require('mongoose');

const ServiceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },

    imagePath: { type: String, default: '' },
    providerImages: { type: [String], default: [] },

    averageRating: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },

    // Changed: default from true -> false
    isApproved: { type: Boolean, default: false },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    removalRequested: { type: Boolean, default: false },
    removalRequestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    location: {
      lat: Number,
      lng: Number,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Service', ServiceSchema);
