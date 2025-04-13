import { IsEnum, IsNumber, IsOptional, IsPositive } from 'class-validator';
import { OrderStatus } from 'generated/prisma';
import { OrderStatusList } from '../enum/order.enum';

export class CreateOrderDto {
  @IsNumber()
  @IsPositive()
  totalAmount: number;

  @IsNumber()
  @IsPositive()
  totalItems: number;

  @IsEnum(OrderStatusList, {
    message: `Possible valud status are ${JSON.stringify(OrderStatusList)}`,
  })
  @IsOptional()
  status: OrderStatus = OrderStatus.PENDING;
}
