import { Request, Response } from 'express';
import openRouterService from '../services/openrouter.service';
import clientConfigService from '../services/clientConfig.service';
import { Logger } from '../utils/logger';

const logger = new Logger('ChatbotController');

export class ChatbotController {
  async testMessage(req: Request, res: Response): Promise<void> {
    try {
      const { clientId } = req.params;
      const { message } = req.body;

      if (!message) {
        res.status(400).json({
          success: false,
          error: 'Campo "message" é obrigatório'
        });
        return;
      }

      const clientConfig = await clientConfigService.getClient(clientId);

      if (!clientConfig) {
        res.status(404).json({
          success: false,
          error: 'Cliente não encontrado'
        });
        return;
      }

      const systemPrompt = clientConfigService.buildSystemPrompt(clientConfig);
      const response = await openRouterService.sendTextMessage(systemPrompt, message);

      res.json({
        success: true,
        data: {
          message,
          response,
          systemPrompt
        }
      });
    } catch (error: any) {
      logger.error('Erro ao testar mensagem:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

export default new ChatbotController();

