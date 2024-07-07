import { Component } from '@angular/core';
import { ChessBoard } from '../../chess-logic/chess-board';
import {
  CheckState,
  Color,
  Coords,
  FENChar,
  LastMove,
  SafeSquares,
  pieceImagePaths,
} from '../../chess-logic/models';
import { CommonModule } from '@angular/common';
import { SelectedSquare } from './models';

@Component({
  selector: 'chess-board',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './chess-board.component.html',
  styleUrl: './chess-board.component.css',
})
export class ChessBoardComponent {
  public pieceImagePaths = pieceImagePaths;

  private chessBoard = new ChessBoard();
  public chessBoardView: (FENChar | null)[][] = this.chessBoard.chessBoardView;
  public get playerColor(): Color {
    return this.chessBoard.playerColor;
  }
  public get safeSqares(): SafeSquares {
    return this.chessBoard.safeSquares;
  }

  public get gameOverMessage(): undefined | string {
    return this.chessBoard.gameOverMessage;
  }

  private selectedSquare: SelectedSquare = { piece: null };

  private pieceSafeSquares: Coords[] = [];

  private lastMove: LastMove | undefined = this.chessBoard.lastMove;

  private checkState: CheckState = this.chessBoard.checkState;

  // properties for pawn promotion
  public isPromotionActive: boolean = false;
  private promotionCoords: Coords | null = null;
  private promotedPiece: FENChar | null = null;
  public promotionPieces(): FENChar[] {
    return this.playerColor === Color.White
      ? [
          FENChar.WhiteBishop,
          FENChar.WhiteKnight,
          FENChar.WhiteQueen,
          FENChar.WhiteRook,
        ]
      : [
          FENChar.BlackBishop,
          FENChar.BlackKnight,
          FENChar.BlackQueen,
          FENChar.BlackRook,
        ];
  }

  public isSquareDark(x: number, y: number): boolean {
    return ChessBoard.isSquareDark(x, y);
  }

  public isSquareSelected(x: number, y: number): boolean {
    if (!this.selectedSquare.piece) return false;
    return this.selectedSquare.x === x && this.selectedSquare.y === y;
  }

  public isSquareSafeForSelectedPiece(x: number, y: number): boolean {
    return this.pieceSafeSquares.some(
      (coords) => coords.x === x && coords.y === y
    );
  }

  public isSquareLastMove(x: number, y: number): boolean {
    if (!this.lastMove) return false;

    const { prevX, prevY, currX, currY } = this.lastMove;
    return (x === prevX && y === prevY) || (x === currX && y === currY);
  }

  public isSquareChecked(x: number, y: number) {
    return (
      this.checkState.isInCheck &&
      this.checkState.x === x &&
      this.checkState.y === y
    );
  }

  public isSquareAPromotionSquare(x: number, y: number): boolean {
    if (!this.promotionCoords) return false;
    return this.promotionCoords.x === x && this.promotionCoords.y === y;
  }

  public unmarkingPreviouslySelectedAndSafeSquares(): void {
    this.selectedSquare = { piece: null };
    this.pieceSafeSquares = [];

    if (this.isPromotionActive) {
      this.isPromotionActive = false;
      this.promotedPiece = null;
      this.promotionCoords = null;
    }
  }

  public selectingPiece(x: number, y: number): void {
    if (this.gameOverMessage !== undefined) return;
    const piece: FENChar | null = this.chessBoardView[x][y];
    if (!piece) return;
    if (this.isWrongPieceSelected(piece)) return;

    const isSameSquareClicked: boolean =
      !!this.selectedSquare.piece &&
      this.selectedSquare.x === x &&
      this.selectedSquare.y === y;
    this.unmarkingPreviouslySelectedAndSafeSquares();
    if (isSameSquareClicked) return;
    this.selectedSquare = { piece, x, y };
    this.pieceSafeSquares = this.safeSqares.get(x + ',' + y) || [];
  }

  public placingPiece(newX: number, newY: number) {
    if (!this.selectedSquare.piece) return;
    if (!this.isSquareSafeForSelectedPiece(newX, newY)) return;

    // pawn promotion
    const isPawnSelected: boolean =
      this.selectedSquare.piece === FENChar.WhitePawn ||
      this.selectedSquare.piece === FENChar.BlackPawn;

    const isPawnOnLastRank: boolean =
      isPawnSelected && (newX === 7 || newX === 0);

    const shouldOpenPromotionDialogue: boolean =
      !this.isPromotionActive && isPawnOnLastRank;

    if (shouldOpenPromotionDialogue) {
      this.pieceSafeSquares = [];
      this.isPromotionActive = true;
      this.promotionCoords = { x: newX, y: newY };
      return;
    }

    const { x: prevX, y: prevY } = this.selectedSquare;
    this.updateBoard(prevX, prevY, newX, newY);
  }

  private updateBoard(
    prevX: number,
    prevY: number,
    newX: number,
    newY: number
  ): void {
    this.chessBoard.move(prevX, prevY, newX, newY, this.promotedPiece);
    this.chessBoardView = this.chessBoard.chessBoardView;
    this.checkState = this.chessBoard.checkState;
    this.lastMove = this.chessBoard.lastMove;
    this.unmarkingPreviouslySelectedAndSafeSquares();
  }

  public promotePiece(piece: FENChar): void {
    if (!this.promotionCoords || !this.selectedSquare.piece) return;
    this.promotedPiece = piece;
    const { x: newX, y: newY } = this.promotionCoords;
    const { x: prevX, y: prevY } = this.selectedSquare;
    this.updateBoard(prevX, prevY, newX, newY);
  }

  public clossPawnPromotionDialog(): void {
    this.unmarkingPreviouslySelectedAndSafeSquares();
  }

  public move(x: number, y: number): void {
    this.selectingPiece(x, y);
    this.placingPiece(x, y);
  }

  public isWrongPieceSelected(piece: FENChar): boolean {
    const isWhitePieceSelected: boolean = piece === piece.toUpperCase();
    return (
      (isWhitePieceSelected && this.playerColor === Color.Black) ||
      (!isWhitePieceSelected && this.playerColor === Color.White)
    );
  }
}
