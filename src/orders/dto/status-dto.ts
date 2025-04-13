import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { OrderStatusList } from '../enum/order.enum';
import { OrderStatus } from 'generated/prisma';

export class StatusDto {
  @IsOptional()
  @IsEnum(OrderStatus, {
    message: `Valid status are ${JSON.stringify(OrderStatusList)}`,
  })
  status: OrderStatus;

  @IsString()
  @IsUUID()
  id: string;
}
