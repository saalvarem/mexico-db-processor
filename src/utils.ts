import { mkdirSync } from "fs";
import { resolve as resolvePath, isAbsolute, sep } from "path";
import { EventEmitter } from "events";
import { catalogs } from "./data_mapper";

export class EventManager {
  private static singleton: EventManager | null = null;
  static eventDic = {
    ERROR: "error",
    DONWLOAD_COMPLETE: "downloadComplete",
    DONWLOAD_PROGRESS: "downloadProgress",
    DB_FILE_EXTRACTED: "dbFileExtracted",
    NEW_RECORDS_AVAILABLE: "newRecordsAvailableForUpload",
  };
  static events = new EventEmitter();
  constructor() {
    if (EventManager.singleton) {
      return EventManager.singleton;
    } else {
      EventManager.singleton = this;
    }
  }
}

export const ensureDirExistsSync = (
  targetFile: string,
  isRelativeToScript = true
): void => {
  const baseDir = isRelativeToScript ? __dirname : ".";
  const fullFilePath = resolvePath(baseDir, targetFile);
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

export const getDownloadDir = (): string => {
  return resolvePath(__dirname, "..", process.env.DONWLOADS_DIR || "");
};

export const getProcessedDir = (): string => {
  return resolvePath(__dirname, "..", process.env.PROCESSED_DIR || "");
};

export const getCatalogsDir = (): string => {
  return resolvePath(__dirname, "..", process.env.CATALOGS_DIR || "");
};

export const getCatalog = (): catalogs => {
  const pathToJsonCatalog = resolvePath(
    __dirname,
    "..",
    process.env.PROCESSED_DIR || "",
    "catalogs.json"
  );
  return require(pathToJsonCatalog);
};

export const getDescriptorsDir = (): string => {
  return resolvePath(__dirname, "..", process.env.DESCRIPTORS_DIR || "");
};

export const getDbFilename = (date: Date, suffix?: string): string => {
  const YY = date
    .getFullYear()
    .toString()
    .substr(-2);
  const MM = (date.getMonth() + 1).toString().padStart(2, "0");
  const dd = date.getDate();
  return `${YY}${MM}${dd}COVID19MEXICO${suffix ? "_" + suffix : ""}.csv`;
};

export const getZipFileLocation = (): string => {
  const downloadDir = process.env.DONWLOADS_DIR || ".";
  const zipFileName = process.env.DB_ZIP_FILENAME || "dbFile.zip";
  return resolvePath(__dirname, "..", downloadDir, zipFileName);
};

export const getCsvFileLocation = (): string => {
  const downloadDir = process.env.DONWLOADS_DIR || ".";
  const expectedCsvFileName = getDbFilename(new Date());
  return resolvePath(__dirname, "..", downloadDir, expectedCsvFileName);
};

export const getFilteredCsvFileLocation = (): string => {
  const downloadDir = process.env.DONWLOADS_DIR || ".";
  const expectedCsvFileName = getDbFilename(new Date(), "filtered");
  return resolvePath(__dirname, "..", downloadDir, expectedCsvFileName);
};
