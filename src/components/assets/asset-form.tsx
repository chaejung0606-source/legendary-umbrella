"use client";
import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, CheckCircle2, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Field, FormSection, NativeSelect } from "@/components/ui/form-controls";
import { toYyyyMmDd } from "@/lib/format";
import { TAG_STATUSES } from "@/types";
import type { Asset, TagStatus } from "@/types";
import type { AssetMajorCategory, Building } from "@/types";
import { useToast } from "@/components/ui/toaster";
import { createAssetAction, updateAssetAction } from "@/app/actions";

export function AssetForm({
  mode,
  categories,
  buildings,
  defaults,
}: {
  mode: "create" | "edit";
  categories: AssetMajorCategory[];
  buildings: Building[];
  defaults?: Partial<Asset>;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [major, setMajor] = useState(defaults?.majorCategory ?? "");
  const [middle, setMiddle] = useState(defaults?.middleCategory ?? "");
  const [building, setBuilding] = useState(defaults?.buildingCode ?? "");
  const [acquiredDate, setAcquiredDate] = useState(defaults?.acquiredDate ?? "");
  const [seq, setSeq] = useState(String(defaults?.sequenceNo ?? 1));
  const [saved, setSaved] = useState<{ id: string; managementNo: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const middles = useMemo(() => categories.find((c) => c.name === major)?.middles ?? [], [categories, major]);
  const classificationCode = useMemo(
    () => middles.find((m) => m.name === middle)?.code ?? defaults?.classificationCode ?? "",
    [middles, middle, defaults?.classificationCode]
  );
  const legacyRowNo = mode === "edit" ? defaults?.legacyRowNo ?? "연번" : "연번";

  const preview = useMemo(() => {
    const date = toYyyyMmDd(acquiredDate || null);
    if (!date || !classificationCode || !seq || !building) return null;
    return `[${legacyRowNo}]${date}${classificationCode}${seq}${building}`;
  }, [acquiredDate, classificationCode, seq, building, legacyRowNo]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const str = (name: string) => String(fd.get(name) ?? "").trim() || null;
    const input = {
      expenditureDocument: str("expenditureDocument"),
      managingOrganization: str("managingOrganization"),
      itemName: str("itemName") ?? "",
      specification: str("specification"),
      majorCategory: major,
      middleCategory: middle,
      classificationCode: classificationCode ? Number(classificationCode) : null,
      acquiredDate: acquiredDate || null,
      unitPrice: Number(fd.get("unitPrice") ?? 0) || 0,
      sequenceNo: seq ? Number(seq) : null,
      buildingCode: building || null,
      place: str("place"),
      roomName: str("roomName"),
      usageRaw: str("usage"),
      schoolRfidNo: str("schoolRfidNo"),
      tagStatus: (str("tagStatus") ?? "미지정") as TagStatus | "미지정",
      memo: str("memo"),
    };
    startTransition(async () => {
      const result =
        mode === "edit" && defaults?.id
          ? await updateAssetAction(defaults.id, input)
          : await createAssetAction(input);
      if (result.ok) {
        setSaved({ id: result.id, managementNo: result.managementNo ?? "(관리번호 미생성 — 필수값 미입력)" });
        router.refresh();
      } else {
        toast({ kind: "error", title: "저장 실패", description: result.error });
      }
    });
  }

  if (saved) {
    return (
      <div className="rounded-card bg-card p-10 text-center shadow-soft">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-3xl bg-pastel-mint text-pastel-mintInk">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h3 className="text-lg font-bold">{mode === "edit" ? "수정 완료" : "자산 등록 완료"}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          데모 데이터에 반영되어 자산 원장·대시보드에서 바로 확인할 수 있습니다. (DB 미연동 — 서버 재시작 시 초기화)
        </p>
        <p className="mt-3 inline-block rounded-2xl bg-muted px-4 py-2 font-mono text-sm">{saved.managementNo}</p>
        <div className="mt-6 flex justify-center gap-2">
          <Button asChild><Link href={`/assets/${saved.id}`}>자산 상세 보기</Link></Button>
          <Button asChild variant="outline"><Link href="/assets">자산 목록으로</Link></Button>
          {mode === "create" && <Button variant="ghost" onClick={() => setSaved(null)}>계속 입력</Button>}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <FormSection title="기본 정보">
        <Field label="지출문서"><Input name="expenditureDocument" defaultValue={defaults?.expenditureDocument ?? ""} placeholder="202408470001-..." /></Field>
        <Field label="관리기관"><Input name="managingOrganization" defaultValue={defaults?.managingOrganization ?? "산학협력단"} /></Field>
        <Field label="품명" required><Input name="itemName" required defaultValue={defaults?.itemName ?? ""} /></Field>
        <Field label="규격" className="sm:col-span-2 lg:col-span-3"><Input name="specification" defaultValue={defaults?.specification ?? ""} /></Field>
      </FormSection>

      <FormSection title="분류 정보" description="대분류 → 중분류 선택 시 분류코드가 자동 입력됩니다.">
        <Field label="대분류" required>
          <NativeSelect required value={major} onChange={(e) => { setMajor(e.target.value); setMiddle(""); }}>
            <option value="">선택</option>
            {categories.map((c) => <option key={c.code} value={c.name}>{c.name}</option>)}
          </NativeSelect>
        </Field>
        <Field label="중분류" required>
          <NativeSelect required value={middle} onChange={(e) => setMiddle(e.target.value)} disabled={!major}>
            <option value="">선택</option>
            {middles.map((m) => <option key={m.id} value={m.name}>{m.name} ({m.code})</option>)}
          </NativeSelect>
        </Field>
        <Field label="분류코드 (자동)">
          <Input readOnly value={classificationCode} className="bg-muted/60" />
        </Field>
      </FormSection>

      <FormSection title="취득 정보">
        <Field label="취득날짜" required><Input type="date" required value={acquiredDate} onChange={(e) => setAcquiredDate(e.target.value)} /></Field>
        <Field label="취득단가"><Input type="number" name="unitPrice" defaultValue={defaults?.unitPrice ?? ""} placeholder="원" /></Field>
        <Field label="번호"><Input type="number" value={seq} onChange={(e) => setSeq(e.target.value)} /></Field>
      </FormSection>

      <FormSection title="위치 정보" description="건축물 선택 시 건축물코드가 자동 입력됩니다.">
        <Field label="건축물">
          <NativeSelect value={building} onChange={(e) => setBuilding(e.target.value)}>
            <option value="">선택</option>
            {buildings.map((b) => <option key={b.code} value={b.code}>{b.name} ({b.code})</option>)}
          </NativeSelect>
        </Field>
        <Field label="건축물코드 (자동)"><Input readOnly value={building} className="bg-muted/60 font-mono" /></Field>
        <Field label="장소"><Input name="place" defaultValue={defaults?.place ?? ""} /></Field>
        <Field label="호실"><Input name="roomName" defaultValue={defaults?.roomName ?? ""} /></Field>
        <Field label="사용처"><Input name="usage" defaultValue={defaults?.currentUserName ?? ""} placeholder="예: 방주희 / A좌석 / 사무실 보관" /></Field>
      </FormSection>

      <FormSection title="RFID / 태그 정보">
        <Field label="RFID번호"><Input name="schoolRfidNo" defaultValue={defaults?.schoolRfidNo ?? ""} className="font-mono" /></Field>
        <Field label="태그 상태">
          <NativeSelect name="tagStatus" defaultValue={defaults?.tagStatus ?? "미지정"}>
            <option value="미지정">미지정</option>
            {TAG_STATUSES.map((t) => <option key={t} value={t}>{t}</option>)}
          </NativeSelect>
        </Field>
      </FormSection>

      <FormSection title="비고">
        <Field className="sm:col-span-2 lg:col-span-3"><Textarea name="memo" defaultValue={defaults?.memo ?? ""} placeholder="특이사항을 입력하세요." /></Field>
      </FormSection>

      {/* 관리번호 미리보기 */}
      <div className="flex flex-col gap-3 rounded-card bg-gradient-to-r from-pastel-lavender to-pastel-pink p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white/70 text-pastel-lavenderInk"><Sparkles className="h-5 w-5" /></span>
          <div>
            <div className="text-xs font-medium text-pastel-lavenderInk/80">관리번호 자동 생성 미리보기</div>
            <div className="font-mono text-lg font-bold text-foreground">{preview ?? "필수값(취득일·분류코드·번호·건축물) 입력 시 표시"}</div>
          </div>
        </div>
        <span className="text-[11px] text-pastel-lavenderInk/70">[연번]+취득일+분류코드+번호+건축물코드</span>
      </div>

      <div className="flex gap-2">
        <Button type="submit" size="lg" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {mode === "edit" ? "변경 저장" : "자산 등록"}
        </Button>
        <Button asChild type="button" variant="secondary" size="lg"><Link href="/assets">취소</Link></Button>
      </div>
    </form>
  );
}
