import * as vscode from 'vscode';

// Store command execution status
interface CommandStatus {
  success?: boolean;
  timestamp: number;
}

// Configuration for the extension
// This can be extended to include more settings
const CONFIGURATION = {
  enabledConfirmation: false,
  extensionName: 'Terminal Automator',
  extensionId: 'terminal-automator'
}

// Map to keep track of command execution status
const commandStatusMap = new Map<string, CommandStatus>();

/**
 * Get the command name in the format of "extensionId.command"
 * @param command The command name to be executed
 * @returns CONFIGURATION.extensionId.command
 */
function getCommandName(command: string): string {
  return `${CONFIGURATION.extensionId}.${command}`;
}

/**
 * Sanitize the command string to prevent dangerous operations
 * @param command The command string to be sanitized
 * @returns The sanitized command string
 */
function sanitizeCommand(command: string): string {
  // List of dangerous patterns to check for
  const dangerousPatterns = [
    /rm\s+-rf/i, /rmdir/i, /format/i, /mkfs/i,
    /dd\s+if/i, />\s*\/dev\//i, />\s*\/etc\//i,
    /chmod\s+777/i, /chmod\s+-R/i,
    /mv\s+.*\s+\/etc\//i, /rm\s+.*\s+\/etc\//i
  ];

  let sanitized = command.trim();

  // Check for dangerous commands
  for (const pattern of dangerousPatterns) {
    if (pattern.test(sanitized)) {
      throw new Error(`Potentially dangerous command detected: ${command}`);
    }
  }

  return sanitized;
}

function showWarningExecutionConfirmation(cmd: string): Promise<boolean> {
  return new Promise((resolve) => {
    vscode.window.showWarningMessage(
      `Are you sure you want to execute: ${cmd.substring(0, 100)}${cmd.length > 100 ? '...' : ''}`,
      { modal: true },
      'Execute'
    ).then((result) => {
      if (result === 'Execute') {
        resolve(true);
      } else {
        resolve(false);
      }
    });
  });
}

