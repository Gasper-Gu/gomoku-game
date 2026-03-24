/**
 * 五子棋游戏逻辑
 *
 * @author shop
 * @since 1.0.0
 */

/**
 * AI机器人类
 */
class AIPlayer {
    /**
     * @param {number} aiPlayer - AI玩家编号 (2=白方)
     * @param {string} difficulty - 难度 (amateur/medium/expert)
     */
    constructor(aiPlayer, difficulty = 'medium') {
        this.aiPlayer = aiPlayer;
        this.humanPlayer = aiPlayer === 1 ? 2 : 1;
        this.difficulty = difficulty;
    }

    /**
     * 获取AI落子位置
     * @param {Array<Array<number>>} board - 棋盘数据
     * @returns {Object} 落子坐标 {row, col}
     */
    getMove(board) {
        const gridSize = board.length;
        const moves = [];

        // 收集所有空位并计算评分
        for (let row = 0; row < gridSize; row++) {
            for (let col = 0; col < gridSize; col++) {
                if (board[row][col] === 0) {
                    const score = this.evaluateMove(board, row, col);
                    moves.push({ row, col, score });
                }
            }
        }

        // 按评分排序
        moves.sort((a, b) => b.score - a.score);

        if (moves.length === 0) {
            return null;
        }

        // 根据难度选择落子位置
        let bestMoves = [];

        if (this.difficulty === 'amateur') {
            // 业余：只考虑前3个最高分的棋，随机选择
            bestMoves = moves.slice(0, Math.min(3, moves.length));
        } else if (this.difficulty === 'medium') {
            // 中等：考虑前5个最高分的棋，加权随机
            bestMoves = moves.slice(0, Math.min(5, moves.length));
        } else {
            // 高手：考虑前10个最高分的棋，加权随机
            bestMoves = moves.slice(0, Math.min(10, moves.length));
        }

        // 使用热身选择（权重基于分数）
        return this.weightedRandomMove(bestMoves);
    }

    /**
     * 加权随机选择
     * @param {Array<Object>} moves - 落子数组
     * @returns {Object} 选中的落子
     */
    weightedRandomMove(moves) {
        const totalScore = moves.reduce((sum, m) => sum + m.score, 0);
        if (totalScore === 0) {
            return moves[Math.floor(Math.random() * moves.length)];
        }

        let random = Math.random() * totalScore;
        for (const move of moves) {
            random -= move.score;
            if (random <= 0) {
                return move;
            }
        }
        return moves[0];
    }

    /**
     * 评估某个位置的评分
     * @param {Array<Array<number>>} board - 棋盘数据
     * @param {number} row - 行坐标
     * @param {number} col - 列坐标
     * @returns {number} 评分
     */
    evaluateMove(board, row, col) {
        // 分数 = 进攻分数 + 防守分数 * 防守权重
        const attackScore = this.evaluatePattern(board, row, col, this.aiPlayer);
        const defenseScore = this.evaluatePattern(board, row, col, this.humanPlayer);

        // 高手模式下更注重防守平衡
        let defenseWeight = 1.0;
        if (this.difficulty === 'medium') {
            defenseWeight = 1.2;
        } else if (this.difficulty === 'expert') {
            defenseWeight = 1.5;
        }

        // 业余模式更激进，只关注进攻
        if (this.difficulty === 'amateur') {
            return attackScore + defenseScore * 0.5;
        }

        return attackScore + defenseScore * defenseWeight;
    }

    /**
     * 评估某个位置的模式分数
     * @param {Array<Array<number>>} board - 棋盘数据
     * @param {number} row - 行坐标
     * @param {number} col - 列坐标
     * @param {number} player - 玩家
     * @returns {number} 评分
     */
    evaluatePattern(board, row, col, player) {
        let score = 0;
        const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];

        for (const [dr, dc] of directions) {
            score += this.evaluateLine(board, row, col, dr, dc, player);
        }

