class CompleteChessFix {
    constructor() {
        console.log('=== COMPLETE CHESS FIX ===');
        this.board = [
            ['bR', 'bN', 'bB', 'bQ', 'bK', 'bB', 'bN', 'bR'],
            ['bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP'],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            ['wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP'],
            ['wR', 'wN', 'wB', 'wQ', 'wK', 'wB', 'wN', 'wR']
        ];
        this.currentPlayer = 'white';
        this.selectedPiece = null;
        this.selectedSquare = null;
        this.moveHistory = [];
        this.capturedPieces = { white: [], black: [] };
        this.lastMove = null;
        this.kingPositions = { white: { row: 7, col: 4 }, black: { row: 0, col: 4 } };
        this.hasMoved = {
            whiteKing: false,
            blackKing: false,
            whiteRookLeft: false,
            whiteRookRight: false,
            blackRookLeft: false,
            blackRookRight: false
        };
        this.enPassantTarget = null;
        this.positionHistory = {};
        this.halfMoveClock = 0;

        console.log('Game initialized');
        this.setupBoard();
        this.updateGameStatus();
    }

    setupBoard() {
        const chessboard = document.getElementById('chessboard');
        if (!chessboard) {
            console.error('ERROR: Chessboard not found');
            return;
        }

        chessboard.innerHTML = '';

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const square = document.createElement('div');
                square.className = `square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
                square.dataset.row = row;
                square.dataset.col = col;

                const piece = this.board[row][col];
                if (piece) {
                    const pieceElement = this.createPieceElement(piece);
                    square.appendChild(pieceElement);
                }

                // Event listeners
                square.addEventListener('click', (e) => this.handleSquareClick(e, row, col));

                if (piece) {
                    const pieceElement = square.querySelector('.chess-piece');
                    if (pieceElement) {
                        pieceElement.addEventListener('dragstart', (e) => this.handleDragStart(e, row, col));
                        pieceElement.addEventListener('dragend', (e) => this.handleDragEnd(e));
                    }
                }

                square.addEventListener('dragover', (e) => this.handleDragOver(e));
                square.addEventListener('dragleave', (e) => this.handleDragLeave(e));
                square.addEventListener('drop', (e) => this.handleDrop(e, row, col));

                chessboard.appendChild(square);
            }
        }

        this.updateCheckHighlight();
    }

    createPieceElement(piece) {
        const pieceElement = document.createElement('div');
        pieceElement.className = 'chess-piece';
        pieceElement.draggable = true;

        const pieceSymbols = {
            'wK': '♔', 'wQ': '♕', 'wR': '♖', 'wB': '♗', 'wN': '♘', 'wP': '♙',
            'bK': '♚', 'bQ': '♛', 'bR': '♜', 'bB': '♝', 'bN': '♞', 'bP': '♟'
        };

        pieceElement.textContent = pieceSymbols[piece] || piece;
        pieceElement.style.fontSize = '40px';
        pieceElement.style.textAlign = 'center';
        pieceElement.style.lineHeight = '60px';
        pieceElement.style.cursor = 'grab';
        pieceElement.style.userSelect = 'none';

        if (piece[0] === 'w') {
            pieceElement.style.color = '#fff';
            pieceElement.style.textShadow = '0 0 3px #000';
        } else {
            pieceElement.style.color = '#000';
            pieceElement.style.textShadow = '0 0 3px #fff';
        }

        return pieceElement;
    }

    // ===== CORE CHECK DETECTION =====

    isKingInCheck(color) {
        console.log(`🔍 CHECKING if ${color} king is in check`);
        const kingPos = this.kingPositions[color];
        if (!kingPos) {
            console.error(`❌ King position not found for ${color}`);
            return false;
        }

        console.log(`📍 King at: (${kingPos.row}, ${kingPos.col})`);

        const attackerColor = color === 'white' ? 'black' : 'white';
        let inCheck = false;

        // Check every opponent piece
        for (let fromRow = 0; fromRow < 8; fromRow++) {
            for (let fromCol = 0; fromCol < 8; fromCol++) {
                const piece = this.board[fromRow][fromCol];
                if (piece && piece[0] === attackerColor[0]) {
                    if (this.canPieceAttack(fromRow, fromCol, kingPos.row, kingPos.col, piece)) {
                        console.log(`⚠️ CHECK! ${piece} attacks king from (${fromRow}, ${fromCol})`);
                        inCheck = true;
                        break;
                    }
                }
            }
            if (inCheck) break;
        }

        console.log(`✅ Result: ${color} king is ${inCheck ? 'IN CHECK' : 'SAFE'}`);
        return inCheck;
    }

    canPieceAttack(fromRow, fromCol, toRow, toCol, piece) {
        const pieceType = piece[1];
        const rowDiff = Math.abs(toRow - fromRow);
        const colDiff = Math.abs(toCol - fromCol);

        switch (pieceType) {
            case 'P':
                const direction = piece[0] === 'w' ? -1 : 1;
                return (toRow - fromRow === direction) && colDiff === 1;

            case 'N':
                return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);

            case 'B':
                return rowDiff === colDiff && this.isPathClear(fromRow, fromCol, toRow, toCol);

            case 'R':
                return (fromRow === toRow || fromCol === toCol) && this.isPathClear(fromRow, fromCol, toRow, toCol);

            case 'Q':
                // Queen moves like rook or bishop
                const rookMove = (fromRow === toRow || fromCol === toCol) &&
                    this.isPathClear(fromRow, fromCol, toRow, toCol);

                const bishopMove = (rowDiff === colDiff) &&
                    this.isPathClear(fromRow, fromCol, toRow, toCol);

                return rookMove || bishopMove;

            case 'K':
                return rowDiff <= 1 && colDiff <= 1;

            default:
                return false;
        }
    }

    isPathClear(fromRow, fromCol, toRow, toCol) {
        const rowStep = toRow === fromRow ? 0 : (toRow > fromRow ? 1 : -1);
        const colStep = toCol === fromCol ? 0 : (toCol > fromCol ? 1 : -1);

        let currentRow = fromRow + rowStep;
        let currentCol = fromCol + colStep;

        while (currentRow !== toRow || currentCol !== toCol) {
            if (this.board[currentRow][currentCol] !== null) {
                return false;
            }
            currentRow += rowStep;
            currentCol += colStep;
        }

        return true;
    }

    // ===== MOVE VALIDATION =====

    wouldLeaveKingInCheck(fromRow, fromCol, toRow, toCol) {
        console.log(`🔍 TESTING move: (${fromRow}, ${fromCol}) → (${toRow}, ${toCol})`);

        const piece = this.board[fromRow][fromCol];
        const capturedPiece = this.board[toRow][toCol];
        const originalKingPos = { ...this.kingPositions[this.currentPlayer] };

        // Make temporary move
        this.board[toRow][toCol] = piece;
        this.board[fromRow][fromCol] = null;

        if (piece[1] === 'K') {
            this.kingPositions[this.currentPlayer] = { row: toRow, col: toCol };
        }

        // Test if king is in check after this move
        const inCheck = this.isKingInCheck(this.currentPlayer);

        // Undo temporary move
        this.board[fromRow][fromCol] = piece;
        this.board[toRow][toCol] = capturedPiece;
        this.kingPositions[this.currentPlayer] = originalKingPos;

        console.log(`📊 Result: Move would ${inCheck ? 'LEAVE KING IN CHECK ❌' : 'KEEP KING SAFE ✅'}`);

        if (inCheck) {
            console.log(`🚫 ILLEGAL: Cannot leave ${this.currentPlayer} king in check`);
        }

        return inCheck;
    }

    getLegalMoves(row, col) {
        const piece = this.board[row][col];
        if (!piece) {
            console.log('❌ No piece at this position');
            return [];
        }

        // Only current player can move
        if (!this.isCurrentPlayerPiece(piece)) {
            console.log(`❌ Not ${this.currentPlayer}'s piece: ${piece}`);
            return [];
        }

