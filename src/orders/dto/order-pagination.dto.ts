import { IsEnum, IsOptional } from 'class-validator';
import { OrderStatus } from 'generated/prisma';
import { PaginationDto } from 'src/common/dto/pagination.dto';

export class OrderPaginationDto extends PaginationDto {
  @IsOptional()
  @IsEnum(OrderStatus, {
    message: `Valid status are ${JSON.stringify(OrderStatus)}`,
  })
  status: OrderStatus;
}
