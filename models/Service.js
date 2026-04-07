// SpotSure/models/Service.js
const mongoose = require('mongoose');

const ServiceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    imagePath: { type: String, default: '' },
    providerImages: [{ type: String }],
    location: {
      lat: { type: Number },
      lng: { type: Number },
    },
    averageRating: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    isApproved: { type: Boolean, default: true },
    deleteCode: { type: String, required: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    removalRequested: { type: Boolean, default: false },
    removalRequestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Service', ServiceSchema);
