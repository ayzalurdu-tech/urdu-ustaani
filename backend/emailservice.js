/* ============================================
   EMAILSERVICE.JS
   Sends emails using Resend.
   ============================================ */

const { Resend } = require("resend");
const config = require("./config");

const resend = new Resend(config.resendApiKey);

/* -----------------------------------------------------------
   Email 1: Booking request (no payment)
   ----------------------------------------------------------- */
async function sendBookingNotificationToTutor(booking) {
  const { fullName, email, whatsapp, country, timezone, urduLevel, trialType, learningPurpose, numberOfLessons } = booking;

  await resend.emails.send({
    from: config.fromEmail,
    to: config.tutorEmail,
    subject: `New Booking Request: ${fullName}`,
    html: `
      <h2>New Trial Booking Request</h2>
      <table cellpadding="6" style="border-collapse:collapse;">
        <tr><td><strong>Name</strong></td><td>${escapeHtml(fullName)}</td></tr>
        <tr><td><strong>Email</strong></td><td>${escapeHtml(email)}</td></tr>
        <tr><td><strong>WhatsApp</strong></td><td>${escapeHtml(whatsapp)}</td></tr>
        <tr><td><strong>Country</strong></td><td>${escapeHtml(country)}</td></tr>
        <tr><td><strong>Time Zone</strong></td><td>${escapeHtml(timezone)}</td></tr>
        <tr><td><strong>Urdu Level</strong></td><td>${escapeHtml(urduLevel)}</td></tr>
        <tr><td><strong>Trial Type</strong></td><td>${escapeHtml(trialType)}</td></tr>
        <tr><td><strong>Learning Purpose</strong></td><td>${escapeHtml(learningPurpose)}</td></tr>
        <tr><td><strong>Lesson Package</strong></td><td>${escapeHtml(String(numberOfLessons))}</td></tr>
      </table>
    `,
  });
}

/* -----------------------------------------------------------
   Email 2: Payment confirmed — notify tutor
   ----------------------------------------------------------- */
async function sendPaymentNotificationToTutor(booking, order) {
  const { fullName, email, whatsapp, country, timezone, urduLevel, trialType } = booking;
  const amountPaid = order?.total_formatted || "N/A";

  await resend.emails.send({
    from: config.fromEmail,
    to: config.tutorEmail,
    subject: `💰 Payment Received: ${fullName}`,
    html: `
      <h2>✅ Payment Confirmed — New Paid Booking!</h2>
      <table cellpadding="6" style="border-collapse:collapse;">
        <tr><td><strong>Name</strong></td><td>${escapeHtml(fullName)}</td></tr>
        <tr><td><strong>Email</strong></td><td>${escapeHtml(email)}</td></tr>
        <tr><td><strong>WhatsApp</strong></td><td>${escapeHtml(whatsapp)}</td></tr>
        <tr><td><strong>Country</strong></td><td>${escapeHtml(country)}</td></tr>
        <tr><td><strong>Time Zone</strong></td><td>${escapeHtml(timezone)}</td></tr>
        <tr><td><strong>Urdu Level</strong></td><td>${escapeHtml(urduLevel)}</td></tr>
        <tr><td><strong>Lesson Type</strong></td><td>${escapeHtml(trialType)}</td></tr>
        <tr><td><strong>Amount Paid</strong></td><td>${escapeHtml(amountPaid)}</td></tr>
      </table>
      <p>This student has PAID. Please contact them to schedule the lesson.</p>
    `,
  });
}

/* -----------------------------------------------------------
   Email 3: Payment confirmed — confirm to student
   ----------------------------------------------------------- */
async function sendPaymentConfirmationToStudent(booking) {
  const { fullName, email, trialType } = booking;

  await resend.emails.send({
    from: config.fromEmail,
    to: email,
    subject: "Your Urdu Lesson Payment Confirmed! 🎉",
    html: `
      <h2>Thank you, ${escapeHtml(fullName)}! 🎉</h2>
      <p>Your payment for <strong>${escapeHtml(trialType)}</strong> has been confirmed.</p>
      <p>Here's what happens next:</p>
      <ul>
        <li>Your tutor will contact you within 24 hours via email or WhatsApp</li>
        <li>You'll agree on a time that works for both of you</li>
        <li>You'll receive a Zoom/Google Meet link before your lesson</li>
      </ul>
      <p>Looking forward to your first lesson!</p>
    `,
  });
}

/* -----------------------------------------------------------
   Email 4: Contact form message
   ----------------------------------------------------------- */
async function sendContactMessageToTutor({ name, email, message }) {
  await resend.emails.send({
    from: config.fromEmail,
    to: config.tutorEmail,
    subject: `New Contact Message from ${name}`,
    html: `
      <h2>New Contact Form Message</h2>
      <p><strong>Name:</strong> ${escapeHtml(name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p><strong>Message:</strong></p>
      <p>${escapeHtml(message)}</p>
    `,
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

module.exports = {
  sendBookingNotificationToTutor,
  sendPaymentNotificationToTutor,
  sendPaymentConfirmationToStudent,
  sendContactMessageToTutor,
};
