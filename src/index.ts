import FileUploader from "./classes/fileUploader";
import MexicoDbProcessor from "./classes/mexicoDbProcessor";
import { JobScheduler } from "./classes/jobScheduler";
import { config as loadEnvVariables } from "dotenv";
import { DataDownloader } from "./classes/dataDownloader";
import moment from "moment";

loadEnvVariables();

const scheduler = new JobScheduler();
const cronTime = process.env.CRON_TIME || "0 0 */8 * * *";

const processDbAndUpdateJson = async () => {
  const dataDownloader = new DataDownloader();
  const dbProcessor = new MexicoDbProcessor();
  const jsonFileUpdater = new FileUploader();
  await dataDownloader
    .downloadDbZipFile()
    .then((downloadedZipFile) =>
      dbProcessor.getCsvFileFromZip(downloadedZipFile)
    )
    .then((csvDbFile) => dbProcessor.mapCsvFileToJson(csvDbFile))
    .then((jsonFile) => {
      jsonFileUpdater; // upload file, update database
    })
    .catch((err) => {
      console.error(`[${moment().format("LLLL")}] ERROR`, err);
      periodicallyDownloadDB?.stop();
    })
    .finally(() => {
      dataDownloader.deleteTempFiles();
      dbProcessor.deleteTempFiles();
    });
};

processDbAndUpdateJson();

const periodicallyDownloadDB = scheduler.scheduleJob(
  cronTime,
  "Download a copy of national database (ZIP), extract and process CSV into JSON, then upload processed file to repository.",
  processDbAndUpdateJson
);

// console.log(`Job scheduled:   Periodically download DB file [${cronTime}]\n`);
// periodicallyDownloadDB.start();
// periodicallyDownloadDB.fireOnTick();
