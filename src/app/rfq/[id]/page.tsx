"use client";

import { useState, useEffect, use } from "react";
import { toast } from "sonner";

interface RFQItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
}

interface RFQSession {
  session_id: string;
  project_id: string;
  supplier: string;
  status: string;
  items: RFQItem[];
}

interface ItemInput {
  list_price: string;
  discount: string;
  lead_time: string;
}

export default function SupplierQuotingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = use(params);
  
  const [session, setSession] = useState<RFQSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  // Track pricing inputs locally
  const [inputs, setInputs] = useState<Record<string, ItemInput>>({});

  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch(`/api/backend/rfq/session/${sessionId}`);
        if (!res.ok) {
          throw new Error("Quoting session has expired or is invalid.");
        }
        const data = await res.json();
        setSession(data);
        
        // Seed initial inputs
        const initialInputs: Record<string, ItemInput> = {};
        data.items.forEach((item: RFQItem) => {
          initialInputs[item.id] = {
            list_price: "",
            discount: "0",
            lead_time: "3",
          };
        });
        setInputs(initialInputs);
      } catch (err) {
        toast.error("Failed to load quoting session", {
          description: err instanceof Error ? err.message : "Invalid link.",
        });
      } finally {
        setLoading(false);
      }
    }

    if (sessionId) {
      fetchSession();
    }
  }, [sessionId]);

  const handleInputChange = (itemId: string, field: keyof ItemInput, value: string) => {
    setInputs((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value,
      },
    }));
  };

  const calculateNetRate = (listPrice: string, discount: string) => {
    const lp = parseFloat(listPrice) || 0;
    const ds = parseFloat(discount) || 0;
    return lp * (1 - ds / 100);
  };

  const calculateTotalBid = () => {
    if (!session) return 0;
    return session.items.reduce((sum, item) => {
      const inp = inputs[item.id] || { list_price: "0", discount: "0" };
      const net = calculateNetRate(inp.list_price, inp.discount);
      return sum + net * item.quantity;
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;

    // Validate inputs
    const pricingPayload = session.items.map((item) => {
      const inp = inputs[item.id];
      const listPrice = parseFloat(inp.list_price);
      if (isNaN(listPrice) || listPrice <= 0) {
        throw new Error(`Please specify a valid catalog price for: ${item.description}`);
      }
      return {
        id: item.id,
        list_price: listPrice,
        discount: parseFloat(inp.discount) || 0,
        lead_time: parseInt(inp.lead_time) || 3,
      };
    });

    setSubmitting(true);
    try {
      const res = await fetch(`/api/backend/rfq/submit/${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pricing: pricingPayload }),
      });

      if (!res.ok) {
        throw new Error("Failed to submit quotation to contractor.");
      }

      setSubmitted(true);
      toast.success("Quotation Submitted Successfully!", {
        description: "Your official pricing has been synced back to the estimator's dashboard.",
      });
    } catch (err) {
      toast.error("Submission Failed", {
        description: err instanceof Error ? err.message : "Server error.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="relative flex min-h-screen items-center justify-center bg-zinc-950 px-4 text-zinc-100 overflow-hidden">
        <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] bg-violet-600/5 blur-[120px] rounded-full pointer-events-none animate-pulse" />
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 shadow-2xl text-center max-w-sm backdrop-blur-xl">
          <div className="h-8 w-8 rounded-full border-4 border-violet-500 border-t-transparent animate-spin mx-auto mb-4" />
          <span className="text-xs font-bold text-zinc-400">Loading Secure Quotation Session...</span>
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="relative flex min-h-screen items-center justify-center bg-zinc-950 px-4 text-zinc-100 overflow-hidden">
        <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] bg-red-600/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="rounded-2xl border border-red-500/20 bg-zinc-900/40 p-8 shadow-2xl text-center max-w-sm backdrop-blur-xl border-dashed">
          <span className="text-3xl">⚠️</span>
          <h2 className="text-md font-extrabold text-red-400 mt-3">Link Expired or Invalid</h2>
          <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
            This RFQ quoting invitation link is expired or has been deleted by the procurement contractor. Please contact the estimator to request a new session link.
          </p>
        </div>
      </main>
    );
  }

  if (submitted || session.status === "submitted") {
    return (
      <main className="relative flex min-h-screen items-center justify-center bg-zinc-950 px-4 text-zinc-100 overflow-hidden">
        <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] bg-emerald-600/5 blur-[120px] rounded-full pointer-events-none animate-pulse" />
        <div className="rounded-2xl border border-emerald-500/20 bg-zinc-900/40 p-8 shadow-2xl text-center max-w-md backdrop-blur-xl border-dashed">
          <span className="text-4xl">🎉</span>
          <h2 className="text-lg font-black text-emerald-400 mt-3">Quotation Submitted Successfully!</h2>
          <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
            Thank you! Your official catalog list prices, custom trade discounts, and logistic lead times have been encrypted and synchronized directly with the contractor's Master Estimation Workspace.
          </p>
          <div className="border-t border-zinc-800/80 my-5" />
          <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
            RFQ Session ID: {sessionId}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen bg-zinc-950 text-zinc-100 py-12 px-4 sm:px-6 overflow-hidden select-none">
      <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] bg-violet-600/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[10%] w-[400px] h-[400px] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10">
        {/* BRANDING HEADER */}
        <div className="mb-8 flex flex-col justify-between gap-4 border-b border-zinc-900 pb-6 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black tracking-widest text-violet-400 uppercase bg-violet-500/10 px-2.5 py-0.5 rounded border border-violet-500/20">
                Supplier Portal
              </span>
              <span className="text-[9px] font-black tracking-widest text-zinc-500 uppercase">
                Active Bidding Session
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-zinc-50 mt-2">
              Material Rate Submission
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Securely submit list prices and trade discounts for procurement review.
            </p>
          </div>
          <div className="rounded-xl bg-zinc-900/60 border border-zinc-800 px-3.5 py-1.5 backdrop-blur-md">
            <div className="text-[9px] font-black uppercase tracking-wider text-zinc-550">Bidding Vendor</div>
            <div className="text-xs font-extrabold text-violet-400 mt-0.5">{session.supplier}</div>
          </div>
        </div>

        {/* INSTRUCTIONS */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/40 p-5.5 mb-8 backdrop-blur-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[80px] h-[80px] bg-violet-500/5 blur-[30px] rounded-full pointer-events-none" />
          <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-2">Instructions for Vendor</h3>
          <ul className="list-disc list-inside space-y-1.5 text-xs text-zinc-300">
            <li>Fill in your standard **Catalog List Price (MSRP)** in Indian Rupees (₹).</li>
            <li>Apply your approved **Trade Discount Percentage (%)** if applicable (defaults to 0%).</li>
            <li>Input the realistic logistical **Delivery Lead Time** in business days.</li>
            <li>Press "Submit Official Rates" below. The system automatically computes net pricing.</li>
          </ul>
        </div>

        {/* PRICING FORM */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 overflow-hidden shadow-2xl backdrop-blur-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-900/60 border-b border-zinc-800 text-[10px] font-black uppercase tracking-wider text-zinc-400 select-none">
                  <tr>
                    <th className="px-5 py-3.5">Material Description</th>
                    <th className="px-4 py-3.5 text-center">Qty / Unit</th>
                    <th className="px-4 py-3.5">Catalog List Price (₹)</th>
                    <th className="px-4 py-3.5">Discount (%)</th>
                    <th className="px-4 py-3.5 text-center">Lead Time</th>
                    <th className="px-5 py-3.5 text-right">Computed Net (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {session.items.map((item) => {
                    const inp = inputs[item.id] || { list_price: "", discount: "0", lead_time: "3" };
                    const netRate = calculateNetRate(inp.list_price, inp.discount);
                    
                    return (
                      <tr key={item.id} className="hover:bg-zinc-900/20 transition">
                        <td className="px-5 py-4.5 font-bold text-zinc-200">
                          {item.description}
                        </td>
                        <td className="px-4 py-4.5 text-center font-extrabold text-zinc-400">
                          {item.quantity} <span className="text-[10px] font-black text-zinc-550 lowercase">{item.unit}</span>
                        </td>
                        <td className="px-4 py-4.5">
                          <input
                            type="number"
                            required
                            min="0.1"
                            step="0.01"
                            placeholder="MSRP rate"
                            value={inp.list_price}
                            onChange={(e) => handleInputChange(item.id, "list_price", e.target.value)}
                            className="w-[110px] bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs font-bold text-zinc-100 placeholder-zinc-700 outline-none focus:border-violet-600 focus:ring-1 focus:ring-violet-600 transition"
                          />
                        </td>
                        <td className="px-4 py-4.5">
                          <input
                            type="number"
                            required
                            min="0"
                            max="99"
                            step="0.1"
                            placeholder="0"
                            value={inp.discount}
                            onChange={(e) => handleInputChange(item.id, "discount", e.target.value)}
                            className="w-[70px] bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs font-bold text-zinc-100 placeholder-zinc-700 outline-none focus:border-violet-600 focus:ring-1 focus:ring-violet-600 transition"
                          />
                        </td>
                        <td className="px-4 py-4.5 text-center">
                          <select
                            value={inp.lead_time}
                            onChange={(e) => handleInputChange(item.id, "lead_time", e.target.value)}
                            className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-xs font-extrabold text-violet-400 outline-none focus:border-violet-600 transition"
                          >
                            <option value="1">1 Day</option>
                            <option value="2">2 Days</option>
                            <option value="3">3 Days</option>
                            <option value="5">5 Days</option>
                            <option value="7">7 Days</option>
                            <option value="10">10 Days</option>
                          </select>
                        </td>
                        <td className="px-5 py-4.5 text-right font-black text-violet-400 text-sm">
                          ₹{netRate.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* SUMMARY AND SUBMISSION */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-zinc-800/80 bg-zinc-950/40 p-6 backdrop-blur-xl">
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-zinc-550">Total Quoted Bid Value</div>
              <div className="text-xl font-black text-zinc-50 mt-1">
                ₹{calculateTotalBid().toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-98 px-5 py-2.5 text-xs font-extrabold text-white transition cursor-pointer shadow-lg shadow-violet-600/15 disabled:opacity-50 h-[38px]"
              >
                {submitting ? "Submitting Official Rates..." : "Submit Official Rates"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}
