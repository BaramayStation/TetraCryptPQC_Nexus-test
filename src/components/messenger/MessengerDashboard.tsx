/**
 * TetraCryptPQC Messenger Dashboard
 * TOP SECRET//COSMIC//THAUMIEL
 */

import React from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import * as RadixUI from '@radix-ui/react-primitive';
import { cva, type VariantProps } from 'class-variance-authority';
import { messenger, MessageType, MessageStatus } from '../../services/messenger-service';
import { subscription } from '../../services/subscription-service';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';

// Styles
const container = cva([
  'w-full',
  'max-w-7xl',
  'mx-auto',
  'px-4',
  'sm:px-6',
  'lg:px-8'
]);

const card = cva([
  'bg-white',
  'dark:bg-gray-800',
  'rounded-lg',
  'shadow-lg',
  'p-6'
]);

const button = cva([
  'inline-flex',
  'items-center',
  'px-4',
  'py-2',
  'border',
  'border-transparent',
  'text-sm',
  'font-medium',
  'rounded-md',
  'shadow-sm',
  'text-white',
  'bg-indigo-600',
  'hover:bg-indigo-700',
  'focus:outline-none',
  'focus:ring-2',
  'focus:ring-offset-2',
  'focus:ring-indigo-500'
]);

/**
 * Chat message interface
 */
interface ChatMessage {
  id: string;
  senderId: string;
  recipientId: string;
  content: string;
  type: MessageType;
  status: MessageStatus;
  timestamp: string;
}

/**
 * Chat list props
 */
interface ChatListProps {
  chats: Array<{
    id: string;
    name: string;
    lastMessage?: string;
    timestamp?: string;
    unreadCount: number;
  }>;
  selectedChatId?: string;
  onSelectChat: (chatId: string) => void;
}

/**
 * Chat list component
 */
const ChatList: React.FC<ChatListProps> = ({ chats, selectedChatId, onSelectChat }) => {
  return (
    <div className="border-r border-gray-200 w-80">
      <div className="p-4">
        <h2 className="text-lg font-medium text-gray-900">Chats</h2>
      </div>
      <nav className="overflow-y-auto" style={{ height: 'calc(100vh - 10rem)' }}>
        <ul className="divide-y divide-gray-200">
          {chats.map((chat) => (
            <li
              key={chat.id}
              className={`cursor-pointer hover:bg-gray-50 ${
                selectedChatId === chat.id ? 'bg-gray-100' : ''
              }`}
              onClick={() => onSelectChat(chat.id)}
            >
              <div className="px-4 py-4 flex items-center">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900">{chat.name}</p>
                  {chat.lastMessage && (
                    <p className="text-sm text-gray-500 truncate">
                      {chat.lastMessage}
                    </p>
                  )}
                </div>
                <div className="ml-4 flex-shrink-0">
                  {chat.timestamp && (
                    <p className="text-xs text-gray-500">
                      {new Date(chat.timestamp).toLocaleTimeString()}
                    </p>
                  )}
                  {chat.unreadCount > 0 && (
                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                      {chat.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};

/**
 * Message list props
 */
interface MessageListProps {
  messages: ChatMessage[];
  currentUserId: string;
}

/**
 * Message list component
 */
const MessageList: React.FC<MessageListProps> = ({ messages, currentUserId }) => {
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="space-y-4">
        {messages.map((message) => {
          const isSender = message.senderId === currentUserId;

          return (
            <div
              key={message.id}
              className={`flex ${isSender ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`rounded-lg px-4 py-2 max-w-sm ${
                  isSender
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="text-sm">{message.content}</p>
                <p className="text-xs mt-1 opacity-75">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

/**
 * Message input props
 */
interface MessageInputProps {
  onSendMessage: (content: string) => Promise<void>;
  isLoading: boolean;
}

/**
 * Message input component
 */
const MessageInput: React.FC<MessageInputProps> = ({ onSendMessage, isLoading }) => {
  const [message, setMessage] = React.useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      await onSendMessage(message);
      setMessage('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200">
      <div className="flex space-x-4">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          disabled={isLoading}
        />
        <button
          type="submit"
          className={button()}
          disabled={isLoading || !message.trim()}
        >
          Send
        </button>
      </div>
    </form>
  );
};

/**
 * Messenger dashboard component
 */
export const MessengerDashboard: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedChatId, setSelectedChatId] = React.useState<string>();

  // Get chats
  const { data: chats, isLoading: isLoadingChats } = useQuery(
    ['chats', user?.id],
    async () => {
      // Implementation will get actual chats
      return [];
    }
  );

  // Get messages
  const { data: messages, isLoading: isLoadingMessages } = useQuery(
    ['messages', selectedChatId],
    async () => {
      if (!selectedChatId) return [];
      // Implementation will get actual messages
      return [];
    },
    {
      enabled: !!selectedChatId
    }
  );

  // Send message mutation
  const sendMessageMutation = useMutation(
    async ({ content, recipientId }: { content: string; recipientId: string }) => {
      const encoder = new TextEncoder();
      await messenger.sendMessage(
        user!.id,
        recipientId,
        encoder.encode(content),
        MessageType.TEXT,
        'BASIC'
      );
    },
    {
      onSuccess: () => {
        toast({
          title: 'Success',
          description: 'Message sent successfully',
          type: 'success'
        });
      },
      onError: (error) => {
        toast({
          title: 'Error',
          description: error.message,
          type: 'error'
        });
      }
    }
  );

  if (isLoadingChats) {
    return <div>Loading...</div>;
  }

  return (
    <div className={container()}>
      <div className="py-10">
        <header>
          <h1 className="text-3xl font-bold text-gray-900">
            TetraCryptPQC Messenger
          </h1>
        </header>

        <main>
          <div className={card()}>
            <div className="flex h-[calc(100vh-16rem)]">
              <ChatList
                chats={chats || []}
                selectedChatId={selectedChatId}
                onSelectChat={setSelectedChatId}
              />

              {selectedChatId ? (
                <div className="flex-1 flex flex-col">
                  {isLoadingMessages ? (
                    <div className="flex-1 flex items-center justify-center">
                      Loading messages...
                    </div>
                  ) : (
                    <>
                      <MessageList
                        messages={messages || []}
                        currentUserId={user!.id}
                      />
                      <MessageInput
                        onSendMessage={async (content) => {
                          await sendMessageMutation.mutateAsync({
                            content,
                            recipientId: selectedChatId
                          });
                        }}
                        isLoading={sendMessageMutation.isLoading}
                      />
                    </>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-500">
                  Select a chat to start messaging
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
