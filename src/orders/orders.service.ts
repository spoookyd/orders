import { HttpStatus, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { PrismaClient } from 'generated/prisma';
import { RpcException } from '@nestjs/microservices';
import { OrderPaginationDto } from './dto';
import { StatusDto } from './dto/status-dto';

@Injectable()
export class OrdersService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger('OrdersService');

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Prisma connected in OrdersService');
  }
  async create(createOrderDto: CreateOrderDto) {
    try {
      const order = await this.orders.create({ data: createOrderDto });
      if (!order) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: 'Order not created',
        });
      }
      return order;
    } catch (error) {
      this.handleError(error);
    }
  }

  async findAll(orderPaginationDto: OrderPaginationDto) {
    const { limit, page, status } = orderPaginationDto;
    const skip = page * limit - limit;

    try {
      const totalOrders = await this.orders.count({
        where: { status },
      });
      const totalPages = Math.ceil(totalOrders / limit);
      const orders = await this.orders.findMany({
        where: { status },
        take: limit,
        skip,
      });

      return {
        metadata: {
          page,
          totalOrders,
          totalPages,
        },
        orders,
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  async findOne(id: string) {
    try {
      const order = await this.orders.findFirst({ where: { id } });
      if (!order) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: 'Order not found',
        });
      }
      return order;
    } catch (error) {
      this.handleError(error);
    }
  }

  async changeOrderStatus(statusDto: StatusDto) {
    try {
      // checar primero si existe en la base de datos? o si lo que se quiere actualizar es lo mismo?
      const product = await this.orders.update({
        where: { id: statusDto.id },
        data: { status: statusDto.status },
      });
      if (!product) {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: 'Order not created',
        });
      }
      return product;
    } catch (error) {
      this.handleError(error);
    }
  }

  private handleError(error: any) {
    if (error instanceof RpcException) throw error;
    throw new RpcException(error);
  }
}
