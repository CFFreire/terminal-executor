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
      async (cmd: string, hash: string) => {
        try {
          // Set status to undefined while executing
          commandStatusMap.set(hash, { timestamp: Date.now() });
          
          // Refresh CodeLens to show "Executing..."
          codeLensProvider.refresh();
          
          const term = vscode.window.terminals.find(t => t.name === 'Terminal Executor')
                    ?? vscode.window.createTerminal('Terminal Executor');
          term.show();
          
          // Execute the command
          term.sendText(cmd);
          
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
}

class TerminalCodeLensProvider implements vscode.CodeLensProvider {
  private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
  public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;
  
  private regex = /(?<=^|\r?\n)###\s+([^\r\n]+)\r?\n([\s\S]*?)(?=(?:\r?\n###)|\r?\n*$)/g;

  public refresh(): void {
    this._onDidChangeCodeLenses.fire();
  }

  public provideCodeLenses(
    doc: vscode.TextDocument
  ): vscode.CodeLens[] {
    const lenses: vscode.CodeLens[] = [];
    let m: RegExpExecArray | null;
    
    const docText = doc.getText();
    this.regex.lastIndex = 0; // Reset regex state
    
    while ((m = this.regex.exec(docText)) !== null) {
      const title = m[1].trim();
      const cmd = m[2].trim();
      
      // Generate a hash for this command to track its status
      const cmdHash = `${doc.uri.toString()}_${m.index}`;
      
      // Calculate the position of the line with "### …"
      const line = doc.lineAt(doc.positionAt(m.index).line);
      
      // Add the execute button CodeLens
      lenses.push(new vscode.CodeLens(line.range, {
        title: '▶ Execute',
        command: 'terminal-executor.executeCommand',
        arguments: [cmd, cmdHash]
      }));
      
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
