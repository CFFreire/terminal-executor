"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const vscode = require("vscode");
const runTest_1 = require("../runTest");
suite('Extension Tests', () => {
    test('hello world functionality', async () => {
        const extension = vscode.extensions.getExtension('your.extension.id');
        await (0, runTest_1.activate)(extension);
        assert.ok(extension.isActive);
    });
});
//# sourceMappingURL=extension.test.js.map