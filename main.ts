import { sep } from "path";
import { existsSync, createWriteStream, unlinkSync } from "fs";
import { JobScheduler } from "./src/job_scheduler";
import { DataDownloader, progressState } from "./src/data_downloader";
import {
  EventManager as em,
  getDbFilename,
  getZipFileLocation,
  getCsvFileLocation,
} from "./src/utils";
import { filterCsvFile } from "./src/csv_filter";
import moment from "moment";
import unzipper from "unzipper";

const scheduler = new JobScheduler();

const downloadDbFile = () => {
  const fileUrl = process.env.MEXICO_DB_URL || "";
  const fileDestination = getZipFileLocation();
  DataDownloader.download(fileUrl, fileDestination);
};

const cronTime = "0 0 */12 * * *";

const periodicallyDownloadDB = scheduler.scheduleJob(
  cronTime,
  "dbFileDownload",
  downloadDbFile
);

em.events.on(em.eventDic.ERROR, (origin, err) => {
  console.error(`Error in ${origin}`, err);
  periodicallyDownloadDB?.stop();
});

em.events.on(em.eventDic.DONWLOAD_PROGRESS, (url, state: progressState) => {
  //console.log(`"${url}"  .......... ${(state.percent * 100).toFixed(0)}%`);
});

em.events.on(em.eventDic.DONWLOAD_COMPLETE, async (url, fileLocation) => {
  //console.log(`[ ${moment().format("MMMM Do YYYY, h:mm:ss a")} ] Downloaded "${fileLocation.split(sep).pop()}" from ${url}`);
  await getCsvFileFromZip(fileLocation);
});

em.events.on(em.eventDic.DB_FILE_EXTRACTED, (csvFileLocation) => {
  const zipFileLocation = getZipFileLocation();
  if (existsSync(zipFileLocation)) {
    unlinkSync(zipFileLocation);
  }
  filterCsvFile(csvFileLocation);
});

em.events.on(em.eventDic.NEW_RECORDS_AVAILABLE, (filteredJsonFile) => {
  console.log(`\nWe have JSON file with new records: ${filteredJsonFile}`);
});

const getCsvFileFromZip = async (zipFileLocation: string) => {
  if (existsSync(zipFileLocation)) {
    const directory = await unzipper.Open.file(zipFileLocation);
    return new Promise((resolve) => {
      let foundFile = false;
      const expectedFile = getDbFilename(new Date());
      const outputFile = getCsvFileLocation();
      for (let file of directory.files) {
        const filename = file.path;
        if (filename.toLowerCase() === expectedFile.toLowerCase()) {
          file
            .stream()
            .pipe(createWriteStream(outputFile))
            .on("error", (err) => {
              em.events.emit(
                em.eventDic.ERROR,
                "getCsvFileFromZip",
                new Error(`Error unzipping DB archive.`)
              );
            })
            .on("finish", () => {
              em.events.emit(em.eventDic.DB_FILE_EXTRACTED, outputFile);
              resolve();
            });
          foundFile = true;
          break;
        }
      }
      if (!foundFile) {
        em.events.emit(
          em.eventDic.ERROR,
          "getCsvFileFromZip",
          new Error(`"${expectedFile}" not in ZIP archive.`)
        );
      }
    });
  } else {
    em.events.emit(
      em.eventDic.ERROR,
      "getCsvFileFromZip",
      new Error(`Cannot unzip file. Zip file does not exist.`)
    );
  }
};

console.log(`Job scheduled:   Periodically download DB file [${cronTime}]\n`);
periodicallyDownloadDB.start();
periodicallyDownloadDB.fireOnTick();
