// SpotSure/routes/adminRoutes.js
const express = require("express");
const router = express.Router();
const Service = require("../models/Service");
const Review = require("../models/Review");
const ServiceReport = require("../models/ServiceReport");
const ReviewReport = require("../models/ReviewReport");
const requireAdmin = require("../middleware/requireAdmin");

// pending services
router.get("/services/pending", requireAdmin, async (req, res) => {
  try {
    const services = await Service.find({ status: "pending" }).sort({
      createdAt: -1,
    });
    res.json({ services });
  } catch (err) {
    console.error("GET /api/admin/services/pending error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// approve service
router.patch("/services/:id/approve", requireAdmin, async (req, res) => {
  try {
    const service = await Service.findByIdAndUpdate(
      req.params.id,
      { status: "approved" },
      { new: true }
    );
    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }
    res.json({ message: "Service approved", service });
  } catch (err) {
    console.error("PATCH /api/admin/services/:id/approve error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// delete service + its reviews + reports
router.delete("/services/:id", requireAdmin, async (req, res) => {
  try {
    const serviceId = req.params.id;
    await Review.deleteMany({ service: serviceId });
    await ServiceReport.deleteMany({ service: serviceId });

    const service = await Service.findByIdAndDelete(serviceId);
    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }
    res.json({ message: "Service, reviews and reports deleted" });
  } catch (err) {
    console.error("DELETE /api/admin/services/:id error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// removal requests
router.get(
  "/services/removal-requests",
  requireAdmin,
  async (req, res) => {
    try {
      const services = await Service.find({ removalRequested: true }).sort({
        createdAt: -1,
      });
      res.json({ services });
    } catch (err) {
      console.error(
        "GET /api/admin/services/removal-requests error:",
        err
      );
      res.status(500).json({ message: "Server error" });
    }
  }
);

// reported services
router.get("/reports/services", requireAdmin, async (req, res) => {
  try {
    const reports = await ServiceReport.find()
      .populate("service")
      .sort({ createdAt: -1 });

    // only keep reports where service still exists
    const filtered = reports.filter((r) => r.service);
    res.json({ reports: filtered });
  } catch (err) {
    console.error("GET /api/admin/reports/services error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// delete single review + its reports
router.delete("/reviews/:id", requireAdmin, async (req, res) => {
  try {
    const reviewId = req.params.id;
    const review = await Review.findByIdAndDelete(reviewId);
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    await ReviewReport.deleteMany({ review: reviewId });

    res.json({ message: "Review and its reports deleted" });
  } catch (err) {
    console.error("DELETE /api/admin/reviews/:id error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// reported reviews
router.get("/reports/reviews", requireAdmin, async (req, res) => {
  try {
    const reports = await ReviewReport.find()
      .populate("review")
      .sort({ createdAt: -1 });

    // filter out ones where review is already deleted
    const filtered = reports.filter((r) => r.review);
    res.json({ reports: filtered });
  } catch (err) {
    console.error("GET /api/admin/reports/reviews error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
