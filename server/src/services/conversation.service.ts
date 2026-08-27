import mongoose from 'mongoose';
import { Conversation, IConversation, IMessage } from '../models/Conversation';
import { careerContextService } from './ai/career-context.service';
import { geminiService, GeminiMessage } from './ai/gemini.service';
import { ApiError } from '../utils/ApiError';

export class ConversationService {
  /**
   * Helper to generate a concise, human-readable title from the first message
   */
  private generateTitle(messageText: string): string {
    const text = messageText.trim();
    if (text.length <= 30) return text;
    const words = text.split(/\s+/);
    if (words.length <= 5) return text;
    return words.slice(0, 5).join(' ') + '...';
  }

  /**
   * Normalize legacy messages so Mongoose validation passes seamlessly on old database records
   */
  private normalizeConversation(conversation: IConversation): IConversation {
    if (Array.isArray(conversation.messages)) {
      for (const m of conversation.messages) {
        if (!m.role) {
          m.role = m.sender === 'user' ? 'user' : 'assistant';
        }
        if (!m.sender) {
          m.sender = m.role === 'user' ? 'user' : 'assistant';
        }
        if (!m.content) {
          m.content = m.message || '';
        }
        if (!m.message) {
          m.message = m.content || '';
        }
      }
    }
    return conversation;
  }

  async getUserConversations(userId: string): Promise<IConversation[]> {
    const conversations = await Conversation.find({ userId }).sort({ updatedAt: -1 });

    if (conversations.length === 0) {
      const defaultConv = await this.createConversation(userId);
      return [defaultConv];
    }

    return conversations.map((conv) => this.normalizeConversation(conv));
  }

