import { expect } from "chai";
import Notifier from "../src/classes/notifier";

describe("Notifier", () => {
  describe("#constructor()", () => {
    it("should return a different isntance", () => {
      const instance1 = new Notifier({});
      const instance2 = new Notifier({});
      expect(instance1).to.not.equal(instance2);
    });
  });

  describe("#sendEmail()", () => {
    it("should return if the notifier has not email client", () => {
      const notifier = new Notifier({});
      expect(() => {
        notifier.sendEmail(["test@email.com"], "Subject", "Body");
      }).to.not.throw;
    });
  });

  describe("#sendSMS()", () => {
    it("should return if the notifier has not SMS client", () => {
      const notifier = new Notifier({});
      expect(() => {
        notifier.sendSMS(["+1234567890"], "Text");
      }).to.not.throw;
    });
  });
});
