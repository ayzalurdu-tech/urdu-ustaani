/* ============================================
   SCRIPT.JS
   1. Mobile nav toggle
   2. WhatsApp button on every page
   3. Booking form → validates → redirects to Lemon Squeezy payment
   4. Contact form submission
   ============================================ */

/* -----------------------------------------------------------
   YOUR SETTINGS — change these 3 things only
   ----------------------------------------------------------- */
const WHATSAPP_NUMBER = "923156073848";
const WHATSAPP_MESSAGE = "Hello, I would like to learn Urdu and book a trial lesson.";

// Your backend URL — change this when you deploy on Render
const BACKEND_URL = "http://localhost:3000";

// Lemon Squeezy checkout links
const LEMON_SQUEEZY_LINKS = {
  "25 Minutes": "https://urduustaani.lemonsqueezy.com/checkout/buy/2ab3938c-18c4-4f56-b693-e7921b724b05?discount=0",
  "5 Lessons":  "https://urduustaani.lemonsqueezy.com/checkout/buy/b72bdaec-78e3-4049-bd93-1a27824b4360?discount=0",
  "10 Lessons": "https://urduustaani.lemonsqueezy.com/checkout/buy/684d1969-f027-4b24-8adb-d09929038539?discount=0",
  "20 Lessons": "https://urduustaani.lemonsqueezy.com/checkout/buy/b362f446-a16c-4c2e-91f0-1237df5570ed?discount=0",
};

/* -----------------------------------------------------------
   WhatsApp floating button (appears on every page)
   ----------------------------------------------------------- */
function injectWhatsAppButton() {
  if (document.querySelector('.whatsapp-float')) return;

  const link = document.createElement("a");
  link.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;
  link.className = "whatsapp-float";
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.setAttribute("aria-label", "Message us on WhatsApp");
  link.innerHTML = "&#128222;";
  document.body.appendChild(link);
}

/* -----------------------------------------------------------
   Mobile nav toggle
   ----------------------------------------------------------- */
function setupMobileNav() {
  const toggleBtn = document.querySelector(".nav-toggle");
  const navLinks = document.querySelector(".nav-links");
  if (!toggleBtn || !navLinks) return;

  toggleBtn.addEventListener("click", () => {
    navLinks.classList.toggle("open");
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest('.nav-wrapper')) {
      navLinks.classList.remove("open");
    }
  });
}

/* -----------------------------------------------------------
   Highlight active nav link
   ----------------------------------------------------------- */
function highlightActiveNavLink() {
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-links a").forEach((link) => {
    if (link.getAttribute("href") === currentPage) {
      link.classList.add("active");
    }
  });
}

/* ============================================
   BOOKING FORM
   How it works:
   1. Student fills in the form
   2. We validate all fields
   3. Instead of submitting to backend directly,
      we redirect to Lemon Squeezy with their
      details passed as custom data
   4. After payment, Lemon Squeezy calls our
      backend webhook automatically
   ============================================ */
function setupBookingForm() {
  const form = document.getElementById("booking-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearErrors(form);

    const bookingTypeEl = form.querySelector('input[name="bookingType"]:checked');

    const data = {
      fullName: form.fullName.value.trim(),
      email: form.email.value.trim(),
      whatsapp: form.whatsapp.value.trim(),
      country: form.country.value.trim(),
      timezone: form.timezone.value.trim(),
      age: form.age.value.trim(),
      urduLevel: form.urduLevel.value,
      learningPurpose: form.learningPurpose.value,
      bookingType: bookingTypeEl ? bookingTypeEl.value : '',
      priceAgreement: form.priceAgreement.checked,
    };

    // Validate form
    const errors = validateBookingForm(data);
    if (Object.keys(errors).length > 0) {
      showErrors(form, errors);
      return;
    }

    const submitBtn = form.querySelector(".submit-btn");
    submitBtn.disabled = true;
    submitBtn.textContent = "Redirecting to payment...";

    try {
      // Pick the right Lemon Squeezy link based on what was selected
      const checkoutBase = LEMON_SQUEEZY_LINKS[data.bookingType];

      if (!checkoutBase) {
        alert("Please select what you would like to book.");
        submitBtn.disabled = false;
        submitBtn.textContent = "Proceed to Payment";
        return;
      }

      // Pass student details to Lemon Squeezy as custom data
      // These come back to our webhook after payment is complete
      const checkoutUrl = new URL(checkoutBase);
      checkoutUrl.searchParams.set("checkout[email]", data.email);
      checkoutUrl.searchParams.set("checkout[name]", data.fullName);
      checkoutUrl.searchParams.set("checkout[custom][whatsapp]", data.whatsapp);
      checkoutUrl.searchParams.set("checkout[custom][country]", data.country);
      checkoutUrl.searchParams.set("checkout[custom][timezone]", data.timezone);
      checkoutUrl.searchParams.set("checkout[custom][age]", data.age);
      checkoutUrl.searchParams.set("checkout[custom][urduLevel]", data.urduLevel);
      checkoutUrl.searchParams.set("checkout[custom][learningPurpose]", data.learningPurpose);
      checkoutUrl.searchParams.set("checkout[custom][bookingType]", data.bookingType);

      // After payment, Lemon Squeezy can redirect the student back here,
      // with their name/email attached so Calendly (Step 2) can pre-fill them
      const returnUrl = new URL(window.location.href);
      returnUrl.searchParams.set("name", data.fullName);
      returnUrl.searchParams.set("email", data.email);
      checkoutUrl.searchParams.set("checkout[redirect_url]", returnUrl.toString());

      // Redirect to Lemon Squeezy checkout
      window.location.href = checkoutUrl.toString();

    } catch (err) {
      alert("Something went wrong. Please try again or message us on WhatsApp.");
      console.error(err);
      submitBtn.disabled = false;
      submitBtn.textContent = "Proceed to Payment";
    }
  });
}

