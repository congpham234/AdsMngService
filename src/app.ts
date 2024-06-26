import 'reflect-metadata';
import swaggerJSDoc from 'swagger-jsdoc';
import express, { Express } from 'express';
import { Server } from 'http';
import swaggerUi from 'swagger-ui-express';
import createRouter from './router';
import errorHandler from './middlewares/error-handler';
import { readFileSync } from 'fs';
import bodyParser from 'body-parser';
import cors from 'cors';
import { ALLOW_ORIGIN_STAGE_MAP, Stage } from './utils/constants';

const app: Express = express();
let server: Server | null = null;

/** ------------------*/
const swaggerOptions = swaggerJSDoc({
  definition: JSON.parse(readFileSync('./openapi-spec.json', 'utf8')),
  apis: ['./src/routes/**/*.ts'],
});
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerOptions));

/** ------------------*/
// Retrieve the current stage from the environment variables
const currentStage = process.env.STAGE ?? Stage.ALPHA;

// Get the allowed origins based on the current stage
const allowedOrigins = ALLOW_ORIGIN_STAGE_MAP.get(currentStage);

const corsOptions: cors.CorsOptions = {
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['*'],
};

app.use(cors(corsOptions));

/** ------------------*/
app.use(errorHandler);

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));
// parse application/json
app.use(bodyParser.json());

export const startServer = () => {
  if (process.env.ENVIRONMENT !== 'lambda') {
    const port: number = Number(process.env.PORT) || 3001;

    try {
      server = app.listen(port, () => {
        console.log('Server is listening to port: ' + port);
      });

      app.use('/', createRouter());
    } catch (error) {
      console.error('Error initializing AppConfig:', error);
      // Handle the error appropriately
    }
  }
};

startServer();

export const closeServer = () => {
  if (server) {
    server.close();
  } else {
    console.log('Server Is Not Running!');
  }
};

export default app;
