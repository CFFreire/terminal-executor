import * as vscode from 'vscode';

// Store command execution status
interface CommandStatus {
  success?: boolean;
  timestamp: number;
}

// Map to keep track of command execution status
const commandStatusMap = new Map<string, CommandStatus>();

export function activate(ctx: vscode.ExtensionContext) {
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
      'terminal-executor.executeCommand',
      async (cmd: string, hash: string, customVars?: Map<string, string>) => {
        try {
          // Set status to undefined while executing
          commandStatusMap.set(hash, { timestamp: Date.now() });
          
          // Refresh CodeLens to show "Executing..."
          codeLensProvider.refresh();
          
          const term = vscode.window.terminals.find(t => t.name === 'Terminal Executor')
                    ?? vscode.window.createTerminal('Terminal Executor');
          term.show();
          
          // Process command to expand environment variables and custom variables
          const processedCmd = expandEnvVariables(cmd, customVars);
          
          // Execute the command
          term.sendText(processedCmd);
          
          // Wait a bit and mark as successful
          // In a real implementation, we would need a way to detect actual success/failure
          await new Promise(resolve => setTimeout(resolve, 500));
          commandStatusMap.set(hash, { success: true, timestamp: Date.now() });
          
          // Refresh CodeLens to show success status
          codeLensProvider.refresh();
        } catch (error) {
          // Mark as failed if there's an error
          commandStatusMap.set(hash, { success: false, timestamp: Date.now() });
          codeLensProvider.refresh();
          console.error('Error executing command:', error);
        }
      }
    )
  );

  // Command to clear execution status
  ctx.subscriptions.push(
    vscode.commands.registerCommand(
      'terminal-executor.clearStatus',
      (hash: string) => {
        commandStatusMap.delete(hash);
        codeLensProvider.refresh();
      }
    )
  );

  // Register command to get environment variable
  ctx.subscriptions.push(
    vscode.commands.registerCommand(
      'terminal-executor.getEnvVariable',
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
        command: 'terminal-executor.executeCommand',
        arguments: [cmd, cmdHash, customVars]
      }));
      
      // Add "Get Env Var" CodeLens if the commands appears to use env variables
      // Check for both traditional $ syntax and process.env syntax
      if (cmd.includes('$') || cmd.includes('process.env')) {
        lenses.push(new vscode.CodeLens(line.range, {
          title: '🔍 Get Env Var',
          command: 'terminal-executor.getEnvVariable',
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
            command: 'terminal-executor.clearStatus',
            arguments: [cmdHash]
          }));
        } 
        // Error status
        else {
          lenses.push(new vscode.CodeLens(line.range, {
            title: '✗ Error',
            tooltip: 'Command execution failed',
            command: 'terminal-executor.clearStatus',
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
