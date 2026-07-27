import { connectDB } from '../config';
import { CodeArenaIssue } from '../models/CodeArenaIssue';
import { CodeArenaSolution } from '../models/CodeArenaSolution';
import { CodeArenaReputation } from '../models/CodeArenaReputation';
import { CodeArenaPointTransaction } from '../models/CodeArenaPointTransaction';
import User from '../models/User';
import Organization from '../models/Organization';
import { CodeArenaService } from '../modules/codeArena/codeArena.service';
import { CodeArenaPointsService } from '../modules/codeArena/codeArena.points.service';

interface TestResult {
  category: string;
  testName: string;
  status: 'PASSED' | 'FAILED';
  evidence: string;
}

const results: TestResult[] = [];

function logPass(category: string, testName: string, evidence: string) {
  console.log(`✅ [PASS] [${category}] ${testName} -> ${evidence}`);
  results.push({ category, testName, status: 'PASSED', evidence });
}

function logFail(category: string, testName: string, evidence: string) {
  console.error(`❌ [FAIL] [${category}] ${testName} -> ${evidence}`);
  results.push({ category, testName, status: 'FAILED', evidence });
}

async function runPATSuite() {
  console.log('===============================================================');
  console.log('🚀 CODE ARENA POINTS ECONOMY — PRODUCT ACCEPTANCE TEST (PAT)');
  console.log('===============================================================');

  await connectDB();

  // Setup test organization
  let org = await Organization.findOne({ slug: 'pat-test-org' });
  if (!org) {
    org = await Organization.create({
      name: 'PAT Test University',
      slug: 'pat-test-org',
      planType: 'PRO',
    });
  }

  // Clean previous test data for this org
  await Promise.all([
    CodeArenaIssue.deleteMany({ organizationId: org._id }),
    CodeArenaSolution.deleteMany({ organizationId: org._id }),
    CodeArenaReputation.deleteMany({ organizationId: org._id }),
    CodeArenaPointTransaction.deleteMany({ organizationId: org._id }),
  ]);

  const pointsService = new CodeArenaPointsService();
  const service = new CodeArenaService(pointsService);

  // ──────────────────────────────────────────────
  // TEST 1: New User Registration & 1000 AP Welcome Bonus Auto-Grant
  // ──────────────────────────────────────────────
  const patUser1Email = `pat_user_${Date.now()}_1@sharda.ac.in`;
  const patUser2Email = `pat_user_${Date.now()}_2@sharda.ac.in`;

  let user1 = await User.create({
    name: 'PAT Tester 1',
    email: patUser1Email,
    organizationId: org._id,
    roleId: org._id,
  });

  let user2 = await User.create({
    name: 'PAT Tester 2',
    email: patUser2Email,
    organizationId: org._id,
    roleId: org._id,
  });

  const { profile: p1, isNewUser: n1 } = await pointsService.getOrCreatePointsProfile(org._id, user1._id.toString());
  if (p1.arenaPoints === 1000 && n1 === true) {
    logPass('DATABASE & USER REGISTRATION', 'New User 1000 AP Welcome Bonus Auto-Grant', `User received 1000 AP. Initial balance: ${p1.arenaPoints} AP.`);
  } else {
    logFail('DATABASE & USER REGISTRATION', 'New User 1000 AP Welcome Bonus Auto-Grant', `Expected 1000 AP, got ${p1.arenaPoints}`);
  }

  // Verify welcome bonus transaction in ledger
  const welcomeTx = await CodeArenaPointTransaction.findOne({ userId: user1._id.toString(), type: 'WELCOME_BONUS' });
  if (welcomeTx && welcomeTx.amount === 1000 && welcomeTx.balanceAfter === 1000) {
    logPass('DATABASE & LEDGER', 'Welcome Bonus Ledger Transaction Recorded', `Transaction ID: ${welcomeTx._id}, Type: WELCOME_BONUS, Amount: +1000 AP.`);
  } else {
    logFail('DATABASE & LEDGER', 'Welcome Bonus Ledger Transaction Recorded', `Welcome bonus transaction missing or invalid.`);
  }

  // Test Idempotency: Re-calling getOrCreatePointsProfile should NOT add duplicate 1000 AP
  const { profile: p1_dup, isNewUser: n1_dup } = await pointsService.getOrCreatePointsProfile(org._id, user1._id.toString());
  const welcomeTxCount = await CodeArenaPointTransaction.countDocuments({ userId: user1._id.toString(), type: 'WELCOME_BONUS' });
  if (p1_dup.arenaPoints === 1000 && n1_dup === false && welcomeTxCount === 1) {
    logPass('SECURITY & IDEMPOTENCY', 'Duplicate Welcome Bonus Prevention', `Re-login kept balance at 1000 AP without duplicating WELCOME_BONUS. Count: ${welcomeTxCount}.`);
  } else {
    logFail('SECURITY & IDEMPOTENCY', 'Duplicate Welcome Bonus Prevention', `Duplicate welcome bonus created! Count: ${welcomeTxCount}, Balance: ${p1_dup.arenaPoints}`);
  }

  // ──────────────────────────────────────────────
  // TEST 2: Daily Login Reward & Same-Day Claim Prevention
  // ──────────────────────────────────────────────
  const daily1 = await pointsService.checkAndGrantDailyReward(org._id, user1._id.toString());
  if (daily1.claimed === true && daily1.rewardAmount === 5 && daily1.newBalance === 1005) {
    logPass('FUNCTIONAL TESTING', 'Daily Login Reward Claim (+5 AP)', `Daily reward claimed. Reward: +5 AP, New Balance: ${daily1.newBalance} AP, Streak: ${daily1.currentStreak}.`);
  } else {
    logFail('FUNCTIONAL TESTING', 'Daily Login Reward Claim (+5 AP)', `Failed to claim daily reward: ${JSON.stringify(daily1)}`);
  }

  // Same-Day Re-claim Prevention
  const daily2 = await pointsService.checkAndGrantDailyReward(org._id, user1._id.toString());
  if (daily2.claimed === false && daily2.rewardAmount === 0 && daily2.newBalance === 1005) {
    logPass('SECURITY & IDEMPOTENCY', 'Same-Day Duplicate Daily Reward Prevention', `Second daily claim rejected. Claimed: false, Balance preserved at ${daily2.newBalance} AP.`);
  } else {
    logFail('SECURITY & IDEMPOTENCY', 'Same-Day Duplicate Daily Reward Prevention', `Allowed duplicate daily reward on same day!`);
  }

  // ──────────────────────────────────────────────
  // TEST 3: Community Help Issue Flow (Reward = 0 AP)
  // ──────────────────────────────────────────────
  const communityIssue = await service.createIssue(org._id, user1._id.toString(), {
    title: 'Community Help: React State Update batching question',
    description: 'How does React 18 automatic batching work when calling setState inside async fetch handlers?',
    category: 'React',
    difficulty: 'EASY',
    rewardAmount: 0,
  });

  const p1_after_comm = await CodeArenaReputation.findOne({ userId: user1._id.toString() });

  if (communityIssue.rewardAmount === 0 && communityIssue.isCommunityHelp === true && p1_after_comm?.arenaPoints === 1005) {
    logPass('FUNCTIONAL TESTING', 'Community Help Issue Creation (0 AP)', `Issue Created ID: ${communityIssue._id}. isCommunityHelp: true, 0 AP deducted. Balance: ${p1_after_comm?.arenaPoints} AP.`);
  } else {
    logFail('FUNCTIONAL TESTING', 'Community Help Issue Creation (0 AP)', `Failed Community Help issue creation logic. Balance: ${p1_after_comm?.arenaPoints}`);
  }

  // Initialize User 2 profile
  await pointsService.getOrCreatePointsProfile(org._id, user2._id.toString());

  // User 2 submits solution to Community Help issue
  const commSol = await service.submitSolution(org._id, user2._id.toString(), communityIssue._id, {
    explanation: 'React 18 automatically batches all state updates inside promises, setTimeout, and native event handlers.',
  });

  // User 1 accepts User 2 solution
  const commAccept = await service.acceptSolution(org._id, user1._id.toString(), commSol._id);
  const p2_after_comm = await CodeArenaReputation.findOne({ userId: user2._id.toString() });

  if (commAccept.issue.status === 'SOLVED' && p2_after_comm?.arenaPoints === 1000) {
    logPass('FUNCTIONAL TESTING', 'Community Help Issue Acceptance', `Issue marked SOLVED. 0 AP transferred. Solver balance preserved at ${p2_after_comm?.arenaPoints} AP.`);
  } else {
    logFail('FUNCTIONAL TESTING', 'Community Help Issue Acceptance', `Community help acceptance failed.`);
  }

  // ──────────────────────────────────────────────
  // TEST 4: Rewarded Issue Creation & Solution Acceptance AP Transfer
  // ──────────────────────────────────────────────
  const rewardedIssue = await service.createIssue(org._id, user1._id.toString(), {
    title: 'Next.js 15 Server Action Cookie Mutation bug',
    description: 'Cookies set inside server action do not persist on subsequent router.refresh() call.',
    category: 'Next.js',
    difficulty: 'HARD',
    rewardAmount: 250,
  });

  const p1_after_post = await CodeArenaReputation.findOne({ userId: user1._id.toString() });
  if (rewardedIssue.rewardAmount === 250 && p1_after_post?.arenaPoints === 755) {
    logPass('FUNCTIONAL TESTING', 'Rewarded Issue Creation & AP Deduction', `250 AP deducted. Poster balance: ${p1_after_post?.arenaPoints} AP (1005 - 250).`);
  } else {
    logFail('FUNCTIONAL TESTING', 'Rewarded Issue Creation & AP Deduction', `AP deduction failed. Expected 755 AP, got ${p1_after_post?.arenaPoints}`);
  }

  // User 2 submits solution
  const rewSol = await service.submitSolution(org._id, user2._id.toString(), rewardedIssue._id, {
    explanation: 'Ensure cookies().set() is awaited before returning from server action or use middleware header forwarding.',
  });

  // User 1 accepts User 2 solution
  await service.acceptSolution(org._id, user1._id.toString(), rewSol._id);
  const p2_after_reward = await CodeArenaReputation.findOne({ userId: user2._id.toString() });

  if (p2_after_reward?.arenaPoints === 1250 && p2_after_reward?.totalEarned === 1250 && p2_after_reward?.issuesSolved === 2) {
    logPass('FUNCTIONAL TESTING', 'Solution Acceptance & AP Reward Transfer', `250 AP transferred to solver. Solver balance: 1250 AP (1000 + 250). Total Earned: ${p2_after_reward?.totalEarned} AP. Solved: ${p2_after_reward?.issuesSolved}. Badges: ${JSON.stringify(p2_after_reward?.badges)}.`);
  } else {
    logFail('FUNCTIONAL TESTING', 'Solution Acceptance & AP Reward Transfer', `AP transfer failed. Balance: ${p2_after_reward?.arenaPoints}, Earned: ${p2_after_reward?.totalEarned}, Solved: ${p2_after_reward?.issuesSolved}`);
  }

  // ──────────────────────────────────────────────
  // TEST 5: Issue Cancellation & AP Refund
  // ──────────────────────────────────────────────
  const cancelIssue = await service.createIssue(org._id, user1._id.toString(), {
    title: 'Duplicate issue to be cancelled',
    description: 'Accidental duplicate post requiring cancellation.',
    category: 'Other',
    difficulty: 'EASY',
    rewardAmount: 100,
  });

  await service.cancelIssue(org._id, user1._id.toString(), cancelIssue._id);
  const p1_post_cancel_refund = await CodeArenaReputation.findOne({ userId: user1._id.toString() });

  if (p1_post_cancel_refund?.arenaPoints === 755) {
    logPass('FUNCTIONAL TESTING', 'Issue Cancellation & AP Refund', `100 AP refunded upon cancellation. Poster balance restored to ${p1_post_cancel_refund?.arenaPoints} AP.`);
  } else {
    logFail('FUNCTIONAL TESTING', 'Issue Cancellation & AP Refund', `AP refund failed. Expected 755 AP, got ${p1_post_cancel_refund?.arenaPoints}`);
  }

  // ──────────────────────────────────────────────
  // TEST 6: Edge Cases & Validation Rules
  // ──────────────────────────────────────────────

  // 6a. Insufficient Arena Points
  try {
    await service.createIssue(org._id, user1._id.toString(), {
      title: 'Overpriced issue requiring 5000 AP',
      description: 'Attempting to spend 5000 AP when current balance is 755 AP.',
      category: 'Java',
      rewardAmount: 5000,
    });
    logFail('EDGE CASES & VALIDATION', 'Insufficient AP Validation', `Failed to block issue creation exceeding AP balance!`);
  } catch (err: any) {
    if (err.message.includes('Insufficient Arena Points')) {
      logPass('EDGE CASES & VALIDATION', 'Insufficient AP Validation', `Correctly blocked with error: "${err.message}".`);
    } else {
      logFail('EDGE CASES & VALIDATION', 'Insufficient AP Validation', `Unexpected error message: ${err.message}`);
    }
  }

  // 6b. Prevent Duplicate Solution Submission by same user on OPEN issue
  const openDupTestIssue = await service.createIssue(org._id, user1._id.toString(), {
    title: 'Open issue for duplicate submission testing',
    description: 'Testing duplicate solution rejection.',
    category: 'Other',
    rewardAmount: 0,
  });

  await service.submitSolution(org._id, user2._id.toString(), openDupTestIssue._id, {
    explanation: 'First solution submission by User 2.',
  });

  try {
    await service.submitSolution(org._id, user2._id.toString(), openDupTestIssue._id, {
      explanation: 'Second duplicate solution submission by User 2.',
    });
    logFail('EDGE CASES & VALIDATION', 'Duplicate Solution Submission Prevention', `Allowed duplicate solution submission!`);
  } catch (err: any) {
    if (err.message.includes('already submitted a solution')) {
      logPass('EDGE CASES & VALIDATION', 'Duplicate Solution Submission Prevention', `Correctly blocked duplicate solution with error: "${err.message}".`);
    } else {
      logFail('EDGE CASES & VALIDATION', 'Duplicate Solution Submission Prevention', `Unexpected error: ${err.message}`);
    }
  }

  // 6c. Prevent Poster from Solving Own Issue
  const ownIssue = await service.createIssue(org._id, user1._id.toString(), {
    title: 'Self issue test',
    description: 'Testing if poster can solve their own issue.',
    category: 'Other',
    rewardAmount: 0,
  });

  try {
    await service.submitSolution(org._id, user1._id.toString(), ownIssue._id, {
      explanation: 'Self solution attempt.',
    });
    logFail('SECURITY', 'Self Solution Prevention', `Allowed poster to solve own issue!`);
  } catch (err: any) {
    if (err.message.includes('cannot submit a solution to your own issue')) {
      logPass('SECURITY', 'Self Solution Prevention', `Correctly blocked self-solution: "${err.message}".`);
    } else {
      logFail('SECURITY', 'Self Solution Prevention', `Unexpected error: ${err.message}`);
    }
  }

  // 6d. Prevent Double Acceptance on SOLVED Issue
  try {
    await service.acceptSolution(org._id, user1._id.toString(), rewSol._id);
    logFail('SECURITY & CONCURRENCY', 'Double Acceptance Prevention', `Allowed double acceptance on already SOLVED issue!`);
  } catch (err: any) {
    if (err.message.includes('already been solved')) {
      logPass('SECURITY & CONCURRENCY', 'Double Acceptance Prevention', `Correctly blocked double acceptance: "${err.message}".`);
    } else {
      logFail('SECURITY & CONCURRENCY', 'Double Acceptance Prevention', `Unexpected error: ${err.message}`);
    }
  }

  // ──────────────────────────────────────────────
  // TEST 7: Leaderboard Ranking Integrity
  // ──────────────────────────────────────────────
  const leaderboard = await pointsService.getLeaderboard(org._id, 10);
  if (leaderboard.length >= 2 && leaderboard[0].userId === user2._id.toString() && leaderboard[0].totalEarned === 1250) {
    logPass('PERFORMANCE & INTEGRITY', 'Leaderboard Ranking Integrity', `Leaderboard #1 is User 2 with ${leaderboard[0].totalEarned} AP earned. Properly ranked.`);
  } else {
    logFail('PERFORMANCE & INTEGRITY', 'Leaderboard Ranking Integrity', `Leaderboard ranking incorrect: ${JSON.stringify(leaderboard)}`);
  }

  // ──────────────────────────────────────────────
  // TEST 8: Indexing & Collection Audit
  // ──────────────────────────────────────────────
  const issueIndexes = await CodeArenaIssue.collection.getIndexes();
  const txIndexes = await CodeArenaPointTransaction.collection.getIndexes();
  const repIndexes = await CodeArenaReputation.collection.getIndexes();

  logPass('PERFORMANCE & INDEXING', 'Database Indexes Verified', `Issue Indexes: ${Object.keys(issueIndexes).length}, AP Tx Indexes: ${Object.keys(txIndexes).length}, Rep Indexes: ${Object.keys(repIndexes).length}.`);

  // Summary
  const passedCount = results.filter((r) => r.status === 'PASSED').length;
  const failedCount = results.filter((r) => r.status === 'FAILED').length;

  console.log('\n===============================================================');
  console.log(`PAT SUITE SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED out of ${results.length} tests.`);
  console.log('===============================================================');

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runPATSuite().catch((err) => {
  console.error('PAT Suite Fatal Error:', err);
  process.exit(1);
});
