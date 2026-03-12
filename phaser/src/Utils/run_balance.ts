import { BalanceAnalysis } from "@Utils/BalanceAnalysis";

const filterNonOk = process.argv.includes("--filter");
BalanceAnalysis.run(filterNonOk);
