import { createClient } from "@/lib/supabase/client";

export type LocalVendorQuotationItem = {
  id: string;
  quotation_id?: string;
  item_name: string;
  brand?: string | null;
  unit?: string | null;
  quoted_rate: number;
  normalized_item_name: string;
};

export type LocalVendorQuotation = {
  id: string;
  file_name: string;
  vendor_name: string;
  quotation_date: string;
  file_url?: string | null;
  created_at: string;
  items: LocalVendorQuotationItem[];
  isLocalOnly?: boolean;
};

const LOCAL_STORAGE_KEY = "local_vendor_quotations";

function isTableMissingError(error: any): boolean {
  if (!error?.message) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes("vendor_quotations") ||
    msg.includes("vendor_quotation_items") ||
    msg.includes("does not exist") ||
    msg.includes("schema cache") ||
    msg.includes("could not find the table")
  );
}

export async function fetchVendorQuotations(): Promise<{
  quotations: LocalVendorQuotation[];
  isLocalMode: boolean;
}> {
  try {
    const supabase = createClient();
    const { data: qData, error: qError } = await supabase
      .from("vendor_quotations")
      .select(`
        id,
        file_name,
        vendor_name,
        quotation_date,
        file_url,
        created_at
      `)
      .order("created_at", { ascending: false });

    if (qError) {
      if (isTableMissingError(qError)) {
        console.warn("vendor_quotations table missing in Supabase, using localStorage fallback.");
        return { quotations: getLocalStorageQuotations(), isLocalMode: true };
      }
      throw qError;
    }

    const { data: iData, error: iError } = await supabase
      .from("vendor_quotation_items")
      .select(`
        id,
        quotation_id,
        item_name,
        brand,
        unit,
        quoted_rate,
        normalized_item_name
      `);

    if (iError) {
      throw iError;
    }

    // Group items by quotation_id
    const itemsMap: Record<string, LocalVendorQuotationItem[]> = {};
    for (const item of iData || []) {
      const qId = item.quotation_id;
      if (!itemsMap[qId]) {
        itemsMap[qId] = [];
      }
      itemsMap[qId].push({
        id: item.id,
        quotation_id: item.quotation_id,
        item_name: item.item_name,
        brand: item.brand,
        unit: item.unit,
        quoted_rate: Number(item.quoted_rate),
        normalized_item_name: item.normalized_item_name,
      });
    }

    const quotations: LocalVendorQuotation[] = (qData || []).map((q) => ({
      id: q.id,
      file_name: q.file_name,
      vendor_name: q.vendor_name,
      quotation_date: q.quotation_date,
      file_url: q.file_url,
      created_at: q.created_at,
      items: itemsMap[q.id] || [],
    }));

    return { quotations, isLocalMode: false };
  } catch (err) {
    console.error("Supabase failed, falling back to localStorage", err);
    return { quotations: getLocalStorageQuotations(), isLocalMode: true };
  }
}

export async function saveVendorQuotation(
  file_name: string,
  vendor_name: string,
  quotation_date: string,
  items: Omit<LocalVendorQuotationItem, "id" | "quotation_id">[],
  file_url?: string | null
): Promise<{ success: boolean; isLocalMode: boolean; id: string }> {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.warn("No authorized user session, falling back to localStorage.");
      const id = saveToLocalStorage(file_name, vendor_name, quotation_date, items, file_url);
      return { success: true, isLocalMode: true, id };
    }

    // Try saving quotation header
    const { data: qData, error: qError } = await supabase
      .from("vendor_quotations")
      .insert({
        file_name,
        vendor_name,
        quotation_date,
        file_url,
        uploaded_by: user.id,
      })
      .select("id")
      .single();

    if (qError) {
      if (isTableMissingError(qError)) {
        console.warn("vendor_quotations table missing on insert, using localStorage fallback.");
        const id = saveToLocalStorage(file_name, vendor_name, quotation_date, items, file_url);
        return { success: true, isLocalMode: true, id };
      }
      throw qError;
    }

    const quotationId = qData.id;

    // Save quotation items
    const dbItems = items.map((item) => ({
      quotation_id: quotationId,
      item_name: item.item_name,
      brand: item.brand || null,
      unit: item.unit || null,
      quoted_rate: item.quoted_rate,
      normalized_item_name: item.normalized_item_name,
    }));

    const { error: iError } = await supabase
      .from("vendor_quotation_items")
      .insert(dbItems);

    if (iError) {
      throw iError;
    }

    return { success: true, isLocalMode: false, id: quotationId };
  } catch (err) {
    console.error("Failed to save to Supabase, falling back to localStorage", err);
    const id = saveToLocalStorage(file_name, vendor_name, quotation_date, items, file_url);
    return { success: true, isLocalMode: true, id };
  }
}

