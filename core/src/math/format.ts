const formatter = new Intl.NumberFormat("en-US", { notation: "compact" });

export const compactNumber = (n: number): string =>
  formatter.format(parseInt(n.toFixed(0)));
