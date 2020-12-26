import { mkdirSync } from "fs";
import { resolve as resolvePath, isAbsolute, sep } from "path";

export const ensureDirExistsSync = (directory: string): void => {
  const baseDir = __dirname;
  const fullFilePath = resolvePath(baseDir, "./", directory);
  const fullPathParts = fullFilePath.split(sep);
  if (fullPathParts[fullPathParts.length - 1].indexOf(".") > 0) {
    fullPathParts.pop();
  }
  const targetDir: string = fullPathParts.join(sep);
  const initDir = isAbsolute(targetDir) ? sep : "";

  targetDir.split(sep).reduce((parentDir, childDir) => {
    const curDir = resolvePath(baseDir, parentDir, childDir);
    try {
      mkdirSync(curDir);
    } catch (err) {
      if (err.code === "EEXIST") {
        // curDir already exists!
        return curDir;
      }
      // To avoid `EISDIR` error on Mac and `EACCES`-->`ENOENT` and `EPERM` on Windows.
      if (err.code === "ENOENT") {
        // Throw the original parentDir error on curDir `ENOENT` failure.
        throw new Error(`EACCES: permission denied, mkdir '${parentDir}'`);
      }

      const caughtErr = ["EACCES", "EPERM", "EISDIR"].indexOf(err.code) > -1;
      if (!caughtErr || (caughtErr && curDir === resolvePath(targetDir))) {
        throw err; // Throw if it's just the last created dir.
      }
    }
    return curDir;
  }, initDir);
};
