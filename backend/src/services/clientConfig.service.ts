import prisma from '../config/prisma';
import { Logger } from '../utils/logger';

const logger = new Logger('ClientConfigService');

export interface ClientConfig {
  id: string;
  name: string;
  botName?: string;
  storeType?: string;
  basePrompt?: string;
  forbidden?: string;
  messageLimit?: number;
  contextTime?: number;
  botEnabled: boolean;
}

export class ClientConfigService {
  async getClient(clientId: string): Promise<ClientConfig | null> {
    try {
      const client = await prisma.client.findUnique({
        where: { id: clientId }
      });

      return client;
    } catch (error: any) {
      logger.error(`Erro ao buscar cliente ${clientId}:`, error);
      throw error;
    }
  }

  async createClient(data: Partial<ClientConfig>): Promise<ClientConfig> {
    try {
      const client = await prisma.client.create({
        data: {
          name: data.name || 'Cliente',
          botName: data.botName,
          storeType: data.storeType,
          basePrompt: data.basePrompt,
          forbidden: data.forbidden,
          messageLimit: data.messageLimit || 30,
          contextTime: data.contextTime || 60,
          botEnabled: data.botEnabled ?? true
        }
      });

      logger.info(`Cliente criado: ${client.id}`);
      return client;
    } catch (error: any) {
      logger.error('Erro ao criar cliente:', error);
      throw error;
    }
  }

  async updateClient(clientId: string, data: Partial<ClientConfig>): Promise<ClientConfig> {
    try {
      const client = await prisma.client.update({
        where: { id: clientId },
        data: {
          name: data.name,
          botName: data.botName,
          storeType: data.storeType,
          basePrompt: data.basePrompt,
          forbidden: data.forbidden,
          messageLimit: data.messageLimit,
          contextTime: data.contextTime,
          botEnabled: data.botEnabled
        }
      });

      logger.info(`Cliente atualizado: ${clientId}`);
      return client;
    } catch (error: any) {
      logger.error(`Erro ao atualizar cliente ${clientId}:`, error);
      throw error;
    }
  }

  async deleteClient(clientId: string): Promise<void> {
    try {
      await prisma.client.delete({
        where: { id: clientId }
      });

      logger.info(`Cliente deletado: ${clientId}`);
    } catch (error: any) {
      logger.error(`Erro ao deletar cliente ${clientId}:`, error);
      throw error;
    }
  }

  buildSystemPrompt(client: ClientConfig): string {
    let prompt = '';

    if (client.botName) {
      prompt += `Você é ${client.botName}. `;
    }

    if (client.storeType) {
      prompt += `Você trabalha em uma ${client.storeType}. `;
    }

    if (client.basePrompt) {
      prompt += client.basePrompt + ' ';
    }

    if (client.forbidden) {
      prompt += `\n\nREGRAS IMPORTANTES - VOCÊ NÃO PODE FALAR SOBRE:\n${client.forbidden}`;
    }

    return prompt.trim() || 'Você é um assistente útil e educado.';
  }
}

export default new ClientConfigService();

