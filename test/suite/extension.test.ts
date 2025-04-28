import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Extension should be active', () => {
		const extension = vscode.extensions.getExtension('publisher.terminal-executor');
		if (extension) {
			assert.ok(extension.isActive);
		} else {
			assert.fail('Extension not found');
		}
	});

	// Add more tests as needed
});