/* -----------------------------------------------------------
   Booking form validation
   ----------------------------------------------------------- */
function validateBookingForm(data) {
  const errors = {};
  if (!data.fullName || data.fullName.length < 2) errors.fullName = "Please enter your full name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = "Please enter a valid email.";
  if (!data.whatsapp || data.whatsapp.length < 7) errors.whatsapp = "Please enter a valid WhatsApp number.";
  if (!data.country) errors.country = "Please enter your country.";
  if (!data.timezone) errors.timezone = "Please enter your time zone.";
  if (!data.age || Number(data.age) < 5 || Number(data.age) > 100) errors.age = "Please enter a valid age.";
  if (!data.urduLevel) errors.urduLevel = "Please select your current Urdu level.";
  if (!data.learningPurpose) errors.learningPurpose = "Please select your learning purpose.";
  if (!data.bookingType) errors.bookingType = "Please select what you would like to book.";
  if (!data.priceAgreement) errors.priceAgreement = "You must agree to the lesson pricing to continue.";
  return errors;
}

function showErrors(form, errors) {
  Object.keys(errors).forEach((field) => {
    const group = form.querySelector(`[data-field="${field}"]`);
    if (!group) return;
    group.classList.add("has-error");
    const errorEl = group.querySelector(".error-text");
    if (errorEl) {
      errorEl.textContent = errors[field];
      errorEl.classList.add("show");
    }
  });
}

function clearErrors(form) {
  form.querySelectorAll(".form-group").forEach((group) => {
    group.classList.remove("has-error");
    const errorEl = group.querySelector(".error-text");
    if (errorEl) errorEl.classList.remove("show");
  });
}

/* ============================================
   CONTACT FORM
   ============================================ */
function setupContactForm() {
  const form = document.getElementById("contact-form");
  if (!form) return;

  const successBox = document.getElementById("contact-success");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearErrors(form);

    const data = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      message: form.message.value.trim(),
    };

    const errors = {};
    if (!data.name) errors.name = "Please enter your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = "Please enter a valid email.";
    if (!data.message || data.message.length < 10) errors.message = "Please write a short message (10+ characters).";

    if (Object.keys(errors).length > 0) {
      showErrors(form, errors);
      return;
    }

    const submitBtn = form.querySelector("button[type='submit']");
    submitBtn.disabled = true;
    submitBtn.textContent = "Sending...";

    try {
      const response = await fetch(`${BACKEND_URL}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Server error");

      form.reset();
      form.style.display = "none";
      if (successBox) successBox.classList.add("show");
    } catch (err) {
      alert("Something went wrong sending your message. Please try WhatsApp instead.");
      console.error(err);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Send Message";
    }
  });
}

/* -----------------------------------------------------------
   WhatsApp link on contact page
   ----------------------------------------------------------- */
function setupContactWhatsApp() {
  const link = document.getElementById("contact-whatsapp-link");
  if (link) {
    link.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;
    link.target = "_blank";
  }
}

/* ============================================
   CALENDLY PREFILL
   If the student is returning from a successful Lemon Squeezy
   payment (we pass ?name= & ?email= in the redirect_url),
   pre-fill the Calendly widget with their name/email and
   scroll them straight to Step 2.
   ============================================ */
function setupCalendlyPrefill() {
  const calendlyWidget = document.querySelector(".calendly-inline-widget");
  if (!calendlyWidget) return;

  const params = new URLSearchParams(window.location.search);
  const name = params.get("name");
  const email = params.get("email");

  if (name || email) {
    const baseUrl = calendlyWidget.getAttribute("data-url");
    const url = new URL(baseUrl);
    if (name) url.searchParams.set("name", name);
    if (email) url.searchParams.set("email", email);
    calendlyWidget.setAttribute("data-url", url.toString());

    // Let the student know their booking was received, then scroll to Calendly
    const successBox = document.getElementById("booking-success");
    if (successBox) successBox.classList.add("show");
    calendlyWidget.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

/* Run everything on page load */
document.addEventListener("DOMContentLoaded", () => {
  injectWhatsAppButton();
  setupMobileNav();
  highlightActiveNavLink();
  setupBookingForm();
  setupContactForm();
  setupContactWhatsApp();
  setupCalendlyPrefill();
});
