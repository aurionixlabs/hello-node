"use strict";

const { decide } = require("./decide");

function show(input) {
  const d = decide(input);
  console.log("\nINPUT:", input);
  console.log("DECISION:", d);
}

show({ domain: "filesystem", tool: "filesystem.writeFile", action: "read" });
show({ domain: "filesystem", tool: "filesystem.writeFile", action: "write" });
show({ domain: "filesystem", tool: "filesystem.deleteFile", action: "write" });
