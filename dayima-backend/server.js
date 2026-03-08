const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const nodemailer = require("nodemailer");
require("dotenv").config();

const app = express();

// Update CORS to ensure no trailing slash issues
app.use(cors({
    origin: ["https://lemonteamaomao.github.io", "http://127.0.0.1:5500"], // Added local testing
    credentials: true
}));
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected"))
    .catch((err) => console.error("❌ MongoDB Error:", err));

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

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS
    }
});

app.get("/", (req, res) => res.send("DaYiMa backend running"));

// GET all bookings
app.get("/api/bookings", async (req, res) => {
    try {
        const bookings = await Booking.find().sort({ createdAt: -1 });
        res.json(bookings);
    } catch (err) {
        res.status(500).json({ message: "Load failed" });
    }
});

// POST new booking
app.post("/api/book-hygiene", async (req, res) => {
    try {
        const booking = new Booking(req.body);
        await booking.save();

        transporter.sendMail({
            from: `"DaYiMa" <${process.env.GMAIL_USER}>`,
            to: process.env.GMAIL_USER,
            subject: `New Workshop - ${req.body.organization}`,
            html: `<h3>New Request</h3><p>${JSON.stringify(req.body)}</p>`
        }).catch(e => console.log("Mail error ignored"));

        res.status(201).json({ message: "Saved!" });
    } catch (err) {
        res.status(500).json({ message: "Save failed" });
    }
});

// DELETE booking
app.delete("/api/book-hygiene/:id", async (req, res) => {
    try {
        await Booking.findByIdAndDelete(req.params.id);
        res.json({ message: "Deleted" });
    } catch (err) {
        res.status(500).json({ message: "Delete failed" });
    }
});

const PORT = process.env.PORT || 3000;
// Using 0.0.0.0 is best practice for Docker/Render environments
app.listen(PORT, "0.0.0.0", () => console.log(`🚀 Server on port ${PORT}`));
