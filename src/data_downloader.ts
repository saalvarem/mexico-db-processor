import { createWriteStream, existsSync } from "fs";
import { URL } from "url";
import request from "request";
import { resolve as resolvePath } from "path";
import { ensureDirExistsSync } from "./utils";
import { EventEmitter } from "events";

const progress = require("request-progress");

export class DataDownloader {
  static events = new EventEmitter();
  static download(fileUrl: string, destinationFile: string): void {
    const url = new URL(fileUrl).toString();
    ensureDirExistsSync(destinationFile);
    let fileDestination = resolvePath(__dirname, destinationFile);
    // The options argument is optional so you can omit it
    progress(request(url), {
      // throttle: 2000, // Throttle the progress event to 2000ms, defaults to 1000ms
      // delay: 1000,                       // Only start to emit after 1000ms delay, defaults to 0ms
      // lengthHeader: 'x-transfer-length'  // Length header to use, defaults to content-length
    })
      .on("progress", (state: any) => {
        // The state is an object that looks like this:
        // {
        //     percent: 0.5,               // Overall percent (between 0 to 1)
        //     speed: 554732,              // The download speed in bytes/sec
        //     size: {
        //         total: 90044871,        // The total payload size in bytes
        //         transferred: 27610959   // The transferred payload size in bytes
        //     },
        //     time: {
        //         elapsed: 36.235,        // The total elapsed seconds since the start (3 decimals)
        //         remaining: 81.403       // The remaining seconds to finish (3 decimals)
        //     }
        // }
        this.events.emit("downloadProgress", url, state);
      })
      .on("error", (err: Error) => {
        this.events.emit("error", "data_downloader", err);
      })
      .on("end", () => {
        this.events.emit("complete", fileUrl, destinationFile);
      })
      .pipe(createWriteStream(fileDestination));
  }
}
