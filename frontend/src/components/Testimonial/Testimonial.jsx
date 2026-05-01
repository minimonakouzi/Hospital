import React from "react";
import { Star, Quote, MessageSquareHeart } from "lucide-react";

const testimonials = [
  {
    id: 1,
    name: "Dr. Sarah Johnson",
    role: "Cardiologist",
    rating: 5,
    text: "The appointment booking system is incredibly efficient. It saves me valuable time and helps me focus on patient care.",
    image:
      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80",
    type: "doctor",
  },
  {
    id: 2,
    name: "Michael Chen",
    role: "Patient",
    rating: 5,
    text: "Scheduling appointments has never been easier. The interface is intuitive and reminders are very helpful.",
    image:
      "https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=400&q=80",
    type: "patient",
  },
  {
    id: 3,
    name: "Dr. Robert Martinez",
    role: "Pediatrician",
    rating: 4,
    text: "This platform has streamlined our clinic operations significantly. Patient management is much more organized.",
    image:
      "https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=400&q=80",
    type: "doctor",
  },
  {
    id: 4,
    name: "Emily Williams",
    role: "Patient",
    rating: 5,
    text: "Booking appointments online 24/7 is a game-changer. The confirmation system gives me peace of mind.",
    image:
      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80",
    type: "patient",
  },
  {
    id: 5,
    name: "Dr. Amanda Lee",
    role: "Dermatologist",
    rating: 5,
    text: "Excellent platform for managing appointments. Automated reminders reduce no-shows dramatically.",
    image:
      "https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=400&q=80",
    type: "doctor",
  },
  {
    id: 6,
    name: "David Thompson",
    role: "Patient",
    rating: 5,
    text: "The wait time has reduced significantly since using this platform. Very convenient and user-friendly.",
    image:
      "https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=400&q=80",
    type: "patient",
  },
];

function Stars({ rating }) {
  return (
    <div className="flex items-center gap-1 text-amber-400">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={14}
          fill={i < rating ? "currentColor" : "none"}
          className={i < rating ? "" : "text-amber-300/50"}
        />
      ))}
    </div>
  );
}

function TestimonialCard({ testimonial }) {
  return (
    <article className="group rounded-[24px] border border-white/60 bg-white/34 p-5 shadow-sm backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:bg-white/44">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <img
            src={testimonial.image}
            alt={testimonial.name}
            className="h-12 w-12 rounded-full border border-white/60 object-cover shadow-sm"
          />
          <div className="min-w-0">
            <h4 className="truncate text-sm font-semibold text-[#0f172a]">
              {testimonial.name}
            </h4>
            <p className="text-xs text-[#64748b]">{testimonial.role}</p>
          </div>
        </div>

        <Stars rating={testimonial.rating} />
      </div>

      <div className="mt-4 flex gap-3">
        <div className="mt-0.5 shrink-0 text-[#2563eb]/70">
          <Quote size={18} />
        </div>
        <p className="text-sm leading-7 text-[#475569]">{testimonial.text}</p>
      </div>
    </article>
  );
}

export default function Testimonial() {
  const doctors = testimonials.filter((t) => t.type === "doctor");
  const patients = testimonials.filter((t) => t.type === "patient");

  return (
    <section className="w-full px-0 py-4 md:py-6">
      <div className="relative w-full overflow-hidden border-y border-white/20 px-4 py-8 md:px-8 md:py-10">
        <div className="pointer-events-none absolute inset-0 bg-[rgba(255,255,255,0.08)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.24),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(191,219,254,0.22),transparent_24%)]" />

        <div className="relative z-10 mx-auto max-w-[1380px]">
          <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
            <div className="rounded-[30px] border border-white/55 bg-white/28 p-6 shadow-[0_18px_50px_rgba(30,64,175,0.08)] backdrop-blur-xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/45 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-[#2563eb]">
                <MessageSquareHeart className="h-4 w-4" />
                Patient Reviews
              </div>

              <h2 className="mt-5 text-3xl font-bold leading-tight text-[#0f172a] md:text-4xl">
                Voices of Trust
              </h2>

              <p className="mt-4 text-sm leading-7 text-[#475569]">
                Real feedback from doctors and patients with a light transparent
                look that still lets the home background show through.
              </p>

              <div className="mt-6 h-px w-full bg-gradient-to-r from-[#93c5fd] to-transparent" />

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/65 bg-white/40 px-4 py-4 text-center">
                  <div className="text-2xl font-bold text-[#0f172a]">4.9/5</div>
                  <div className="mt-1 text-xs text-[#64748b]">
                    Average Rating
                  </div>
                </div>
                <div className="rounded-2xl border border-white/65 bg-white/40 px-4 py-4 text-center">
                  <div className="text-2xl font-bold text-[#2563eb]">500+</div>
                  <div className="mt-1 text-xs text-[#64748b]">Happy Users</div>
                </div>
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-[30px] border border-white/55 bg-white/28 p-4 shadow-[0_18px_50px_rgba(30,64,175,0.08)] backdrop-blur-xl">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#2563eb]">
                    Medical Professionals
                  </h3>
                  <div className="ml-4 h-px flex-1 bg-gradient-to-r from-[#bfdbfe] to-transparent" />
                </div>

                <div className="space-y-4">
                  {doctors.map((testimonial) => (
                    <TestimonialCard
                      key={testimonial.id}
                      testimonial={testimonial}
                    />
                  ))}
                </div>
              </div>

              <div className="rounded-[30px] border border-white/55 bg-white/28 p-4 shadow-[0_18px_50px_rgba(30,64,175,0.08)] backdrop-blur-xl">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-sky-600">
                    Patients
                  </h3>
                  <div className="ml-4 h-px flex-1 bg-gradient-to-r from-[#bae6fd] to-transparent" />
                </div>

                <div className="space-y-4">
                  {patients.map((testimonial) => (
                    <TestimonialCard
                      key={testimonial.id}
                      testimonial={testimonial}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
