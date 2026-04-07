// routes/serviceRoutes.js
const express = require("express");
const router = express.Router();
const Service = require("../models/Service");

// create / request a service
router.post("/services", async (req, res) => {
  try {
    const {
      name,
      category,
      description,
      address,
      city,
      pincode,
      phone,
      lat,
      lng,
    } = req.body;

    if (!name || !category || !address || !city || !pincode) {
      return res
        .status(400)
        .json({ message: "Missing required fields" });
    }

    const service = new Service({
      name,
      category,
      description,
      address,
      city,
      pincode,
      phone,
      location: lat && lng ? { type: "Point", coordinates: [lng, lat] } : undefined,
      status: "pending",
    });

    await service.save();
    res.status(201).json({ message: "Service request submitted", service });
  } catch (err) {
    console.error("POST /api/services error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
