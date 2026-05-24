import { columns } from '../modules/chess-board/models';
import { FENConverter } from './FENConverter';
import { Bishop } from './Pieces/bishop';
import { King } from './Pieces/king';
import { Knight } from './Pieces/knight';
import { Pawn } from './Pieces/pawn';
import { Piece } from './Pieces/piece';
import { Queen } from './Pieces/queen';
import { Rook } from './Pieces/rook';
import {
  CheckState,
  Color,
  Coords,
  FENChar,
  LastMove,
  SafeSquares,
  GameHistory,
  MoveList,
  MoveType,
} from './models';

export class ChessBoard {
  private readonly chessBoardSize: number = 8;
  private chessBoard: (Piece | null)[][];
  private _playerColor = Color.White;
  private _safeSquares: SafeSquares;
  private _lastMove: LastMove | undefined;
  private _checkState: CheckState = { isInCheck: false };
  private fiftyMoveCounter: number = 0;

  private _isGameOver: boolean = false;
  private _gameOverMessage: string | undefined;

  private fullNumberOfMoves = 1;
  private _boardAsFEN: string =
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  private FENConverter = new FENConverter();
  private threeFoldRepetitionDictionary = new Map<string, number>();
  private threeFoldRepetitionFlag: boolean = false;
  private _moveList: MoveList = [];
  private _gameHistory: GameHistory;
  constructor() {
    this.chessBoard = [
      [
        new Rook(Color.White),
        new Knight(Color.White),
        new Bishop(Color.White),
        new Queen(Color.White),
        new King(Color.White),
        new Bishop(Color.White),
        new Knight(Color.White),
        new Rook(Color.White),
      ],
      [
        new Pawn(Color.White),
        new Pawn(Color.White),
        new Pawn(Color.White),
        new Pawn(Color.White),
        new Pawn(Color.White),
        new Pawn(Color.White),
        new Pawn(Color.White),
        new Pawn(Color.White),
      ],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [
        new Pawn(Color.Black),
        new Pawn(Color.Black),
        new Pawn(Color.Black),
        new Pawn(Color.Black),
        new Pawn(Color.Black),
        new Pawn(Color.Black),
        new Pawn(Color.Black),
        new Pawn(Color.Black),
      ],
      [
        new Rook(Color.Black),
        new Knight(Color.Black),
        new Bishop(Color.Black),
        new Queen(Color.Black),
        new King(Color.Black),
        new Bishop(Color.Black),
        new Knight(Color.Black),
        new Rook(Color.Black),
      ],
    ];
    this._safeSquares = this.findSafeSquares();

    this._gameHistory = [
      {
        board: this.chessBoardView,
        lastMove: this._lastMove,
        checkState: this._checkState,
      },
    ];
  }

  public get safeSquares(): SafeSquares {
    return this._safeSquares;
  }

  public get lastMove(): LastMove | undefined {
    return this._lastMove;
  }

  public get playerColor(): Color {
    return this._playerColor;
  }

  public get checkState(): CheckState {
    return this._checkState;
  }

  public get gameOverMessage(): string | undefined {
    return this._gameOverMessage;
  }

  public get isGameOver(): boolean {
    return this._isGameOver;
  }

  public get chessBoardView(): (FENChar | null)[][] {
    return this.chessBoard.map((row) => {
      return row.map((piece) =>
        piece instanceof Piece ? piece.FENChar : null,
      );
    });
  }

  public get boardAsFEN(): string {
    return this._boardAsFEN;
  }

  public get moveList(): MoveList {
    return this._moveList;
  }

  public get gameHistory(): GameHistory {
    return this._gameHistory;
  }

  public static isSquareDark(x: number, y: number): boolean {
    return (x % 2 === 0 && y % 2 === 0) || (x % 2 === 1 && y % 2 === 1);
  }

  private areCoordsValid(x: number, y: number): boolean {
    return (
      x >= 0 && y >= 0 && x < this.chessBoardSize && y < this.chessBoardSize
    );
  }

