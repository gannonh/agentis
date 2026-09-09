const net = require("node:net");

if (process.argv[1]?.endsWith("/packages/cli/dist/bin.js") && process.argv[2] === "verify" && process.argv[3] === "launch") {
  net.Server.prototype.listen = function () {
    process.nextTick(() => this.emit("error", Object.assign(new Error("forced startup failure for AC6"), { code: "EADDRINUSE" })));
    return this;
  };
}
