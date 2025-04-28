"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const vscode_test_1 = require("vscode-test");
async function run() {
    try {
        await (0, vscode_test_1.runTests)({
            extensionDevelopmentPath: path.resolve(__dirname, '../src'),
            extensionTestsPath: path.resolve(__dirname, './suite'),
        });
    }
    catch (err) {
        console.error('Failed to run tests');
        process.exit(1);
    }
}
run();
//# sourceMappingURL=runTest.js.map