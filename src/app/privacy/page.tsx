export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white pt-16 md:pt-20">
      <main className="container mx-auto px-4 py-16 max-w-3xl">
        <h1 className="text-4xl font-light tracking-tight mb-12">
          Privacy Policy
        </h1>

        <div className="prose prose-sm max-w-none text-black/70 prose-headings:font-normal prose-headings:tracking-tight prose-headings:text-black">
          <p>
            <strong>Last updated:</strong> February 2026
          </p>

          <h2>Overview</h2>
          <p>
            Late Edition (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;)
            respects your privacy. This Privacy Policy explains how we collect,
            use, and protect information when you visit our website.
          </p>

          <h2>Information We Collect</h2>
          <p>
            We may collect limited information automatically when you visit our
            site, including your browser type, device information, and pages
            viewed. If you make a purchase through our shop, we collect the
            information necessary to process your order, including your name,
            email, shipping address, and payment details. Payment processing is
            handled by Shopify and we do not store your payment card information.
          </p>

          <h2>How We Use Information</h2>
          <p>We use the information we collect to:</p>
          <ul>
            <li>Operate and improve our website</li>
            <li>Process orders and transactions</li>
            <li>Respond to inquiries</li>
          </ul>

          <h2>Third-Party Services</h2>
          <p>
            Our site may use third-party services such as Shopify for
            e-commerce, YouTube for video content, and SoundCloud for music. These
            services have their own privacy policies governing how they handle
            your data.
          </p>

          <h2>Cookies</h2>
          <p>
            We may use cookies and similar technologies to improve your browsing
            experience. You can control cookies through your browser settings.
          </p>

          <h2>Contact</h2>
          <p>
            If you have questions about this Privacy Policy, please reach out to
            us through our{" "}
            <a href="/contact" className="text-black underline underline-offset-4">
              contact page
            </a>
            .
          </p>
        </div>
      </main>
    </div>
  );
}
