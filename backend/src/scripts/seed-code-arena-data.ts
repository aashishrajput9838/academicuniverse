import { connectDB } from '../config';
import { CodeArenaIssue } from '../models/CodeArenaIssue';
import { CodeArenaSolution } from '../models/CodeArenaSolution';
import { CodeArenaReputation } from '../models/CodeArenaReputation';
import { CodeArenaPointTransaction } from '../models/CodeArenaPointTransaction';
import User from '../models/User';
import Organization from '../models/Organization';
import { CodeArenaService } from '../modules/codeArena/codeArena.service';
import { CodeArenaPointsService } from '../modules/codeArena/codeArena.points.service';

async function seedCodeArenaData() {
  console.log('=== SEEDING CODE ARENA POINTS ECONOMY TEST DATA ===');
  await connectDB();

  let org = await Organization.findOne({});
  if (!org) {
    org = await Organization.create({
      name: 'Sharda University',
      slug: 'sharda-univ',
      planType: 'PRO',
    });
  }

  let studentA = await User.findOne({ email: 'poster@sharda.ac.in' });
  if (!studentA) {
    studentA = await User.create({
      name: 'Aashish Rajput (Poster)',
      email: 'poster@sharda.ac.in',
      organizationId: org._id,
      roleId: org._id,
    });
  }

  let studentB = await User.findOne({ email: 'solver@sharda.ac.in' });
  if (!studentB) {
    studentB = await User.create({
      name: 'Priya Sharma (Solver)',
      email: 'solver@sharda.ac.in',
      organizationId: org._id,
      roleId: org._id,
    });
  }

  const pointsService = new CodeArenaPointsService();
  const service = new CodeArenaService(pointsService);

  // 1. Verify 1000 AP Welcome Bonus auto-grant for Student A & B
  console.log('\n[TEST 1000 AP WELCOME BONUS] Initializing points profile...');
  const { profile: profA, isNewUser: newA } = await pointsService.getOrCreatePointsProfile(org._id, studentA._id.toString());
  const { profile: profB, isNewUser: newB } = await pointsService.getOrCreatePointsProfile(org._id, studentB._id.toString());

  console.log(`[VERIFY WELCOME BONUS] Student A AP: ${profA.arenaPoints} AP (New: ${newA}), Student B AP: ${profB.arenaPoints} AP (New: ${newB})`);

  // 2. Test Daily Reward Claim (+5 AP)
  console.log('\n[TEST DAILY LOGIN REWARD] Claiming daily login reward for Student A...');
  const dailyRes = await pointsService.checkAndGrantDailyReward(org._id, studentA._id.toString());
  console.log(`[VERIFY DAILY REWARD] Claimed: ${dailyRes.claimed}, Reward: +${dailyRes.rewardAmount} AP, New Balance: ${dailyRes.newBalance} AP`);

  // 3. Create Issue with 100 AP reward (Deducts 100 AP immediately)
  console.log('\n[TEST CREATE ISSUE] Student A posting issue with 100 AP reward...');
  const issue = await service.createIssue(org._id, studentA._id.toString(), {
    title: 'Hydration Mismatch in Next.js 15 App Router Canvas component',
    description: 'When initializing a dynamic WebGL canvas in `useEffect`, Next.js 15 throws `Hydration failed because the initial UI does not match what was rendered on the server`. Need help structuring dynamic import.',
    category: 'React',
    difficulty: 'MEDIUM',
    rewardAmount: 100,
    programmingLanguage: 'TypeScript',
    framework: 'Next.js',
    techStack: ['React', 'Next.js', 'Canvas', 'WebGL'],
    errorLogs: 'Error: Hydration failed because the initial UI does not match what was rendered on the server.',
  });

  console.log(`[VERIFY ISSUE CREATED] Issue ID: ${issue._id}, AP Reward: ${issue.rewardAmount} AP`);

  const { profile: postIssueProfA } = await pointsService.getOrCreatePointsProfile(org._id, studentA._id.toString());
  console.log(`[VERIFY POST-ISSUE BALANCE] Student A AP Balance: ${postIssueProfA.arenaPoints} AP`);

  // 4. Student B submits solution
  console.log('\n[TEST SUBMIT SOLUTION] Student B submitting solution...');
  const solution = await service.submitSolution(org._id, studentB._id.toString(), issue._id, {
    explanation: 'The issue happens because WebGL/Canvas APIs access `window` which is not available during SSR. Use `dynamic()` with `{ ssr: false }`.',
    codeSnippets: [
      `import dynamic from 'next/dynamic';\n\nconst CanvasComponent = dynamic(() => import('./CanvasComponent'), { ssr: false });`,
    ],
    githubCommitUrl: 'https://github.com/aashishrajput9838/academicuniverse/commit/167b365',
  });

  console.log(`[VERIFY SOLUTION SUBMITTED] Solution ID: ${solution._id}, Submitter: ${solution.submitterName}`);

  // 5. Student A accepts Student B's solution (Transfers 100 AP to Student B)
  console.log('\n[TEST ACCEPT SOLUTION] Student A accepting Student B solution...');
  const acceptRes = await service.acceptSolution(org._id, studentA._id.toString(), solution._id);

  console.log(`[VERIFY ACCEPTANCE] Issue Status: ${acceptRes.issue.status}`);

  // 6. Verify final AP balances
  const { profile: finalProfA } = await pointsService.getOrCreatePointsProfile(org._id, studentA._id.toString());
  const { profile: finalProfB } = await pointsService.getOrCreatePointsProfile(org._id, studentB._id.toString());

  console.log(`\n=== FINAL ARENA POINTS BALANCES ===`);
  console.log(`Student A (Poster): Current = ${finalProfA.arenaPoints} AP, Spent = ${finalProfA.totalSpent} AP`);
  console.log(`Student B (Solver): Current = ${finalProfB.arenaPoints} AP, Earned = ${finalProfB.totalEarned} AP, Badges = ${JSON.stringify(finalProfB.badges)}`);

  console.log('\n=== CODE ARENA AP POINTS ECONOMY TEST COMPLETE ===');
  process.exit(0);
}

seedCodeArenaData().catch((err) => {
  console.error('Seed Code Arena AP Error:', err);
  process.exit(1);
});