  public isInCheck(
    playerColor: Color,
    checkingCurrentPosition: boolean,
  ): boolean {
    for (let x = 0; x < this.chessBoardSize; x++) {
      for (let y = 0; y < this.chessBoardSize; y++) {
        const piece: Piece | null = this.chessBoard[x][y];
        if (!piece || piece.color === playerColor) continue;

        for (const { x: dx, y: dy } of piece.directions) {
          let newX: number = x + dx;
          let newY: number = y + dy;

          if (!this.areCoordsValid(newX, newY)) continue;

          if (
            piece instanceof Pawn ||
            piece instanceof Knight ||
            piece instanceof King
          ) {
            // Pawn attacks diagonally.
            if (piece instanceof Pawn && dy === 0) continue;

            const attackedPiece: Piece | null = this.chessBoard[newX][newY];
            if (
              attackedPiece instanceof King &&
              attackedPiece.color === playerColor
            ) {
              if (checkingCurrentPosition)
                this._checkState = { isInCheck: true, x: newX, y: newY };
              return true;
            }
          } else {
            while (this.areCoordsValid(newX, newY)) {
              const attackedPiece: Piece | null = this.chessBoard[newX][newY];
              if (
                attackedPiece instanceof King &&
                attackedPiece.color === playerColor
              ) {
                if (checkingCurrentPosition)
                  this._checkState = { isInCheck: true, x: newX, y: newY };
                return true;
              }
              if (attackedPiece !== null) break;

              newX += dx;
              newY += dy;
            }
          }
        }
      }
    }
    if (checkingCurrentPosition) this._checkState = { isInCheck: false };
    return false;
  }

  private isPositionSafeAfterMove(
    prevX: number,
    prevY: number,
    newX: number,
    newY: number,
  ): boolean {
    const piece: Piece | null = this.chessBoard[prevX][prevY];
    if (!piece) return false;
    const newPiece: Piece | null = this.chessBoard[newX][newY];

    // we cant put a piece on a square that already contains a piece of the same square.
    if (newPiece && newPiece.color === piece.color) return false;

    // simulate position
    this.chessBoard[prevX][prevY] = null;
    this.chessBoard[newX][newY] = piece;

    const isPostionSafe: boolean = !this.isInCheck(piece.color, false);

    // restore position
    this.chessBoard[prevX][prevY] = piece;
    this.chessBoard[newX][newY] = newPiece;

    return isPostionSafe;
  }

  private findSafeSquares(): SafeSquares {
    const SafeSquares: SafeSquares = new Map<string, Coords[]>();
    for (let x = 0; x < this.chessBoardSize; x++) {
      for (let y = 0; y < this.chessBoardSize; y++) {
        const piece: Piece | null = this.chessBoard[x][y];
        if (!piece || piece.color !== this._playerColor) continue;

        const pieceSafeSquares: Coords[] = [];

        for (const { x: dx, y: dy } of piece.directions) {
          let newX: number = x + dx;
          let newY: number = y + dy;

          if (!this.areCoordsValid(newX, newY)) continue;

          let newPiece: Piece | null = this.chessBoard[newX][newY];
          if (newPiece && newPiece.color === piece.color) continue;

          // restrict pawn movements in certain directions
          if (piece instanceof Pawn) {
            // cant move pawn two squares straight if there is piece infront of him
            if (dx === 2 || dx === -2) {
              if (newPiece) continue;
              if (this.chessBoard[newX + (dx === 2 ? -1 : 1)][newY]) continue;
            }

            // cant move pawn one square straight if piece is infront of him
            if ((dx === 1 || dx === -1) && dy === 0 && newPiece) continue;

            // cant move pawn diagonally if there is no piece, or piece has same color as pawn
            if (
              (dy === 1 || dy === -1) &&
              (!newPiece || piece.color === newPiece.color)
            )
              continue;
          }

          if (
            piece instanceof Pawn ||
            piece instanceof Knight ||
            piece instanceof King
          ) {
            if (this.isPositionSafeAfterMove(x, y, newX, newY)) {
              pieceSafeSquares.push({ x: newX, y: newY });
            }
          } else {
            while (this.areCoordsValid(newX, newY)) {
              newPiece = this.chessBoard[newX][newY];
              if (newPiece && newPiece.color === piece.color) break;

              if (this.isPositionSafeAfterMove(x, y, newX, newY)) {
                pieceSafeSquares.push({ x: newX, y: newY });
              }

              if (newPiece !== null) break;

              newX += dx;
              newY += dy;
            }
          }
        }
        if (piece instanceof King) {
          if (this.canCastle(piece, true)) pieceSafeSquares.push({ x, y: 6 });
          if (this.canCastle(piece, false)) pieceSafeSquares.push({ x, y: 2 });
        } else if (
          piece instanceof Pawn &&
          this.canCaptureEnPassant(piece, x, y)
        ) {
          pieceSafeSquares.push({
            x: x + (piece.color === Color.White ? 1 : -1),
            y: this._lastMove!.prevY,
          });
        }
        if (pieceSafeSquares.length)
          SafeSquares.set(x + ',' + y, pieceSafeSquares);
      }
    }

    return SafeSquares;
  }

