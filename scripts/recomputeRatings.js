// SpotSure/scripts/recomputeRatings.js
// Usage: node scripts/recomputeRatings.js

require('dotenv').config();
const mongoose = require('mongoose');

const Service = require('../models/Service');
const Review = require('../models/Review');

async function recompute() {
  const mongoUri =
    process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/SpotSure';
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  const services = await Service.find({});
  console.log(`Found ${services.length} services`);

  for (const svc of services) {
    const reviews = await Review.find({ service: svc._id });

    if (!reviews.length) {
      svc.averageRating = 0;
      svc.ratingCount = 0;
      svc.reviewCount = 0;
      await svc.save();
      console.log(`Service ${svc._id} -> no reviews`);
      continue;
    }

    const sum = reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
    const avg = sum / reviews.length;
    const ratingCount = reviews.length;
    const reviewCount = reviews.filter(
      (r) => r.comment && r.comment.trim() !== ''
    ).length;

    svc.averageRating = avg;
    svc.ratingCount = ratingCount;
    svc.reviewCount = reviewCount;
    await svc.save();

    console.log(
      `Service ${svc._id} -> avg=${avg.toFixed(
        2
      )}, ratings=${ratingCount}, reviews=${reviewCount}`
    );
  }

  await mongoose.disconnect();
  console.log('Done.');
}

recompute().catch((err) => {
  console.error(err);
  process.exit(1);
});