export function activate(ctx: vscode.ExtensionContext) {
  console.log(`${CONFIGURATION.extensionName} extension is now active!`);

  // Register CodeLens provider
  const codeLensProvider = new TerminalCodeLensProvider();
  ctx.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      { scheme: 'file', language: 'terminalFile' },
      codeLensProvider
    )
  );

  // Register command execution
  ctx.subscriptions.push(
    vscode.commands.registerCommand(
      getCommandName('executeCommand'),
      async (cmd: string, hash: string, customVars?: Map<string, string>) => {
        try {
          if (CONFIGURATION.enabledConfirmation) {
            const confirmed = await showWarningExecutionConfirmation(cmd);
            if (confirmed) {
              return;
            }
          }
          // Set status to undefined while executing
          commandStatusMap.set(hash, { timestamp: Date.now() });

          // Refresh CodeLens to show "Executing..."
          codeLensProvider.refresh();

          const term = vscode.window.terminals.find(t => t.name === CONFIGURATION.extensionName)
            ?? vscode.window.createTerminal(CONFIGURATION.extensionName);
          term.show();

          //If sanitize command error is thrown, then we request to the user to confirm the command
          let sanitizedCommandText = cmd;
          try {
            sanitizedCommandText = sanitizeCommand(sanitizedCommandText);
          } catch (error) {
            const confirmed = await showWarningExecutionConfirmation(cmd);
            if (!confirmed) {
              return;
            }
          }


          // Parse all blocks in the document
          const editor = vscode.window.activeTextEditor;
          if (!editor) {
            vscode.window.showErrorMessage('No active editor found.');
            return;
          }
          const docText = editor.document.getText();
          const blocks = parseBlocks(docText);

          // Find the block that matches the command to execute
          const blockName = findBlockNameByCommand(blocks, sanitizedCommandText);
          if (!blockName) {
            vscode.window.showErrorMessage('No matching block found for execution.');
            return;
          }

          // Expand includes recursively and expand variables
          let expandedCmd = expandIncludes(blockName, blocks, new Set());
          expandedCmd = expandEnvVariables(expandedCmd, customVars);

          // Execute the expanded command
          term.sendText(expandedCmd);
          // Parse all blocks in the document and return a map { blockName: blockContent }
          function parseBlocks(docText: string): Map<string, string> {
            const blockRegex = /###\s+([^\r\n]+)\r?\n([\s\S]*?)(?=(?:\r?\n###)|\r?\n*$)/g;
            const blocks = new Map<string, string>();
            let m: RegExpExecArray | null;
            while ((m = blockRegex.exec(docText)) !== null) {
              const name = m[1].trim();
              if (name === '$VARIABLES') continue;
              blocks.set(name, m[2].trim());
            }
            return blocks;
          }

          // Find the block name by matching its content to the command string
          function findBlockNameByCommand(blocks: Map<string, string>, command: string): string | undefined {
            for (const [name, content] of blocks.entries()) {
              if (content === command.trim()) {
                return name;
              }
            }
            return undefined;
          }

          // Expand #include statements recursively, with loop detection
          function expandIncludes(blockName: string, blocks: Map<string, string>, visited: Set<string>): string {
            if (visited.has(blockName)) {
              throw new Error(`Recursive #include detected for block: ${blockName}`);
            }
            visited.add(blockName);
            const content = blocks.get(blockName);
            if (!content) {
              throw new Error(`Block not found: ${blockName}`);
            }
            const lines = content.split(/\r?\n/);
            let result: string[] = [];
            for (const line of lines) {
              const includeMatch = line.match(/^#include\s+(.+)$/);
              if (includeMatch) {
                const includeBlock = includeMatch[1].trim();
                if (!blocks.has(includeBlock)) {
                  throw new Error(`Included block does not exist: ${includeBlock}`);
                }
                result.push(expandIncludes(includeBlock, blocks, visited));
              } else {
                result.push(line);
              }
            }
            visited.delete(blockName);
            return result.join('\n');
          }

          // Wait a bit and mark as successful
          // In a real implementation, we would need a way to detect actual success/failure
          await new Promise(resolve => setTimeout(resolve, 500));
          commandStatusMap.set(hash, { success: true, timestamp: Date.now() });

          // Refresh CodeLens to show success status
          codeLensProvider.refresh();
        } catch (error: any) {
          // Mark as failed if there's an error
          commandStatusMap.set(hash, { success: false, timestamp: Date.now() });
          codeLensProvider.refresh();
          console.error('Error executing command:', error);
          vscode.window.showInformationMessage(
            'Error executing command: ' + error.message,
            "Accept"
          );
        }
      }
    )
  );

  // Command to clear execution status
  ctx.subscriptions.push(
    vscode.commands.registerCommand(
      getCommandName('clearStatus'),
      (hash: string) => {
        commandStatusMap.delete(hash);
        codeLensProvider.refresh();
      }
    )
  );

  // Register command to get environment variable
  ctx.subscriptions.push(
    vscode.commands.registerCommand(
      getCommandName('getEnvVariable'),
      async () => {
        // Prompt for variable name
        const varName = await vscode.window.showInputBox({
          prompt: 'Enter environment variable name',
          placeHolder: 'e.g. HOME, PATH, etc.'
        });

        if (!varName) {
          return;
        }

        // Get variable value
        const value = process.env[varName] || '';

        // Show the value
        if (value) {
          // Copy to clipboard
          vscode.env.clipboard.writeText(value);
          vscode.window.showInformationMessage(
            `${varName}=${value}`,
            'Value copied to clipboard'
          );
        } else {
          vscode.window.showWarningMessage(`Environment variable '${varName}' not found`);
        }
      }
    )
  );
}

// Function to expand environment variables in a command string
// Supports ${VAR}, $VAR syntax, and {process.env.VAR} syntax
// Also supports custom variables defined in the file
export function expandEnvVariables(cmd: string, customVars?: Map<string, string>): string {
  // Replace custom variables if provided
  let result = cmd;
  if (customVars) {
    for (const [key, value] of customVars.entries()) {
      // Replace ${VAR} format for custom variables
      result = result.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), value);
      // Replace $VAR format for custom variables (but only whole words)
      result = result.replace(new RegExp(`\\$${key}(?=\\s|$|[^a-zA-Z0-9_])`, 'g'), value);
    }
  }

  // Replace {process.env.VAR} syntax
  result = result.replace(/\{process\.env\.([^}]+)\}/g, (match, varName) => {
    return process.env[varName] || match; // Keep original if not found
  });

  // Replace ${VAR} syntax for env vars
  result = result.replace(/\${([^}]+)}/g, (match, varName) => {
    return process.env[varName] || match; // Keep original if not found
  });

  // Replace $VAR syntax (but not $$, $1, $2 which might be shell variables)
  result = result.replace(/\$([a-zA-Z_][a-zA-Z0-9_]*)/g, (match, varName) => {
    return process.env[varName] || match; // Keep original if not found
  });

  return result;
}

