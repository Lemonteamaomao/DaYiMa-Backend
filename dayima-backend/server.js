require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const nodemailer = require("nodemailer");

const app = express();
app.use(cors());
app.use(express.json());

// 1. Database Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ Connection Error:", err));

// 2. Schema - CRITICAL: workshopType must be here to be saved!
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

// 3. Email Setup (Keeping your Gmail active)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "victoriakjx@gmail.com",
    pass: "glxvfkfpupdijjbt",
  },
});

// 4. API ROUTES
app.post("/api/book-hygiene", async (req, res) => {
  try {
    console.log("📥 NEW REQUEST FOR:", req.body.workshopType);

    const newBooking = new Booking(req.body);
    await newBooking.save();
    const mailOptions = {
      from: '"DaYiMa Admin" <victoriakjx@gmail.com>',
      to: "victoriakjx@gmail.com",
      subject: `🌸 NEW ${req.body.workshopType} REQUEST: ${req.body.organization}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 2px solid #FF2DA6; border-radius: 20px;">
          <h2 style="color: #FF2DA6;">New Booking Alert!</h2>
          <p><strong>Workshop:</strong> ${req.body.workshopType}</p>
          <p><strong>Organization:</strong> ${req.body.organization}</p>
          <p><strong>Contact:</strong> ${req.body.contactPerson}</p>
          <p><strong>Date:</strong> ${req.body.date}</p>
          <p><strong>Email:</strong> ${req.body.email}</p>
          <p><strong>Phone:</strong> ${req.body.phone}</p>
          <p><strong>Notes:</strong> ${req.body.notes || "None"}</p>
        </div>
      `,
    };

    transporter.sendMail(mailOptions);
    res
      .status(201)
      .json({ message: `Success! ${req.body.workshopType} request sent.` });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
});

app.get("/api/book-hygiene", async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 });
    console.log(`📡 Sending ${bookings.length} bookings to dashboard`);
    res.json(bookings);
  } catch (err) {
    console.error("❌ Failed to fetch bookings:", err);
    res.status(500).json({ message: "Could not load bookings" });
  }
});

// DELETE: Cancel Booking + FORCED Email Send
app.delete("/api/book-hygiene/:id", async (req, res) => {
  try {
    const bookingId = req.params.id;

    // 1. Get data BEFORE deleting
    const bookingToDelete = await Booking.findById(bookingId);

    if (!bookingToDelete) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // 2. Prepare the Email
    const cancelMailOptions = {
      from: '"DaYiMa Project System" <victoriakjx@gmail.com>',
      to: "victoriakjx@gmail.com",
      subject: `🛑 CANCELLED: ${bookingToDelete.workshopType} - ${bookingToDelete.organization}`,
      html: `
        <div style="font-family: sans-serif; padding: 25px; border: 3px solid #AD46FF; border-radius: 30px; background-color: #F9F5FF;">
          <h2 style="color: #AD46FF;">Booking Removed</h2>
          <p><strong>Workshop:</strong> ${bookingToDelete.workshopType}</p>
          <p><strong>Organization:</strong> ${bookingToDelete.organization}</p>
          <p><strong>Contact:</strong> ${bookingToDelete.contactPerson}</p>
        </div>
      `,
    };

    // 3. FORCE the server to wait for the email to send
    await new Promise((resolve, reject) => {
      transporter.sendMail(cancelMailOptions, (error, info) => {
        if (error) {
          console.log("❌ Email Error:", error);
          reject(error);
        } else {
          console.log("✅ Email Sent confirmed:", info.response);
          resolve(info);
        }
      });
    });

    // 4. ONLY delete after the email is sent successfully
    await Booking.findByIdAndDelete(bookingId);

    res.json({ message: "Booking deleted and confirmation email sent!" });
  } catch (err) {
    console.error("❌ Process Failed:", err);
    res.status(500).json({ message: "Cancellation failed" });
  }
});

app.listen(5000, () => console.log("🚀 Server running on Port 5000"));