  private canCaptureEnPassant(pawn: Pawn, pawnX: number, pawnY: number) {
    if (!this._lastMove) return false;
    const { piece, prevX, prevY, currX, currY } = this._lastMove;

    if (
      !(piece instanceof Pawn) ||
      pawn.color !== this._playerColor ||
      Math.abs(currX - prevX) !== 2 ||
      pawnX !== currX ||
      Math.abs(pawnY - currY) !== 1
    )
      return false;

    const pawnNewPositionX: number =
      pawnX + (pawn.color === Color.White ? 1 : -1);
    const pawnNewPositionY: number = currY;

    this.chessBoard[currX][currY] = null;
    const isPositionSafe: boolean = this.isPositionSafeAfterMove(
      pawnX,
      pawnY,
      pawnNewPositionX,
      pawnNewPositionY,
    );
    this.chessBoard[currX][currY] = piece;

    return isPositionSafe;
  }

  private canCastle(king: King, kingSideCastle: boolean): boolean {
    if (king.hasMoved) return false;

    const kingPositionX: number = king.color === Color.White ? 0 : 7;
    const kingPositionY: number = 4;
    const rookPositionX: number = kingPositionX;
    const rookPostionY: number = kingSideCastle ? 0 : 7;
    const rook: Piece | null = this.chessBoard[rookPositionX][rookPostionY];

    if (!(rook instanceof Rook) || rook.hasMoved || this._checkState.isInCheck)
      return false;

    const firstNextKingPositionY: number =
      kingPositionY + (kingSideCastle ? 2 : -2);
    const secondNextKingPositionY: number =
      kingPositionY + (kingSideCastle ? 2 : -2);

    if (
      this.chessBoard[kingPositionX][firstNextKingPositionY] ||
      this.chessBoard[kingPositionX][secondNextKingPositionY]
    )
      return false;

    if (!kingSideCastle && this.chessBoard[kingPositionX][1]) return false;

    return (
      this.isPositionSafeAfterMove(
        kingPositionX,
        kingPositionY,
        kingPositionX,
        firstNextKingPositionY,
      ) &&
      this.isPositionSafeAfterMove(
        kingPositionX,
        kingPositionY,
        kingPositionX,
        secondNextKingPositionY,
      )
    );
  }

