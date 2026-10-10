require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const nodemailer = require("nodemailer");

const app = express();

app.use(
  cors({
    origin: "https://lemonteamaomao.github.io",
    credentials: true,
  })
);

app.use(express.json());

// ================================
// Database
// ================================
mongoose
  .connect(process.env.MONGO_URI)
  .then(function () {
    console.log("MongoDB Connected");
  })
  .catch(function (err) {
    console.error("DB Error:", err.message);
  });

// ================================
// Booking Schema
// ================================
const bookingSchema = new mongoose.Schema({
  workshopType: String,
  organization: String,
  contactPerson: String,
  email: String,
  phone: String,
  date: String,
  participants: Number,
  notes: String,
  isSeen: { type: Boolean, default: false },
  isReplied: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

const Booking = mongoose.model("Booking", bookingSchema);

// ================================
// Email Setup
// ================================
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

// Verify email configuration
transporter
  .verify()
  .then(function () {
    console.log("Email server is ready");
  })
  .catch(function (err) {
    console.error("Email configuration error:", err.message);
    console.error("Email error code:", err.code || "Unknown");
  });

// ================================
// Get All Bookings
// ================================
app.get("/api/book-hygiene", async function (req, res) {
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    console.error("Fetch bookings error:", err.message);
    res.status(500).json({ message: "Failed to fetch bookings" });
  }
});

// ================================
// Create Booking + Send Email
// ================================
app.post("/api/book-hygiene", async function (req, res) {
  try {
    console.log("New booking request received");

    // Save booking to MongoDB
    const booking = new Booking(req.body);
    await booking.save();

    console.log("Booking saved:", booking._id.toString());

    // Send notification email
    try {
      const info = await transporter.sendMail({
        from: process.env.GMAIL_USER,
        to: process.env.GMAIL_USER,
        subject:
          "NEW " +
          (req.body.workshopType || "Booking") +
          ": " +
          (req.body.organization || "Unknown organization"),
        text:
          "New DaYiMa Booking Request\n\n" +
          "Workshop: " + (req.body.workshopType || "Not provided") + "\n" +
          "Organization: " + (req.body.organization || "Not provided") + "\n" +
          "Contact Person: " + (req.body.contactPerson || "Not provided") + "\n" +
          "Email: " + (req.body.email || "Not provided") + "\n" +
          "Phone: " + (req.body.phone || "Not provided") + "\n" +
          "Date: " + (req.body.date || "Not provided") + "\n" +
          "Participants: " + (req.body.participants ?? "Not provided") + "\n" +
          "Notes: " + (req.body.notes || "None"),
      });

      console.log("Email accepted by mail server:", info.messageId);
      console.log("Email response:", info.response);
    } catch (emailErr) {
      console.error("EMAIL SENDING FAILED");
      console.error("Error code:", emailErr.code || "Unknown");
      console.error("Error command:", emailErr.command || "Unknown");
      console.error("Error response:", emailErr.response || "No response");
      console.error("Error message:", emailErr.message);

      return res.status(500).json({
        message: "Booking saved, but email notification failed.",
      });
    }

    return res.status(201).json({
      message: "Booking submitted successfully and notification email sent.",
    });
  } catch (err) {
    console.error("Booking error:", err.message);

    return res.status(500).json({
      message: "Failed to submit booking.",
    });
  }
});

// ================================
// Delete Booking + Send Cancellation Email
// ================================
app.delete("/api/book-hygiene/:id", async function (req, res) {
  try {
    const deleted = await Booking.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        message: "Booking not found",
      });
    }

    try {
      const info = await transporter.sendMail({
        from: process.env.GMAIL_USER,
        to: process.env.GMAIL_USER,
        subject: "CANCELLED: " + deleted.organization,
        text:
          "Booking Cancelled\n\n" +
          "Organization: " + (deleted.organization || "Not provided") + "\n" +
          "Workshop: " + (deleted.workshopType || "Not provided") + "\n" +
          "Contact Person: " + (deleted.contactPerson || "Not provided"),
      });

      console.log("Cancellation email accepted:", info.messageId);
    } catch (emailErr) {
      console.error("Cancellation email failed:", emailErr.message);
      console.error("Error code:", emailErr.code || "Unknown");

      return res.status(500).json({
        message: "Booking deleted, but cancellation email failed.",
      });
    }

    return res.json({
      message: "Booking deleted and notification sent.",
    });
  } catch (err) {
    console.error("Delete booking error:", err.message);

    return res.status(500).json({
      message: "Failed to delete booking.",
    });
  }
});

// ================================
// Start Server
// ================================
const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", function () {
  console.log("Server running on port " + PORT);
});
