import { Piece } from './Pieces/piece';

export enum Color {
  White,
  Black,
}

export type Coords = {
  x: number;
  y: number;
};

export enum FENChar {
  WhitePawn = 'P',
  WhiteKnight = 'N',
  WhiteBishop = 'B',
  WhiteRook = 'R',
  WhiteQueen = 'Q',
  WhiteKing = 'K',
  BlackPawn = 'p',
  BlackKnight = 'n',
  BlackBishop = 'b',
  BlackRook = 'r',
  BlackQueen = 'q',
  BlackKing = 'k',
}

export const pieceImagePaths: Readonly<Record<FENChar, string>> = {
  [FENChar.WhitePawn]: 'assets/w_pawn.svg',
  [FENChar.BlackPawn]: 'assets/b_pawn.svg',
  [FENChar.WhiteKnight]: 'assets/w_knight.svg',
  [FENChar.BlackKnight]: 'assets/b_knight.svg',
  [FENChar.WhiteBishop]: 'assets/w_bishop.svg',
  [FENChar.WhiteRook]: 'assets/w_rook.svg',
  [FENChar.WhiteQueen]: 'assets/w_queen.svg',
  [FENChar.WhiteKing]: 'assets/w_king.svg',
  [FENChar.BlackBishop]: 'assets/b_bishop.svg',
  [FENChar.BlackRook]: 'assets/b_rook.svg',
  [FENChar.BlackQueen]: 'assets/b_queen.svg',
  [FENChar.BlackKing]: 'assets/b_king.svg',
};

export type SafeSquares = Map<String, Coords[]>;

export type LastMove = {
  piece: Piece;
  prevX: number;
  prevY: number;
  currX: number;
  currY: number;
};

type KingChecked = {
  isInCheck: true;
  x: number;
  y: number;
};

type KingNotChecked = {
  isInCheck: false;
};

export type CheckState = KingChecked | KingNotChecked;
