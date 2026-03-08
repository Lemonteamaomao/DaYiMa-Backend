const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const nodemailer = require("nodemailer");
require("dotenv").config();

const app = express();

/* ---------------- CORS ---------------- */
app.use(cors({
  origin: "https://lemonteamaomao.github.io",
  credentials: true
}));

app.use(express.json());

/* ---------------- MongoDB ---------------- */
mongoose
  .connect(process.env.MONGO_URI)
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

app.get("/", (req, res) => {
  res.send("DaYiMa backend running");
});

app.get("/test-db", async (req, res) => {
  const bookings = await Booking.find();
  res.json(bookings);
});

/* -------- Create Booking -------- */

app.post("/api/book-hygiene", async (req, res) => {
  try {

    const booking = new Booking(req.body);
    await booking.save();

    const mailOptions = {
      from: `"DaYiMa Booking" <${process.env.GMAIL_USER}>`,
      to: process.env.GMAIL_USER,
      subject: `New Workshop Booking - ${req.body.workshopType}`,
      html: `
      <div style="font-family:sans-serif;padding:25px;border:3px solid #AD46FF;border-radius:30px;background:#F9F5FF">
        <h2 style="color:#AD46FF">New Booking Request</h2>

        <p><strong>Workshop:</strong> ${req.body.workshopType}</p>
        <p><strong>Organization:</strong> ${req.body.organization}</p>
        <p><strong>Contact:</strong> ${req.body.contactPerson}</p>
        <p><strong>Email:</strong> ${req.body.email}</p>
        <p><strong>Phone:</strong> ${req.body.phone}</p>
        <p><strong>Participants:</strong> ${req.body.participants}</p>
        <p><strong>Date:</strong> ${req.body.preferredDate}</p>
        <p><strong>Message:</strong> ${req.body.message}</p>

      </div>
      `
    };

    /* EMAIL (non-blocking) */
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error("❌ Email failed:", err);
      } else {
        console.log("✅ Email sent:", info.response);
      }
    });

    res.status(201).json({ message: "Booking submitted!" });

  } catch (err) {
    console.error("❌ Booking error:", err);
    res.status(500).json({ message: "Booking failed" });
  }
});

/* -------- Get Bookings -------- */

app.get("/api/bookings", async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: "Could not load bookings" });
  }
});

/* -------- Delete Booking -------- */

app.delete("/api/book-hygiene/:id", async (req, res) => {
  try {

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    await Booking.findByIdAndDelete(req.params.id);

    /* EMAIL (non-blocking) */
    transporter.sendMail({
      from: `"DaYiMa Admin" <${process.env.GMAIL_USER}>`,
      to: process.env.GMAIL_USER,
      subject: `Booking Cancelled - ${booking.organization}`,
      html: `
      <div style="font-family:sans-serif;padding:25px;border:3px solid #AD46FF;border-radius:30px;background:#F9F5FF">
        <h2 style="color:#AD46FF">Booking Cancelled</h2>

        <p><strong>Workshop:</strong> ${booking.workshopType}</p>
        <p><strong>Organization:</strong> ${booking.organization}</p>
        <p><strong>Contact:</strong> ${booking.contactPerson}</p>

      </div>
      `
    }, (err, info) => {
      if (err) {
        console.error("❌ Cancel email failed:", err);
      } else {
        console.log("✅ Cancel email sent:", info.response);
      }
    });

    res.json({ message: "Booking deleted" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Delete failed" });
  }
});

/* ---------------- Server ---------------- */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
