import { useState } from "react";
import { X, Flag } from "lucide-react";
import API from "../api/axios";

const REASONS = [
  { id: "spam", label: "Spam" },
  { id: "harassment", label: "Harassment" },
  { id: "copyright", label: "Copyright" },
  { id: "illegal_content", label: "Illegal content" },
  { id: "privacy", label: "Privacy violation" },
  { id: "other", label: "Other" },
];

export default function ReportModal({ targetType, targetId, onClose }) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const submit = async () => {
    if (!reason) return;
    setSubmitting(true);
    try {
      await API.post("/reports", { targetType, targetId, reason, details });
      setSubmitted(true);
    } catch (err) {
      alert(err?.response?.data?.message || "Couldn't submit report");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
      <div className="bg-white w-full max-w-md rounded-t-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="font-black text-gray-900 flex items-center gap-1.5">
            <Flag size={16} className="text-red-500" /> Report
          </span>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>

        {submitted ? (
          <p className="text-sm text-gray-600 py-4 text-center">Thanks — our team will review this.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              {REASONS.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setReason(r.id)}
                  className={`text-xs font-bold py-2.5 rounded-xl border-2 ${
                    reason === r.id ? "border-orange-400 bg-orange-50/40 text-orange-500" : "border-gray-100 text-gray-700"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Add details (optional)..."
              rows={3}
              className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-orange-400 resize-none"
            />
            <button
              onClick={submit}
              disabled={!reason || submitting}
              className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white font-bold py-3 rounded-xl"
            >
              {submitting ? "Submitting..." : "Submit Report"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
