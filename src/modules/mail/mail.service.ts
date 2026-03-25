import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { ActivationCode } from './entities/activation-code.entity';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
    private readonly logger = new Logger(MailService.name);

    constructor(
        @InjectRepository(ActivationCode)
        private activationCodeRepository: Repository<ActivationCode>,
        private mailerService: MailerService,
        private configService: ConfigService,
    ) { }

    /**
     * Generate a random 6-digit activation code
     */
    private generateCode(): string {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    /**
     * Generate and store activation code for a user
     */
    async generateActivationCode(userId: string): Promise<string> {
        // Delete any existing unused codes for this user
        await this.activationCodeRepository.delete({
            userId,
            isUsed: false,
        });

        const code = this.generateCode();
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 15); // 15 minutes expiry

        const activationCode = this.activationCodeRepository.create({
            code,
            userId,
            expiresAt,
            isUsed: false,
        });

        await this.activationCodeRepository.save(activationCode);
        this.logger.log(`Generated activation code for user ${userId}`);

        return code;
    }

    /**
     * Send activation email with code
     */
    async sendActivationEmail(
        email: string,
        firstName: string,
        code: string,
    ): Promise<void> {
        try {
            await this.mailerService.sendMail({
                to: email,
                subject: 'Activate Your Account',
                template: 'activation',
                context: {
                    firstName,
                    code,
                },
            });

            this.logger.log(`Activation email sent to ${email}`);
        } catch (error) {
            this.logger.error(`Failed to send activation email to ${email}`, error);
            throw new BadRequestException('Failed to send activation email');
        }
    }

    /**
     * Verify activation code and return userId if valid
     */
    async verifyActivationCode(code: string): Promise<string> {
        const activationCode = await this.activationCodeRepository.findOne({
            where: { code },
        });

        if (!activationCode) {
            throw new BadRequestException('Invalid activation code');
        }

        if (activationCode.isUsed) {
            throw new BadRequestException('Activation code has already been used');
        }

        if (activationCode.expiresAt < new Date()) {
            throw new BadRequestException('Activation code has expired');
        }

        // Mark code as used
        activationCode.isUsed = true;
        await this.activationCodeRepository.save(activationCode);

        this.logger.log(`Activation code verified for user ${activationCode.userId}`);
        return activationCode.userId;
    }

    /**
     * Clean up expired activation codes (can be called by a cron job)
     */
    async cleanupExpiredCodes(): Promise<void> {
        const result = await this.activationCodeRepository.delete({
            expiresAt: LessThan(new Date()),
        });

        this.logger.log(`Cleaned up ${result.affected || 0} expired activation codes`);
    }
}
