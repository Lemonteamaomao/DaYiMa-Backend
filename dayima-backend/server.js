
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

app.use(
  cors({
    origin: "https://lemonteamaomao.github.io",
    credentials: true,
  })
);

app.use(express.json());

// Database
mongoose
  .connect(process.env.MONGO_URI)
  .then(function () {
    console.log("MongoDB Connected");
  })
  .catch(function (err) {
    console.error("DB Error:", err.message);
  });

// Booking schema
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

// Send email using Google Apps Script
async function sendGmailNotification(subject, body) {
  const scriptUrl = process.env.GMAIL_SCRIPT_URL;
  const token = process.env.GMAIL_SCRIPT_TOKEN;

  if (!scriptUrl || !token) {
    throw new Error("Gmail script environment variables are missing");
  }

  const response = await fetch(scriptUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      token: token,
      subject: subject,
      body: body,
    }),
    redirect: "follow",
  });

  const responseText = await response.text();

  let result;

  try {
    result = JSON.parse(responseText);
  } catch (err) {
    throw new Error(
      "Google Apps Script returned an unexpected response: " +
        responseText.substring(0, 200)
    );
  }

  if (!response.ok || !result.ok) {
    throw new Error(result.error || "Gmail notification failed");
  }

  console.log("Gmail notification sent successfully");
}

// Get all bookings
app.get("/api/book-hygiene", async function (req, res) {
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 });
    return res.json(bookings);
  } catch (err) {
    console.error("Fetch bookings error:", err.message);
    return res.status(500).json({
      message: "Failed to fetch bookings",
    });
  }
});

// Create booking and send notification
app.post("/api/book-hygiene", async function (req, res) {
  let booking;

  try {
    console.log("New booking request received");

    booking = new Booking(req.body);
    await booking.save();

    console.log("Booking saved:", booking._id.toString());
  } catch (err) {
    console.error("Booking save failed:", err.message);
    return res.status(500).json({
      message: "Failed to save booking.",
    });
  }

  try {
    await sendGmailNotification(
      "NEW " +
        (req.body.workshopType || "Booking") +
        ": " +
        (req.body.organization || "Unknown organization"),
      "New DaYiMa Booking Request\n\n" +
        "Workshop: " + (req.body.workshopType || "Not provided") + "\n" +
        "Organization: " + (req.body.organization || "Not provided") + "\n" +
        "Contact Person: " + (req.body.contactPerson || "Not provided") + "\n" +
        "Email: " + (req.body.email || "Not provided") + "\n" +
        "Phone: " + (req.body.phone || "Not provided") + "\n" +
        "Date: " + (req.body.date || "Not provided") + "\n" +
        "Participants: " + (req.body.participants ?? "Not provided") + "\n" +
        "Notes: " + (req.body.notes || "None")
    );
  } catch (emailErr) {
    console.error("Booking saved, but email failed:", emailErr.message);
  }

  return res.status(201).json({
    message: "Booking submitted successfully.",
  });
});

// Delete booking and send cancellation notification
app.delete("/api/book-hygiene/:id", async function (req, res) {
  let deleted;

  try {
    deleted = await Booking.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        message: "Booking not found",
      });
    }
  } catch (err) {
    console.error("Delete booking error:", err.message);
    return res.status(500).json({
      message: "Failed to delete booking.",
    });
  }

  try {
    await sendGmailNotification(
      "CANCELLED: " + (deleted.organization || "Booking"),
      "Booking Cancelled\n\n" +
        "Organization: " + (deleted.organization || "Not provided") + "\n" +
        "Workshop: " + (deleted.workshopType || "Not provided") + "\n" +
        "Contact Person: " + (deleted.contactPerson || "Not provided")
    );
  } catch (emailErr) {
    console.error("Booking deleted, but cancellation email failed:", emailErr.message);
  }

  return res.json({
    message: "Booking deleted successfully.",
  });
});

// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", function () {
  console.log("Server running on port " + PORT);
});
