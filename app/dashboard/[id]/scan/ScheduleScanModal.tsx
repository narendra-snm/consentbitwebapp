'use client';

import { useState } from 'react';
import DatePicker from 'react-datepicker';
import { createScheduledScan } from '@/lib/client-api';
import LoadingPopup from './component/LoadingPopup';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  siteId: string;
  onScheduled: () => void;
};

function defaultScheduleDate(): Date {
  const t = new Date();
  t.setDate(t.getDate() + 1);
  t.setHours(9, 0, 0, 0);
  return t;
}

export function ScheduleScanModal({ isOpen, onClose, siteId, onScheduled }: Props) {
  const [date, setDate] = useState<Date>(defaultScheduleDate);
  const [frequency, setFrequency] = useState<'once' | 'daily' | 'weekly' | 'monthly'>('once');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setDate(defaultScheduleDate());
    setFrequency('once');
    setError(null);
  };

  if (!isOpen) return null;

  const handleDone = async () => {
    setError(null);
    setLoading(true);
    try {
      const scheduledAt = date.toISOString();
      await createScheduledScan(siteId, scheduledAt, frequency);
      onScheduled();
      onClose();
      resetForm();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to schedule scan');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setError(null);
    resetForm();
    onClose();
  };

  const dm = { fontVariationSettings: "'opsz' 14" as const };

  return (
    <>
      <LoadingPopup
        show={loading}
        title="Scheduling scan..."
        subtitle="Please wait while we save your scan schedule."
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div
        className="w-[min(100vw-2rem,400px)] max-h-[min(90vh,640px)] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
        role="dialog"
        aria-labelledby="schedule-scan-title"
        aria-describedby="schedule-scan-desc"
      >
        <h2
          id="schedule-scan-title"
          className="mb-1 font-['DM_Sans'] text-lg font-semibold text-black"
          style={dm}
        >
          Schedule scan
        </h2>
        <p
          id="schedule-scan-desc"
          className="mb-4 font-['DM_Sans'] text-sm leading-relaxed text-[#4b5563]"
          style={dm}
        >
          Set the date and time for your next automated cookie scan. Use <span className="font-medium text-[#374151]">How often</span>{' '}
          for a one-off run or to repeat daily, weekly, or monthly from that moment.
        </p>

        <div className="mb-4 flex gap-3">
          <div
            className="flex-1 rounded-lg border border-[#7bb3ff] px-4 py-3 text-center font-['DM_Sans'] text-sm font-semibold text-[#111827]"
            style={dm}
          >
            {date.toLocaleDateString('en-US', {
              day: 'numeric',
              month: 'long',
            })}
          </div>
          <div
            className="flex-1 rounded-lg border border-[#7bb3ff] px-4 py-3 text-center font-['DM_Sans'] text-sm font-semibold text-[#111827]"
            style={dm}
          >
            {date.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>

        <DatePicker
          selected={date}
          onChange={(d: Date | null) => {
            if (d) setDate(d);
          }}
          inline
          showTimeSelect
          timeIntervals={30}
          dateFormat="MMMM d, yyyy h:mm aa"
        />

        <div className="mt-4">
          <label className="mb-1.5 block font-['DM_Sans'] text-sm font-medium text-[#374151]" style={dm}>
            How often
          </label>
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as typeof frequency)}
            className="w-full rounded-lg border border-[#7bb3ff] bg-white px-4 py-2.5 font-['DM_Sans'] text-sm text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#007aff]/30"
            style={dm}
          >
            <option value="once">One time only</option>
            <option value="daily">Every day</option>
            <option value="weekly">Every week</option>
            <option value="monthly">Every month</option>
          </select>
        </div>

        {error ? (
          <p className="mt-3 font-['DM_Sans'] text-sm text-red-600" style={dm}>
            {error}
          </p>
        ) : null}

        <div className="mt-4 flex justify-between">
          <button
            type="button"
            onClick={handleCancel}
            className="font-['DM_Sans'] text-sm font-medium text-gray-500 hover:text-gray-700"
            style={dm}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleDone()}
            disabled={loading}
            className="rounded-lg bg-[#007aff] px-5 py-2 font-['DM_Sans'] text-sm font-medium text-white hover:bg-[#0066d6] disabled:cursor-not-allowed disabled:opacity-60"
            style={dm}
          >
            {loading ? 'Scheduling…' : 'Schedule scan'}
          </button>
        </div>
      </div>
    </div>
    </>
  );
}
