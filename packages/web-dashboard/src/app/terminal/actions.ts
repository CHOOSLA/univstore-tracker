"use server";

import { exec } from "child_process";
import { promisify } from "util";
import { revalidatePath } from "next/cache";

const execAsync = promisify(exec);

export async function executeSystemCommand(command: string) {
  // 보안을 위해 명령어 제한
  const allowedCommands = ["pm2 status", "pm2 list", "docker ps", "free -h", "df -h", "uptime"];
  
  if (!allowedCommands.includes(command.trim())) {
    return { success: false, error: "허용되지 않은 명령어입니다." };
  }

  try {
    const { stdout, stderr } = await execAsync(command);
    return { success: true, output: stdout || stderr };
  } catch (err: any) {
    console.error("❌ 시스템 명령 실행 실패:", err.message);
    return { success: false, error: err.message };
  }
}

export async function restartCrawler() {
  try {
    await execAsync("pm2 restart univ-crawler");
    revalidatePath("/terminal");
    return { success: true };
  } catch (err: any) {
    console.error("❌ 크롤러 재시작 실패:", err.message);
    return { success: false, error: err.message };
  }
}

export async function restartAllNodes() {
  try {
    await execAsync("pm2 restart all");
    revalidatePath("/terminal");
    return { success: true };
  } catch (err: any) {
    console.error("❌ 노드 재시작 실패:", err.message);
    return { success: false, error: err.message };
  }
}
