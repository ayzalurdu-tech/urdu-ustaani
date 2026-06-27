/* ============================================
   CONFIG.JS
   Loads secret keys from the .env file.
   ============================================ */

require("dotenv").config();

const config = {
  port: process.env.PORT || 3000,

  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY,

  resendApiKey: process.env.RESEND_API_KEY,
  tutorEmail: process.env.TUTOR_EMAIL,
  fromEmail: process.env.FROM_EMAIL,

  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5500",

  // Lemon Squeezy — get this from your LS dashboard → Settings → Webhooks
  lemonSqueezyWebhookSecret: process.env.LEMONSQUEEZY_WEBHOOK_SECRET,
};

const requiredKeys = [
  "supabaseUrl",
  "supabaseServiceKey",
  "resendApiKey",
  "tutorEmail",
  "fromEmail",
  "lemonSqueezyWebhookSecret",
];

const missingKeys = requiredKeys.filter((key) => !config[key]);

if (missingKeys.length > 0) {
  console.error(`❌ Missing required environment variables: ${missingKeys.join(", ")}`);
  process.exit(1);
}

module.exports = config;
