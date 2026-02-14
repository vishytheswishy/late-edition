"use client";

import { useState } from "react";

interface RsvpFormProps {
  eventId: string;
}

export default function RsvpForm({ eventId }: RsvpFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("going");
  const [plusOne, setPlusOne] = useState(0);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError("Name and email are required");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(`/api/events/${eventId}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          status,
          plusOne,
          note: note.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit RSVP");
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit RSVP");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="mt-10 border-t border-black/10 pt-10">
        <div className="text-center py-8">
          <h3 className="text-xl font-normal tracking-tight mb-2">
            You&apos;re on the list!
          </h3>
          <p className="text-sm text-black/50">
            {status === "going"
              ? "We'll see you there."
              : status === "maybe"
                ? "Hope you can make it!"
                : "Maybe next time!"}
          </p>
          <button
            onClick={() => {
              setSubmitted(false);
              setName("");
              setEmail("");
              setStatus("going");
              setPlusOne(0);
              setNote("");
            }}
            className="mt-4 text-sm text-black/40 hover:text-black/60 underline underline-offset-4 transition-colors"
          >
            Update RSVP
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-10 border-t border-black/10 pt-10">
      <h3 className="text-xl font-normal tracking-tight mb-6">RSVP</h3>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm font-medium mb-1.5">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="w-full px-4 py-2.5 border border-black/20 rounded-lg text-sm focus:outline-none focus:border-black/40 transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="w-full px-4 py-2.5 border border-black/20 rounded-lg text-sm focus:outline-none focus:border-black/40 transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full px-4 py-2.5 border border-black/20 rounded-lg text-sm focus:outline-none focus:border-black/40 transition-colors bg-white"
          >
            <option value="going">Going</option>
            <option value="maybe">Maybe</option>
            <option value="not_going">Can&apos;t Make It</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">
            Plus ones
          </label>
          <select
            value={plusOne}
            onChange={(e) => setPlusOne(Number(e.target.value))}
            className="w-full px-4 py-2.5 border border-black/20 rounded-lg text-sm focus:outline-none focus:border-black/40 transition-colors bg-white"
          >
            {[0, 1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n === 0 ? "Just me" : `+${n}`}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">
            Note <span className="text-black/30 font-normal">(optional)</span>
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Anything we should know?"
            rows={2}
            maxLength={500}
            className="w-full px-4 py-2.5 border border-black/20 rounded-lg text-sm focus:outline-none focus:border-black/40 transition-colors resize-none"
          />
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-2.5 bg-black text-white rounded-lg text-sm hover:bg-black/80 transition-colors disabled:opacity-50"
        >
          {submitting ? "Submitting..." : "Submit RSVP"}
        </button>
      </form>
    </div>
  );
}
