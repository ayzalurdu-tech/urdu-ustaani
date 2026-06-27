/* ============================================
   DATABASE.JS
   Connects to Supabase and saves data.
   ============================================ */

const { createClient } = require("@supabase/supabase-js");
const config = require("./config");

const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);

async function findOrCreateStudent(studentData) {
  const { fullName, email, whatsapp, country, timezone, age } = studentData;

  const { data: existing, error: findError } = await supabase
    .from("students")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (findError) throw findError;
  if (existing) {
    await supabase
      .from("students")
      .update({ full_name: fullName, whatsapp, country, timezone, age })
      .eq("id", existing.id);
    return existing.id;
  }

  const { data: created, error: insertError } = await supabase
    .from("students")
    .insert([{ full_name: fullName, email, whatsapp, country, timezone, age }])
    .select("id")
    .single();

  if (insertError) throw insertError;
  return created.id;
}

async function saveBooking(studentId, bookingData) {
  const { urduLevel, learningPurpose, bookingType, trialType, numberOfLessons, priceAgreement, paymentStatus } = bookingData;

  const { data, error } = await supabase
    .from("bookings")
    .insert([{
      student_id: studentId,
      urdu_level: urduLevel,
      learning_purpose: learningPurpose,
      trial_type: bookingType || trialType,
      number_of_lessons: numberOfLessons || null,
      price_agreement: priceAgreement,
      payment_status: paymentStatus || "unpaid",
      status: "pending",
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function saveContactMessage({ name, email, message }) {
  const { data, error } = await supabase
    .from("contact_messages")
    .insert([{ name, email, message }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

module.exports = { findOrCreateStudent, saveBooking, saveContactMessage };
