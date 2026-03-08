require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const nodemailer = require("nodemailer");

const app = express();

// ----------------------
// 1. CORS Configuration
// ----------------------
app.use(cors({
  origin: "https://lemonteamaomao.github.io", // frontend domain
  credentials: true,
}));

app.use(express.json());

// ----------------------
// 2. Root Route
// ----------------------
app.get("/", (req, res) => {
  res.send("✅ DaYiMa backend is running!");
});

// ----------------------
// 3. Database Connection
// ----------------------
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ Connection Error:", err));

// ----------------------
// 4. Test MongoDB
// ----------------------
app.get("/test-db", async (req, res) => {
  try {
    await mongoose.connection.db.admin().ping();
    res.send("✅ MongoDB Connected!");
  } catch (err) {
    res.status(500).send("❌ MongoDB Connection Failed: " + err.message);
  }
});

// ----------------------
// 5. Booking Schema
// ----------------------
const bookingSchema = new mongoose.Schema({
  workshopType: String,
  organization: String,
  contactPerson: String,
  email: String,
  phone: String,
  date: String,
  participants: Number,
  notes: String,
  createdAt: { type: Date, default: Date.now },
});

const Booking = mongoose.model("Booking", bookingSchema);

// ----------------------
// 6. Email Setup
// ----------------------
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

// ----------------------
// 7. API Routes
// ----------------------

// Create booking
app.post("/api/book-hygiene", async (req, res) => {
  try {
    const newBooking = new Booking(req.body);
    await newBooking.save();

    // Send email
    try {
      const mailOptions = {
        from: `"DaYiMa Admin" <${process.env.GMAIL_USER}>`,
        to: process.env.GMAIL_USER,
        subject: `🌸 NEW ${req.body.workshopType} REQUEST: ${req.body.organization}`,
        html: `<div style="font-family: sans-serif; padding: 20px; border: 2px solid #FF2DA6; border-radius: 20px;">
          <h2 style="color: #FF2DA6;">New Booking Alert!</h2>
          <p><strong>Workshop:</strong> ${req.body.workshopType}</p>
          <p><strong>Organization:</strong> ${req.body.organization}</p>
          <p><strong>Contact:</strong> ${req.body.contactPerson}</p>
          <p><strong>Date:</strong> ${req.body.date}</p>
          <p><strong>Email:</strong> ${req.body.email}</p>
          <p><strong>Phone:</strong> ${req.body.phone}</p>
          <p><strong>Notes:</strong> ${req.body.notes || "None"}</p>
        </div>`,
      };
      const info = await transporter.sendMail(mailOptions);
      console.log("✅ Booking email sent:", info.response);
    } catch (err) {
      console.error("❌ Email failed:", err);
    }

    res.status(201).json({ message: `Success! ${req.body.workshopType} request sent.` });
  } catch (error) {
    console.error("❌ Error creating booking:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

// Get bookings
app.get("/api/book-hygiene", async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    console.error("❌ Error fetching bookings:", err);
    res.status(500).json({ message: "Could not load bookings" });
  }
});

// Delete booking
app.delete("/api/book-hygiene/:id", async (req, res) => {
  try {
    const bookingId = req.params.id;
    const bookingToDelete = await Booking.findById(bookingId);
    if (!bookingToDelete) return res.status(404).json({ message: "Booking not found" });

    // Send cancellation email
    try {
      const cancelMailOptions = {
        from: `"DaYiMa Admin" <${process.env.GMAIL_USER}>`,
        to: process.env.GMAIL_USER,
        subject: `🛑 CANCELLED: ${bookingToDelete.workshopType} - ${bookingToDelete.organization}`,
        html: `<div style="font-family: sans-serif; padding: 25px; border: 3px solid #AD46FF; border-radius: 30px; background-color: #F9F5FF;">
          <h2 style="color: #AD46FF;">Booking Removed</h2>
          <p><strong>Workshop:</strong> ${bookingToDelete.workshopType}</p>
          <p><strong>Organization:</strong> ${bookingToDelete.organization}</p>
          <p><strong>Contact:</strong> ${bookingToDelete.contactPerson}</p>
        </div>`,
      };
      const info = await transporter.sendMail(cancelMailOptions);
      console.log("✅ Cancellation email sent:", info.response);
    } catch (err) {
      console.error("❌ Cancellation email failed:", err);
    }

    await Booking.findByIdAndDelete(bookingId);
    res.json({ message: "Booking deleted and confirmation email sent!" });
  } catch (err) {
    console.error("❌ Error deleting booking:", err);
    res.status(500).json({ message: "Cancellation failed" });
  }
});

// ----------------------
// 8. Start Server
// ----------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on Port ${PORT}`));
