import axios from 'axios';
import { config } from '../config/env';
import { Logger } from '../utils/logger';

const logger = new Logger('OpenRouterService');

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string | MessageContent[];
}

export interface MessageContent {
  type: 'text' | 'image_url' | 'input_audio';
  text?: string;
  image_url?: { url: string };
  input_audio?: { data: string; format: string };
}

export class OpenRouterService {
  private apiUrl = 'https://openrouter.ai/api/v1/chat/completions';

  async sendMessage(messages: Message[]): Promise<string> {
    try {
      logger.info('Enviando mensagem para OpenRouter');

      const response = await axios.post(
        this.apiUrl,
        {
          model: config.openrouterModel,
          messages: messages,
        },
        {
          headers: {
            'Authorization': `Bearer ${config.openrouterApiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 60000, // 60 segundos
        }
      );

      const reply = response.data.choices[0]?.message?.content;

      if (!reply) {
        throw new Error('Resposta vazia do OpenRouter');
      }

      logger.info('Resposta recebida do OpenRouter');
      return reply;
    } catch (error: any) {
      logger.error('Erro ao chamar OpenRouter:', error.response?.data || error.message);
      throw new Error(`Erro ao processar mensagem: ${error.message}`);
    }
  }

  async sendTextMessage(systemPrompt: string, userMessage: string): Promise<string> {
    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ];

    return this.sendMessage(messages);
  }

  async sendAudioMessage(
    systemPrompt: string,
    audioBase64: string,
    format: string = 'mp3'
  ): Promise<string> {
    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: [
          {
            type: 'input_audio',
            input_audio: {
              data: audioBase64,
              format: format
            }
          }
        ]
      }
    ];

    return this.sendMessage(messages);
  }

  async sendImageMessage(
    systemPrompt: string,
    imageUrl: string,
    caption?: string
  ): Promise<string> {
    const content: MessageContent[] = [
      {
        type: 'image_url',
        image_url: { url: imageUrl }
      }
    ];

    if (caption) {
      content.push({
        type: 'text',
        text: caption
      });
    }

    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content }
    ];

    return this.sendMessage(messages);
  }
}

export default new OpenRouterService();