        // 位置增益：靠近中心的棋更值钱
        const gridSize = board.length;
        const center = Math.floor(gridSize / 2);
        const distance = Math.abs(row - center) + Math.abs(col - center);
        score += (gridSize - distance) * 0.1;

        return score;
    }

    /**
     * 评估某条线上的模式
     * @param {Array<Array<number>>} board - 棋盘数据
     * @param {number} row - 行坐标
     * @param {number} col - 列坐标
     * @param {number} dr - 行方向
     * @param {number} dc - 列方向
     * @param {number} player - 玩家
     * @returns {number} 评分
     */
    evaluateLine(board, row, col, dr, dc, player) {
        let score = 0;

        // 检查两个方向
        const count1 = this.countContinuous(board, row, col, dr, dc, player);
        const count2 = this.countContinuous(board, row, col, -dr, -dc, player);
        const total = count1 + count2 + 1;

        // 开放端数
        const openEnds = this.countOpenEnds(board, row, col, dr, dc, player) +
                        this.countOpenEnds(board, row, col, -dr, -dc, player);

        // 连珠评分
        if (total >= 5) {
            score += 100000; // 连五 - 必胜/必防
        } else if (total === 4) {
            if (openEnds === 2) {
                score += 10000; // 活四 - 极强
            } else if (openEnds === 1) {
                score += 1000;  // 冲四
            }
        } else if (total === 3) {
            if (openEnds === 2) {
                score += 1000;  // 活三
            } else if (openEnds === 1) {
                score += 100;   // 眠三
            }
        } else if (total === 2) {
            if (openEnds === 2) {
                score += 100;   // 活二
            } else if (openEnds === 1) {
                score += 10;    // 眠二
            }
        }

        return score;
    }

    /**
     * 计算连续棋子数量
     * @param {Array<Array<number>>} board - 棋盘数据
     * @param {number} row - 行坐标
     * @param {number} col - 列坐标
     * @param {number} dr - 行方向
     * @param {number} dc - 列方向
     * @param {number} player - 玩家
     * @returns {number} 连续棋子数量
     */
    countContinuous(board, row, col, dr, dc, player) {
        let count = 0;
        const gridSize = board.length;
        let r = row + dr;
        let c = col + dc;

        while (r >= 0 && r < gridSize && c >= 0 && c < gridSize &&
               board[r][c] === player) {
            count++;
            r += dr;
            c += dc;
        }

        return count;
    }

    /**
     * 计算开放端数
     * @param {Array<Array<number>>} board - 棋盘数据
     * @param {number} row - 行坐标
     * @param {number} col - 列坐标
     * @param {number} dr - 行方向
     * @param {number} dc - 列方向
     * @param {number} player - 玩家
     * @returns {number} 开放端数
     */
    countOpenEnds(board, row, col, dr, dc, player) {
        const gridSize = board.length;
        const r = row + dr;
        const c = col + dc;

        if (r < 0 || r >= gridSize || c < 0 || c >= gridSize) {
            return 0; // 边界
        }

        return board[r][c] === 0 ? 1 : 0;
    }
}

/**
 * 五子棋游戏类
 */
class GomokuGame {
    /**
     * @param {number} gridSize - 棋盘大小 (默认 15x15)
     * @param {number} cellSize - 格子大小 (默认 30px)
     */
    constructor(gridSize = 15, cellSize = 30) {
        this.gridSize = gridSize;
        this.cellSize = cellSize;
        this.padding = cellSize / 2;

        // 棋盘数据：0=空，1=黑，2=白
        this.board = [];
        this.currentPlayer = 1; // 1=黑方，2=白方
        this.gameOver = false;
        this.moveHistory = []; // 记录每一步，用于悔棋
        this.difficulty = 'medium'; // 默认难度

        this.canvas = document.getElementById('chessBoard');
        this.context = this.canvas.getContext('2d');
        this.aiPlayer = new AIPlayer(2, this.difficulty); // AI执白

        // 初始化棋盘
        this.initBoard();
        this.initCanvas();
        this.bindEvents();
    }

