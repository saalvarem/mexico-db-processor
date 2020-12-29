import MexicoDbProcessor from "../classes/mexicoDbProcessor";
import Notifier from "../classes/notifier";
import moment from "moment";
import { CronJob } from "cron";
import { DataDownloader } from "../classes/dataDownloader";
import { config as loadEnvVariables } from "dotenv";
import { copyFileSync, existsSync } from "fs";
import { resolve as resolvePath, sep } from "path";
import { srcDir } from "../utilities/utils";
loadEnvVariables();

let statusObj: { [step: string]: string } = {
  "1) New DB ZIP file": "downloading...",
};

const notifier = new Notifier({
  service: process.env.FROM_EMAIL_SERVICE || "",
  email: process.env.FROM_EMAIL || "",
  password: process.env.FROM_EMAIL_PASSWORD || "",
  phone: process.env.FROM_PHONE || "",
});

export const processDbAndUpdateFiles = async (
  scheduledJob: CronJob
): Promise<{ [step: string]: string }> => {
  const dataDownloader = new DataDownloader();
  const dbProcessor = new MexicoDbProcessor();
  statusObj = {
    "1) New DB ZIP file": "downloading...",
  };

  await dataDownloader
    .downloadDbZipFile()
    .then((downloadedZipFile: string) => {
      statusObj["1) New DB ZIP file"] = "downloaded";
      statusObj["2) Extract CSV from ZIP"] = "extracting...";
      return dbProcessor.getCsvFileFromZip(downloadedZipFile);
    })
    .then(async (csvDbFile: string) => {
      statusObj["2) Extract CSV from ZIP"] = "extracted";
      statusObj["3) Grouping cases by location"] = "grouping...";
      return dbProcessor.groupTotalsByLocation(csvDbFile);
    })
    .then((totalsByLocFile: string) => {
      statusObj["3) Grouping cases by location"] = "grouped";
      statusObj["4) Copying updated file to public"] = "copying...";
      const publicDir = resolvePath(srcDir(), "..", "public");
      const filename =
        totalsByLocFile.split(sep).pop() || "totals-by-location.json";
      const publicFile = resolvePath(publicDir, filename);
      if (existsSync(totalsByLocFile)) {
        copyFileSync(totalsByLocFile, publicFile);
        statusObj["4) Copying updated file to public"] = "copied";
      }
    })
    .catch((err: Error) => {
      console.error(`[${moment().format("LLLL")}] ERROR`, err);
      scheduledJob?.stop();
      notifier.sendEmail(
        [process.env.ALERT_EMAIL || ""],
        `[${moment().format("LLLL")}] DB Update error details`,
        JSON.stringify(err)
      );
      notifier.sendSMS(
        [process.env.ALERT_PHONE || ""],
        `[${moment().format("LLLL")}] FAILED DB update. Check logs.`
      );
    })
    .finally(() => {
      statusObj["5) Deleting temp files"] = "deleting...";
      dataDownloader.deleteTempFiles();
      dbProcessor.deleteTempFiles();
      statusObj["5) Deleting temp files"] = "deleted";
    });
  return statusObj;
};
