import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { getAssetById } from "@/data";
import { PageHeader } from "@/components/layout/page-header";
import { AssetForm } from "@/components/assets/asset-form";
import { MAJOR_CATEGORIES, BUILDINGS } from "@/data/categories";

export default async function EditAssetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const asset = getAssetById(id);
  if (!asset) notFound();

  return (
    <div className="max-w-5xl space-y-5">
      <PageHeader
        title="자산 수정"
        description={`${asset.itemName} · ${asset.lockedManagementNo}`}
        icon={<Pencil className="h-6 w-6" />}
      />
      <AssetForm mode="edit" categories={MAJOR_CATEGORIES} buildings={BUILDINGS} defaults={asset} />
    </div>
  );
}
