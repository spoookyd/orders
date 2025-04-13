import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsPositive } from 'class-validator';

export class PaginationDto {
  @IsNumber()
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  limit: number = 10;

  @IsNumber()
  @Type(() => Number)
  @IsPositive()
  @IsOptional()
  page: number = 1;
}
