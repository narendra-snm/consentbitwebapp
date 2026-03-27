"use client";
import { useState } from "react";
import Image from "next/image";

const logos = [
  { src: "/logos/webflow.svg", alt: "Webflow", width: 32, height: 32 },
  { src: "/logos/framer.svg", alt: "Framer", width: 32, height: 32 },
  { src: "/logos/webflow.svg", alt: "Webflow", width: 32, height: 32 },
  { src: "/logos/wordpress.svg", alt: "WordPress", width: 32, height: 32 },
  { src: "/logos/wix.svg", alt: "Wix", width: 32, height: 32 },
  { src: "/logos/squarespace.svg", alt: "Squarespace", width: 32, height: 32 },
];

export default function FeedbackDesign() {
  const [feedback, setFeedback] = useState("");
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Feedback submitted:", { feedback, email });
    // Integrate with your API/form handler
    alert("Feedback submitted! (Demo)");
    setFeedback("");
    setEmail("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
        {/* Left Panel - Supported Tech */}
        <div className="space-y-6">
          <div className="bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-slate-700 bg-clip-text text-transparent mb-6">
              Supported Tech
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 gap-4 mb-8">
              {logos.map((logo, idx) => (
                <div
                  key={idx}
                  className="group p-3 rounded-xl bg-white/70 hover:bg-white border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all duration-200 cursor-pointer flex items-center justify-center h-16 hover:scale-105"
                >
                  <Image
                    src={logo.src}
                    alt={logo.alt}
                    width={logo.width}
                    height={logo.height}
                    className="group-hover:scale-110 transition-transform duration-200"
                  />
                </div>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-200">
              <a
                href="/docs/instructions"
                className="flex-1 px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-sm font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 text-center"
              >
                📖 Instructions
              </a>
              <button className="px-5 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white text-sm font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 whitespace-nowrap">
                Share Feedbacks
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel - Feedback Form */}
        <div>
          <form onSubmit={handleSubmit} className="bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Share your feedback</h3>
            <div className="space-y-4">
              <div>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Lorem ipsum dolor sit amet, consectetur adipiscing elit..."
                  rows={6}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm placeholder-slate-400 bg-slate-50/50 hover:bg-white"
                  required
                />
              </div>
              <div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your-email@example.com"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm placeholder-slate-400 bg-slate-50/50 hover:bg-white"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-lg rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center justify-center gap-2 uppercase tracking-wide"
              >
                Submit
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}