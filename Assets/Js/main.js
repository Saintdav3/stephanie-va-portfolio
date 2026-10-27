/* Stephanie — Virtual Assistant portfolio
   Small, dependency-free enhancements. The page works without this file;
   these add the mobile menu, section highlighting, lightbox and form. */
(function () {
  "use strict";

  // Built at runtime so the address never appears as plain text for scrapers.
  var CONTACT_EMAIL = ["stephaniechuks05", "gmail.com"].join("@");
  var FORM_ENDPOINT = "https://formsubmit.co/ajax/" + CONTACT_EMAIL;

  /* "Email me directly" button: fill in the mailto link ------------------ */
  function initEmailLink() {
    document.querySelectorAll("[data-email-link]").forEach(function (link) {
      link.href = "mailto:" + CONTACT_EMAIL + "?subject=Virtual%20assistance%20enquiry";
    });
  }

  /* Header shadow once the page has scrolled ----------------------------- */
  function initHeader() {
    var header = document.querySelector(".site-header");
    if (!header) return;

    var update = function () {
      header.classList.toggle("is-scrolled", window.scrollY > 8);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
  }

  /* Mobile navigation ---------------------------------------------------- */
  function initNav() {
    var toggle = document.querySelector(".nav__toggle");
    var menu = document.getElementById("nav-menu");
    if (!toggle || !menu) return;

    var mobileQuery = window.matchMedia("(max-width: 860px)");

    var setOpen = function (open) {
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      menu.classList.toggle("is-open", open);
    };

    toggle.addEventListener("click", function () {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });

    menu.addEventListener("click", function (event) {
      if (event.target.closest("a")) setOpen(false);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && menu.classList.contains("is-open")) {
        setOpen(false);
        toggle.focus();
      }
    });

    document.addEventListener("click", function (event) {
      if (menu.classList.contains("is-open") && !event.target.closest(".nav")) {
        setOpen(false);
      }
    });

    mobileQuery.addEventListener("change", function () {
      setOpen(false);
    });
  }

  /* Highlight the nav link for the section in view ----------------------- */
  function initActiveLinks() {
    var links = document.querySelectorAll(".nav__links a[href^='#']");
    if (!links.length || !("IntersectionObserver" in window)) return;

    var byId = {};
    links.forEach(function (link) {
      byId[link.getAttribute("href").slice(1)] = link;
    });

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          links.forEach(function (link) {
            link.classList.remove("is-active");
            link.removeAttribute("aria-current");
          });
          var active = byId[entry.target.id];
          if (active) {
            active.classList.add("is-active");
            active.setAttribute("aria-current", "true");
          }
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );

    document.querySelectorAll("main section[id]").forEach(function (section) {
      observer.observe(section);
    });
  }

  /* Gentle fade-and-rise as content scrolls into view -------------------- */
  // Only hides content once we know it can be revealed again: skipped when
  // the visitor prefers reduced motion or the browser lacks the observer.
  function initReveal() {
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion || !("IntersectionObserver" in window)) return;

    var selectors = [
      ".hero__copy > *",
      ".hero__visual",
      ".section-head",
      ".services__intro",
      ".service",
      ".about__body",
      ".facts",
      ".case__media",
      ".case__body",
      ".sample",
      ".cred",
      ".education",
      ".work__note",
      ".contact__intro",
      ".form"
    ];
    var items = document.querySelectorAll(selectors.join(","));
    if (!items.length) return;

    // Siblings that appear together (a row of cards, the hero lines) arrive
    // one after another rather than all at once.
    var perParent = new Map();
    items.forEach(function (el) {
      var index = perParent.get(el.parentElement) || 0;
      perParent.set(el.parentElement, index + 1);
      el.style.setProperty("--reveal-delay", Math.min(index, 4) * 90 + "ms");
      el.classList.add("reveal");
    });
    document.documentElement.classList.add("has-reveal");

    var pending = new Set(items);
    var show = function (el) {
      if (!pending.has(el)) return;
      pending.delete(el);
      el.classList.add("is-visible");
      observer.unobserve(el);
    };

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) show(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
    );
    items.forEach(function (el) {
      observer.observe(el);
    });

    // Safety net for fast flick-scrolling or jumping to a section: anything
    // that is on screen or already scrolled past is revealed, never skipped.
    var ticking = false;
    var catchUp = function () {
      ticking = false;
      var limit = window.innerHeight * 0.95;
      pending.forEach(function (el) {
        if (el.getBoundingClientRect().top < limit) show(el);
      });
      if (!pending.size) window.removeEventListener("scroll", onScroll);
    };
    var onScroll = function () {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(catchUp);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("load", catchUp);
  }

  /* Work-sample lightbox ------------------------------------------------- */
  function initLightbox() {
    var dialog = document.getElementById("lightbox");
    if (!dialog || typeof dialog.showModal !== "function") return;

    var img = dialog.querySelector("img");
    var title = dialog.querySelector(".lightbox__title");
    var lastTrigger = null;

    document.querySelectorAll("[data-lightbox]").forEach(function (trigger) {
      trigger.addEventListener("click", function () {
        lastTrigger = trigger;
        img.src = trigger.getAttribute("data-lightbox");
        img.alt = trigger.querySelector("img").alt;
        title.textContent = trigger.getAttribute("data-title") || "";
        dialog.showModal();
      });
    });

    dialog.querySelector(".lightbox__close").addEventListener("click", function () {
      dialog.close();
    });

    // A click on the backdrop lands on the <dialog> element itself.
    dialog.addEventListener("click", function (event) {
      if (event.target === dialog) dialog.close();
    });

    dialog.addEventListener("close", function () {
      img.removeAttribute("src");
      if (lastTrigger) lastTrigger.focus();
    });
  }

  /* Contact form: validate, then send to Stephanie's inbox via FormSubmit -- */
  function initForm() {
    var form = document.getElementById("contact-form");
    if (!form) return;

    var status = document.getElementById("form-status");
    var submit = form.querySelector("button[type=submit]");
    var submitLabel = submit.querySelector(".btn__label");
    var fields = {
      name: form.elements.name,
      email: form.elements.email,
      service: form.elements.service,
      message: form.elements.message
    };

    var messages = {
      name: { valueMissing: "Please tell me your name." },
      email: {
        valueMissing: "Please add your email so I can reply.",
        typeMismatch: "That email doesn't look right. Check for a typo, e.g. name@company.com."
      },
      message: {
        valueMissing: "A sentence or two about what you need is enough.",
        tooShort: "Could you add a little more detail? At least 10 characters."
      }
    };

    var errorFor = function (field) {
      var rules = messages[field.name];
      if (!rules) return "";
      if (field.validity.valueMissing || !field.value.trim()) return rules.valueMissing || "";
      if (field.validity.typeMismatch) return rules.typeMismatch || "";
      if (field.validity.tooShort) return rules.tooShort || "";
      return "";
    };

    var showError = function (field) {
      var error = errorFor(field);
      var slot = document.getElementById(field.id + "-error");
      if (slot) slot.textContent = error;
      if (error) {
        field.setAttribute("aria-invalid", "true");
      } else {
        field.removeAttribute("aria-invalid");
      }
      return !error;
    };

    // Validate on blur, then re-check while typing once a field has an error.
    Object.keys(fields).forEach(function (key) {
      var field = fields[key];
      field.addEventListener("blur", function () {
        if (field.value) showError(field);
      });
      field.addEventListener("input", function () {
        if (field.getAttribute("aria-invalid") === "true") showError(field);
      });
    });

    var setStatus = function (message, isError) {
      status.textContent = message;
      status.classList.toggle("is-error", Boolean(isError));
    };

    var setSending = function (sending) {
      submit.disabled = sending;
      submit.setAttribute("aria-busy", String(sending));
      submitLabel.textContent = sending ? "Sending…" : "Send message";
    };

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      setStatus("");

      var firstInvalid = null;
      ["name", "email", "message"].forEach(function (key) {
        if (!showError(fields[key]) && !firstInvalid) firstInvalid = fields[key];
      });
      if (firstInvalid) {
        firstInvalid.focus();
        return;
      }

      var name = fields.name.value.trim();
      var service = fields.service.value;
      var payload = {
        name: name,
        email: fields.email.value.trim(),
        "needs help with": service || "Not sure yet",
        message: fields.message.value.trim(),
        _subject: "Portfolio enquiry from " + name + (service ? " — " + service : ""),
        _template: "table",
        _honey: form.elements._honey.value
      };

      setSending(true);
      fetch(FORM_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload)
      })
        .then(function (response) {
          return response.json().then(function (data) {
            // FormSubmit returns success as the string "true" or a boolean.
            if (!response.ok || String(data.success) !== "true") {
              throw new Error(data.message || "Request failed");
            }
          });
        })
        .then(function () {
          form.reset();
          setStatus("Thank you, " + name + "! Your message has been sent. Stephanie will reply to you by email.");
        })
        .catch(function () {
          setStatus(
            "Sorry, your message couldn't be sent right now. Please check your connection and try again in a moment.",
            true
          );
        })
        .then(function () {
          setSending(false);
        });
    });
  }

  initEmailLink();
  initHeader();
  initNav();
  initActiveLinks();
  initReveal();
  initLightbox();
  initForm();
})();
