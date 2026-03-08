const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const nodemailer = require("nodemailer");
require("dotenv").config();

const app = express();

/* ---------------- CORS ---------------- */
app.use(cors({
  origin: "https://lemonteamaomao.github.io", // your frontend URL
  credentials: true
}));
app.use(express.json());

/* ---------------- MongoDB ---------------- */
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Error:", err));

/* ---------------- Schema ---------------- */
const bookingSchema = new mongoose.Schema({
  workshopType: String,
  organization: String,
  contactPerson: String,
  email: String,
  phone: String,
  participants: Number,
  preferredDate: String,
  message: String,
  createdAt: { type: Date, default: Date.now }
});
const Booking = mongoose.model("Booking", bookingSchema);

/* ---------------- Email ---------------- */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  }
});

/* ---------------- Routes ---------------- */
app.get("/", (req, res) => res.send("DaYiMa backend running"));

app.get("/api/bookings", async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 });
    res.json(bookings);
  } catch {
    res.status(500).json({ message: "Could not load bookings" });
  }
});

app.post("/api/book-hygiene", async (req, res) => {
  try {
    const booking = new Booking(req.body);
    await booking.save();

    // Send email (non-blocking)
    transporter.sendMail({
      from: `"DaYiMa Booking" <${process.env.GMAIL_USER}>`,
      to: process.env.GMAIL_USER,
      subject: `New Workshop Booking - ${req.body.workshopType}`,
      html: `<p>New booking from ${req.body.organization}</p>`
    }, (err) => {
      if (err) console.error("❌ Email failed:", err);
    });

    res.status(201).json({ message: "Booking submitted!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Booking failed" });
  }
});

app.delete("/api/book-hygiene/:id", async (req, res) => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    res.json({ message: "Booking deleted" });
  } catch {
    res.status(500).json({ message: "Delete failed" });
  }
});

/* ---------------- Start Server ---------------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
