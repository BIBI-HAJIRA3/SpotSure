// SpotSure/seed_shivamogga.js
require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// adjust path if your model is elsewhere
const Service = require('./models/Service');

const filePath = path.join(__dirname, 'shivamogga_amenities.geojson'); // or .json
const geojson = JSON.parse(fs.readFileSync(filePath, 'utf8'));

function mapAmenityToCategory(amenity) {
  if (!amenity) return 'Other';
  switch (amenity) {
    case 'school': return 'School';
    case 'college': return 'College';
    case 'hospital': return 'Hospital';
    case 'clinic': return 'Clinic';
    case 'restaurant': return 'Restaurant';
    default:
      return amenity.charAt(0).toUpperCase() + amenity.slice(1);
  }
}

function buildAddress(props) {
  const parts = [];
  if (props['addr:housenumber']) parts.push(props['addr:housenumber']);
  if (props['addr:street']) parts.push(props['addr:street']);
  if (props['addr:city']) parts.push(props['addr:city']);
  if (props['addr:postcode']) parts.push(props['addr:postcode']);
  return parts.join(', ');
}

async function run() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/spotsure';
  await mongoose.connect(mongoUri);

  const features = geojson.features || [];

  const docs = features
    .filter(f => f.geometry && f.geometry.type === 'Point')
    .filter(f => f.properties && f.properties.amenity && f.properties.name)
    .map(f => {
      const [lng, lat] = f.geometry.coordinates;
      const props = f.properties;

      return {
        name: props.name,
        category: mapAmenityToCategory(props.amenity),
        description: props.description || '',
        address: buildAddress(props),
        city: 'Shivamogga',
        pincode: props['addr:postcode'] || '',
        location: { lat, lng },

        // defaults so existing UI doesn’t crash
        averageRating: 0,
        ratingCount: 0,
        reviewsCount: 0
      };
    });

  console.log('Prepared docs:', docs.length);
  if (!docs.length) {
    console.log('No docs to insert; check GeoJSON + filters.');
    process.exit(0);
  }

  // optional: clear old Shivamogga entries
  await Service.deleteMany({ city: 'Shivamogga' });

  await Service.insertMany(docs);
  console.log('Inserted', docs.length, 'services for Shivamogga');

  await mongoose.disconnect();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
