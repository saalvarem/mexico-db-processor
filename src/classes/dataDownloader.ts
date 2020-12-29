import request from "request";
import { URL } from "url";
import { config as loadEnvVariables } from "dotenv";
import { createWriteStream, existsSync, unlinkSync } from "fs";
import { ensureDirExistsSync, srcDir } from "../utilities/utils";
import { resolve as resolvePath } from "path";
const progress = require("request-progress");
loadEnvVariables();

type progressOptions = {
  throttle: number; // Throttle the progress event to 2000ms, defaults to 1000ms = 2000
  delay: number; // Only start to emit after 1000ms delay, defaults to 0ms = 1000
  lengthHeader: string; // Length header to use, defaults to content-length = 'x-transfer-length'
};

type progressState = {
  percent: number; // Overall percent (between 0 to 1) = 0.5
  speed: number; // The download speed in bytes/sec = 554732
  size: {
    total: number; // The total payload size in bytes = 90044871
    transferred: number; // The transferred payload size in bytes = 27610959
  };
  time: {
    elapsed: number; // The total elapsed seconds since the start (3 decimals) = 36.235
    remaining: number; // The remaining seconds to finish (3 decimals) = 81.403
  };
};

export class DataDownloader {
  private static singleton: DataDownloader;
  private downloadsDir: string =
    process.env.DONWLOADS_DIR || "../data/downloads";
  private temporaryFiles: string[] = [];
  private zipfileName: string =
    process.env.DB_ZIP_FILENAME || "datos_abiertos_covid19.zip";
  private zipfileUrl: string = process.env.MEXICO_DB_URL || "";
  constructor() {
    if (DataDownloader.singleton) {
      return DataDownloader.singleton;
    } else {
      DataDownloader.singleton = this;
    }
  }

  async downloadDbZipFile(): Promise<string> {
    return new Promise((resolve, reject) => {
      const url = new URL(this.zipfileUrl).toString();
      try {
        ensureDirExistsSync(this.downloadsDir);
      } catch (err) {
        reject(
          new Error(`Could not ensure directory exists: ${this.downloadsDir}`)
        );
      }
      const fileDestination = resolvePath(
        srcDir(),
        this.downloadsDir,
        this.zipfileName
      );
      progress(request(url), {} as progressOptions)
        .on("progress", (state: progressState) => {
          console.log(
            `DB ZIP file download progress: "${url}"  .......... ${(
              state.percent * 100
            ).toFixed(0)}%`
          );
        })
        .on("error", (err: Error) => {
          reject(err);
        })
        .on("end", () => {
          this.temporaryFiles.push(fileDestination);
          resolve(fileDestination);
        })
        .pipe(createWriteStream(fileDestination));
    });
  }

  deleteTempFiles(): void {
    for (const tempFile of this.temporaryFiles) {
      if (existsSync(tempFile)) {
        console.log(`Deleting temp file: ${tempFile}`);
        unlinkSync(tempFile);
      }
    }
  }
}
