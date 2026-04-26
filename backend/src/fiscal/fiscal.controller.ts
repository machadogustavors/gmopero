import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Headers,
  UnauthorizedException,
  Logger,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import { createHmac, timingSafeEqual } from 'crypto';
import type { Request } from 'express';
import { PlugnotasService } from './plugnotas.service';
import { CurrentUser, Public, Roles } from '../common/decorators';
import type { CurrentUserPayload } from '../common/decorators';

@Controller('fiscal')
export class FiscalController {
  private readonly logger = new Logger(FiscalController.name);

  private static readonly fileHasBuffer = (file: unknown): file is { buffer: Buffer } => {
    if (!file || typeof file !== 'object') return false;
    const maybeFile = file as { buffer?: unknown };
    return Buffer.isBuffer(maybeFile.buffer);
  };

  constructor(
    private readonly plugnotasService: PlugnotasService,
    private readonly configService: ConfigService,
  ) {}

  @Post('register-company')
  async registerCompany(@CurrentUser() user: CurrentUserPayload) {
    return this.plugnotasService.registerCompany(user.companyId);
  }

  @Get('company-status')
  async companyStatus(@CurrentUser() user: CurrentUserPayload) {
    return this.plugnotasService.getCompanyStatus(user.companyId);
  }

  @Post('upload-certificate')
  @UseInterceptors(
    FileInterceptor('certificate', {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, callback) => {
        const isPfx = file.mimetype === 'application/x-pkcs12'
          || file.originalname.toLowerCase().endsWith('.pfx')
          || file.originalname.toLowerCase().endsWith('.p12');
        callback(isPfx ? null : new BadRequestException('Certificado deve ser .pfx ou .p12'), isPfx);
      },
    }),
  )
  async uploadCertificate(
    @CurrentUser() user: CurrentUserPayload,
    @UploadedFile() file: unknown,
    @Body('password') password: string,
  ) {
    if (!FiscalController.fileHasBuffer(file)) {
      throw new BadRequestException('Arquivo do certificado é obrigatório.');
    }
    if (!password) {
      throw new BadRequestException('Senha do certificado é obrigatória.');
    }
    return this.plugnotasService.uploadCertificate(
      user.companyId,
      file.buffer,
      password,
    );
  }

  @Post('emit/:serviceOrderId')
  async emitInvoice(
    @CurrentUser() user: CurrentUserPayload,
    @Param('serviceOrderId') serviceOrderId: string,
  ) {
    return this.plugnotasService.emitNfe(serviceOrderId, user.companyId);
  }

  @Public()
  @Post('webhook')
  async webhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Body() body: any,
    @Headers('x-webhook-signature') signature: string,
    @Headers('x-webhook-timestamp') timestamp?: string,
  ) {
    const expectedSecret = this.configService.get<string>('PLUGNOTAS_WEBHOOK_SECRET');

    if (!expectedSecret) {
      this.logger.error('Missing PLUGNOTAS_WEBHOOK_SECRET environment variable');
      throw new UnauthorizedException('Webhook secret is not configured');
    }

    if (!signature) {
      throw new UnauthorizedException('Missing webhook signature');
    }

    const rawBody = req.rawBody?.toString('utf8') ?? JSON.stringify(body);
    const signedPayload = timestamp ? `${timestamp}.${rawBody}` : rawBody;
    const expectedSignature = createHmac('sha256', expectedSecret)
      .update(signedPayload)
      .digest('hex');

    const incomingSignature = signature.startsWith('sha256=')
      ? signature.slice('sha256='.length)
      : signature;

    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    const incomingBuffer = Buffer.from(incomingSignature, 'utf8');

    if (
      expectedBuffer.length !== incomingBuffer.length
      || !timingSafeEqual(expectedBuffer, incomingBuffer)
    ) {
      this.logger.warn('Webhook received with invalid signature');
      throw new UnauthorizedException('Invalid webhook signature');
    }

    return this.plugnotasService.processWebhook(body);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Post('cancel/:plugnotasId')
  async cancel(
    @CurrentUser() user: CurrentUserPayload,
    @Param('plugnotasId') plugnotasId: string,
    @Body('justification') justification?: string,
  ) {
    return this.plugnotasService.cancelInvoice(user.companyId, plugnotasId, justification);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Post('correction/:plugnotasId')
  async correctionLetter(
    @CurrentUser() user: CurrentUserPayload,
    @Param('plugnotasId') plugnotasId: string,
    @Body('correction') correction: string,
  ) {
    return this.plugnotasService.correctionLetter(user.companyId, plugnotasId, correction);
  }
}
