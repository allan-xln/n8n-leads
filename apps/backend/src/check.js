import { getConfig } from "./services/configStore.js";
import { runLeadQualification } from "./services/leadOrchestrator.js";

async function main() {
  const config = await getConfig();
  const batch = await runLeadQualification(config, { limit: 5 });

  console.log(
    JSON.stringify(
      {
        configLoaded: true,
        qualifiedLeadCount: batch.summary.totalQualified,
        averageScore: batch.summary.averageScore
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