        console.log(`🎯 Getting legal moves for ${piece} at (${row}, ${col})`);

        const pieceType = piece[1];
        let moves = [];

        switch (pieceType) {
            case 'P':
                moves = this.getPawnMoves(row, col);
                break;
            case 'R':
                moves = this.getRookMoves(row, col);
                break;
            case 'N':
                moves = this.getKnightMoves(row, col);
                break;
            case 'B':
                moves = this.getBishopMoves(row, col);
                break;
            case 'Q':
                moves = this.getQueenMoves(row, col);
                break;
            case 'K':
                moves = this.getKingMoves(row, col);
                break;
        }

        console.log(`📋 Found ${moves.length} potential moves`);

        // Filter out moves that would leave king in check
        const legalMoves = moves.filter(move => {
            const wouldLeaveInCheck = this.wouldLeaveKingInCheck(row, col, move.row, move.col);
            if (wouldLeaveInCheck) {
                console.log(`❌ Move to (${move.row}, ${move.col}) illegal - leaves king in check`);
            } else {
                console.log(`✅ Move to (${move.row}, ${move.col}) is legal`);
            }
            return !wouldLeaveInCheck;
        });

        console.log(`🏁 Final: ${legalMoves.length} legal moves out of ${moves.length} potential`);

        // Special logging for queens (your main issue)
        if (pieceType === 'Q') {
            console.log(`👑 QUEEN ANALYSIS:`);
            console.log(`  Current player: ${this.currentPlayer}`);
            console.log(`  King position:`, this.kingPositions[this.currentPlayer]);
            console.log(`  Is king in check? ${this.isKingInCheck(this.currentPlayer)}`);
            console.log(`  Potential moves: ${moves.length}`);
            console.log(`  Legal moves: ${legalMoves.length}`);

            if (legalMoves.length === 0 && moves.length > 0) {
                console.log(`🚨 QUEEN BLOCKED: All moves would leave king in check!`);
            }
        }

