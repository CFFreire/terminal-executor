import * as path from 'path';
import * as fs from 'fs';
import { runTests, downloadAndUnzipVSCode } from '@vscode/test-electron';

async function main() {
	try {
		// The folder containing the Extension Manifest package.json
		// Passed to `--extensionDevelopmentPath`
		const extensionDevelopmentPath = path.resolve(__dirname, '../');

		// The path to the extension test script
		// Passed to --extensionTestsPath
		const extensionTestsPath = path.resolve(__dirname, './suite/index');

		// Additional options for the test runner
		const launchArgs = ['--disable-extensions'];

		// Determine if we're on Apple Silicon
		const isAppleSilicon = process.platform === 'darwin' && process.arch === 'arm64';
		const platform = isAppleSilicon ? 'darwin-arm64' : undefined;
		
		 // Use a specific stable version of VS Code rather than 'stable' which might default to insider
		const vscodeVersion = '1.83.1'; // Use a specific stable version
		
		console.log(`Downloading VS Code version ${vscodeVersion} (platform: ${platform || 'default'})`);
		
		// This actually returns the base installation directory
		const vscodeBasePath = await downloadAndUnzipVSCode({ 
			version: vscodeVersion,
			platform 
		});
		
		console.log(`VS Code downloaded to base path: ${vscodeBasePath}`);
		
		// Parse the path to find the correct VS Code executable location
		let vscodeExecutablePath = '';
		if (process.platform === 'darwin') {
			// If the path already contains 'MacOS/Electron', it's the executable itself
			if (vscodeBasePath.includes('MacOS/Electron')) {
				vscodeExecutablePath = vscodeBasePath;
				// Get the app root path
				const appRootPath = vscodeBasePath.split('Visual Studio Code.app')[0] + 'Visual Studio Code.app';
				console.log(`Using the direct executable path: ${vscodeExecutablePath}`);
				console.log(`App root path: ${appRootPath}`);
			} else {
				// Otherwise construct the path to the executable
				vscodeExecutablePath = path.join(vscodeBasePath, 'Visual Studio Code.app', 'Contents', 'MacOS', 'Electron');
				console.log(`Constructed executable path: ${vscodeExecutablePath}`);
			}
			
			// Verify the executable exists
			if (!fs.existsSync(vscodeExecutablePath)) {
				console.error(`Expected VS Code executable not found at: ${vscodeExecutablePath}`);
				
				// List directory contents to help debug
				const dirPath = path.dirname(vscodeExecutablePath);
				if (fs.existsSync(dirPath)) {
					console.log(`Directory ${dirPath} exists. Contents:`);
					fs.readdirSync(dirPath).forEach(file => {
						console.log(` - ${file}`);
					});
				} else {
					console.log(`Directory ${dirPath} does not exist`);
				}
				
				throw new Error('VS Code executable not found');
			}
			console.log(`Verified VS Code executable exists at: ${vscodeExecutablePath}`);
		}
		
		// Run the integration test
		await runTests({ 
			extensionDevelopmentPath, 
			extensionTestsPath,
			launchArgs,
			version: vscodeVersion, // Use the same specific version here
			platform,
			...(vscodeExecutablePath ? { vscodeExecutablePath } : {})
		});
	} catch (err) {
		console.error('Failed to run tests', err);
		if (err instanceof Error) {
			console.error(`Error name: ${err.name}`);
			console.error(`Error message: ${err.message}`);
			console.error(`Error stack: ${err.stack}`);
		}
		process.exit(1);
	}
}

main();