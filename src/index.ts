import express from "express";
import moment from "moment";
import { JobScheduler } from "./classes/jobScheduler";
import { config as loadEnvVariables } from "dotenv";
import { processDbAndUpdateFiles } from "./utilities/dbUpdater";
loadEnvVariables();

const scheduler = new JobScheduler();
const cronTime = process.env.CRON_TIME || "0 0 */8 * * *";
let lastUpdate: string = "Unstarted";
let lastStatus: { [step: string]: string } = {};

const cronJob = scheduler.scheduleJob(
  cronTime,
  "Update and process Mexico national database",
  async () => {
    lastStatus = await processDbAndUpdateFiles(cronJob)
      .then((statusObj) => {
        console.log(statusObj);
        lastUpdate = moment().format("LLLL");
        return statusObj;
      })
      .catch((err) => {
        console.error(err);
        return { error: `Check console log for details` };
      });
  }
);

cronJob.start();
cronJob.fireOnTick();
const app = express();
app.use(express.static("public"));
app.get("/", (req, res) => {
  res.json({ lastUpdate, lastStatus });
});
app.listen(process.env.PORT || 8080, () => {
  console.log(`Serving public files. Checking for updates: ${cronTime}`);
});
