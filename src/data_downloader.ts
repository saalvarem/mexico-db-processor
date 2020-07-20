import { createWriteStream, existsSync } from "fs";
import { URL } from "url";
import request from "request";
import { resolve as resolvePath } from "path";
import { EventManager as em, ensureDirExistsSync } from "./utils";

const progress = require("request-progress");

type progressOptions = {
  throttle: number; // Throttle the progress event to 2000ms, defaults to 1000ms = 2000
  delay: number; // Only start to emit after 1000ms delay, defaults to 0ms = 1000
  lengthHeader: string; // Length header to use, defaults to content-length = 'x-transfer-length'
};

export type progressState = {
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
  private static singleton: DataDownloader | null = null;
  constructor() {
    if (DataDownloader.singleton) {
      return DataDownloader.singleton;
    } else {
      DataDownloader.singleton = this;
    }
  }
  static download(fileUrl: string, destinationFile: string): void {
    const url = new URL(fileUrl).toString();
    ensureDirExistsSync(destinationFile);
    let fileDestination = resolvePath(__dirname, destinationFile);
    progress(request(url), {} as progressOptions)
      .on("progress", (state: progressState) => {
        em.events.emit(em.eventDic.DONWLOAD_PROGRESS, url, state);
      })
      .on("error", (err: Error) => {
        em.events.emit(em.eventDic.ERROR, "data_downloader", err);
      })
      .on("end", () => {
        em.events.emit(em.eventDic.DONWLOAD_COMPLETE, fileUrl, destinationFile);
      })
      .pipe(createWriteStream(fileDestination));
  }
}
