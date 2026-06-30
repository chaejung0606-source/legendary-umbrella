import Link from "next/link";
import { Search, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { NativeSelect, Field } from "@/components/ui/form-controls";
import { MAJOR_CATEGORIES } from "@/data/categories";
import { ASSET_STATUSES, USAGE_TYPES } from "@/types";

type SP = Record<string, string | undefined>;

export function AssetSearchFilters({ sp }: { sp: SP }) {
  const middles = [...new Map(MAJOR_CATEGORIES.flatMap((m) => m.middles).map((mid) => [mid.name, mid])).values()];
  return (
    <form method="get" className="rounded-card bg-card p-5 shadow-soft ring-1 ring-black/[0.03]">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        <Field label="검색어" className="col-span-2 md:col-span-1">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input name="q" defaultValue={sp.q} placeholder="품명·관리번호·RFID·사용자" className="pl-10" />
          </div>
        </Field>
        <Field label="대분류">
          <NativeSelect name="major" defaultValue={sp.major ?? ""}>
            <option value="">전체</option>
            {MAJOR_CATEGORIES.map((m) => <option key={m.code} value={m.name}>{m.name}</option>)}
          </NativeSelect>
        </Field>
        <Field label="중분류">
          <NativeSelect name="middle" defaultValue={sp.middle ?? ""}>
            <option value="">전체</option>
            {middles.map((m) => <option key={m.id} value={m.name}>{m.name}</option>)}
          </NativeSelect>
        </Field>
        <Field label="사용처">
          <NativeSelect name="usage" defaultValue={sp.usage ?? ""}>
            <option value="">전체</option>
            {USAGE_TYPES.map((u) => <option key={u} value={u}>{u}</option>)}
          </NativeSelect>
        </Field>
        <Field label="장소"><Input name="place" defaultValue={sp.place} placeholder="예: 집현관" /></Field>
        <Field label="호실"><Input name="room" defaultValue={sp.room} placeholder="예: 102호" /></Field>
        <Field label="RFID 상태">
          <NativeSelect name="rfid" defaultValue={sp.rfid ?? ""}>
            <option value="">전체</option>
            <option value="registered">등록</option>
            <option value="missing">미등록</option>
          </NativeSelect>
        </Field>
        <Field label="자산 상태">
          <NativeSelect name="status" defaultValue={sp.status ?? ""}>
            <option value="">전체</option>
            {ASSET_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </NativeSelect>
        </Field>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <Button type="submit" size="sm"><Search className="h-4 w-4" /> 검색</Button>
        <Button asChild type="button" variant="ghost" size="sm"><Link href="/assets"><RotateCcw className="h-4 w-4" /> 초기화</Link></Button>
      </div>
    </form>
  );
}
