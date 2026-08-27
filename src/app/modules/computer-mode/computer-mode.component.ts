import { Component, inject } from '@angular/core';
import { ChessBoardComponent } from '../chess-board/chess-board.component';
import { CommonModule } from '@angular/common';
import { StockfishService } from './stockfish.service';
import { ChessBoardService } from '../chess-board/chess-board.service';
import { firstValueFrom, Subscription } from 'rxjs';
import { Color } from '../../chess-logic/models';
import { EngineService } from './engine.service';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MoveListComponent } from '../../move-list/move-list.component';

@Component({
  selector: 'app-computer-mode',
  templateUrl: '../chess-board/chess-board.component.html',
  standalone: true,
  imports: [CommonModule, MoveListComponent],
  styleUrls: ['../chess-board/chess-board.component.css'],
})
export class ComputerModeComponent extends ChessBoardComponent {
  private computerSubscriptions$ = new Subscription();
  constructor(private stockfishService: EngineService) {
    super(inject(ChessBoardService));
  }

  public override ngOnInit(): void {
    super.ngOnInit();

    let openingMoveSent = false;

    const computerConfiSubscription$: Subscription =
      this.stockfishService.computerConfiguration$.subscribe({
        next: async (computerConfiguration) => {
          if (computerConfiguration.color === Color.White) {
            this.flipboard();

            if (!openingMoveSent) {
              const currentFEN = this.chessBoardService.chessBoardState$.value;
              const parts = currentFEN.split(' ');
              const isStartingPosition =
                parts[1] === 'w' && parts[4] === '0' && parts[5] === '1';

              if (isStartingPosition && !this.chessBoard.isGameOver) {
                openingMoveSent = true;
                const { prevX, prevY, newX, newY, promotedPiece } =
                  await firstValueFrom(
                    this.stockfishService.getBestMove(currentFEN),
                  );
                this.updateBoard(prevX, prevY, newX, newY, promotedPiece);
                openingMoveSent = false; // reset so subsequent moves work normally
              }
            }
          }
        },
      });

    const chessBoardStateSubscription$: Subscription =
      this.chessBoardService.chessBoardState$.subscribe({
        next: async (FEN: string) => {
          if (this.chessBoard.isGameOver) {
            chessBoardStateSubscription$.unsubscribe();
            return;
          }

          const player: Color =
            FEN.split(' ')[1] === 'w' ? Color.White : Color.Black;
          if (
            player !== this.stockfishService.computerConfiguration$.value.color
          )
            return;

          if (openingMoveSent) {
            openingMoveSent = false;
            return;
          }

          const { prevX, prevY, newX, newY, promotedPiece } =
            await firstValueFrom(this.stockfishService.getBestMove(FEN));
          this.updateBoard(prevX, prevY, newX, newY, promotedPiece);
        },
      });

    this.computerSubscriptions$.add(chessBoardStateSubscription$);
    this.computerSubscriptions$.add(computerConfiSubscription$);
  }

  public override ngOnDestroy(): void {
    super.ngOnDestroy();
    this.computerSubscriptions$.unsubscribe();
  }
}
