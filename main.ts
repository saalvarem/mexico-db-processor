import { DataBatcher } from "./src/data_batcher";
import { DataExtractor } from "./src/data_extractor";
import { resolve as resolvePath, sep } from "path";
import { existsSync } from "fs";
import { JobScheduler } from "./src/job_scheduler";
import { DataDownloader } from "./src/data_downloader";

const test = () => {
  const dataScheduler = new JobScheduler();

  //const govDbFileChecker = dataScheduler.rawDataDownloader("0 */8 * * *");
  const govDbFileChecker = dataScheduler.rawDataDownloader("*/2 * * * * *");
  DataDownloader.events.on("error", (err) => {
    console.error(err);
    govDbFileChecker?.stop();
  });
  DataDownloader.events.on("downloadProgress", (url, state) => {
    console.log(`"${url}"  .......... ${(state.percent * 100).toFixed(0)}%`);
  });
  //govDbFileChecker.start();
  //govDbFileChecker.fireOnTick();

  // check how to know when the last time a firebase collection was updated?
  // keep track in a management collection "lastSuccess"
  DataDownloader.events.on("complete", (url, fileLocation) => {
    console.log(`Downloaded "${fileLocation.split(sep).pop()}" from ${url}`);
    // check that the new file exists in the download folder
    // open zip, process new file, only keep records that are newer than last updated date
  });

  // listen for event from file processor that only new CSV records are left
  // process those records into json (keeping num values)

  // listen for event that 'newRecordsAvailableForUpload'

  // batch changes, update firebase
  // update firebase records "last success"

  // listen for event that 'newRecordsUploadedToFirebase'

  // listen for some error event -> email/text me!

  //figure out how to run this with .env in just node and prod

  // fire out how to have this run on google cloud

  // set to work on API

  setTimeout(() => {
    govDbFileChecker.stop();
  }, 6 * 1000);
};

test();
