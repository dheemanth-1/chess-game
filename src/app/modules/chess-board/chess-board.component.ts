import {
  Component,
  inject,
  Inject,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
} from '@angular/core';
import { ChessBoard } from '../../chess-logic/chess-board';
import {
  CheckState,
  Color,
  Coords,
  FENChar,
  LastMove,
  SafeSquares,
  pieceImagePaths,
  GameHistory,
  MoveList,
  MoveType,
} from '../../chess-logic/models';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { SelectedSquare } from './models';
import { ChessBoardService } from './chess-board.service';
import { filter, fromEvent, Subscription, tap } from 'rxjs';
import { FENConverter } from '../../chess-logic/FENConverter';
import { MoveListComponent } from '../../move-list/move-list.component';

@Component({
  selector: 'chess-board',
  standalone: true,
  imports: [CommonModule, MoveListComponent],
  templateUrl: './chess-board.component.html',
  styleUrl: './chess-board.component.css',
})
export class ChessBoardComponent implements OnInit, OnDestroy {
  public pieceImagePaths = pieceImagePaths;

  protected chessBoard = new ChessBoard();
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

  public get moveList(): MoveList {
    return this.chessBoard.moveList;
  }
  public get gameHistory(): GameHistory {
    return this.chessBoard.gameHistory;
  }
  public gameHistoryPointer: number = 0;

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
  public flipMode: boolean = false;
  private subscriptions$ = new Subscription();
  protected platformId = inject(PLATFORM_ID);
  constructor(protected chessBoardService: ChessBoardService) {}

  public ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      const keyEventSubscription$: Subscription = fromEvent<KeyboardEvent>(
        document,
        'keyup',
      )
        .pipe(
          filter(
            (event) => event.key === 'ArrowRight' || event.key === 'ArrowLeft',
          ),
          tap((event) => {
            switch (event.key) {
              case 'ArrowRight':
                if (this.gameHistoryPointer === this.gameHistory.length - 1)
                  return;
                this.gameHistoryPointer++;
                break;
              case 'ArrowLeft':
                if (this.gameHistoryPointer === 0) return;
                this.gameHistoryPointer--;
                break;
              default:
                break;
            }

            this.showPreviousPosition(this.gameHistoryPointer);
          }),
        )
        .subscribe();

      this.subscriptions$.add(keyEventSubscription$);
    }
  }

  public ngOnDestroy(): void {
    this.subscriptions$.unsubscribe();
    this.chessBoardService.chessBoardState$.next(FENConverter.initalPosition);
  }

  public flipboard(): void {
    this.flipMode = !this.flipMode;
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
      (coords) => coords.x === x && coords.y === y,
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
    this.updateBoard(prevX, prevY, newX, newY, this.promotedPiece);
  }

  protected updateBoard(
    prevX: number,
    prevY: number,
    newX: number,
    newY: number,
    promotedPiece: FENChar | null,
  ): void {
    this.chessBoard.move(prevX, prevY, newX, newY, promotedPiece);
    this.chessBoardView = this.chessBoard.chessBoardView;
    this.checkState = this.chessBoard.checkState;
    this.lastMove = this.chessBoard.lastMove;
    this.markLastMoveAndCheckState(
      this.chessBoard.lastMove,
      this.chessBoard.checkState,
    );
    this.unmarkingPreviouslySelectedAndSafeSquares();
    this.chessBoardService.chessBoardState$.next(this.chessBoard.boardAsFEN);
    this.gameHistoryPointer++;
  }

  public promotePiece(piece: FENChar): void {
    if (!this.promotionCoords || !this.selectedSquare.piece) return;
    this.promotedPiece = piece;
    const { x: newX, y: newY } = this.promotionCoords;
    const { x: prevX, y: prevY } = this.selectedSquare;
    this.updateBoard(prevX, prevY, newX, newY, this.promotedPiece);
  }

  public clossPawnPromotionDialog(): void {
    this.unmarkingPreviouslySelectedAndSafeSquares();
  }

  private markLastMoveAndCheckState(
    lastMove: LastMove | undefined,
    checkState: CheckState,
  ): void {
    this.lastMove = lastMove;
    this.checkState = checkState;

    if (this.lastMove) this.moveSound(this.lastMove.moveType);
    else this.moveSound(new Set<MoveType>([MoveType.BasicMove]));
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

  public showPreviousPosition(moveIndex: number): void {
    const { board, checkState, lastMove } = this.gameHistory[moveIndex];
    this.chessBoardView = board;
    this.markLastMoveAndCheckState(lastMove, checkState);
    this.gameHistoryPointer = moveIndex;
  }

  private moveSound(moveType: Set<MoveType>): void {
    const moveSound = new Audio('assets/sound/move.mp3');

    if (moveType.has(MoveType.Promotion))
      moveSound.src = 'assets/sound/promote.mp3';
    else if (moveType.has(MoveType.Capture))
      moveSound.src = 'assets/sound/capture.mp3';
    else if (moveType.has(MoveType.Castling))
      moveSound.src = 'assets/sound/castling.mp3';

    if (moveType.has(MoveType.CheckMate))
      moveSound.src = 'assets/sound/checkmate.mp3';
    else if (moveType.has(MoveType.Check))
      moveSound.src = 'assets/sound/check.mp3';

    moveSound.play();
  }
}
