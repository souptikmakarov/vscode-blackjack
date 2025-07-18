"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = require("vscode");
const blackjackProvider_1 = require("./blackjackProvider");
function activate(context) {
    const provider = new blackjackProvider_1.BlackjackProvider(context.extensionUri);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider('blackjackView', provider, {
        webviewOptions: {
            retainContextWhenHidden: true
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand('blackjack.newGame', () => {
        provider.newGame();
    }));
    context.subscriptions.push(vscode.commands.registerCommand('blackjack.hit', () => {
        provider.hit();
    }));
    context.subscriptions.push(vscode.commands.registerCommand('blackjack.stand', () => {
        provider.stand();
    }));
}
exports.activate = activate;
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map