  public move(
    prevX: number,
    prevY: number,
    newX: number,
    newY: number,
    promotedPieceType: FENChar | null = null,
  ): void {
    if (this._isGameOver)
      throw new Error('Game is over, you cannot play move!');

    if (!this.areCoordsValid(prevX, prevY) || !this.areCoordsValid(newX, newY))
      return;
    const piece: Piece | null = this.chessBoard[prevX][prevY];
    if (!piece || piece.color !== this._playerColor) return;

    const pieceSafeSquares: Coords[] | undefined = this._safeSquares.get(
      prevX + ',' + prevY,
    );
    if (
      !pieceSafeSquares ||
      !pieceSafeSquares.find((coords) => coords.x === newX && coords.y === newY)
    )
      throw new Error('Square is not safe!');

    if (
      (piece instanceof Pawn ||
        piece instanceof King ||
        piece instanceof Rook) &&
      !piece.hasMoved
    )
      piece.hasMoved = true;

    const moveType = new Set<MoveType>();

    const isPieceTaken = this.chessBoard[newX][newY] !== null;
    if (isPieceTaken) moveType.add(MoveType.Capture);
    if (piece instanceof Pawn || isPieceTaken) this.fiftyMoveCounter = 0;
    else this.fiftyMoveCounter += 0.5;

    this.handlingSpecialMoves(piece, prevX, prevY, newX, newY, moveType);
    // update the board
    if (promotedPieceType) {
      this.chessBoard[newX][newY] = this.promotedPiece(promotedPieceType);
      moveType.add(MoveType.Promotion);
    } else {
      this.chessBoard[newX][newY] = piece;
    }

    this.chessBoard[prevX][prevY] = null;

    this._lastMove = {
      prevX,
      prevY,
      currX: newX,
      currY: newY,
      piece,
      moveType,
    };

    this._playerColor =
      this._playerColor === Color.White ? Color.Black : Color.White;
    this.isInCheck(this._playerColor, true);
    this._safeSquares = this.findSafeSquares();

    if (this._checkState.isInCheck)
      moveType.add(
        !this.safeSquares.size ? MoveType.CheckMate : MoveType.Check,
      );
    else if (!moveType.size) moveType.add(MoveType.BasicMove);

    this.storeMove(promotedPieceType);
    this.updateGameHistory();

    if (this._playerColor === Color.White) this.fullNumberOfMoves++;
    this._boardAsFEN = this.FENConverter.boardToFEN(
      this.chessBoard,
      this._playerColor,
      this._lastMove,
      this.fiftyMoveCounter,
      this.fullNumberOfMoves,
    );
    this.updateThreeFoldRepetitionDictionary(this._boardAsFEN);
    this._isGameOver = this.isGameFinished();
  }

  private handlingSpecialMoves(
    piece: Piece,
    prevX: number,
    prevY: number,
    newX: number,
    newY: number,
    moveType: Set<MoveType>,
  ): void {
    if (piece instanceof King && Math.abs(newY - prevY) === 2) {
      const rookPositionX: number = prevX;
      const rookPositionY: number = newY > prevY ? 7 : 0;
      const rook = this.chessBoard[rookPositionX][rookPositionY] as Rook;
      const rookNewPositionY: number = newY > prevY ? 5 : 3;

      this.chessBoard[rookPositionX][rookPositionY] = null;
      this.chessBoard[rookPositionX][rookNewPositionY] = rook;
      rook.hasMoved = true;
      moveType.add(MoveType.Castling);
    } else if (
      piece instanceof Pawn &&
      this._lastMove &&
      this._lastMove.piece instanceof Pawn &&
      Math.abs(this._lastMove.currX - this._lastMove.prevX) === 2 &&
      prevX === this._lastMove.currX &&
      newY === this._lastMove.currY
    ) {
      this.chessBoard[this._lastMove.currX][this._lastMove.currY] = null;

      moveType.add(MoveType.Capture);
    }
  }

  private promotedPiece(
    promotedPieceType: FENChar,
  ): Knight | Rook | Bishop | Queen | null {
    if (
      promotedPieceType === FENChar.WhiteKnight ||
      promotedPieceType === FENChar.BlackKnight
    ) {
      return new Knight(this._playerColor);
    }

    if (
      promotedPieceType === FENChar.WhiteBishop ||
      promotedPieceType === FENChar.BlackBishop
    ) {
      return new Bishop(this._playerColor);
    }

    if (
      promotedPieceType === FENChar.WhiteRook ||
      promotedPieceType === FENChar.BlackRook
    ) {
      return new Rook(this._playerColor);
    }

    if (
      promotedPieceType === FENChar.WhiteQueen ||
      promotedPieceType === FENChar.BlackQueen
    ) {
      return new Queen(this._playerColor);
    }
    return null;
  }

