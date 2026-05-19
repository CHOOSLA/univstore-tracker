"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createPriceAlert(productId: string, targetPrice: number) {
  try {
    await prisma.priceAlert.create({
      data: {
        productId,
        targetPrice,
        isActive: true
      }
    });
    revalidatePath(`/product/${productId}`);
    revalidatePath('/alerts');
    return { success: true };
  } catch (err: any) {
    console.error("❌ PriceAlert 생성 실패:", err.message);
    return { success: false, error: err.message };
  }
}

export async function deletePriceAlert(id: number) {
  try {
    const alert = await prisma.priceAlert.delete({
      where: { id }
    });
    revalidatePath(`/product/${alert.productId}`);
    revalidatePath('/alerts');
    return { success: true };
  } catch (err: any) {
    console.error("❌ PriceAlert 삭제 실패:", err.message);
    return { success: false, error: err.message };
  }
}

export async function togglePriceAlert(id: number, isActive: boolean) {
  try {
    const alert = await prisma.priceAlert.update({
      where: { id },
      data: { isActive }
    });
    revalidatePath(`/product/${alert.productId}`);
    revalidatePath('/alerts');
    return { success: true };
  } catch (err: any) {
    console.error("❌ PriceAlert 토글 실패:", err.message);
    return { success: false, error: err.message };
  }
}
