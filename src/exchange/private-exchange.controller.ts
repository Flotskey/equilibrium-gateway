import { Body, Controller, Delete, Logger, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { DecodedIdToken } from 'firebase-admin/auth';
import { FirebaseAuthGuard } from 'src/auth/firebase-auth.guard';
import { GatewayOrder } from 'src/exchange/dto/gateway-order.dto';
import { CcxtBalances, CcxtLeverage, CcxtLeverageTier, CcxtMarginMode, CcxtTrade } from 'src/models/ccxt';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { CreateConnectionDto } from './dto/create-connection.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreateOrdersDto } from './dto/create-orders.dto';
import { EditOrderDto } from './dto/edit-order.dto';
import { FetchBalanceDto } from './dto/fetch-balance.dto';
import { FetchLeverageTiersDto } from './dto/fetch-leverage-tiers.dto';
import { FetchLeverageDto } from './dto/fetch-leverage.dto';
import { FetchMarginModeDto } from './dto/fetch-margin-mode.dto';
import { FetchOrdersDto } from './dto/fetch-orders.dto';
import { FetchTradesDto } from './dto/fetch-trades.dto';
import { RemoveConnectionDto } from './dto/remove-connection.dto';
import { SetLeverageDto } from './dto/set-leverage.dto';
import { SetMarginModeDto } from './dto/set-margin-mode.dto';
import { PrivateExchangeService } from './private-exchange.service';

@Controller('ccxt/private')
@ApiBearerAuth()
@UseGuards(FirebaseAuthGuard)
export class PrivateExchangeController {
  constructor(private privateExchangeService: PrivateExchangeService) {}

  private readonly logger = new Logger(PrivateExchangeController.name);

  @Post('connection')
  @ApiResponse({ status: 200, description: 'The private connection has been successfully created.' })
  async createConnection(
    @Body() dto: CreateConnectionDto,
    @Req() req: Request & { user: DecodedIdToken }
  ): Promise<void> {
    dto.userId = req.user.uid;
    return this.privateExchangeService.createConnection(dto);
  }

  @Delete('connection')
  @ApiResponse({ status: 200, description: 'The private connection has been successfully removed.' })
  async removeConnection(
    @Body() dto: RemoveConnectionDto,
    @Req() req: Request & { user: DecodedIdToken }
  ): Promise<void> {
    dto.userId = req.user.uid;
    return this.privateExchangeService.removeConnection(dto);
  }

  @Post('order')
  @ApiResponse({ status: 200, description: 'The created order.', type: GatewayOrder })
  async createOrder(
    @Body() dto: CreateOrderDto,
    @Req() req: Request & { user: DecodedIdToken }
  ): Promise<GatewayOrder> {
    dto.userId = req.user.uid;
    return this.privateExchangeService.createOrder(dto);
  }

  @Post('order/batch')
  @ApiResponse({ status: 200, description: 'A list of created orders.', type: [GatewayOrder] })
  async createOrders(
    @Body() dto: CreateOrdersDto,
    @Req() req: Request & { user: DecodedIdToken }
  ): Promise<GatewayOrder[]> {
    dto.userId = req.user.uid;
    return this.privateExchangeService.createOrders(dto);
  }

  @Post('order/edit')
  @ApiResponse({ status: 200, description: 'The edited order.', type: GatewayOrder })
  async editOrder(@Body() dto: EditOrderDto, @Req() req: Request & { user: DecodedIdToken }): Promise<GatewayOrder> {
    dto.userId = req.user.uid;
    return this.privateExchangeService.editOrder(dto);
  }

  @Post('order/cancel')
  @ApiResponse({
    status: 200,
    description: 'The response from the exchange after attempting to cancel the order.',
    type: Object
  })
  async cancelOrder(
    @Body() dto: CancelOrderDto,
    @Req() req: Request & { user: DecodedIdToken }
  ): Promise<Record<string, any>> {
    dto.userId = req.user.uid;
    return this.privateExchangeService.cancelOrder(dto);
  }

  @Post('orders')
  @ApiResponse({ status: 200, description: 'A list of orders.', type: [GatewayOrder] })
  async fetchOrders(
    @Body() dto: FetchOrdersDto,
    @Req() req: Request & { user: DecodedIdToken }
  ): Promise<GatewayOrder[]> {
    dto.userId = req.user.uid;
    return this.privateExchangeService.fetchOrders(dto);
  }

  @Post('trades')
  @ApiResponse({ status: 200, description: 'A list of user trades.', type: Object, isArray: true })
  async fetchTrades(@Body() dto: FetchTradesDto, @Req() req: Request & { user: DecodedIdToken }): Promise<CcxtTrade[]> {
    dto.userId = req.user.uid;
    return this.privateExchangeService.fetchTrades(dto);
  }

  @Post('balance')
  @ApiResponse({ status: 200, description: 'The user balance.', type: Object })
  async fetchBalance(
    @Body() dto: FetchBalanceDto,
    @Req() req: Request & { user: DecodedIdToken }
  ): Promise<CcxtBalances> {
    dto.userId = req.user.uid;
    return this.privateExchangeService.fetchBalance(dto);
  }

  @Post('margin-mode/set')
  @ApiResponse({ status: 200, description: 'The margin mode has been successfully set.', type: Object })
  async setMarginMode(
    @Body() dto: SetMarginModeDto,
    @Req() req: Request & { user: DecodedIdToken }
  ): Promise<Record<string, any>> {
    dto.userId = req.user.uid;
    return this.privateExchangeService.setMarginMode(dto);
  }

  @Post('margin-mode/fetch')
  @ApiResponse({ status: 200, description: 'The current margin mode.', type: Object })
  async fetchMarginMode(
    @Body() dto: FetchMarginModeDto,
    @Req() req: Request & { user: DecodedIdToken }
  ): Promise<CcxtMarginMode> {
    dto.userId = req.user.uid;
    return this.privateExchangeService.fetchMarginMode(dto);
  }

  @Post('leverage/set')
  @ApiResponse({ status: 200, description: 'The leverage has been successfully set.', type: Object })
  async setLeverage(
    @Body() dto: SetLeverageDto,
    @Req() req: Request & { user: DecodedIdToken }
  ): Promise<Record<string, any>> {
    dto.userId = req.user.uid;
    return this.privateExchangeService.setLeverage(dto);
  }

  @Post('leverage/fetch')
  @ApiResponse({ status: 200, description: 'The current leverage.', type: Object })
  async fetchLeverage(
    @Body() dto: FetchLeverageDto,
    @Req() req: Request & { user: DecodedIdToken }
  ): Promise<CcxtLeverage> {
    dto.userId = req.user.uid;
    return this.privateExchangeService.fetchLeverage(dto);
  }

  @Post('leverage-tiers/fetch')
  @ApiResponse({ status: 200, description: 'The market leverage tiers.', type: Object })
  async fetchMarketLeverageTiers(
    @Body() dto: FetchLeverageTiersDto,
    @Req() req: Request & { user: DecodedIdToken }
  ): Promise<CcxtLeverageTier[]> {
    dto.userId = req.user.uid;
    return this.privateExchangeService.fetchMarketLeverageTiers(dto);
  }
}
