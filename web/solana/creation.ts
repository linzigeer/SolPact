import { PublicKey, type Connection } from "@solana/web3.js";
import { Buffer } from "buffer";
import { PROGRAM_ID } from "./config";
import { addInstruction, draftInstructions, fetchDetails, fetchProject, manageInstruction, projectPda, type CreationPlan } from "./protocol";
import { packetFits, type Receipt } from "./transactions";
import type { TransactionInstruction } from "@solana/web3.js";

const key = (buyer: string) => `solpact:devnet:${PROGRAM_ID.toBase58()}:drafts:${buyer}`;
export function savedPlans(buyer: string): CreationPlan[] {
  try { return JSON.parse(localStorage.getItem(key(buyer)) || "[]"); } catch { return []; }
}
export function savePlan(plan: CreationPlan) {
  const entries = savedPlans(plan.buyer).filter((entry) => entry.address !== plan.address);
  localStorage.setItem(key(plan.buyer), JSON.stringify([plan, ...entries]));
}
export function removePlan(plan: CreationPlan) {
  localStorage.setItem(key(plan.buyer), JSON.stringify(savedPlans(plan.buyer).filter((entry) => entry.address !== plan.address)));
}
export async function continueCreation(connection: Connection, plan: CreationPlan, send: (instructions: TransactionInstruction[], label: string, address: string) => Promise<Receipt>) {
  const buyer = new PublicKey(plan.buyer), address = new PublicKey(plan.address);
  if (!projectPda(buyer, Buffer.from(plan.idHex, "hex")).equals(address)) throw new Error("草稿地址与创建资料不匹配。");
  let project = await fetchProject(connection, address);
  if (!project) { await send(await draftInstructions(connection, plan), "创建项目草稿", plan.address); project = await fetchProject(connection, address); }
  if (!project) throw new Error("草稿尚未读取到，请稍后继续。");
  if (project.status === "cancelled") throw new Error("草稿已经取消，请创建新项目。");
  if (project.status !== "draft") { removePlan(plan); return address; }
  if (!project.buyer.equals(buyer) || project.seller.toBase58() !== plan.seller || (project.arbitrator?.toBase58() || null) !== plan.arbitrator || project.expectedMilestones !== plan.milestones.length || project.autoReleaseWindow.toString() !== plan.window) throw new Error("本地草稿与链上约定不一致，已停止继续创建。");
  const details = await fetchDetails(connection, address);
  for (const milestone of details?.milestones || []) {
    const row = plan.milestones[milestone.index];
    if (!row || row.amount !== milestone.amount.toString() || row.deadline !== milestone.deadline.toString() || row.description !== milestone.description) throw new Error("已添加的里程碑与本地资料不一致。");
  }
  let index = project.milestoneCount;
  while (index < plan.milestones.length) {
    const instructions: TransactionInstruction[] = [];
    const start = index;
    while (index < plan.milestones.length) {
      const instruction = await addInstruction(connection, plan, index);
      if (!packetFits([...instructions, instruction], buyer)) break;
      instructions.push(instruction); index++;
    }
    if (!instructions.length) throw new Error("该里程碑无法装入交易，请检查描述长度。");
    await send(instructions, `添加里程碑 ${start + 1}–${index}/${plan.milestones.length}`, plan.address);
    project = await fetchProject(connection, address);
    if (!project || project.milestoneCount < index) throw new Error("链上追加进度尚未同步，请刷新后继续。");
    index = project.milestoneCount;
  }
  await send([await manageInstruction(connection, address, buyer, "finalize")], "确认项目条款", plan.address);
  removePlan(plan);
  return address;
}
