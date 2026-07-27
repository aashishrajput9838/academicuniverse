import { connectDB } from '../config';
import { CodeArenaIssue } from '../models/CodeArenaIssue';
import { CodeArenaSolution } from '../models/CodeArenaSolution';
import { CodeArenaWallet } from '../models/CodeArenaWallet';
import { CodeArenaTransaction } from '../models/CodeArenaTransaction';
import { CodeArenaReputation } from '../models/CodeArenaReputation';
import User from '../models/User';
import Organization from '../models/Organization';
import { CodeArenaService } from '../modules/codeArena/codeArena.service';
import { CodeArenaWalletService } from '../modules/codeArena/codeArena.wallet.service';

async function seedCodeArenaData() {
  console.log('=== SEEDING CODE ARENA REAL TEST DATA ===');
  await connectDB();

  // Find or create default Organization
  let org = await Organization.findOne({});
  if (!org) {
    org = await Organization.create({
      name: 'Sharda University',
      slug: 'sharda-univ',
      planType: 'PRO',
    });
  }

  // Find or create Student A (Issue Poster)
  let studentA = await User.findOne({ email: 'poster@sharda.ac.in' });
  if (!studentA) {
    studentA = await User.create({
      name: 'Aashish Rajput (Poster)',
      email: 'poster@sharda.ac.in',
      organizationId: org._id,
      roleId: org._id, // mock role ID
    });
  }

  // Find or create Student B (Solution Submitter)
  let studentB = await User.findOne({ email: 'solver@sharda.ac.in' });
  if (!studentB) {
    studentB = await User.create({
      name: 'Priya Sharma (Solver)',
      email: 'solver@sharda.ac.in',
      organizationId: org._id,
      roleId: org._id,
    });
  }

  const walletService = new CodeArenaWalletService();
  const service = new CodeArenaService(walletService);

  // 1. Verify wallets start at 0
  const walletA = await walletService.getOrCreateWallet(org._id, studentA._id.toString());
  const walletB = await walletService.getOrCreateWallet(org._id, studentB._id.toString());
  console.log(`[VERIFY 0-START] Student A balance: ${walletA.balance} CR, Student B balance: ${walletB.balance} CR`);

  // 2. Deposit 500 CR into Student A's wallet
  console.log('\n[TEST DEPOSIT] Depositing 500 CR into Student A wallet...');
  await walletService.deposit(org._id, studentA._id.toString(), 500, 'Test Deposit');
  const updatedWalletA = await walletService.getOrCreateWallet(org._id, studentA._id.toString());
  console.log(`[VERIFY DEPOSIT] Student A balance: ${updatedWalletA.balance} CR`);

  // 3. Create Issue with 200 CR reward
  console.log('\n[TEST CREATE ISSUE] Student A posting issue with 200 CR reward...');
  const issue = await service.createIssue(org._id, studentA._id.toString(), {
    title: 'Hydration Mismatch in Next.js 15 App Router Canvas component',
    description: 'When initializing a dynamic WebGL canvas in `useEffect`, Next.js 15 throws `Hydration failed because the initial UI does not match what was rendered on the server`. Need help structuring dynamic import.',
    category: 'React',
    difficulty: 'MEDIUM',
    rewardAmount: 200,
    programmingLanguage: 'TypeScript',
    framework: 'Next.js',
    techStack: ['React', 'Next.js', 'Canvas', 'WebGL'],
    errorLogs: 'Error: Hydration failed because the initial UI does not match what was rendered on the server.\n  at HTMLDocument.eval (app-index.js:14)',
  });

  console.log(`[VERIFY ESCROW LOCK] Issue Created ID: ${issue._id}, Escrow Status: ${issue.escrowStatus}`);
  const postLockWalletA = await walletService.getOrCreateWallet(org._id, studentA._id.toString());
  console.log(`[VERIFY POST-LOCK WALLET] Student A Available Balance: ${postLockWalletA.balance} CR, Locked Balance: ${postLockWalletA.lockedBalance} CR`);

  // 4. Student B submits solution
  console.log('\n[TEST SUBMIT SOLUTION] Student B submitting solution...');
  const solution = await service.submitSolution(org._id, studentB._id.toString(), issue._id, {
    explanation: 'The issue happens because WebGL/Canvas APIs access `window` which is not available during SSR. Use `dynamic()` with `{ ssr: false }` or check `typeof window !== "undefined"` inside a mounting `useEffect`.',
    codeSnippets: [
      `import dynamic from 'next/dynamic';\n\nconst CanvasComponent = dynamic(() => import('./CanvasComponent'), { ssr: false });`,
    ],
    githubCommitUrl: 'https://github.com/aashishrajput9838/academicuniverse/commit/167b365',
  });

  console.log(`[VERIFY SOLUTION SUBMITTED] Solution ID: ${solution._id}, Submitter: ${solution.submitterName}`);

  // 5. Student A accepts Student B's solution
  console.log('\n[TEST ACCEPT SOLUTION] Student A accepting Student B solution...');
  const acceptRes = await service.acceptSolution(org._id, studentA._id.toString(), solution._id);

  console.log(`[VERIFY ACCEPTANCE] Issue Status: ${acceptRes.issue.status}, Escrow Status: ${acceptRes.issue.escrowStatus}`);

  // 6. Verify final balances & transaction audit trail
  const finalWalletA = await walletService.getOrCreateWallet(org._id, studentA._id.toString());
  const finalWalletB = await walletService.getOrCreateWallet(org._id, studentB._id.toString());
  console.log(`\n=== FINAL WALLET BALANCES ===`);
  console.log(`Student A (Poster): Balance = ${finalWalletA.balance} CR, Locked = ${finalWalletA.lockedBalance} CR, Spent = ${finalWalletA.totalSpent} CR`);
  console.log(`Student B (Solver): Balance = ${finalWalletB.balance} CR, Earned = ${finalWalletB.totalEarned} CR`);

  // 7. Verify reputation
  const repB = await service.getReputation(org._id, studentB._id.toString());
  console.log(`\n=== SOLVER REPUTATION ===`);
  console.log(`Student B Points: ${repB.totalPoints}, Solved: ${repB.issuesSolved}, Badges: ${JSON.stringify(repB.badges)}`);

  console.log('\n=== CODE ARENA VERIFICATION TEST COMPLETE ===');
  process.exit(0);
}

seedCodeArenaData().catch((err) => {
  console.error('Seed Code Arena Error:', err);
  process.exit(1);
});
