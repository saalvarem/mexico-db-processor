import { mkdirSync } from "fs";
import { dirname, resolve as resolvePath, isAbsolute, sep } from "path";
import moment, { Moment } from "moment";

export const srcDir = (): string => {
  return require?.main?.filename ? dirname(require.main.filename) : __dirname;
};

export const ensureDirExistsSync = (directory: string): void => {
  const baseDir = __dirname;
  const fullFilePath = resolvePath(srcDir(), directory);
  const fullPathParts = fullFilePath.split(sep);
  if (fullPathParts[fullPathParts.length - 1].indexOf(".") > 0) {
    fullPathParts.pop();
  }
  const targetDir: string = fullPathParts.join(sep);
  const initDir = isAbsolute(targetDir) ? sep : "";

  targetDir.split(sep).reduce((parentDir, childDir) => {
    const currDir = resolvePath(srcDir(), parentDir, childDir);
    try {
      mkdirSync(currDir);
    } catch (err) {
      if (err.code === "EEXIST") {
        // curDir already exists!
        return currDir;
      }
      // To avoid `EISDIR` error on Mac and `EACCES`-->`ENOENT` and `EPERM` on Windows.
      if (err.code === "ENOENT") {
        // Throw the original parentDir error on curDir `ENOENT` failure.
        throw new Error(`EACCES: permission denied, mkdir '${parentDir}'`);
      }

      const caughtErr = ["EACCES", "EPERM", "EISDIR"].indexOf(err.code) > -1;
      if (!caughtErr || (caughtErr && currDir === resolvePath(targetDir))) {
        throw err; // Throw if it's just the last created dir.
      }
    }
    return currDir;
  }, initDir);
};

export const timeDiffWith = (
  startTime: Moment,
  options: {
    d?: boolean;
    h?: boolean;
    m?: boolean;
    s?: boolean;
    ms?: boolean;
  } = { d: false, h: true, m: true, s: true, ms: true }
) => {
  const { d, h, m, s, ms } = options;
  const endTime = moment();
  let runTime = endTime.diff(startTime, "s");
  if (runTime < 1) runTime = 1;
  const runDays = Math.floor(runTime / (24 * 60 * 60));
  const days = d || runDays > 0 ? `${runDays} days ` : "";
  const runHrs = Math.floor(runTime / (60 * 60));
  const hrs = d || h || runHrs > 0 ? `${runHrs}`.padStart(2, "0") : "";
  const runMins = Math.floor(runTime / 60);
  const mins =
    d || h || m || runMins > 0 ? `${runMins % 60}`.padStart(2, "0") : "";
  const secs = d || h || m || s ? `${runTime % 60}`.padStart(2, "0") : "";
  const runMs = runTime * 1000;
  const msec = ms ? `${runMs % 1000}`.padStart(3, "0") : "";

  return `${days}${hrs}h ${mins}m ${secs}s ${msec}ms`;
};
