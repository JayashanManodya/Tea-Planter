import { useState, useRef, useEffect } from 'react';
import { useUser } from "@clerk/clerk-react";
import { Send, Bot, User, Cloud, Droplets, Sun } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function AIAssistantPage() {
  const { user } = useUser();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Hello ${user?.firstName || 'there'}! I'm your Estate Manager AI assistant. I can help you with:\n\n• Weather-based recommendations\n• Fertilization scheduling\n• Harvest planning\n• Inventory management\n• Task optimization\n\nHow can I assist you today?`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    // Simulate AI response
    await new Promise(resolve => setTimeout(resolve, 1500));

    const aiResponse: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: generateResponse(input),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, aiResponse]);
    setLoading(false);
  };

  const generateResponse = (query: string): string => {
    const lowerQuery = query.toLowerCase();

    if (lowerQuery.includes('fertilize') || lowerQuery.includes('fertilizer')) {
      return '🌱 **Fertilization Recommendation**\n\nBased on current conditions:\n\n✅ **Weather Check**: No rain expected for next 48 hours - Good for fertilization\n✅ **Inventory**: T-200 fertilizer available (150 kg)\n✅ **Last Application**: Block A was fertilized 28 days ago\n\n**Recommendation**: Yes, proceed with fertilization tomorrow morning (6-9 AM) for Block A.\n\n**Application Rate**: 50kg per acre\n**Estimated Coverage**: 3 acres\n\nWould you like me to create a task for the workers?';
    }

    if (lowerQuery.includes('weather')) {
      return '⛅ **Weather Forecast**\n\n**Today**: Partly cloudy, 28°C\n**Tomorrow**: Clear skies, 30°C\n**This Week**: Light rain expected on Thursday\n\n**Recommendation**: Good conditions for outdoor work today and tomorrow. Plan indoor maintenance tasks for Thursday.';
    }

    if (lowerQuery.includes('harvest')) {
      return '📊 **Harvest Analysis**\n\n**Current Status**:\n• Today\'s harvest: 72.6 kg (3 workers)\n• Weekly average: 185 kg/day\n• Best performing block: Block A (30% above average)\n\n**Optimization Suggestion**: Consider assigning more workers to Block A next week to maximize the high-yield period.\n\n**Quality Analysis**: 85% Grade A quality - Excellent!';
    }

    return '🤖 I understand your question about: "' + query + '"\n\nLet me check the current plantation data and provide you with a detailed recommendation.\n\nBased on historical patterns and current conditions, I suggest:\n\n1. Monitor the situation closely\n2. Check inventory levels\n3. Review weather forecast\n4. Consult with your supervisor team\n\nWould you like more specific information on any of these points?';
  };

  const quickActions = [
    { label: 'Should I fertilize today?', icon: Droplets },
    { label: 'Check weather forecast', icon: Cloud },
    { label: 'Optimize harvest schedule', icon: Sun },
  ];

  return (
    <div className="p-6 h-[calc(100vh-96px)] flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Estate Manager AI Assistant</h1>
        <p className="text-gray-600 mt-1">Ask questions and get intelligent recommendations</p>
      </div>

      <div className="flex-1 bg-white rounded-lg border border-gray-200 flex flex-col overflow-hidden">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${message.role === 'user' ? 'bg-green-100' : 'bg-blue-100'
                  }`}
              >
                {message.role === 'user' ? (
                  <User className="w-4 h-4 text-green-700" />
                ) : (
                  <Bot className="w-4 h-4 text-blue-700" />
                )}
              </div>

              <div
                className={`flex-1 max-w-2xl ${message.role === 'user' ? 'text-right' : ''
                  }`}
              >
                <div
                  className={`inline-block px-4 py-3 rounded-lg ${message.role === 'user'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                    }`}
                >
                  <p className="text-sm whitespace-pre-line">{message.content}</p>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <Bot className="w-4 h-4 text-blue-700" />
              </div>
              <div className="flex items-center gap-2 px-4 py-3 bg-gray-100 rounded-lg">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions */}
        {messages.length === 1 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <p className="text-sm font-medium text-gray-700 mb-3">Quick Actions:</p>
            <div className="flex flex-wrap gap-2">
              {quickActions.map((action, i) => {
                const Icon = action.icon;
                return (
                  <button
                    key={i}
                    onClick={() => setInput(action.label)}
                    className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm hover:bg-gray-100 transition-colors"
                  >
                    <Icon className="w-4 h-4 text-gray-600" />
                    {action.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask me anything about your plantation..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              disabled={loading}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
