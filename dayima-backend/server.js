require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const nodemailer = require("nodemailer");

const app = express();

app.use(cors({
    origin: "https://lemonteamaomao.github.io",
    credentials: true
}));
app.use(express.json());

// Database
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ DB Error:", err));

// Schema
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

// Mail Setup (Secure)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

// Routes
app.get("/api/book-hygiene", async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: "Error" });
  }
});

app.post("/api/book-hygiene", async (req, res) => {
  try {
    const booking = new Booking(req.body);
    await booking.save();
    
    // Admin Notification
    transporter.sendMail({
      from: `"DaYiMa" <${process.env.GMAIL_USER}>`,
      to: process.env.GMAIL_USER,
      subject: `🌸 NEW ${req.body.workshopType}: ${req.body.organization}`,
      html: `<p>New request from <b>${req.body.organization}</b> received.</p>`
    });

    res.status(201).json({ message: "Success" });
  } catch (err) {
    res.status(500).json({ message: "Error" });
  }
});

app.delete("/api/book-hygiene/:id", async (req, res) => {
  try {
    const deleted = await Booking.findByIdAndDelete(req.params.id);
    if (deleted) {
      transporter.sendMail({
        from: `"DaYiMa" <${process.env.GMAIL_USER}>`,
        to: process.env.GMAIL_USER,
        subject: `🛑 CANCELLED: ${deleted.organization}`,
        html: `<p>Booking for ${deleted.organization} removed.</p>`
      });
    }
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: "Error" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => console.log(`🚀 Port ${PORT}`));
