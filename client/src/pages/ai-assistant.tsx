import React from 'react';
import { Helmet } from 'react-helmet';
import { SimpleAiChat } from '@/components/ai/simple-ai-chat';

export default function AiAssistantPage() {
  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <Helmet>
        <title>AI Assistant | Gold-Standard_Management</title>
      </Helmet>

      <div className="flex items-center space-x-2 mb-6">
        <h1 className="text-3xl font-bold">AI Assistant</h1>
      </div>

      <p className="text-gray-500 mb-8">
        Get intelligent help with your inventory management. Ask questions about your products,
        get insights on stock levels, generate descriptions, and receive business recommendations.
      </p>

      <SimpleAiChat />
    </div>
  );
}