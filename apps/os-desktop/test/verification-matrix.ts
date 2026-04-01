import path from "node:path";
import {
  buildActionVerificationMatrix,
  buildQuestionPlanDeltas,
  ensureDir,
  parseArgs,
  writeJson,
  writeMatrixMarkdown,
} from "./verification-lib.ts";

const args = parseArgs(process.argv.slice(2));
const outputDir = typeof args.outputDir === "string"
  ? path.resolve(args.outputDir)
  : path.resolve(process.cwd(), "artifacts", "os-verification");
const check = args.check === true;

const questionPlanDeltas = buildQuestionPlanDeltas();
const matrix = buildActionVerificationMatrix();
const unsupported = matrix.filter((entry) => entry.currentProofStatus === "legacy / weak / needs redesign");

ensureDir(outputDir);
writeJson(path.join(outputDir, "question-plan-deltas.json"), questionPlanDeltas);
writeJson(path.join(outputDir, "action-verification-matrix.json"), matrix);
writeJson(path.join(outputDir, "verification-summary.json"), {
  questionCount: questionPlanDeltas.length,
  actionCount: matrix.length,
  proofStatusCounts: matrix.reduce<Record<string, number>>((acc, entry) => {
    acc[entry.currentProofStatus] = (acc[entry.currentProofStatus] ?? 0) + 1;
    return acc;
  }, {}),
  unsupportedActions: unsupported.map((entry) => entry.actionId),
});
writeMatrixMarkdown(path.join(outputDir, "action-verification-matrix.md"), matrix);

console.log(JSON.stringify({
  outputDir,
  questionCount: questionPlanDeltas.length,
  actionCount: matrix.length,
  unsupportedActions: unsupported.map((entry) => entry.actionId),
}, null, 2));

if (check && unsupported.length > 0) {
  process.exit(1);
}
