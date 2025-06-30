import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { typeDefs } from './schema.js';
import { resolvers } from './resolvers.js';
import cors from 'cors';

const log = (message: string, context: string = 'graphql') => {
  console.log(`${new Date().toLocaleTimeString()} [${context}] ${message}`);
};

export async function createGraphQLServer() {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    introspection: true, // Enable GraphQL Playground in development
    formatError: (error) => {
      log(`GraphQL Error: ${error.message}`, 'graphql-error');
      return {
        message: error.message,
        locations: error.locations,
        path: error.path,
      };
    },
  });

  await server.start();
  log('GraphQL server started successfully');
  
  return server;
}

export function getGraphQLMiddleware(server: ApolloServer) {
  return expressMiddleware(server, {
    context: async ({ req }) => {
      // Add any context you need here
      return {
        user: req.session?.userId || null,
        headers: req.headers,
        timestamp: new Date().toISOString()
      };
    },
  });
}