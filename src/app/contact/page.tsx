"use client";

import { useState, useEffect } from "react";

export default function ContactPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [contactPhoto, setContactPhoto] = useState("/about/cover.png");

  useEffect(() => {
    fetch("/api/settings?key=contact_photo")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.value) setContactPhoto(data.value);
      })
      .catch(() => {});
  }, []);

  const isValid =
    firstName.trim() && lastName.trim() && email.trim() && message.trim();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    const subject = `Contact from ${firstName} ${lastName}`;
    const body = `Name: ${firstName} ${lastName}\nEmail: ${email}\n\n${message}`;
    const mailto = `mailto:info@lateedition.org?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-white pt-16 md:pt-20">
      <main className="container mx-auto px-4 py-16 max-w-6xl">
        {/* Header */}
        <div className="mb-16">
          <h1 className="text-4xl font-light tracking-tight mb-4">
            Contact Us
          </h1>
          <p className="text-sm text-black/60 font-light max-w-lg">
            Interested in working with us? Share your details and we&apos;ll
            reach out!
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-16 md:gap-20">
          {/* Form side */}
          <div className="flex-1 max-w-lg">
            {/* Email link */}
            <a
              href="mailto:info@lateedition.org"
              className="inline-block text-sm text-black underline decoration-black/30 underline-offset-4 hover:decoration-black/60 transition-colors mb-12"
            >
              info@lateedition.org
            </a>

            {submitted ? (
              <div className="py-12">
                <p className="text-lg font-light tracking-tight mb-2">
                  Thanks for reaching out.
                </p>
                <p className="text-sm text-black/60 font-light">
                  Your email client should have opened with a pre-filled
                  message. If it didn&apos;t, feel free to email us directly at{" "}
                  <a
                    href="mailto:info@lateedition.org"
                    className="underline decoration-black/30 underline-offset-4 hover:decoration-black/60 transition-colors"
                  >
                    info@lateedition.org
                  </a>
                  .
                </p>
                <button
                  onClick={() => {
                    setSubmitted(false);
                    setFirstName("");
                    setLastName("");
                    setEmail("");
                    setMessage("");
                  }}
                  className="mt-6 text-xs uppercase tracking-wider text-black/50 hover:text-black transition-colors cursor-pointer"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-8">
                {/* Name row */}
                <div className="flex flex-col sm:flex-row gap-6">
                  <div className="flex-1">
                    <label className="block text-[10px] uppercase tracking-[0.15em] text-black/50 font-medium mb-2">
                      First Name{" "}
                      <span className="text-black/30">(required)</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full border-b border-black/20 bg-transparent py-2 text-sm font-light text-black placeholder:text-black/25 focus:border-black focus:outline-none transition-colors"
                      placeholder="First Name"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] uppercase tracking-[0.15em] text-black/50 font-medium mb-2">
                      Last Name{" "}
                      <span className="text-black/30">(required)</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full border-b border-black/20 bg-transparent py-2 text-sm font-light text-black placeholder:text-black/25 focus:border-black focus:outline-none transition-colors"
                      placeholder="Last Name"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.15em] text-black/50 font-medium mb-2">
                    Email <span className="text-black/30">(required)</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border-b border-black/20 bg-transparent py-2 text-sm font-light text-black placeholder:text-black/25 focus:border-black focus:outline-none transition-colors"
                    placeholder="you@example.com"
                  />
                </div>

                {/* Message */}
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.15em] text-black/50 font-medium mb-2">
                    Message <span className="text-black/30">(required)</span>
                  </label>
                  <textarea
                    required
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full border-b border-black/20 bg-transparent py-2 text-sm font-light text-black placeholder:text-black/25 focus:border-black focus:outline-none transition-colors resize-none"
                    placeholder="Tell us what you have in mind..."
                  />
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={!isValid}
                  className="self-start px-10 py-3 border border-black text-[11px] uppercase tracking-[0.2em] font-medium text-black
                    hover:bg-black hover:text-white
                    active:scale-[0.98]
                    disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-black disabled:cursor-not-allowed
                    transition-all duration-200 ease-out cursor-pointer"
                >
                  Send
                </button>
              </form>
            )}
          </div>

          {/* Image side */}
          <div className="flex-1 max-w-lg">
            <div className="relative w-full aspect-[3/4] overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={contactPhoto}
                alt="Late Edition"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
