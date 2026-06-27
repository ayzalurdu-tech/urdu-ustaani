/* ============================================
   SERVER.JS
   Routes:
     POST /api/bookings        - saves a booking + sends emails
     POST /api/contact         - saves a contact message + sends email
     POST /api/payments/webhook - Lemon Squeezy payment confirmation
   ============================================ */

const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const crypto = require("crypto");

const config = require("./config");
const db = require("./database");
const emailService = require("./emailservice");

const app = express();

/* -----------------------------------------------------------
   SECURITY MIDDLEWARE
   ----------------------------------------------------------- */

app.use(
  cors({
    origin: config.frontendUrl,
    methods: ["POST", "GET"],
  })
);

// IMPORTANT: Lemon Squeezy webhook needs raw body to verify signature
// So we apply JSON parsing AFTER the webhook route
app.use("/api/payments/webhook", express.raw({ type: "application/json" }));
app.use(express.json({ limit: "10kb" }));

const formLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Too many requests. Please try again later." },
});

/* -----------------------------------------------------------
   VALIDATION HELPERS
   ----------------------------------------------------------- */

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function sanitizeText(value, maxLength = 200) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function validateBookingInput(body) {
  const errors = [];

  const fullName = sanitizeText(body.fullName, 100);
  const email = sanitizeText(body.email, 150);
  const whatsapp = sanitizeText(body.whatsapp, 30);
  const country = sanitizeText(body.country, 100);
  const timezone = sanitizeText(body.timezone, 50);
  const age = Number(body.age);
  const urduLevel = sanitizeText(body.urduLevel, 50);
  const learningPurpose = sanitizeText(body.learningPurpose, 50);
  const trialType = sanitizeText(body.trialType, 50);
  const priceAgreement = body.priceAgreement === true;
  const bookingType = sanitizeText(body.bookingType, 50);

  if (fullName.length < 2) errors.push("Full name is required.");
  if (!isValidEmail(email)) errors.push("A valid email is required.");
  if (whatsapp.length < 7) errors.push("A valid WhatsApp number is required.");
  if (country.length < 2) errors.push("Country is required.");
  if (timezone.length < 1) errors.push("Time zone is required.");
  if (!Number.isInteger(age) || age < 5 || age > 100) errors.push("A valid age is required.");
  if (!["Complete Beginner", "Beginner", "Intermediate", "Advanced"].includes(urduLevel))
    errors.push("A valid Urdu level is required.");
  if (!["Family", "Travel", "Work", "Reading", "Speaking", "Other"].includes(learningPurpose))
    errors.push("A valid learning purpose is required.");
  if (!["25 Minutes", "5 Lessons", "10 Lessons", "20 Lessons"].includes(bookingType))
    errors.push("A valid booking type is required.");
  if (priceAgreement !== true) errors.push("You must agree to the lesson pricing.");

  return {
    errors,
    cleanData: {
      fullName, email, whatsapp, country, timezone, age,
      urduLevel, learningPurpose, bookingType, priceAgreement,
    },
  };
}

function validateContactInput(body) {
  const errors = [];
  const name = sanitizeText(body.name, 100);
  const email = sanitizeText(body.email, 150);
  const message = sanitizeText(body.message, 2000);

  if (name.length < 1) errors.push("Name is required.");
  if (!isValidEmail(email)) errors.push("A valid email is required.");
  if (message.length < 10) errors.push("Message must be at least 10 characters.");

  return { errors, cleanData: { name, email, message } };
}

/* -----------------------------------------------------------
   ROUTE: POST /api/bookings
   ----------------------------------------------------------- */
app.post("/api/bookings", formLimiter, async (req, res) => {
  const { errors, cleanData } = validateBookingInput(req.body);

  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join(" ") });
  }

  try {
    const studentId = await db.findOrCreateStudent(cleanData);
    await db.saveBooking(studentId, cleanData);

    try {
      await emailService.sendBookingNotificationToTutor(cleanData);
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
    }

    res.status(201).json({ message: "Booking received successfully." });
  } catch (err) {
    console.error("Booking save failed:", err);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

/* -----------------------------------------------------------
   ROUTE: POST /api/contact
   ----------------------------------------------------------- */
app.post("/api/contact", formLimiter, async (req, res) => {
  const { errors, cleanData } = validateContactInput(req.body);

  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join(" ") });
  }

  try {
    await db.saveContactMessage(cleanData);

    try {
      await emailService.sendContactMessageToTutor(cleanData);
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
    }

    res.status(201).json({ message: "Message sent successfully." });
  } catch (err) {
    console.error("Contact save failed:", err);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

/* -----------------------------------------------------------
   ROUTE: POST /api/payments/webhook
   Called automatically by Lemon Squeezy when a payment is made.
   Verifies the payment is real, then saves the booking.
   ----------------------------------------------------------- */
app.post("/api/payments/webhook", async (req, res) => {
  const secret = config.lemonSqueezyWebhookSecret;
  const signature = req.headers["x-signature"];

  // 1. Verify the webhook is genuinely from Lemon Squeezy
  const hmac = crypto.createHmac("sha256", secret);
  const digest = hmac.update(req.body).digest("hex");

  if (digest !== signature) {
    console.error("❌ Invalid Lemon Squeezy webhook signature");
    return res.status(401).json({ error: "Invalid signature" });
  }

  // 2. Parse the payload
  let payload;
  try {
    payload = JSON.parse(req.body.toString());
  } catch (err) {
    return res.status(400).json({ error: "Invalid JSON payload" });
  }

  const eventName = payload.meta?.event_name;
  console.log("✅ Lemon Squeezy webhook received:", eventName);

  // 3. Only process successful payments
  if (eventName !== "order_created") {
    return res.status(200).json({ message: "Event ignored" });
  }

  try {
    const order = payload.data?.attributes;
    const customerEmail = order?.user_email || "";
    const customerName = order?.user_name || "Student";

    // 4. Extract custom fields that you pass from your booking form
    // (We set these up in the Lemon Squeezy checkout URL — see booking.html)
    const customData = payload.meta?.custom_data || {};
    const whatsapp = customData.whatsapp || "";
    const country = customData.country || "";
    const timezone = customData.timezone || "";
    const age = Number(customData.age) || 18;
    const urduLevel = customData.urduLevel || "Beginner";
    const learningPurpose = customData.learningPurpose || "Other";
    const bookingType = customData.bookingType || "25 Minutes";
    const numberOfLessons = customData.numberOfLessons || "";
    const productName = order?.first_order_item?.product_name || bookingType;

    // 5. Save student and booking to Supabase
    const studentData = {
      fullName: customerName,
      email: customerEmail,
      whatsapp,
      country,
      timezone,
      age,
      urduLevel,
      learningPurpose,
      bookingType,
      trialType: productName,
      numberOfLessons,
      priceAgreement: true,
    };

    const studentId = await db.findOrCreateStudent(studentData);
    await db.saveBooking(studentId, { ...studentData, paymentStatus: "paid" });

    // 6. Notify tutor by email
    try {
      await emailService.sendPaymentNotificationToTutor(studentData, order);
      await emailService.sendPaymentConfirmationToStudent(studentData);
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
    }

    console.log(`✅ Payment booking saved for ${customerEmail}`);
    res.status(200).json({ message: "Webhook processed successfully" });

  } catch (err) {
    console.error("Webhook processing failed:", err);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

/* -----------------------------------------------------------
   Health check
   ----------------------------------------------------------- */
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

/* -----------------------------------------------------------
   START SERVER
   ----------------------------------------------------------- */
app.listen(config.port, () => {
  console.log(`✅ Server running on http://localhost:${config.port}`);
});
