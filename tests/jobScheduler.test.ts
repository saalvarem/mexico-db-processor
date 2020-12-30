import { expect, assert } from "chai";
import JobScheduler from "../src/classes/jobScheduler";

describe("JobScheduler", () => {
  const jobScheduler = new JobScheduler();

  describe("#constructor()", () => {
    it("should return a singleton", () => {
      const instance2 = new JobScheduler();
      expect(jobScheduler).to.equal(instance2);
    });
  });

  describe("#scheduleJob()", () => {
    it("should create a new cron job", async () => {
      assert(jobScheduler.getTotalCronJobs() === 0);
      jobScheduler.scheduleJob("0 0 1 1 *", "Test function", () => {});
      assert(jobScheduler.getTotalCronJobs() === 1);
    });
  });
});
