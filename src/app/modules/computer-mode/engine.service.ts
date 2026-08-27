import { HttpClient, HttpParams } from '@angular/common/http';
import { Color, FENChar } from '../../chess-logic/models';
import { Injectable, signal } from '@angular/core';
import { BehaviorSubject, Observable, of, switchMap } from 'rxjs';
import { ChessMove, ComputerConfiguration } from './model';
import { environment } from '../../../../environment';

type EngineQueryParams = {
  fen: string;
  depth: number;
};
type EngineResponse = {
  bestMove: string;
  score: number;
};
@Injectable({
  providedIn: 'root',
})
export class EngineService {
  currentDepth = signal<string>('5');
  private readonly api: string = environment.localapiUrl;
  public computerConfiguration$ = new BehaviorSubject<ComputerConfiguration>({
    color: Color.Black,
    level: 1,
  });
  constructor(private http: HttpClient) {}
  private convertColumnLetterToYCoord(str: string): number {
    return str.charCodeAt(0) - 'a'.charCodeAt(0);
  }
  private promotedPiece(piece: string | undefined): FENChar | null {
    if (!piece) return null;
    const computerColor: Color = this.computerConfiguration$.value.color;
    if (piece === 'n')
      return computerColor === Color.White
        ? FENChar.WhiteKnight
        : FENChar.BlackKnight;
    if (piece === 'b')
      return computerColor === Color.White
        ? FENChar.WhiteBishop
        : FENChar.BlackBishop;
    if (piece === 'r')
      return computerColor === Color.White
        ? FENChar.WhiteRook
        : FENChar.BlackRook;
    return computerColor === Color.White
      ? FENChar.WhiteQueen
      : FENChar.BlackQueen;
  }

  private moveFromStockfishString(move: string): ChessMove {
    const prevY = this.convertColumnLetterToYCoord(move[0]);
    const prevX = Number(move[1]) - 1;
    const newY = this.convertColumnLetterToYCoord(move[2]);
    const newX = Number(move[3]) - 1;
    const promotedPiece = this.promotedPiece(move[4]);
    console.log({ prevX, prevY, newX, newY, promotedPiece });
    return { prevX, prevY, newX, newY, promotedPiece };
  }
  public getBestMove(fen: string): Observable<ChessMove> {
    const body: EngineQueryParams = {
      fen,
      depth: this.computerConfiguration$.value.level,
    };
    console.log('Sending request to wrapper:', body);
    return this.http.post<EngineResponse>(this.api, body).pipe(
      switchMap((response) => {
        console.log('Engine response:', response);

        if (!response.bestMove) {
          console.log(response);
          throw new Error('Engine returned no bestMove');
        }

        const bestMove = response.bestMove.includes(' ')
          ? response.bestMove.split(' ')[1]
          : response.bestMove;

        return of(this.moveFromStockfishString(bestMove));
      }),
    );
  }
}
