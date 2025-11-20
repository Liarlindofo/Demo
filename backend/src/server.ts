import express, { Application } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { config } from './config/env';
import { authenticate } from './middlewares/auth';
import { errorHandler, notFound } from './middlewares/errorHandler';
import { Logger } from './utils/logger';

// Controllers
import whatsappController from './api/whatsapp.controller';
import clientsController from './api/clients.controller';
import chatbotController from './api/chatbot.controller';

const logger = new Logger('Server');

class Server {
  private app: Application;

  constructor() {
    this.app = express();
    this.config();
    this.routes();
    this.errorHandling();
  }

  private config(): void {
    // Middlewares básicos
    this.app.use(cors({
      origin: '*',
      credentials: true
    }));
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));
    this.app.use(morgan('dev'));

    logger.info('Middlewares configurados');
  }

  private routes(): void {
    // Health check (sem autenticação)
    this.app.get('/health', (req, res) => {
      res.json({
        success: true,
        message: 'DRIN WhatsApp Backend is running',
        timestamp: new Date().toISOString()
      });
    });

    // Rotas de clientes (com autenticação)
    this.app.get('/api/client/:clientId/config', authenticate, (req, res) =>
      clientsController.getClient(req, res)
    );
    this.app.post('/api/client', authenticate, (req, res) =>
      clientsController.createClient(req, res)
    );
    this.app.put('/api/client/:clientId/config', authenticate, (req, res) =>
      clientsController.updateClient(req, res)
    );
    this.app.delete('/api/client/:clientId', authenticate, (req, res) =>
      clientsController.deleteClient(req, res)
    );

    // Rotas de WhatsApp (com autenticação)
    this.app.get('/api/whatsapp/:clientId/sessions', authenticate, (req, res) =>
      whatsappController.getAllSessions(req, res)
    );
    this.app.get('/api/whatsapp/:clientId/:slot/status', authenticate, (req, res) =>
      whatsappController.getSessionStatus(req, res)
    );
    this.app.post('/api/whatsapp/:clientId/:slot/start', authenticate, (req, res) =>
      whatsappController.startSession(req, res)
    );
    this.app.delete('/api/whatsapp/:clientId/:slot', authenticate, (req, res) =>
      whatsappController.stopSession(req, res)
    );
    this.app.post('/api/whatsapp/:clientId/:slot/send', authenticate, (req, res) =>
      whatsappController.sendMessage(req, res)
    );

    // Rotas de chatbot (com autenticação)
    this.app.post('/api/chatbot/:clientId/test', authenticate, (req, res) =>
      chatbotController.testMessage(req, res)
    );

    logger.info('Rotas configuradas');
  }

  private errorHandling(): void {
    this.app.use(notFound);
    this.app.use(errorHandler);
  }

  public start(): void {
    const port = config.port;

    this.app.listen(port, () => {
      logger.info(`🚀 Servidor rodando na porta ${port}`);
      logger.info(`📡 Ambiente: ${config.nodeEnv}`);
      logger.info(`🔗 Health check: http://localhost:${port}/health`);
    });
  }
}

// Iniciar servidor
const server = new Server();
server.start();

// Tratamento de erros não capturados
process.on('unhandledRejection', (reason: any) => {
  logger.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

export default server;