class TerminalCodeLensProvider implements vscode.CodeLensProvider {
  private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
  public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;
  private regex = /(?<=^|\r?\n)###\s+([^\r\n]+)\r?\n([\s\S]*?)(?=(?:\r?\n###)|\r?\n*$)/g;
  private variablesRegex = /(?<=^|\r?\n)###\s+\$VARIABLES\r?\n([\s\S]*?)(?=(?:\r?\n###)|\r?\n*$)/g;

  public refresh(): void {
    this._onDidChangeCodeLenses.fire();
  }

  // Extract custom variables from document content
  private extractCustomVariables(docText: string): Map<string, string> {
    const customVars = new Map<string, string>();
    this.variablesRegex.lastIndex = 0; // Reset regex state

    const match = this.variablesRegex.exec(docText);
    if (match) {
      const varSection = match[1];

      // Parse each line as name=value
      const lines = varSection.split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) {
          continue;
        }

        const eqIndex = trimmed.indexOf('=');
        if (eqIndex > 0) {
          const name = trimmed.substring(0, eqIndex).trim();
          const value = trimmed.substring(eqIndex + 1).trim();
          customVars.set(name, value);
        }
      }
    }

    return customVars;
  }

  public provideCodeLenses(
    doc: vscode.TextDocument
  ): vscode.CodeLens[] {
    console.log('provideCodeLenses called for', doc.uri.toString());
    const lenses: vscode.CodeLens[] = [];
    let m: RegExpExecArray | null;

    const docText = doc.getText();

    // Extract custom variables first
    const customVars = this.extractCustomVariables(docText);

    // Process command sections
    this.regex.lastIndex = 0; // Reset regex state

    while ((m = this.regex.exec(docText)) !== null) {
      const title = m[1].trim();

      // Skip the variables section itself
      if (title === '$VARIABLES') {
        continue;
      }

      const cmd = m[2].trim();

      // Generate a hash for this command to track its status
      const cmdHash = `${doc.uri.toString()}_${m.index}`;

      // Calculate the position of the line with "### …"
      const line = doc.lineAt(doc.positionAt(m.index).line);

      // Add the execute button CodeLens
      lenses.push(new vscode.CodeLens(line.range, {
        title: '▶ Execute',
        command: getCommandName('executeCommand'),
        arguments: [cmd, cmdHash, customVars]
      }));

      // Add "Get Env Var" CodeLens if the commands appears to use env variables
      // Check for both traditional $ syntax and process.env syntax
      if (cmd.includes('$') || cmd.includes('process.env')) {
        lenses.push(new vscode.CodeLens(line.range, {
          title: '🔍 Get Env Var',
          command: getCommandName('getEnvVariable'),
          arguments: []
        }));
      }

      // Check if we have status for this command
      const status = commandStatusMap.get(cmdHash);
      if (status) {
        // It's currently executing
        if (status.success === undefined) {
          lenses.push(new vscode.CodeLens(line.range, {
            title: '⟳ Executing...',
            command: '',
            arguments: []
          }));
        }
        // Success status
        else if (status.success) {
          lenses.push(new vscode.CodeLens(line.range, {
            title: '✓ Success',
            tooltip: 'Command executed successfully',
            command: getCommandName('clearStatus'),
            arguments: [cmdHash]
          }));
        }
        // Error status
        else {
          lenses.push(new vscode.CodeLens(line.range, {
            title: '✗ Error',
            tooltip: 'Command execution failed',
            command: getCommandName('clearStatus'),
            arguments: [cmdHash]
          }));
        }

        // Add timestamp information (optional)
        const timeAgo = Math.round((Date.now() - status.timestamp) / 1000);
        if (timeAgo < 60) {
          lenses.push(new vscode.CodeLens(line.range, {
            title: `(${timeAgo}s ago)`,
            command: '',
            arguments: []
          }));
        }
      }
    }

    return lenses;
  }
}
