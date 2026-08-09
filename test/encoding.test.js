"use strict";

const fs = require("fs");
const path = require("path");

class SharedStylesheetDriver {
  constructor() {
    this.stylesheet = fs.readFileSync(
      path.join(__dirname, "..", "src", "shared.liquid"),
      "utf8"
    );
  }

  hasAsciiSafeMiddleDotSeparator() {
    return (
      this.stylesheet.includes('content: " \\00B7";') &&
      !this.stylesheet.includes('content: " ·";')
    );
  }
}

describe("rendered character encoding", () => {
  test("compact category separators survive previews without a charset declaration", () => {
    const stylesheet = new SharedStylesheetDriver();

    expect(stylesheet.hasAsciiSafeMiddleDotSeparator()).toBe(true);
  });
});
