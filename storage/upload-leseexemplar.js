"use strict";
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __generator =
  (this && this.__generator) ||
  function (thisArg, body) {
    var _ = {
        label: 0,
        sent: function () {
          if (t[0] & 1) throw t[1];
          return t[1];
        },
        trys: [],
        ops: [],
      },
      f,
      y,
      t,
      g;
    return (
      (g = { next: verb(0), throw: verb(1), return: verb(2) }),
      typeof Symbol === "function" &&
        (g[Symbol.iterator] = function () {
          return this;
        }),
      g
    );
    function verb(n) {
      return function (v) {
        return step([n, v]);
      };
    }
    function step(op) {
      if (f) throw new TypeError("Generator is already executing.");
      while (_)
        try {
          if (
            ((f = 1),
            y &&
              (t =
                op[0] & 2
                  ? y["return"]
                  : op[0]
                  ? y["throw"] || ((t = y["return"]) && t.call(y), 0)
                  : y.next) &&
              !(t = t.call(y, op[1])).done)
          )
            return t;
          if (((y = 0), t)) op = [op[0] & 2, t.value];
          switch (op[0]) {
            case 0:
            case 1:
              t = op;
              break;
            case 4:
              _.label++;
              return { value: op[1], done: false };
            case 5:
              _.label++;
              y = op[1];
              op = [0];
              continue;
            case 7:
              op = _.ops.pop();
              _.trys.pop();
              continue;
            default:
              if (
                !((t = _.trys), (t = t.length > 0 && t[t.length - 1])) &&
                (op[0] === 6 || op[0] === 2)
              ) {
                _ = 0;
                continue;
              }
              if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) {
                _.label = op[1];
                break;
              }
              if (op[0] === 6 && _.label < t[1]) {
                _.label = t[1];
                t = op;
                break;
              }
              if (t && _.label < t[2]) {
                _.label = t[2];
                _.ops.push(op);
                break;
              }
              if (t[2]) _.ops.pop();
              continue;
          }
          op = body.call(thisArg, _);
        } catch (e) {
          op = [6, e];
          y = 0;
        } finally {
          f = t = 0;
        }
      if (op[0] & 5) throw op[1];
      return { value: op[0] ? op[1] : void 0, done: true };
    }
  };
exports.__esModule = true;
var fs_1 = require("fs");
var path_1 = require("path");
var FormData = require("form-data");
var fetch = require("node-fetch");

var args = process.argv.slice(2);
if (args.length < 3) {
  console.log(
    "Usage: node upload-leseexemplar.js <pocketbase_url> <admin_email> <admin_password> [<downloads_folder>] [<leseexemplar_json>]"
  );
  console.log(
    "       <pocketbase_url>: the URL of your PocketBase instance (e.g., http://localhost:8090)"
  );
  console.log("       <admin_email>: admin email for authentication");
  console.log("       <admin_password>: admin password for authentication");
  console.log(
    '       <downloads_folder>: (optional), folder containing downloaded files, default is "downloads"'
  );
  console.log(
    '       <leseexemplar_json>: (optional), path to leseexemplarFile.json, default is "../firestore/leseexemplarFile.json"'
  );
  process.exit(1);
}

var pocketbaseUrl = args[0];
var adminEmail = args[1];
var adminPassword = args[2];
var downloadsFolder = args[3] || "downloads";
var leseexemplarJsonPath = args[4] || "../firestore/leseexemplarFile.json";
var authToken = "";
var uploaded = 0;

// Validate PocketBase URL
if (
  !pocketbaseUrl.startsWith("http://") &&
  !pocketbaseUrl.startsWith("https://")
) {
  console.error("PocketBase URL must start with http:// or https://");
  process.exit(1);
}

// Check if downloads folder exists
if (!(0, fs_1.existsSync)("./".concat(downloadsFolder))) {
  console.error(
    "Downloads folder ./".concat(downloadsFolder, " does not exist")
  );
  process.exit(1);
}

// Check if leseexemplarFile.json exists
if (!(0, fs_1.existsSync)(leseexemplarJsonPath)) {
  console.error(
    "LeseexemplarFile JSON file ".concat(
      leseexemplarJsonPath,
      " does not exist"
    )
  );
  process.exit(1);
}

function authenticateAdmin() {
  return __awaiter(this, void 0, void 0, function () {
    var response, result, error_1;
    return __generator(this, function (_a) {
      switch (_a.label) {
        case 0:
          _a.trys.push([0, 3, , 4]);
          console.log("Authenticating admin...");
          return [
            4 /*yield*/,
            fetch("".concat(pocketbaseUrl, "/api/admins/auth-with-password"), {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                identity: adminEmail,
                password: adminPassword,
              }),
            }),
          ];
        case 1:
          response = _a.sent();
          return [4 /*yield*/, response.json()];
        case 2:
          result = _a.sent();
          if (response.ok) {
            authToken = result.token;
            console.log("Admin authenticated successfully");
          } else {
            console.error("Admin authentication failed:", result);
            process.exit(1);
          }
          return [3 /*break*/, 4];
        case 3:
          error_1 = _a.sent();
          console.error("Error during admin authentication:", error_1.message);
          process.exit(1);
          return [3 /*break*/, 4];
        case 4:
          return [2 /*return*/];
      }
    });
  });
}

