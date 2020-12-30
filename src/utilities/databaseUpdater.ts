import FileDownloader from "../classes/fileDownloader";
import MexicoDbProcessor from "../classes/mexicoDbProcessor";
import Notifier from "../classes/notifier";
import moment from "moment";
import { CronJob } from "cron";
import { config as loadEnvVariables } from "dotenv";
import { copyFileSync, existsSync } from "fs";
import { resolve as resolvePath, sep } from "path";
import { srcDir } from "./utils";
loadEnvVariables();

const statusObj: { [step: string]: string } = {}; // instead of a context object because this is a simple project
const sourceUrl = process.env.MEXICO_DB_URL || "";
const downloadsDir = resolvePath(srcDir(), "../data/downloads");
const outputFile = "datos_abiertos_covid19.zip";

const fileDownloader = new FileDownloader(downloadsDir);
const databaseProcessor = new MexicoDbProcessor();
const notifier = new Notifier({
  service: process.env.FROM_EMAIL_SERVICE || "",
  email: process.env.FROM_EMAIL || "",
  password: process.env.FROM_EMAIL_PASSWORD || "",
  phone: process.env.FROM_PHONE || "",
});

const timestamp = () => Date.now().toString();
const datetime = () => moment().format("LLLL");

export const processDbAndUpdateFiles = async (
  scheduledJob: CronJob
): Promise<{ [step: string]: string }> => {
  statusObj[timestamp()] = "Downloading national DB ZIP";
  await fileDownloader
    .downloadFile(sourceUrl, outputFile)
    .then((downloadedZipFile: string) => {
      statusObj[timestamp()] = "Download complete";
      statusObj[timestamp()] = "Extracting CSV from ZIP";
      return databaseProcessor.getCsvFileFromZip(downloadedZipFile);
    })
    .then(async (csvDbFile: string) => {
      statusObj[timestamp()] = "Extraction complete";
      statusObj[timestamp()] = "Grouping cases by location";
      return databaseProcessor.groupTotalsByLocation(csvDbFile);
    })
    .then((totalsByLocFile: string) => {
      statusObj[timestamp()] = "Grouping complete";
      statusObj[timestamp()] = "Copying updated file to public folder";
      const publicDir = resolvePath(srcDir(), "..", "public");
      const filename =
        totalsByLocFile.split(sep).pop() || "totals-by-location.json";
      const publicFile = resolvePath(publicDir, filename);
      if (existsSync(totalsByLocFile)) {
        copyFileSync(totalsByLocFile, publicFile);
        statusObj[timestamp()] = "File copied";
      }
    })
    .catch((err: Error) => {
      console.error(`${datetime()}: ERROR`, err);
      scheduledJob?.stop();
      notifier.sendEmail(
        [process.env.ALERT_EMAIL || ""],
        `${datetime()}: DB Update error details`,
        JSON.stringify(err)
      );
      notifier.sendSMS(
        [process.env.ALERT_PHONE || ""],
        `${datetime()}: FAILED DB update. Check logs.`
      );
    })
    .finally(() => {
      statusObj[timestamp()] = "Deleting temporary files";
      fileDownloader.deleteTempFiles();
      databaseProcessor.deleteTempFiles();
      statusObj[timestamp()] = "Files deleted";
    });
  return statusObj;
};
