import CategoryUploadZone from "@/components/tenders/category-upload-zone";
import type { TenderFile, TenderFileCategory } from "@/lib/types";

const CATEGORIES: TenderFileCategory[] = ["boq", "drawings", "make_list"];

export default function TenderDocumentsManager({
  tenderProjectId,
  files,
  setupRequired,
}: {
  tenderProjectId: string;
  files: TenderFile[];
  setupRequired: boolean;
}) {
  const byCategory = (category: TenderFileCategory) =>
    files.filter((f) => f.category === category);

  return (
    <div className="space-y-6">
      {CATEGORIES.map((category) => (
        <CategoryUploadZone
          key={category}
          tenderProjectId={tenderProjectId}
          category={category}
          files={byCategory(category)}
          setupRequired={setupRequired}
        />
      ))}
    </div>
  );
}
