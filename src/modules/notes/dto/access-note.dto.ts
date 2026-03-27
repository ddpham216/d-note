import { IsOptional, IsString } from 'class-validator';

export class AccessNoteDto {
  @IsOptional()
  @IsString()
  password?: string;
}
