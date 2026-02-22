// SpotSure/routes/imageRoutes.js
const express = require('express');
const axios = require('axios');

const router = express.Router();

// Stream Cloudinary image through your server by publicId
router.get('/:publicId', async (req, res) => {
  const publicId = req.params.publicId;

  try {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const url = `https://res.cloudinary.com/${cloudName}/image/upload/${publicId}.jpg`;

    const response = await axios.get(url, { responseType: 'arraybuffer' });

    res.set('Content-Type', response.headers['content-type'] || 'image/jpeg');
    res.send(response.data);
  } catch (err) {
    console.error(err);
    res.status(404).end();
  }
});

module.exports = router;
