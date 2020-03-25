export function invertHash(object: Record<string, any>) {
  const inverted: Record<string, any> = {};
  for (const x in object) {
    inverted[object[x]] = x;
  }

  return inverted;
}

/** For issues that must be addressed before a new release can be shipped (such as new attributes or new game mechanics) */
export function fatal(...log: any[]) {
  console.error(...log);
  return new Error('Fatal Error encountered. Refer to the logs.');
}
