export function classNames(base: string, conditional: Record<string, boolean> = {}) {
  const additionalClassNames = Object.entries(conditional)
    .filter(([, condition]) => condition)
    .map(([className]) => className);

  return [base].concat(additionalClassNames).join(" ");
}
