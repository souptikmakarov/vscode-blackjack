import * as vscode from 'vscode';
import { BlackjackProvider } from './blackjackProvider';

export function activate(context: vscode.ExtensionContext) {
    const provider = new BlackjackProvider(context.extensionUri);
    
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('blackjackView', provider, {
            webviewOptions: {
                retainContextWhenHidden: true
            }
        })
    );
    
    context.subscriptions.push(
        vscode.commands.registerCommand('blackjack.newGame', () => {
            provider.newGame();
        })
    );
    
    context.subscriptions.push(
        vscode.commands.registerCommand('blackjack.hit', () => {
            provider.hit();
        })
    );
    
    context.subscriptions.push(
        vscode.commands.registerCommand('blackjack.stand', () => {
            provider.stand();
        })
    );
}

export function deactivate() {}