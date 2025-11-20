import { Request, Response } from 'express';
import whatsappService from '../services/whatsapp.service';
import { Logger } from '../utils/logger';

const logger = new Logger('WhatsAppController');

export class WhatsAppController {
  async startSession(req: Request, res: Response): Promise<void> {
    try {
      const { clientId, slot } = req.params;
      const slotNumber = parseInt(slot);

      if (slotNumber < 1 || slotNumber > 3) {
        res.status(400).json({
          success: false,
          error: 'Slot deve ser entre 1 e 3'
        });
        return;
      }

      const result = await whatsappService.startSession(clientId, slotNumber);

      if (result.success) {
        res.json({
          success: true,
          qrCode: result.qrCode,
          message: 'Sessão iniciada com sucesso'
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      logger.error('Erro ao iniciar sessão:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async stopSession(req: Request, res: Response): Promise<void> {
    try {
      const { clientId, slot } = req.params;
      const slotNumber = parseInt(slot);

      if (slotNumber < 1 || slotNumber > 3) {
        res.status(400).json({
          success: false,
          error: 'Slot deve ser entre 1 e 3'
        });
        return;
      }

      const result = await whatsappService.stopSession(clientId, slotNumber);

      if (result.success) {
        res.json({
          success: true,
          message: 'Sessão encerrada com sucesso'
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      logger.error('Erro ao encerrar sessão:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async getSessionStatus(req: Request, res: Response): Promise<void> {
    try {
      const { clientId, slot } = req.params;
      const slotNumber = parseInt(slot);

      if (slotNumber < 1 || slotNumber > 3) {
        res.status(400).json({
          success: false,
          error: 'Slot deve ser entre 1 e 3'
        });
        return;
      }

      const status = await whatsappService.getSessionStatus(clientId, slotNumber);

      res.json({
        success: true,
        data: status
      });
    } catch (error: any) {
      logger.error('Erro ao obter status da sessão:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async getAllSessions(req: Request, res: Response): Promise<void> {
    try {
      const { clientId } = req.params;

      const sessions = await whatsappService.getAllSessionsStatus(clientId);

      res.json({
        success: true,
        data: sessions
      });
    } catch (error: any) {
      logger.error('Erro ao obter todas as sessões:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async sendMessage(req: Request, res: Response): Promise<void> {
    try {
      const { clientId, slot } = req.params;
      const { to, message } = req.body;
      const slotNumber = parseInt(slot);

      if (!to || !message) {
        res.status(400).json({
          success: false,
          error: 'Campos "to" e "message" são obrigatórios'
        });
        return;
      }

      if (slotNumber < 1 || slotNumber > 3) {
        res.status(400).json({
          success: false,
          error: 'Slot deve ser entre 1 e 3'
        });
        return;
      }

      const result = await whatsappService.sendMessage(clientId, slotNumber, to, message);

      if (result.success) {
        res.json({
          success: true,
          message: 'Mensagem enviada com sucesso'
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      logger.error('Erro ao enviar mensagem:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

export default new WhatsAppController();