    /**
     * 初始化棋盘数据
     */
    initBoard() {
        // 创建空棋盘
        this.board = Array.from({ length: this.gridSize }, () =>
            Array(this.gridSize).fill(0)
        );
    }

    /**
     * 初始化 Canvas
     */
    initCanvas() {
        // 使用响应式大小，根据容器调整
        const boardContainer = document.querySelector('.board-container');
        const maxSize = Math.min(boardContainer.clientWidth, boardContainer.clientHeight) - 60;
        const calculatedCellSize = Math.floor(maxSize / this.gridSize);

        this.cellSize = calculatedCellSize;
        this.padding = this.cellSize / 2;

        this.canvas.width = this.gridSize * this.cellSize;
        this.canvas.height = this.gridSize * this.cellSize;

        this.drawBoard();
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        // 绑定点击事件
        this.canvas.addEventListener('click', (e) => this.handleBoardClick(e));

        // 绑定按钮事件
        document.getElementById('restartBtn').addEventListener('click', () => this.restart());

        const undoBtn = document.getElementById('undoBtn');
        undoBtn.addEventListener('click', () => this.undo());

        // 绑定难度选择
        document.getElementById('difficultySelect').addEventListener('change', (e) => {
            this.difficulty = e.target.value;
            this.aiPlayer = new AIPlayer(2, this.difficulty);
        });

        // 更新悔棋按钮状态
        this.updateUndoButtonState();
    }

