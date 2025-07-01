import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Loader2, Sparkles, MessageSquare, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Message {
  id?: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at?: string;
  metadata?: any;
  tokensUsed?: number;
  responseTime?: number;
}

interface Conversation {
  id: number;
  title: string;
  status: string;
  total_messages: number;
  total_tokens: number;
  last_message_at: string;
  messages?: Message[];
}

export function AiChat() {
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check AI status
  const { data: aiStatus } = useQuery({
    queryKey: ['/api/ai/status'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/ai/status');
      return response as { configured: boolean; model: string; features: string[] };
    },
  });

  // Get conversations list
  const { data: conversations = [] } = useQuery({
    queryKey: ['/api/ai/conversations'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/ai/conversations');
      return response as Conversation[];
    },
  });

  // Get current conversation with messages
  const { data: currentConversation } = useQuery({
    queryKey: ['/api/ai/conversations', currentConversationId],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/ai/conversations/${currentConversationId}`);
      return response as Conversation;
    },
    enabled: !!currentConversationId,
  });

  // Create new conversation mutation
  const createConversationMutation = useMutation({
    mutationFn: async (data: { title: string }) => {
      const response = await apiRequest('POST', '/api/ai/conversations', data);
      return response as Conversation;
    },
    onSuccess: (newConversation) => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai/conversations'] });
      setCurrentConversationId(newConversation.id);
      toast({
        title: "New conversation started",
        description: `"${newConversation.title}" is ready`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create new conversation",
        variant: "destructive",
      });
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { conversationId: number; content: string }) => {
      const response = await apiRequest('POST', `/api/ai/conversations/${data.conversationId}/messages`, {
        content: data.content,
      });
      return response as { userMessage: Message; assistantMessage: Message };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/ai/conversations', currentConversationId] 
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ai/conversations'] });
      setMessageInput('');
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    },
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentConversation?.messages]);

  const handleSendMessage = async () => {
    if (!messageInput.trim()) return;
    
    if (!currentConversationId) {
      // Create new conversation first
      createConversationMutation.mutate({
        title: messageInput.slice(0, 50) + (messageInput.length > 50 ? '...' : '')
      });
      return;
    }

    setIsLoading(true);
    try {
      await sendMessageMutation.mutateAsync({
        conversationId: currentConversationId,
        content: messageInput.trim(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const startNewConversation = () => {
    createConversationMutation.mutate({
      title: "New Conversation"
    });
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (!aiStatus?.configured) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI Assistant Setup Required
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            The AI assistant requires an OpenAI API key to function. Please configure your API key in the settings.
          </p>
          <Button variant="outline">
            Configure API Key
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto h-[80vh] flex gap-4">
      {/* Conversations Sidebar */}
      <Card className="w-80 flex flex-col">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Conversations
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={startNewConversation}
              disabled={createConversationMutation.isPending}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-2">
          <ScrollArea className="h-full">
            <div className="space-y-2">
              {conversations.map((conv: Conversation) => (
                <div
                  key={conv.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    currentConversationId === conv.id
                      ? 'bg-primary/10 border-primary'
                      : 'hover:bg-muted'
                  }`}
                  onClick={() => setCurrentConversationId(conv.id)}
                >
                  <div className="font-medium text-sm truncate">{conv.title}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                    <span>{conv.total_messages} messages</span>
                    <Badge variant="secondary" className="text-xs">
                      {conv.total_tokens} tokens
                    </Badge>
                  </div>
                  {conv.last_message_at && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {formatTimestamp(conv.last_message_at)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Chat Interface */}
      <Card className="flex-1 flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-500" />
            AI Assistant
            {currentConversation && (
              <Badge variant="outline" className="ml-auto">
                {currentConversation.title}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col p-4">
          {/* Messages Area */}
          <ScrollArea className="flex-1 mb-4">
            <div className="space-y-4 pr-4">
              {!currentConversationId ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">Welcome to AI Assistant</h3>
                  <p className="text-sm">
                    Start a conversation to get help with your inventory management,
                    product analysis, and business insights.
                  </p>
                  <p className="text-xs mt-2">
                    Type a message below to begin a new conversation.
                  </p>
                </div>
              ) : currentConversation?.messages?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Bot className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No messages yet. Start the conversation!</p>
                </div>
              ) : (
                currentConversation?.messages?.map((message: Message, index: number) => (
                  <div
                    key={index}
                    className={`flex gap-3 ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {message.role === 'assistant' && (
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                          <Bot className="h-4 w-4 text-white" />
                        </div>
                      </div>
                    )}
                    
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                      
                      {message.role === 'assistant' && message.metadata && (
                        <div className="flex gap-2 mt-2 text-xs opacity-70">
                          {message.responseTime && (
                            <Badge variant="secondary" className="text-xs">
                              {message.responseTime}ms
                            </Badge>
                          )}
                          {message.tokensUsed && (
                            <Badge variant="secondary" className="text-xs">
                              {message.tokensUsed} tokens
                            </Badge>
                          )}
                        </div>
                      )}
                      
                      {message.created_at && (
                        <div className="text-xs opacity-70 mt-1">
                          {formatTimestamp(message.created_at)}
                        </div>
                      )}
                    </div>
                    
                    {message.role === 'user' && (
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-primary-foreground" />
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
              
              {/* Loading indicator */}
              {(isLoading || sendMessageMutation.isPending) && (
                <div className="flex gap-3 justify-start">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                  </div>
                  <div className="bg-muted rounded-lg p-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      AI is thinking...
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="flex gap-2">
            <Input
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                currentConversationId
                  ? "Type your message..."
                  : "Type a message to start a new conversation..."
              }
              disabled={isLoading || sendMessageMutation.isPending}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!messageInput.trim() || isLoading || sendMessageMutation.isPending}
            >
              {isLoading || sendMessageMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}