"use client";

import { useState } from "react";
import Link from "next/link";
import PageBreadcrumb from "@/app/(app)/_components/page-breadcrumb";
import { toast } from "sonner";
import { createCheckoutSession } from "./_checkout-actions";

export default function PricingPage() {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annually">("monthly");
  const [loadingPriceId, setLoadingPriceId] = useState<string | null>(null);

  const handleCheckout = async (priceId: string, planName: string) => {
    setLoadingPriceId(priceId);
    try {
      const result = await createCheckoutSession(priceId);
      if (result.error) {
        toast.error("Checkout Failed", { description: result.error });
        return;
      }
      if (result.url) {
        window.location.href = result.url;
      }
    } catch (err) {
      toast.error("Checkout Failed", {
        description: err instanceof Error ? err.message : "An unexpected error occurred.",
      });
    } finally {
      setLoadingPriceId(null);
    }
  };

  const starterPrice = billingPeriod === "monthly" ? "₹4,999" : "₹3,999";
  const proPrice = billingPeriod === "monthly" ? "₹14,999" : "₹11,999";

  return (
    <main className="mx-auto w-full px-6 py-8 sm:px-8 max-w-6xl text-zinc-100 min-h-screen relative select-none">
      <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] bg-violet-600/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[10%] w-[400px] h-[400px] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />

      <PageBreadcrumb
        segments={[
          { label: "BOQ Workspace", href: "/estimator" },
          { label: "Monthly Subscription Plans" },
        ]}
      />

      <div className="text-center mt-8 mb-12">
        <span className="text-[10px] font-extrabold tracking-widest text-violet-400 uppercase bg-violet-500/10 px-3 py-1 rounded-full border border-violet-500/20">
          MONETIZATION PLATFORM
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-50 mt-4">
          Select Your BOQ Intelligence Plan
        </h1>
        <p className="text-sm text-zinc-400 mt-2.5 max-w-2xl mx-auto leading-relaxed">
          Unlock high-fidelity scanned PDF OCR extractions, intelligent automated document interlinking, and AI-mitigated rate markup calculations.
        </p>

        {/* BILLING TOGGLE */}
        <div className="mt-8 flex justify-center items-center gap-3 select-none">
          <span className={`text-xs font-semibold ${billingPeriod === "monthly" ? "text-zinc-200" : "text-zinc-500"}`}>
            Monthly
          </span>
          <button
            onClick={() => setBillingPeriod(billingPeriod === "monthly" ? "annually" : "monthly")}
            className="w-12 h-6 bg-zinc-950 border border-zinc-800 rounded-full p-0.5 relative transition-all duration-300 cursor-pointer"
          >
            <div
              className={`w-4.5 h-4.5 bg-violet-500 rounded-full shadow-md transition-all duration-300 ${
                billingPeriod === "annually" ? "translate-x-6 bg-emerald-400" : "translate-x-0"
              }`}
            />
          </button>
          <span className={`text-xs font-semibold flex items-center gap-1.5 ${billingPeriod === "annually" ? "text-emerald-400" : "text-zinc-500"}`}>
            Annually
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-extrabold text-emerald-400 border border-emerald-500/20 uppercase tracking-widest">
              Save 20%
            </span>
          </span>
        </div>
      </div>

      {/* PRICING PLANS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch mb-16">
        
        {/* starter PLAN */}
        <div className="rounded-3xl border border-zinc-800 bg-zinc-950/40 p-6.5 shadow-sm relative flex flex-col justify-between hover:border-zinc-700 transition duration-300">
          <div>
            <span className="text-[10px] font-extrabold tracking-widest text-zinc-500 uppercase">Starter</span>
            <h3 className="text-xl font-bold text-zinc-100 mt-1">BOQ Entry Core</h3>
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
              Perfect for small contractors managing basic Excel table structuring and estimator coordination.
            </p>
            <div className="my-6">
              <span className="text-3xl font-black tracking-tight text-zinc-50">{starterPrice}</span>
              <span className="text-xs text-zinc-500 font-semibold">/month</span>
            </div>
            <div className="border-t border-zinc-850 my-6" />
            <ul className="space-y-3.5 text-xs text-zinc-300">
              <li className="flex items-center gap-2.5">
                <span className="text-zinc-500">✓</span> Standard Excel BOQ Parser
              </li>
              <li className="flex items-center gap-2.5">
                <span className="text-zinc-500">✓</span> Estimator spreadsheet matrix grid
              </li>
              <li className="flex items-center gap-2.5">
                <span className="text-zinc-500">✓</span> Git-style versioning revisions
              </li>
              <li className="flex items-center gap-2.5 text-zinc-600">
                <span className="text-zinc-700">✕</span> AI regional vendor sourcing
              </li>
              <li className="flex items-center gap-2.5 text-zinc-600">
                <span className="text-zinc-700">✕</span> Automated document auto-linker
              </li>
            </ul>
          </div>
          <div className="mt-8">
            <button
              onClick={() => handleCheckout("price_starter_placeholder", "Starter")}
              disabled={loadingPriceId != null}
              className="w-full inline-flex items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 px-4 py-2.5 text-xs font-bold text-zinc-200 transition cursor-pointer disabled:opacity-50"
            >
              {loadingPriceId === "price_starter_placeholder" ? "Processing..." : "Subscribe to Starter"}
            </button>
          </div>
        </div>

        {/* professional PLAN - POPULAR / BEST VALUE */}
        <div className="rounded-3xl border-2 border-violet-500 bg-zinc-950/60 p-6.5 shadow-xl relative flex flex-col justify-between shadow-violet-500/5 transition duration-300">
          <div className="absolute top-0 right-6 -translate-y-1/2 rounded-full bg-violet-600 px-3 py-1 text-[9px] font-extrabold uppercase tracking-widest text-white shadow-md shadow-violet-600/20">
            ★ Popular Bestseller
          </div>
          <div>
            <span className="text-[10px] font-extrabold tracking-widest text-violet-400 uppercase">Professional</span>
            <h3 className="text-xl font-bold text-zinc-50 mt-1">BOQ Estimator Pro</h3>
            <p className="text-xs text-zinc-300 mt-2 leading-relaxed">
              Highly recommended for professional engineering consultancies and medium scale contractors.
            </p>
            <div className="my-6">
              <span className="text-3xl font-black tracking-tight text-violet-400">{proPrice}</span>
              <span className="text-xs text-zinc-500 font-semibold">/month</span>
            </div>
            <div className="border-t border-zinc-850 my-6" />
            <ul className="space-y-3.5 text-xs text-zinc-200">
              <li className="flex items-center gap-2.5">
                <span className="text-violet-400">✓</span> Scanned PDF & Image OCR Extraction
              </li>
              <li className="flex items-center gap-2.5">
                <span className="text-violet-400">✓</span> **AI Document Auto-Linker Engine**
              </li>
              <li className="flex items-center gap-2.5">
                <span className="text-violet-400">✓</span> AI Regional Vendor Sourcing Directory
              </li>
              <li className="flex items-center gap-2.5">
                <span className="text-violet-400">✓</span> One-Click Risk Markups & Legal Cap Cap
              </li>
              <li className="flex items-center gap-2.5">
                <span className="text-violet-400">✓</span> Branded contracting Excel generator
              </li>
            </ul>
          </div>
          <div className="mt-8">
            <button
              onClick={() => handleCheckout("price_pro_placeholder", "Professional")}
              disabled={loadingPriceId != null}
              className="w-full inline-flex items-center justify-center rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-98 px-4 py-2.5 text-xs font-bold text-white transition cursor-pointer shadow-lg shadow-violet-600/15 disabled:opacity-50"
            >
              {loadingPriceId === "price_pro_placeholder" ? "Processing..." : "Get Pro Sub"}
            </button>
          </div>
        </div>

        {/* enterprise PLAN */}
        <div className="rounded-3xl border border-zinc-800 bg-zinc-950/40 p-6.5 shadow-sm relative flex flex-col justify-between hover:border-zinc-700 transition duration-300">
          <div>
            <span className="text-[10px] font-extrabold tracking-widest text-zinc-500 uppercase">Enterprise</span>
            <h3 className="text-xl font-bold text-zinc-100 mt-1">Industrial Custom</h3>
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
              Custom tailored setup for corporate estimation networks, government bidding groups, and MNC groups.
            </p>
            <div className="my-6">
              <span className="text-3xl font-black tracking-tight text-zinc-50">Custom</span>
              <span className="text-xs text-zinc-500 font-semibold">/bespoke setup</span>
            </div>
            <div className="border-t border-zinc-850 my-6" />
            <ul className="space-y-3.5 text-xs text-zinc-300">
              <li className="flex items-center gap-2.5">
                <span className="text-zinc-500">✓</span> Unlimited extractions & auto-linking
              </li>
              <li className="flex items-center gap-2.5">
                <span className="text-zinc-500">✓</span> Multi-Role database audit logging
              </li>
              <li className="flex items-center gap-2.5">
                <span className="text-zinc-500">✓</span> Custom Gemini model & system presets
              </li>
              <li className="flex items-center gap-2.5">
                <span className="text-zinc-500">✓</span> Dedicated customer account manager
              </li>
              <li className="flex items-center gap-2.5">
                <span className="text-zinc-500">✓</span> SLA & Custom API integration support
              </li>
            </ul>
          </div>
          <div className="mt-8">
            <Link
              href="mailto:sales@vertexestimator.com?subject=Enterprise Subscription Custom Setup"
              className="w-full inline-flex items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 px-4 py-2.5 text-xs font-bold text-zinc-200 transition cursor-pointer text-center"
            >
              Contact Sales Team
            </Link>
          </div>
        </div>

      </div>
    </main>
  );
}