    /**
     * 绘制棋盘
     */
    drawBoard() {
        // 清空画布
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 绘制网格线
        this.context.strokeStyle = '#8b4513';
        this.context.lineWidth = 1;

        for (let i = 0; i < this.gridSize; i++) {
            // 绘制横线
            this.context.beginPath();
            this.context.moveTo(this.padding, this.padding + i * this.cellSize);
            this.context.lineTo(
                this.canvas.width - this.padding,
                this.padding + i * this.cellSize
            );
            this.context.stroke();

            // 绘制竖线
            this.context.beginPath();
            this.context.moveTo(this.padding + i * this.cellSize, this.padding);
            this.context.lineTo(
                this.padding + i * this.cellSize,
                this.canvas.height - this.padding
            );
            this.context.stroke();
        }

        // 绘制天元和星位
        this.drawStarPoints();

        // 绘制棋子
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                if (this.board[row][col] !== 0) {
                    this.drawPiece(row, col, this.board[row][col]);
                }
            }
        }

        // 标记最后一步
        if (this.moveHistory.length > 0) {
            this.drawLastMoveMarker();
        }
    }

    /**
     * 绘制天元和星位
     */
    drawStarPoints() {
        // 15路棋盘的星位位置
        const starPositions = [
            [3, 3], [3, 11], [7, 7], [11, 3], [11, 11]
        ];

        this.context.fillStyle = '#8b4513';

        for (const [row, col] of starPositions) {
            this.context.beginPath();
            const x = this.padding + col * this.cellSize;
            const y = this.padding + row * this.cellSize;
            this.context.arc(x, y, 3, 0, Math.PI * 2);
            this.context.fill();
        }
    }

    /**
     * 绘制棋子
     * @param {number} row - 行坐标
     * @param {number} col - 列坐标
     * @param {number} player - 玩家 (1=黑，2=白)
     */
    drawPiece(row, col, player) {
        const x = this.padding + col * this.cellSize;
        const y = this.padding + row * this.cellSize;
        const radius = this.cellSize * 0.4;

        this.context.beginPath();
        this.context.arc(x, y, radius, 0, Math.PI * 2);

        // 创建渐变效果
        const gradient = this.context.createRadialGradient(
            x - 2, y - 2, radius / 3,
            x, y, radius
        );

        if (player === 1) {
            // 黑棋渐变
            gradient.addColorStop(0, '#666');
            gradient.addColorStop(1, '#000');
        } else {
            // 白棋渐变
            gradient.addColorStop(0, '#fff');
            gradient.addColorStop(1, '#ddd');
        }

        this.context.fillStyle = gradient;
        this.context.fill();

        // 绘制棋子边框
        this.context.strokeStyle = '#333';
        this.context.lineWidth = 1;
        this.context.stroke();
    }

    /**
     * 标记最后一步
     */
    drawLastMoveMarker() {
        const lastMove = this.moveHistory[this.moveHistory.length - 1];
        const x = this.padding + lastMove.col * this.cellSize;
        const y = this.padding + lastMove.row * this.cellSize;

        this.context.fillStyle = 'red';
        this.context.fillRect(x - 2, y - 2, 4, 4);
    }

    /**
     * 处理棋盘点击
     * @param {Event} e - 点击事件
     */
    handleBoardClick(e) {
        // 游戏结束无法落子
        if (this.gameOver) return;

        // 如果当前是AI回合，禁止玩家落子
        if (this.currentPlayer === 2 && !this.gameOver) return;

        // 获取点击坐标
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // 计算最近的交叉点
        const col = Math.round((mouseX - this.padding) / this.cellSize);
        const row = Math.round((mouseY - this.padding) / this.cellSize);

        // 检查是否在棋盘范围内
        if (row < 0 || row >= this.gridSize || col < 0 || col >= this.gridSize) {
            return;
        }

        // 检查该位置是否已有棋子
        if (this.board[row][col] !== 0) {
            return;
        }

        // 落子
        this.makeMove(row, col);
    }

    /**
     * 落子操作
     * @param {number} row - 行坐标
     * @param {number} col - 列坐标
     */
    makeMove(row, col) {
        // 记录棋盘数据
        this.board[row][col] = this.currentPlayer;

        // 记录历史
        this.moveHistory.push({
            row: row,
            col: col,
            player: this.currentPlayer
        });

        // 绘制棋子
        this.drawPiece(row, col, this.currentPlayer);
        this.drawLastMoveMarker();

        // 检查胜负
        if (this.checkWin(row, col, this.currentPlayer)) {
            this.gameOver = true;
            this.showWinMessage(this.currentPlayer);
            return;
        } else if (this.moveHistory.length === this.gridSize * this.gridSize) {
            // 平局
            this.gameOver = true;
            this.showDrawMessage();
            return;
        } else {
            // 切换玩家
            this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
            this.updatePlayerStatus();
        }

        // 更新悔棋按钮状态
        this.updateUndoButtonState();

        // 如果轮到AI，让AI落子
        if (this.currentPlayer === 2 && !this.gameOver) {
            // 延迟一点，让玩家看到落子效果
            setTimeout(() => this.aiMove(), 300);
        }
    }

    /**
     * AI落子
     */
    aiMove() {
        if (this.gameOver) return;

        const move = this.aiPlayer.getMove(this.board);
        if (move) {
            this.makeMove(move.row, move.col);
        }
    }

    /**
     * 悔棋操作
     */
    undo() {
        if (this.moveHistory.length === 0 || this.gameOver) return;

        // 撤销最后两步（玩家+AI）
        for (let i = 0; i < 2; i++) {
            if (this.moveHistory.length > 0) {
                const lastMove = this.moveHistory.pop();
                this.board[lastMove.row][lastMove.col] = 0;
            }
        }

        // 恢复玩家
        this.currentPlayer = 1;

        // 重新绘制棋盘
        this.drawBoard();
        this.updatePlayerStatus();
        this.updateUndoButtonState();

        // 隐藏结果信息
        document.getElementById('gameResult').classList.remove('show');
    }

    /**
     * 更新玩家状态显示
     */
    updatePlayerStatus() {
        const indicator = document.getElementById('playerIndicator');
        const name = document.querySelector('#playerText');
        const aiName = document.getElementById('aiName');

        if (this.currentPlayer === 1) {
            // Black's turn - update show text only, keep HTML
            document.querySelector('.player-name.active').textContent = '黑方';
            indicator.className = 'player-indicator black active-black';
        } else {
            // White/AI's turn
            document.querySelector('.player-name.active').textContent = '白方（AI）';
            indicator.className = 'player-indicator white active-white';
        }

        // Update AI name visibility
        if (this.currentPlayer === 2) {
            aiName.style.opacity = '1';
        } else {
            aiName.style.opacity = '0.6';
        }
    }

    /**
     * 更新悔棋按钮状态
     */
    updateUndoButtonState() {
        const undoBtn = document.getElementById('undoBtn');
        // 只有当步骤数>=2且不是AI回合时才允许悔棋
        undoBtn.disabled = this.moveHistory.length < 2 || this.currentPlayer === 2 || this.gameOver;
    }

    /**
     * 检查胜负
     * @param {number} row - 最后落子行
     * @param {number} col - 最后落子列
     * @param {number} player - 当前玩家
     * @returns {boolean} 是否获胜
     */
    checkWin(row, col, player) {
        // 四个方向：横、竖、左斜、右斜
        const directions = [
            [0, 1],  // 横向
            [1, 0],  // 纵向
            [1, 1],  // 左斜 (\)
            [1, -1]  // 右斜 (/)
        ];

        for (const [dr, dc] of directions) {
            let count = 1; // 当前落子算1个

            // 向一个方向检查
            for (let i = 1; i < 5; i++) {
                const r = row + dr * i;
                const c = col + dc * i;
                if (r >= 0 && r < this.gridSize && c >= 0 && c < this.gridSize &&
                    this.board[r][c] === player) {
                    count++;
                } else {
                    break;
                }
            }

            // 向反方向检查
            for (let i = 1; i < 5; i++) {
                const r = row - dr * i;
                const c = col - dc * i;
                if (r >= 0 && r < this.gridSize && c >= 0 && c < this.gridSize &&
                    this.board[r][c] === player) {
                    count++;
                } else {
                    break;
                }
            }

            // 连成5子
            if (count >= 5) {
                return true;
            }
        }

        return false;
    }

    /**
     * 显示获胜信息
     * @param {number} winner - 获胜方 (1=黑，2=白)
     */
    showWinMessage(winner) {
        const resultDiv = document.getElementById('gameResult');
        const resultTitle = document.getElementById('resultTitle');
        const resultMessage = document.getElementById('resultMessage');

        if (winner === 1) {
            resultTitle.textContent = 'Black Wins!';
            resultMessage.textContent = '恭喜！你击败了 AI！';
            resultDiv.className = 'game-result win show';
        } else {
            resultTitle.textContent = 'White Wins!';
            resultMessage.textContent = '很遗憾，AI 获胜了！';
            resultDiv.className = 'game-result win show';
        }
    }

    /**
     * 显示平局信息
     */
    showDrawMessage() {
        const resultDiv = document.getElementById('gameResult');
        const resultTitle = document.getElementById('resultTitle');
        const resultMessage = document.getElementById('resultMessage');

        resultTitle.textContent = 'Draw!';
        resultMessage.textContent = '棋逢对手，平局收场！';
        resultDiv.className = 'game-result draw show';
    }

    /**
     * 重新开始游戏
     */
    restart() {
        this.initBoard();
        this.currentPlayer = 1;
        this.gameOver = false;
        this.moveHistory = [];

        // 重新初始化棋盘大小
        this.initCanvas();
        this.updatePlayerStatus();
        this.updateUndoButtonState();

        document.getElementById('gameResult').classList.remove('show');
    }
}

// 初始化游戏
window.onload = function() {
    window.game = new GomokuGame(15, 30);
};
