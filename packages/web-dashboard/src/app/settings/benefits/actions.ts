"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateBenefitRule(id: number, data: { rate: number; maxLimit: number; isActive: boolean; label: string }) {
  try {
    await prisma.benefitRule.update({
      where: { id },
      data: {
        rate: data.rate,
        maxLimit: data.maxLimit,
        isActive: data.isActive,
        label: data.label
      }
    });
    revalidatePath('/settings/benefits');
    revalidatePath('/product/[id]', 'page');
    return { success: true };
  } catch (err: any) {
    console.error("❌ BenefitRule 업데이트 실패:", err.message);
    return { success: false, error: err.message };
  }
}

export async function createBenefitRule(data: { pattern: string; rate: number; maxLimit: number; label: string }) {
  try {
    await prisma.benefitRule.create({
      data: {
        pattern: data.pattern,
        rate: data.rate,
        maxLimit: data.maxLimit,
        label: data.label,
        isActive: true
      }
    });
    revalidatePath('/settings/benefits');
    return { success: true };
  } catch (err: any) {
    console.error("❌ BenefitRule 생성 실패:", err.message);
    return { success: false, error: err.message };
  }
}

export async function deleteBenefitRule(id: number) {
  try {
    await prisma.benefitRule.delete({
      where: { id }
    });
    revalidatePath('/settings/benefits');
    return { success: true };
  } catch (err: any) {
    console.error("❌ BenefitRule 삭제 실패:", err.message);
    return { success: false, error: err.message };
  }
}
