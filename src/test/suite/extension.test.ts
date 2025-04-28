import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { after, before } from 'mocha';

// You may need to adjust the import path depending on your project structure
import { expandEnvVariables } from '../../extension';

suite('Terminal Executor Extension Test Suite', () => {
	before(() => {
		// Ensure extension is activated
		vscode.window.showInformationMessage('Starting tests for terminal-executor');
	});

	after(() => {
		// Cleanup
	});

	test('Command execution creates/shows terminal', async () => {
		// Create stubs
		const terminalStub = {
			name: 'Terminal Executor',
			show: sinon.stub(),
			sendText: sinon.stub(),
			dispose: sinon.stub()
		};
		
		// Use proper typing instead of 'any'
		const createTerminalStub = sinon.stub(vscode.window, 'createTerminal')
			.returns(terminalStub as unknown as vscode.Terminal);
		
		// Set empty terminals array to ensure createTerminal is called
		sinon.stub(vscode.window, 'terminals').value([]);
		
		// Execute command
		await vscode.commands.executeCommand('terminal-executor.executeCommand', 'echo "test"', 'test-hash');
		
		// Assert terminal was created and used
		assert.strictEqual(createTerminalStub.calledOnce, true);
		assert.strictEqual(terminalStub.show.calledOnce, true);
		assert.strictEqual(terminalStub.sendText.calledOnce, true);
		assert.strictEqual(terminalStub.sendText.firstCall.args[0], 'echo "test"');
		
		// Restore stubs
		sinon.restore();
	});

	test('Environment variable expansion works correctly', () => {
		// Set up test environment variables
		process.env.TEST_VAR = 'test-value';
		process.env.ANOTHER_VAR = 'another-value';
		
		// Test ${VAR} syntax
		assert.strictEqual(
			expandEnvVariables('Value is ${TEST_VAR}'),
			'Value is test-value'
		);
		
		// Test $VAR syntax
		assert.strictEqual(
			expandEnvVariables('Value is $TEST_VAR'),
			'Value is test-value'
		);
		
		// Test process.env.VAR syntax
		assert.strictEqual(
			expandEnvVariables('Value is {process.env.TEST_VAR}'),
			'Value is test-value'
		);
		
		// Test multiple replacements
		assert.strictEqual(
			expandEnvVariables('${TEST_VAR} and $ANOTHER_VAR'),
			'test-value and another-value'
		);
		
		// Test custom variables
		const customVars = new Map<string, string>();
		customVars.set('CUSTOM_VAR', 'custom-value');
		
		assert.strictEqual(
			expandEnvVariables('${TEST_VAR} and ${CUSTOM_VAR}', customVars),
			'test-value and custom-value'
		);
		
		// Test variable not found
		assert.strictEqual(
			expandEnvVariables('${NONEXISTENT_VAR}'),
			'${NONEXISTENT_VAR}'
		);
	});

	test('CodeLens provider returns correct lenses', async () => {
		// Create a test document with terminal commands
		const content = `### Test Command
echo "Hello World"

### $VARIABLES
TEST_VAR=test-value

### Command with variable
echo "$TEST_VAR"`;
		
		const document = await vscode.workspace.openTextDocument({
			content,
			language: 'terminalFile'
		});
		
		// Get CodeLenses
		const codeLenses = await vscode.commands.executeCommand<vscode.CodeLens[]>(
			'vscode.executeCodeLensProvider',
			document.uri
		);
		
		// Assert we have the correct number of CodeLenses
		// We should have at least 2 lenses (execute buttons) for the two commands
		assert.ok(codeLenses && codeLenses.length >= 2);
		
		// Additional checks on CodeLens properties could be added here
	});
});