export async function deleteVendorQuotation(
  id: string,
  isLocalOnly: boolean
): Promise<{ success: boolean }> {
  if (isLocalOnly) {
    deleteFromLocalStorage(id);
    return { success: true };
  }

  try {
    const supabase = createClient();
    const { error } = await supabase
      .from("vendor_quotations")
      .delete()
      .eq("id", id);

    if (error) {
      if (isTableMissingError(error)) {
        deleteFromLocalStorage(id);
        return { success: true };
      }
      throw error;
    }
    return { success: true };
  } catch (err) {
    console.error("Delete failed in Supabase, removing from local storage", err);
    deleteFromLocalStorage(id);
    return { success: true };
  }
}

// ---------------------------------------------------------------------------
// LocalStorage helpers
// ---------------------------------------------------------------------------

function getLocalStorageQuotations(): LocalVendorQuotation[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!stored) return getMockQuotations();
  try {
    return JSON.parse(stored) as LocalVendorQuotation[];
  } catch {
    return getMockQuotations();
  }
}

function saveToLocalStorage(
  file_name: string,
  vendor_name: string,
  quotation_date: string,
  items: Omit<LocalVendorQuotationItem, "id" | "quotation_id">[],
  file_url?: string | null
): string {
  if (typeof window === "undefined") return crypto.randomUUID();
  const list = getLocalStorageQuotations();
  const qId = crypto.randomUUID();
  const newItems: LocalVendorQuotationItem[] = items.map((it) => ({
    id: crypto.randomUUID(),
    quotation_id: qId,
    item_name: it.item_name,
    brand: it.brand,
    unit: it.unit,
    quoted_rate: it.quoted_rate,
    normalized_item_name: it.normalized_item_name,
  }));

  const newQuote: LocalVendorQuotation = {
    id: qId,
    file_name,
    vendor_name,
    quotation_date,
    file_url,
    created_at: new Date().toISOString(),
    items: newItems,
    isLocalOnly: true,
  };

  list.unshift(newQuote);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  return qId;
}

function deleteFromLocalStorage(id: string) {
  if (typeof window === "undefined") return;
  const list = getLocalStorageQuotations();
  const filtered = list.filter((q) => q.id !== id);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
}

function getMockQuotations(): LocalVendorQuotation[] {
  return [
    {
      id: "mock-1",
      file_name: "havells_mep_cables_june2026.pdf",
      vendor_name: "Havells",
      quotation_date: "2026-05-15",
      created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      isLocalOnly: true,
      items: [
        {
          id: "m-i1",
          item_name: "Finolex 3 Core 2.5 Sq.mm Copper Flexible Cable",
          brand: "Finolex",
          unit: "mtr",
          quoted_rate: 145,
          normalized_item_name: "copper cable 3 core 2.5mm",
        },
        {
          id: "m-i2",
          item_name: "Havells Copper Armoured Cable 4 Core 16 Sq.mm",
          brand: "Havells",
          unit: "mtr",
          quoted_rate: 420,
          normalized_item_name: "copper armoured cable 4 core 16mm",
        },
        {
          id: "m-i3",
          item_name: "Polycab PVC Conduit Pipe 25mm Medium Duty",
          brand: "Polycab",
          unit: "mtr",
          quoted_rate: 38,
          normalized_item_name: "pvc conduit pipe 25mm",
        },
      ],
    },
    {
      id: "mock-2",
      file_name: "anchor_electricals_rate_sheet.xlsx",
      vendor_name: "Anchor",
      quotation_date: "2026-05-10",
      created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
      isLocalOnly: true,
      items: [
        {
          id: "m-i4",
          item_name: "Anchor 3 Core 2.5 Sqmm FR Flexible Wire 100m coil",
          brand: "Anchor",
          unit: "mtr",
          quoted_rate: 138,
          normalized_item_name: "copper cable 3 core 2.5mm",
        },
        {
          id: "m-i5",
          item_name: "Anchor XLPE Copper Armoured Cable 4C x 16 Sqmm",
          brand: "Anchor",
          unit: "mtr",
          quoted_rate: 412,
          normalized_item_name: "copper armoured cable 4 core 16mm",
        },
        {
          id: "m-i6",
          item_name: "Anchor Heavy Duty PVC Pipe 25mm dia",
          brand: "Anchor",
          unit: "mtr",
          quoted_rate: 41,
          normalized_item_name: "pvc conduit pipe 25mm",
        },
      ],
    },
  ];
}