        return legalMoves;
    }

    // ===== PIECE MOVES =====

    getPawnMoves(row, col) {
        const moves = [];
        const piece = this.board[row][col];
        const isWhite = piece[0] === 'w';
        const direction = isWhite ? -1 : 1;
        const startRow = isWhite ? 6 : 1;

        // Forward moves
        if (this.isInBounds(row + direction, col) && !this.board[row + direction][col]) {
            moves.push({ row: row + direction, col });

            // Two-square move from start
            if (row === startRow && !this.board[row + 2 * direction][col]) {
                moves.push({ row: row + 2 * direction, col });
            }
        }

        // Captures
        [-1, 1].forEach(colOffset => {
            const newCol = col + colOffset;
            const newRow = row + direction;
            if (this.isInBounds(newRow, newCol)) {
                const target = this.board[newRow][newCol];
                if (target && target[0] !== piece[0]) {
                    moves.push({ row: newRow, col: newCol });
                }
            }
        });

        // En passant captures
        if (this.enPassantTarget) {
            const epRow = this.enPassantTarget.row;
            const epCol = this.enPassantTarget.col;

            if (Math.abs(epCol - col) === 1 && epRow === row + direction) {
                moves.push({ row: epRow, col: epCol, enPassant: true });
            }
        }

        return moves;
    }

    getRookMoves(row, col) {
        const moves = [];
        const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];

        directions.forEach(([dRow, dCol]) => {
            for (let i = 1; i < 8; i++) {
                const newRow = row + dRow * i;
                const newCol = col + dCol * i;

                if (!this.isInBounds(newRow, newCol)) break;

                const target = this.board[newRow][newCol];
                if (!target) {
                    moves.push({ row: newRow, col: newCol });
                } else {
                    if (target[0] !== this.board[row][col][0]) {
                        moves.push({ row: newRow, col: newCol });
                    }
                    break;
                }
            }
        });

        return moves;
    }

    getKnightMoves(row, col) {
        const moves = [];
        const knightMoves = [
            [-2, -1], [-2, 1], [-1, -2], [-1, 2],
            [1, -2], [1, 2], [2, -1], [2, 1]
        ];

        knightMoves.forEach(([dRow, dCol]) => {
            const newRow = row + dRow;
            const newCol = col + dCol;

            if (this.isInBounds(newRow, newCol)) {
                const target = this.board[newRow][newCol];
                if (!target || target[0] !== this.board[row][col][0]) {
                    moves.push({ row: newRow, col: newCol });
                }
            }
        });

        return moves;
    }

    getBishopMoves(row, col) {
        const moves = [];
        const directions = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

        directions.forEach(([dRow, dCol]) => {
            for (let i = 1; i < 8; i++) {
                const newRow = row + dRow * i;
                const newCol = col + dCol * i;

                if (!this.isInBounds(newRow, newCol)) break;

                const target = this.board[newRow][newCol];
                if (!target) {
                    moves.push({ row: newRow, col: newCol });
                } else {
                    if (target[0] !== this.board[row][col][0]) {
                        moves.push({ row: newRow, col: newCol });
                    }
                    break;
                }
            }
        });

        return moves;
    }

    getQueenMoves(row, col) {
        return [...this.getRookMoves(row, col), ...this.getBishopMoves(row, col)];
    }

    getKingMoves(row, col) {
        const moves = [];
        const kingMoves = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1], [0, 1],
            [1, -1], [1, 0], [1, 1]
        ];

        kingMoves.forEach(([dRow, dCol]) => {
            const newRow = row + dRow;
            const newCol = col + dCol;

            if (this.isInBounds(newRow, newCol)) {
                const target = this.board[newRow][newCol];
                if (!target || target[0] !== this.board[row][col][0]) {
                    moves.push({ row: newRow, col: newCol });
                }
            }
        });

        const piece = this.board[row][col];
        const isWhite = piece[0] === 'w';

        if (!this.isKingInCheck(this.currentPlayer)) {

            // KING SIDE CASTLE
            if (isWhite && !this.hasMoved.whiteKing && !this.hasMoved.whiteRookRight) {
                if (!this.board[7][5] && !this.board[7][6]) {
                    moves.push({ row: 7, col: 6, castle: 'king' });
                }
            }

            if (!isWhite && !this.hasMoved.blackKing && !this.hasMoved.blackRookRight) {
                if (!this.board[0][5] && !this.board[0][6]) {
                    moves.push({ row: 0, col: 6, castle: 'king' });
                }
            }

            // QUEEN SIDE CASTLE
            if (isWhite && !this.hasMoved.whiteKing && !this.hasMoved.whiteRookLeft) {
                if (!this.board[7][1] && !this.board[7][2] && !this.board[7][3]) {
                    moves.push({ row: 7, col: 2, castle: 'queen' });
                }
            }

            if (!isWhite && !this.hasMoved.blackKing && !this.hasMoved.blackRookLeft) {
                if (!this.board[0][1] && !this.board[0][2] && !this.board[0][3]) {
                    moves.push({ row: 0, col: 2, castle: 'queen' });
                }
            }
        }

        return moves;
    }

    // ===== GAME STATE DETECTION =====

    isCheckmate(color) {
        console.log(`🔍 CHECKING CHECKMATE for ${color}`);

        // Must be in check first
        if (!this.isKingInCheck(color)) {
            console.log(`❌ Not in check - cannot be checkmate`);
            return false;
        }

        // Check if any legal move exists
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && this.isCurrentPlayerPiece(piece)) {
                    const legalMoves = this.getLegalMoves(row, col);
                    if (legalMoves.length > 0) {
                        console.log(`✅ Found legal move for ${piece} at (${row}, ${col})`);
                        return false;
                    }
                }
            }
        }

        console.log(`🏁 CHECKMATE! ${color} has no legal moves and is in check`);
        return true;
    }

    isStalemate(color) {
        if (this.isKingInCheck(color)) {
            return false;
        }

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && this.isCurrentPlayerPiece(piece)) {
                    const moves = this.getLegalMoves(row, col);
                    if (moves.length > 0) {
                        return false;
                    }
                }
            }
        }

        return true;
    }

    isInBounds(row, col) {
        return row >= 0 && row < 8 && col >= 0 && col < 8;
    }

    isCurrentPlayerPiece(piece) {
        const pieceColor = piece[0] === 'w' ? 'white' : 'black';
        return pieceColor === this.currentPlayer;
    }

    // ===== EVENT HANDLERS =====

    handleSquareClick(e, row, col) {
        e.stopPropagation();
        const piece = this.board[row][col];

        if (this.selectedPiece) {
            if (this.isValidMove(this.selectedSquare.row, this.selectedSquare.col, row, col)) {
                this.makeMove(this.selectedSquare.row, this.selectedSquare.col, row, col);
            } else {
                this.clearSelection();
                if (piece && this.isCurrentPlayerPiece(piece)) {
                    this.selectPiece(row, col);
                }
            }
        } else if (piece && this.isCurrentPlayerPiece(piece)) {
            this.selectPiece(row, col);
        }
    }

    handleDragStart(e, row, col) {
        const piece = this.board[row][col];
        if (piece && this.isCurrentPlayerPiece(piece)) {
            this.selectPiece(row, col);
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', JSON.stringify({ row, col }));
            e.target.classList.add('dragging');
            e.stopPropagation();
        } else {
            e.preventDefault();
        }
    }

    handleDragEnd(e) {
        e.target.classList.remove('dragging');
        document.querySelectorAll('.drop-target').forEach(el =>
            el.classList.remove('drop-target')
        );
    }

    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        const square = e.target.closest('.square');
        if (square) {
            square.classList.add('drop-target');
        }
    }

    handleDragLeave(e) {
        const square = e.target.closest('.square');
        if (square) {
            square.classList.remove('drop-target');
        }
    }

    handleDrop(e, row, col) {
        e.preventDefault();
        e.stopPropagation();

        document.querySelectorAll('.drop-target').forEach(el =>
            el.classList.remove('drop-target')
        );

        try {
            const data = JSON.parse(e.dataTransfer.getData('text/plain'));

            if (this.isValidMove(data.row, data.col, row, col)) {
                this.makeMove(data.row, data.col, row, col);
            } else {
                this.clearSelection();
            }
        } catch (error) {
            console.error('Drop error:', error);
        }

        document.querySelectorAll('.dragging').forEach(el =>
            el.classList.remove('dragging')
        );
    }

    selectPiece(row, col) {
        this.clearSelection();
        this.selectedPiece = this.board[row][col];
        this.selectedSquare = { row, col };

        const square = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        if (square) {
            square.classList.add('selected');
        }

        this.highlightLegalMoves(row, col);
    }

    highlightLegalMoves(row, col) {
        const legalMoves = this.getLegalMoves(row, col);

        legalMoves.forEach(move => {
            const square = document.querySelector(`[data-row="${move.row}"][data-col="${move.col}"]`);
            if (square) {
                if (this.board[move.row][move.col]) {
                    square.classList.add('legal-capture');
                } else {
                    square.classList.add('legal-move');
                }
            }
        });
    }

    clearSelection() {
        document.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
        document.querySelectorAll('.legal-move').forEach(el => el.classList.remove('legal-move'));
        document.querySelectorAll('.legal-capture').forEach(el => el.classList.remove('legal-capture'));

        this.selectedPiece = null;
        this.selectedSquare = null;
    }

    showPromotionUI(color, callback) {
        const overlay = document.createElement('div');
        overlay.className = 'promotion-overlay';

        const pieces = ['Q', 'R', 'B', 'N'];

        overlay.innerHTML = `
            <div class="promotion-box">
                <h3>Choose Promotion</h3>
                ${pieces.map(p =>
            `<button data-piece="${p}">${color}${p}</button>`
        ).join('')}
            </div>
        `;

        overlay.querySelectorAll('button').forEach(btn => {
            btn.onclick = () => {
                callback(btn.dataset.piece);
                document.body.removeChild(overlay);
            };
        });

        document.body.appendChild(overlay);
    }

    isValidMove(fromRow, fromCol, toRow, toCol) {
        const legalMoves = this.getLegalMoves(fromRow, fromCol);
        return legalMoves.some(move => move.row === toRow && move.col === toCol);
    }

    makeMove(fromRow, fromCol, toRow, toCol) {
        const piece = this.board[fromRow][fromCol];
        const capturedPiece = this.board[toRow][toCol];

        console.log(`🎯 MAKING MOVE: ${piece} from (${fromRow}, ${fromCol}) to (${toRow}, ${toCol})`);

        this.board[toRow][toCol] = piece;
        this.board[fromRow][fromCol] = null;

        if (piece[1] === 'P') {

            const isWhite = piece[0] === 'w';
            const promotionRow = isWhite ? 0 : 7;

            if (toRow === promotionRow) {
                // Use async promotion UI instead of prompt
                const color = isWhite ? 'w' : 'b';
                this.showPromotionUI(color, (choice) => {
                    this.board[toRow][toCol] = piece[0] + choice;
                    console.log(`♟ Pawn promoted to ${choice}`);

                    // Continue with game updates after promotion
                    this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';

                    // Track position for threefold repetition
                    const boardKey = JSON.stringify(this.board);
                    this.positionHistory[boardKey] = (this.positionHistory[boardKey] || 0) + 1;

                    if (this.positionHistory[boardKey] >= 3) {
                        this.showGameOver("Draw by Threefold Repetition");
                        return;
                    }

                    // Check 50-move rule
                    if (this.halfMoveClock >= 100) {
                        this.showGameOver("Draw by 50-Move Rule");
                        return;
                    }

                    this.clearSelection();
                    this.setupBoard();
                    this.updateGameStatus();
                    this.checkGameState();
                });
                return; // Exit early to wait for promotion choice
            }
        }

        if (piece[1] === 'K') {
            this.kingPositions[this.currentPlayer] = { row: toRow, col: toCol };
        }

        // Update movement flags for castling
        if (piece === 'wK') this.hasMoved.whiteKing = true;
        if (piece === 'bK') this.hasMoved.blackKing = true;

        if (piece === 'wR' && fromCol === 0 && fromRow === 7) this.hasMoved.whiteRookLeft = true;
        if (piece === 'wR' && fromCol === 7 && fromRow === 7) this.hasMoved.whiteRookRight = true;

        if (piece === 'bR' && fromCol === 0 && fromRow === 0) this.hasMoved.blackRookLeft = true;
        if (piece === 'bR' && fromCol === 7 && fromRow === 0) this.hasMoved.blackRookRight = true;

        // Move rook during castling
        if (piece[1] === 'K' && Math.abs(toCol - fromCol) === 2) {

            if (toCol === 6) { // king side
                const rook = this.board[toRow][7];
                this.board[toRow][5] = rook;
                this.board[toRow][7] = null;
            }

            if (toCol === 2) { // queen side
                const rook = this.board[toRow][0];
                this.board[toRow][3] = rook;
                this.board[toRow][0] = null;
            }

            console.log("Castling performed");
        }

        // Update en passant target
        if (piece[1] === 'P' && Math.abs(toRow - fromRow) === 2) {
            this.enPassantTarget = {
                row: (fromRow + toRow) / 2,
                col: fromCol
            };
        } else {
            this.enPassantTarget = null;
        }

        // Handle en passant capture
        if (piece[1] === 'P' && this.enPassantTarget && toRow === this.enPassantTarget.row && toCol === this.enPassantTarget.col && !capturedPiece) {
            const capturedRow = piece[0] === 'w' ? toRow + 1 : toRow - 1;
            const capturedPawn = this.board[capturedRow][toCol];
            this.board[capturedRow][toCol] = null;

            if (capturedPawn) {
                const capturedColor = capturedPawn[0] === 'w' ? 'white' : 'black';
                this.capturedPieces[capturedColor].push(capturedPawn);
                console.log(`En passant capture: ${capturedPawn}`);
            }
        }

        // Update half-move clock for 50-move rule
        if (piece[1] === 'P' || capturedPiece) {
            this.halfMoveClock = 0;
        } else {
            this.halfMoveClock++;
        }

        if (capturedPiece) {
            const capturedColor = capturedPiece[0] === 'w' ? 'white' : 'black';
            this.capturedPieces[capturedColor].push(capturedPiece);
        }

        this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';

        // Track position for threefold repetition
        const boardKey = JSON.stringify(this.board);
        this.positionHistory[boardKey] = (this.positionHistory[boardKey] || 0) + 1;

        if (this.positionHistory[boardKey] >= 3) {
            this.showGameOver("Draw by Threefold Repetition");
            return;
        }

        // Check 50-move rule
        if (this.halfMoveClock >= 100) {
            this.showGameOver("Draw by 50-Move Rule");
            return;
        }

        this.clearSelection();
        this.setupBoard();
        this.updateGameStatus();
        this.checkGameState();
    }

    updateCheckHighlight() {
        document.querySelectorAll('.in-check').forEach(el => el.classList.remove('in-check'));

        if (this.isKingInCheck(this.currentPlayer)) {
            const kingPos = this.kingPositions[this.currentPlayer];
            const kingSquare = document.querySelector(`[data-row="${kingPos.row}"][data-col="${kingPos.col}"]`);
            if (kingSquare) {
                kingSquare.classList.add('in-check');
            }
        }
    }

    updateGameStatus() {
        document.getElementById('current-player').textContent = `${this.currentPlayer.charAt(0).toUpperCase() + this.currentPlayer.slice(1)}'s Turn`;
        document.getElementById('current-player').style.color = this.currentPlayer === 'white' ? '#27ae60' : '#e74c3c';

        const isCheck = this.isKingInCheck(this.currentPlayer);
        const isCheckmate = this.isCheckmate(this.currentPlayer);
        const isStalemate = this.isStalemate(this.currentPlayer);

        if (isCheckmate) {
            const winner = this.currentPlayer === 'white' ? 'Black' : 'White';
            document.getElementById('game-status').textContent = `CHECKMATE! ${winner} wins!`;
            document.getElementById('game-status').style.color = '#e74c3c';
        } else if (isStalemate) {
            document.getElementById('game-status').textContent = "Stalemate — Draw";
            document.getElementById('game-status').style.color = '#f39c12';
        } else if (isCheck) {
            document.getElementById('game-status').textContent = `${this.currentPlayer} is in check`;
            document.getElementById('game-status').style.color = '#e74c3c';
        } else {
            document.getElementById('game-status').textContent = 'Active';
            document.getElementById('game-status').style.color = '#27ae60';
        }
    }

    checkGameState() {
        // This is called after every move
        console.log(`🎮 Checking game state for ${this.currentPlayer}`);

        const isCheck = this.isKingInCheck(this.currentPlayer);
        const isCheckmate = this.isCheckmate(this.currentPlayer);

        if (isCheckmate) {
            const winner = this.currentPlayer === 'white' ? 'Black' : 'White';
            this.showGameOver(`${winner} wins by checkmate!`);
        }
    }

    showGameOver(message) {
        const overlay = document.createElement('div');
        overlay.className = 'game-over-overlay';
        overlay.innerHTML = `
            <div class="game-over-content">
                <h2>${message}</h2>
                <button onclick="location.reload()">New Game</button>
            </div>
        `;
        document.body.appendChild(overlay);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Starting COMPLETE CHESS FIX version...');
    new CompleteChessFix();
});