  private isGameFinished(): boolean {
    if (this.insufficientMaterial()) {
      this._gameOverMessage = 'Draw due to insufficient material';
      return true;
    }

    if (!this._safeSquares.size) {
      if (this._checkState.isInCheck) {
        const prevPlayer: string =
          this._playerColor === Color.White ? 'Black' : 'White';
        this._gameOverMessage = prevPlayer + ' won by checkmate';
        return true;
      }
      this._gameOverMessage = 'stalemate';
      return true;
    }

    if (this.threeFoldRepetitionFlag) {
      this._gameOverMessage = 'Game over due to three fold repetition';
      return true;
    }

    if (this.fiftyMoveCounter === 50) {
      this._gameOverMessage = 'Draw due to fifty move rule.';
      return true;
    }
    return false;
  }

  // insufficient material
  private playerHasTwoKnights(
    pieces: { piece: Piece; x: number; y: number }[],
  ): boolean {
    return pieces.filter((piece) => piece.piece instanceof Knight).length === 2;
  }

  private playerHasBishopsOfSameColor(
    pieces: { piece: Piece; x: number; y: number }[],
  ): boolean {
    const bishops = pieces.filter((piece) => piece.piece instanceof Bishop);
    const areAllBishopsOfSAmeColor =
      new Set(
        bishops.map((bishop) => ChessBoard.isSquareDark(bishop.x, bishop.y)),
      ).size === 1;
    return bishops.length === pieces.length - 1 && areAllBishopsOfSAmeColor;
  }

  private insufficientMaterial(): boolean {
    const whitePieces: { piece: Piece; x: number; y: number }[] = [];
    const blackPieces: { piece: Piece; x: number; y: number }[] = [];

    for (let x = 0; x < this.chessBoardSize; x++) {
      for (let y = 0; y < this.chessBoardSize; y++) {
        const piece: Piece | null = this.chessBoard[x][y];
        if (!piece) continue;

        if (piece.color === Color.White) whitePieces.push({ piece, x, y });
        else blackPieces.push({ piece, x, y });
      }
    }

    // King v King
    if (whitePieces.length === 1 && blackPieces.length === 1) {
      return true;
    }

    //King and Minor Piece v King
    if (whitePieces.length === 1 && blackPieces.length === 2) {
      return blackPieces.some(
        (piece) =>
          piece.piece instanceof Knight || piece.piece instanceof Bishop,
      );
    } else if (whitePieces.length === 2 && blackPieces.length === 1) {
      return whitePieces.some(
        (piece) =>
          piece.piece instanceof Knight || piece.piece instanceof Bishop,
      );
    }

    // If Both Bishops are of the same Color.
    else if (whitePieces.length === 2 && blackPieces.length === 2) {
      const whiteBishop = whitePieces.find(
        (piece) => piece.piece instanceof Bishop,
      );
      const blackBishop = blackPieces.find(
        (piece) => piece.piece instanceof Bishop,
      );

      if (whiteBishop && blackBishop) {
        const areBishopsOfSameColor: boolean =
          (ChessBoard.isSquareDark(whiteBishop.x, whiteBishop.y) &&
            ChessBoard.isSquareDark(blackBishop.x, blackBishop.y)) ||
          (!ChessBoard.isSquareDark(whiteBishop.x, whiteBishop.y) &&
            !ChessBoard.isSquareDark(blackBishop.x, blackBishop.y));

        return areBishopsOfSameColor;
      }
    }
    // Two Knights and King v King
    if (
      (whitePieces.length === 3 &&
        blackPieces.length === 1 &&
        this.playerHasTwoKnights(whitePieces)) ||
      (whitePieces.length === 1 &&
        blackPieces.length === 3 &&
        this.playerHasTwoKnights(blackPieces))
    ) {
      return true;
    }

    //King and Two or more bishops of same color v King
    if (
      (whitePieces.length >= 3 &&
        blackPieces.length === 1 &&
        this.playerHasBishopsOfSameColor(whitePieces)) ||
      (whitePieces.length === 1 &&
        blackPieces.length >= 3 &&
        this.playerHasBishopsOfSameColor(blackPieces))
    ) {
      return true;
    }

    return false;
  }

