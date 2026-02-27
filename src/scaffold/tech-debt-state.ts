export function generateTechDebtState(): string {
  return JSON.stringify(
    {
      lastTechDebtAtFeature: 0,
      threshold: 3,
    },
    null,
    2
  );
}
