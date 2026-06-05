export const CURRENT_APP_VERSION = __APP_VERSION__ || "1.0.0";

function normalizeVersion(version: string) {
  const [mainPart = "0"] = String(version || "0").split("-");
  return mainPart
    .split(".")
    .slice(0, 3)
    .map((part) => Number.parseInt(part.replace(/\D/g, ""), 10) || 0);
}

export function compareAppVersions(leftVersion: string, rightVersion: string) {
  const left = normalizeVersion(leftVersion);
  const right = normalizeVersion(rightVersion);
  const maxLength = Math.max(left.length, right.length, 3);

  for (let index = 0; index < maxLength; index += 1) {
    const leftPart = left[index] ?? 0;
    const rightPart = right[index] ?? 0;

    if (leftPart > rightPart) return 1;
    if (leftPart < rightPart) return -1;
  }

  return 0;
}

export function isAppVersionOlder(currentVersion: string, targetVersion: string) {
  return compareAppVersions(currentVersion, targetVersion) < 0;
}
