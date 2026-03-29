import path from "node:path";
import {
  loadAnswers,
  parseArgs,
  runWindowsCertification,
  writeJson,
} from "./verification-lib.ts";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const dryRun = args.dryRun === true;
  const outputDir = typeof args.outputDir === "string"
    ? path.resolve(args.outputDir)
    : path.resolve(process.cwd(), "artifacts", "os-certification");
  const profile = typeof args.profile === "string" ? args.profile : "gaming_desktop";
  const preset = (typeof args.preset === "string" ? args.preset : "balanced") as "conservative" | "balanced" | "aggressive";
  const priority = (typeof args.priority === "string" ? args.priority : "tier1") as "tier1" | "tier2" | "tier3" | "all";
  const answersPath = typeof args.answersPath === "string" ? path.resolve(args.answersPath) : undefined;

  if (dryRun || !process.platform.startsWith("win")) {
    const answers = loadAnswers(answersPath);
    writeJson(path.join(outputDir, "dry-run.json"), {
      profile,
      preset,
      priority,
      platform: process.platform,
      answers,
      note: "Dry run only. Execute this harness on a real consumer Windows machine for apply/readback/rollback proof.",
    });
    console.log(JSON.stringify({
      outputDir,
      dryRun: true,
      platform: process.platform,
      note: "Consumer Windows proof is required for runtime certification.",
    }, null, 2));
    return;
  }

  const result = await runWindowsCertification({
    answersPath,
    outputDir,
    profile,
    preset,
    priority,
    windowsBuild: typeof args.windowsBuild === "string" ? Number.parseInt(args.windowsBuild, 10) : undefined,
    serviceExe: typeof args.serviceExe === "string" ? path.resolve(args.serviceExe) : undefined,
  });

  writeJson(path.join(outputDir, "blocked-actions.json"), result.blockedActions);
  console.log(JSON.stringify(result.summary, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});
