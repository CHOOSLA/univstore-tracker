"use server";

import { exec } from "child_process";
import { promisify } from "util";
import { revalidatePath } from "next/cache";

const execAsync = promisify(exec);

export async function executeSystemCommand(command: string) {
  const allowedCommands = ["pm2 status", "pm2 list", "docker ps", "free -h", "df -h", "uptime"];
  if (!allowedCommands.includes(command.trim())) {
    return { success: false, error: "허용되지 않은 명령어입니다." };
  }
  try {
    const { stdout, stderr } = await execAsync(command);
    return { success: true, output: stdout || stderr };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function restartCrawler() {
  try {
    await execAsync("pm2 restart univ-crawler");
    revalidatePath("/terminal");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function restartAllNodes() {
  try {
    await execAsync("pm2 restart all");
    revalidatePath("/terminal");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getStorageMetrics() {
  try {
    const { stdout } = await execAsync("df -h / | tail -1 | awk '{print $3, $2, $5}'");
    const [used, total, percent] = stdout.trim().split(/\s+/);
    return {
      diskUsed: used,
      diskTotal: total,
      diskPercent: parseInt(percent.replace('%', '')),
      success: true
    };
  } catch (err) {
    return { success: false, error: "Storage metrics failed" };
  }
}
