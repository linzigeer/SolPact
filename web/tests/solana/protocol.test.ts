import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const solRequire = createRequire(resolve('../solana/package.json'));
const { Runtime } = solRequire('./tests/helpers/runtime.ts');
const { MINT, START_TIME, USDC } = solRequire('./tests/helpers/pdas.ts');
import { Keypair, PublicKey, VersionedTransaction } from '@solana/web3.js';
const { FailedTransactionMetadata } = createRequire(resolve('../solana/package.json'))('litesvm');
import { PROGRAM_ID } from '../../solana/config';
import { draftInstructions, addInstruction, manageInstruction, depositInstructions, milestoneInstructions, fetchDetails, fetchProject, projectPda, parseUsdc, parseRoles, validateText, type CreationPlan } from '../../solana/protocol';
import { assemble, packetFits } from '../../solana/transactions';
import { continueCreation } from '../../solana/creation';
process.chdir(resolve('../solana'));
const storage=new Map<string,string>();(globalThis as any).window={};(globalThis as any).localStorage={getItem:(k:string)=>storage.get(k)||null,setItem:(k:string,v:string)=>storage.set(k,v)};
const r=new Runtime();
const connection={getAccountInfo:async(key:PublicKey)=>{const info=r.svm.getAccount(key);return info?{...info,data:Buffer.from(info.data)}:null},getMultipleAccountsInfo:async(keys:PublicKey[])=>Promise.all(keys.map(key=>(connection as any).getAccountInfo(key)))} as any;
const plan=(amounts:bigint[],arb=r.arbitrator.publicKey):CreationPlan=>{const id=crypto.getRandomValues(new Uint8Array(16));return{version:1,buyer:r.buyer.publicKey.toBase58(),seller:r.seller.publicKey.toBase58(),arbitrator:arb?.toBase58()||null,idHex:Buffer.from(id).toString('hex'),address:projectPda(r.buyer.publicKey,id).toBase58(),window:'3600',milestones:amounts.map((amount,i)=>({amount:amount.toString(),deadline:(START_TIME+BigInt(7200+i*3600)).toString(),description:'UI '+i}))}};
let signatureCounter=0;
const send=async(instructions:any[],label:string,address:string)=>{
 r.svm.expireBlockhash();const unsigned=assemble(instructions,r.buyer.publicKey,r.svm.latestBlockhash());unsigned.sign([r.buyer]);const raw=unsigned.serialize();assert.ok(raw.length<=1232);const result=r.svm.sendTransaction(VersionedTransaction.deserialize(raw));if(result instanceof FailedTransactionMetadata)throw new Error(result.meta().logs().join('\n'));return{signature:String(++signatureCounter),blockhash:r.svm.latestBlockhash(),lastValidBlockHeight:100,label,project:address,actor:r.buyer.publicKey.toBase58(),status:'confirmed' as const,time:Date.now()};
};
async function run(){
 assert.equal(parseUsdc('0.000001'),1n);assert.equal(parseUsdc('9007199254.740993'),9007199254740993n);for(const bad of ['0','-1','1e3','1.0000001','18446744073709.551616'])assert.throws(()=>parseUsdc(bad));assert.throws(()=>parseRoles(r.buyer.publicKey,r.buyer.publicKey.toBase58(),''));assert.throws(()=>validateText('中'.repeat(86)));
 const p=plan([2n*USDC,3n*USDC]);await continueCreation(connection,p,send);
 let detail=(await fetchDetails(connection,new PublicKey(p.address)))!;assert.equal(detail.project.status,'created');assert.equal(detail.project.totalAmount,5n*USDC);assert.equal(detail.vaultBalance,0n);
 r.send(await depositInstructions(connection,detail.project),[r.buyer]);detail=(await fetchDetails(connection,new PublicKey(p.address)))!;assert.equal(detail.project.status,'funded');assert.equal(detail.vaultBalance,5n*USDC);
 r.send(await milestoneInstructions(connection,detail.project,r.seller.publicKey,0,'submit','https://example.com/design'),[r.seller]);r.send(await milestoneInstructions(connection,detail.project,r.buyer.publicKey,0,'approve'),[r.buyer]);detail=(await fetchDetails(connection,new PublicKey(p.address)))!;assert.equal(detail.project.sellerPaidAmount,2n*USDC);assert.equal(detail.vaultBalance,3n*USDC);
 r.send(await milestoneInstructions(connection,detail.project,r.seller.publicKey,1,'submit','ipfs://delivery'),[r.seller]);r.send(await milestoneInstructions(connection,detail.project,r.buyer.publicKey,1,'dispute'),[r.buyer]);r.send(await milestoneInstructions(connection,detail.project,r.arbitrator.publicKey,1,'resolve',7000),[r.arbitrator]);detail=(await fetchDetails(connection,new PublicKey(p.address)))!;assert.equal(detail.project.status,'completed');assert.equal(detail.project.sellerPaidAmount,4_100_000n);assert.equal(detail.project.buyerRefundedAmount,900_000n);assert.equal(detail.milestones[1].status,'resolved');
 const more=plan([USDC,USDC]);await continueCreation(connection,more,send);let project=(await fetchProject(connection,new PublicKey(more.address)))!;r.send(await depositInstructions(connection,project),[r.buyer]);project=(await fetchProject(connection,new PublicKey(more.address)))!;r.send(await milestoneInstructions(connection,project,r.seller.publicKey,0,'submit','https://example.com/file'),[r.seller]);r.setTime(START_TIME+4000n);r.send(await milestoneInstructions(connection,project,r.seller.publicKey,0,'autoRelease'),[r.seller]);r.setTime(START_TIME+12000n);r.send(await milestoneInstructions(connection,project,r.buyer.publicKey,1,'refund'),[r.buyer]);assert.equal((await fetchProject(connection,new PublicKey(more.address)))!.status,'completed');
 r.setTime(START_TIME);const cancelled=plan([USDC]);await send(await draftInstructions(connection,cancelled),'draft',cancelled.address);r.send([await manageInstruction(connection,new PublicKey(cancelled.address),r.buyer.publicKey,'cancel')],[r.buyer]);assert.equal((await fetchProject(connection,new PublicKey(cancelled.address)))!.status,'cancelled');
 const long=plan(Array.from({length:20},()=>1n));long.milestones.forEach(row=>row.description='x'.repeat(256));let rejected=false;let batches=0;try{await continueCreation(connection,long,async(ixs,label,address)=>{if(++batches===3){rejected=true;throw new Error('User rejected')}return send(ixs,label,address)})}catch{}assert.ok(rejected);const partial=(await fetchProject(connection,new PublicKey(long.address)))!;assert.ok(partial.milestoneCount>0&&partial.milestoneCount<20);await continueCreation(connection,long,send);assert.equal((await fetchProject(connection,new PublicKey(long.address)))!.status,'created');assert.equal((await fetchDetails(connection,new PublicKey(long.address)))!.milestones.length,20);
 console.log('PASS: production frontend SDK executes all 11 instructions on the actual SBF; exact accounting, 20-row packet sizing and rejected-signature recovery verified.');
}
run().catch(error=>{console.error(error);process.exit(1)});
