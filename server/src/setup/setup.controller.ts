import { Controller, Get, Post, Put, Body, BadRequestException } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from "@nestjs/swagger";
import { SetupService } from "./setup.service";

@ApiTags("setup")
@Controller("api/setup")
export class SetupController {
  constructor(private readonly setupService: SetupService) {}

  @Get("status")
  @ApiOperation({ summary: "Vérifier le statut du setup" })
  @ApiResponse({ status: 200, description: "Statut du setup" })
  async getStatus() {
    const data = await this.setupService.getSetupStatus();
    return { success: true, data };
  }

  @Post("create-admin")
  @ApiOperation({ summary: "Créer un administrateur lors de la première installation" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        email: { type: "string", format: "email", example: "admin@example.com" },
        firstName: { type: "string", example: "Jean" },
        lastName: { type: "string", example: "Dupont" }
      },
      required: ["email", "firstName", "lastName"]
    }
  })
  @ApiResponse({ status: 201, description: "Admin créé avec succès" })
  @ApiResponse({ status: 400, description: "Données invalides" })
  async createAdmin(@Body() body: { email: string; firstName: string; lastName: string }) {
    const data = await this.setupService.createFirstAdmin(body.email, body.firstName, body.lastName);
    return {
      success: true,
      data,
      message: "Premier administrateur créé avec succès"
    };
  }

  @Put("branding")
  @ApiOperation({ summary: "Configurer le branding lors du setup initial" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        config: { type: "string", example: '{"logo": "...", "colors": {...}}' }
      },
      required: ["config"]
    }
  })
  @ApiResponse({ status: 200, description: "Branding configuré avec succès" })
  @ApiResponse({ status: 400, description: "Le branding ne peut être modifié que lors de la première installation" })
  async updateBranding(@Body() body: { config: string }) {
    // Only allow during first install
    const status = await this.setupService.getSetupStatus();
    if (!status.isFirstInstall) {
      throw new BadRequestException("Le branding ne peut être modifié via setup que lors de la première installation");
    }
    const data = await this.setupService.saveBrandingConfig(body.config);
    return { success: true, data };
  }

  @Post("test-email")
  @ApiOperation({ summary: "Tester la configuration email" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        email: { type: "string", format: "email", example: "admin@example.com" }
      },
      required: ["email"]
    }
  })
  @ApiResponse({ status: 200, description: "Email de test envoyé avec succès" })
  @ApiResponse({ status: 400, description: "Email invalide" })
  @ApiResponse({ status: 500, description: "Erreur lors de l'envoi de l'email" })
  async testEmail(@Body() body: { email: string }) {
    const data = await this.setupService.testEmail(body.email);
    return { success: true, ...data };
  }

  @Post("generate-config")
  @ApiOperation({ summary: "Générer la configuration de base du setup" })
  @ApiResponse({ status: 200, description: "Configuration générée avec succès" })
  @ApiResponse({ status: 500, description: "Erreur lors de la génération de la configuration" })
  async generateConfig() {
    const data = await this.setupService.generateConfig();
    return { success: true, ...data };
  }
}
