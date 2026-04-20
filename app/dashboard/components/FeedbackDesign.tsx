'use client';

import { useState } from 'react';
import platform from '../../../public/images/platform1.svg';

export default function FeedbackDesign() {
  const [input, setInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    const trimmed = input.trim();
    if (!trimmed) return;

    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed }),
      });
      const data = await res.json();
      if (!res.ok || data?.success === false) {
        setError(data?.error || 'Failed to submit feedback.');
      } else {
        setSubmitted(true);
        setInput('');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className=" bg-white pt-3.25 flex items-start justify-center">
      <div className="grid w-full grid-cols-2 gap-[16px]">
        {/* Left Section - Supported tech tools */}
        <div className="bg-[#f6f6f6] border border-[#ededed] rounded-[10px] max-w-[566px] min-h-[116px] p-[14px]">
          <h2 
            className="font-['DM_Sans:SemiBold',sans-serif] font-semibold text-[16px] text-black leading-[20px] mb-[7px]"
            style={{ fontVariationSettings: "'opsz' 14" }}
          >
            Supported tech tools.
          </h2>
          <p
            className="font-['DM_Sans:Regular',sans-serif] font-normal text-[12px] text-black opacity-80 leading-[normal] tracking-[-0.24px] mb-[13px]"
            style={{ fontVariationSettings: "'opsz' 14" }}
          >
            Refer to our platform-wise guides for instructions.
          </p>
          <div className="flex items-center gap-0 relative">
            <div className="relative h-[31px] w-full mix-blend-multiply">
              <img
                alt="Tech tools"
                className=" object-cover left-[-0.96%] top-[-9.68%]"
                src={platform.src}
              />
            </div>
          </div>
        </div>

        {/* Right Section - Share your feedbacks */}
        <div className="bg-[#f6f6f6] border border-[#ededed] rounded-[10px] max-w-[566px] min-h-[116px] p-[14px]">
          <h2 
            className="font-['DM_Sans:SemiBold',sans-serif] font-semibold text-[16px] text-black leading-[20px] mb-[15px]"
            style={{ fontVariationSettings: "'opsz' 14" }}
          >
            Share your feedbacks
          </h2>

          {submitted ? (
            <div className="flex items-center gap-[8px] bg-[#e6f4ea] border border-[#b7dfbf] rounded-[5px] px-[14px] py-[12px] w-[529px]">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="8" cy="8" r="8" fill="#34a853" />
                <path d="M4.5 8.5L7 11L11.5 5.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span
                className="font-['DM_Sans:Regular',sans-serif] font-normal text-[13px] text-[#1e6b2e] leading-[20px]"
                style={{ fontVariationSettings: "'opsz' 14" }}
              >
                Thank you! Your feedback has been submitted.
              </span>
              <button
                onClick={() => setSubmitted(false)}
                className="ml-auto text-[#1e6b2e] opacity-60 hover:opacity-100 text-[12px] underline"
              >
                Send another
              </button>
            </div>
          ) : (
            <>
              <div className="relative  h-[51px]">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  placeholder="Write your feedback here..."
                  disabled={submitting}
                  className="w-full h-full bg-white border border-[#d9d9d9] rounded-[5px] px-[17px] py-[15.5px] font-['DM_Sans:Regular',sans-serif] font-normal text-[13px] text-black leading-[20px] outline-none focus:border-[#007aff] transition-colors disabled:opacity-60"
                  style={{ fontVariationSettings: "'opsz' 14" }}
                />
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !input.trim()}
                  className="absolute right-[8px] top-[8px] bg-[#007aff] hover:bg-[#0066dd] disabled:opacity-50 border border-[#007aff] rounded-[4px] px-[11px] py-[8px] h-[36px] w-[94px] flex items-center justify-center transition-colors"
                >
                  <span
                    className="font-['DM_Sans:Regular',sans-serif] font-normal text-[15px] text-white leading-[20px] whitespace-nowrap"
                    style={{ fontVariationSettings: "'opsz' 14" }}
                  >
                    {submitting ? 'Sending...' : 'Submit'}
                  </span>
                </button>
              </div>
              {error && (
                <p className="mt-[6px] text-[12px] text-red-500">{error}</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
