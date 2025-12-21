
import { BalanceAnalysis } from "./BalanceAnalysis";

const filterNonOk = process.argv.includes("--filter");
BalanceAnalysis.run(filterNonOk);
