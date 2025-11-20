import { Request, Response } from 'express';
import clientConfigService from '../services/clientConfig.service';
import { Logger } from '../utils/logger';

const logger = new Logger('ClientsController');

export class ClientsController {
  async getClient(req: Request, res: Response): Promise<void> {
    try {
      const { clientId } = req.params;

      const client = await clientConfigService.getClient(clientId);

      if (!client) {
        res.status(404).json({
          success: false,
          error: 'Cliente não encontrado'
        });
        return;
      }

      res.json({
        success: true,
        data: client
      });
    } catch (error: any) {
      logger.error('Erro ao buscar cliente:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async createClient(req: Request, res: Response): Promise<void> {
    try {
      const client = await clientConfigService.createClient(req.body);

      res.status(201).json({
        success: true,
        data: client
      });
    } catch (error: any) {
      logger.error('Erro ao criar cliente:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async updateClient(req: Request, res: Response): Promise<void> {
    try {
      const { clientId } = req.params;

      const client = await clientConfigService.updateClient(clientId, req.body);

      res.json({
        success: true,
        data: client
      });
    } catch (error: any) {
      logger.error('Erro ao atualizar cliente:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async deleteClient(req: Request, res: Response): Promise<void> {
    try {
      const { clientId } = req.params;

      await clientConfigService.deleteClient(clientId);

      res.json({
        success: true,
        message: 'Cliente deletado com sucesso'
      });
    } catch (error: any) {
      logger.error('Erro ao deletar cliente:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

export default new ClientsController();