function findLocalFile(fileName) {
  if (!fileName) return null;

  // Try direct file name first
  var directPath = (0, path_1.join)(
    "./".concat(downloadsFolder),
    encodeURIComponent(fileName)
  );
  if ((0, fs_1.existsSync)(directPath)) {
    return directPath;
  }

  // Try without encoding
  var simplePath = (0, path_1.join)("./".concat(downloadsFolder), fileName);
  if ((0, fs_1.existsSync)(simplePath)) {
    return simplePath;
  }

  return null;
}

function createLeseexemplarRecord(recordData, filePath) {
  return __awaiter(this, void 0, void 0, function () {
    var form, response, result, error_2;
    return __generator(this, function (_a) {
      switch (_a.label) {
        case 0:
          _a.trys.push([0, 3, , 4]);
          console.log(
            "Creating leseexemplarFile record with ID "
              .concat(recordData.id, " for book ")
              .concat(recordData.bookId)
          );
          form = new FormData();
          form.append("id", recordData.id);
          form.append("bookId", recordData.bookId);
          form.append("file", (0, fs_1.createReadStream)(filePath));
          form.append("created", recordData.created);
          form.append("updated", recordData.updated);
          return [
            4 /*yield*/,
            fetch(
              "".concat(
                pocketbaseUrl,
                "/api/collections/leseexemplarFile/records"
              ),
              {
                method: "POST",
                headers: {
                  Authorization: "Bearer ".concat(authToken),
                },
                body: form,
              }
            ),
          ];
        case 1:
          response = _a.sent();
          return [4 /*yield*/, response.json()];
        case 2:
          result = _a.sent();
          if (response.ok) {
            uploaded++;
            console.log(
              "Successfully created leseexemplarFile record ".concat(
                recordData.id
              )
            );
            return [2 /*return*/, true];
          } else {
            console.error(
              "Error creating leseexemplarFile record ".concat(
                recordData.id,
                ":"
              ),
              result
            );
            return [2 /*return*/, false];
          }
          return [3 /*break*/, 4];
        case 3:
          error_2 = _a.sent();
          console.error(
            "Error creating leseexemplarFile record ".concat(
              recordData.id,
              ":"
            ),
            error_2.message
          );
          return [2 /*return*/, false];
        case 4:
          return [2 /*return*/];
      }
    });
  });
}

function processLeseexemplarFiles() {
  return __awaiter(this, void 0, void 0, function () {
    var leseexemplarData,
      records,
      _i,
      records_1,
      record,
      fileName,
      filePath,
      error_3;
    return __generator(this, function (_a) {
      switch (_a.label) {
        case 0:
          _a.trys.push([0, 7, , 8]);
          console.log("Loading leseexemplarFile data...");
          leseexemplarData = (0, fs_1.readFileSync)(
            leseexemplarJsonPath,
            "utf8"
          );
          records = JSON.parse(leseexemplarData);
          console.log(
            "Found ".concat(
              records.length,
              " leseexemplarFile records to process"
            )
          );
          (_i = 0), (records_1 = records);
          _a.label = 1;
        case 1:
          if (!(_i < records_1.length)) return [3 /*break*/, 6];
          record = records_1[_i];
          console.log(
            "\nProcessing leseexemplarFile: "
              .concat(record.id, " for book ")
              .concat(record.bookId)
          );
          fileName = record.file;
          filePath = findLocalFile(fileName);
          if (!filePath) return [3 /*break*/, 3];
          return [4 /*yield*/, createLeseexemplarRecord(record, filePath)];
        case 2:
          _a.sent();
          return [3 /*break*/, 4];
        case 3:
          console.log("File not found locally: ".concat(fileName));
          _a.label = 4;
        case 4:
          // Small delay to avoid overwhelming the server
          return [
            4 /*yield*/,
            new Promise(function (resolve) {
              return setTimeout(resolve, 100);
            }),
          ];
        case 5:
          // Small delay to avoid overwhelming the server
          _a.sent();
          _i++;
          return [3 /*break*/, 1];
        case 6:
          console.log(
            "\nCompleted! Successfully uploaded ".concat(
              uploaded,
              " leseexemplar files"
            )
          );
          return [3 /*break*/, 8];
        case 7:
          error_3 = _a.sent();
          console.error(
            "Error processing leseexemplarFile records:",
            error_3.message
          );
          process.exit(1);
          return [3 /*break*/, 8];
        case 8:
          return [2 /*return*/];
      }
    });
  });
}

function main() {
  return __awaiter(this, void 0, void 0, function () {
    return __generator(this, function (_a) {
      switch (_a.label) {
        case 0:
          return [4 /*yield*/, authenticateAdmin()];
        case 1:
          _a.sent();
          return [4 /*yield*/, processLeseexemplarFiles()];
        case 2:
          _a.sent();
          return [2 /*return*/];
      }
    });
  });
}

main();
