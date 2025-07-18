import * as vscode from 'vscode';

interface Card {
    suit: string;
    rank: string;
    value: number;
}

interface GameState {
    playerCards: Card[];
    dealerCards: Card[];
    playerScore: number;
    dealerScore: number;
    gameOver: boolean;
    playerWins: number;
    dealerWins: number;
    message: string;
}

export class BlackjackProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'blackjackView';
    private _view?: vscode.WebviewView;
    private gameState: GameState;
    private deck: Card[] = [];

    constructor(private readonly _extensionUri: vscode.Uri) {
        this.gameState = {
            playerCards: [],
            dealerCards: [],
            playerScore: 0,
            dealerScore: 0,
            gameOver: false,
            playerWins: 0,
            dealerWins: 0,
            message: 'Click New Game to start!'
        };
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
        
        webviewView.webview.onDidReceiveMessage(
            message => {
                switch (message.type) {
                    case 'newGame':
                        this.newGame();
                        break;
                    case 'hit':
                        this.hit();
                        break;
                    case 'stand':
                        this.stand();
                        break;
                }
            },
            undefined,
            []
        );
    }

    private createDeck(): Card[] {
        const suits = ['♠', '♥', '♦', '♣'];
        const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        const deck: Card[] = [];

        for (const suit of suits) {
            for (const rank of ranks) {
                let value = parseInt(rank);
                if (rank === 'A') value = 11;
                else if (['J', 'Q', 'K'].includes(rank)) value = 10;
                
                deck.push({ suit, rank, value });
            }
        }

        // Shuffle deck
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }

        return deck;
    }

    private calculateScore(cards: Card[]): number {
        let score = 0;
        let aces = 0;

        for (const card of cards) {
            if (card.rank === 'A') {
                aces++;
            }
            score += card.value;
        }

        // Adjust for aces
        while (score > 21 && aces > 0) {
            score -= 10;
            aces--;
        }

        return score;
    }

    private dealCard(): Card {
        if (this.deck.length === 0) {
            this.deck = this.createDeck();
        }
        return this.deck.pop()!;
    }

    public newGame() {
        this.deck = this.createDeck();
        this.gameState.playerCards = [this.dealCard(), this.dealCard()];
        this.gameState.dealerCards = [this.dealCard(), this.dealCard()];
        this.gameState.playerScore = this.calculateScore(this.gameState.playerCards);
        this.gameState.dealerScore = this.calculateScore(this.gameState.dealerCards);
        this.gameState.gameOver = false;
        this.gameState.message = 'Your turn! Hit or Stand?';

        // Check for blackjack
        if (this.gameState.playerScore === 21) {
            this.gameState.message = 'Blackjack! You win!';
            this.gameState.playerWins++;
            this.gameState.gameOver = true;
        }

        this.updateView();
    }

    public hit() {
        if (this.gameState.gameOver) return;

        this.gameState.playerCards.push(this.dealCard());
        this.gameState.playerScore = this.calculateScore(this.gameState.playerCards);

        if (this.gameState.playerScore > 21) {
            this.gameState.message = 'Bust! You lose!';
            this.gameState.dealerWins++;
            this.gameState.gameOver = true;
        } else if (this.gameState.playerScore === 21) {
            this.stand();
        } else {
            this.gameState.message = 'Hit or Stand?';
        }

        this.updateView();
    }

    public stand() {
        if (this.gameState.gameOver) return;

        // Dealer plays
        while (this.gameState.dealerScore < 17) {
            this.gameState.dealerCards.push(this.dealCard());
            this.gameState.dealerScore = this.calculateScore(this.gameState.dealerCards);
        }

        // Determine winner
        if (this.gameState.dealerScore > 21) {
            this.gameState.message = 'Dealer busts! You win!';
            this.gameState.playerWins++;
        } else if (this.gameState.dealerScore > this.gameState.playerScore) {
            this.gameState.message = 'Dealer wins!';
            this.gameState.dealerWins++;
        } else if (this.gameState.playerScore > this.gameState.dealerScore) {
            this.gameState.message = 'You win!';
            this.gameState.playerWins++;
        } else {
            this.gameState.message = 'Push! It\'s a tie!';
        }

        this.gameState.gameOver = true;
        this.updateView();
    }

    private updateView() {
        if (this._view) {
            this._view.webview.postMessage({
                type: 'updateGame',
                gameState: this.gameState
            });
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Blackjack</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 10px;
            margin: 0;
        }
        .game-container {
            display: flex;
            flex-direction: column;
            gap: 15px;
        }
        .score-board {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            padding: 10px;
            border-radius: 5px;
            text-align: center;
        }
        .cards-section {
            background-color: var(--vscode-input-background);
            padding: 10px;
            border-radius: 5px;
        }
        .cards-section h3 {
            margin: 0 0 10px 0;
            font-size: 14px;
        }
        .cards {
            display: flex;
            flex-wrap: wrap;
            gap: 5px;
        }
        .card {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            padding: 8px 6px;
            border-radius: 3px;
            font-size: 12px;
            min-width: 25px;
            text-align: center;
            border: 1px solid var(--vscode-button-border);
        }
        .card.red {
            color: #ff6b6b;
        }
        .controls {
            display: flex;
            gap: 10px;
        }
        .btn {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: 1px solid var(--vscode-button-border);
            padding: 8px 12px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 12px;
            flex: 1;
        }
        .btn:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        .btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .message {
            text-align: center;
            font-weight: bold;
            padding: 10px;
            background-color: var(--vscode-textBlockQuote-background);
            border-radius: 5px;
        }
        .score {
            font-size: 18px;
            font-weight: bold;
        }
        .wins {
            font-size: 12px;
            opacity: 0.8;
        }
    </style>
</head>
<body>
    <div class="game-container">
        <div class="score-board">
            <div class="score">Player: <span id="player-score">0</span> | Dealer: <span id="dealer-score">0</span></div>
            <div class="wins">Wins - Player: <span id="player-wins">0</span> | Dealer: <span id="dealer-wins">0</span></div>
        </div>
        
        <div class="cards-section">
            <h3>Your Cards</h3>
            <div id="player-cards" class="cards"></div>
        </div>
        
        <div class="cards-section">
            <h3>Dealer Cards</h3>
            <div id="dealer-cards" class="cards"></div>
        </div>
        
        <div class="message" id="message">Click New Game to start!</div>
        
        <div class="controls">
            <button class="btn" id="new-game-btn" onclick="newGame()">New Game</button>
            <button class="btn" id="hit-btn" onclick="hit()" disabled>Hit</button>
            <button class="btn" id="stand-btn" onclick="stand()" disabled>Stand</button>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        
        function newGame() {
            vscode.postMessage({ type: 'newGame' });
        }
        
        function hit() {
            vscode.postMessage({ type: 'hit' });
        }
        
        function stand() {
            vscode.postMessage({ type: 'stand' });
        }
        
        function renderCard(card) {
            const cardElement = document.createElement('div');
            cardElement.className = 'card';
            if (card.suit === '♥' || card.suit === '♦') {
                cardElement.classList.add('red');
            }
            cardElement.textContent = card.rank + card.suit;
            return cardElement;
        }
        
        function updateGame(gameState) {
            document.getElementById('player-score').textContent = gameState.playerScore;
            document.getElementById('dealer-score').textContent = gameState.dealerScore;
            document.getElementById('player-wins').textContent = gameState.playerWins;
            document.getElementById('dealer-wins').textContent = gameState.dealerWins;
            document.getElementById('message').textContent = gameState.message;
            
            const playerCardsContainer = document.getElementById('player-cards');
            const dealerCardsContainer = document.getElementById('dealer-cards');
            
            playerCardsContainer.innerHTML = '';
            dealerCardsContainer.innerHTML = '';
            
            gameState.playerCards.forEach(card => {
                playerCardsContainer.appendChild(renderCard(card));
            });
            
            gameState.dealerCards.forEach((card, index) => {
                if (index === 1 && !gameState.gameOver) {
                    // Hide dealer's second card until game over
                    const hiddenCard = document.createElement('div');
                    hiddenCard.className = 'card';
                    hiddenCard.textContent = '?';
                    dealerCardsContainer.appendChild(hiddenCard);
                } else {
                    dealerCardsContainer.appendChild(renderCard(card));
                }
            });
            
            document.getElementById('hit-btn').disabled = gameState.gameOver;
            document.getElementById('stand-btn').disabled = gameState.gameOver;
        }
        
        window.addEventListener('message', event => {
            const message = event.data;
            if (message.type === 'updateGame') {
                updateGame(message.gameState);
            }
        });
    </script>
</body>
</html>`;
    }
}