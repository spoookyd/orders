import {
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { PrismaClient } from 'generated/prisma';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { OrderPaginationDto } from './dto';
import { StatusDto } from './dto/status-dto';
import { NATS_SERVICE } from 'src/config';
import { firstValueFrom } from 'rxjs';
import { Product } from './interfaces/product.interface';

@Injectable()
export class OrdersService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger('OrdersService');

  constructor(@Inject(NATS_SERVICE) private readonly client: ClientProxy) {
    super();
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Prisma connected in OrdersService');
  }

  async create(createOrderDto: CreateOrderDto) {
    const ids = createOrderDto.items.map((order) => order.productId);
    try {
      const product = await firstValueFrom<{ data: Product[] }>(
        this.client.send({ cmd: 'validate_product' }, ids),
      );

      const totalAmount: number = createOrderDto.items.reduce((total, curr) => {
        const foundProduct = product.data.find(
          (product) => product.id === curr.productId,
        );
        if (!foundProduct) {
          throw new RpcException({
            status: HttpStatus.BAD_REQUEST,
            message: `Product with ID ${curr.productId} not found`,
          });
        }
        const price = foundProduct.price * curr.quantity;
        return total + price;
      }, 0);

      const totalItems = createOrderDto.items.reduce((total, curr) => {
        return total + curr.quantity;
      }, 0);

      const ProductWithPrice = createOrderDto.items.map((curr) => {
        const findProduct = product.data.find(
          (item) => item.id === curr.productId,
        );

        if (!findProduct) {
          throw new RpcException({
            status: 400,
            message: `Product with ID ${curr.productId} not found`,
          });
        }

        return {
          ...curr,
          price: findProduct.price,
        };
      });

      // 3.- transaccion de base de datos, tienen relacion entre si ademas es prisma
      // se usa un this.transaccion checar curso de nest.js

      const order = await this.orders.create({
        data: {
          totalAmount,
          totalItems,
          OrderItem: {
            createMany: {
              data: ProductWithPrice,
            },
          },
        },
        include: {
          OrderItem: {
            select: {
              price: true,
              quantity: true,
              productId: true,
            },
          },
        },
      });

      // 4 regresamos data
      return {
        ...order,
        OrderItem: order.OrderItem.map((item) => ({
          name: product.data.find(
            (singleProduct) => singleProduct.id === item.productId,
          )?.name,
          ...item,
        })),
      };
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
      const order = await this.orders.findFirst({
        where: { id },
        include: {
          OrderItem: {
            select: { price: true, quantity: true, productId: true },
          },
        },
      });
      if (!order) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: 'Order not found',
        });
      }

      const itemsId = order.OrderItem.map((items) => items.productId);

      // 3.- llamamos a microservice product

      const product = await firstValueFrom<{ data: Product[] }>(
        this.client.send({ cmd: 'validate_product' }, itemsId),
      );
      return {
        ...order,
        OrderItem: order.OrderItem.map((item) => ({
          name: product.data.find(
            (singleProduct) => singleProduct.id === item.productId,
          )?.name,
          ...item,
        })),
      };
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

    this.logger.error(error);

    throw new RpcException('check logs');
  }
}
