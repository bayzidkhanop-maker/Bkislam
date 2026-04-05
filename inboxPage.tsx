import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { User, Chat, Message } from './models';
import { subscribeToChats, subscribeToMessages, sendMessage, createOrGetChat, markMessagesAsRead, getUser } from './firestoreService';
import { uploadMedia } from './storageService';
import { Card, Input, Button, MediaRenderer, Loader } from './widgets';
import { Search, MoreVertical, Phone, Video, Image as ImageIcon, Paperclip, Mic, Send, ArrowLeft, Check, CheckCheck, Pin, Archive, Trash2, Reply, X } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from './widgets';
import { toast } from 'sonner';

import { startCall, initLocalStream } from './callService';

export const InboxPage = ({ currentUser }: { currentUser: User }) => {
  const location = useLocation();
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<Record<string, User>>({});
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileListVisible, setIsMobileListVisible] = useState(true);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [uploading, setUploading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle starting a new chat from profile
  useEffect(() => {
    const startChatWith = location.state?.startChatWith;
    if (startChatWith && startChatWith !== currentUser.uid) {
      const initChat = async () => {
        try {
          const chat = await createOrGetChat(currentUser.uid, startChatWith);
          setActiveChat(chat);
          setIsMobileListVisible(false);
          
          // Ensure user is loaded
          if (!users[startChatWith]) {
            const u = await getUser(startChatWith);
            if (u) setUsers(prev => ({ ...prev, [startChatWith]: u }));
          }
        } catch (error) {
          toast.error("Failed to start chat");
        }
      };
      initChat();
    }
  }, [location.state, currentUser.uid]);

  useEffect(() => {
    const unsubscribe = subscribeToChats(currentUser.uid, async (fetchedChats) => {
      setChats(fetchedChats);
      
      // Fetch user details for participants
      const userIds = new Set<string>();
      fetchedChats.forEach(c => c.participants.forEach(p => p !== currentUser.uid && userIds.add(p)));
      
      const newUsers = { ...users };
      let hasNewUsers = false;
      for (const uid of userIds) {
        if (!newUsers[uid]) {
          const u = await getUser(uid);
          if (u) {
            newUsers[uid] = u;
            hasNewUsers = true;
          }
        }
      }
      if (hasNewUsers) setUsers(newUsers);
    });
    return () => unsubscribe();
  }, [currentUser.uid]);

  useEffect(() => {
    if (activeChat) {
      const unsubscribe = subscribeToMessages(activeChat.id, (fetchedMessages) => {
        setMessages(fetchedMessages);
        markMessagesAsRead(activeChat.id, currentUser.uid);
        scrollToBottom();
      });
      return () => unsubscribe();
    }
  }, [activeChat]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeChat || (!newMessage.trim() && !uploading)) return;

    const text = newMessage;
    setNewMessage('');
    const replyId = replyingTo?.id;
    setReplyingTo(null);

    try {
      await sendMessage(activeChat.id, currentUser.uid, text, 'text', undefined, undefined, undefined, replyId);
      scrollToBottom();
    } catch (error) {
      toast.error('Failed to send message');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeChat) return;

    setUploading(true);
    try {
      const type = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'file';
      const path = `chats/${activeChat.id}/${Date.now()}-${file.name}`;
      const url = await uploadMedia(file, path);
      
      await sendMessage(activeChat.id, currentUser.uid, file.name, type, url, file.name, file.size);
      scrollToBottom();
    } catch (error) {
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const getOtherParticipant = (chat: Chat) => {
    const otherId = chat.participants.find(p => p !== currentUser.uid);
    return otherId ? users[otherId] : null;
  };

  const filteredChats = chats.filter(chat => {
    const otherUser = getOtherParticipant(chat);
    return otherUser?.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="h-[calc(100vh-64px)] max-w-6xl mx-auto flex bg-white dark:bg-gray-900 overflow-hidden border-x border-gray-200 dark:border-gray-800">
      
      {/* Sidebar / Chat List */}
      <div className={cn(
        "w-full md:w-80 lg:w-96 flex-shrink-0 border-r border-gray-200 dark:border-gray-800 flex flex-col transition-all duration-300",
        !isMobileListVisible && "hidden md:flex"
      )}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search chats..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-800 border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredChats.map(chat => {
            const otherUser = getOtherParticipant(chat);
            const isUnread = chat.unreadCount[currentUser.uid] > 0;
            const isActive = activeChat?.id === chat.id;

            return (
              <div 
                key={chat.id}
                onClick={() => {
                  setActiveChat(chat);
                  setIsMobileListVisible(false);
                }}
                className={cn(
                  "p-4 flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border-b border-gray-100 dark:border-gray-800/50",
                  isActive && "bg-indigo-50 dark:bg-indigo-900/20"
                )}
              >
                <div className="relative">
                  <img src={otherUser?.avatarURL || `https://ui-avatars.com/api/?name=${otherUser?.name}`} alt="" className="w-12 h-12 rounded-full object-cover" />
                  {/* Online indicator could go here */}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">{otherUser?.name || 'Unknown'}</h3>
                    {chat.lastMessage && (
                      <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                        {formatDistanceToNow(chat.lastMessage.createdAt, { addSuffix: false })}
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <p className={cn(
                      "text-sm truncate",
                      isUnread ? "text-gray-900 dark:text-white font-medium" : "text-gray-500"
                    )}>
                      {chat.lastMessage?.senderId === currentUser.uid ? 'You: ' : ''}
                      {chat.lastMessage?.text || 'No messages yet'}
                    </p>
                    {isUnread && (
                      <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full ml-2">
                        {chat.unreadCount[currentUser.uid]}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chat Area */}
      <div className={cn(
        "flex-1 flex flex-col bg-[#efeae2] dark:bg-gray-900 relative",
        isMobileListVisible && "hidden md:flex"
      )}>
        {activeChat ? (
          <>
            {/* Chat Header */}
            <div className="h-16 px-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between shadow-sm z-10">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsMobileListVisible(true)}
                  className="md:hidden p-2 -ml-2 text-gray-500 hover:text-gray-900"
                >
                  <ArrowLeft size={20} />
                </button>
                <img 
                  src={getOtherParticipant(activeChat)?.avatarURL || `https://ui-avatars.com/api/?name=${getOtherParticipant(activeChat)?.name}`} 
                  alt="" 
                  className="w-10 h-10 rounded-full object-cover" 
                />
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{getOtherParticipant(activeChat)?.name}</h3>
                  <p className="text-xs text-gray-500">Tap here for contact info</p>
                </div>
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                <button 
                  onClick={async () => {
                    const otherUser = getOtherParticipant(activeChat);
                    if (otherUser) {
                      try {
                        await startCall(currentUser.uid, otherUser.uid, 'video', () => {});
                      } catch (e) {
                        toast.error("Failed to start video call");
                      }
                    }
                  }}
                  className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                >
                  <Video size={20} />
                </button>
                <button 
                  onClick={async () => {
                    const otherUser = getOtherParticipant(activeChat);
                    if (otherUser) {
                      try {
                        await startCall(currentUser.uid, otherUser.uid, 'audio', () => {});
                      } catch (e) {
                        toast.error("Failed to start audio call");
                      }
                    }
                  }}
                  className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                >
                  <Phone size={20} />
                </button>
                <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1"></div>
                <button className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                  <MoreVertical size={20} />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', backgroundSize: 'contain', backgroundRepeat: 'repeat', opacity: 0.8 }}>
              {messages.map((msg, index) => {
                const isMine = msg.senderId === currentUser.uid;
                const showDate = index === 0 || new Date(messages[index - 1].createdAt).toDateString() !== new Date(msg.createdAt).toDateString();
                
                return (
                  <React.Fragment key={msg.id}>
                    {showDate && (
                      <div className="flex justify-center my-4">
                        <span className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm text-gray-500 text-xs px-3 py-1 rounded-lg shadow-sm">
                          {format(msg.createdAt, 'MMMM d, yyyy')}
                        </span>
                      </div>
                    )}
                    <div className={cn("flex", isMine ? "justify-end" : "justify-start")}>
                      <div className={cn(
                        "max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2 shadow-sm relative group",
                        isMine 
                          ? "bg-[#d9fdd3] dark:bg-indigo-600 text-gray-900 dark:text-white rounded-tr-sm" 
                          : "bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-tl-sm"
                      )}>
                        {/* Reply Context */}
                        {msg.replyTo && (
                          <div className="mb-2 p-2 bg-black/5 dark:bg-black/20 rounded-lg text-sm border-l-4 border-indigo-500">
                            <p className="font-semibold text-indigo-600 dark:text-indigo-300 text-xs mb-1">Replying to</p>
                            <p className="truncate opacity-80">{messages.find(m => m.id === msg.replyTo)?.text || 'Message'}</p>
                          </div>
                        )}

                        {/* Media Content */}
                        {msg.type === 'image' && msg.mediaUrl && (
                          <div className="mb-2 -mx-2 -mt-1 rounded-t-xl overflow-hidden">
                            <MediaRenderer url={msg.mediaUrl} type="image" className="w-full max-h-64 object-cover" />
                          </div>
                        )}
                        {msg.type === 'video' && msg.mediaUrl && (
                          <div className="mb-2 -mx-2 -mt-1 rounded-t-xl overflow-hidden bg-black">
                            <MediaRenderer url={msg.mediaUrl} type="video" className="w-full max-h-64" />
                          </div>
                        )}
                        {msg.type === 'file' && (
                          <div className="flex items-center gap-3 p-3 bg-black/5 dark:bg-black/20 rounded-xl mb-2">
                            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 rounded-lg">
                              <Paperclip size={20} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{msg.fileName}</p>
                              <p className="text-xs opacity-70">{(msg.fileSize || 0) / 1024 > 1024 ? `${((msg.fileSize || 0) / 1024 / 1024).toFixed(2)} MB` : `${Math.round((msg.fileSize || 0) / 1024)} KB`}</p>
                            </div>
                          </div>
                        )}

                        <p className="text-[15px] leading-relaxed break-words">{msg.text}</p>
                        
                        <div className="flex items-center justify-end gap-1 mt-1 opacity-70">
                          <span className="text-[10px]">{format(msg.createdAt, 'HH:mm')}</span>
                          {isMine && (
                            msg.status === 'read' ? <CheckCheck size={14} className="text-blue-500" /> :
                            msg.status === 'delivered' ? <CheckCheck size={14} /> :
                            <Check size={14} />
                          )}
                        </div>

                        {/* Hover Actions */}
                        <div className={cn(
                          "absolute top-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-sm p-1",
                          isMine ? "-left-16" : "-right-16"
                        )}>
                          <button onClick={() => setReplyingTo(msg)} className="p-1.5 text-gray-500 hover:text-indigo-600 rounded-md hover:bg-gray-100"><Reply size={14} /></button>
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="bg-[#f0f2f5] dark:bg-gray-800 p-3 sm:p-4">
              {replyingTo && (
                <div className="mb-3 p-3 bg-white dark:bg-gray-900 rounded-xl flex items-start justify-between shadow-sm border-l-4 border-indigo-500">
                  <div>
                    <p className="text-xs font-semibold text-indigo-600 mb-1">Replying to {replyingTo.senderId === currentUser.uid ? 'yourself' : getOtherParticipant(activeChat)?.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300 truncate">{replyingTo.text || `Attached ${replyingTo.type}`}</p>
                  </div>
                  <button onClick={() => setReplyingTo(null)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
                </div>
              )}
              
              <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                <div className="flex items-center gap-1 sm:gap-2 pb-2">
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
                    <Paperclip size={22} />
                  </button>
                  <button type="button" className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors hidden sm:block">
                    <ImageIcon size={22} />
                  </button>
                </div>
                
                <div className="flex-1 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-transparent focus-within:border-indigo-500 transition-colors flex items-center min-h-[44px]">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Type a message"
                    className="w-full bg-transparent border-none focus:ring-0 resize-none max-h-32 py-3 px-4 text-[15px]"
                    rows={1}
                    style={{ minHeight: '44px' }}
                  />
                </div>
                
                <div className="pb-1">
                  {newMessage.trim() || uploading ? (
                    <button 
                      type="submit" 
                      disabled={uploading}
                      className="p-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50"
                    >
                      {uploading ? <Loader className="w-5 h-5 p-0" /> : <Send size={20} className="ml-1" />}
                    </button>
                  ) : (
                    <button type="button" className="p-3 text-gray-500 hover:text-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
                      <Mic size={24} />
                    </button>
                  )}
                </div>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-[#f0f2f5] dark:bg-gray-900 p-8 text-center">
            <div className="w-64 h-64 bg-white dark:bg-gray-800 rounded-full shadow-sm flex items-center justify-center mb-8">
              <img src="https://cdn-icons-png.flaticon.com/512/1041/1041916.png" alt="Chat" className="w-32 h-32 opacity-50" />
            </div>
            <h2 className="text-3xl font-light text-gray-800 dark:text-gray-200 mb-4">DeenStream Web</h2>
            <p className="text-gray-500 max-w-md">Send and receive messages without keeping your phone online. Use DeenStream on up to 4 linked devices and 1 phone at the same time.</p>
          </div>
        )}
      </div>
    </div>
  );
};
