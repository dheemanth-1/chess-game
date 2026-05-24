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

@Component({
  selector: 'app-computer-mode',
  templateUrl: '../chess-board/chess-board.component.html',
  standalone: true,
  imports: [CommonModule],
  styleUrls: ['../chess-board/chess-board.component.css'],
})
export class ComputerModeComponent extends ChessBoardComponent {
  private computerSubscriptions$ = new Subscription();
  constructor(private engineService: EngineService) {
    super(inject(ChessBoardService));
  }

  public override ngOnInit(): void {
    super.ngOnInit();

    const computerConfiSubscription$: Subscription =
      this.engineService.computerConfiguration$.subscribe({
        next: (computerConfiguration) => {
          if (computerConfiguration.color === Color.White) this.flipboard();
        },
      });

    const chessBoardStateSubscription$: Subscription =
      this.chessBoardService.chessBoardState$.subscribe({
        next: async (FEN: string) => {
          if (this.chessBoard.isGameOver) {
            chessBoardStateSubscription$.unsubscribe();
            return;
          }
          console.log(FEN);
          const player: Color =
            FEN.split(' ')[1] === 'w' ? Color.White : Color.Black;
          if (
            player !== this.engineService.computerConfiguration$.value.color
          ) {
            console.log('player', player);
            console.log(this.engineService.computerConfiguration$.value.color);
            return;
          }
          console.log('back to this???');
          const { prevX, prevY, newX, newY, promotedPiece } =
            await firstValueFrom(this.engineService.getBestMove(FEN));
          console.log('prevX: ', prevX);
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
