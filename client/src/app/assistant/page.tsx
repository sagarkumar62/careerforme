'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bot,
  Sparkles,
  Send,
  Loader2,
  Plus,
  Trash2,
  MessageSquare,
  ChevronRight,
  Menu,
  X,
  Target,
  Clock,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  User as UserIcon,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AIMessage, Conversation } from '@/types';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

const QUICK_PROMPTS = [
  "Which career should I choose?",
  "What skills am I missing for an AI engineer role?",
  "Create a 6-month roadmap for full-stack developer",
  "Give me projects for my current skill level",
  "Start a technical mock interview",
  "Frontend vs Backend career path",
];

export default function AssistantPage() {
  const queryClient = useQueryClient();
  const { profile: authProfile } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // 1. Fetch conversations list
  const { data: conversations = [], isLoading: loadingConversations } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => api.getConversations(),
  });

  // Set default active conversation when loaded
  useEffect(() => {
    if (conversations.length > 0 && !activeId) {
      setActiveId(conversations[0].id || conversations[0]._id || null);
    }
  }, [conversations, activeId]);

  const activeConversation = conversations.find(
    (c) => c.id === activeId || c._id === activeId
  ) || conversations[0];

  const messages: AIMessage[] = activeConversation?.messages || [];

  // Scroll to bottom on message change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeId]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (initialMessage?: string) => api.createConversation(initialMessage),
    onSuccess: (newConv) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setActiveId(newConv.id || newConv._id || null);
    },
  });

  const sendMutation = useMutation({
    mutationFn: async ({ content, convId }: { content: string; convId?: string }) => {
      const userMsgId = `usr_${Date.now()}`;
      const assistantMsgId = `ast_${Date.now()}`;

      const userMsg: AIMessage = {
        id: userMsgId,
        sender: 'user',
        role: 'user',
        content,
        timestamp: 'Just now',
      };

      const assistantPlaceholder: AIMessage = {
        id: assistantMsgId,
        sender: 'assistant',
        role: 'assistant',
        content: '',
        timestamp: 'Just now',
      };

      // Optimistically append user & empty assistant message
      queryClient.setQueryData(['conversations'], (old: Conversation[] | undefined) => {
        if (!old || old.length === 0) return old;
        return old.map((c) => {
          if (c.id === convId || c._id === convId || c.id === activeId || c._id === activeId) {
            return {
              ...c,
              messages: [...c.messages, userMsg, assistantPlaceholder],
            };
          }
          return c;
        });
      });

      // Stream chunks
      const result = await api.streamAssistantMessage(
        content,
        convId || activeId || undefined,
        (chunk, resConvId) => {
          if (resConvId && resConvId !== activeId) {
            setActiveId(resConvId);
          }
          queryClient.setQueryData(['conversations'], (old: Conversation[] | undefined) => {
            if (!old) return old;
            return old.map((c) => {
              if (
                c.id === resConvId ||
                c._id === resConvId ||
                c.id === convId ||
                c._id === convId ||
                c.id === activeId ||
                c._id === activeId
              ) {
                return {
                  ...c,
                  id: c.id || resConvId,
                  _id: c._id || resConvId,
                  messages: c.messages.map((m) =>
                    m.id === assistantMsgId
                      ? { ...m, content: m.content + chunk }
                      : m
                  ),
                };
              }
              return c;
            });
          });
        }
      );

      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      if (data.conversationId) {
        setActiveId(data.conversationId);
      }
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteConversation(id),
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      if (activeId === deletedId) {
        const remaining = conversations.filter((c) => (c.id || c._id) !== deletedId);
        setActiveId(remaining[0]?.id || remaining[0]?._id || null);
      }
    },
  });

  const handleSend = (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim() || sendMutation.isPending) return;

    if (!textToSend) setInput('');
    sendMutation.mutate({
      content: query.trim(),
      convId: activeId || undefined,
    });
  };

  const handleNewChat = () => {
    createMutation.mutate(undefined);
    setMobileSidebarOpen(false);
  };

  // Helper to format inline markdown syntax (**bold**, `code`, *italic*)
  const formatInlineMarkdown = (rawText: string) => {
    const parts: (string | React.ReactNode)[] = [];
    let text = rawText;

    // Pattern matching for **bold**, `code`, and *italic*
    const regex = /(\*\*.*?\*\*|`.*?`|\*.*?\*)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      const val = match[0];
      if (val.startsWith('**') && val.endsWith('**')) {
        parts.push(
          <strong key={`b_${match.index}`} className="font-extrabold text-slate-900">
            {val.slice(2, -2)}
          </strong>
        );
      } else if (val.startsWith('`') && val.endsWith('`')) {
        parts.push(
          <code key={`c_${match.index}`} className="bg-indigo-50 text-indigo-700 font-mono text-[11px] px-1.5 py-0.5 rounded border border-indigo-100 font-semibold">
            {val.slice(1, -1)}
          </code>
        );
      } else if (val.startsWith('*') && val.endsWith('*')) {
        parts.push(
          <em key={`i_${match.index}`} className="italic text-slate-700">
            {val.slice(1, -1)}
          </em>
        );
      } else {
        parts.push(val);
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : rawText;
  };

  // Helper for rendering structured text with clean markdown format & rich tables
  const renderMessageContent = (text: string) => {
    if (!text) return null;

    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let tableBuffer: string[] = [];

    const flushTable = (tableKey: number) => {
      if (tableBuffer.length === 0) return;
      const cleanRows = tableBuffer.filter((r) => r.trim() && !r.includes('---'));
      if (cleanRows.length > 0) {
        const parseRow = (rowStr: string) =>
          rowStr
            .split('|')
            .map((cell) => cell.trim())
            .filter((cell, idx, arr) => idx > 0 && idx < arr.length - 1);

        const headerCells = parseRow(cleanRows[0]);
        const bodyRows = cleanRows.slice(1).map(parseRow);

        elements.push(
          <div key={`tbl_${tableKey}`} className="my-3 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200">
                  {headerCells.map((h, hIdx) => (
                    <th key={hIdx} className="p-2.5 font-extrabold text-slate-900 uppercase text-[10px] tracking-wider">
                      {formatInlineMarkdown(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bodyRows.map((r, rIdx) => (
                  <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                    {r.map((c, cIdx) => (
                      <td key={cIdx} className="p-2.5 text-slate-700 font-medium">
                        {formatInlineMarkdown(c)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      tableBuffer = [];
    };

    lines.forEach((line, i) => {
      if (line.trim().startsWith('|')) {
        tableBuffer.push(line);
        return;
      } else if (tableBuffer.length > 0) {
        flushTable(i);
      }

      if (line.startsWith('### ')) {
        elements.push(
          <h3 key={i} className="text-sm font-extrabold text-slate-900 mt-4 mb-2 flex items-center gap-1.5 pb-1 border-b border-slate-100">
            <Sparkles className="h-4 w-4 text-indigo-600 shrink-0" />
            {formatInlineMarkdown(line.replace('### ', ''))}
          </h3>
        );
      } else if (line.startsWith('## ')) {
        elements.push(
          <h2 key={i} className="text-base font-black text-indigo-900 mt-5 mb-2 flex items-center gap-2">
            <Badge variant="ai" className="px-2 py-0.5 text-[10px]">SECTION</Badge>
            {formatInlineMarkdown(line.replace('## ', ''))}
          </h2>
        );
      } else if (line.startsWith('# ')) {
        elements.push(
          <h1 key={i} className="text-lg font-black text-slate-900 mt-4 mb-2">
            {formatInlineMarkdown(line.replace('# ', ''))}
          </h1>
        );
      } else if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        const cleanContent = line.trim().substring(2);
        elements.push(
          <div key={i} className="flex items-start gap-2 ml-1 my-1 text-xs text-slate-700">
            <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0 mt-1.5" />
            <div className="leading-relaxed">{formatInlineMarkdown(cleanContent)}</div>
          </div>
        );
      } else if (/^\d+\.\s/.test(line.trim())) {
        const cleanContent = line.trim().replace(/^\d+\.\s/, '');
        elements.push(
          <div key={i} className="flex items-start gap-2 ml-1 my-1 text-xs text-slate-700">
            <span className="font-bold text-indigo-600 text-[11px] shrink-0 mt-0.5">•</span>
            <div className="leading-relaxed">{formatInlineMarkdown(cleanContent)}</div>
          </div>
        );
      } else if (!line.trim()) {
        elements.push(<div key={i} className="h-2" />);
      } else {
        elements.push(
          <p key={i} className="text-xs text-slate-800 leading-relaxed font-normal my-1">
            {formatInlineMarkdown(line)}
          </p>
        );
      }
    });

    if (tableBuffer.length > 0) {
      flushTable(lines.length);
    }

    return elements;
  };

  const targetRole = authProfile?.targetCareerGoal || (authProfile as any)?.targetCareer || 'AI Engineer';
  const weeklyHours = authProfile?.learningPreferences?.weeklyHours || 10;
  const userSkills = (authProfile?.skills || []).map((s: any) => typeof s === 'string' ? s : s.name);

  return (
    <AppLayout>
      <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-8.5rem)]">
        {/* Mobile Sidebar Toggle Header */}
        <div className="lg:hidden flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-indigo-600" />
            <span className="font-extrabold text-xs text-slate-900">
              {activeConversation?.title || 'AI Career Mentor'}
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="gap-1.5 text-xs font-bold"
          >
            {mobileSidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            Chats
          </Button>
        </div>

        {/* Conversation Sidebar */}
        <div
          className={`${
            mobileSidebarOpen ? 'block' : 'hidden'
          } lg:block w-full lg:w-72 bg-white rounded-2xl border border-slate-200 shadow-soft flex flex-col overflow-hidden shrink-0`}
        >
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-indigo-600" />
              <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">Conversations</h3>
            </div>
            <Button
              size="sm"
              variant="ai"
              onClick={handleNewChat}
              disabled={createMutation.isPending}
              className="gap-1 font-bold text-xs shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" /> New Chat
            </Button>
          </div>

          <div className="flex-1 p-2 overflow-y-auto space-y-1">
            {loadingConversations ? (
              <div className="p-4 text-center">
                <Loader2 className="h-5 w-5 animate-spin text-indigo-600 mx-auto" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">No past conversations yet.</div>
            ) : (
              conversations.map((conv) => {
                const cId = conv.id || conv._id;
                const isActive = activeId === cId;
                return (
                  <div
                    key={cId}
                    onClick={() => {
                      setActiveId(cId || null);
                      setMobileSidebarOpen(false);
                    }}
                    className={`p-3 rounded-xl cursor-pointer flex items-center justify-between transition-all group ${
                      isActive
                        ? 'bg-indigo-50 border border-indigo-200 text-indigo-900 shadow-2xs'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <MessageSquare
                        className={`h-4 w-4 shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}
                      />
                      <div className="min-w-0">
                        <p className="font-bold text-xs truncate leading-snug">{conv.title || 'Career Chat'}</p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {conv.messages.length} messages
                        </p>
                      </div>
                    </div>

                    {conversations.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (cId) deleteMutation.mutate(cId);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 transition-opacity"
                        title="Delete conversation"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Main Chat Panel (2 cols / flex-1) */}
        <div className="flex-1 flex flex-col h-full bg-white rounded-2xl border border-slate-200 shadow-soft overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  {activeConversation?.title || 'AI Career Mentor'}
                  <Badge variant="ai">Mentor Engine Active</Badge>
                </h2>
                <p className="text-[11px] text-slate-500">
                  Targeting <strong className="text-indigo-600">{targetRole}</strong> • Profile & Roadmap synced
                </p>
              </div>
            </div>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
            {messages.map((m, index) => {
              const isUser = m.sender === 'user' || m.role === 'user';
              return (
                <div
                  key={m.id || `msg_${index}`}
                  className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="h-8 w-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 text-xs font-bold mt-1 shadow-xs">
                      <Bot className="h-4 w-4" />
                    </div>
                  )}

                  <div
                    className={`space-y-2 max-w-[85%] ${
                      isUser
                        ? 'bg-indigo-600 text-white p-4 rounded-2xl shadow-xs'
                        : 'bg-slate-50 border border-slate-200 text-slate-800 p-5 rounded-2xl shadow-xs'
                    }`}
                  >
                    {isUser ? (
                      <p className="text-xs font-medium leading-relaxed whitespace-pre-line">{m.content}</p>
                    ) : (
                      <div className="space-y-1">{renderMessageContent(m.content)}</div>
                    )}

                    {/* Suggested Action Chips */}
                    {!isUser && Array.isArray(m.suggestedActions) && m.suggestedActions.length > 0 && (
                      <div className="pt-3 border-t border-slate-200/60 flex flex-wrap gap-1.5">
                        {m.suggestedActions.map((act, aIdx) => (
                          <button
                            key={aIdx}
                            onClick={() => handleSend(act)}
                            className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 text-[11px] font-semibold text-slate-700 hover:text-indigo-700 transition-colors flex items-center gap-1 shadow-2xs"
                          >
                            <span>{act}</span>
                            <ChevronRight className="h-3 w-3 text-slate-400" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {isUser && (
                    <div className="h-8 w-8 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 text-xs font-bold mt-1">
                      <UserIcon className="h-4 w-4" />
                    </div>
                  )}
                </div>
              );
            })}

            {sendMutation.isPending && (
              <div className="flex items-center gap-2.5 text-xs text-indigo-600 font-semibold p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 max-w-xs animate-pulse">
                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                <span>AI Career Mentor is analyzing response...</span>
              </div>
            )}

            {sendMutation.isError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center justify-between">
                <span>Failed to process request. Please try again.</span>
                <Button size="sm" variant="outline" onClick={() => sendMutation.mutate({ content: input || 'Retry', convId: activeId || undefined })}>
                  <RefreshCw className="h-3.5 w-3.5 mr-1" /> Retry
                </Button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Prompt Chips & Input Bar */}
          <div className="p-4 border-t border-slate-100 space-y-3 bg-white">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {QUICK_PROMPTS.map((qp, index) => (
                <button
                  key={`qp_${index}`}
                  onClick={() => handleSend(qp)}
                  disabled={sendMutation.isPending}
                  className="px-3 py-1 rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 text-[11px] font-semibold whitespace-nowrap transition-colors border border-transparent hover:border-indigo-200"
                >
                  {qp}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                disabled={sendMutation.isPending}
                placeholder={`Ask your AI Career Mentor about ${targetRole}, roadmap, skills, DSA, or interview prep...`}
                className="flex-1 h-11 px-4 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-600 focus:outline-none font-medium text-slate-900"
              />
              <Button
                variant="ai"
                size="md"
                onClick={() => handleSend()}
                disabled={sendMutation.isPending || !input.trim()}
                className="font-bold shadow-glow-indigo"
              >
                {sendMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Right Context Panel (1 col desktop) */}
        <div className="hidden lg:block w-72 space-y-4 shrink-0">
          <Card className="p-5 bg-white border-slate-200 rounded-2xl space-y-4 shadow-soft">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Target className="h-4 w-4 text-indigo-600" /> Learner Context
              </h3>
              <Badge variant="success">Synced</Badge>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <p className="text-slate-400 font-semibold uppercase text-[10px]">Target Career Goal</p>
                <p className="font-extrabold text-indigo-700 text-sm">{targetRole}</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <p className="text-slate-400 font-semibold uppercase text-[10px]">Study Commitment</p>
                <p className="font-bold text-slate-800 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-indigo-600" /> {weeklyHours} hrs / week
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
                <p className="text-slate-400 font-semibold uppercase text-[10px]">Active Skill Matrix</p>
                <div className="flex flex-wrap gap-1">
                  {userSkills.length > 0 ? (
                    userSkills.slice(0, 5).map((sk: string) => (
                      <Badge key={sk} variant="secondary" className="text-[10px]">
                        {sk}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-[11px] text-slate-400 italic">None listed</span>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