  async getConversationById(id: string, userId: string): Promise<IConversation> {
    let conversation: IConversation | null = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      conversation = await Conversation.findOne({ _id: id, userId });
    }
    if (!conversation) {
      conversation = await Conversation.findOne({ userId }).sort({ updatedAt: -1 });
    }
    if (!conversation) {
      conversation = await this.createConversation(userId);
    }
    return this.normalizeConversation(conversation);
  }

  async createConversation(userId: string, initialMessage?: string): Promise<IConversation> {
    const { systemInstruction, userContextSummary } = await careerContextService.buildCareerContext(userId);

    const initialTitle = initialMessage ? this.generateTitle(initialMessage) : 'New Career Chat';

    const welcomeMsg: IMessage = {
      role: 'assistant',
      sender: 'assistant',
      content: `Hello ${userContextSummary.userName}! I am your personal **AI Career Mentor**.\n\nI have loaded your active profile, current skills (${(userContextSummary.currentSkills || []).slice(0, 3).join(', ') || 'software fundamentals'}), and your goal to become a **${userContextSummary.targetCareerGoal}**.\n\nHow can I guide your career path today?`,
      message: `Hello ${userContextSummary.userName}! I am your personal AI Career Mentor.`,
      suggestedActions: [
        'Which career should I choose?',
        'What skills am I missing for my target role?',
        'Create a 6-month learning roadmap',
        'Start a technical mock interview',
      ],
      timestamp: new Date(),
    };

    const conversation = await Conversation.create({
      userId,
      title: initialTitle,
      messages: [welcomeMsg],
      context: userContextSummary,
    });

    return this.normalizeConversation(conversation);
  }

  async sendMessageStream(
    userId: string,
    conversationId: string | undefined,
    userMessage: string,
    onChunk: (data: { chunk: string; conversationId: string }) => void,
    customContext?: Record<string, any>
  ) {
    if (!userMessage || !userMessage.trim()) {
      throw ApiError.badRequest('Message content cannot be empty.');
    }

    let conversation: IConversation | null = null;
    if (conversationId && conversationId !== 'new' && mongoose.Types.ObjectId.isValid(conversationId)) {
      conversation = await Conversation.findOne({ _id: conversationId, userId });
    }
    if (!conversation) {
      conversation = await Conversation.findOne({ userId }).sort({ updatedAt: -1 });
    }
    if (!conversation) {
      conversation = await this.createConversation(userId, userMessage);
    }

    this.normalizeConversation(conversation);

    if (conversation.title === 'New Career Chat' && conversation.messages.length <= 2) {
      conversation.title = this.generateTitle(userMessage);
    }

    const { systemInstruction, userContextSummary } = await careerContextService.buildCareerContext(userId);
    conversation.context = { ...userContextSummary, ...customContext };

    const userMsgObj: IMessage = {
      role: 'user',
      sender: 'user',
      content: userMessage.trim(),
      message: userMessage.trim(),
      timestamp: new Date(),
    };

    conversation.messages.push(userMsgObj);
    await conversation.save();

    const currentConvId = conversation._id.toString();

    const recentMessages = conversation.messages.slice(-10);
    const history: GeminiMessage[] = recentMessages.map((m) => ({
      role: m.role || (m.sender === 'user' ? 'user' : 'assistant'),
      content: m.content || m.message || '',
    }));

    const fullAiText = await geminiService.generateResponseStream(
      systemInstruction,
      history,
      userMessage.trim(),
      (textChunk) => {
        onChunk({ chunk: textChunk, conversationId: currentConvId });
      }
    );

    const assistantMsgObj: IMessage = {
      role: 'assistant',
      sender: 'assistant',
      content: fullAiText,
      message: fullAiText,
      suggestedActions: [
        'Build My Roadmap',
        'Review Skill Gaps',
        'Give me project ideas for this step',
      ],
      timestamp: new Date(),
    };

    conversation.messages.push(assistantMsgObj);
    await conversation.save();

    return {
      conversationId: currentConvId,
      conversation,
      message: assistantMsgObj,
      reply: assistantMsgObj,
    };
  }

  async sendMessage(
    userId: string,
    conversationId: string | undefined,
    userMessage: string,
    customContext?: Record<string, any>
  ) {
    if (!userMessage || !userMessage.trim()) {
      throw ApiError.badRequest('Message content cannot be empty.');
    }

    let conversation: IConversation | null = null;

    if (conversationId && conversationId !== 'new' && mongoose.Types.ObjectId.isValid(conversationId)) {
      conversation = await Conversation.findOne({ _id: conversationId, userId });
    }

    if (!conversation) {
      conversation = await Conversation.findOne({ userId }).sort({ updatedAt: -1 });
    }

    if (!conversation) {
      conversation = await this.createConversation(userId, userMessage);
    }

    // Normalize legacy messages in existing conversation before validation & saving
    this.normalizeConversation(conversation);

    // Update title if still generic default
    if (conversation.title === 'New Career Chat' && conversation.messages.length <= 2) {
      conversation.title = this.generateTitle(userMessage);
    }

    // Build context & system instruction
    const { systemInstruction, userContextSummary } = await careerContextService.buildCareerContext(userId);
    conversation.context = { ...userContextSummary, ...customContext };

    // Append user message
    const userMsgObj: IMessage = {
      role: 'user',
      sender: 'user',
      content: userMessage.trim(),
      message: userMessage.trim(),
      timestamp: new Date(),
    };

    conversation.messages.push(userMsgObj);
    await conversation.save();

    // Map recent history for Gemini (limit to last 10 messages for token control)
    const recentMessages = conversation.messages.slice(-10);
    const history: GeminiMessage[] = recentMessages.map((m) => ({
      role: m.role || (m.sender === 'user' ? 'user' : 'assistant'),
      content: m.content || m.message || '',
    }));

    // Call Gemini API
    const aiResponseText = await geminiService.generateResponse(
      systemInstruction,
      history,
      userMessage.trim()
    );

    const assistantMsgObj: IMessage = {
      role: 'assistant',
      sender: 'assistant',
      content: aiResponseText,
      message: aiResponseText,
      suggestedActions: [
        'Build My Roadmap',
        'Review Skill Gaps',
        'Give me project ideas for this step',
      ],
      timestamp: new Date(),
    };

    conversation.messages.push(assistantMsgObj);
    await conversation.save();

    return {
      conversationId: conversation._id.toString(),
      conversation,
      message: assistantMsgObj,
      reply: assistantMsgObj, // Backward compatibility
    };
  }

  async deleteConversation(id: string, userId: string): Promise<void> {
    const result = await Conversation.deleteOne({ _id: id, userId });
    if (result.deletedCount === 0) {
      throw ApiError.notFound('Conversation not found or unauthorized.');
    }
  }
}

export const conversationService = new ConversationService();
