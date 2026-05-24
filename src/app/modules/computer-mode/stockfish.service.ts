import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, switchMap } from 'rxjs';
import {
  ChessMove,
  ComputerConfiguration,
  StockfishQueryParams,
  StockfishResponse,
} from './model';
import { Color, FENChar } from '../../chess-logic/models';
import { environment } from '../../../../environment';

@Injectable({
  providedIn: 'root',
})
export class StockfishService {
  private readonly api: string = environment.stockfishApiUrl;
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
    if (piece === 'n') return FENChar.BlackKnight;
    if (piece === 'b') return FENChar.BlackBishop;
    if (piece === 'r') return FENChar.BlackRook;
    return FENChar.BlackQueen;
  }
  private moveFromStockfishString(move: string): ChessMove {
    const prevY = this.convertColumnLetterToYCoord(move[0]);
    const prevX = Number(move[1]) - 1;
    const newY = this.convertColumnLetterToYCoord(move[2]);
    const newX = Number(move[3]) - 1;
    const promotedPiece = this.promotedPiece(move[4]);
    return { prevX, prevY, newX, newY, promotedPiece };
  }
  public getBestMove(fen: string): Observable<ChessMove> {
    const queryParams: StockfishQueryParams = {
      fen,
      depth: 12,
    };
    console.log(queryParams);
    let params = new HttpParams().appendAll(queryParams);
    return this.http.get<StockfishResponse>(this.api, { params }).pipe(
      switchMap((response) => {
        console.log('response : ', response);
        const bestMove = response.bestmove.split(' ')[1];
        return of(this.moveFromStockfishString(bestMove));
      }),
    );
  }
}
