// SpotSure/models/Service.js
const mongoose = require('mongoose');

const ServiceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    category: { type: String, default: 'Service' },
    city: { type: String, required: true },
    pincode: { type: String, required: true },
    address: { type: String, required: true },

    imagePath: { type: String, default: '' },
    providerImages: { type: [String], default: [] },

    location: {
      lat: { type: Number },
      lng: { type: Number },
    },

    isApproved: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    removalRequested: { type: Boolean, default: false },
    removalRequestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    averageRating: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

ServiceSchema.index({ createdAt: -1 });
ServiceSchema.index({ name: 1 });
ServiceSchema.index({ category: 1, city: 1 });
ServiceSchema.index({ pincode: 1 });

module.exports = mongoose.model('Service', ServiceSchema);
