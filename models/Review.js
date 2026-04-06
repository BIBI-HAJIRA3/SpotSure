// SpotSure/models/Review.js
const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: true,
    },
    username: {
      type: String,
      required: false,
      trim: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: false,
      trim: true,
      default: '',
    },
    imageUrls: [{ type: String }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Review', reviewSchema);




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

    averageRating: { type: Number, default: 0 },
    // how many people have rated this service at least once
    ratingCount: { type: Number, default: 0 },
    // how many written reviews (non‑empty comments)
    reviewCount: { type: Number, default: 0 },

    // Always visible once created (no admin approval now)
    isApproved: { type: Boolean, default: true },

    // Secret code required to delete
    deleteCode: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Service', ServiceSchema);





// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    displayName: {
      type: String,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    savedServices: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Service',
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Virtual for plain password
UserSchema.virtual('password')
  .set(function (value) {
    this._password = value;
  })
  .get(function () {
    return this._password;
  });

// Hash before save
UserSchema.pre('save', async function (next) {
  try {
    if (!this._password) return next();
    const saltRounds = 10;
    const hash = await bcrypt.hash(this._password, saltRounds);
    this.passwordHash = hash;
    next();
  } catch (err) {
    next(err);
  }
});

UserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

module.exports = mongoose.model('User', UserSchema);