  private updateThreeFoldRepetitionDictionary(FEN: string) {
    const threeFoldRepetitionFENKey: string = FEN.split(' ')
      .slice(0, 4)
      .join('');
    const threeFoldRepetitionValue: number | undefined =
      this.threeFoldRepetitionDictionary.get(threeFoldRepetitionFENKey);

    if (threeFoldRepetitionValue === undefined) {
      this.threeFoldRepetitionDictionary.set(threeFoldRepetitionFENKey, 1);
    } else {
      if (threeFoldRepetitionValue === 2) {
        this.threeFoldRepetitionFlag = true;
        return;
      }
      this.threeFoldRepetitionDictionary.set(threeFoldRepetitionFENKey, 2);
    }
  }

  private storeMove(promotedPiece: FENChar | null): void {
    const { piece, currX, currY, prevX, prevY, moveType } = this._lastMove!;
    let pieceName: string = !(piece instanceof Pawn)
      ? piece.FENChar.toUpperCase()
      : '';
    let move: string;

    if (moveType.has(MoveType.Castling))
      move = currY - prevY === 2 ? 'O-O' : 'O-O-O';
    else {
      move = pieceName + this.startingPieceCoordsNotation();
      if (moveType.has(MoveType.Capture))
        move += piece instanceof Pawn ? columns[prevY] + 'x' : 'x';
      move += columns[currY] + String(currX + 1);

      if (promotedPiece) move += '=' + promotedPiece.toUpperCase();
    }

    if (moveType.has(MoveType.Check)) move += '+';
    else if (moveType.has(MoveType.CheckMate)) move += '#';

    if (!this._moveList[this.fullNumberOfMoves - 1])
      this._moveList[this.fullNumberOfMoves - 1] = [move];
    else this._moveList[this.fullNumberOfMoves - 1].push(move);
  }

  private startingPieceCoordsNotation(): string {
    const { piece: currPiece, prevX, prevY, currX, currY } = this._lastMove!;
    if (currPiece instanceof Pawn || currPiece instanceof King) return '';

    const samePiecesCoords: Coords[] = [{ x: prevX, y: prevY }];

    for (let x = 0; x < this.chessBoardSize; x++) {
      for (let y = 0; y < this.chessBoardSize; y++) {
        const piece: Piece | null = this.chessBoard[x][y];
        if (!piece || (currX === x && currY === y)) continue;

        if (piece.FENChar === currPiece.FENChar) {
          const safeSquares: Coords[] =
            this._safeSquares.get(x + ',' + y) || [];
          const pieceHasSameTargetSquare: boolean = safeSquares.some(
            (coords) => coords.x === currX && coords.y === currY,
          );
          if (pieceHasSameTargetSquare) samePiecesCoords.push({ x, y });
        }
      }
    }

    if (samePiecesCoords.length === 1) return '';

    const piecesFile = new Set(samePiecesCoords.map((coords) => coords.y));
    const piecesRank = new Set(samePiecesCoords.map((coords) => coords.x));

    // means that all of the pieces are on different files (a, b, c, ...)
    if (piecesFile.size === samePiecesCoords.length) return columns[prevY];

    // means that all of the pieces are on different rank (1, 2, 3, ...)
    if (piecesRank.size === samePiecesCoords.length) return String(prevX + 1);

    // in case that there are pieces that shares both rank and a file with multiple or one piece
    return columns[prevY] + String(prevX + 1);
  }

  private updateGameHistory(): void {
    this._gameHistory.push({
      board: [...this.chessBoardView.map((row) => [...row])],
      checkState: { ...this._checkState },
      lastMove: this._lastMove ? { ...this._lastMove } : undefined,
    });
  }
}
